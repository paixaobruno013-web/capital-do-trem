import * as auth from './supabase/auth.js';

const el = id => document.getElementById(id);
const modal = el('home-story-composer');
const addButton = el('home-story-add');
const live = el('home-story-live');
const photoPreview = el('home-story-photo-preview');
const videoPreview = el('home-story-selected-video');
const message = el('home-story-camera-message');
const status = el('home-story-status');
const album = el('home-story-album');
const publish = el('home-story-publish');
const saveButton = el('home-story-save');
const recordButton = el('home-story-record-button');
const flipButton = el('home-story-flip-button');
const zoomControl = el('home-story-zoom');
const zoomValue = el('home-story-zoom-value');
let cameraZoom = 1;
const effectButtons = [...document.querySelectorAll('[data-story-effect]')];
const effects = {
  natural: { label: 'Natural', css: 'none' },
  day: { label: 'Dia', css: 'brightness(1.12) contrast(1.04) saturate(1.12)' },
  night: { label: 'Noturno', css: 'brightness(.72) contrast(1.18) saturate(1.12)' },
  warm: { label: 'Quente', css: 'sepia(.18) saturate(1.25) brightness(1.04)' },
  bw: { label: 'P&B', css: 'grayscale(1) contrast(1.12)' },
  neon: { label: 'Neon', css: 'saturate(1.55) contrast(1.12) hue-rotate(8deg)' },
  beauty: { label: 'Beleza suave', css: 'brightness(1.06) saturate(1.08) contrast(.96)' }
};
let activeEffect = 'natural';
let facingMode = 'environment';
let stream = null;
let recorder = null;
let processedStream = null;
let renderFrame = 0;
let chunks = [];
let selectedFile = null;
let previewUrl = '';
let recordLimit = null;
let busy = false;
let cameraRequestId = 0;

