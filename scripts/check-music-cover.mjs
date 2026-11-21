import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const [index, cover, auth, build] = await Promise.all([
  read('index.html'),
  read('music-cover.js'),
  read('supabase/auth.js'),
  read('scripts/prepare-web.mjs')
]);
const musicStart = index.indexOf('<section class="page" id="musicas">');
const tagline = index.indexOf('<p class="music-tagline">', musicStart);
const musicHeader = musicStart >= 0 && tagline > musicStart ? index.slice(musicStart, tagline) : '';
const checks = [
  [musicHeader.includes('id="music-cover-area"'), 'Área de capa independente presente no topo de Músicas'],
  [musicHeader.includes('id="music-cover-preview"') && musicHeader.includes('id="music-cover-empty"'), 'Prévia e estado vazio da capa disponíveis'],
  [['music-cover-file','music-cover-x','music-cover-y','music-cover-fit','music-cover-upload','music-cover-save','music-cover-status'].every(id => musicHeader.includes('id="' + id + '"')), 'Controles de imagem, enquadramento e publicação conectados ao módulo'],
  [!musicHeader.includes('src="./assets/banner-speakers.webp"'), 'Banner antigo não é mais imposto como capa fixa'],
  [cover.includes("import { getPublicBranding, isCurrentUserAdmin, saveAdminMusicCover, saveAdminMusicCoverSettings }") && cover.includes('controls.hidden = !admin') && cover.includes('area.hidden = !admin && !branding.musicCoverUrl'), 'Somente administrador pode publicar/ajustar; capa publicada aparece ao público'],
  [auth.includes('export async function saveAdminMusicCover') && auth.includes("!(await isCurrentUserAdmin())") && auth.includes('file.size > 8 * 1024 * 1024'), 'Backend exige administrador e limita imagem a 8 MB'],
  [auth.includes('app_music_cover_image_url') && auth.includes('app_music_cover_x') && auth.includes('app_music_cover_y') && auth.includes('app_music_cover_fit'), 'URL e enquadramento persistidos nas configurações públicas'],
  [build.includes("'music-cover.js'"), 'Módulo da capa incluído no pacote Android/PWA']
];
for (const [ok, label] of checks) {
  console.log((ok ? 'OK  ' : 'ERRO ') + label);
  if (!ok) process.exitCode = 1;
}
const syntax = await import('node:child_process').then(({ spawnSync }) => spawnSync(process.execPath, ['--input-type=module', '--check'], { input: cover, encoding: 'utf8' }));
if (syntax.status !== 0) {
  console.error(syntax.stderr || syntax.stdout);
  process.exitCode = 1;
} else console.log('OK  Sintaxe do módulo de capa');
if (process.exitCode) process.exit(process.exitCode);
console.log(checks.length + ' verificações da capa musical concluídas.');
