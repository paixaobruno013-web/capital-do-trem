import { initSupabase, isCurrentUserAdmin } from './supabase/auth.js';

const $ = id => document.getElementById(id);
const status = message => { $('supporter-status').textContent = message; };
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let supabase;
let currentUser;

async function requireAdmin() {
  supabase = initSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user || !(await isCurrentUserAdmin())) {
    $('supporter-admin').hidden = true;
    $('supporter-denied').hidden = false;
    return false;
  }
  currentUser = user;
  $('supporter-admin').hidden = false;
  $('supporter-denied').hidden = true;
  return true;
}

async function loadItems() {
  const { data, error } = await supabase.from('supporter_media')
    .select('id,title,description,media_type,media_url,storage_path,is_active,display_order,created_at')
    .order('display_order', { ascending: true }).order('created_at', { ascending: false });
  if (error) throw error;
  $('supporter-list').innerHTML = (data || []).map(item => `
    <article class="item">
      <div class="media">${item.media_type === 'video'
        ? `<video controls playsinline preload="metadata" src="${escapeHtml(item.media_url)}"></video>`
        : `<img src="${escapeHtml(item.media_url)}" alt="">`}</div>
      <div class="meta"><strong>${escapeHtml(item.title || 'Apoiador')}</strong><p>${escapeHtml(item.description)}</p><small>${item.is_active ? 'Visível para todos' : 'Oculto do público'} • posição ${Number(item.display_order)||0}</small></div>
      <div class="actions"><button type="button" data-toggle="${item.id}" data-active="${item.is_active}">${item.is_active ? 'Ocultar' : 'Mostrar'}</button><button class="secondary" type="button" data-delete="${item.id}" data-path="${escapeHtml(item.storage_path)}">Excluir</button></div>
    </article>`).join('') || '<p class="muted">Ainda não há imagens ou vídeos publicados.</p>';
  $('supporter-list').querySelectorAll('[data-toggle]').forEach(button => button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const { error } = await supabase.from('supporter_media').update({ is_active: button.dataset.active !== 'true' }).eq('id', button.dataset.toggle);
      if (error) throw error;
      await loadItems();
      status('Visibilidade atualizada.');
    } catch (e) { status('Não foi possível alterar: ' + e.message); button.disabled = false; }
  }));
  $('supporter-list').querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', async () => {
    if (!confirm('Excluir este conteúdo da área de Apoiadores?')) return;
    button.disabled = true;
    try {
      const id = button.dataset.delete;
      const path = button.dataset.path;
      const { error } = await supabase.from('supporter_media').delete().eq('id', id);
      if (error) throw error;
      if (path) {
        const { error: storageError } = await supabase.storage.from('capital-do-trem-media').remove([path]);
        if (storageError) console.warn('Registro removido; arquivo antigo não foi apagado:', storageError);
      }
      await loadItems();
      status('Conteúdo excluído.');
    } catch (e) { status('Não foi possível excluir: ' + e.message); button.disabled = false; }
  }));
}

$('supporter-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('supporter-publish');
  const file = $('supporter-file').files?.[0];
  if (!file) { status('Escolha uma imagem ou vídeo.'); return; }
  const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : '';
  if (!type || !['image/jpeg','image/png','image/webp','video/mp4','video/webm'].includes(file.type)) {
    status('Formato não permitido. Use JPG, PNG, WebP, MP4 ou WebM.'); return;
  }
  if (file.size < 1 || file.size > 20 * 1024 * 1024) { status('O arquivo precisa ter até 20 MB.'); return; }
  button.disabled = true;
  status('Enviando e publicando…');
  let path = '';
  try {
    const ext = file.name.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g,'') || (type === 'image' ? 'jpg' : 'mp4');
    path = currentUser.id + '/supporters/' + crypto.randomUUID() + '.' + ext;
    const { error: uploadError } = await supabase.storage.from('capital-do-trem-media').upload(path, file, {
      contentType: file.type, cacheControl: '3600', upsert: false
    });
    if (uploadError) throw uploadError;
    const { data: publicData } = supabase.storage.from('capital-do-trem-media').getPublicUrl(path);
    if (!publicData?.publicUrl) throw new Error('Não foi possível gerar o endereço público.');
    const { error: insertError } = await supabase.from('supporter_media').insert({
      title: $('supporter-title').value.trim(),
      description: $('supporter-description').value.trim(),
      media_type: type, media_url: publicData.publicUrl, storage_path: path,
      display_order: Number($('supporter-order').value) || 0, is_active: true, created_by: currentUser.id
    });
    if (insertError) throw insertError;
    $('supporter-form').reset();
    status('Publicado! Agora todos conseguem ver na Área de Apoiadores.');
    await loadItems();
  } catch (error) {
    if (path) await supabase.storage.from('capital-do-trem-media').remove([path]).catch(() => {});
    status('Falha ao publicar: ' + (error.message || 'erro desconhecido'));
  } finally { button.disabled = false; }
});

(async () => {
  try {
    if (await requireAdmin()) {
      await loadItems();
      status('Painel pronto. O que você publicar ficará visível para todos.');
    }
  } catch (error) {
    $('supporter-denied').hidden = false;
    status('Não foi possível validar o acesso: ' + error.message);
  }
})();
