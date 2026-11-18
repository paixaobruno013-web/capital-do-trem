import { getCurrentSession, isCurrentUserArtistOrAdmin, uploadMySong } from './supabase/auth.js';

const $ = id => document.getElementById(id);
const form = $('music-upload-form');
const access = $('music-upload-access');
const status = $('music-upload-status');
const fileInput = $('music-upload-file');
const submit = $('music-upload-submit');
const titleInput = $('music-upload-title');
let titleCounter = $('music-upload-title-counter');
if (titleInput && !titleCounter) { titleCounter = document.createElement('small'); titleCounter.className='muted music-title-counter'; titleCounter.id='music-upload-title-counter'; titleInput.insertAdjacentElement('afterend',titleCounter); }
const updateTitleCounter = () => { if(titleCounter && titleInput) titleCounter.textContent = `${titleInput.value.length}/120 caracteres`; };
titleInput?.addEventListener('input',updateTitleCounter);updateTitleCounter();

if (form && access && status && fileInput && submit) {
  async function prepareUpload() {
    try {
      const session = await getCurrentSession();
      if (!session?.user) {
        access.textContent = 'Entre na sua conta de MC/DJ para enviar músicas.';
        return;
      }
      const allowed = await isCurrentUserArtistOrAdmin();
      if (!allowed) {
        access.textContent = 'O envio está disponível para contas Artista / MC / DJ. Você pode continuar ouvindo todo o catálogo normalmente.';
        return;
      }
      access.hidden = true;
      form.hidden = false;
    } catch (error) {
      access.textContent = error?.message || 'Não foi possível verificar sua permissão de envio.';
    }
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    status.textContent = file ? file.name + ' • ' + (file.size / 1024 / 1024).toFixed(2) + ' MB' : '';
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const file = fileInput.files?.[0];
    if (titleInput && (!titleInput.value.trim() || titleInput.value.trim().length > 120)) { status.textContent = `O nome da música deve ter entre 1 e 120 caracteres. Você digitou ${titleInput.value.trim().length}.`; titleInput.focus(); return; }
    if (!file) {
      status.textContent = 'Escolha um arquivo de áudio primeiro.';
      return;
    }
    if (submit.disabled) return;
    submit.disabled = true;
    submit.dataset.originalLabel = submit.textContent; submit.textContent = 'Enviando…'; submit.setAttribute('aria-busy','true');
    status.textContent = 'Enviando sua música…';
    try {
      const song = await uploadMySong({
        file,
        title: $('music-upload-title').value,
        artistName: $('music-upload-artist').value,
        producerName: $('music-upload-producer').value,
        description: $('music-upload-description').value
      });
      form.reset();updateTitleCounter();
      status.textContent = song.status === 'published'
        ? 'Música publicada no catálogo!'
        : 'Música enviada! Ela ficará aguardando aprovação do administrador antes de aparecer no catálogo.';
      window.dispatchEvent(new CustomEvent('capital-do-trem:song-published', { detail: song }));
    } catch (error) {
      status.textContent = error?.message || 'Não foi possível enviar a música. Confira o arquivo e tente novamente.';
    } finally {
      submit.disabled = false;submit.textContent = submit.dataset.originalLabel || 'Enviar música para o catálogo';submit.removeAttribute('aria-busy');
    }
  });

  prepareUpload();
}
