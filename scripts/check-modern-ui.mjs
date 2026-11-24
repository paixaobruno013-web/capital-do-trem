import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const home = read('../index.html');
const chat = read('../bate-papo.html');
const css = read('../capital-modern-ui.css');

for (const [name, html] of [['index.html', home], ['bate-papo.html', chat]]) {
  assert.match(html, /<link\\s+rel=["']stylesheet["'][^>]*href=["']\\.\\/capital-modern-ui\\.css\\?v=1["']/i,
    name + ' precisa carregar a folha de modernização');
}
for (const selector of [
  '#musicas', '#music-upload-area', '#published-song-catalog .music-track-row',
  '#music-playlists-list', '#capital-music-player', '#messages .message',
  '#composer', '.chat-panel'
]) {
  assert.ok(css.includes(selector), 'Seletor visual ausente: ' + selector);
}
assert.match(home, /id=["']musicas["']/);
assert.match(home, /id=["']music-upload-area["']/);
assert.match(home, /id=["']published-song-catalog["']/);
assert.match(home, /music-track-row/); // cartões são montados pelo catálogo
assert.match(home, /id=["']music-playlists-list["']/);
assert.match(home, /id=["']capital-music-player["']/);
assert.match(chat, /id=["']messages["']/);
assert.match(chat, /class=["']composer["']/);
assert.match(chat, /className=['"]message['"]/); // mensagens são montadas em tempo real
console.log('Modernização visual: links, seletores reais e componentes Música/FALA UAI conferidos.');
