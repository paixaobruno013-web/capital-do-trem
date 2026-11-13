import {
  initSupabase,
  getCurrentSession,
  watchAuthChanges,
  submitMyPost,
  uploadMyPostMedia
} from './supabase/auth.js';

const form = document.getElementById('social-post-form');
const login = document.getElementById('social-post-login');
const contentField = document.getElementById('social-post-content');
const filesField = document.getElementById('social-post-files');
const submitButton = document.getElementById('social-post-submit');
const status = document.getElementById('social-post-status');

if (form && login && contentField && filesField && submitButton && status) {
  initSupabase();

  let pendingPostId = null;
  let pendingFiles = [];
  let uploadedCount = 0;
  let pendingContent = '';

  const showSession = session => {
    const signedIn = !!session?.user;
    if (!pendingPostId) {
      form.hidden = !signedIn;
      login.hidden = signedIn;
    }
  };

  try {
    showSession(await getCurrentSession());
  } catch {
    showSession(null);
    status.textContent = 'Não foi possível verificar sua conta agora. Atualize a página e tente novamente.';
  }

  watchAuthChanges(({ session }) => showSession(session));

  form.addEventListener('submit', async event => {
    event.preventDefault();

    if (pendingPostId) {
      status.textContent = 'Retomando o envio que ficou incompleto…';
    } else {
      pendingContent = contentField.value.trim();
      pendingFiles = Array.from(filesField.files || []);
      uploadedCount = 0;

      if (!pendingContent && !pendingFiles.length) {
        status.textContent = 'Escreva uma legenda ou escolha pelo menos uma foto/vídeo.';
        contentField.focus();
        return;
      }
      if (pendingContent.length > 1500) {
        status.textContent = 'A legenda deve ter no máximo 1.500 caracteres.';
        return;
      }
      if (pendingFiles.length > 10) {
        status.textContent = 'Escolha no máximo 10 fotos ou vídeos por publicação.';
        return;
      }

      const allowed = new Set([
        'image/jpeg', 'image/png', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime'
      ]);
      let totalBytes = 0;
      for (const file of pendingFiles) {
        if (!allowed.has(file.type)) {
          status.textContent = 'Formato não aceito: use JPG, PNG, WebP, MP4, WebM ou MOV.';
          return;
        }
        const isImage = file.type.startsWith('image/');
        const maxBytes = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
        if (!file.size || file.size > maxBytes) {
          status.textContent = isImage
            ? 'Cada foto deve ter até 10 MB.'
            : 'Cada vídeo deve ter até 50 MB.';
          return;
        }
        totalBytes += file.size;
      }
      if (totalBytes > 100 * 1024 * 1024) {
        status.textContent = 'O conjunto de arquivos deve ter até 100 MB por publicação.';
        return;
      }
    }

    submitButton.disabled = true;
    submitButton.textContent = pendingPostId ? 'Retomando…' : 'Publicando…';
    status.textContent = 'Enviando sua publicação. Mantenha esta tela aberta até terminar.';

    try {
      if (!pendingPostId) {
        const post = await submitMyPost(pendingContent, { allowEmpty: pendingFiles.length > 0 });
        pendingPostId = post.id;
        contentField.disabled = true;
        filesField.disabled = true;
      }

      for (; uploadedCount < pendingFiles.length; uploadedCount += 1) {
        status.textContent = 'Enviando mídia ' + (uploadedCount + 1) + ' de ' + pendingFiles.length + '…';
        await uploadMyPostMedia(pendingFiles[uploadedCount], pendingPostId, uploadedCount, '');
      }

      status.textContent = 'Publicação concluída! Atualizando o mural…';
      form.reset();
      window.location.reload();
    } catch (error) {
      status.textContent = error?.message
        ? 'Não foi possível concluir o envio: ' + error.message + (pendingPostId ? ' Toque em “Continuar envio” para tentar novamente sem duplicar a publicação.' : '')
        : 'Não foi possível concluir o envio. Verifique sua conexão e tente novamente.';
      if (pendingPostId) submitButton.textContent = 'Continuar envio';
    } finally {
      submitButton.disabled = false;
      if (!pendingPostId) submitButton.textContent = 'Publicar no Capital do Trem';
    }
  });
}
