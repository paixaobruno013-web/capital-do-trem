import * as auth from './supabase/auth.js';
import { runCapitalAI } from './capital-ai.js';

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
let hardwareZoomActive = false;
let holdRecording = false;
const effectButtons = [...document.querySelectorAll('[data-story-effect]')];
const toolsToggle = el('home-story-tools-toggle');
const toolsRail = el('home-story-tools-rail');
const effectsToggle = el('home-story-effects-toggle');
const effects = {
  natural: { label: 'Natural', css: 'none' },
  day: { label: 'Dia', css: 'brightness(1.12) contrast(1.04) saturate(1.12)' },
  night: { label: 'Noturno', css: 'brightness(.72) contrast(1.18) saturate(1.12)' },
  warm: { label: 'Quente', css: 'sepia(.18) saturate(1.25) brightness(1.04)' },
  bw: { label: 'P&B', css: 'grayscale(1) contrast(1.12)' },
  neon: { label: 'Neon', css: 'saturate(1.55) contrast(1.12) hue-rotate(8deg)' },
  beauty: { label: 'Beleza suave', css: 'brightness(1.07) saturate(1.12) contrast(.94)' },
  portrait: { label: 'Retrato Pro', css: 'contrast(1.1) saturate(1.14) brightness(1.04)' },
  cinematic: { label: 'Cinema', css: 'contrast(1.22) saturate(.88) sepia(.1)' },
  funny: { label: 'Divertido', css: 'hue-rotate(34deg) saturate(1.8) contrast(1.12)' }
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
let selectedStoryMusicId = '';
let storyProfilesLoaded = false;
let storySongsLoaded = false;
let storySongs = [];
let cameraRequestId = 0;
let recordingAudioStream = null;
function stopRecordingAudio() {
  if (!recordingAudioStream) return;
  const tracks = recordingAudioStream.getAudioTracks();
  tracks.forEach(track => {
    try { stream?.removeTrack(track); } catch {}
    track.stop();
  });
  recordingAudioStream = null;
}

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
  // Ao escolher uma mídia, desligar câmera e trilhas imediatamente para poupar bateria.
  if (selectedFile) releaseCameraResources();
  modal?.classList.toggle('has-selection', Boolean(file));
  const aiResult = el('home-story-ai-result'); if (aiResult) aiResult.textContent = 'A análise só acontece quando você tocar no botão. A foto será enviada ao serviço de IA para processamento e não será salva pelo app.';
  const aiUse = el('home-story-ai-use'); if (aiUse) aiUse.hidden = true;
  const aiButton = el('home-story-ai-button'); if (aiButton) aiButton.disabled = !file?.type?.startsWith('image/');
  publish.disabled = !selectedFile || busy;
  const feedPublish = el('home-story-feed-publish'); if (feedPublish) feedPublish.disabled = !selectedFile || busy;
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
    let cameraStream;
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        // Deixa o navegador escolher a resolução inicial mais rápida do aparelho.
        // A imagem é otimizada depois da captura, sem atrasar a abertura da câmera.
        video: { facingMode: { ideal: facingMode } },
        audio: false
      });
    } catch (firstError) {
      if (firstError?.name === 'NotAllowedError' || firstError?.name === 'SecurityError') throw firstError;
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: false
      });
    }
    // The user may close the composer or switch cameras while permission is pending.
    if (requestId !== cameraRequestId || !modal?.classList.contains('is-open')) {
      cameraStream.getTracks().forEach(track => track.stop());
      return false;
    }
    stream = cameraStream;
    // Não aplicar restrições de zoom ao abrir: isso pode atrasar o primeiro quadro.
    // O zoom nativo será solicitado somente quando a pessoa mover o controle.
    cameraZoom = 1;
    hardwareZoomActive = false;
    if (zoomControl) zoomControl.value = '1';
    if (zoomValue) zoomValue.textContent = '1×';
    live.style.transform = 'none';
    live.muted = true;
    live.autoplay = true;
    live.playsInline = true;
    live.preload = 'auto';
    // Registrar os eventos antes de associar o stream e chamar play evita perder loadeddata.
    let cameraReady = false;
    const markCameraReady = () => {
      if (cameraReady || requestId !== cameraRequestId || !modal?.classList.contains('is-open')) return;
      cameraReady = true;
      message.textContent = 'Câmera aberta • escolha Foto, Vídeo ou Álbum';
      say('Câmera pronta. Escolha um efeito ou capture sua mídia.');
    };
    live.addEventListener('loadeddata', markCameraReady, { once: true });
    live.addEventListener('canplay', markCameraReady, { once: true });
    live.srcObject = stream;
    live.hidden = false;
    applyEffect();
    message.textContent = 'Câmera conectada • preparando a prévia…';
    say('A câmera está iniciando. Você já pode escolher uma mídia do álbum.');
    await live.play();
    if (live.readyState >= 2 && live.videoWidth > 0) markCameraReady();
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
  modal.classList.remove('has-selection');
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  window.CapitalVolumeBridge?.setStoryCameraOpen?.(true);
  selectedFile = null;
  selectedStoryMusicId = '';
  if (musicSelect) musicSelect.value = '';
  if (musicPreview) { musicPreview.pause(); musicPreview.removeAttribute('src'); musicPreview.hidden = true; }
  album.value = '';
  publish.disabled = true;
  const feedPublish = el('home-story-feed-publish'); if (feedPublish) feedPublish.disabled = true;
  if (saveButton) saveButton.disabled = true;
  el('home-story-caption').value = '';
  activeEffect = 'natural';
  cameraZoom = 1;
  if (zoomControl) zoomControl.value = '1';
  if (zoomValue) zoomValue.textContent = '1×';
  if (live) live.style.transform = 'none';
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
  stopRecordingAudio();
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
  window.CapitalVolumeBridge?.setStoryCameraOpen?.(false);
  el('home-story-account-link')?.remove();
  addButton?.focus();
}
function capturePhoto() {
  if (!stream || !live.videoWidth || !live.videoHeight) {
    say('A câmera ainda não está pronta. Aguarde ou escolha uma mídia do álbum.');
    return;
  }
  // Reduz o quadro para até 1600 px e codifica em segundo plano; evita toDataURL,
  // que cria uma string enorme e pode congelar aparelhos Android mais modestos.
  const sourceWidth = live.videoWidth;
  const sourceHeight = live.videoHeight;
  const captureZoom = hardwareZoomActive ? 1 : cameraZoom;
  const cropWidth = sourceWidth / captureZoom;
  const cropHeight = sourceHeight / captureZoom;
  // 960 px mantém nitidez adequada para Stories e acelera a prévia em celulares.
  const scale = Math.min(1, 960 / Math.max(cropWidth, cropHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(cropWidth * scale));
  canvas.height = Math.max(1, Math.round(cropHeight * scale));
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) { say('Não foi possível preparar a foto. Tente novamente.'); return; }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'medium';
  context.drawImage(live,
    (sourceWidth - cropWidth) / 2, (sourceHeight - cropHeight) / 2, cropWidth, cropHeight,
    0, 0, canvas.width, canvas.height);
  // Mantém o último quadro congelado visível enquanto o JPEG é codificado,
  // evitando uma tela vazia entre o toque e a prévia final.
  live.pause();
  live.hidden = false;
  photoPreview.hidden = true;
  message.textContent = 'Sua foto';
  say('Foto capturada • otimizando imagem…');
  canvas.toBlob(blob => {
    if (!blob) {
      live.hidden = false;
      photoPreview.hidden = true;
      live.play().catch(() => {});
      say('Não foi possível preparar a foto. Tente novamente.');
      return;
    }
    setSelected(new File([blob], 'capital-do-trem-story.jpg', { type: 'image/jpeg' }));
    applyEffect();
    say('Foto pronta! Veja como ficou e escolha publicar ou salvar.');
  }, 'image/jpeg', 0.78);
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
    const recordingZoom = hardwareZoomActive ? 1 : cameraZoom;
    const cropWidth = width / recordingZoom;
    const cropHeight = height / recordingZoom;
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
async function toggleRecording() {
  if (recorder?.state === 'recording') {
    recorder.stop();
    recordButton.textContent = '● Vídeo';
    return;
  }
  if (!stream || !window.MediaRecorder) {
    say('A gravação pela câmera não está disponível neste navegador. Escolha um vídeo do álbum.');
    return;
  }
  const activeCameraStream = stream;
  try {
    // O microfone só é solicitado quando a pessoa escolhe gravar vídeo;
    // abrir a câmera para tirar foto não depende da permissão de áudio.
    try {
      recordingAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false
      });
      if (stream !== activeCameraStream || !modal?.classList.contains('is-open')) {
        stopRecordingAudio();
        return;
      }
      recordingAudioStream.getAudioTracks().forEach(track => activeCameraStream.addTrack(track));
    } catch (audioError) {
      recordingAudioStream = null;
      say('Microfone indisponível. O vídeo será gravado sem áudio.');
    }
    if (stream !== activeCameraStream || !modal?.classList.contains('is-open')) {
      stopRecordingAudio();
      return;
    }
    const recordingStream = startFilteredRecording();
    const mimeType = ['video/mp4;codecs=h264','video/mp4','video/webm;codecs=vp8','video/webm']
      .find(type => MediaRecorder.isTypeSupported?.(type));
    recorder = new MediaRecorder(recordingStream, mimeType ? { mimeType } : undefined);
    chunks = [];
    recorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
    recorder.onerror = () => {
      stopRecordingAudio();
      clearTimeout(recordLimit);
      if (renderFrame) cancelAnimationFrame(renderFrame);
      recordButton.textContent = '● Vídeo';
      say('A gravação foi interrompida. Tente novamente ou escolha um vídeo do álbum.');
    };
    recorder.onstop = () => {
      stopRecordingAudio();
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
    stopRecordingAudio();
    if (renderFrame) cancelAnimationFrame(renderFrame);
    renderFrame = 0;
    if (processedStream) processedStream.getTracks().forEach(track => track.stop());
    processedStream = null;
    recordButton.textContent = '● Vídeo';
    say('Não foi possível iniciar a gravação com efeitos neste aparelho. Escolha um vídeo do álbum.');
  }
}
async function preparePhotoForExport(file) {
  const extension = String(file?.name || '').split('.').pop().toLowerCase();
  if (['heic','heif'].includes(extension) || /image\/(heic|heif)/i.test(file?.type || '')) {
    return preparePhotoForExport(await auth.prepareStoryMediaFile(file));
  }
  const isImage = file?.type?.startsWith('image/') || ['jpg','jpeg','png','webp','heic','heif','avif'].includes(extension);
  if (!isImage) return file;
  const image = new Image();
  const url = URL.createObjectURL(file);
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Não foi possível abrir esta foto. Se ela estiver em HEIC/HEIF, escolha uma versão compatível da galeria.'));
      image.src = url;
    });
    const maxSide = 1920;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a imagem para publicação.');
    context.filter = effectCss();
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let blob = null;
    for (const quality of [0.86, 0.78, 0.68]) {
      blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && blob.size <= 7.5 * 1024 * 1024) break;
    }
    if (!blob) throw new Error('Não foi possível converter a foto para publicação.');
    if (blob.size > 8 * 1024 * 1024) throw new Error('Esta foto continua muito pesada. Escolha uma imagem menor.');
    return new File([blob], 'capital-do-trem-story.jpg', { type: 'image/jpeg', lastModified: Date.now() });
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

