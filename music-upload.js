import { getCurrentSession, isCurrentUserArtistOrAdmin, bootstrapFirstAdmin, uploadMySong } from './supabase/auth.js';

const $ = id => document.getElementById(id);
const form = $('music-upload-form');
const access = $('music-upload-access');
const status = $('music-upload-status');
const fileInput = $('music-upload-file');
const submit = $('music-upload-submit');
const titleInput = $('music-upload-title');
let titleCounter = $('music-upload-title-counter');
if (titleInput && !titleCounter) { titleCounter = document.createElement('small'); titleCounter.className='muted music-title-counter'; titleCounter.id='music-upload-title-counter'; titleInput.insertAdjacentElement('afterend',titleCounter); }
const updateTitleCounter = () => { if(titleCounter && titleInput) titleCounter.textContent = `${String(titleInput.value ?? '').length}/120 caracteres`; };
titleInput?.addEventListener('input',updateTitleCounter);updateTitleCounter();

if (form && access && status && fileInput && submit) {
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'btn alt';
  retry.textContent = '↻ Verificar acesso novamente';
  retry.hidden = true;
  access.insertAdjacentElement('afterend', retry);

  const withAccessTimeout = (promise, label) => new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(label)), 15000);
    Promise.resolve(promise).then(
      value => { window.clearTimeout(timer); resolve(value); },
      error => { window.clearTimeout(timer); reject(error); }
    );
  });

  async function prepareUpload() {
    retry.hidden = true;
    form.hidden = true;
    access.hidden = false;
    access.textContent = 'Conferindo sua conta e suas permissões…';
    try {
      const session = await withAccessTimeout(getCurrentSession(), 'A verificação da conta demorou mais que o esperado. Confira sua conexão e atualize a página.');
      if (!session?.user) {
        access.textContent = 'Entre na sua conta de MC/DJ para enviar músicas.';
        return;
      }
      // A conta proprietária confirmada precisa executar o bootstrap do banco
      // antes da checagem de papel. A função SQL valida o e-mail novamente.
      const isOwner = (session.user.email || '').trim().toLowerCase() === 'capitaldotrem07@gmail.com';
      let bootstrapError = null;
      if (isOwner) {
        try {
          await withAccessTimeout(bootstrapFirstAdmin(), 'A ativação administrativa demorou mais que o esperado. Tente novamente.');
        } catch (error) {
          // Se a conta já tiver sido promovida, a checagem abaixo ainda libera
          // o acesso. Caso contrário, mostramos a dependência da migração.
          bootstrapError = error;
        }
      }
      const allowed = await withAccessTimeout(isCurrentUserArtistOrAdmin(), 'A verificação de permissões demorou mais que o esperado. Atualize a página e tente novamente.');
      if (!allowed) {
        access.textContent = isOwner
          ? 'A conta proprietária ainda não recebeu a permissão administrativa. É necessário aplicar a atualização de permissões no Supabase e tocar em “Verificar acesso novamente”.'
          : 'A conta conectada ainda não foi reconhecida como Administrador ou Artista / MC / DJ. O envio permanece protegido; confira o tipo da conta e tente verificar novamente.';
        if (bootstrapError) console.warn('Bootstrap administrativo ainda não confirmado.', bootstrapError);
        retry.hidden = false;
        return;
      }
      access.hidden = true;
      form.hidden = false;
    } catch (error) {
      form.hidden = true;
      access.hidden = false;
      access.textContent = error?.message || 'Não foi possível verificar sua permissão de envio.';
      retry.hidden = false;
    }
  }

  retry.addEventListener('click', prepareUpload);

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
