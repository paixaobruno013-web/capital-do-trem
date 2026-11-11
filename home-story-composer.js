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
const recordButton = el('home-story-record-button');
let stream = null;
let recorder = null;
let chunks = [];
let selectedFile = null;
let previewUrl = '';
let recordLimit = null;
let busy = false;

function say(text) { if (status) status.textContent = text; }
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
}
function setSelected(file) {
  selectedFile = file || null;
  publish.disabled = !selectedFile || busy;
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
  message.textContent = isVideo ? 'Prévia do vídeo selecionado' : 'Prévia da foto selecionada';
  say(file.name + ' • ' + (file.size / 1024 / 1024).toFixed(1) + ' MB');
}
async function startCamera() {
  stopCamera();
  clearPreview();
  if (!navigator.mediaDevices?.getUserMedia) {
    message.textContent = 'Câmera indisponível neste aparelho. Escolha uma mídia do álbum.';
    say('Toque em Álbum para selecionar uma foto ou vídeo.');
    return false;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: true
    });
    live.srcObject = stream;
    live.hidden = false;
    await live.play().catch(() => {});
    message.textContent = 'Câmera aberta • escolha Foto, Vídeo ou Álbum';
    say('Sua câmera está pronta. Você também pode escolher uma mídia do álbum.');
    return true;
  } catch (error) {
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
  el('home-story-caption').value = '';
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
function closeComposer() {
  if (recorder?.state === 'recording') recorder.stop();
  clearTimeout(recordLimit);
  stopCamera();
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
  canvas.getContext('2d').drawImage(live, 0, 0, canvas.width, canvas.height);
  canvas.toBlob(blob => {
    if (!blob) { say('Não foi possível capturar a foto. Tente novamente.'); return; }
    setSelected(new File([blob], 'capital-do-trem-story.jpg', { type: 'image/jpeg' }));
  }, 'image/jpeg', 0.92);
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
    const mimeType = ['video/mp4;codecs=h264','video/mp4','video/webm;codecs=vp8','video/webm']
      .find(type => MediaRecorder.isTypeSupported?.(type));
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunks = [];
    recorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
    recorder.onerror = () => {
      clearTimeout(recordLimit);
      recordButton.textContent = '● Vídeo';
      say('A gravação foi interrompida. Tente novamente ou escolha um vídeo do álbum.');
    };
    recorder.onstop = () => {
      clearTimeout(recordLimit);
      recordButton.textContent = '● Vídeo';
      const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
      if (!blob.size) { say('O vídeo ficou vazio. Grave novamente.'); return; }
      const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
      setSelected(new File([blob], 'capital-do-trem-story.' + extension, { type: blob.type }));
    };
    recorder.start(500);
    recordButton.textContent = '■ Parar';
    say('Gravando vídeo… toque em Parar quando terminar (máximo 30 segundos).');
    recordLimit = setTimeout(() => {
      if (recorder?.state === 'recording') recorder.stop();
    }, 30000);
  } catch (error) {
    say('Não foi possível iniciar a gravação neste aparelho. Escolha um vídeo do álbum.');
  }
}
async function publishStory() {
  if (!selectedFile || busy) return;
  busy = true;
  publish.disabled = true;
  say('Enviando seu Story… não feche esta tela.');
  try {
    const saved = await auth.createMyStory({
      file: selectedFile,
      caption: el('home-story-caption').value.trim()
    });
    say('Story publicado! Ele ficará disponível por 24 horas.');
    document.dispatchEvent(new CustomEvent('capital:stories-updated', { detail: { id: saved.id } }));
    window.setTimeout(closeComposer, 900);
  } catch (error) {
    say(error?.message || 'Não foi possível publicar. Confira sua conexão e tente novamente.');
    publish.disabled = false;
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
recordButton?.addEventListener('click', toggleRecording);
publish?.addEventListener('click', publishStory);
modal?.addEventListener('click', event => { if (event.target === modal) closeComposer(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && modal?.classList.contains('is-open')) closeComposer();
});
window.addEventListener('pagehide', stopCamera);
