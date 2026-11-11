import * as auth from './supabase/auth.js';

const el = id => document.getElementById(id);
const panel = el('profile-panel');
const form = el('my-story-form');
const fileInput = el('my-story-file');
const captionInput = el('my-story-caption');
const publishButton = el('my-story-publish');
const status = el('my-story-status');
const list = el('my-story-list');
const avatar = el('my-story-avatar');
const addButton = el('my-story-add');
const composeFields = el('my-story-compose-fields');
const preview = el('my-story-preview');
const cancelButton = el('my-story-cancel');
let previewUrl = '';
let loading = false;
let observer;

function say(message) { if (status) status.textContent = message; }
function dateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
function characterAvatarData(data) {
  const allowed = {
    gender: ['male', 'female'],
    skin: ['#8d5524', '#f1c27d', '#c68642', '#5a3825', '#e0ac69'],
    hair: ['#171313', '#5b321d', '#d6a84b', '#a52a2a', '#777777'],
    shirt: ['#ed1c24', '#111111', '#eeeeee', '#2465a8', '#21834a', '#7a42a6']
  };
  const defaults = { gender: 'male', skin: '#8d5524', hair: '#171313', shirt: '#ed1c24' };
  const clean = {};
  for (const [key, choices] of Object.entries(allowed)) clean[key] = choices.includes(data?.[key]) ? data[key] : defaults[key];
  const female = clean.gender === 'female';
  const hair = female
    ? '<path d="M25 58 Q20 9 60 10 Q100 9 95 60 L88 90 Q82 54 60 48 Q38 54 32 90Z" fill="'+clean.hair+'"/>'
    : '<path d="M29 48 Q27 12 60 12 Q94 12 91 49 Q76 30 60 34 Q42 31 29 48Z" fill="'+clean.hair+'"/>';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#353535"/><stop offset="1" stop-color="#111"/></linearGradient></defs><rect width="160" height="160" rx="80" fill="url(#bg)"/><path d="M17 160 Q20 105 80 105 Q140 105 143 160" fill="'+clean.shirt+'"/><path d="M52 99 L52 119 Q80 139 108 119 L108 99" fill="'+clean.skin+'"/><ellipse cx="80" cy="67" rx="34" ry="42" fill="'+clean.skin+'"/>'+hair+'<ellipse cx="66" cy="68" rx="3.5" ry="4" fill="#211"/><ellipse cx="94" cy="68" rx="3.5" ry="4" fill="#211"/><path d="M70 88 Q80 95 90 88" fill="none" stroke="#542d24" stroke-width="3" stroke-linecap="round"/>'+(female?'<path d="M45 54 Q30 78 42 111 M115 54 Q130 78 118 111" fill="none" stroke="'+clean.hair+'" stroke-width="9" stroke-linecap="round"/>':'')+'</svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
function renderAvatar(profileAvatar, profile) {
  if (!avatar) return;
  avatar.replaceChildren();
  const image = document.createElement('img');
  if (profileAvatar?.avatar_type === 'photo' && profileAvatar.avatar_url) image.src = profileAvatar.avatar_url;
  else if (profileAvatar?.avatar_type === 'character' && profileAvatar.avatar_data) image.src = characterAvatarData(profileAvatar.avatar_data);
  else {
    avatar.textContent = (profile?.display_name || profile?.username || 'U').trim().charAt(0).toUpperCase();
    return;
  }
  image.alt = 'Sua foto de perfil';
  image.loading = 'eager';
  avatar.append(image);
}
function renderStories(items) {
  list.replaceChildren();
  const active = items.some(item => new Date(item.expires_at).getTime() > Date.now());
  if (avatar) {
    avatar.style.borderColor = active ? '#22c55e' : '#777';
    avatar.style.boxShadow = active ? '0 0 14px #22c55e88' : 'none';
  }
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Você ainda não publicou Stories.';
    list.append(empty);
    return;
  }
  for (const story of items) {
    const card = document.createElement('article');
    card.className = 'notice';
    card.style.margin = '10px 0';
    const title = document.createElement('strong');
    title.textContent = story.media_type === 'video' ? '🎬 Seu Story em vídeo' : '🖼️ Seu Story em imagem';
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
    remove.textContent = 'Excluir meu Story';
    remove.addEventListener('click', async () => {
      if (!confirm('Excluir este Story da sua conta para todos os usuários?')) return;
      remove.disabled = true;
      try {
        await auth.deleteMyStory(story.id);
        await loadStories();
        say('Seu Story foi excluído.');
      } catch (error) {
        say(error?.message || 'Não foi possível excluir seu Story.');
        remove.disabled = false;
      }
    });
    card.append(title, detail, open, remove);
    list.append(card);
  }
}
async function loadStories() {
  try { renderStories(await auth.getMyStories()); }
  catch (error) { list.textContent = error?.message || 'Não foi possível carregar seus Stories.'; }
}
async function activate() {
  if (!panel || panel.hidden || panel.dataset.storiesReady === '1') return;
  panel.dataset.storiesReady = '1';
  try {
    const profile = await auth.getMyBasicProfile();
    const profileAvatar = await auth.getMyAvatar().catch(() => null);
    renderAvatar(profileAvatar, profile);
    await loadStories();
  } catch (error) {
    panel.dataset.storiesReady = '';
    say(error?.message || 'Entre na sua conta para publicar Stories.');
  }
}
function clearStoryDraft() {
  if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = ''; }
  preview?.replaceChildren();
  form?.reset();
  if (composeFields) composeFields.hidden = true;
}
addButton?.addEventListener('click', () => fileInput?.click());
fileInput?.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  preview?.replaceChildren();
  const extension = String(file.name || '').toLowerCase().split('.').pop();
  const isVideo = file.type.startsWith('video/') || ['mp4', 'webm'].includes(extension);
  const media = document.createElement(isVideo ? 'video' : 'img');
  media.src = previewUrl;
  if (isVideo) { media.controls = true; media.playsInline = true; media.preload = 'metadata'; }
  else media.alt = 'Prévia do seu Story';
  preview?.append(media);
  if (composeFields) composeFields.hidden = false;
  say('Prévia pronta. Se quiser, escreva uma mensagem e publique.');
  captionInput?.focus();
});
cancelButton?.addEventListener('click', () => {
  clearStoryDraft();
  say('Rascunho cancelado. Toque em + para escolher outra mídia.');
});
form?.addEventListener('submit', async event => {
  event.preventDefault();
  if (loading) return;
  const file = fileInput.files?.[0];
  if (!file) { say('Escolha uma foto ou vídeo.'); return; }
  loading = true;
  publishButton.disabled = true;
  publishButton.textContent = 'PUBLICANDO…';
  say('Enviando sua publicação…');
  try {
    await auth.createMyStory({ file, caption: captionInput.value });
    clearStoryDraft();
    await loadStories();
    say('🟢 Seu Story foi publicado! Ele já aparece para a comunidade por 24 horas.');
  } catch (error) {
    say(error?.message || 'Não foi possível publicar. Confira o formato, o tamanho e tente novamente.');
  } finally {
    loading = false;
    publishButton.disabled = false;
    publishButton.textContent = '🟢 Publicar Story';
  }
});
try {
  auth.initSupabase();
  observer = new MutationObserver(activate);
  if (panel) observer.observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  auth.watchAuthChanges(() => {
    if (panel && !panel.hidden) {
      panel.dataset.storiesReady = '';
      activate();
    }
  });
  activate();
} catch (error) {
  say(error?.message || 'Stories aguardando conexão com o Supabase.');
}
