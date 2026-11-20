import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const [update, html, player] = await Promise.all([
  readFile('update.js', 'utf8'),
  readFile('index.html', 'utf8'),
  readFile('capital-music-player.js', 'utf8')
]);

assert.match(update, /connectionDebounceTimer=window\.setTimeout\([\s\S]*?\},7000\)/, 'alerta offline deve aguardar 7 segundos contínuos');
assert.match(update, /reconnectTimer=window\.setTimeout\([\s\S]*?displayOnline\(\)[\s\S]*?\},7000\)/, 'alerta online deve aguardar 7 segundos estáveis');
assert.match(update, /if\(confirmedOffline\|\|connectionDebounceTimer\)return/, 'eventos offline repetidos devem ser deduplicados');
assert.match(update, /clearTimeout\(connectionDebounceTimer\)/, 'a recuperação rápida deve cancelar o alerta offline pendente');
assert.match(update, /if\(reconnectTimer\)return/, 'sondagens online repetidas não devem reiniciar a contagem de 7 segundos');

assert.match(html, /OFFLINE_MUSIC_CATALOG_KEY/, 'metadados do catálogo devem ser guardados localmente');
assert.match(html, /OFFLINE_MUSIC_PLAYLISTS_KEY/, 'playlists devem ser guardadas localmente');
assert.match(html, /getOfflineMusic\(cachedSong\.id\)/, 'o catálogo offline deve recuperar áudios do IndexedDB');
assert.match(html, /audio_url:URL\.createObjectURL\(saved\.blob\)/, 'o player deve receber a URL local do áudio guardado');
assert.match(html, /musicPlayer\.setCatalog\(songs\)/, 'o catálogo local deve alimentar o player e a fila da playlist');
assert.match(html, /userPlaylists=readOfflineJson\(OFFLINE_MUSIC_PLAYLISTS_KEY,\[\]\)/, 'playlists locais devem carregar mesmo sem sessão de rede');
assert.match(html, /Apenas músicas baixadas podem tocar/, 'a interface deve explicar o requisito de salvar as faixas antes');
assert.match(player, /const songs=\(selected\?\.songs\|\|\[\]\)\.map\(entry=>catalog\.find\(song=>song\.id===entry\.song_id\)\)\.filter\(Boolean\)/, 'a playlist deve montar a fila a partir do catálogo local disponível');

assert.match(html, /OFFLINE_MUSIC_MAX_BYTES=120\*1024\*1024/, 'cache automático deve ter limite de 120 MB');
assert.match(html, /OFFLINE_MUSIC_MAX_TRACK_BYTES=25\*1024\*1024/, 'faixas muito grandes não devem ocupar o cache automático');
assert.match(html, /OFFLINE_MUSIC_MAX_TRACKS=12/, 'cache automático deve limitar a quantidade de faixas');
assert.match(html, /async function cacheOfflineSong\(song\)/, 'deve existir cache automático de faixas');
assert.match(html, /fetch\(song\.audio_url,\{cache:'no-store'\}\)/, 'o áudio deve ser armazenado enquanto houver conexão');
assert.match(html, /cacheOfflineSongsInBackground\(songs,2\)/, 'as primeiras músicas devem ser preparadas em segundo plano');
assert.match(html, /cacheOfflineSongsInBackground\(songs\.slice\(index,index\+3\),3\)/, 'a música atual e as próximas faixas devem ser preparadas automaticamente');
assert.match(html, /cacheOfflineSongsInBackground\(playlistSongs,6\)/, 'a playlist escolhida deve preparar até seis faixas automaticamente');
assert.match(html, /while\(\(total\+blob\.size>OFFLINE_MUSIC_MAX_BYTES\|\|count>=OFFLINE_MUSIC_MAX_TRACKS\)/, 'o cache deve remover faixas antigas ao atingir o limite');

assert.match(html, /window\.addEventListener\('offline',async\(\)=>\{[\s\S]*?getOfflineMusic\(song\.id\)[\s\S]*?musicPlayer\.setQueue\(/, 'ao perder a conexão, o player deve montar uma fila com as faixas locais');
assert.match(html, /O player vai usar as faixas que conseguiu preparar automaticamente/, 'a interface deve explicar o cache automático');
console.log('Offline, playlists e cache automático: 22/22 verificações aprovadas.');
