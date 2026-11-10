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

function message(text) { if (status) status.textContent = text; }
function dateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
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
    await auth.createAdminStory({ file, caption: captionInput.value });
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
    if (session?.user && await auth.isCurrentUserAdmin()) await loadStories();
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
