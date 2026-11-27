import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const [auth, home, profile, chat, migration, stories, privateChat] = await Promise.all([
  read('supabase/auth.js'),
  read('index.html'),
  read('rede.html'),
  read('bate-papo.html'),
  read('supabase/migrations/20261111143000_post_likes_comments.sql'),
  read('stories-ui.js'),
  read('mensagens.html')
]);
const checks = [
  ['catálogo musical não é bloqueado por falha no link de download', /downloadResult.*catch\(error => \(\{ data: null, error \}\)\)/s.test(auth) && /streamResult\.error/.test(auth)],
  ['tela de prévia dos Stories oculta ferramentas secundárias e mantém música acessível', /capital-story-clean-selection/.test(home) && /home-story-music-toggle/.test(home) && /home-story-composer\.has-selection/.test(home)],
  ['Stories pessoais salvam a duração selecionada da música', auth.includes('musicDurationSeconds = 15') && auth.includes('music_duration_seconds: Math.max(5')],
  ['Stories permitem escolher músicas do catálogo ou de playlists pessoais', /home-story-playlist-select/.test(home) && /auth\.getMyPlaylists\(\)/.test(await read('home-story-composer.js')) && /playlistIds\.has\(song\.id\)/.test(await read('home-story-composer.js'))],
  ['Stories limpam a seleção anterior ao trocar para uma playlist sem aquela faixa', /else \{ selectedStoryMusicId = ''; musicSelect\.value = ''; if \(musicPreview\)/.test(await read('home-story-composer.js'))],
  ['Feed permite filtrar músicas por playlist pessoal sem perder o catálogo', /home-feed-playlist-select/.test(home) && /getMyPlaylists/.test(await read('home-feed.js')) && /feedPlaylists\.find/.test(await read('home-feed.js'))],
  ['ação Story + Feed mantém a mesma música selecionada nas duas publicações', /form\.dataset\.storyMusicSongId = selectedStoryMusicId/.test(await read('home-story-composer.js')) && /form\.dataset\.storyMusicSongId/.test(await read('home-feed.js')) && /songToPublish/.test(await read('home-feed.js'))],
  ['barra de progresso do Story acompanha a duração do trecho musical', stories.includes('let storySeconds = 7') && stories.includes("progress.style.transition = 'transform ' + storySeconds + 's linear'")],
  ['compositor do Feed usa padrão familiar com campo e atalhos de foto e vídeo', /No que você está pensando\?/.test(home) && /data-feed-quick-media="image"/.test(home) && /data-feed-quick-media="video"/.test(home) && /class="home-feed-gallery-picker"/.test(home)],
  ['Feed oferece corte de foto e música do catálogo acima da prévia', /home-feed-crop-toggle/.test(home) && /home-feed-music-toggle/.test(home) && /cropImageToSquare/.test(await read('home-feed.js')) && /createMyStory/.test(await read('home-feed.js'))],
  ['Feed não carrega curtidas e comentários de forma antecipada', /like\.textContent='♡ Curtir';\s*const comments=document\.createElement\('button'\);comments\.type='button';comments\.textContent='💬 Comentários'/.test(await read('home-feed.js')) && /Os dados sociais são buscados somente quando a pessoa interage/.test(await read('home-feed.js'))],
  ['Feed pausa vídeos quando sai do app e respeita economia de dados', /visibilitychange/.test(await read('home-feed.js')) && /navigator\.connection\?\.saveData/.test(await read('home-feed.js')) && /video\.preload='none'/.test(await read('home-feed.js'))],
  ['Stories libera a câmera ao selecionar uma mídia', /if \(selectedFile\) releaseCameraResources\(\)/.test(await read('home-story-composer.js'))],
  ['Mídias antigas do Feed usam o bucket social como padrão', /item\.bucket_id\|\|'capital-do-trem-social'/.test(await read('rede.js'))],
  ['Feed social respeita economia de dados e pausa em segundo plano', /navigator\.connection\?\.saveData/.test(await read('rede.js')) && /visibilitychange/.test(await read('rede.js')) && /video\.preload='none'/.test(await read('rede.js'))],
  ['Feed informa em qual etapa a publicação falhou', /publishStage='criar a publicação no Feed'/.test(await read('home-feed.js')) && /Falha ao '\+publishStage/.test(await read('home-feed.js'))],
  ['publicação permite compartilhar no Feed ou simultaneamente no Feed e Stories', /Compartilhar Feed<\/button>/.test(home) && /Compartilhar Feed \+ Story/.test(home) && /createMyStory\(\{file,caption:text/.test(await read('home-feed.js'))],
  ['aro dos Stories fica parado e somente o LED vermelho percorre a borda', /homeStoryLedTravel/.test(home) && /home-story-ring:not\(\.seen\)::before/.test(home) && /animation:none!important/.test(home) && !/homeStoryRedOrbit/.test(home)],
  ['curtidas únicas por usuário e publicação', /primary key \(post_id, user_id\)/.test(migration)],
  ['curtidas só em publicações publicadas', /post_likes_insert_self[\s\S]*?status = 'published'/.test(migration)],
  ['comentários vinculados à conta e à publicação', /post_id uuid not null references public\.posts[\s\S]*?author_id uuid not null references auth\.users/.test(migration)],
  ['nome do comentarista definido pelo perfil no banco', /set_post_comment_author_name[\s\S]*?profiles p[\s\S]*?new\.author_name/.test(migration)],
  ['leitura pública de comentários e curtidas com RLS', /post_comments_read_public[\s\S]*?to anon, authenticated/.test(migration) && /post_likes_read_public[\s\S]*?to anon, authenticated/.test(migration)],
  ['envio de comentários exige usuário autenticado e post publicado', /post_comments_insert_self[\s\S]*?auth\.uid\(\)[\s\S]*?status = 'published'/.test(migration)],
  ['API de leitura e contagem das interações', /export async function getPostSocial[\s\S]*?likeCount:likes\.count/.test(auth)],
  ['API de curtir e descurtir', /export async function togglePostLike[\s\S]*?post_likes/.test(auth)],
  ['API de comentários com limite de 1.000 caracteres', /export async function addPostComment[\s\S]*?clean\.length>1000/.test(auth)],
  ['mural mostra botão de curtir e contagem', /like\.textContent=.*socialState\.likeCount/.test(profile) && /module\.getPostSocial\(item\.id\)/.test(profile) && /like\.addEventListener\('click'/.test(profile)],
  ['mural mostra lista e formulário de comentários', /Comentários[\s\S]*?post-comment-form[\s\S]*?addPostComment\(item\.id/.test(profile)],
  ['compartilhamento privado continua disponível', /Koe Fala Tu[\s\S]*?share_text/.test(profile)],
  ['descoberta por localização removida e sem atalho na tela inicial', !/data-page="amigos"/.test(home) && !/id="fazer-amigos"|id="open-friends-profile"/.test(chat)],
  ['busca geográfica e filtros de cidade não aparecem mais no FALA UAI', !/chat-friends-search|chat-friends-distance|chat-friends-directory/.test(chat)],
  ['faixa de contatos online usa somente perfis públicos', /getPublicProfiles\(\)/.test(chat) && /\.eq\('is_public', true\)/.test(auth)],
  ['conversas individuais continuam vinculadas a convite e aceite', /requestPrivateConversation/.test(auth) && /requestedUserId=shareParams\.get\('user'\)/.test(privateChat) && /status==='accepted'/.test(privateChat)],
  ['conversa privada abre em tela própria, separada do grupo oficial', /requestedUserId=shareParams\.get\('user'\)/.test(privateChat) && /openConversation\(target\)/.test(privateChat) && /status==='accepted'/.test(privateChat) && !/id="fazer-amigos"|id="open-friends-profile"/.test(chat)],
  ['vídeo de abertura não mostra imagem ou poster antes do vídeo', /video\.removeAttribute\('poster'\)/.test(home) && !/const openingPoster=document\.createElement\('img'\)/.test(home) && !/const fallback=document\.createElement\('img'\)/.test(home)],
  ['marca sobreposta fica oculta quando há vídeo de abertura', /if\(brand\)brand\.style\.display='none'/.test(home)],
  ['Feed principal mostra publicações sem painel de descrição da conta', /class=\"home-community-feed\" aria-label=\"Publicações ativas do Feed\"/.test(home) && !/home-section-heading[^]*Feed dos Maquinistas/.test(home)],
  ['Feed principal exibe somente publicações com mídia de foto ou vídeo', /const visiblePosts=posts\.filter\(post=>\(media\.get\(post\.id\)\|\|\[\]\)\.some\(item=>item\.url&&\['image','video'\]\.includes\(item\.media_type\)\)\)/.test(await read('home-feed.js')) && /for\(const post of visiblePosts\)/.test(await read('home-feed.js'))],
  ['menu de três pontos do perfil reúne acessos da conta e apoiadores em lista vertical', /profile-account-shortcuts/.test(await read('rede.html')) && /flex-direction:column/.test(await read('rede.html')) && /my-stories-panel/.test(await read('rede.html')) && /set-password-form/.test(await read('rede.html')) && /apoiadores\.html/.test(await read('rede.html')) && /admin-apoiadores\.html/.test(await read('rede.html'))],
  ['ferramentas verticais dos Stories reabrem expandidas ao iniciar o compositor', /home-story-tools-rail/.test(home) && /tools-collapsed','effects-collapsed/.test(await read('home-story-composer.js'))],
  ['ações inferiores dos Stories ficam limitadas a Story ou Story + Feed', /id="home-story-publish"[^>]*>Postar no Story/.test(home) && /id="home-story-feed-publish"[^>]*>Story \+ Feed/.test(home)],
  ['ação Story + Feed cria o Story e encaminha a mesma mídia ao Feed', /async function publishToFeed\(\)/.test(await read('home-story-composer.js')) && /const storySaved = await auth\.createMyStory\(\{/.test(await read('home-story-composer.js')) && /form\.requestSubmit\(\)/.test(await read('home-story-composer.js'))],
  ['ícone do Instagram usa degradê no bloco inteiro, com símbolo branco', /\.instagram-button \.instagram-mark\{[^}]*background:linear-gradient/.test(home) && /-webkit-text-fill-color:#fff/.test(home)],
  ['locomotiva e três vagões permanecem na abertura', /opening-wagon-rear/.test(home) && /opening-wagon-dancers/.test(home) && /opening-wagon-front/.test(home) && /opening-locomotive/.test(home)]
];
for (const [name, ok] of checks) console.log((ok ? 'OK  ' : 'ERRO') + ' ' + name);
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) process.exit(1);
console.log('Interações do mural verificadas: ' + checks.length + ' testes.');
