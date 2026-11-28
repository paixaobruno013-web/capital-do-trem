const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Chamadas de voz e vídeo temporariamente pausadas na primeira fase.
// Não consulta o banco, emite tokens, nem acessa o provedor de mídia.
Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return new Response(JSON.stringify({
    error: "Chamadas de voz e vídeo estão temporariamente pausadas para priorizar a estabilidade do Capital do Trem. Use o chat por mensagens.",
    feature: "calls",
    available: false,
  }), {
    status: 410,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