async function createAIImageDataUrl(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('A análise por câmera funciona com fotos, não com vídeos.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.78));
    if (!blob) throw new Error('Não foi possível preparar a foto.');
    return await new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob);
    });
  } finally { URL.revokeObjectURL(url); }
}
let lastAISuggestion = '';
el('home-story-ai-button')?.addEventListener('click', async event => {
  const button = event.currentTarget, output = el('home-story-ai-result'), use = el('home-story-ai-use');
  if (!selectedFile || !selectedFile.type.startsWith('image/')) { say('Escolha ou capture uma foto para usar a IA.'); return; }
  button.disabled = true; if (use) use.hidden = true;
  if (output) output.textContent = 'Preparando foto e consultando a IA…';
  try {
    const image = await createAIImageDataUrl(selectedFile);
    lastAISuggestion = await runCapitalAI({ mode: 'caption', imageDataUrl: image, prompt: 'Observe a foto e sugira três legendas curtas e criativas em português brasileiro para um Story do Capital do Trem. Não identifique pessoas nem invente fatos.' });
    if (output) output.textContent = lastAISuggestion;
    if (use) use.hidden = false;
  } catch (error) {
    if (output) output.textContent = error?.message || 'A IA não está disponível agora.';
  } finally { button.disabled = false; }
});
el('home-story-ai-use')?.addEventListener('click', () => {
  const first = lastAISuggestion.split(/\n+/).map(line => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()).find(Boolean);
  if (!first) return;
  const caption = el('home-story-caption'); caption.value = first.slice(0, 280); caption.focus();
  say('Sugestão da IA adicionada. Revise antes de publicar.');
});


