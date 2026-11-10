import { initSupabase } from './supabase/auth.js';

const BUCKET = 'capital-do-trem-private-gallery';
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_VIDEO = 20 * 1024 * 1024;

function addParticipantPanel() {
  const profile = document.getElementById('profile-panel');
  if (!profile || profile.hidden || document.getElementById('participant-private-gallery')) return;
  const section = document.createElement('section');
  section.id = 'participant-private-gallery';
  section.className = 'card';
  section.innerHTML = `
    <h3>🔒 Enviar para a Galeria Privada</h3>
    <p class="muted">Você escolhe exatamente qual foto ou vídeo deseja compartilhar com o administrador do Capital do Trem. O arquivo não será publicado no perfil nem nas conversas. Ele ficará na galeria central, acessível somente ao administrador, por até 48 horas e será apagado automaticamente.</p>
    <form id="private-gallery-send-form">
      <label for="private-gallery-file">Escolher uma foto ou vídeo</label>
      <input id="private-gallery-file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" required>
      <label style="display:flex;gap:9px;align-items:flex-start;font-weight:600">
        <input id="private-gallery-consent" type="checkbox" required style="width:auto;margin-top:5px">
        <span>Confirmo que quero enviar este arquivo para visualização exclusiva do administrador por até 48 horas.</span>
      </label>
      <button id="private-gallery-send" type="submit">Enviar para a galeria privada</button>
      <p id="private-gallery-send-status" class="status" role="status" aria-live="polite">Somente o arquivo selecionado será enviado. A permissão não libera o restante da galeria do seu celular.</p>
    </form>`;
  profile.append(section);

  const form = section.querySelector('#private-gallery-send-form');
  const fileInput = section.querySelector('#private-gallery-file');
  const consent = section.querySelector('#private-gallery-consent');
  const button = section.querySelector('#private-gallery-send');
  const status = section.querySelector('#private-gallery-send-status');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = fileInput.files?.[0];
    if (!file) { status.textContent = 'Escolha uma foto ou vídeo primeiro.'; return; }
    const mime = String(file.type || '').toLowerCase();
    const isImage = ['image/jpeg','image/png','image/webp'].includes(mime);
    const isVideo = ['video/mp4','video/webm'].includes(mime);
    if (!isImage && !isVideo) { status.textContent = 'Formato não permitido. Use JPG, PNG, WebP, MP4 ou WebM.'; return; }
    if (file.size < 1 || file.size > (isImage ? MAX_IMAGE : MAX_VIDEO)) {
      status.textContent = isImage ? 'A foto deve ter até 8 MB.' : 'O vídeo deve ter até 20 MB.';
      return;
    }
    if (!consent.checked) { status.textContent = 'Marque a confirmação para autorizar este envio.'; return; }

    button.disabled = true;
    status.textContent = 'Enviando com segurança…';
    let path = '';
    try {
      const supabase = initSupabase();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Entre na sua conta para enviar.');
      const ext = ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'})[mime];
      path = user.id + '/' + crypto.randomUUID() + '.' + ext;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: mime, cacheControl: '0', upsert: false
      });
      if (uploadError) throw uploadError;
      const { data, error } = await supabase.from('private_gallery_items').insert({
        user_id: user.id, storage_path: path, mime_type: mime, file_size: file.size, consent_confirmed: true
      }).select('expires_at').single();
      if (error) {
        await supabase.storage.from(BUCKET).remove([path]);
        path = '';
        throw error;
      }
      const expires = new Date(data.expires_at).toLocaleString('pt-BR');
      status.textContent = 'Arquivo enviado. Ele ficará disponível ao administrador até ' + expires + ' e será apagado automaticamente.';
      form.reset();
    } catch (error) {
      if (path) { try { await initSupabase().storage.from(BUCKET).remove([path]); } catch {} }
      status.textContent = error?.message || 'Não foi possível enviar. Tente novamente.';
    } finally {
      button.disabled = false;
    }
  });
}

function watchProfile() {
  const profile = document.getElementById('profile-panel');
  if (!profile) return;
  if (!profile.hidden) addParticipantPanel();
  new MutationObserver(() => { if (!profile.hidden) addParticipantPanel(); }).observe(profile, { attributes: true, attributeFilter: ['hidden'] });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchProfile, { once: true });
else watchProfile();
