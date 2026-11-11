import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const [home, story, eventComposer, account, auth, prepare, eventPolicy, songPolicy, directSongPolicy, artistAccountPolicy, schema, androidConfig, iosConfig, youtubeFeed, videoPolicy] = await Promise.all([
  read('index.html'),
  read('home-story-composer.js'),
  read('event-social-composer.js'),
  read('conta.html'),
  read('supabase/auth.js'),
  read('scripts/prepare-web.mjs'),
  read('supabase/migrations/20261111173858_allow_all_users_to_publish_events.sql'),
  read('supabase/migrations/20261111171633_artist_song_submissions_with_producer.sql'),
  read('supabase/migrations/20261111174525_artist_song_direct_publication.sql'),
  read('supabase/migrations/20261111174839_restrict_artist_music_to_artist_accounts.sql'),
  read('supabase/schema.sql'),
  read('scripts/configure-android-media.py'),
  read('scripts/prepare-ios-info.py'),
  read('youtube-feed.js'),
  read('supabase/migrations/20261111190000_video_feed_interactions.sql')
]);
const checks = [
  ['atalho + de Stories fica na tela inicial', home.includes('id="home-story-add"')],
  ['modal de Stories fica embutido na tela inicial', home.includes('id="home-story-composer"')],
  ['ao tocar no +, abre câmera sem navegar para outra página', story.includes('function openComposer()') && story.includes("modal.classList.add('is-open')") && story.includes('startCamera();') && story.includes('getUserMedia')],
  ['câmera oferece álbum de fotos e vídeos', home.includes('id="home-story-album"') && home.includes('accept="image/*,video/mp4,video/webm,video/quicktime,.mov"')],
  ['Story é publicado pelo modal da tela inicial', story.includes('createMyStory(') && home.includes('home-story-publish')],
  ['eventos ativos aparecem acima dos seis vídeos na tela inicial', home.indexOf('id="home-event-feed"') >= 0 && home.indexOf('id="home-event-feed"') < home.indexOf('class="card home-youtube"') && home.includes(".sort((a,b)=>a.event_date.localeCompare(b.event_date)")],
  ['feed some quando não há eventos dentro da data', home.includes('if(!active.length){feed.hidden=true;return;}')],
  ['feed reavalia expiração a cada virada de data', home.includes('const scheduleHomeExpiryRefresh=()=>') && home.includes('scheduleHomeExpiryRefresh();')],
  ['abertura do vídeo possui imagem de segurança se o vídeo falhar ou demorar', home.includes('const showOpeningFallback=()=>') && home.includes('fallbackTimer=window.setTimeout(showOpeningFallback,5000)') && home.includes('currentOpeningImage||\'./marca.svg\'')],
  ['agenda consulta eventos publicados de hoje em diante', auth.includes('export async function getPublishedEvents()') && auth.includes(".eq('status','published')") && auth.includes(".gte('event_date',today)")],
  ['evento oferece foto, corte, efeitos, GPS e música', ['event-social-photo','event-social-zoom','event-social-filter','event-social-gps','event-social-music'].every(id => home.includes('id="'+id+'"'))],
  ['evento salva imagem cortada com efeito e envia publicação', eventComposer.includes('makeCroppedImage') && eventComposer.includes('getCurrentPosition') && eventComposer.includes('submitMyEvent(')],
  ['data do evento valida formato AAAA-MM-DD corretamente', auth.includes("if (!/^\\d{4}-\\d{2}-\\d{2}$/")],
  ['painel de evento bloqueia datas passadas no calendário', eventComposer.includes('dateInput.min =')],
  ['evento pode ser publicado por qualquer conta autenticada', eventPolicy.includes('create policy events_insert_authenticated') && eventPolicy.includes('created_by = (select auth.uid())') && !eventPolicy.includes("account_type='artist'")],
  ['schema base mantém publicação comunitária de eventos', schema.includes('create policy events_insert_authenticated') && schema.includes('created_by = (select auth.uid())') && !schema.includes('create policy "events_publish_artist_or_admin"')],
  ['painel musical fica na área de perfil artístico', account.includes('id="artist-profile-area" hidden') && account.includes("artistProfileArea.hidden=(profile?.account_type||'user')!=='artist'")],
  ['painel musical identifica título, artista e produtor', ['artist-song-submit-title','artist-song-submit-artist','artist-song-submit-producer'].every(id => account.includes('id="'+id+'"')) && auth.includes('producer_name')],
  ['envio de áudio chama uploadMySong com nome do produtor', account.includes('uploadMySong({') && account.includes("producerName:document.getElementById('artist-song-submit-producer')")],
  ['envio de música exige ficha de artista no backend', auth.includes('export async function uploadMySong') && auth.includes("from('artists')") && auth.includes('if (!artistProfile) throw new Error')],
  ['RLS permite artista publicar diretamente e restringe upload ao artista ou administrador', directSongPolicy.includes('songs_insert_artist_published_or_admin') && directSongPolicy.includes("status = 'published'") && songPolicy.includes('audio_upload_artist_own_folder_or_admin')],
  ['upload musical exige perfil Artista/DJ no cadastro e no Storage', auth.includes("accountProfile?.account_type !== 'artist'") && artistAccountPolicy.includes("p.account_type = 'artist'") && artistAccountPolicy.includes('audio_upload_artist_own_folder_or_admin') && schema.slice(schema.indexOf('create policy \"audio_upload_artist_own_folder_or_admin\"')).includes("p.account_type = 'artist'")],
  ['música enviada por artista entra publicada no catálogo', auth.includes("file_size:file.size,status:'published'") && account.includes('diretamente no catálogo público')],
  ['pacote Android/iOS inclui os dois compositores', prepare.includes("'home-story-composer.js'") && prepare.includes("'event-social-composer.js'") && prepare.includes("'conta.html'")],
  ['GPS tem permissões nativas configuradas no Android e iOS', androidConfig.includes('android.permission.ACCESS_FINE_LOCATION') && androidConfig.includes('android.permission.ACCESS_COARSE_LOCATION') && iosConfig.includes('NSLocationWhenInUseUsageDescription')],
  ['Explorar reúne atalhos de humor, criadores, música, notícias e Funk Consciente', home.includes('id="radar-funk-consciente"') && home.includes('Explorar — vídeos e novidades') && home.includes('videos+engracados+brasil+shorts') && home.includes('criadores+influenciadores+brasil+shorts') && home.includes('funk+consciente+clipes+musica') && home.includes('news.google.com/search?q=funk') && home.includes('funk+consciente+entrevistas+projetos+sociais')],
  ['atalho independente Estúdio/câmera removido da navegação principal', !home.includes('href="./estudio.html"') && !home.includes('📸 Estúdio')],
  ['biblioteca mantém os 20 Shorts enviados e player incorporado do YouTube', (youtubeFeed.match(/'([A-Za-z0-9_-]{11})'/g)||[]).length >= 20 && youtubeFeed.includes('youtube-nocookie.com/embed/') && home.includes('<script type="module" src="./youtube-feed.js"></script>')],
  ['tela inicial renderiza só os seis vídeos originais e mantém os 20 Shorts preservados para Explorar', youtubeFeed.includes('const HOME_VIDEOS = [') && youtubeFeed.includes('const SHORTS = [') && youtubeFeed.includes('const videos=HOME_VIDEOS;') && !youtubeFeed.includes('SHORTS.concat(') && youtubeFeed.includes('Koe Fala Tu') && youtubeFeed.includes('navigator.share')],
  ['curtidas e comentários usam tabelas com RLS e propriedade por usuário', videoPolicy.includes('create table if not exists public.video_likes') && videoPolicy.includes('create table if not exists public.video_comments') && videoPolicy.includes('enable row level security') && videoPolicy.includes('auth.uid()')],
  ['câmera frontal/traseira e efeitos permanecem dentro do modal de Stories', home.includes('id="home-story-flip-button"') && home.includes('data-story-effect="night"') && home.includes('id="home-story-composer"') && story.includes("facingMode = facingMode === 'environment' ? 'user' : 'environment'")],
  ['encerramento da câmera aguarda o MediaRecorder finalizar o último trecho', story.includes("activeRecorder.addEventListener('stop', releaseCameraResources, { once: true })") && story.includes('activeRecorder.stop();')],
  ['gravação não finge aplicar efeitos se captureStream não estiver disponível', story.includes("throw new Error('Canvas captureStream indisponível')") && story.includes('if (!videoStream)')],
  ['câmera pendente é encerrada se a pessoa fechar os Stories antes da permissão', story.includes('let cameraRequestId = 0') && story.includes('const requestId = ++cameraRequestId') && story.includes('requestId !== cameraRequestId') && story.includes('cameraRequestId += 1;')],

  ['zoom dos Stories usa trilho fino preto e não cria painel opaco', home.includes('height:2px;min-height:2px') && home.includes('background:transparent') && home.includes('width:min(54vw,250px)')],
  ['controles de efeitos e álbum ficam compactos e discretos', home.includes('.home-story-effect-list button{min-height:26px') && home.includes('min-width:54px;min-height:32px')],
  ['botões físicos de volume ajustam zoom somente com câmera aberta no Android', story.includes("capital:volume-key") && story.includes('CapitalVolumeBridge?.setStoryCameraOpen?.(true)') && native.includes('KEYCODE_VOLUME_UP') && native.includes('KEYCODE_VOLUME_DOWN') && native.includes('addJavascriptInterface')],
  ['câmera dos Stories ocupa a tela inteira do telefone', home.includes('#home-story-composer{position:fixed') && home.includes('#home-story-composer-card{position:absolute;inset:0;width:100%;height:100%') && home.includes('#home-story-camera-stage{position:absolute;inset:0;width:100%;height:100%')],
  ['zoom fica acima do botão central de foto/gravação', home.includes('.home-story-zoom{position:absolute') && home.includes('bottom:calc(env(safe-area-inset-bottom,0px) + 208px)') && home.includes('.home-story-compose-controls{position:absolute') && home.includes('bottom:calc(env(safe-area-inset-bottom,0px) + 116px)')],
  ['álbum, virar câmera e efeitos ficam na faixa inferior', home.includes('#home-story-album-button{left:18px}') && home.includes('#home-story-flip-button{right:18px}') && home.includes('.home-story-effects{position:absolute') && home.includes('bottom:calc(env(safe-area-inset-bottom,0px) + 58px)')]];
for (const [name, ok] of checks) console.log((ok ? 'OK  ' : 'ERRO') + ' ' + name);
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) process.exit(1);
console.log('Fluxos prioritários do próximo teste verificados: ' + checks.length + ' testes.');
// Volume hardware bridge and visual refinements are part of the Android test build.
