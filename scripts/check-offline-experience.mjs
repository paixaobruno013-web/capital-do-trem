import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const [update, html, player] = await Promise.all([
  readFile('update.js', 'utf8'),
  readFile('index.html', 'utf8'),
  readFile('capital-music-player.js', 'utf8')
]);

assert.match(update, /connectionDebounceTimer=window\.setTimeout\([\s\S]*?\},13000\)/, 'alerta offline deve aguardar 13 segundos contínuos');
assert.match(update, /const delay=\(connectionDebounceTimer\|\|confirmedOffline\)\?1000:\(lowPowerMode\(\)\?45000:30000\)/, 'monitoramento reduz sondagens para 30s ou 45s em economia de bateria/dados e mantém 1s durante queda/recuperação');
assert.match(update, /function showOnline\(\)[\s\S]*?displayOnline\(\);/, 'alerta online deve disparar imediatamente ao detectar o retorno');
assert.match(update, /nativeHaptics\.vibrate\(\{duration:450\}\)[\s\S]*?navigator\.vibrate\(\[160,90,160\]\)[\s\S]*?if\(audioUnlocked\)playTrainHorn\(\)/, 'alerta online deve oferecer vibração e corneta quando o áudio estiver liberado');
assert.match(update, /if\(confirmedOffline\|\|connectionDebounceTimer\)return/, 'eventos offline repetidos devem ser deduplicados');
assert.match(update, /clearTimeout\(connectionDebounceTimer\)/, 'a recuperação rápida deve cancelar o alerta offline pendente');
assert.match(update, /if\(document\.hidden\)return/, 'o monitoramento deve pausar em segundo plano');
assert.match(update, /window\.addEventListener\('focus',resumeConnectionMonitor\)/, 'a conexão deve ser verificada ao retornar ao aplicativo');
assert.match(update, /setTimeout\(\(\)=>\{alertBox\.style\.display='none';\},13000\)/, 'alerta de retorno deve permanecer visível por 13 segundos');
assert.match(update, /offlineTimer=window\.setTimeout\(\(\)=>\{alertBox\.style\.display='none';\},13000\)/, 'alerta offline deve permanecer visível por 13 segundos');
assert.match(update, /function showOnline\(\)[\s\S]*?clearTimeout\(connectionDebounceTimer\)[\s\S]*?displayOnline\(\);/, 'retorno da conexão deve cancelar a contagem offline e mostrar alerta online');

assert.match(html, /OFFLINE_MUSIC_CATALOG_KEY/, 'metadados do catálogo devem ser guardados localmente');
assert.match(html, /OFFLINE_MUSIC_PLAYLISTS_KEY/, 'playlists devem ser guardadas localmente');
assert.match(html, /getOfflineMusic\(cachedSong\.id\)/, 'o catálogo offline deve recuperar áudios do IndexedDB');
assert.match(html, /audio_url:URL\.createObjectURL\(saved\.blob\)/, 'o player deve receber a URL local do áudio guardado');
assert.match(html, /musicPlayer\.setCatalog\(songs\)/, 'o catálogo local deve alimentar o player e a fila da playlist');
assert.match(html, /userPlaylists=readOfflineJson\(OFFLINE_MUSIC_PLAYLISTS_KEY,\[\]\)/, 'playlists locais devem carregar mesmo sem sessão de rede');
assert.match(html, /O player vai usar as faixas que conseguiu preparar automaticamente/, 'a interface deve explicar o cache automático');
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
