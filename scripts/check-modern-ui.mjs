import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const home = read('../index.html');
const chat = read('../bate-papo.html');
const inbox = read('../mensagens.html');
const css = read('../capital-modern-ui.css');
const prepare = read('./prepare-web.mjs');
const sw = read('../sw.js');
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
assert.ok(sw.includes("'./capital-modern-ui.css'"),
  'A folha visual precisa integrar o cache complementar do PWA');
assert.ok(sw.includes("capital-do-trem-v310"),
  'O cache PWA precisa ser renovado para publicar os novos estilos');

console.log('Modernização visual: páginas, seletores, pacote móvel e cache PWA conferidos.');

assert.ok(signedRelease.includes('base64 --decode assets/capital-do-trem-logo.jpg.b64'), 'O APK final precisa gerar o ícone a partir da arte oficial.');
assert.ok(signedRelease.includes('prepare-app-icons.py /tmp/capital-do-trem-logo.jpg'), 'A arte oficial deve ser a primeira fonte do ícone Android.');
assert.ok(css.includes('.instagram-button{background:linear-gradient(120deg,#833ab4 0%,#c13584 28%,#e1306c 52%,#fd1d1d 72%,#f77737 88%,#fcaf45 100%)'), 'O botão do Instagram precisa manter o degradê completo aprovado.');
assert.ok(inbox.includes('FALA UAI — lista de conversas no formato da referência enviada'), 'A lista FALA UAI precisa carregar o layout visual de referência.');
assert.ok(inbox.includes('#conversations .official-group') && inbox.includes('#conversations .profile-avatar'), 'A lista FALA UAI precisa destacar o grupo oficial e os avatares.');