import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-gallery-cleanup-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });
  const token = req.headers.get("x-gallery-cleanup-token") || "";
  if (!token || token.length < 40) return new Response("Unauthorized", { status: 401, headers: cors });
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return new Response("Server configuration unavailable", { status: 500, headers: cors });

  const verifier = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: allowed, error: verifyError } = await verifier.rpc("verify_private_gallery_cleanup_secret", { p_secret: token });
  if (verifyError || allowed !== true) return new Response("Unauthorized", { status: 401, headers: cors });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let deleted = 0;
  for (let batch = 0; batch < 10; batch++) {
    const { data: expired, error } = await admin.from("private_gallery_items")
      .select("id,storage_path").lte("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: true }).limit(500);
    if (error) return new Response(JSON.stringify({ error: error.message, deleted }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    if (!expired?.length) break;
    const { error: removeError } = await admin.storage.from("capital-do-trem-private-gallery").remove(expired.map((item) => item.storage_path));
    if (removeError) return new Response(JSON.stringify({ error: removeError.message, deleted }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    const { error: rowError } = await admin.from("private_gallery_items").delete().in("id", expired.map((item) => item.id));
    if (rowError) return new Response(JSON.stringify({ error: rowError.message, deleted }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    deleted += expired.length;
    if (expired.length < 500) break;
  }
  return new Response(JSON.stringify({ ok: true, deleted, checked_at: new Date().toISOString() }), {
    status: 200, headers: { ...cors, "Content-Type": "application/json" }
  });
});