function say(text) { if (status) status.textContent = text; }
function effectCss() { return effects[activeEffect]?.css || 'none'; }
function applyEffect() {
  const css = effectCss();
  if (live) live.style.filter = css;
  if (photoPreview) photoPreview.style.filter = css;
  if (videoPreview) videoPreview.style.filter = css;
  effectButtons.forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.storyEffect === activeEffect));
  });
}
function stopCamera() {
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
  live.srcObject = null;
}
function clearPreview() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = '';
  photoPreview.hidden = true;
  photoPreview.removeAttribute('src');
  videoPreview.pause();
  videoPreview.hidden = true;
  videoPreview.removeAttribute('src');
  live.hidden = false;
  applyEffect();
}
function setSelected(file) {
  selectedFile = file || null;
  publish.disabled = !selectedFile || busy;
  if (saveButton) saveButton.disabled = !selectedFile || busy;
  clearPreview();
  if (!file) return;
  previewUrl = URL.createObjectURL(file);
  const isVideo = file.type.startsWith('video/');
  if (isVideo) {
    live.hidden = true;
    videoPreview.src = previewUrl;
    videoPreview.hidden = false;
  } else {
    live.hidden = true;
    photoPreview.src = previewUrl;
    photoPreview.hidden = false;
  }
  applyEffect();
  message.textContent = isVideo ? 'Prévia do vídeo selecionado' : 'Prévia da foto selecionada';
  say(file.name + ' • ' + (file.size / 1024 / 1024).toFixed(1) + ' MB');
}
async function startCamera() {
  const requestId = ++cameraRequestId;
  stopCamera();
  clearPreview();
  if (!navigator.mediaDevices?.getUserMedia) {
    message.textContent = 'Câmera indisponível neste aparelho. Escolha uma mídia do álbum.';
    say('Toque em Álbum para selecionar uma foto ou vídeo.');
    return false;
  }
  try {
    const cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: true
    });
    // The user may close the composer or switch cameras while permission is pending.
    if (requestId !== cameraRequestId || !modal?.classList.contains('is-open')) {
      cameraStream.getTracks().forEach(track => track.stop());
      return false;
    }
    stream = cameraStream;
    cameraZoom = Number(zoomControl?.value || 1);
    if (zoomValue) zoomValue.textContent = cameraZoom.toFixed(1).replace('.0','') + '×';
    live.srcObject = stream;
    live.hidden = false;
    applyEffect();
    await live.play().catch(() => {});
    message.textContent = 'Câmera aberta • escolha Foto, Vídeo ou Álbum';
    say('Câmera pronta. Escolha um efeito ou capture sua mídia.');
    return true;
  } catch (error) {
    if (requestId !== cameraRequestId || !modal?.classList.contains('is-open')) return false;
    message.textContent = 'Não foi possível abrir a câmera. Confira a permissão ou use o álbum.';
    say(error?.name === 'NotAllowedError'
      ? 'Permita o acesso à câmera nas configurações do aparelho ou escolha uma mídia do álbum.'
      : 'A câmera não abriu. Você ainda pode escolher uma mídia do álbum.');
    return false;
  }
}
function openComposer() {
  if (!modal || busy) return;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  selectedFile = null;
  album.value = '';
  publish.disabled = true;
  if (saveButton) saveButton.disabled = true;
  el('home-story-caption').value = '';
  activeEffect = 'natural';
  applyEffect();
  clearPreview();
  message.textContent = 'Abrindo sua câmera…';
  say('A câmera será aberta aqui. O álbum continua disponível.');
  startCamera();
  el('home-story-close')?.focus();
  auth.getCurrentSession().then(session => {
    if (session?.user) return;
    say('Entre na sua conta para publicar um Story. Você pode escolher a mídia agora e entrar antes de publicar.');
    if (!el('home-story-account-link')) {
      const link = document.createElement('a');
      link.id = 'home-story-account-link';
      link.href = './conta.html';
      link.textContent = 'Entrar ou criar conta';
      link.style.cssText = 'display:inline-block;color:#fff;font-weight:800;margin:5px 0;text-decoration:underline;text-decoration-color:#ed1c24';
      status?.after(link);
    }
  }).catch(() => {});
}
function releaseCameraResources() {
  clearTimeout(recordLimit);
  if (renderFrame) cancelAnimationFrame(renderFrame);
  renderFrame = 0;
  if (processedStream) processedStream.getTracks().forEach(track => track.stop());
  processedStream = null;
  stopCamera();
}
function closeComposer() {
  // Invalidate any getUserMedia request that has not resolved yet.
  cameraRequestId += 1;
  const activeRecorder = recorder;
  if (activeRecorder?.state === 'recording') {
    // Let MediaRecorder finish writing its final chunk before stopping its tracks.
    activeRecorder.addEventListener('stop', releaseCameraResources, { once: true });
    activeRecorder.stop();
    recordButton.textContent = '● Vídeo';
  } else {
    releaseCameraResources();
  }
  clearPreview();
  modal?.classList.remove('is-open');
  modal?.setAttribute('aria-hidden', 'true');
  el('home-story-account-link')?.remove();
  addButton?.focus();
}
function capturePhoto() {
  if (!stream || !live.videoWidth || !live.videoHeight) {
    say('A câmera ainda não está pronta. Aguarde ou escolha uma mídia do álbum.');
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = live.videoWidth;
  canvas.height = live.videoHeight;
  const context = canvas.getContext('2d');
  context.filter = 'none';
  const cropWidth = canvas.width / cameraZoom;
  const cropHeight = canvas.height / cameraZoom;
  context.drawImage(live, (canvas.width-cropWidth)/2, (canvas.height-cropHeight)/2, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
  canvas.toBlob(blob => {
    if (!blob) { say('Não foi possível capturar a foto. Tente novamente.'); return; }
    setSelected(new File([blob], 'capital-do-trem-story.jpg', { type: 'image/jpeg' }));
    applyEffect();
    say('Foto pronta com o efeito selecionado. Você pode salvar na galeria ou publicar.');
  }, 'image/jpeg', 0.94);
}
function startFilteredRecording() {
  const canvas = document.createElement('canvas');
  const width = live.videoWidth || 720;
  const height = live.videoHeight || 1280;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const draw = () => {
    if (!live.videoWidth || !live.videoHeight) {
      renderFrame = requestAnimationFrame(draw);
      return;
    }
    context.filter = effectCss();
    const cropWidth = width / cameraZoom;
    const cropHeight = height / cameraZoom;
    context.drawImage(live, (width-cropWidth)/2, (height-cropHeight)/2, cropWidth, cropHeight, 0, 0, width, height);
    renderFrame = requestAnimationFrame(draw);
  };
  draw();
  const videoStream = canvas.captureStream?.(30);
  if (!videoStream) {
    if (renderFrame) cancelAnimationFrame(renderFrame);
    renderFrame = 0;
    throw new Error('Canvas captureStream indisponível');
  }
  stream.getAudioTracks().forEach(track => videoStream.addTrack(track));
  processedStream = videoStream;
  return videoStream;
}
function toggleRecording() {
  if (recorder?.state === 'recording') {
    recorder.stop();
    recordButton.textContent = '● Vídeo';
    return;
  }
  if (!stream || !window.MediaRecorder) {
    say('A gravação pela câmera não está disponível neste navegador. Escolha um vídeo do álbum.');
    return;
  }
  try {
    const recordingStream = startFilteredRecording();
    const mimeType = ['video/mp4;codecs=h264','video/mp4','video/webm;codecs=vp8','video/webm']
      .find(type => MediaRecorder.isTypeSupported?.(type));
    recorder = new MediaRecorder(recordingStream, mimeType ? { mimeType } : undefined);
    chunks = [];
    recorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
    recorder.onerror = () => {
      clearTimeout(recordLimit);
      if (renderFrame) cancelAnimationFrame(renderFrame);
      recordButton.textContent = '● Vídeo';
      say('A gravação foi interrompida. Tente novamente ou escolha um vídeo do álbum.');
    };
    recorder.onstop = () => {
      clearTimeout(recordLimit);
      if (renderFrame) cancelAnimationFrame(renderFrame);
      if (processedStream) processedStream.getTracks().forEach(track => track.stop());
      processedStream = null;
      recordButton.textContent = '● Vídeo';
      const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
      if (!blob.size) { say('O vídeo ficou vazio. Grave novamente.'); return; }
      const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
      setSelected(new File([blob], 'capital-do-trem-story.' + extension, { type: blob.type }));
      say('Vídeo gravado com o efeito selecionado. Você pode salvar na galeria ou publicar.');
    };
    recorder.start(500);
    recordButton.textContent = '■ Parar';
    say('Gravando com o efeito selecionado… máximo 30 segundos.');
    recordLimit = setTimeout(() => {
      if (recorder?.state === 'recording') recorder.stop();
    }, 30000);
  } catch (error) {
    if (renderFrame) cancelAnimationFrame(renderFrame);
    renderFrame = 0;
    if (processedStream) processedStream.getTracks().forEach(track => track.stop());
    processedStream = null;
    recordButton.textContent = '● Vídeo';
    say('Não foi possível iniciar a gravação com efeitos neste aparelho. Escolha um vídeo do álbum.');
  }
}
async function preparePhotoForExport(file) {
  if (!file?.type.startsWith('image/')) return file;
  const image = new Image();
  const url = URL.createObjectURL(file);
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    context.filter = effectCss();
    context.drawImage(image, 0, 0);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.94));
    return blob ? new File([blob], 'capital-do-trem-story.jpg', { type: 'image/jpeg' }) : file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
async function saveToGallery() {
  if (!selectedFile || busy) return;
  try {
    const file = await preparePhotoForExport(selectedFile);
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Capital do Trem' });
      say('Compartilhamento aberto. Escolha Salvar imagem ou Salvar vídeo no aparelho.');
      return;
    }
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name || 'capital-do-trem-story';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    say('Arquivo preparado para salvar. No iPhone, use Compartilhar e Salvar Imagem/Vídeo quando disponível.');
  } catch (error) {
    if (error?.name !== 'AbortError') say('Não foi possível salvar automaticamente. Tente compartilhar o arquivo ou verificar as permissões.');
  }
}
async function publishStory() {
  if (!selectedFile || busy) return;
  busy = true;
  publish.disabled = true;
  if (saveButton) saveButton.disabled = true;
  say('Enviando seu Story… não feche esta tela.');
  try {
    const file = await preparePhotoForExport(selectedFile);
    const saved = await auth.createMyStory({
      file,
      caption: el('home-story-caption').value.trim()
    });
    say('Story publicado! Ele ficará disponível por 24 horas.');
    document.dispatchEvent(new CustomEvent('capital:stories-updated', { detail: { id: saved.id } }));
    window.setTimeout(closeComposer, 900);
  } catch (error) {
    say(error?.message || 'Não foi possível publicar. Confira sua conexão e tente novamente.');
    publish.disabled = false;
    if (saveButton) saveButton.disabled = false;
  } finally {
    busy = false;
  }
}

