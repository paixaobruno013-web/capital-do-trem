import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKETS = [
  "capital-do-trem-media",
  "capital-do-trem-audio",
  "capital-do-trem-private-gallery",
  "brand-assets",
];
const CONFIRMATION = "EXCLUIR MINHA CONTA";
const PAGE_SIZE = 1000;
const MAX_FILES = 5000;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function collectUserFiles(admin: ReturnType<typeof createClient>, bucketName: string, userId: string) {
  const files: string[] = [];
  const folders = [userId];
  let visitedFolders = 0;

  while (folders.length) {
    const folder = folders.pop()!;
    visitedFolders += 1;
    if (visitedFolders > 500) throw new Error("Limite de pastas excedido durante a verificação.");

    let offset = 0;
    while (true) {
      const { data, error } = await admin.storage.from(bucketName).list(folder, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw new Error("Não foi possível verificar todos os arquivos da conta.");

      const entries = data ?? [];
      for (const entry of entries) {
        if (!entry.name || entry.name === "." || entry.name === ".." || entry.name.includes("/")) {
          throw new Error("Foi encontrado um caminho de arquivo inválido.");
        }
        const path = folder + "/" + entry.name;
        if (entry.id == null || entry.metadata == null) {
          folders.push(path);
        } else {
          files.push(path);
          if (files.length > MAX_FILES) throw new Error("A conta possui arquivos demais para uma exclusão automática. Entre em contato com a equipe.");
        }
      }
      if (entries.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }

  return files;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Entre na sua conta para continuar." }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceRoleKey) {
      console.error("delete-account: configuração de servidor ausente.");
      return json({ error: "O serviço de exclusão ainda não está configurado. Tente novamente mais tarde." }, 503);
    }

    const userClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "Sua sessão expirou. Entre novamente e tente outra vez." }, 401);
    const user = authData.user;

    const admin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: adminRecord, error: adminLookupError } = await admin
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (adminLookupError) {
      console.error("delete-account: não foi possível verificar o perfil administrativo.");
      return json({ error: "Não foi possível validar as permissões da conta." }, 503);
    }
    if (adminRecord) {
      return json({
        error: "Contas administrativas precisam transferir a administração e os arquivos oficiais antes da exclusão. Fale com a equipe responsável.",
        code: "ADMIN_ACCOUNT_REQUIRES_HANDOFF",
      }, 409);
    }

    let body: { action?: string; confirmation?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Solicitação inválida." }, 400);
    }
    const action = body?.action;
    if (action !== "preview" && action !== "delete") return json({ error: "Ação inválida." }, 400);

    const filesByBucket: Record<string, string[]> = {};
    let totalFiles = 0;
    for (const bucket of BUCKETS) {
      const files = await collectUserFiles(admin, bucket, user.id);
      filesByBucket[bucket] = files;
      totalFiles += files.length;
    }

    if (action === "preview") {
      return json({
        ok: true,
        canDelete: true,
        filesToRemove: totalFiles,
        message: "A revisão foi concluída. A exclusão remove seu perfil, publicações, mensagens e arquivos enviados pela sua conta.",
      });
    }

    if (body.confirmation !== CONFIRMATION) {
      return json({ error: "Digite exatamente EXCLUIR MINHA CONTA para confirmar." }, 400);
    }

    for (const bucket of BUCKETS) {
      const paths = filesByBucket[bucket];
      for (let index = 0; index < paths.length; index += 100) {
        const { error } = await admin.storage.from(bucket).remove(paths.slice(index, index + 100));
        if (error) {
          console.error("delete-account: falha ao remover arquivos de armazenamento.", bucket);
          return json({ error: "Não foi possível remover todos os seus arquivos. Sua conta ainda não foi excluída; tente novamente ou fale com a equipe." }, 503);
        }
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id, false);
    if (deleteError) {
      console.error("delete-account: falha ao excluir usuário Auth.", deleteError.message);
      return json({ error: "Os arquivos pessoais foram removidos, mas o serviço não concluiu a exclusão da conta. Entre em contato com a equipe para finalizar." }, 503);
    }

    return json({ ok: true, deleted: true, message: "Sua conta e os dados vinculados foram excluídos." });
  } catch (error) {
    console.error("delete-account error:", error instanceof Error ? error.message : "unknown");
    return json({ error: "Não foi possível concluir a solicitação agora. Tente novamente mais tarde." }, 503);
  }
});
