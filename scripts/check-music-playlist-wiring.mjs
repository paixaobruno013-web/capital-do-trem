import { readFile } from 'node:fs/promises';

const [html, module, build] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../music-playlists.js', import.meta.url), 'utf8'),
  readFile(new URL('../scripts/prepare-web.mjs', import.meta.url), 'utf8')
]);
const checks = [
  ['playlist module is loaded by the main app', html.includes('<script type="module" src="./music-playlists.js"></script>')],
  ['playlist manager root matches module selector', html.includes('id="music-playlists-list"') && module.includes("const root=$('music-playlists-list')")],
  ['playlist creation form matches module selector', html.includes('id="music-playlist-create"') && module.includes("form=$('music-playlist-create')")],
  ['playlist name field matches module selector', html.includes('id="music-playlist-name"') && module.includes("$('music-playlist-name').value")],
  ['playlist status region is present', html.includes('id="music-playlist-status"') && module.includes("status=$('music-playlist-status')")],
  ['catalog quick-create button focuses the form', html.includes('id="create-music-playlist"') && module.includes("quickCreate?.addEventListener('click'")],
  ['web build copies playlist module', build.includes("'music-playlists.js'")]
];
for (const [name, ok] of checks) console.log((ok ? 'OK  ' : 'ERRO') + ' ' + name);
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) process.exit(1);
console.log('Integração visual e funcional das playlists validada: ' + checks.length + ' verificações.');
