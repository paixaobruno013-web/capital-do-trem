import { getCurrentSession, isCurrentUserArtistOrAdmin, bootstrapFirstAdmin, uploadMySong, watchAuthChanges } from './supabase/auth.js';

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

  let accessCheckInProgress = false;
  async function prepareUpload() {
    // Evita verificações concorrentes no carregamento inicial e após SIGNED_IN.
    if (accessCheckInProgress) return;
    accessCheckInProgress = true;
    retry.hidden = true;
    form.hidden = true;
    access.hidden = false;
    access.textContent = 'Conferindo sua conta e suas permissões…';
    try {
      const session = await withAccessTimeout(getCurrentSession(), 'A verificação da conta demorou mais que o esperado. Confira sua conexão e atualize a página.');
      if (!session?.user) {
        access.textContent = 'Entre na sua conta de MC/DJ para enviar músicas. Depois, toque em “Verificar acesso novamente”.';
        retry.hidden = false;
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
    } finally {
      accessCheckInProgress = false;
    }
  }

  retry.addEventListener('click', prepareUpload);
  // Revalida automaticamente quando o usuário conclui o login em outra área do app.
  const stopWatchingAuth = watchAuthChanges(({ event }) => {
    if (event === 'SIGNED_IN') prepareUpload();
    if (event === 'SIGNED_OUT') {
      form.hidden = true;
      access.hidden = false;
      access.textContent = 'Entre na sua conta de MC/DJ para enviar músicas.';
      retry.hidden = false;
    }
  });
  window.addEventListener('pagehide', stopWatchingAuth, { once: true });

  // Guarda o áudio escolhido no IndexedDB local. Se o Android encerrar o WebView
  // ao alternar para o seletor/retornar, a tela pode reconstruir o File sem reenviar
  // o usuário à galeria. O arquivo nunca sai do aparelho por esta cópia temporária.
  const AUDIO_DRAFT_DB = 'capital-do-trem-music-upload';
  const AUDIO_DRAFT_STORE = 'pending-audio';
  const openAudioDraftDb = () => new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('Armazenamento temporário indisponível.'));
    const request = indexedDB.open(AUDIO_DRAFT_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(AUDIO_DRAFT_STORE)) request.result.createObjectStore(AUDIO_DRAFT_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Não foi possível preparar o áudio temporário.'));
  });
  const saveAudioDraft = async file => {
    const db = await openAudioDraftDb();
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(AUDIO_DRAFT_STORE, 'readwrite');
        tx.objectStore(AUDIO_DRAFT_STORE).put({
          blob: file, name: file.name || 'audio', type: file.type || 'application/octet-stream',
          lastModified: file.lastModified || Date.now(), savedAt: Date.now()
        }, 'selected');
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error || new Error('Não foi possível guardar o áudio temporariamente.'));
        tx.onabort = () => reject(tx.error || new Error('O armazenamento temporário foi interrompido.'));
      });
    } finally { db.close(); }
  };
  const readAudioDraft = async () => {
    const db = await openAudioDraftDb();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(AUDIO_DRAFT_STORE, 'readonly');
        const request = tx.objectStore(AUDIO_DRAFT_STORE).get('selected');
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error || new Error('Não foi possível recuperar o áudio.'));
      });
    } finally { db.close(); }
  };
  const clearAudioDraft = async () => {
    try {
      const db = await openAudioDraftDb();
      try {
        await new Promise((resolve, reject) => {
          const tx = db.transaction(AUDIO_DRAFT_STORE, 'readwrite');
          tx.objectStore(AUDIO_DRAFT_STORE).delete('selected');
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
      } finally { db.close(); }
    } catch (error) { console.warn('Não foi possível limpar o áudio temporário.', error); }
  };
  const restoreAudioDraft = async () => {
    try {
      if (fileInput.files?.length) return;
      const draft = await readAudioDraft();
      if (!draft?.blob || Date.now() - Number(draft.savedAt || 0) > 24 * 60 * 60 * 1000) {
        if (draft) await clearAudioDraft();
        return;
      }
      if (typeof DataTransfer !== 'function' || typeof File !== 'function') {
        status.textContent = 'O áudio ficou salvo temporariamente, mas este navegador precisa que você escolha o arquivo novamente.';
        return;
      }
      const restored = new File([draft.blob], draft.name, { type: draft.type, lastModified: draft.lastModified });
      const transfer = new DataTransfer();
      transfer.items.add(restored);
      fileInput.files = transfer.files;
      status.textContent = 'Áudio recuperado após o retorno do Android: ' + restored.name + ' • ' + (restored.size / 1024 / 1024).toFixed(2) + ' MB';
    } catch (error) {
      console.warn('Não foi possível recuperar o áudio selecionado.', error);
    }
  };
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    status.textContent = file ? 'Preparando cópia segura do áudio…' : '';
    if (!file) { await clearAudioDraft(); return; }
    if (file.size > 50 * 1024 * 1024) {
      status.textContent = file.name + ' • arquivo acima do limite de 50 MB.';
      return;
    }
    try {
      await saveAudioDraft(file);
      status.textContent = file.name + ' • ' + (file.size / 1024 / 1024).toFixed(2) + ' MB • seleção protegida contra reinício da tela.';
    } catch (error) {
      status.textContent = file.name + ' • não foi possível guardar uma cópia temporária; mantenha esta tela aberta.';
      console.warn('Falha ao preservar áudio selecionado.', error);
    }
  });
  restoreAudioDraft();

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const file = fileInput.files?.[0];
    if (titleInput && !titleInput.value.trim()) { status.textContent = 'Informe o título da música antes de enviar.'; titleInput.focus(); return; }
    if (titleInput && titleInput.value.trim().length > 120) { status.textContent = `O título da música deve ter no máximo 120 caracteres. Você digitou ${titleInput.value.trim().length}.`; titleInput.focus(); return; }
    if (!file) {
      status.textContent = 'Escolha um arquivo de áudio primeiro.';
      return;
    }
    if (submit.disabled) return;
    submit.disabled = true;
    form.setAttribute('aria-busy','true');
    submit.dataset.originalLabel = submit.textContent; submit.textContent = 'Enviando…'; submit.setAttribute('aria-busy','true');
    status.textContent = 'Enviando sua música…';
    try {
      const song = await uploadMySong({
        file,
        title: $('music-upload-title').value,
        artistName: $('music-upload-artist').value,
        producerName: $('music-upload-producer').value,
        description: $('music-upload-description').value,
        onProgress: percent => {
          status.textContent = percent >= 100
            ? 'Arquivo enviado. Finalizando o cadastro da música…'
            : 'Enviando áudio sem sair desta tela… ' + percent + '%';
        }
      });
      fileInput.value='';titleInput.value='';$('music-upload-artist').value='';$('music-upload-producer').value='';$('music-upload-description').value='';updateTitleCounter();
      status.textContent = song.status === 'published'
        ? 'Música publicada no catálogo!'
        : 'Música enviada! Ela ficará aguardando aprovação do administrador antes de aparecer no catálogo.';
      window.dispatchEvent(new CustomEvent('capital-do-trem:song-published', { detail: song }));
    } catch (error) {
      status.textContent = error?.message || 'Não foi possível enviar a música. Confira o arquivo e tente novamente.';
    } finally {
      submit.disabled = false;submit.textContent = submit.dataset.originalLabel || 'Enviar música para o catálogo';submit.removeAttribute('aria-busy');form.removeAttribute('aria-busy');
    }
  });

  prepareUpload();
}
