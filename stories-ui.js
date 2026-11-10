import {
  initSupabase, getActiveAdminStories, getActiveUserStories,
  subscribeAdminStories, subscribeUserStories
} from './supabase/auth.js';

const logo = document.getElementById('site-logo');
const viewer = document.getElementById('capital-story-viewer');
const mediaBox = document.getElementById('capital-story-media');
const captionBox = document.getElementById('capital-story-caption');
const progress = document.querySelector('#capital-story-progress span');
const toast = document.getElementById('capital-story-toast');
const profileDirectory = document.getElementById('community-profiles');
const SEEN_KEY = 'capitaldotrem_stories_seen_v3';
let officialStories = [];
let userStories = [];
let stories = [];
let currentIndex = 0;
let advanceTimer = null;
let toastTimer = null;
let unsubscribers = [];
let profileObserver;
let lastTrigger = null;

function seenIds() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); }
  catch { return new Set(); }
}
function rememberSeen(id) {
  const seen = seenIds();
  seen.add(id);
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-300))); } catch {}
}
function userStoryGroups() {
  const groups = new Map();
  for (const story of userStories) {
    if (!groups.has(story.author_id)) groups.set(story.author_id, []);
    groups.get(story.author_id).push(story);
  }
  for (const items of groups.values()) items.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
  return groups;
}
function updateOfficialRing() {
  if (!logo) return;
  const active = officialStories.filter(s => new Date(s.expires_at).getTime() > Date.now());
  const unseen = active.some(s => !seenIds().has(s.id));
  logo.classList.toggle('has-active-story', unseen);
  logo.classList.toggle('has-seen-story', active.length > 0 && !unseen);
  logo.setAttribute('aria-label', active.length ? 'Abrir Stories oficiais da Capital do Trem. Há novidades.' : 'Foto oficial da Capital do Trem');
  logo.title = active.length ? 'Ver Stories oficiais' : 'Capital do Trem';
  logo.setAttribute('role', 'button');
  logo.tabIndex = 0;
}
function updateUserProfileRings() {
  if (!profileDirectory) return;
  const groups = userStoryGroups();
  const seen = seenIds();
  for (const avatar of profileDirectory.querySelectorAll('.community-profile-avatar[data-profile-user-id]')) {
    const userId = avatar.dataset.profileUserId;
    const items = (groups.get(userId) || []).filter(s => new Date(s.expires_at).getTime() > Date.now());
    const unseen = items.some(s => !seen.has(s.id));
    avatar.classList.toggle('has-active-story', unseen);
    avatar.classList.toggle('has-seen-story', items.length > 0 && !unseen);
    avatar.setAttribute('role', 'button');
    avatar.tabIndex = 0;
    const card = avatar.closest('.community-profile-card');
    const name = card?.querySelector('.community-profile-copy strong')?.textContent || 'este perfil';
    avatar.setAttribute('aria-label', items.length ? 'Abrir Stories de ' + name : 'Foto de perfil de ' + name);
    avatar.title = items.length ? 'Ver Stories de ' + name : 'Foto de perfil';
    if (avatar.dataset.storyClickBound !== '1') {
      const open = () => {
        const current = userStoryGroups().get(avatar.dataset.profileUserId) || [];
        if (current.some(s => new Date(s.expires_at).getTime() > Date.now())) openViewer(current, name, avatar);
      };
      avatar.addEventListener('click', open);
      avatar.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
      });
      avatar.dataset.storyClickBound = '1';
    }
  }
}
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 4800);
}
function clearAdvance() { clearTimeout(advanceTimer); advanceTimer = null; }
function closeViewer() {
  clearAdvance();
  viewer?.classList.remove('is-open');
  viewer?.setAttribute('aria-hidden', 'true');
  if (mediaBox) mediaBox.replaceChildren();
  (lastTrigger || logo)?.focus?.();
  lastTrigger = null;
}
function renderStory(index) {
  clearAdvance();
  if (!stories.length) return closeViewer();
  currentIndex = (index + stories.length) % stories.length;
  const story = stories[currentIndex];
  rememberSeen(story.id);
  updateOfficialRing();
  updateUserProfileRings();
  mediaBox.replaceChildren();
  const media = document.createElement(story.media_type === 'video' ? 'video' : 'img');
  media.src = story.media_url;
  if (story.media_type === 'video') {
    media.controls = true;
    media.autoplay = true;
    media.playsInline = true;
    media.addEventListener('ended', () => renderStory(currentIndex + 1));
  } else {
    media.alt = 'Story de ' + (story.display_name || 'Capital do Trem');
    advanceTimer = setTimeout(() => renderStory(currentIndex + 1), 7000);
  }
  mediaBox.append(media);
  const author = story.author_id ? (story.display_name || 'Usuário Uai') + (story.username ? ' • @' + story.username : '') : 'Capital do Trem • Oficial';
  captionBox.textContent = author + (story.caption ? ' — ' + story.caption : '');
  if (progress) {
    progress.style.transition = 'none';
    progress.style.transform = 'scaleX(1)';
    if (story.media_type !== 'video') requestAnimationFrame(() => {
      progress.style.transition = 'transform 7s linear';
      progress.style.transform = 'scaleX(0)';
    });
  }
}
function openViewer(items, label = 'Stories', trigger = null) {
  stories = (items || []).filter(s => new Date(s.expires_at).getTime() > Date.now());
  if (!stories.length) return;
  const seen = seenIds();
  const firstUnseen = stories.findIndex(s => !seen.has(s.id));
  lastTrigger = trigger;
  viewer.classList.add('is-open');
  viewer.setAttribute('aria-hidden', 'false');
  viewer.setAttribute('aria-label', label);
  renderStory(firstUnseen >= 0 ? firstUnseen : 0);
}
async function refreshStories({ notify = false, previousAdmin = new Set(), previousUsers = new Set() } = {}) {
  try {
    const [admins, users] = await Promise.all([getActiveAdminStories(), getActiveUserStories()]);
    officialStories = admins;
    userStories = users;
    updateOfficialRing();
    updateUserProfileRings();
    if (notify) {
      const newOfficial = admins.some(s => !previousAdmin.has(s.id));
      const newUser = users.some(s => !previousUsers.has(s.id));
      if (newOfficial || newUser) {
        showToast(newOfficial ? '🟢 Nova atualização oficial nos Stories da Capital do Trem!' : '🟢 Tem Story novo nos perfis da comunidade!');
        try { navigator.vibrate?.([100, 60, 100]); } catch {}
      }
    }
  } catch (error) {
    console.info('Stories aguardando conexão:', error?.message || error);
  }
}
if (viewer) {
  const openOfficial = () => openViewer(officialStories, 'Stories oficiais da Capital do Trem', logo);
  logo?.addEventListener('click', openOfficial);
  logo?.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openOfficial(); }
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
  if (profileDirectory) {
    profileObserver = new MutationObserver(updateUserProfileRings);
    profileObserver.observe(profileDirectory, { childList: true, subtree: true });
  }
  try {
    initSupabase();
    await refreshStories();
    let knownAdmin = new Set(officialStories.map(s => s.id));
    let knownUsers = new Set(userStories.map(s => s.id));
    const handleChange = async payload => {
      const previousAdmin = knownAdmin;
      const previousUsers = knownUsers;
      await refreshStories({ notify: payload?.eventType === 'INSERT', previousAdmin, previousUsers });
      knownAdmin = new Set(officialStories.map(s => s.id));
      knownUsers = new Set(userStories.map(s => s.id));
      if (viewer.classList.contains('is-open') && stories.length) {
        const activeIds = new Set([...officialStories, ...userStories].map(s => s.id));
        if (!activeIds.has(stories[currentIndex]?.id)) closeViewer();
      }
    };
    unsubscribers.push(subscribeAdminStories(handleChange), subscribeUserStories(handleChange));
    window.addEventListener('pagehide', () => {
      unsubscribers.forEach(unsub => unsub());
      profileObserver?.disconnect();
    }, { once: true });
  } catch (error) {
    console.info('Não foi possível iniciar os Stories:', error?.message || error);
  }
}
