// Atualiza automaticamente a vitrine com os quatro vídeos públicos mais recentes do canal.
const YOUTUBE_FEED_ENDPOINT = 'https://zmjxkfjzrbbxyvgkwirv.supabase.co/functions/v1/youtube-channel-feed';
const YOUTUBE_PUBLIC_KEY = 'sb_publishable_FLbDg6UCePQHb7s0wkywng_J9pNKlsP';
const grid = document.querySelector('.home-youtube-grid');
const feedStatus = document.getElementById('youtube-feed-status');
let lastRefresh = 0;

function activateVideoButton(button) {
  button.addEventListener('click', () => {
    const id = button.dataset.youtubeId;
    if (!/^[a-zA-Z0-9_-]{11}$/.test(id || '')) return;
    const frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1';
    frame.title = button.getAttribute('aria-label') || 'Vídeo da Capital do Trem';
    frame.loading = 'eager';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen = true;
    button.replaceWith(frame);
  }, { once: true });
}

const PINNED_HOME_TRACKS = [
  { id: '-c2QERKILzg', title: 'Quinta música da seleção', order: '5º • Música' },
  { id: 'HHKsZAS1eMk', title: 'Sexta música da seleção', order: '6º • Música' },
];

function createHomeVideoCard(video, orderText, linkText = 'Assistir no YouTube') {
  const article = document.createElement('article');
  article.className = 'home-youtube-video';
  const order = document.createElement('span');
  order.className = 'home-youtube-order';
  order.textContent = orderText;
  const frame = document.createElement('div');
  frame.className = 'home-youtube-frame';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'home-youtube-load';
  button.dataset.youtubeId = video.id;
  button.setAttribute('aria-label', 'Carregar e reproduzir: ' + video.title);
  const image = document.createElement('img');
  image.src = 'https://i.ytimg.com/vi/' + video.id + '/hqdefault.jpg';
  image.alt = '';
  image.loading = 'lazy';
  image.decoding = 'async';
  const label = document.createElement('span');
  label.textContent = '▶ Reproduzir vídeo';
  button.append(image, label);
  activateVideoButton(button);
  frame.append(button);
  const link = document.createElement('a');
  link.href = 'https://youtu.be/' + video.id;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = linkText;
  article.append(order, frame, link);
  return article;
}

function renderVideos(videos) {
  if (!grid || !Array.isArray(videos) || !videos.length) return;
  grid.replaceChildren();
  videos.slice(0, 4).forEach((video, index) => {
    grid.append(createHomeVideoCard(video, index === 0 ? '1º • Mais recente' : (index + 1) + 'º'));
  });
  PINNED_HOME_TRACKS.forEach(track => grid.append(createHomeVideoCard(track, track.order, 'Ouvir no YouTube')));
}
async function refreshYouTubeFeed(force = false) {
  if (!grid || !navigator.onLine) return;
  if (!force && Date.now() - lastRefresh < 5 * 60 * 1000) return;
  try {
    const response = await fetch(YOUTUBE_FEED_ENDPOINT, {
      method: 'GET',
      headers: { apikey: YOUTUBE_PUBLIC_KEY, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error('Feed indisponível (' + response.status + ').');
    const data = await response.json();
    if (!Array.isArray(data.videos) || !data.videos.length) throw new Error('Nenhum vídeo público foi retornado.');
    renderVideos(data.videos);
    lastRefresh = Date.now();
    if (feedStatus) feedStatus.textContent = '✓ Vídeos atualizados automaticamente pelo canal oficial.';
  } catch (error) {
    if (feedStatus) feedStatus.textContent = 'Não foi possível atualizar agora. Mantivemos os vídeos já exibidos; tentaremos novamente quando houver conexão.';
    console.warn('Atualização automática do YouTube:', error);
  }
}

refreshYouTubeFeed(true);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refreshYouTubeFeed();
});
window.addEventListener('online', () => refreshYouTubeFeed(true));