addButton?.addEventListener('click', openComposer);
el('home-story-close')?.addEventListener('click', closeComposer);
el('home-story-album-button')?.addEventListener('click', () => album.click());
album?.addEventListener('change', () => {
  const file = album.files?.[0];
  if (!file) return;
  if (!(file.type.startsWith('image/') || file.type.startsWith('video/'))) {
    say('Escolha uma foto ou vídeo válido.');
    album.value = '';
    return;
  }
  const isVideo = file.type.startsWith('video/');
  const maxSize = isVideo ? 20 * 1024 * 1024 : 8 * 1024 * 1024;
  if (file.size > maxSize) {
    say(isVideo ? 'O vídeo deve ter até 20 MB.' : 'A foto deve ter até 8 MB.');
    album.value = '';
    return;
  }
  setSelected(file);
});
el('home-story-photo-button')?.addEventListener('click', capturePhoto);
// Toque longo grava; soltar encerra. Clique de teclado continua acessível.
recordButton?.addEventListener('pointerdown', event => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  event.preventDefault();
  recordButton.setPointerCapture?.(event.pointerId);
  if (recorder?.state !== 'recording') toggleRecording();
});
const stopHeldRecording = () => {
  if (recorder?.state === 'recording') toggleRecording();
};
recordButton?.addEventListener('pointerup', stopHeldRecording);
recordButton?.addEventListener('pointercancel', stopHeldRecording);
recordButton?.addEventListener('lostpointercapture', stopHeldRecording);
recordButton?.addEventListener('click', event => {
  if (event.detail === 0) toggleRecording();
});
zoomControl?.addEventListener('input', async () => {
  cameraZoom = Number(zoomControl.value || 1);
  if (zoomValue) zoomValue.textContent = cameraZoom.toFixed(1).replace('.0','') + '×';
  const track = stream?.getVideoTracks?.()[0];
  const capabilities = track?.getCapabilities?.();
  if (capabilities && 'zoom' in capabilities) {
    const min = capabilities.zoom.min ?? 1;
    const max = capabilities.zoom.max ?? 1;
    const value = min + ((cameraZoom - 1) / 2) * (max - min);
    try { await track.applyConstraints({ advanced: [{ zoom: Math.min(max, Math.max(min, value)) }] }); }
    catch (error) { say('O zoom físico não está disponível neste modo de câmera.'); }
  }
});
saveButton?.addEventListener('click', saveToGallery);
flipButton?.addEventListener('click', async () => {
  facingMode = facingMode === 'environment' ? 'user' : 'environment';
  const ok = await startCamera();
  if (ok) say(facingMode === 'user' ? 'Câmera frontal ativada.' : 'Câmera traseira ativada.');
});
effectButtons.forEach(button => button.addEventListener('click', () => {
  activeEffect = button.dataset.storyEffect;
  applyEffect();
  say('Efeito ' + effects[activeEffect].label + ' selecionado.');
}));
publish?.addEventListener('click', publishStory);
modal?.addEventListener('click', event => { if (event.target === modal) closeComposer(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && modal?.classList.contains('is-open')) closeComposer();
});
window.addEventListener('pagehide', stopCamera);
