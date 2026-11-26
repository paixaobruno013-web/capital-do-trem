import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [home,rede,chat,account,redeJs,player,css,prepare,sw,auth]=await Promise.all([
 read('index.html'),read('rede.html'),read('bate-papo.html'),read('conta.html'),
 read('rede.js'),read('capital-music-player.js'),read('capital-futurista.css'),
 read('scripts/prepare-web.mjs'),read('sw.js'),read('supabase/auth.js')
]);
const checks=[
 [home.includes('id="capital-music-player"')&&home.includes("createCapitalMusicPlayer('capital-music-player'"),'Central de músicas tem player 3D integrado'],
 [home.includes('music-play-button')&&home.includes('musicPlayer.playSong(song)')&&home.includes("querySelector('.ct-player-fullscreen')?.click()"),'Catálogo e biblioteca iniciam o player unificado'],
 [rede.includes('id="rede-music-player"')&&redeJs.includes("createCapitalMusicPlayer('rede-music-player'"),'Rede social tem player 3D integrado'],
 [redeJs.includes('musicPlayer.playSong(song)'),'Faixas da rede social usam os controles do player'],
 [!chat.includes('id="chat-topics"')&&chat.includes('GRUPO • CAPITAL do TREM')&&!chat.includes('id="fala-uai-player"'),'Chat permanece dedicado às conversas e ao grupo CAPITAL DO TREM, sem criação de assuntos'],
 [chat.includes('id="fazer-amigos"')&&chat.includes('./mensagens.html'),'Chat oferece amizades e conversas privadas'],
 [player.includes('MÚSICAS DISPONÍVEIS')&&player.includes('catalogSelect.addEventListener')&&player.includes('Escolha uma música publicada'),'Player oferece automaticamente o catálogo completo para escolha de faixa'],
 [auth.includes('export async function getPublishedSongs')&&auth.includes('.range(from,from + pageSize - 1)')&&auth.includes('storage.createSignedUrls(paths, 60 * 60)'),'Catálogo público busca todas as músicas publicadas em lotes e prepara links de reprodução'],
 [player.includes('lastRecordedSongId!==current().id')&&!player.includes("if(typeof onPlay==='function'&&current())onPlay(current())"),'Reprodução registra cada faixa sem duplicar o histórico'],
 [player.includes('ct-player-artwork')&&player.includes('ct-art-track-title')&&player.includes('ct-art-track-artist'),'Capa musical mostra identidade, faixa e artista'],
 [player.includes('ct-player-play')&&player.includes('previous.addEventListener')&&player.includes('next.addEventListener')&&player.includes('range.addEventListener'),'Player tem reproduzir/pausar, voltar, avançar e busca de faixa'],
 [player.includes('MediaMetadata')&&player.includes('setActionHandler'),'Player integra controles de mídia do aparelho'],
 [account.includes('capital-futurista.css')&&css.includes('body:has(#basic-profile-form)'),'Cadastro recebe identidade futurista moderna'],
 [css.includes('body:has(#feed)')&&css.includes('body:has(#messages)'),'Rede social e chat recebem acabamento futurista'],
 [home.includes('capital-futurista.css')&&rede.includes('capital-futurista.css')&&chat.includes('capital-futurista.css')&&account.includes('capital-futurista.css'),'Todas as quatro áreas carregam a identidade visual'],
 [prepare.includes("'capital-music-player.js'")&&sw.includes("'./capital-music-player.js'"),'Player é incluído nos pacotes nativos e cache PWA']
];
checks.push(
 [home.includes('music-catalog-panel')&&home.includes('id="published-song-catalog"')&&home.includes('id="create-music-playlist"'),'Catálogo musical aparece no início da área Músicas com criação de playlist'],
 [home.includes('music-add-to-playlist')&&home.includes("addToPlaylist.textContent='＋'")&&home.includes("listen.textContent='▶'"),'Cada faixa oferece botões compactos de tocar e adicionar à playlist'],
 [css.includes('object-fit:contain!important')&&css.includes('max-height:205px'),'Capa musical preserva a arte inteira em tamanho compacto'],
 [home.includes('id="music-upload-area"')&&home.includes('id="music-upload-file"')&&home.includes('id="music-upload-title"')&&home.includes('id="music-upload-artist"')&&home.indexOf('id="music-upload-area"')<home.indexOf('id="my-uploaded-songs-panel"')&&!home.includes('music-upload-disclosure'),'Envio de música fica visível logo após a capa, antes das faixas enviadas, com campos de identificação']
);
for(const [ok,label] of checks){console.log((ok?'OK  ':'ERRO ')+label);if(!ok)process.exitCode=1;}
for(const [name,source] of [['rede.js',redeJs],['capital-music-player.js',player]]){
 const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:source,encoding:'utf8'});
 if(result.status!==0){console.error('Sintaxe '+name+':\n'+(result.stderr||result.stdout));process.exitCode=1;}else console.log('OK  Sintaxe '+name);
}
const chatStart=chat.indexOf("import {getMyPlaylists,getPublishedSongs,recordSongPlay}");
const chatEnd=chat.indexOf('</script>',chatStart);
const chatScript=chat.slice(chatStart,chatEnd);
const chatCheck=spawnSync(process.execPath,['--check','--input-type=module'],{input:chatScript,encoding:'utf8'});
if(chatCheck.status!==0){console.error('Sintaxe do módulo FALA UAI:\n'+(chatCheck.stderr||chatCheck.stdout));process.exitCode=1;}else console.log('OK  Sintaxe do módulo FALA UAI');
const homeStart=home.indexOf('// Catálogo musical compartilhado');
const homeEnd=home.indexOf('</script>',homeStart);
const homeScript=home.slice(homeStart,homeEnd);
const homeCheck=spawnSync(process.execPath,['--check','--input-type=module'],{input:homeScript,encoding:'utf8'});
if(homeCheck.status!==0){console.error('Sintaxe do catálogo/player inicial:\n'+(homeCheck.stderr||homeCheck.stdout));process.exitCode=1;}else console.log('OK  Sintaxe do catálogo/player inicial');
if(process.exitCode)process.exit(process.exitCode);
console.log(checks.length+' verificações de interface concluídas.');
