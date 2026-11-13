import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const [home, composer, auth, worker, prepare, migration, limits, ownerIndex, account, profilePage, publicMusicPolicy, followsMigration, storiesUi] = await Promise.all([
  read('index.html'),
  read('social-feed-composer.js'),
  read('supabase/auth.js'),
  read('sw.js'),
  read('scripts/prepare-web.mjs'),
  read('supabase/migrations/20261113004636_add_social_post_media.sql'),
  read('supabase/migrations/20261113004651_enforce_social_post_media_file_limits.sql'),
  read('supabase/migrations/20261113004658_index_social_post_media_owner.sql'),
  read('conta.html'),
  read('perfil.html'),
  read('supabase/migrations/20261113030638_public_music_while_pending.sql'),
  read('supabase/migrations/20261113011000_add_public_profile_follows.sql'),
  read('stories-ui.js')
]);

const checks = [
  ['stories começam com círculo da foto do usuário e botão +, sem ícone de câmera visível', storiesUi.includes('home-story-add-item') && storiesUi.includes('home-story-add-plus') && storiesUi.includes('getMyBasicProfile') && home.includes('id="home-story-add"') && home.includes('home-stories-hint') && !home.includes('>📷</button>')],
  ['abertura mantém arte aprovada até o primeiro quadro real do vídeo, evitando flash preto', home.includes('openingPoster') && home.includes('revealOpeningFrame') && home.includes("video.style.opacity='0'") && home.includes('requestVideoFrameCallback') && home.includes('capital-do-trem-v296')],

  ['catálogo musical organiza cada faixa em cartão vertical com capa individual, título e artista', home.includes('music-track-card') && home.includes('music-track-cover') && home.includes('makeSongCover') && home.includes('CAPITAL DO TREM') && home.includes("index%2===0?'left':'right'")],
  ['player musical abre em tela cheia com voltar, pausar, adiantar e repetir', home.includes('capital-song-player') && home.includes('player-back') && home.includes('player-main') && home.includes('player-forward') && home.includes('player-repeat') && home.includes('player-progress')],
  ['biblioteca salva e recentes abrem o mesmo player imersivo', home.includes('openSongPlayer(song,audio,card.querySelector') && home.includes("playButton.addEventListener('click',()=>openSongPlayer")],

  ['músicas em análise continuam públicas para audição e as rejeitadas não entram no catálogo', auth.includes(".in('status',['pending','published'])") && auth.includes("status:song.status") && publicMusicPolicy.includes("status in ('pending', 'published')") && publicMusicPolicy.includes("s.status in ('pending', 'published')") && !publicMusicPolicy.includes("status in ('pending', 'published', 'rejected')")],
  ['perfil público usa capa da favela, avatar sobreposto, estatísticas e grade de publicações', profilePage.includes('favela-header.webp') && profilePage.includes("avatar.className='avatar'") && profilePage.includes('followers-count') && profilePage.includes('data-tab="posts"') && profilePage.includes('getPublicProfilePosts')],
  ['contadores ficam sobre a capa e perfil oferece abas de publicações, vídeos e curtidas', profilePage.includes('cover-stats') && profilePage.includes('data-tab="posts"') && profilePage.includes('data-tab="videos"') && profilePage.includes('data-tab="likes"') && auth.includes('getPublicProfileLikedPosts')],
  ['seguir/deixar de seguir atualiza contagem e o perfil tem botão de conversa com ícone de nuvem', auth.includes('getPublicProfileSocial') && auth.includes('toggleProfileFollow') && profilePage.includes('toggleProfileFollow') && profilePage.includes('<path d="M21 11.5')],
  ['Stories exibem botão de adicionar e círculos dos perfis seguidos', profilePage.includes('Seu Story') && profilePage.includes('getMyFollowingProfileIds') && profilePage.includes('getActiveUserStories')],
  ['banco protege seguidores com RLS, bloqueia auto-seguir e permite seguir apenas perfil público', followsMigration.includes('enable row level security') && followsMigration.includes('follower_id <>') && followsMigration.includes('p.is_public = true')],  ['feed e diretório abrem o perfil público de cada usuário', home.includes('./perfil.html?u=') && home.includes('community-profile-open')],
  ['perfil público é incluído no pacote web e no cache do aplicativo', prepare.includes("'perfil.html'") && worker.includes("'./perfil.html'") && /capital-do-trem-v296/.test(worker)],
  ['perfil individual permite ao titular abrir sua página pública', account.includes('id="public-profile-link"') && account.includes("perfil.html?u=")],
  ['cadastro exibe a mensagem grafitada de boas-vindas somente ao escolher Criar conta', account.includes('id="registration-graffiti"') && account.includes('SEJA BEM-VINDO,') && account.includes('MAQUINISTA DESSE TREM!') && account.includes("welcome.hidden=mode!=='register'")],
  ['faixa de boas-vindas usa visual preto/vermelho responsivo e respeita o modo claro', account.includes('.registration-graffiti{') && account.includes('font-family:Impact') && account.includes('body.light .registration-graffiti')],
  ['navegação principal prioriza Início, Publicar, Conversas, Músicas e Perfil', home.includes('data-page="inicio"') && home.includes('data-page="divulgue"') && home.includes('data-page="musicas"') && home.includes('nav-chat') && home.includes('nav-profile')],
  ['menu de três pontos reúne conta, saída e informações secundárias sem poluir a timeline', home.includes('class="profile-overflow"') && home.includes('conta.html#access-panel') && home.includes('conta.html#sign-out') && home.includes('./apoiadores.html') && home.includes('./diagnostico.html')],
  ['Stories com acesso à câmera aparecem antes dos vídeos do YouTube', home.indexOf('id="home-stories-list"') < home.indexOf('class="card home-youtube"') && home.includes('id="home-story-add"') && home.includes('home-stories-hint')],
  ['timeline coloca vídeos do canal, eventos e publicações antes de conversas e música', home.indexOf('class="card home-youtube"') < home.indexOf('id="home-event-feed"') && home.indexOf('id="home-event-feed"') < home.indexOf('id="public-posts"') && home.indexOf('id="public-posts"') < home.indexOf('id="home-friends"') && home.indexOf('id="home-friends"') < home.indexOf('class="card home-music-entry"')],
  ['área de parcerias comerciais foi removida do painel e Apoiadores permanece no menu secundário', !home.includes('<section class="page" id="parcerias">') && home.includes('href="./apoiadores.html">Apoiadores</a>')],
  ['navegação não cria atalho separado para Fazer Amigos', !home.includes('data-page="amigos"') && home.includes('id="amigos"')],
  ['compositor de publicação está presente na página Divulgue', home.includes('id="social-post-form"') && home.includes('id="social-post-files"') && home.includes('id="social-post-submit"')],
  ['compositor só libera o formulário após autenticação', composer.includes('getCurrentSession()') && composer.includes('watchAuthChanges') && composer.includes('form.hidden = !signedIn')],
  ['legenda é opcional apenas quando existe mídia e respeita a restrição mínima do banco', composer.includes('if (!pendingContent && !pendingFiles.length)') && auth.includes('allowEmpty = false') && auth.includes('(!allowEmpty && cleanContent.length < 1)') && auth.includes("const storedContent = allowEmpty && cleanContent.length === 0 ? '\\u200b' : cleanContent;") && auth.includes('content: storedContent')],
  ['feed oculta posts incompletos sem legenda nem mídia', auth.includes("content: post.content === '\\u200b' ? '' : post.content") && auth.includes('.filter(post => post.content.trim().length > 0 || post.media.some(media => media.url))')],
  ['coleção de salvos recupera e exibe fotos e vídeos', auth.includes("from('post_media').select('id,post_id,media_type,mime_type,sort_order,alt_text,storage_path')") && home.includes('Foto salva da comunidade') && home.includes('Vídeo salvo da comunidade')],
  ['limite de 10 arquivos e 100 MB é validado antes do envio', composer.includes('pendingFiles.length > 10') && composer.includes('totalBytes > 100 * 1024 * 1024')],
  ['limites individuais e MIME são validados no compositor e backend', composer.includes('10 * 1024 * 1024') && composer.includes('50 * 1024 * 1024') && auth.includes("'video/quicktime': { ext: 'mov'")],
  ['envio sequencial permite retomar o mesmo post sem duplicar', composer.includes('let pendingPostId = null') && composer.includes('let uploadedCount = 0') && composer.includes('Continuar envio') && composer.includes('for (; uploadedCount < pendingFiles.length')],
  ['upload exige usuário autenticado e publicação própria publicada', auth.includes('export async function uploadMyPostMedia') && auth.includes('post.author_id !== user.id || post.status !== \'published\'')],
  ['mídia é enviada para pasta individual no bucket público de mídia', auth.includes("user.id + '/posts/' + postId + '/media-'") && auth.includes("from('capital-do-trem-media')")],
  ['retentativa reconhece mídia já gravada e não duplica a publicação', auth.includes(".eq('post_id', postId)") && auth.includes(".eq('sort_order', order)") && auth.includes('if (existing)')],
  ['caminho estável permite retomar objeto enviado antes de falha de metadados', auth.includes("'/media-' + order + '.' + rule.ext") && auth.includes('upsert: true')],
  ['metadados são gravados em post_media e objeto removido se falhar', auth.includes("from('post_media').insert({") && auth.includes('await bucket.remove([path]).catch(() => {})')],
  ['feed consulta apenas posts publicados e anexa mídias', auth.includes('export async function getPublishedPosts()') && auth.includes(".eq('status', 'published')") && auth.includes("from('post_media')")],
  ['consulta de autores respeita perfis públicos', auth.includes(".eq('is_public', true)") && auth.includes('display_name, username, account_type, avatar_type, avatar_url')],
  ['fallback de leitura existe se a tabela ainda não estiver exposta', auth.includes("['PGRST205', '42P01']")],
  ['mural renderiza imagens e vídeos com carregamento econômico', home.includes("media.media_type==='image'") && home.includes("media.media_type==='video'") && home.includes("video.preload='metadata'") && home.includes('image.loading=\'lazy\'')],
  ['conteúdo textual usa textContent e URLs de avatar passam por validação HTTPS', home.includes('body.textContent=item.content') && home.includes('safeHttpsUrl(item.author.avatar_url)')],
  ['service worker e pacote PWA incluem o compositor', worker.includes("'./social-feed-composer.js'") && prepare.includes("'social-feed-composer.js'")],
  ['migração cria RLS e leitura condicionada à publicação', migration.includes('alter table public.post_media enable row level security') && migration.includes('post_media_read_published_or_owner_admin')],
  ['migração restringe inclusão à conta proprietária e pasta própria', migration.includes('post_media_insert_own') && migration.includes('owner_id = (select auth.uid())') && migration.includes("storage_path like (select auth.uid())::text || '/posts/%'")],
  ['migração impede mídia acima de 10 itens por post', migration.includes('unique (post_id, sort_order)') && migration.includes('sort_order between 0 and 9')],
  ['migração limita tamanho de foto/vídeo e indexa proprietário', limits.includes('byte_size <= 10485760') && limits.includes('byte_size <= 52428800') && ownerIndex.includes('post_media_owner_id_idx')],
  ['migração de mídia não altera as tabelas nem políticas de posts/perfis', !migration.includes('drop policy') && !migration.includes('alter table public.posts') && !migration.includes('alter table public.profiles')]
];

for (const [name, ok] of checks) console.log((ok ? 'OK  ' : 'ERRO') + ' ' + name);
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) process.exit(1);
console.log('Publicação social verificada: ' + checks.length + ' testes.');
