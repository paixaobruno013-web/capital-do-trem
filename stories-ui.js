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
let activeStoryAudio = null;
let activeStoryMusicTimer = null;

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
function renderHomeStoryTray() {
  const tray = document.getElementById('home-stories-list');
  if (!tray) return;
  const groups = userStoryGroups();
  const seen = seenIds();
  const entries = [];
  const activeOfficial = officialStories.filter(s => new Date(s.expires_at).getTime() > Date.now());
  if (activeOfficial.length) entries.push({ id: 'official', name: 'Capital do Trem', stories: activeOfficial, official: true });
  for (const [authorId, items] of groups) {
    const active = items.filter(s => new Date(s.expires_at).getTime() > Date.now());
    if (!active.length) continue;
    const latest = active[active.length - 1];
    entries.push({ id: authorId, name: latest.display_name || 'Usuário Uai', stories: active, avatar: latest.avatar_url || '', latest });
  }
  tray.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'muted home-stories-empty';
    empty.textContent = 'Os Stories da comunidade aparecerão aqui. Publique o seu pela sua conta.';
    tray.append(empty);
    return;
  }
  for (const entry of entries) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'home-story-item';
    button.setAttribute('aria-label', 'Ver Stories de ' + entry.name);
    const ring = document.createElement('span');
    ring.className = 'home-story-ring' + (entry.stories.every(s => seen.has(s.id)) ? ' seen' : '');
    const avatar = document.createElement('span');
    avatar.className = 'home-story-avatar';
    const imageUrl = entry.official ? '' : entry.avatar;
    if (imageUrl && /^https:\/\//i.test(imageUrl)) {
      const image = document.createElement('img');
      image.src = imageUrl;
      image.alt = '';
      image.loading = 'lazy';
      image.referrerPolicy = 'no-referrer';
      avatar.append(image);
    } else {
      avatar.textContent = entry.official ? 'CT' : (entry.name.trim().charAt(0).toUpperCase() || 'U');
    }
    ring.append(avatar);
    const name = document.createElement('span');
    name.className = 'home-story-name';
    name.textContent = entry.name;
    button.append(ring, name);
    button.addEventListener('click', () => openViewer(entry.stories, 'Stories de ' + entry.name, button));
    tray.append(button);
  }
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
  clearTimeout(activeStoryMusicTimer); activeStoryMusicTimer = null;
  if (activeStoryAudio) { activeStoryAudio.pause(); activeStoryAudio.removeAttribute('src'); activeStoryAudio = null; }
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
  clearTimeout(activeStoryMusicTimer); activeStoryMusicTimer = null;
  if (activeStoryAudio) { activeStoryAudio.pause(); activeStoryAudio.removeAttribute('src'); activeStoryAudio = null; }
  captionBox.replaceChildren();
  const media = document.createElement(story.media_type === 'video' ? 'video' : 'img');
  media.src = story.media_url;
  let storySeconds = 7;\n  if (story.media_type === 'video') {
    media.controls = true;
    media.autoplay = true;
    media.playsInline = true;
    if (story.music_url) media.muted = true;
    media.addEventListener('ended', () => renderStory(currentIndex + 1));
  } else {
    media.alt = 'Story de ' + (story.display_name || 'Capital do Trem');
    storySeconds = story.music_url ? Math.max(5, Math.min(60, Number(story.music_duration_seconds) || 15)) : 7;
    advanceTimer = setTimeout(() => renderStory(currentIndex + 1), storySeconds * 1000);
  }
  mediaBox.append(media);
  const author = story.author_id ? (story.display_name || 'Usuário Uai') + (story.username ? ' • @' + story.username : '') : 'Capital do Trem • Oficial';
  const caption = document.createElement('div');
  caption.textContent = author + (story.caption ? ' — ' + story.caption : '');
  captionBox.append(caption);
  if (story.music_url && /^https:\/\//i.test(story.music_url)) {
    const music = document.createElement('audio');
    music.controls = true; music.preload = 'auto'; music.playsInline = true;
    music.src = story.music_url; music.volume = Math.max(0, Math.min(1, Number(story.music_volume ?? 0.8)));
    music.setAttribute('aria-label', 'Música do Story: ' + (story.music_title || 'trilha musical'));
    const musicLabel = document.createElement('small'); musicLabel.className = 'muted';
    musicLabel.textContent = '🎵 ' + (story.music_artist ? story.music_artist + ' — ' : '') + (story.music_title || 'Música do Capital do Trem');
    captionBox.append(musicLabel, music);
    activeStoryAudio = music;
    music.addEventListener('loadedmetadata', () => { try { music.currentTime = Math.max(0, Number(story.music_start_seconds) || 0); } catch {} }, { once: true });
    music.play().catch(() => { musicLabel.textContent += ' • Toque em reproduzir para ouvir'; });
    activeStoryMusicTimer = setTimeout(() => { music.pause(); }, Math.max(5, Math.min(60, Number(story.music_duration_seconds) || 15)) * 1000);
  }
  if (progress) {
    progress.style.transition = 'none';
    progress.style.transform = 'scaleX(1)';
    if (story.media_type !== 'video') requestAnimationFrame(() => {
      progress.style.transition = 'transform ' + storySeconds + 's linear';
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
    renderHomeStoryTray();
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
