import { initSupabase, isCurrentUserAdmin } from './supabase/auth.js';

const $ = id => document.getElementById(id);
const status = message => {
  for (const id of ['supporter-status','supporter-denied-status']) {
    const node = $(id);
    if (node) node.textContent = message;
  }
};
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const describeError = error => [error?.message,error?.code,error?.status,error?.details,error?.hint].filter(Boolean).join(' • ') || 'Erro desconhecido';
const makeId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2,'0')).join('');
};
let supabase;
let currentUser;
let previewUrl = '';

function showAdmin(allowed) {
  $('supporter-admin').hidden = !allowed;
  $('supporter-denied').hidden = allowed;
}

async function requireAdmin() {
  supabase = initSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) {
    showAdmin(false);
    status('Entre primeiro com a conta administradora e abra esta área novamente.');
    return false;
  }
  const allowed = await isCurrentUserAdmin();
  if (!allowed) {
    showAdmin(false);
    status('Esta conta não possui permissão de administrador.');
    return false;
  }
  currentUser = user;
  showAdmin(true);
  return true;
}

function mediaMarkup(item) {
  const url = String(item.media_url || '');
  let safeUrl = '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') safeUrl = escapeHtml(parsed.href);
  } catch {}
  const title = escapeHtml(item.title || 'Apoiador');
  if (!safeUrl) return '<div class="media-error">Arquivo sem endereço HTTPS válido.</div>';
  return item.media_type === 'video'
    ? `<video controls playsinline preload="metadata" src="${safeUrl}" aria-label="${title}"></video>`
    : `<img src="${safeUrl}" alt="${title}" loading="lazy">`;
}

async function loadItems() {
  const list = $('supporter-list');
  if (!list) return;
  list.innerHTML = '<p class="muted">Carregando conteúdos…</p>';
  const { data, error } = await supabase.from('supporter_media')
    .select('id,title,description,media_type,media_url,storage_path,is_active,display_order,created_at')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  list.innerHTML = (data || []).map(item => `
    <article class="item">
      <div class="media">${mediaMarkup(item)}</div>
      <div class="meta"><strong>${escapeHtml(item.title || 'Apoiador')}</strong><p>${escapeHtml(item.description)}</p><small>${item.is_active ? 'Visível para todos' : 'Oculto do público'} • posição ${Number(item.display_order)||0}</small></div>
      <div class="actions"><button type="button" data-toggle="${escapeHtml(item.id)}" data-active="${String(item.is_active)}">${item.is_active ? 'Ocultar' : 'Mostrar'}</button><button class="secondary" type="button" data-delete="${escapeHtml(item.id)}" data-path="${escapeHtml(item.storage_path)}">Excluir</button></div>
    </article>`).join('') || '<p class="muted">Ainda não há imagens ou vídeos publicados. Escolha um arquivo acima e toque em PUBLICAR PARA TODOS.</p>';

  list.querySelectorAll('[data-toggle]').forEach(button => button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const { data, error } = await supabase.from('supporter_media')
        .update({ is_active: button.dataset.active !== 'true' })
        .eq('id', button.dataset.toggle).select('id').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Nenhum registro foi atualizado. Confira a permissão de administrador.');
      await loadItems();
      status('Visibilidade atualizada.');
    } catch (error) {
      status('Não foi possível alterar a visibilidade: ' + describeError(error));
      button.disabled = false;
    }
  }));

  list.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', async () => {
    if (!confirm('Excluir este conteúdo da área de Apoiadores?')) return;
    button.disabled = true;
    try {
      const id = button.dataset.delete;
      const path = button.dataset.path;
      const { data, error } = await supabase.from('supporter_media').delete().eq('id', id).select('id').maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('O banco não confirmou a exclusão. O conteúdo foi mantido.');
      if (path) {
        const { error: storageError } = await supabase.storage.from('capital-do-trem-media').remove([path]);
        if (storageError) status('Registro excluído. O arquivo antigo ficou no armazenamento: ' + describeError(storageError));
      }
      await loadItems();
      status('Conteúdo excluído.');
    } catch (error) {
      status('Não foi possível excluir: ' + describeError(error));
      button.disabled = false;
    }
  }));
}

