import { initSupabase, getActiveAdminStories, subscribeAdminStories } from './supabase/auth.js';

const logo = document.getElementById('site-logo');
const viewer = document.getElementById('capital-story-viewer');
const mediaBox = document.getElementById('capital-story-media');
const captionBox = document.getElementById('capital-story-caption');
const progress = document.querySelector('#capital-story-progress span');
const toast = document.getElementById('capital-story-toast');
const SEEN_KEY = 'capitaldotrem_admin_stories_seen_v1';
let stories = [];
let currentIndex = 0;
let advanceTimer = null;
let toastTimer = null;
let unsubscribe = null;

function seenIds() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); }
  catch { return new Set(); }
}
function rememberSeen(id) {
  const seen = seenIds();
  seen.add(id);
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-100))); } catch {}
}
function updateRing() {
  if (!logo) return;
  const active = stories.filter(story => new Date(story.expires_at).getTime() > Date.now());
  logo.classList.toggle('has-active-story', active.length > 0);
  logo.setAttribute('aria-label', active.length ? 'Abrir Stories da Capital do Trem. Há novidades.' : 'Foto oficial da Capital do Trem');
  logo.title = active.length ? 'Ver Stories e novidades' : 'Capital do Trem';
  logo.setAttribute('role', 'button');
  logo.tabIndex = 0;
}
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 4800);
}
function clearAdvance() {
  clearTimeout(advanceTimer);
  advanceTimer = null;
}
function closeViewer() {
  clearAdvance();
  viewer?.classList.remove('is-open');
  viewer?.setAttribute('aria-hidden', 'true');
  if (mediaBox) mediaBox.replaceChildren();
  if (logo) logo.focus();
}
function renderStory(index) {
  clearAdvance();
  if (!stories.length) return closeViewer();
  currentIndex = (index + stories.length) % stories.length;
  const story = stories[currentIndex];
  rememberSeen(story.id);
  mediaBox.replaceChildren();
  const media = document.createElement(story.media_type === 'video' ? 'video' : 'img');
  media.src = story.media_url;
  if (story.media_type === 'video') {
    media.controls = true;
    media.autoplay = true;
    media.playsInline = true;
    media.addEventListener('ended', () => renderStory(currentIndex + 1));
  } else {
    media.alt = 'Story oficial da Capital do Trem';
    advanceTimer = setTimeout(() => renderStory(currentIndex + 1), 7000);
  }
  mediaBox.append(media);
  captionBox.textContent = story.caption || 'Capital do Trem • A música da nossa quebrada!';
  if (progress) {
    progress.style.transition = 'none';
    progress.style.transform = 'scaleX(1)';
    if (story.media_type !== 'video') requestAnimationFrame(() => {
      progress.style.transition = 'transform 7s linear';
      progress.style.transform = 'scaleX(0)';
    });
  }
}
function openViewer() {
  stories = stories.filter(story => new Date(story.expires_at).getTime() > Date.now());
  updateRing();
  if (!stories.length) {
    showToast('Ainda não tem Story publicado. Fica ligado nas novidades!');
    return;
  }
  const seen = seenIds();
  const firstUnseen = stories.findIndex(story => !seen.has(story.id));
  viewer.classList.add('is-open');
  viewer.setAttribute('aria-hidden', 'false');
  renderStory(firstUnseen >= 0 ? firstUnseen : 0);
}
async function refreshStories({ notifyNew = false, previousIds = new Set() } = {}) {
  try {
    const next = await getActiveAdminStories();
    stories = next;
    updateRing();
    if (notifyNew) {
      const fresh = next.find(story => !previousIds.has(story.id));
      if (fresh) {
        showToast('🟢 Nova atualização nos Stories da Capital do Trem!');
        try { navigator.vibrate?.([100, 60, 100]); } catch {}
      }
    }
  } catch (error) {
    // A tabela pode ainda aguardar a aplicação da migration no Supabase.
    console.info('Stories oficiais ainda não estão disponíveis:', error?.message || error);
  }
}

if (logo && viewer) {
  logo.addEventListener('click', openViewer);
  logo.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openViewer(); }
  });
  document.getElementById('capital-story-close')?.addEventListener('click', closeViewer);
  document.getElementById('capital-story-prev')?.addEventListener('click', () => renderStory(currentIndex - 1));
  document.getElementById('capital-story-next')?.addEventListener('click', () => renderStory(currentIndex + 1));
  viewer.addEventListener('click', event => { if (event.target === viewer) closeViewer(); });
  document.addEventListener('keydown', event => {
    if (!viewer.classList.contains('is-open')) return;
    if (event.key === 'Escape') closeViewer();
    if (event.key === 'ArrowRight') renderStory(currentIndex + 1);
    if (event.key === 'ArrowLeft') renderStory(currentIndex - 1);
  });
  try {
    initSupabase();
    await refreshStories();
    let knownIds = new Set(stories.map(story => story.id));
    unsubscribe = subscribeAdminStories(async payload => {
      const previous = knownIds;
      await refreshStories({ notifyNew: payload?.eventType === 'INSERT', previousIds: previous });
      knownIds = new Set(stories.map(story => story.id));
      if (viewer.classList.contains('is-open')) renderStory(Math.min(currentIndex, stories.length - 1));
    });
    window.addEventListener('pagehide', () => { if (unsubscribe) unsubscribe(); });
  } catch (error) {
    console.info('Não foi possível iniciar os Stories neste momento:', error?.message || error);
  }
}
