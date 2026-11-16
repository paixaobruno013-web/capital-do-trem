import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [auth,redeJs,redeHtml,chat,sql,prepare,sw,player,home,musicUi]=await Promise.all([
 read('supabase/auth.js'),read('rede.js'),read('rede.html'),read('bate-papo.html'),
 read('supabase/migrations/20261116150000_personal_playlists.sql'),read('scripts/prepare-web.mjs'),read('sw.js'),read('capital-music-player.js'),read('index.html'),read('music-playlists.js')
]);
const checks=[
 [sql.includes('create table if not exists public.playlists')&&sql.includes('create table if not exists public.playlist_songs'),'Banco cria playlists e itens com ordem'],
 [sql.includes('alter table public.playlists enable row level security')&&sql.includes('alter table public.playlist_songs enable row level security'),'RLS habilitada nas duas tabelas'],
 [sql.includes('playlists_select_owner')&&sql.includes('playlists_insert_owner')&&sql.includes('playlists_update_owner')&&sql.includes('playlists_delete_owner'),'Políticas isolam playlists por proprietário'],
 [sql.includes('playlist_songs_insert_owner_published_song')&&sql.includes("s.status = 'published'"),'Só músicas publicadas podem entrar em playlists'],
 [auth.includes('export async function getMyPlaylists')&&auth.includes('export async function createMyPlaylist'),'API de listar e criar playlists existe'],
 [auth.includes('export async function addSongToMyPlaylist')&&auth.includes('export async function removeSongFromMyPlaylist'),'API de adicionar e remover faixas existe'],
 [auth.includes('export async function moveSongInMyPlaylist')&&auth.includes('temporary=')&&!auth.includes('update({position:-1})'),'Reordenação não viola a validação de posição'],
 [redeHtml.includes('class="playlist-manager card"')&&redeHtml.includes('id="my-playlists-list"'),'Playlists aparecem na área de perfil, separadas da Central de Músicas'],
 [redeJs.includes('async function loadPlaylists')&&redeJs.includes('api.createMyPlaylist')&&redeJs.includes('api.addSongToMyPlaylist'),'Interface permite criar playlists e adicionar faixas'],
 [redeJs.includes('api.moveSongInMyPlaylist')&&redeJs.includes('api.removeSongFromMyPlaylist'),'Interface permite reordenar e remover faixas'],
 [chat.includes('Grupo CAPITAL DO TREM')&&chat.includes('id="chat-topics"')&&!chat.includes('fala-uai-player'),'Chat apresenta grupo oficial e salas por assunto sem misturar o player'],
 [home.includes('id="capital-music-player"')&&redeHtml.includes('id="my-playlists-list"')&&redeJs.includes('api.getMyPlaylists'),'Player fica na Central de Músicas e playlists ficam no perfil'],
 [redeJs.includes('api.createMyPlaylist')&&redeJs.includes('api.addSongToMyPlaylist')&&player.includes("audio.addEventListener('ended'")&&player.includes('function step(amount)'),'Usuário cria playlists no perfil, adiciona faixas e reproduz pelo player 3D'],
 [chat.includes('id="messages"')&&!chat.includes('fala-uai-player'),'Player não invade a área de bate-papo'],
 [redeHtml.includes('id="post-caption-count"')&&redeHtml.includes('id="post-preview"')&&redeHtml.includes('id="clear-post-file"'),'Composer social oferece contador, prévia e remoção de mídia'],
 [redeJs.includes('function clearPostPreview')&&redeJs.includes('URL.createObjectURL(file)')&&redeJs.includes('URL.revokeObjectURL'),'Prévia de mídia libera URL temporária ao limpar'],
 [prepare.includes("'capital-futurista.css'")&&sw.includes("'./capital-futurista.css'"),'CSS futurista é empacotado e armazenado no cache PWA']
];
for(const [ok,label] of checks){console.log((ok?'OK  ':'ERRO')+label);if(!ok)process.exitCode=1;}
for(const [file,source] of [['supabase/auth.js',auth],['rede.js',redeJs]]){
 const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:source,encoding:'utf8'});
 if(result.status!==0){console.error('Erro de sintaxe em '+file+':\n'+(result.stderr||result.stdout));process.exitCode=1;}else console.log('OK  Sintaxe '+file);
}
if(process.exitCode)process.exit(process.exitCode);
console.log('Playlists, FALA UAI e composer social verificados: '+checks.length+' verificações.');
