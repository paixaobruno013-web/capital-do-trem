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

assert.match(html, /OFFLINE_MUSIC_CATALOG_KEY/, 'metadados do catálogo devem ser guardados localmente');
assert.match(html, /OFFLINE_MUSIC_PLAYLISTS_KEY/, 'playlists devem ser guardadas localmente');
assert.match(html, /getOfflineMusic\(cachedSong\.id\)/, 'o catálogo offline deve recuperar áudios do IndexedDB');
assert.match(html, /audio_url:URL\.createObjectURL\(saved\.blob\)/, 'o player deve receber a URL local do áudio guardado');
assert.match(html, /musicPlayer\.setCatalog\(songs\)/, 'o catálogo local deve alimentar o player e a fila da playlist');
assert.match(html, /userPlaylists=readOfflineJson\(OFFLINE_MUSIC_PLAYLISTS_KEY,\[\]\)/, 'playlists locais devem carregar mesmo sem sessão de rede');
assert.match(html, /Apenas músicas baixadas podem tocar/, 'a interface deve explicar o requisito de salvar as faixas antes');
assert.match(player, /const songs=\(selected\?\.songs\|\|\[\]\)\.map\(entry=>catalog\.find\(song=>song\.id===entry\.song_id\)\)\.filter\(Boolean\)/, 'a playlist deve montar a fila a partir do catálogo local disponível');

console.log('Offline e playlists: 10/10 verificações aprovadas.');
