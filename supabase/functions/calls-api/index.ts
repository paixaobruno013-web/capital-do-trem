import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import { AccessToken } from "npm:livekit-server-sdk@2.19.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server secret: ${name}`);
  return value;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Sessão não encontrada." }, 401);

    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const anonKey = requiredEnv("SUPABASE_ANON_KEY");
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const livekitUrl = requiredEnv("LIVEKIT_URL");
    const livekitApiKey = requiredEnv("LIVEKIT_API_KEY");
    const livekitApiSecret = requiredEnv("LIVEKIT_API_SECRET");

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "Sessão inválida ou expirada." }, 401);
    const user = authData.user;

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json();
    const action = body?.action;

    async function issueToken(callId: string) {
      const { data: call, error: callError } = await admin
        .from("calls")
        .select("id, room_name, call_type, status, initiator_id, max_participants")
        .eq("id", callId)
        .maybeSingle();
      if (callError || !call) throw new Error("Chamada não encontrada.");
      if (!["ringing", "active"].includes(call.status)) throw new Error("Esta chamada já foi encerrada.");

      const { data: participant, error: participantError } = await admin
        .from("call_participants")
        .select("id, state")
        .eq("call_id", callId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (participantError || !participant) throw new Error("Você não foi convidado para esta chamada.");
      if (!["invited", "ringing", "joined"].includes(participant.state)) {
        throw new Error("Seu convite não está mais ativo.");
      }

      const { error: updateError } = await admin
        .from("call_participants")
        .update({
          state: "joined",
          joined_at: participant.state === "joined" ? undefined : new Date().toISOString(),
          outcome: null,
        })
        .eq("id", participant.id);
      if (updateError) throw new Error("Não foi possível confirmar sua entrada.");

      await admin.from("calls")
        .update({ status: "active", started_at: new Date().toISOString() })
        .eq("id", callId)
        .is("started_at", null);

      const token = new AccessToken(livekitApiKey, livekitApiSecret, {
        identity: user.id,
        ttl: "2h",
      });
      token.addGrant({
        roomJoin: true,
        room: call.room_name,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      return {
        call_id: call.id,
        room_name: call.room_name,
        call_type: call.call_type,
        livekit_url: livekitUrl,
        token: await token.toJwt(),
      };
    }

    if (action === "start") {
      const callType = body.call_type;
      const conversationId = body.conversation_id;
      const requestedIds = Array.isArray(body.invited_user_ids) ? body.invited_user_ids : [];

      if (!["audio", "video"].includes(callType)) return json({ error: "Tipo de chamada inválido." }, 400);
      if (typeof conversationId !== "string") return json({ error: "Escolha uma conversa privada para iniciar a chamada." }, 400);
      if (requestedIds.length > 3 || requestedIds.some((id: unknown) => typeof id !== "string")) {
        return json({ error: "É permitido convidar no máximo três pessoas além de você." }, 400);
      }

      const { data: conversation, error: conversationError } = await admin
        .from("private_conversations")
        .select("id, participant_one, participant_two, status")
        .eq("id", conversationId)
        .maybeSingle();
      if (conversationError || !conversation || conversation.status !== "accepted" ||
          ![conversation.participant_one, conversation.participant_two].includes(user.id)) {
        return json({ error: "Conversa não autorizada para iniciar chamada." }, 403);
      }

      const conversationPartner = conversation.participant_one === user.id
        ? conversation.participant_two
        : conversation.participant_one;
      const inviteIds = [...new Set([conversationPartner, ...requestedIds])]
        .filter((id) => id !== user.id);
      if (inviteIds.length < 1 || inviteIds.length > 3) {
        return json({ error: "A chamada precisa ter de uma a três pessoas convidadas." }, 400);
      }

      for (const inviteId of inviteIds) {
        let { data: relation } = await admin.from("private_conversations")
          .select("id")
          .eq("status", "accepted")
          .eq("participant_one", user.id)
          .eq("participant_two", inviteId)
          .limit(1)
          .maybeSingle();
        if (!relation) {
          const result = await admin.from("private_conversations")
            .select("id")
            .eq("status", "accepted")
            .eq("participant_one", inviteId)
            .eq("participant_two", user.id)
            .limit(1)
            .maybeSingle();
          relation = result.data;
        }
        if (!relation) return json({ error: "Só é possível convidar pessoas com conversa privada aceita com você." }, 403);
      }

      const { data: existingCall } = await admin.from("calls")
        .select("id")
        .eq("initiator_id", user.id)
        .in("status", ["ringing", "active"])
        .limit(1)
        .maybeSingle();
      if (existingCall) return json({ error: "Você já tem uma chamada em andamento." }, 409);

      const { count: recentCallCount } = await admin.from("calls")
        .select("id", { count: "exact", head: true })
        .eq("initiator_id", user.id)
        .gte("created_at", new Date(Date.now() - 60_000).toISOString());
      if ((recentCallCount ?? 0) >= 3) return json({ error: "Aguarde um minuto antes de iniciar outra chamada." }, 429);

      const { data: call, error: createError } = await admin.from("calls")
        .insert({
          conversation_id: conversationId,
          initiator_id: user.id,
          call_type: callType,
          status: "ringing",
          max_participants: 4,
        })
        .select("id, room_name, call_type")
        .single();
      if (createError || !call) return json({ error: "Não foi possível iniciar a chamada." }, 500);

      const participants = [
        { call_id: call.id, user_id: user.id, role: "host", state: "joined", joined_at: new Date().toISOString() },
        ...inviteIds.map((id) => ({ call_id: call.id, user_id: id, role: "participant", state: "invited" })),
      ];
      const { error: participantsError } = await admin.from("call_participants").insert(participants);
      if (participantsError) {
        await admin.from("calls").delete().eq("id", call.id);
        return json({ error: participantsError.message.includes("Limite de quatro") ? "A chamada atingiu o limite de quatro participantes." : "Não foi possível registrar os participantes." }, 409);
      }

      const inviteRows = inviteIds.map((id) => ({
        call_id: call.id,
        invited_user_id: id,
        created_by: user.id,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      }));
      const { error: inviteError } = await admin.from("call_invites").insert(inviteRows);
      if (inviteError) {
        await admin.from("calls").delete().eq("id", call.id);
        return json({ error: "Não foi possível registrar os convites." }, 500);
      }

      return json(await issueToken(call.id));
    }

    if (action === "join") {
      if (typeof body.call_id !== "string") return json({ error: "Identificador da chamada inválido." }, 400);
      const { data: invite } = await admin.from("call_invites")
        .select("id, expires_at, revoked_at, used_at")
        .eq("call_id", body.call_id)
        .eq("invited_user_id", user.id)
        .maybeSingle();
      if (!invite || invite.revoked_at || invite.used_at || new Date(invite.expires_at).getTime() < Date.now()) {
        const { data: host } = await admin.from("call_participants")
          .select("id")
          .eq("call_id", body.call_id)
          .eq("user_id", user.id)
          .eq("role", "host")
          .maybeSingle();
        if (!host) return json({ error: "Convite expirado ou não encontrado." }, 403);
      }
      const tokenPayload = await issueToken(body.call_id);
      if (invite && !invite.revoked_at && !invite.used_at && new Date(invite.expires_at).getTime() >= Date.now()) {
        await admin.from("call_invites").update({
          used_at: new Date().toISOString(),
          approved_at: new Date().toISOString(),
        }).eq("id", invite.id);
      }
      return json(tokenPayload);
    }

    if (action === "decline") {
      if (typeof body.call_id !== "string") return json({ error: "Identificador da chamada inválido." }, 400);
      const { error } = await admin.from("call_participants")
        .update({ state: "declined", left_at: new Date().toISOString(), outcome: "declined" })
        .eq("call_id", body.call_id)
        .eq("user_id", user.id)
        .in("state", ["invited", "ringing"]);
      if (error) return json({ error: "Não foi possível recusar a chamada." }, 500);
      await admin.from("call_invites").update({ revoked_at: new Date().toISOString() })
        .eq("call_id", body.call_id).eq("invited_user_id", user.id);
      return json({ ok: true });
    }

    if (action === "leave" || action === "end") {
      if (typeof body.call_id !== "string") return json({ error: "Identificador da chamada inválido." }, 400);
      const { data: call } = await admin.from("calls")
        .select("id, initiator_id, status")
        .eq("id", body.call_id)
        .maybeSingle();
      if (!call) return json({ error: "Chamada não encontrada." }, 404);
      if (action === "end" || call.initiator_id === user.id) {
        if (call.initiator_id !== user.id) return json({ error: "Somente quem iniciou pode encerrar a chamada para todos." }, 403);
        await admin.from("calls").update({
          status: "ended",
          ended_at: new Date().toISOString(),
          ended_reason: "ended_by_host",
        }).eq("id", call.id);
        await admin.from("call_participants")
          .update({ state: "left", left_at: new Date().toISOString(), outcome: "call_ended" })
          .eq("call_id", call.id)
          .in("state", ["invited", "ringing", "joined"]);
      } else {
        const { error } = await admin.from("call_participants")
          .update({ state: "left", left_at: new Date().toISOString(), outcome: "left" })
          .eq("call_id", call.id)
          .eq("user_id", user.id)
          .eq("state", "joined");
        if (error) return json({ error: "Não foi possível sair da chamada." }, 500);
      }
      return json({ ok: true });
    }

    return json({ error: "Ação desconhecida." }, 400);
  } catch (error) {
    console.error("calls-api error:", error instanceof Error ? error.message : "unknown");
    return json({ error: "Serviço de chamadas ainda não está configurado ou ocorreu uma falha." }, 503);
  }
});
