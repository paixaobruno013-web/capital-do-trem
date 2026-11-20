import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const [html, auth, player, persistent, upload, playlists, css, build] = await Promise.all([
  read('index.html'), read('supabase/auth.js'), read('capital-music-player.js'),
  read('persistent-music-player.js'), read('music-upload.js'), read('music-playlists.js'),
  read('capital-futurista.css'), read('scripts/prepare-web.mjs')
]);

const checks = [
  ['music page and published catalog are present', html.includes('id="musicas"') && html.includes('id="published-song-catalog"')],
  ['music catalog initializes Supabase and loads published tracks', html.includes("api.initSupabase()") && html.includes('api.getPublishedSongs()')],
  ['published tracks receive signed audio URLs', auth.includes('export async function getPublishedSongs()') && auth.includes('createSignedUrls(paths, 60 * 60)')],
  ['catalog rows have play controls connected to the persistent player', html.includes("musicPlayer.playSong(") && html.includes("className='music-play-button'")],
  ['player supports catalog, playlists, queue and direct playback', player.includes('function setCatalog(') && player.includes('function setPlaylists(') && player.includes('function playSong(') && player.includes('audio.play()')],
  ['player reports audio loading errors accessibly', player.includes("audio.addEventListener('error'") && player.includes('Verifique a conexão e tente novamente')],
  ['player supports Android lock-screen media controls', player.includes('navigator.mediaSession') && player.includes('setActionHandler')],
  ['persistent player is mounted and keeps playback visible across screens', html.includes('persistent-music-player.js') && persistent.includes('ct-player-ready')],
  ['music upload validates title, artist, file type and size', upload.includes('titleInput.value.trim()') && auth.includes('export async function uploadMySong') && auth.includes('50 * 1024 * 1024')],
  ['playlist manager supports create, add, reorder and delete', playlists.includes('createMyPlaylist') && playlists.includes('addSongToMyPlaylist') && playlists.includes('moveSongInMyPlaylist') && playlists.includes('deleteMyPlaylist')],
  ['music screen uses black/red compact catalog styling', css.includes('#musicas .music-catalog-panel') && css.includes('#musicas #published-song-catalog>.music-track-row') && css.includes('background:#242424')],
  ['all music runtime modules are copied into Android web bundle', build.includes("'capital-music-player.js'") && build.includes("'persistent-music-player.js'") && build.includes("'music-upload.js'") && build.includes("'music-playlists.js'")]
];

for (const [name, ok] of checks) console.log((ok ? 'OK  ' : 'FAIL') + ' ' + name);
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error(failed.length + ' music experience check(s) failed.');
  process.exit(1);
}
console.log('Music experience checks passed: ' + checks.length + '/' + checks.length + '.');
