import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=300, s-maxage=300",
};

function xmlText(source: string, tag: string): string {
  const match = source.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + tag + ">", "i"));
  return (match?.[1] || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  try {
    const channelResponse = await fetch("https://www.youtube.com/@capitaldotrem", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CapitalDoTremFeed/1.0)" },
      signal: AbortSignal.timeout(9000),
    });
    if (!channelResponse.ok) throw new Error("Não foi possível consultar o canal do YouTube.");
    const html = await channelResponse.text();
    const channelId = html.match(/"channelId"\s*:\s*"(UC[a-zA-Z0-9_-]{22})"/)?.[1]
      || html.match(/itemprop=["']channelId["'][^>]*content=["'](UC[a-zA-Z0-9_-]{22})["']/i)?.[1]
      || html.match(/content=["'](UC[a-zA-Z0-9_-]{22})["'][^>]*itemprop=["']channelId["']/i)?.[1];
    if (!channelId) throw new Error("O identificador do canal não foi encontrado na página pública.");
    const feedResponse = await fetch("https://www.youtube.com/feeds/videos.xml?channel_id=" + channelId, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CapitalDoTremFeed/1.0)" },
      signal: AbortSignal.timeout(9000),
    });
    if (!feedResponse.ok) throw new Error("O feed público do YouTube está indisponível.");
    const xml = await feedResponse.text();
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, 4).map((match) => {
      const entry = match[1];
      const id = xmlText(entry, "yt:videoId");
      return { id, title: xmlText(entry, "title") || "Vídeo da Capital do Trem",
        publishedAt: xmlText(entry, "published"), url: "https://www.youtube.com/watch?v=" + id };
    }).filter((item) => /^[a-zA-Z0-9_-]{11}$/.test(item.id));
    return new Response(JSON.stringify({ channelId, videos: entries, fetchedAt: new Date().toISOString() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Falha ao consultar o YouTube." }), {
      status: 502, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
});
