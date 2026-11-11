import { readFile } from 'node:fs/promises';
const [index, auth, messages, worker, edge] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/auth.js', import.meta.url), 'utf8'),
  readFile(new URL('../mensagens.html', import.meta.url), 'utf8'),
  readFile(new URL('../sw.js', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/functions/youtube-channel-feed/index.ts', import.meta.url), 'utf8')
]);
const checks = [
  [auth.includes('export async function getMySavedPosts') && auth.includes('export async function toggleSavedPost'), 'API de publicações salvas ausente'],
  [index.includes('id="saved-publications-list"') && index.includes('module.toggleSavedPost(item.id)'), 'Coleção pessoal de publicações não está ligada ao banco'],
  [index.includes('id="saved-publications-login"'), 'Orientação de login da coleção ausente'],
  [messages.includes('Direct + teclado móvel compacto') && messages.includes('#private-emoji-toggle'), 'Aprimoramento visual do Direct/teclado ausente'],
  [index.includes('youtube-feed.js') && index.includes('youtube-feed-status'), 'Atualizador automático do YouTube não está conectado à página'],
  [edge.includes('feeds/videos.xml?channel_id=') && edge.includes('capitaldotrem'), 'Função não consulta o feed público do canal correto'],
  [edge.includes('slice(0, 4)') && edge.includes('Access-Control-Allow-Origin'), 'Feed não limita os quatro vídeos nem libera CORS'],
  [worker.includes('youtube-feed.js') && /capital-do-trem-v[0-9]+/.test(worker), 'Service worker não atualiza o módulo do YouTube'],
  [index.includes('data-youtube-id="-c2QERKILzg"') && index.includes('data-youtube-id="HHKsZAS1eMk"'), 'Painel inicial exibe as músicas 4 e 5'],
  [index.includes('5º • Música') && index.includes('6º • Música') && feed.includes("id: '-c2QERKILzg'") && feed.includes("id: 'HHKsZAS1eMk'"), 'Músicas 4 e 5 permanecem após a atualização automática do feed'],
  [/videos\\.slice\\(0, 3\\)/.test(feed), 'Feed automático mantém três vídeos recentes antes das duas músicas fixas']
];
for (const [ok, message] of checks) { console.log((ok ? 'OK  ' : 'ERRO ') + message); if (!ok) process.exitCode = 1; }
if (!process.exitCode) console.log('Coleção de publicações, Direct e feed automático do YouTube: verificações aprovadas.');