async function publishToFeed() {
  if (!selectedFile || busy) return;
  const feedButton = el('home-story-feed-publish');
  busy = true;
  if (feedButton) feedButton.disabled = true;
  if (publish) publish.disabled = true;
  if (saveButton) saveButton.disabled = true;
  const input = el('home-feed-media');
  const form = el('home-feed-composer');
  const caption = el('home-feed-text');
  try {
    if (!input || !form || !caption || typeof DataTransfer !== 'function') {
      throw new Error('Não foi possível preparar a publicação no Feed neste aparelho.');
    }
    say('Preparando sua mídia para o Feed…');
    const file = await preparePhotoForExport(selectedFile);
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    const currentCaption = el('home-story-caption')?.value.trim() || '';
    caption.value = currentCaption || '📸 Publicação compartilhada pelo Estúdio de Câmera';
    caption.dispatchEvent(new Event('input', { bubbles: true }));
    closeComposer();
    document.querySelector('[data-page="inicio"]')?.click();
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    form.requestSubmit();
  } catch (error) {
    say(error?.message || 'Não foi possível preparar a publicação no Feed.');
  } finally {
    busy = false;
    if (feedButton) feedButton.disabled = false;
    if (publish) publish.disabled = false;
    if (saveButton) saveButton.disabled = false;
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
      caption: [el('home-story-caption').value.trim().slice(0,65), [...(el('home-story-friends')?.selectedOptions || [])].map(option => option.dataset.tag || option.textContent).filter(Boolean).length ? 'Marcando: '+[...(el('home-story-friends')?.selectedOptions || [])].map(option => option.dataset.tag || option.textContent).filter(Boolean).join(', ').slice(0,50) : '', el('home-story-link')?.value.trim() ? 'Divulgação: '+el('home-story-link').value.trim().slice(0,110) : ''].filter(Boolean).join(' | ').slice(0,280),
      musicSongId: selectedStoryMusicId
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


const musicToggle = el('home-story-music-toggle');
const musicPanel = el('home-story-music-panel');
const musicSelect = el('home-story-music-select');
const musicSearch = el('home-story-music-search');
const musicStatus = el('home-story-music-status');
let musicPreview = null;
function mountStoryMusicPreview() {
  if (!musicPanel || musicPreview) return;
  musicPreview = document.createElement('audio');
  musicPreview.id = 'home-story-music-preview';
  musicPreview.controls = true;
  musicPreview.preload = 'none';
  musicPreview.hidden = true;
  musicPreview.style.cssText = 'display:block;width:100%;margin-top:10px';
  musicPanel.append(musicPreview);
}
function renderStorySongOptions() {
  if (!musicSelect) return;
  const query = String(musicSearch?.value || '').trim().toLocaleLowerCase('pt-BR');
  const selected = selectedStoryMusicId;
  const filtered = storySongs.filter(song =>
    [song.title, song.artist_name].some(value => String(value || '').toLocaleLowerCase('pt-BR').includes(query))
  );
  musicSelect.replaceChildren(new Option('Sem música', ''));
  for (const song of filtered) musicSelect.add(new Option(song.title + ' — ' + song.artist_name, song.id));
  if (filtered.some(song => song.id === selected)) musicSelect.value = selected;
  if (musicStatus && storySongsLoaded) musicStatus.textContent = filtered.length
    ? filtered.length + ' música(s) do catálogo. Escolha uma faixa para seu Story.'
    : 'Nenhuma música encontrada com esse nome.';
}
musicSearch?.addEventListener('input', renderStorySongOptions);
musicToggle?.addEventListener('click', async () => {
  musicPanel.hidden = !musicPanel.hidden;
  if (musicPanel.hidden || storySongsLoaded) return;
  musicToggle.disabled = true;
  if (musicStatus) musicStatus.textContent = 'Carregando músicas publicadas…';
  try {
    const songs = await auth.getPublishedSongs();
    storySongs = songs;
    storySongsLoaded = true;
    renderStorySongOptions();
    musicSearch?.focus();
    mountStoryMusicPreview();
    if (musicStatus) musicStatus.textContent = songs.length ? 'Escolha a trilha do seu Story.' : 'Ainda não há músicas publicadas no catálogo.';
  } catch (error) {
    if (musicStatus) musicStatus.textContent = error?.message || 'Não foi possível carregar as músicas.';
  } finally { musicToggle.disabled = false; }
});
musicSelect?.addEventListener('change', () => {
  selectedStoryMusicId = musicSelect.value;
  const song = storySongs.find(item => item.id === selectedStoryMusicId);
  if (!musicPreview) mountStoryMusicPreview();
  if (musicPreview) {
    musicPreview.pause();
    musicPreview.removeAttribute('src');
    if (song?.audio_url) {
      musicPreview.src = song.audio_url;
      musicPreview.hidden = false;
      if (musicStatus) musicStatus.textContent = 'Selecionada: ' + song.artist_name + ' — ' + song.title + '. Ouça a prévia ou publique o Story.';
    } else {
      musicPreview.hidden = true;
      if (musicStatus) musicStatus.textContent = selectedStoryMusicId ? 'A faixa selecionada não está disponível para prévia.' : 'Seu Story será publicado sem música.';
    }
  }
});
el('home-story-friends-toggle')?.addEventListener('click', async () => {
  const panel=el('home-story-friends-panel'); panel.hidden=!panel.hidden;
  if(panel.hidden) return;
  const select=el('home-story-friends');
  if(storyProfilesLoaded){select?.focus();return;}
  if(select) select.replaceChildren(new Option('Carregando perfis públicos…',''));
  try {
    const profiles=await auth.getPublicProfiles();
    if(select){
      select.replaceChildren();
      for(const profile of profiles){
        const handle=String(profile.username||'').replace(/^@/,'');
        const label=String(profile.display_name||'Maquinista')+(handle?' (@'+handle+')':'');
        const option=new Option(label,profile.user_id);
        option.dataset.tag=handle?'@'+handle:String(profile.display_name||'Maquinista');
        select.add(option);
      }
      if(!profiles.length) select.add(new Option('Nenhum perfil público disponível',''));
    }
    storyProfilesLoaded=true;
  } catch(error) {
    if(select) select.replaceChildren(new Option(error?.message||'Não foi possível carregar os perfis.',''));
  }
  select?.focus();
});
el('home-story-link-toggle')?.addEventListener('click', () => { const panel=el('home-story-link-panel'); panel.hidden=!panel.hidden; if(!panel.hidden)el('home-story-link')?.focus(); });

addButton?.addEventListener('click', openComposer);
toolsToggle?.addEventListener('click', () => { const collapsed = modal?.classList.toggle('tools-collapsed'); toolsToggle.setAttribute('aria-expanded', String(!collapsed)); });
effectsToggle?.addEventListener('click', () => { const collapsed = modal?.classList.toggle('effects-collapsed'); effectsToggle.setAttribute('aria-expanded', String(!collapsed)); });
el('home-story-tool-text')?.addEventListener('click', () => { const field=el('home-story-caption'); if (!selectedFile) { say('Capture uma foto ou escolha um vídeo para adicionar texto.'); return; } field.focus(); });
el('home-story-tool-music')?.addEventListener('click', () => musicToggle?.click());
el('home-story-tool-tag')?.addEventListener('click', () => el('home-story-friends-toggle')?.click());
el('home-story-tool-save')?.addEventListener('click', saveToGallery);
el('home-story-close')?.addEventListener('click', closeComposer);
el('home-story-album-button')?.addEventListener('click', () => album.click());
album?.addEventListener('change', async () => {
  const original = album.files?.[0];
  if (!original) return;
  const extension = String(original.name || '').split('.').pop().toLowerCase();
  const videoByExtension = ['mp4','mov','webm','m4v'].includes(extension);
  const imageByExtension = ['jpg','jpeg','png','webp','gif','heic','heif','avif'].includes(extension);
  const isVideo = original.type.startsWith('video/') || videoByExtension;
  const isImage = original.type.startsWith('image/') || imageByExtension;
  if (!isImage && !isVideo) {
    say('Escolha uma foto ou vídeo válido da galeria.');
    album.value = '';
    return;
  }
  const maxSize = isVideo ? 20 * 1024 * 1024 : 30 * 1024 * 1024;
  if (original.size > maxSize) {
    say(isVideo ? 'O vídeo deve ter até 20 MB.' : 'A foto original deve ter até 30 MB para ser otimizada antes do envio.');
    album.value = '';
    return;
  }
  const inferredType = isVideo
    ? (original.type || (extension === 'mov' ? 'video/quicktime' : extension === 'webm' ? 'video/webm' : 'video/mp4'))
    : (original.type || (['heic','heif'].includes(extension) ? 'image/heic' : extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg'));
  const file = original.type === inferredType ? original : new File([original], original.name || ('story.' + extension), { type: inferredType, lastModified: original.lastModified || Date.now() });
  publish.disabled = true;
  if (saveButton) saveButton.disabled = true;
  say('Preparando a mídia da galeria…');
  try {
    // Normaliza HEIC/HEIF antes da prévia, evitando que o navegador mostre uma tela vazia.
    const preparedFile = await auth.prepareStoryMediaFile(file);
    // Se outra mídia foi escolhida durante a conversão, não substitua a seleção mais recente.
    if (album.files?.[0] !== original) return;
    setSelected(preparedFile);
    say('Mídia pronta para prévia e publicação.');
  } catch (error) {
    if (album.files?.[0] === original) {
      album.value = '';
      say(error?.message || 'Não foi possível preparar essa mídia. Escolha JPG, PNG ou WebP.');
    }
  } finally {
    if (album.files?.[0] === original) {
      publish.disabled = !selectedFile || busy;
      if (saveButton) saveButton.disabled = !selectedFile || busy;
    }
  }
});
el('home-story-photo-button')?.addEventListener('click', capturePhoto);
// Toque longo grava; soltar encerra. Clique de teclado continua acessível.
recordButton?.addEventListener('pointerdown', event => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  event.preventDefault();
  recordButton.setPointerCapture?.(event.pointerId);
  holdRecording = true;
  if (recorder?.state !== 'recording') toggleRecording();
});
const stopHeldRecording = () => {
  if (!holdRecording) return;
  holdRecording = false;
  if (recorder?.state === 'recording') toggleRecording();
};
recordButton?.addEventListener('pointerup', stopHeldRecording);
recordButton?.addEventListener('pointercancel', stopHeldRecording);
recordButton?.addEventListener('lostpointercapture', stopHeldRecording);
recordButton?.addEventListener('click', event => {
  if (event.detail === 0) toggleRecording();
});
async function applyZoomToTrack() {
  const track = stream?.getVideoTracks?.()[0];
  const capabilities = track?.getCapabilities?.();
  if (!capabilities || !('zoom' in capabilities)) return false;
  const min = capabilities.zoom.min ?? 1;
  const max = capabilities.zoom.max ?? min;
  const value = min + ((cameraZoom - 1) / 2) * (max - min);
  try {
    await track.applyConstraints({ advanced: [{ zoom: Math.min(max, Math.max(min, value)) }] });
    return true;
  } catch (error) {
    return false; // Só usa zoom digital quando o aparelho não oferece zoom óptico/nativo.
  }
}
async function setCameraZoom(value) {
  cameraZoom = Math.max(1, Math.min(3, Number(value) || 1));
  if (zoomControl) zoomControl.value = String(cameraZoom);
  if (zoomValue) zoomValue.textContent = cameraZoom.toFixed(1).replace('.0','') + '×';
  hardwareZoomActive = await applyZoomToTrack();
  if (live) live.style.transform = hardwareZoomActive ? 'none' : 'scale(' + cameraZoom + ')';
}
zoomControl?.addEventListener('input', () => setCameraZoom(zoomControl.value));
window.addEventListener('capital:volume-key', event => {
  if (!modal?.classList.contains('is-open') || selectedFile) return;
  const step = event.detail?.direction === 'in' ? 0.1 : -0.1;
  setCameraZoom(cameraZoom + step);
});
saveButton?.addEventListener('click', saveToGallery);
flipButton?.addEventListener('click', async () => {
  facingMode = facingMode === 'environment' ? 'user' : 'environment';
  const ok = await startCamera();
  if (ok) say(facingMode === 'user' ? 'Câmera frontal ativada.' : 'Câmera traseira ativada.');
});
document.querySelectorAll('[data-story-caption]').forEach(button => {
  button.addEventListener('click', () => {
    const caption = el('home-story-caption');
    if (!caption) return;
    caption.value = button.dataset.storyCaption || '';
    caption.focus();
    caption.dispatchEvent(new Event('input', { bubbles: true }));
    say('Sugestão adicionada. Edite a legenda como quiser antes de publicar.');
  });
});
effectButtons.forEach(button => button.addEventListener('click', () => {
  activeEffect = button.dataset.storyEffect;
  applyEffect();
  say('Efeito ' + effects[activeEffect].label + ' selecionado.');
}));
publish?.addEventListener('click', publishStory);
el('home-story-feed-publish')?.addEventListener('click', publishToFeed);
modal?.addEventListener('click', event => { if (event.target === modal) closeComposer(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && modal?.classList.contains('is-open')) closeComposer();
});
window.addEventListener('pagehide', () => {
  window.CapitalVolumeBridge?.setStoryCameraOpen?.(false);
  stopCamera();
});
