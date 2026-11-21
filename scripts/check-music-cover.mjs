import { readFile } from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [index,admin,cover,auth,build]=await Promise.all(['index.html','admin.html','music-cover.js','supabase/auth.js','scripts/prepare-web.mjs'].map(read));
const musicStart=index.indexOf('<section class="page" id="musicas">'),tagline=index.indexOf('<p class="music-tagline">',musicStart),musicHeader=index.slice(musicStart,tagline);
const adminStart=admin.indexOf('id="admin-covers-section"'),adminEnd=admin.indexOf('</section>',adminStart),adminCovers=admin.slice(adminStart,adminEnd+10);
const checks=[
[musicHeader.includes('id="music-cover-area"')&&musicHeader.includes('id="music-cover-preview"'),'Capa pública continua visível na área Músicas'],
[!musicHeader.includes('music-cover-controls')&&!musicHeader.includes('music-cover-file'),'Controles administrativos removidos da tela pública'],
[adminCovers.includes('id="music-cover-controls"')&&['music-cover-file','music-cover-x','music-cover-y','music-cover-fit','music-cover-upload','music-cover-save','music-cover-status'].every(id=>adminCovers.includes('id="'+id+'"')),'Controles da capa musical centralizados no painel admin'],
[admin.includes('src="./music-cover.js"'),'Módulo de capas carregado no painel administrativo'],
[cover.includes('const adminMode=Boolean(controls&&fileInput')&&cover.includes('area.hidden=!admin')&&cover.includes('area.hidden=!branding.musicCoverUrl'),'Visualização pública separada da gestão administrativa'],
[auth.includes('export async function saveAdminMusicCover')&&auth.includes("!(await isCurrentUserAdmin())")&&auth.includes('file.size > 8 * 1024 * 1024'),'Backend exige administrador e limita imagem a 8 MB'],
[auth.includes('app_music_cover_image_url')&&auth.includes('app_music_cover_x')&&auth.includes('app_music_cover_y')&&auth.includes('app_music_cover_fit'),'URL e enquadramento persistidos'],
[build.includes("'music-cover.js'")&&build.includes("'admin.html'"),'Módulo incluído no pacote Android/PWA']];
for(const [ok,label]of checks){console.log((ok?'OK  ':'ERRO ')+label);if(!ok)process.exitCode=1;}
const syntax=await import('node:child_process').then(({spawnSync})=>spawnSync(process.execPath,['--input-type=module','--check'],{input:cover,encoding:'utf8'}));
if(syntax.status!==0){console.error(syntax.stderr||syntax.stdout);process.exitCode=1;}else console.log('OK  Sintaxe do módulo de capa');
if(process.exitCode)process.exit(process.exitCode);console.log(checks.length+' verificações da central de capas concluídas.');