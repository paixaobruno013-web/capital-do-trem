import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const [ai, camera, index, sw, edge, built, profile, groupChat, privateChat, privacy] = await Promise.all([
  read('capital-ai.js'), read('home-story-composer.js'), read('index.html'),
  read('sw.js'), read('supabase/functions/capital-ai-assistant/index.ts'),
  read('www/capital-ai.js'), read('rede.html'), read('bate-papo.html'), read('mensagens.html'), read('privacidade.html')
]);
const checks = [
  [ai.includes("functions.invoke('capital-ai-assistant'") && ai.includes("getSession()"), 'Assistente chama IA somente com sessão autenticada'],
  [ai.includes('data-cdt-go') && ai.includes('data-cdt-href') && ai.includes('cdt-command-center'), 'Central oferece atalhos para áreas principais'],
  [camera.includes('runCapitalAI') && camera.includes('createAIImageDataUrl') && camera.includes("mode: 'caption'"), 'Câmera permite análise explícita de foto e sugestão de legenda'],
  [index.includes('home-story-ai-button') && index.includes('capital-ai.js'), 'Interface da câmera e assistente carregados'],
  [index.includes('A foto será enviada ao serviço de IA') && index.includes('Analisar foto e criar legenda'), 'Aviso de privacidade antes da análise da imagem'],
  [edge.includes("Deno.env.get('OPENAI_API_KEY')") && edge.includes('/auth/v1/user') && edge.includes('store: false'), 'Chave IA somente no servidor e sessão validada'],
  [edge.includes('allowedOrigins') && edge.includes('const reply =') && !edge.includes('return json('), 'CORS limitado a origens autorizadas em todas as respostas'],
  [edge.includes('recent.length >= 12') && edge.includes('5_500_000') && edge.includes('allowedModes'), 'Limite básico de uso, payload e ações permitidas'],
  [!/(sk-[A-Za-z0-9]{20,}|OPENAI_API_KEY\s*[:=]\s*['"][^'"]+)/.test(ai + edge), 'Nenhuma chave de IA gravada no código'],
  [/const CACHE='capital-do-trem-v(\d+)'/.test(sw) && Number(sw.match(/const CACHE='capital-do-trem-v(\d+)'/)?.[1] || 0) >= 306, 'Cache atualizado para a nova experiência'],
  [built.includes('functions.invoke') && built.includes('cdt-command-center'), 'Módulo IA incluído no pacote web/Android'],
  [profile.includes('src="./capital-ai.js"') && groupChat.includes('src="./capital-ai.js"') && privateChat.includes('src="./capital-ai.js"'), 'Assistente e atalhos disponíveis também no perfil e conversas'],
  [privacy.includes('Assistente de inteligência artificial e câmera') && privacy.includes('custos de API'), 'Política de privacidade informa envio opcional de imagens e custos da IA']
];
for (const [ok, label] of checks) { console.log((ok ? 'OK  ' : 'ERRO ') + label); if (!ok) process.exitCode = 1; }
for (const [name, source] of [['capital-ai.js', ai], ['home-story-composer.js', camera]]) {
  const result = spawnSync(process.execPath, ['--check', '--input-type=module'], { input: source, encoding: 'utf8' });
  if (result.status !== 0) { console.error('Sintaxe ' + name + ':\n' + (result.stderr || result.stdout)); process.exitCode = 1; }
  else console.log('OK  Sintaxe ' + name);
}
if (process.exitCode) process.exit(process.exitCode);
console.log(checks.length + ' verificações da IA, câmera e atalhos concluídas.');
