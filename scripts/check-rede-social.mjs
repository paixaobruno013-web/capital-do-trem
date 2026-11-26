import { readFile } from 'node:fs/promises';
const html=await readFile(new URL('../rede.html',import.meta.url),'utf8');
const js=await readFile(new URL('../rede.js',import.meta.url),'utf8');
const nav=await readFile(new URL('../mobile-bottom-nav.js',import.meta.url),'utf8');
const checks=[
[html.includes('stat-posts')&&html.includes('stat-followers')&&html.includes('stat-following'),'Perfil mostra publicações, seguidores e seguindo'],
[html.includes('post-file')&&html.includes('accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"'),'Publicação aceita foto e vídeo'],
[html.includes('song-list')&&html.includes('media-list')&&html.includes('people-list'),'Áreas de músicas, mídias e busca existem'],
[js.includes("from('profile_follows')")&&js.includes("from('posts')")&&js.includes("from('post_media')"),'Rede usa tabelas de perfis, seguidores, publicações e anexos'],
[js.includes('getPublishedSongs')&&js.includes('musicPlayer.setCatalog(allSongs)')&&js.includes('musicPlayer.playSong(song)'),'Catálogo carrega faixas publicadas no player musical compartilhado'],
[js.includes('getPublicProfiles')&&js.includes('toggleFollow'),'Busca lista perfis públicos e permite seguir'],
[js.includes('showFollowDirectory')&&js.includes("eq(kind==='followers'?'followed_id':'follower_id',userId)")&&js.includes('profile-follow-directory'),'Contadores de seguidores e seguindo abrem diretórios públicos'],
[js.includes("select('user_id,display_name,username')")&&js.includes("person?.username?'@'+person.username:''"),'Mural de mídias identifica nome e usuário do autor'],
[(js.match(/media-search'\)\.addEventListener/g)||[]).length===1,'Busca de mídias possui apenas um listener'],
[js.includes('buildProfileMediaActions')&&js.includes('makeProfilePostMediaOpenable')&&js.includes('profile-media-tile'),'Perfil exibe miniaturas individuais em grade e abre mídias com ações sociais no visualizador'],
[js.includes("add('❤️ Curtir'")&&js.includes("add('💬 Comentar'")&&js.includes('Fazer download da foto')&&js.includes('Fazer download do vídeo'),'Curtida, comentário e download são oferecidos ao abrir a mídia'],
[html.includes('.profile-post-card')&&html.includes('.profile-post-caption'),'Cartões de publicações do perfil têm estilo próprio'],
[js.includes('capital-do-trem-social')&&js.includes("bucket_id:'capital-do-trem-social'")&&js.includes('50*1024*1024')&&js.includes('10*1024*1024'),'Upload social usa bucket privado e limites por tipo'],
[js.includes('createSignedUrls')&&js.includes('resolveMediaUrls')&&js.includes('bucket_id'),'Feed, perfil e mural geram URLs assinadas do bucket correto'],
[html.includes('./mobile-bottom-nav.js')&&nav.includes("href: './bate-papo.html'")&&html.includes('id="eventos"')&&html.includes('./index.html#eventos'),'Chat permanece na barra inferior e a área de eventos continua acessível sem atalho superior'],
[js.includes('song-preview-button')&&js.includes('musicPlayer.playSong(song)')&&js.includes('Ouvir no player 3D'),'Músicas usam o player 3D compartilhado'],
[js.includes('createCapitalMusicPlayer')&&js.includes('capital-music-player.js'),'Catálogo mantém apenas um player ativo entre as músicas'],
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
