import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const [home, story, eventComposer, account, auth, prepare, eventPolicy, songPolicy, directSongPolicy, schema, androidConfig, iosConfig] = await Promise.all([
  read('index.html'),
  read('home-story-composer.js'),
  read('event-social-composer.js'),
  read('conta.html'),
  read('supabase/auth.js'),
  read('scripts/prepare-web.mjs'),
  read('supabase/migrations/20261111173858_allow_all_users_to_publish_events.sql'),
  read('supabase/migrations/20261111171633_artist_song_submissions_with_producer.sql'),
  read('supabase/migrations/20261111174525_artist_song_direct_publication.sql'),
  read('supabase/schema.sql'),
  read('scripts/configure-android-media.py'),
  read('scripts/prepare-ios-info.py')
]);
const checks = [
  ['atalho + de Stories fica na tela inicial', home.includes('id="home-story-add"')],
  ['modal de Stories fica embutido na tela inicial', home.includes('id="home-story-composer"')],
  ['ao tocar no +, abre câmera sem navegar para outra página', story.includes('function openComposer()') && story.includes("modal.classList.add('is-open')") && story.includes('startCamera();') && story.includes('getUserMedia')],
  ['câmera oferece álbum de fotos e vídeos', home.includes('id="home-story-album"') && home.includes('accept="image/*,video/mp4,video/webm,video/quicktime,.mov"')],
  ['Story é publicado pelo modal da tela inicial', story.includes('createMyStory(') && home.includes('home-story-publish')],
  ['feed de eventos aparece antes dos vídeos do YouTube', home.indexOf('id="home-event-feed"') >= 0 && home.indexOf('id="home-event-feed"') < home.indexOf('class="card home-youtube"')],
  ['feed some quando não há eventos dentro da data', home.includes('if(!active.length){feed.hidden=true;return;}')],
  ['feed reavalia expiração a cada virada de data', home.includes('const scheduleHomeExpiryRefresh=()=>') && home.includes('scheduleHomeExpiryRefresh();')],
  ['agenda consulta eventos publicados de hoje em diante', auth.includes('export async function getPublishedEvents()') && auth.includes(".eq('status','published')") && auth.includes(".gte('event_date',today)")],
  ['evento oferece foto, corte, efeitos, GPS e música', ['event-social-photo','event-social-zoom','event-social-filter','event-social-gps','event-social-music'].every(id => home.includes('id="'+id+'"'))],
  ['evento salva imagem cortada com efeito e envia publicação', eventComposer.includes('makeCroppedImage') && eventComposer.includes('getCurrentPosition') && eventComposer.includes('submitMyEvent(')],
  ['evento pode ser publicado por qualquer conta autenticada', eventPolicy.includes('create policy events_insert_authenticated') && eventPolicy.includes('created_by = (select auth.uid())') && !eventPolicy.includes("account_type='artist'")],
  ['schema base mantém publicação comunitária de eventos', schema.includes('create policy events_insert_authenticated') && schema.includes('created_by = (select auth.uid())') && !schema.includes('create policy "events_publish_artist_or_admin"')],
  ['painel musical fica na área de perfil artístico', account.includes('id="artist-profile-area" hidden') && account.includes("artistProfileArea.hidden=(profile?.account_type||'user')!=='artist'")],
  ['painel musical identifica título, artista e produtor', ['artist-song-submit-title','artist-song-submit-artist','artist-song-submit-producer'].every(id => account.includes('id="'+id+'"')) && auth.includes('producer_name')],
  ['envio de áudio chama uploadMySong com nome do produtor', account.includes('uploadMySong({') && account.includes("producerName:document.getElementById('artist-song-submit-producer')")],
  ['envio de música exige ficha de artista no backend', auth.includes('export async function uploadMySong') && auth.includes("from('artists')") && auth.includes('if (!artistProfile) throw new Error')],
  ['RLS permite artista publicar diretamente e restringe upload ao artista ou administrador', directSongPolicy.includes('songs_insert_artist_published_or_admin') && directSongPolicy.includes("status = 'published'") && songPolicy.includes('audio_upload_artist_own_folder_or_admin')],
  ['música enviada por artista entra publicada no catálogo', auth.includes("file_size:file.size,status:'published'") && account.includes('diretamente no catálogo público')],
  ['pacote Android/iOS inclui os dois compositores', prepare.includes("'home-story-composer.js'") && prepare.includes("'event-social-composer.js'") && prepare.includes("'conta.html'")],
  ['GPS tem permissões nativas configuradas no Android e iOS', androidConfig.includes('android.permission.ACCESS_FINE_LOCATION') && androidConfig.includes('android.permission.ACCESS_COARSE_LOCATION') && iosConfig.includes('NSLocationWhenInUseUsageDescription')],
  ['Radar inclui vídeos engraçados e informações do Funk Consciente', home.includes('videos+engracados+funk+brasil') && home.includes('news.google.com/search?q=funk')]
];
for (const [name, ok] of checks) console.log((ok ? 'OK  ' : 'ERRO') + ' ' + name);
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) process.exit(1);
console.log('Fluxos prioritários do próximo teste verificados: ' + checks.length + ' testes.');
