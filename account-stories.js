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
let loading = false;
let observer;

function say(message) { if (status) status.textContent = message; }
function dateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}
function renderAvatar(profileAvatar, profile) {
  if (!avatar) return;
  avatar.replaceChildren();
  if (profileAvatar?.avatar_url) {
    const img = document.createElement('img');
    img.src = profileAvatar.avatar_url;
    img.alt = 'Sua foto de perfil';
    avatar.append(img);
  } else {
    avatar.textContent = (profile?.display_name || profile?.username || 'U').trim().charAt(0).toUpperCase();
  }
}
function renderStories(items) {
  list.replaceChildren();
  const active = items.some(item => new Date(item.expires_at).getTime() > Date.now());
  avatar.style.borderColor = active ? '#22c55e' : '#777';
  avatar.style.boxShadow = active ? '0 0 14px #22c55e88' : 'none';
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
    form.reset();
    await loadStories();
    say('🟢 Seu Story foi publicado! Ele já aparece para a comunidade por 24 horas.');
  } catch (error) {
    say(error?.message || 'Não foi possível publicar. Confira o formato, o tamanho e tente novamente.');
  } finally {
    loading = false;
    publishButton.disabled = false;
    publishButton.textContent = '🟢 Publicar no meu Story';
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
