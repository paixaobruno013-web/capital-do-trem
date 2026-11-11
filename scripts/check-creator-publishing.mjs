import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const [home, story, eventComposer, account, auth, prepare, eventPolicy, songPolicy] = await Promise.all([
  read('index.html'),
  read('home-story-composer.js'),
  read('event-social-composer.js'),
  read('conta.html'),
  read('supabase/auth.js'),
  read('scripts/prepare-web.mjs'),
  read('supabase/migrations/20261111173858_allow_all_users_to_publish_events.sql'),
  read('supabase/migrations/20261111173000_artist_song_submissions_with_producer.sql')
]);
const checks = [
  ['atalho + de Stories fica na tela inicial', /id="home-story-add"/.test(home)],
  ['modal de Stories fica embutido na tela inicial', /id="home-story-composer"/.test(home)],
  ['ao tocar no +, abre câmera sem navegar para outra página', /function openComposer\(\)[\s\S]*?modal\.classList\.add\('is-open'\)[\s\S]*?startCamera\(\)/.test(story)],
  ['câmera usa getUserMedia e oferece álbum de fotos e vídeos', /getUserMedia/.test(story) && /accept="image\/\*,video\/mp4,video\/webm,video\/quicktime,\.mov"/.test(home)],
  ['Story é publicado pelo modal da tela inicial', /createMyStory\(/.test(story) && /home-story-publish/.test(home)],
  ['feed de eventos aparece antes dos vídeos do YouTube', home.indexOf('id="home-event-feed"') >= 0 && home.indexOf('id="home-event-feed"') < home.indexOf('class="card home-youtube"')],
  ['feed some quando não há eventos dentro da data', /if\(!active\.length\)\{feed\.hidden=true;return;\}/.test(home)],
  ['agenda consulta somente eventos publicados e com data de hoje em diante', /export async function getPublishedEvents\(\)[\s\S]*?\.eq\('status','published'\)[\s\S]*?\.gte\('event_date',today\)/.test(auth)],
  ['evento tem painel com foto, corte, efeitos, GPS e música', /event-social-photo/.test(home) && /event-social-zoom/.test(home) && /event-social-filter/.test(home) && /event-social-gps/.test(home) && /event-social-music/.test(home)],
  ['evento salva imagem cortada com efeito e envia publicação', /makeCroppedImage/.test(eventComposer) && /getCurrentPosition/.test(eventComposer) && /submitMyEvent\(/.test(eventComposer)],
  ['publicação de eventos não exige perfil de artista', /create policy events_insert_authenticated[\s\S]*?created_by = \(select auth\.uid\(\)\)[\s\S]*?status = 'published'/.test(eventPolicy) && !/account_type\s*=\s*'artist'/.test(eventPolicy)],
  ['painel musical fica na área de perfil artístico', /id="artist-profile-area" hidden/.test(account) && /artistProfileArea\.hidden=\(profile\?\.account_type\|\|'user'\)!=='artist'/.test(account)],
  ['painel musical identifica título, artista e produtor', /artist-song-submit-title/.test(account) && /artist-song-submit-artist/.test(account) && /artist-song-submit-producer/.test(account) && /producer_name/.test(auth)],
  ['envio de áudio chama uploadMySong com nome do produtor', /uploadMySong\(\{[\s\S]*?producerName:document\.getElementById\('artist-song-submit-producer'\)/.test(account)],
  ['envio de música exige ficha de artista no backend', /export async function uploadMySong[\s\S]*?from\('artists'\)[\s\S]*?if\s*\(!artistProfile\)/.test(auth)],
  ['RLS permite apenas artista ou administrador enviar áudio', /songs_insert_artist_pending_or_admin/.test(songPolicy) && /audio_upload_artist_own_folder_or_admin/.test(songPolicy)],
  ['pacote Android/iOS inclui os dois compositores', /'home-story-composer\.js'/.test(prepare) && /'event-social-composer\.js'/.test(prepare) && /'conta\.html'/.test(prepare)],
  ['Radar inclui vídeos engraçados e informações do Funk Consciente', /videos\+engracados\+funk\+brasil/.test(home) && /news\.google\.com\/search\?q=funk/.test(home)]
];
for (const [name, ok] of checks) console.log((ok ? 'OK  ' : 'ERRO') + ' ' + name);
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) process.exit(1);
console.log('Fluxos prioritários do próximo teste verificados: ' + checks.length + ' testes.');
