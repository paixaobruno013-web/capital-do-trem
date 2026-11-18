import { getPublicBranding, isCurrentUserAdmin, saveAdminMusicCover, saveAdminMusicCoverSettings } from './supabase/auth.js';

const $ = id => document.getElementById(id);
const area = $('music-cover-area');
const preview = $('music-cover-preview');
const empty = $('music-cover-empty');
const controls = $('music-cover-controls');
const fileInput = $('music-cover-file');
const xInput = $('music-cover-x');
const yInput = $('music-cover-y');
const fitInput = $('music-cover-fit');
const uploadButton = $('music-cover-upload');
const saveButton = $('music-cover-save');
const status = $('music-cover-status');

if (area && preview && empty && controls && fileInput && xInput && yInput && fitInput && uploadButton && saveButton && status) {
  let currentCoverUrl = '';
  let temporaryPreviewUrl = '';

  function applyPreviewSettings() {
    preview.style.objectPosition = `${xInput.value}% ${yInput.value}%`;
    preview.style.objectFit = fitInput.value === 'contain' ? 'contain' : 'cover';
  }

  function showCover(url) {
    currentCoverUrl = url || '';
    if (currentCoverUrl) {
      preview.src = currentCoverUrl;
      preview.hidden = false;
      empty.hidden = true;
    } else {
      preview.removeAttribute('src');
      preview.hidden = true;
      empty.hidden = false;
    }
    applyPreviewSettings();
  }

  function readControls() {
    return { x: Number(xInput.value), y: Number(yInput.value), fit: fitInput.value };
  }

  [xInput, yInput, fitInput].forEach(control => control.addEventListener('input', applyPreviewSettings));

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (temporaryPreviewUrl) URL.revokeObjectURL(temporaryPreviewUrl);
    temporaryPreviewUrl = '';
    if (!file) {
      showCover(currentCoverUrl);
      status.textContent = '';
      return;
    }
    temporaryPreviewUrl = URL.createObjectURL(file);
    showCover(temporaryPreviewUrl);
    status.textContent = `${file.name} • ${(file.size / 1024 / 1024).toFixed(2)} MB. Confira o enquadramento antes de enviar.`;
  });

  uploadButton.addEventListener('click', async () => {
    const file = fileInput.files?.[0];
    if (!file) {
      status.textContent = 'Escolha uma imagem antes de enviar.';
      return;
    }
    uploadButton.disabled = true;
    saveButton.disabled = true;
    status.textContent = 'Enviando e salvando sua capa…';
    try {
      const url = await saveAdminMusicCover(file, readControls());
      showCover(url);
      fileInput.value = '';
      if (temporaryPreviewUrl) URL.revokeObjectURL(temporaryPreviewUrl);
      temporaryPreviewUrl = '';
      status.textContent = 'Capa publicada na área Músicas!';
    } catch (error) {
      status.textContent = error?.message || 'Não foi possível publicar a capa. Tente novamente.';
    } finally {
      uploadButton.disabled = false;
      saveButton.disabled = false;
    }
  });

  saveButton.addEventListener('click', async () => {
    if (!currentCoverUrl) {
      status.textContent = 'Envie uma capa antes de salvar o enquadramento.';
      return;
    }
    saveButton.disabled = true;
    status.textContent = 'Salvando os ajustes…';
    try {
      await saveAdminMusicCoverSettings(readControls());
      status.textContent = 'Enquadramento salvo para todos os usuários.';
    } catch (error) {
      status.textContent = error?.message || 'Não foi possível salvar os ajustes.';
    } finally {
      saveButton.disabled = false;
    }
  });

  async function initialize() {
    try {
      const [branding, admin] = await Promise.all([getPublicBranding(), isCurrentUserAdmin()]);
      xInput.value = String(branding.musicCoverX ?? 50);
      yInput.value = String(branding.musicCoverY ?? 50);
      fitInput.value = branding.musicCoverFit === 'contain' ? 'contain' : 'cover';
      showCover(branding.musicCoverUrl);
      controls.hidden = !admin;
      area.hidden = !admin && !branding.musicCoverUrl;
    } catch (error) {
      area.hidden = true;
      console.warn('Não foi possível carregar a capa da área Músicas.', error);
    }
  }

  initialize();
}
