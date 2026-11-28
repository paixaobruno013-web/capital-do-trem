import { readFile } from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [index,admin,build,sw]=await Promise.all(['index.html','admin.html','scripts/prepare-web.mjs','sw.js'].map(read));
const checks=[
 [!index.includes('music-section-banner')&&!index.includes('music-section-banner-image'),'Banner/capa removido da área pública de Músicas'],
 [!admin.includes('admin-music-cover-manager')&&!admin.includes('music-cover.js'),'Gerenciador de capa musical removido do painel administrativo'],
 [!index.includes('music-cover.js')&&!build.includes("'music-cover.js'")&&!sw.includes('music-cover.js'),'Módulo de capa não é carregado nem pré-armazenado'],
 [index.includes('id="musicas"')&&index.includes('published-song-catalog')&&index.includes('music-playlists-list'),'Catálogo e playlists continuam presentes'],
 [index.includes('music-upload-form')&&index.includes('my-uploaded-songs-panel'),'Envio e gerenciamento das músicas continuam presentes']
];
for(const [ok,label]of checks){console.log((ok?'OK  ':'ERRO ')+label);if(!ok)process.exitCode=1;}
if(process.exitCode)process.exit(process.exitCode);
console.log(checks.length+' verificações de remoção da capa concluídas.');
