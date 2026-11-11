import { initSupabase } from './supabase/auth.js';

const grid = document.querySelector('[data-supporter-grid]');
const empty = document.querySelector('[data-supporter-empty]');
const retry = document.querySelector('[data-supporter-retry]');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const describeError = error => [error?.message,error?.code,error?.status].filter(Boolean).join(' • ') || 'Erro desconhecido';

function mediaUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' ? url.href : '';
  } catch { return ''; }
}

async function loadSupporters() {
  if (!grid) return;
  if (retry) retry.disabled = true;
  if (empty) { empty.hidden = false; empty.textContent = 'Carregando apoiadores…'; }
  grid.replaceChildren();
  try {
    const supabase = initSupabase();
    const { data, error } = await supabase.from('supporter_media')
      .select('id,title,description,media_type,media_url,display_order,created_at')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    if (!data?.length) {
      if (empty) empty.textContent = 'Ainda não há apoiadores publicados. Volte em breve!';
      return;
    }
    grid.innerHTML = data.map(item => {
      const url = escapeHtml(mediaUrl(item.media_url));
      const title = escapeHtml(item.title || 'Apoiador');
      const media = !url
        ? '<div class="media-error">Mídia indisponível.</div>'
        : item.media_type === 'video'
          ? `<video controls playsinline preload="metadata" src="${url}" aria-label="${title}"></video>`
          : `<img src="${url}" alt="${title}" loading="lazy">`;
      return `<article class="card">${media}<div class="copy"><h2>${title}</h2>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}<span class="tag">Apoiador do Capital do Trem</span></div></article>`;
    }).join('');
    if (empty) empty.hidden = true;
    grid.querySelectorAll('img,video').forEach(media => media.addEventListener('error', () => {
      media.replaceWith(Object.assign(document.createElement('p'), { className: 'media-error', textContent: 'Não foi possível abrir esta mídia. Tente novamente mais tarde.' }));
    }, { once: true }));
  } catch (error) {
    console.error('Falha ao carregar apoiadores:', error);
    if (empty) empty.textContent = 'Não foi possível carregar os apoiadores: ' + describeError(error);
  } finally {
    if (retry) retry.disabled = false;
  }
}
retry?.addEventListener('click', loadSupporters);
loadSupporters();
