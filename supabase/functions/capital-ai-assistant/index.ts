const allowedOrigins = new Set([
  'https://paixaobruno013-web.github.io',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
  ...(Deno.env.get('AI_ALLOWED_ORIGINS') || '').split(',').map(value => value.trim()).filter(Boolean)
]);
const corsFor = (origin: string) => ({
  'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'null',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin'
});

const json = (body: unknown, status = 200, corsHeaders: Record<string, string> = {}) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});

const recentRequests = new Map<string, number[]>();
const allowedModes = new Set(['assistant', 'caption', 'describe']);

Deno.serve(async (request) => {
  const origin = request.headers.get('Origin') || '';
  const corsHeaders = corsFor(origin);
  const reply = (body: unknown, status = 200) => json(body, status, corsHeaders);
  if (origin && !allowedOrigins.has(origin)) return reply({ error: 'Origem não autorizada.' }, 403);
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return json({ error: 'O serviço de IA ainda não foi ativado pelo administrador.' }, 503);

  const authorization = request.headers.get('Authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token || token === authorization) return json({ error: 'Entre na sua conta para continuar.' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (!supabaseUrl || !anonKey) return json({ error: 'Configuração segura indisponível.' }, 503);

  const userResponse = await fetch(supabaseUrl + '/auth/v1/user', {
    headers: { apikey: anonKey, Authorization: 'Bearer ' + token }
  });
  if (!userResponse.ok) return json({ error: 'Sessão inválida ou expirada. Entre novamente.' }, 401);
  const user = await userResponse.json();
  if (!user?.id) return json({ error: 'Conta não confirmada.' }, 401);

  const now = Date.now();
  const recent = (recentRequests.get(user.id) || []).filter(time => now - time < 10 * 60 * 1000);
  if (recent.length >= 12) return json({ error: 'Limite temporário atingido. Aguarde alguns minutos.' }, 429);
  recent.push(now); recentRequests.set(user.id, recent);

  let rawBody = '';
  try { rawBody = await request.text(); } catch { return json({ error: 'Pedido inválido.' }, 400); }
  if (new TextEncoder().encode(rawBody).byteLength > 5_500_000) return json({ error: 'A imagem é muito grande. Escolha uma foto menor.' }, 413);
  let body: { prompt?: unknown; image?: unknown; mode?: unknown };
  try { body = JSON.parse(rawBody); } catch { return json({ error: 'Pedido inválido.' }, 400); }
  const prompt = String(body.prompt || '').trim().slice(0, 1800);
  const image = String(body.image || '');
  const mode = String(body.mode || 'assistant');
  if (!allowedModes.has(mode)) return json({ error: 'Ação não permitida.' }, 400);
  if (!prompt && !image) return json({ error: 'Escreva uma pergunta ou envie uma imagem.' }, 400);
  if (image && (!/^data:image\/(jpeg|png|webp);base64,/i.test(image) || image.length > 5_000_000)) {
    return json({ error: 'Formato de imagem inválido ou arquivo acima do limite.' }, 413);
  }

  const instructions = mode === 'caption'
    ? 'Você é o assistente criativo do Capital do Trem. Analise apenas elementos visíveis, não identifique pessoas nem infira atributos sensíveis. Crie três legendas curtas em português brasileiro, com estilos diferentes, adequadas à cultura musical e comunitária. Não invente nomes, locais ou fatos.'
    : mode === 'describe'
    ? 'Descreva objetivamente a imagem em português brasileiro, incluindo texto visível quando legível. Não identifique pessoas, não infira atributos sensíveis e sinalize incertezas.'
    : 'Você é o assistente do aplicativo Capital do Trem. Ajude com música, divulgação, criação de conteúdo, navegação e uso seguro do app. Responda em português brasileiro, com clareza e passos curtos. Não solicite senhas, códigos ou chaves. Não identifique pessoas em imagens nem infira atributos sensíveis.';

  const content: Array<Record<string, unknown>> = [{ type: 'input_text', text: (instructions + '\n\nPedido do usuário: ' + prompt).slice(0, 3000) }];
  if (image) content.push({ type: 'input_image', image_url: image, detail: 'high' });

  const aiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-5.4-mini',
      store: false,
      max_output_tokens: 500,
      input: [{ role: 'user', content }]
    })
  });
  if (!aiResponse.ok) {
    const errorBody = await aiResponse.text();
    console.error('OpenAI request failed:', aiResponse.status, errorBody.slice(0, 500));
    return json({ error: aiResponse.status === 429 ? 'A IA está ocupada. Tente novamente em instantes.' : 'Não foi possível concluir a análise agora.' }, 502);
  }
  const result = await aiResponse.json();
  const answer = (result.output || []).flatMap((item: any) => item.content || [])
    .filter((item: any) => item.type === 'output_text')
    .map((item: any) => item.text || '').join('\n').trim();
  if (!answer) return json({ error: 'A IA não retornou uma resposta.' }, 502);
  return reply({ answer: answer.slice(0, 5000) });
});
