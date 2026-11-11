import { initSupabase } from './supabase/auth.js';

const grid = document.querySelector('[data-supporter-grid]');
const empty = document.querySelector('[data-supporter-empty]');
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

async function loadSupporters() {
  if (!grid) return;
  try {
    const supabase = initSupabase();
    const { data, error } = await supabase.from('supporter_media')
      .select('id,title,description,media_type,media_url,display_order,created_at')
      .eq('is_active', true).order('display_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (!data?.length) {
      if (empty) empty.hidden = false;
      return;
    }
    grid.innerHTML = data.map(item => {
      const media = item.media_type === 'video'
        ? `<video controls playsinline preload="metadata" src="${escapeHtml(item.media_url)}" aria-label="${escapeHtml(item.title || 'Vídeo de apoiador')}"></video>`
        : `<img src="${escapeHtml(item.media_url)}" alt="${escapeHtml(item.title || 'Imagem de apoiador')}" loading="lazy">`;
      return `<article class="card">${media}<div class="copy"><h2>${escapeHtml(item.title || 'Apoiador')}</h2>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}<span class="tag">Apoiador do Capital do Trem</span></div></article>`;
    }).join('');
    if (empty) empty.hidden = true;
  } catch (error) {
    console.error('Falha ao carregar apoiadores:', error);
    if (empty) { empty.hidden = false; empty.textContent = 'Não foi possível carregar os apoiadores agora. Tente novamente mais tarde.'; }
  }
}
loadSupporters();
