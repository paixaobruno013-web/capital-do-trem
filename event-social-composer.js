import { initSupabase, getCurrentSession, uploadMyMedia, submitMyEvent, getEventMusicOptions } from './supabase/auth.js';

const byId = id => document.getElementById(id);
const modal = byId('event-social-composer');
const form = byId('event-social-form');
const fileInput = byId('event-social-photo');
const preview = byId('event-social-preview');
const status = byId('event-social-status');
const dateInput = byId('event-social-date');
let sourceImage = null;
let objectUrl = null;
let gps = { latitude: null, longitude: null };

function setStatus(message, error = false) {
  if (!status) return;
  status.textContent = message;
  status.style.color = error ? '#ff858b' : '';
}
function updateEventDateMinimum() {
  if (!dateInput) return;
  const now = new Date();
  dateInput.min = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  if (dateInput.value && dateInput.value < dateInput.min) dateInput.value = '';
}
function openComposer() {
  if (!modal) return;
  updateEventDateMinimum();
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  byId('event-social-title')?.focus();
  loadMusic();
}
function closeComposer() {
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  setStatus('Sua publicação ficará visível na agenda enquanto estiver dentro da data.');
}
async function loadMusic() {
  const select = byId('event-social-music');
  if (!select || select.dataset.loaded === 'yes') return;
  try {
    const songs = await getEventMusicOptions();
    songs.forEach(song => {
      const option = document.createElement('option');
      option.value = song.id;
      option.textContent = song.title + (song.artist_name ? ' — ' + song.artist_name : '');
      select.append(option);
    });
    select.dataset.loaded = 'yes';
  } catch (error) {
    setStatus('Não foi possível carregar as músicas agora. Você pode publicar sem trilha.', true);
  }
}
function renderPreview() {
  if (!preview || !sourceImage) return;
  const filter = byId('event-social-filter')?.value || 'none';
  const scale = Number(byId('event-social-zoom')?.value || 1);
  preview.src = sourceImage.src;
  preview.style.filter = filter;
  preview.style.transform = 'scale(' + scale + ')';
  preview.hidden = false;
  byId('event-social-preview-wrap').hidden = false;
}
function makeCroppedImage() {
  return new Promise((resolve, reject) => {
    if (!sourceImage) return resolve(null);
    const width = 1200, height = 1500;
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return reject(new Error('Não foi possível preparar a imagem.'));
    const scale = Math.max(width / sourceImage.naturalWidth, height / sourceImage.naturalHeight) * Number(byId('event-social-zoom')?.value || 1);
    const drawWidth = sourceImage.naturalWidth * scale;
    const drawHeight = sourceImage.naturalHeight * scale;
    const x = (width - drawWidth) / 2;
    const y = (height - drawHeight) / 2;
    ctx.filter = byId('event-social-filter')?.value || 'none';
    ctx.drawImage(sourceImage, x, y, drawWidth, drawHeight);
    canvas.toBlob(blob => {
      if (!blob) return reject(new Error('Falha ao aplicar o corte da foto.'));
      resolve(new File([blob], 'evento-capital-do-trem.jpg', { type: 'image/jpeg', lastModified: Date.now() }));
    }, 'image/jpeg', .88);
  });
}
byId('event-social-open')?.addEventListener('click', async () => {
  try {
    initSupabase();
    const session = await getCurrentSession();
    if (!session?.user) {
      setStatus('Entre na sua conta para publicar um evento.', true);
      window.location.href = './conta.html?return=eventos';
      return;
    }
    openComposer();
  } catch (error) {
    setStatus(error.message || 'Não foi possível abrir a publicação.', true);
  }
});
byId('event-social-close')?.addEventListener('click', closeComposer);
modal?.addEventListener('click', event => { if (event.target === modal) closeComposer(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && modal && !modal.hidden) closeComposer(); });
fileInput?.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  sourceImage = null;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
  if (!file) { byId('event-social-preview-wrap').hidden = true; return; }
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type) || file.size > 5 * 1024 * 1024) {
    fileInput.value = '';
    setStatus('Escolha uma foto JPG, PNG ou WebP de até 5 MB.', true);
    return;
  }
  objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => { sourceImage = image; renderPreview(); setStatus('Foto pronta. Ajuste o corte e o efeito antes de publicar.'); };
  image.onerror = () => setStatus('Não foi possível abrir essa foto.', true);
  image.src = objectUrl;
});
byId('event-social-zoom')?.addEventListener('input', renderPreview);
byId('event-social-filter')?.addEventListener('change', renderPreview);
byId('event-social-gps')?.addEventListener('click', () => {
  if (!navigator.geolocation) { setStatus('GPS não disponível neste aparelho.', true); return; }
  setStatus('Obtendo sua localização…');
  navigator.geolocation.getCurrentPosition(position => {
    gps = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    const address = byId('event-social-address');
    address.value = address.value.trim() || 'Localização GPS capturada';
    byId('event-social-gps-status').textContent = 'GPS capturado. As coordenadas serão anexadas ao evento.';
    setStatus('Localização capturada com sucesso.');
  }, error => setStatus(error.message || 'Não foi possível acessar o GPS. Digite o endereço manualmente.', true), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
});
form?.addEventListener('submit', async event => {
  event.preventDefault();
  const submit = byId('event-social-publish');
  submit.disabled = true;
  try {
    initSupabase();
    const session = await getCurrentSession();
    if (!session?.user) throw new Error('Entre na sua conta para publicar.');
    const title = byId('event-social-title').value.trim();
    const date = byId('event-social-date').value;
    const address = byId('event-social-address').value.trim();
    if (!title || !date || !address || address.length < 3) throw new Error('Preencha nome, data e endereço do evento.');
    let posterUrl = null;
    if (sourceImage) {
      setStatus('Preparando sua foto com o corte e o efeito escolhidos…');
      const imageFile = await makeCroppedImage();
      setStatus('Enviando a imagem…');
      posterUrl = await uploadMyMedia(imageFile, 'event');
    }
    setStatus('Publicando seu evento…');
    const created = await submitMyEvent({
      title,
      event_date: date,
      event_time: byId('event-social-time').value,
      address,
      category: byId('event-social-kind').value,
      description: byId('event-social-description').value.trim(),
      poster_url: posterUrl,
      latitude: gps.latitude,
      longitude: gps.longitude,
      music_song_id: byId('event-social-music').value || null
    });
    setStatus('Evento publicado! Ele ficará na tela inicial até o fim da data escolhida.');
    window.dispatchEvent(new CustomEvent('capital:events-updated', { detail: created }));
    form.reset();
    sourceImage = null;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    byId('event-social-preview-wrap').hidden = true;
    gps = { latitude: null, longitude: null };
    byId('event-social-gps-status').textContent = 'Opcional: use o GPS ou digite o endereço.';
    await new Promise(resolve => setTimeout(resolve, 900));
    closeComposer();
  } catch (error) {
    setStatus(error.message || 'Não foi possível publicar. Confira sua conexão e tente novamente.', true);
  } finally {
    submit.disabled = false;
  }
});