function clearPreview() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = '';
  const preview = $('supporter-preview');
  if (preview) preview.replaceChildren();
}
$('supporter-file')?.addEventListener('change', () => {
  clearPreview();
  const file = $('supporter-file')?.files?.[0];
  if (!file) return;
  previewUrl = URL.createObjectURL(file);
  const preview = $('supporter-preview');
  if (!preview) return;
  const node = document.createElement(file.type.startsWith('video/') ? 'video' : 'img');
  node.src = previewUrl;
  if (node.tagName === 'VIDEO') { node.controls = true; node.playsInline = true; }
  node.alt = 'Prévia do arquivo escolhido';
  preview.append(node);
});

$('supporter-form')?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!supabase || !currentUser) {
    status('A sessão administrativa não está pronta. Atualize a página e entre novamente.');
    return;
  }
  const button = $('supporter-publish');
  const file = $('supporter-file')?.files?.[0];
  if (!file) { status('Escolha uma imagem ou vídeo antes de publicar.'); return; }
  const allowedTypes = ['image/jpeg','image/png','image/webp','video/mp4','video/webm'];
  const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : '';
  if (!type || !allowedTypes.includes(file.type)) {
    status('Formato não permitido. Use JPG, PNG, WebP, MP4 ou WebM. Fotos HEIC precisam ser convertidas para JPG.');
    return;
  }
  if (file.size < 1 || file.size > 20 * 1024 * 1024) {
    status('O arquivo precisa ter até 20 MB, limite atual do armazenamento.');
    return;
  }
  button.disabled = true;
  let path = '';
  let uploaded = false;
  status('Etapa 1/2: enviando o arquivo com segurança…');
  try {
    const ext = ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'})[file.type];
    path = currentUser.id + '/supporters/' + makeId() + '.' + ext;
    const { error: uploadError } = await supabase.storage.from('capital-do-trem-media').upload(path, file, {
      contentType: file.type, cacheControl: '3600', upsert: false
    });
    if (uploadError) throw new Error('Falha no envio do arquivo: ' + describeError(uploadError));
    uploaded = true;
    const { data: publicData } = supabase.storage.from('capital-do-trem-media').getPublicUrl(path);
    if (!publicData?.publicUrl) throw new Error('O arquivo subiu, mas o endereço público não foi gerado.');
    status('Etapa 2/2: registrando a publicação…');
    const { data: inserted, error: insertError } = await supabase.from('supporter_media').insert({
      title: $('supporter-title').value.trim(),
      description: $('supporter-description').value.trim(),
      media_type: type, media_url: publicData.publicUrl, storage_path: path,
      display_order: Number($('supporter-order').value) || 0,
      is_active: true, created_by: currentUser.id
    }).select('id').single();
    if (insertError) throw new Error('Arquivo enviado, mas o cadastro da publicação falhou: ' + describeError(insertError));
    if (!inserted?.id) throw new Error('O banco não confirmou a publicação.');
    $('supporter-form').reset();
    clearPreview();
    await loadItems();
    status('Publicado e confirmado! O conteúdo já está disponível na Área de Apoiadores.');
  } catch (error) {
    if (uploaded && path) {
      const { error: cleanupError } = await supabase.storage.from('capital-do-trem-media').remove([path]);
      if (cleanupError) status('Falha na publicação: ' + describeError(error) + ' • O arquivo temporário não pôde ser removido: ' + describeError(cleanupError));
      else status('Falha na publicação: ' + describeError(error));
    } else {
      status('Falha na publicação: ' + describeError(error));
    }
  } finally {
    button.disabled = false;
  }
});

$('supporter-refresh')?.addEventListener('click', async () => {
  const button = $('supporter-refresh');
  button.disabled = true;
  try { await loadItems(); status('Lista atualizada.'); }
  catch (error) { status('Não foi possível atualizar a lista: ' + describeError(error)); }
  finally { button.disabled = false; }
});

(async () => {
  try {
    if (await requireAdmin()) {
      await loadItems();
      status('Painel pronto. Arquivos de até 20 MB; publicar deixa o conteúdo visível para todos.');
    }
  } catch (error) {
    showAdmin(false);
    status('Não foi possível abrir a área de apoiadores: ' + describeError(error));
  }
})();
