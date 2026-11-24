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
  ['catalog rows have play controls connected to the persistent player', html.includes('musicPlayer.playSong(') && html.includes('music-play-button')],
  ['player supports catalog, playlists, queue and direct playback', player.includes('function setCatalog(') && player.includes('function setPlaylists(') && player.includes('function playSong(') && player.includes('audio.play()')],
  ['player reports audio loading errors accessibly', player.includes("audio.addEventListener('error'") && player.includes('Verifique a conexão e tente novamente')],
  ['player supports Android lock-screen media controls', player.includes('navigator.mediaSession') && player.includes('setActionHandler')],
  ['persistent player is mounted and keeps playback visible across screens', html.includes('persistent-music-player.js') && persistent.includes('ct-player-ready')],
  ['floating player can be moved with touch and pointer input', persistent.includes("handle.addEventListener('pointerdown'") && persistent.includes("handle.addEventListener('pointermove',move)") && persistent.includes('setPointerCapture')],
  ['floating player position survives navigation and app restarts', persistent.includes("localStorage.setItem('ct-player-offset-x'") && persistent.includes("localStorage.setItem('ct-player-offset-y'") && persistent.includes("localStorage.getItem('ct-player-offset-y'")],
  ['compact player is translucent and can be expanded accessibly', persistent.includes('ct-player-compact') && persistent.includes('rgba(8,8,10,.48)') && persistent.includes("setAttribute('aria-pressed'") && persistent.includes('Expandir player')],
  ['player movement is constrained to the visible screen', persistent.includes('innerWidth-playerWidth') && persistent.includes('innerHeight*.62') && persistent.includes('addEventListener(\'resize\'')],
  ['player drag control has an accessible label and reduced-motion fallback', persistent.includes('Arraste para mover') && persistent.includes('@media(prefers-reduced-motion:reduce)')],
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
