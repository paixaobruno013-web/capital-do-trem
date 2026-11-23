import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import { WebhookReceiver } from "npm:livekit-server-sdk@2.19.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  try {
    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!apiKey || !apiSecret || !supabaseUrl || !serviceRoleKey) {
      return json({ error: "Webhook ainda não configurado." }, 503);
    }
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Assinatura ausente." }, 401);
    const rawBody = await req.text();
    const receiver = new WebhookReceiver(apiKey, apiSecret);
    let event: any;
    try {
      event = await receiver.receive(rawBody, authorization);
    } catch {
      return json({ error: "Assinatura inválida." }, 401);
    }
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const info = event?.egressInfo;
    if (!info?.egressId || !info?.roomName) return json({ ok: true, ignored: true });
    const { data: live, error: lookupError } = await admin.from("live_broadcasts")
      .select("id, recording_status")
      .eq("room_name", info.roomName)
      .maybeSingle();
    if (lookupError) {
      console.error("lives-webhook lookup failed", lookupError.message);
      return json({ error: "Falha ao localizar transmissão." }, 500);
    }
    if (!live) return json({ ok: true, ignored: true });
    const status = String(info.status ?? "");
    if (event.event === "egress_started" || status === "EGRESS_ACTIVE") {
      const { error } = await admin.from("live_broadcasts").update({
        recording_egress_id: info.egressId,
        recording_status: "recording",
        recording_started_at: new Date().toISOString(),
        recording_error: null,
        updated_at: new Date().toISOString(),
      }).eq("id", live.id);
      if (error) return json({ error: "Falha ao atualizar gravação." }, 500);
    } else if (event.event === "egress_ended") {
      const failed = status === "EGRESS_FAILED" || status === "EGRESS_ABORTED";
      const { error } = await admin.from("live_broadcasts").update({
        recording_egress_id: info.egressId,
        recording_status: failed ? "failed" : "processing",
        recording_error: failed ? String(info.error ?? "Falha na gravação").slice(0, 500) : null,
        updated_at: new Date().toISOString(),
      }).eq("id", live.id);
      if (error) return json({ error: "Falha ao atualizar gravação." }, 500);
    }
    return json({ ok: true });
  } catch (error) {
    console.error("lives-webhook error", error instanceof Error ? error.message : "unknown");
    return json({ error: "Falha interna ao processar webhook." }, 500);
  }
});
