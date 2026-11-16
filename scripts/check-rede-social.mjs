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
[js.includes("select('user_id,display_name,username')")&&js.includes("person?.username?'@'+person.username:''"),'Mural de mídias identifica nome e usuário do autor'],
[(js.match(/media-search'\)\.addEventListener/g)||[]).length===1,'Busca de mídias possui apenas um listener'],
[js.includes("if(view==='videos')")&&js.includes('profile-post-card')&&js.includes('profile-post-caption'),'Perfil exibe publicações de texto e legendas junto às mídias'],
[html.includes('.profile-post-card')&&html.includes('.profile-post-caption'),'Cartões de publicações do perfil têm estilo próprio'],
[js.includes('capital-do-trem-social')&&js.includes("bucket_id:'capital-do-trem-social'")&&js.includes('50*1024*1024')&&js.includes('10*1024*1024'),'Upload social usa bucket privado e limites por tipo'],
[js.includes('createSignedUrls')&&js.includes('resolveMediaUrls')&&js.includes('bucket_id'),'Feed, perfil e mural geram URLs assinadas do bucket correto'],
[html.includes('./bate-papo.html')&&html.includes('./index.html#eventos'),'Atalhos para chat e eventos permanecem disponíveis'],
[js.includes('song-preview-button')&&js.includes('audio.hidden=true')&&js.includes("audio.dataset.loaded==='true'"),'Músicas mostram prévia antes de carregar o áudio'],
[js.includes("document.querySelectorAll('#song-list audio')")&&js.includes('other.pause()'),'Player pausa outras faixas ao iniciar uma música'],
[html.includes('#feed-list .post-media')&&html.includes('aspect-ratio:1/1')&&html.includes('object-fit:cover'),'Feed apresenta fotos e vídeos em prévia quadrada']
];
for(const [ok,msg] of checks){if(!ok)throw new Error(msg);console.log('OK',msg)}


const rede = await readFile(new URL('../rede.html', import.meta.url), 'utf8');
const redeJs = await readFile(new URL('../rede.js', import.meta.url), 'utf8');
if (!rede.includes('id="cover-preset"') || !redeJs.includes('function makeCoverPreset') || !redeJs.includes("cover_url:makeCoverPreset(coverPreset)")) throw new Error('Personalização de capa por opções do sistema ausente.');
if (!rede.includes('id="pending-song-list"') || !redeJs.includes('async function loadMyPendingSongs') || !redeJs.includes('renderPendingSongs')) throw new Error('Prévia das músicas em análise ausente.');
console.log('Perfis com capas do sistema e prévias das músicas em análise conferidos.');

if (!redeJs.includes("profileLink.href='./rede.html?perfil='+encodeURIComponent(post.author_id)") || !redeJs.includes('profileLink.append(img,name)')) throw new Error('Feed não permite abrir o perfil do autor.');
console.log('Feed direciona para o perfil público de cada autor.');
