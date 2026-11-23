import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import { AccessToken, RoomServiceClient } from "npm:livekit-server-sdk@2.19.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server secret: ${name}`);
  return value;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Entre na sua conta para continuar." }, 401);

    const supabaseUrl = env("SUPABASE_URL");
    const anonKey = env("SUPABASE_ANON_KEY");
    const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const livekitUrl = env("LIVEKIT_URL");
    const apiKey = env("LIVEKIT_API_KEY");
    const apiSecret = env("LIVEKIT_API_SECRET");
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data: auth, error: authError } = await userClient.auth.getUser();
    if (authError || !auth.user) return json({ error: "Sessão inválida ou expirada." }, 401);
    const user = auth.user;
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const livekitHttpUrl = livekitUrl.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
    const rooms = new RoomServiceClient(livekitHttpUrl, apiKey, apiSecret);
    const body = await req.json();
    const action = body?.action;

    if (action === "list") {
      const { data: lives, error } = await admin.from("live_broadcasts")
        .select("id, title, description, status, started_at, recording_status")
        .eq("status", "live")
        .order("started_at", { ascending: false })
        .limit(30);
      if (error) {
        console.error("lives-api list failed", error.message);
        return json({ error: "Não foi possível carregar as transmissões." }, 500);
      }
      return json({ lives: lives ?? [] });
    }

    if (action === "start") {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      if (!title || title.length > 100 || description.length > 500) return json({ error: "Informe um título de até 100 caracteres e descrição de até 500." }, 400);
      const { data: existing } = await admin.from("live_broadcasts").select("id").eq("host_user_id", user.id).eq("status", "live").maybeSingle();
      if (existing) return json({ error: "Você já tem uma transmissão ativa.", live_id: existing.id }, 409);

      const roomName = "ct-live-" + crypto.randomUUID().replaceAll("-", "");
      await rooms.createRoom({ name: roomName, emptyTimeout: 60, maxParticipants: 1000 });
      const { data: live, error } = await admin.from("live_broadcasts").insert({
        room_name: roomName, host_user_id: user.id, title, description, status: "live",
      }).select("id, room_name, title, description, status, started_at, recording_status").single();
      if (error || !live) {
        await rooms.deleteRoom(roomName).catch(() => undefined);
        console.error("lives-api insert failed", error?.message);
        return json({ error: "Não foi possível registrar a transmissão." }, 500);
      }
      const token = new AccessToken(apiKey, apiSecret, { identity: user.id, ttl: "2h" });
      token.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true, canPublishData: true });
      return json({ live, livekit_url: livekitUrl, token: await token.toJwt(), role: "host" }, 201);
    }

    if (action === "join") {
      const liveId = body.live_id;
      if (typeof liveId !== "string") return json({ error: "Transmissão inválida." }, 400);
      const { data: live, error } = await admin.from("live_broadcasts")
        .select("id, room_name, title, description, status, started_at, recording_status")
        .eq("id", liveId).eq("status", "live").maybeSingle();
      if (error || !live) return json({ error: "Esta transmissão não está ao vivo." }, 404);
      const token = new AccessToken(apiKey, apiSecret, { identity: user.id, ttl: "2h" });
      token.addGrant({ roomJoin: true, room: live.room_name, canPublish: false, canSubscribe: true, canPublishData: true });
      return json({ live, livekit_url: livekitUrl, token: await token.toJwt(), role: "viewer" });
    }

    if (action === "end") {
      const liveId = body.live_id;
      if (typeof liveId !== "string") return json({ error: "Transmissão inválida." }, 400);
      const { data: live, error: lookupError } = await admin.from("live_broadcasts")
        .select("id, room_name, host_user_id, status").eq("id", liveId).maybeSingle();
      if (lookupError || !live) return json({ error: "Transmissão não encontrada." }, 404);
      if (live.host_user_id !== user.id) return json({ error: "Somente quem iniciou pode encerrar esta transmissão." }, 403);
      if (live.status === "ended") return json({ ok: true, status: "ended" });
      const { error } = await admin.from("live_broadcasts").update({
        status: "ended", ended_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", liveId).eq("status", "live");
      if (error) return json({ error: "Não foi possível encerrar a transmissão." }, 500);
      await rooms.deleteRoom(live.room_name).catch((e) => console.error("LiveKit room cleanup failed", e instanceof Error ? e.message : "unknown"));
      return json({ ok: true, status: "ended", recording_status: "not_configured" });
    }

    return json({ error: "Ação desconhecida." }, 400);
  } catch (error) {
    console.error("lives-api error:", error instanceof Error ? error.message : "unknown");
    return json({ error: "Serviço de transmissão ainda não está configurado ou ocorreu uma falha." }, 503);
  }
});
