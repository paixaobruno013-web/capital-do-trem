const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 410) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Lives foram adiadas para reduzir complexidade e tráfego na primeira fase.
// Mantemos a função publicada para responder claramente a clientes antigos,
// sem criar salas, emitir tokens ou iniciar transmissão.
Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return json({
    error: "As transmissões ao vivo estão temporariamente adiadas. O Capital do Trem está priorizando música, comunidade e estabilidade.",
    feature: "live_broadcasts",
    available: false,
  }, 410);
});
