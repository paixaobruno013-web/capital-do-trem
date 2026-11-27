import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const home = read('../index.html');
const chat = read('../bate-papo.html');
const inbox = read('../mensagens.html');
const css = read('../capital-modern-ui.css');
const chatStyles = read('../chat-modern.css');
const musicStyles = read('../capital-futurista.css');
const musicUpload = read('../music-upload.js');
const prepare = read('./prepare-web.mjs');
const sw = read('../sw.js');
const update = read('../update.js');
const signedRelease = read('../.github/workflows/android-signed-release.yml');

for (const [name, html] of [['index.html', home], ['bate-papo.html', chat]]) {
  assert.ok(html.includes('href="./capital-modern-ui.css?v=1"'),
    name + ' precisa carregar a folha de modernização');
}
for (const selector of [
  '#musicas', '#music-upload-area', '#published-song-catalog .music-track-row',
  '#music-playlists-list', '#capital-music-player', '#messages .message',
  '#composer', '.chat-panel'
]) assert.ok(css.includes(selector), 'Seletor visual ausente: ' + selector);

for (const [html, token] of [
  [home, 'id="musicas"'], [home, 'id="music-upload-area"'],
  [home, 'id="published-song-catalog"'], [home, 'music-track-row'],
  [home, 'id="music-playlists-list"'], [home, 'id="capital-music-player"'],
  [chat, 'id="messages"'], [chat, 'class="composer"'], [chat, "className='message'"]
]) assert.ok(html.includes(token), 'Elemento esperado ausente: ' + token);

assert.ok(prepare.includes("'capital-modern-ui.css'"),
  'A folha visual precisa ser copiada para o pacote www/Android/iOS');
assert.ok(prepare.includes("'chat-modern.css'") && prepare.includes("'capital-futurista.css'"),
  'Os estilos específicos do chat e de Músicas precisam entrar no pacote www/Android/iOS');
assert.ok(sw.includes("'./chat-modern.css'") && sw.includes("'./capital-futurista.css'"),
  'Os estilos específicos do chat e de Músicas precisam estar no cache complementar do PWA');
assert.ok(home.includes('id="home-feed-open"') && home.includes('class="home-feed-composer-collapsed"'),
  'A entrada para criar publicação deve ficar em uma linha antes de abrir o editor');
assert.ok(css.includes('overflow-x:clip') && css.includes('.home-feed-post-gallery,.home-feed-preview-gallery'),
  'As telas devem permanecer fixas na largura do aparelho, liberando deslize apenas nas galerias de publicações');
assert.ok(chat.includes('accept="image/*,video/*,audio/*"') && !chat.includes('application/pdf,text/plain,text/csv'),
  'O chat deve manter fotos, vídeos e áudio sem oferecer envio de documentos');
assert.ok(chatStyles.includes('.fala-profile-menu-button') && chatStyles.includes('display:none!important'),
  'Os três pontinhos do chat devem permanecer removidos; configurações ficam na engrenagem');
assert.ok(chat.includes('href="./chat-modern.css?v=1"') &&
  chatStyles.includes('#chat-profile-rail') &&
  chatStyles.includes('#open-group-profile') &&
  chatStyles.includes('#chat-online-profiles'),
  'O FALA UAI precisa carregar o alinhamento compacto do grupo e dos perfis online');
assert.ok(home.includes('<section id="music-upload-area" class="card music-upload-area" hidden') &&
  musicUpload.includes('isCurrentUserArtistOrAdmin()') &&
  musicUpload.includes('setUploadVisibility(false)') &&
  musicUpload.includes('setUploadVisibility(true)'),
  'O painel de envio musical deve iniciar oculto e só aparecer após validar conta de artista/MC/DJ ou administrador');
assert.ok(musicStyles.includes('#musicas #music-upload-area') &&
  musicStyles.includes('#musicas #published-song-catalog'),
  'A identidade visual nova precisa atingir o painel de envio e o catálogo musical reais');
assert.ok(sw.includes("'./capital-modern-ui.css'"),
  'A folha visual precisa integrar o cache complementar do PWA');
assert.match(sw, /capital-do-trem-v[0-9]+/,
  'O cache PWA precisa ser renovado para publicar os novos estilos');

assert.ok(update.includes("message.textContent='🚂 NOVA ATUALIZAÇÃO DISPONÍVEL'"), 'O aviso de atualização deve ser compacto e identificável');
assert.ok(update.includes("updateHornPlayed=true;playTrainHorn()"), 'A chegada da atualização deve tocar a corneta quando o áudio estiver liberado');
assert.ok(update.includes("postMessage({type:'SKIP_WAITING'})"), 'O botão deve ativar a atualização aguardando');
assert.ok(update.includes("button.textContent='ATUALIZADO'") && update.includes("},5000)"), 'A confirmação verde deve desaparecer após cinco segundos');
assert.ok(update.includes('hadServiceWorkerController=Boolean(navigator.serviceWorker.controller)') && update.includes('if(!hadServiceWorkerController){hadServiceWorkerController=true;return;}'), 'A primeira instalação não deve ser confundida com uma atualização concluída');

console.log('Modernização visual: páginas, seletores, pacote móvel e cache PWA conferidos.');

assert.ok(signedRelease.includes('base64 --decode assets/capital-do-trem-logo.jpg.b64'), 'O APK final precisa gerar o ícone a partir da arte oficial.');
assert.ok(signedRelease.includes('prepare-app-icons.py /tmp/capital-do-trem-logo.jpg'), 'A arte oficial deve ser a primeira fonte do ícone Android.');
assert.ok(home.includes('linear-gradient(135deg,#ffdc80 0%,#fcaf45 20%,#f77737 38%,#dd2a7b 58%,#8134af 78%,#515bd4 100%)') && home.includes('.instagram-button .instagram-mark'), 'O ícone inteiro do Instagram precisa manter o degradê multicolorido aprovado.');
assert.ok(inbox.includes('FALA UAI — lista de conversas no formato da referência enviada'), 'A lista FALA UAI precisa carregar o layout visual de referência.');
assert.ok(inbox.includes('#conversations .official-group') && inbox.includes('#conversations .profile-avatar'), 'A lista FALA UAI precisa destacar o grupo oficial e os avatares.');