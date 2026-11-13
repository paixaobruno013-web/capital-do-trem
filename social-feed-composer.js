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

  const showSession = session => {
    const signedIn = !!session?.user;
    form.hidden = !signedIn;
    login.hidden = signedIn;
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
    const text = contentField.value.trim();
    const files = Array.from(filesField.files || []);

    if (!text) {
      status.textContent = 'Escreva uma mensagem antes de publicar.';
      contentField.focus();
      return;
    }
    if (files.length > 10) {
      status.textContent = 'Escolha no máximo 10 fotos ou vídeos por publicação.';
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Publicando…';
    status.textContent = 'Enviando sua publicação. Não feche esta tela.';

    try {
      const post = await submitMyPost(text);
      for (let index = 0; index < files.length; index += 1) {
        status.textContent = 'Publicação criada. Enviando mídia ' + (index + 1) + ' de ' + files.length + '…';
        await uploadMyPostMedia(files[index], post.id, index, files[index].name);
      }
      status.textContent = 'Publicação concluída! Atualizando o mural…';
      form.reset();
      window.location.reload();
    } catch (error) {
      status.textContent = error?.message
        ? 'A publicação pode ter sido criada, mas houve uma falha: ' + error.message
        : 'Não foi possível concluir o envio. Verifique sua conexão e tente novamente.';
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Publicar no Capital do Trem';
    }
  });
}
