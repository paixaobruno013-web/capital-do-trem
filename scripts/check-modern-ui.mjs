import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const home = read('../index.html');
const chat = read('../bate-papo.html');
const css = read('../capital-modern-ui.css');
const prepare = read('./prepare-web.mjs');
const sw = read('../sw.js');

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
assert.ok(sw.includes("capital-do-trem-v306"),
  'O cache PWA precisa ser renovado para publicar os novos estilos');

console.log('Modernização visual: páginas, seletores, pacote móvel e cache PWA conferidos.');
