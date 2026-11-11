import * as auth from './supabase/auth.js';

const el = id => document.getElementById(id);
const form = el('admin-story-form');
const fileInput = el('admin-story-file');
const captionInput = el('admin-story-caption');
const publishButton = el('admin-story-publish');
const status = el('admin-story-status');
const list = el('admin-story-list');
const dashboard = el('dashboard');
let loading = false;
let storySongs = [];
let musicSelect, musicStart, musicVolume, musicPreview;

function message(text) { if (status) status.textContent = text; }
function dateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
function mountStoryMusicPicker() {
  if (!form || document.getElementById('admin-story-music-picker')) return;
  const wrap = document.createElement('section'); wrap.id = 'admin-story-music-picker'; wrap.className = 'item';
  const heading = document.createElement('strong'); heading.textContent = '🎵 Música do Story';
  const hint = document.createElement('p'); hint.className = 'muted'; hint.textContent = 'Selecione uma faixa publicada e autorizada no catálogo do Capital do Trem.';
  const label = document.createElement('label'); label.textContent = 'Escolher música';
  musicSelect = document.createElement('select'); musicSelect.append(new Option('Sem música', ''));
  for (const song of storySongs) musicSelect.append(new Option(song.artist_name + ' — ' + song.title, song.id));
  const startLabel = document.createElement('label'); startLabel.textContent = 'Iniciar em (segundos)';
  musicStart = document.createElement('input'); musicStart.type = 'number'; musicStart.min = '0'; musicStart.max = '3600'; musicStart.value = '0';
  const volumeLabel = document.createElement('label'); volumeLabel.textContent = 'Volume';
  musicVolume = document.createElement('input'); musicVolume.type = 'range'; musicVolume.min = '0'; musicVolume.max = '1'; musicVolume.step = '0.05'; musicVolume.value = '0.8';
  musicPreview = document.createElement('audio'); musicPreview.controls = true; musicPreview.preload = 'none'; musicPreview.hidden = true;
  musicSelect.addEventListener('change', () => { const song = storySongs.find(item => item.id === musicSelect.value); musicPreview.pause(); musicPreview.removeAttribute('src'); if(song){musicPreview.src=song.audio_url;musicPreview.volume=Number(musicVolume.value);musicPreview.hidden=false;}else musicPreview.hidden=true; });
  musicStart.addEventListener('change',()=>{if(musicPreview.src)try{musicPreview.currentTime=Number(musicStart.value)||0;}catch{}});
  musicVolume.addEventListener('input',()=>{musicPreview.volume=Number(musicVolume.value);});
  wrap.append(heading,hint);
  if(storySongs.length)wrap.append(label,musicSelect,startLabel,musicStart,volumeLabel,musicVolume,musicPreview);
  else {const empty=document.createElement('p');empty.className='muted';empty.textContent='Nenhuma música publicada disponível no catálogo. O Story pode ser publicado sem trilha.';wrap.append(empty);}
  form.insertBefore(wrap,form.querySelector('button[type="submit"]'));
}
function renderStories(items) {
  list.replaceChildren();
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Nenhum Story publicado ainda.';
    list.append(empty);
    return;
  }
  for (const story of items) {
    const card = document.createElement('article');
    card.className = 'item';
    card.style.margin = '10px 0';
    const title = document.createElement('strong');
    title.textContent = story.media_type === 'video' ? '🎬 Story em vídeo' : '🖼️ Story em imagem';
    const detail = document.createElement('p');
    detail.className = 'muted';
    detail.textContent = (story.caption || 'Sem mensagem') + ' • ' + (new Date(story.expires_at) > new Date() ? 'Ativo até ' : 'Expirado em ') + dateLabel(story.expires_at);
    const open = document.createElement('a');
    open.href = story.media_url;
    open.target = '_blank';
    open.rel = 'noopener';
    open.textContent = 'Visualizar mídia';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'secondary';
    remove.textContent = 'Excluir Story';
    remove.style.marginLeft = '10px';
    remove.addEventListener('click', async () => {
      if (!confirm('Excluir este Story para todos os usuários?')) return;
      remove.disabled = true;
      try {
        await auth.deleteAdminStory(story.id);
        await loadStories();
        message('Story excluído.');
      } catch (error) {
        message(error?.message || 'Não foi possível excluir o Story.');
        remove.disabled = false;
      }
    });
    card.append(title, detail, open, remove);
    list.append(card);
  }
}
async function loadStories() {
  try { renderStories(await auth.getAdminStories()); }
  catch (error) { list.textContent = error?.message || 'Não foi possível carregar os Stories.'; }
}
form?.addEventListener('submit', async event => {
  event.preventDefault();
  if (loading) return;
  const file = fileInput.files?.[0];
  if (!file) { message('Escolha uma foto ou vídeo.'); return; }
  loading = true;
  publishButton.disabled = true;
  publishButton.textContent = 'PUBLICANDO STORY…';
  message('Enviando mídia e publicando para todos os usuários…');
  try {
    await auth.createAdminStory({ file, caption: captionInput.value, musicSongId: musicSelect?.value || '', musicStartSeconds: musicStart?.value || 0, musicVolume: musicVolume?.value || 0.8 });
    form.reset();
    await loadStories();
    message('🟢 STORY PUBLICADO! A foto oficial recebeu o aro verde e os usuários conectados serão avisados.');
  } catch (error) {
    message('ERRO AO PUBLICAR: ' + (error?.message || 'Tente novamente.'));
  } finally {
    loading = false;
    publishButton.disabled = false;
    publishButton.textContent = '🟢 Publicar Story e avisar os usuários';
  }
});

async function activateIfAdmin() {
  if (!dashboard || dashboard.hidden) return;
  try {
    const session = await auth.getCurrentSession();
    if (session?.user && await auth.isCurrentUserAdmin()) { storySongs = await auth.getPublishedSongs().catch(() => []); mountStoryMusicPicker(); await loadStories(); }
  } catch (error) {
    message(error?.message || 'Entre como administrador para gerenciar Stories.');
  }
}
const observer = new MutationObserver(activateIfAdmin);
if (dashboard) observer.observe(dashboard, { attributes: true, attributeFilter: ['hidden'] });
try {
  auth.initSupabase();
  await activateIfAdmin();
} catch (error) {
  message('Stories aguardando conexão com o Supabase: ' + (error?.message || ''));
}
