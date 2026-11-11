import { readFile } from 'node:fs/promises';
const [index, auth, messages, worker, edge, feed] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/auth.js', import.meta.url), 'utf8'),
  readFile(new URL('../mensagens.html', import.meta.url), 'utf8'),
  readFile(new URL('../sw.js', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/functions/youtube-channel-feed/index.ts', import.meta.url), 'utf8'),
  readFile(new URL('../youtube-feed.js', import.meta.url), 'utf8')
]);
const homeVideosBlock = feed.match(/const HOME_VIDEOS = \[([\s\S]*?)\n\];/);
const shortsBlock = feed.match(/const SHORTS = \[([\s\S]*?)\n\]\.map/);
const checks = [
  [auth.includes('export async function getMySavedPosts') && auth.includes('export async function toggleSavedPost'), 'API de publicações salvas ausente'],
  [index.includes('id="saved-publications-list"') && index.includes('module.toggleSavedPost(item.id)'), 'Coleção pessoal de publicações não está ligada ao banco'],
  [index.includes('id="saved-publications-login"'), 'Orientação de login da coleção ausente'],
  [messages.includes('Direct + teclado móvel compacto') && messages.includes('#private-emoji-toggle'), 'Aprimoramento visual do Direct/teclado ausente'],
  [index.includes('youtube-feed.js') && index.includes('youtube-feed-status'), 'Atualizador automático do YouTube não está conectado à página'],
  [edge.includes('feeds/videos.xml?channel_id=') && edge.includes('capitaldotrem'), 'Função não consulta o feed público do canal correto'],
  [edge.includes('slice(0, 4)') && edge.includes('Access-Control-Allow-Origin'), 'Feed não limita os quatro vídeos nem libera CORS'],
  [worker.includes('youtube-feed.js') && /capital-do-trem-v[0-9]+/.test(worker), 'Service worker não atualiza o módulo do YouTube'],
  [feed.includes("id:'W4wnKF5AHQA'") && feed.includes("id:'-c2QERKILzg'") && feed.includes("id:'HHKsZAS1eMk'"), 'Vídeo 4 e músicas 5 e 6 continuam no feed unificado'],
  [homeVideosBlock && (homeVideosBlock[1].match(/\{id:/g)||[]).length === 9 && shortsBlock && (shortsBlock[1].match(/'([A-Za-z0-9_-]{11})'/g)||[]).length === 25 && feed.includes("title:'Música da seleção Capital do Trem'") && !feed.includes('SHORTS.concat('), 'Nove vídeos da home separados da biblioteca de 25 Shorts'],
  [feed.includes('grid.replaceChildren(...videos.map(makeCard))') && feed.includes('const videos=HOME_VIDEOS;') && homeVideosBlock && (homeVideosBlock[1].match(/\{id:/g)||[]).length === 9, 'Home renderiza exatamente os nove vídeos originais']
];
for (const [ok, message] of checks) { console.log((ok ? 'OK  ' : 'ERRO ') + message); if (!ok) process.exitCode = 1; }
if (!process.exitCode) console.log('Coleção de publicações, Direct e feed automático do YouTube: verificações aprovadas.');
