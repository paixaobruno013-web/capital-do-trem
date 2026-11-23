import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return jsonError("Method not allowed", 405);

  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) return jsonError("Authentication required", 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return jsonError("Server configuration unavailable", 500);

  let input: { message_id?: string; kind?: string };
  try { input = await req.json(); } catch { return jsonError("Invalid request body", 400); }
  const messageId = String(input.message_id || "");
  const kind = input.kind;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(messageId)
      || !["group", "private"].includes(String(kind))) {
    return jsonError("Invalid message reference", 400);
  }

  // User-scoped client: RLS remains the authority for reading the message and
  // consuming the unique per-viewer record.
  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  const user = authData?.user;
  if (authError || !user) return jsonError("Invalid session", 401);

  const group = kind === "group";
  const table = group ? "chat_messages" : "private_messages";
  const viewsTable = group ? "chat_message_views" : "private_message_views";
  const ownerField = group ? "author_id" : "sender_id";
  const { data: message, error: readError } = await userClient.from(table)
    .select(`id,${ownerField},attachment_path,attachment_type,attachment_mime,view_once`)
    .eq("id", messageId)
    .single();
  if (readError || !message) return jsonError("Message not found or access denied", 404);
  if (message[ownerField] === user.id) return jsonError("Sender cannot open their own one-time media", 403);
  if (!message.view_once || !message.attachment_path || !["image", "video", "audio"].includes(message.attachment_type)) {
    return jsonError("Message does not contain valid one-time media", 422);
  }

  // Download first, then atomically consume the unique (message_id, viewer_id)
  // row. Concurrent requests may download internally, but only one can receive
  // the bytes; every later request is rejected by the primary-key constraint.
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: file, error: downloadError } = await admin.storage
    .from("capital-do-trem-chat")
    .download(message.attachment_path);
  if (downloadError || !file) return jsonError("Media unavailable", 404);
  if (file.size < 1 || file.size > 20 * 1024 * 1024) return jsonError("Media size is not allowed", 413);

  const mime = String(message.attachment_mime || file.type || "").toLowerCase();
  const allowedMime = message.attachment_type === "image" ? /^image\/(jpeg|png|webp|gif)$/
    : message.attachment_type === "video" ? /^video\/(mp4|webm)$/
    : /^audio\/(mpeg|mp4|aac|ogg|wav|x-wav|webm)$/;
  if (!allowedMime.test(mime)) return jsonError("Unsupported media format", 415);

  const { error: consumeError } = await userClient.from(viewsTable)
    .insert({ message_id: messageId, viewer_id: user.id });
  if (consumeError) {
    if (consumeError.code === "23505") return jsonError("This media has already been viewed", 409);
    return jsonError("Could not consume one-time media", 403);
  }

  const bytes = await file.arrayBuffer();
  return new Response(bytes, {
    status: 200,
    headers: {
      ...cors,
      "Content-Type": mime,
      "Content-Length": String(bytes.byteLength),
      "X-Chat-Media-Type": message.attachment_type,
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Pragma": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
});
