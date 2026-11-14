import { readFile } from 'node:fs/promises';
const html=await readFile(new URL('../rede.html',import.meta.url),'utf8');
const js=await readFile(new URL('../rede.js',import.meta.url),'utf8');
const checks=[
[html.includes('stat-posts')&&html.includes('stat-followers')&&html.includes('stat-following'),'Perfil mostra publicações, seguidores e seguindo'],
[html.includes('post-file')&&html.includes('accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"'),'Publicação aceita foto e vídeo'],
[html.includes('song-list')&&html.includes('media-list')&&html.includes('people-list'),'Áreas de músicas, mídias e busca existem'],
[js.includes("from('profile_follows')")&&js.includes("from('posts')")&&js.includes("from('post_media')"),'Rede usa tabelas de perfis, seguidores, publicações e anexos'],
[js.includes('getPublishedSongs')&&js.includes('audio_url'),'Catálogo carrega faixas publicadas com reprodução'],
[js.includes('getPublicProfiles')&&js.includes('toggleFollow'),'Busca lista perfis públicos e permite seguir'],
[js.includes('50*1024*1024')&&js.includes('capital-do-trem-media'),'Upload de mídia tem limite e bucket esperado'],
[html.includes('./bate-papo.html')&&html.includes('./index.html#eventos'),'Atalhos para chat e eventos permanecem disponíveis']
];
for(const [ok,msg] of checks){if(!ok)throw new Error(msg);console.log('OK',msg)}
