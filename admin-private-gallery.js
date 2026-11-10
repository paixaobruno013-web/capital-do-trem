import { initSupabase, isCurrentUserAdmin } from './supabase/auth.js';

const BUCKET = 'capital-do-trem-private-gallery';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function installGallery() {
  const dashboard = document.getElementById('dashboard');
  const nav = dashboard?.querySelector('.command-grid');
  if (!dashboard || !nav || document.getElementById('private-gallery-admin-section')) return;
  const shortcut = element('a', 'command-link');
  shortcut.href = '#private-gallery-admin-section';
  shortcut.innerHTML = '<span class="glyph">🔒</span>Galeria Privada';
  nav.append(shortcut);

  const section = element('section', 'command-section');
  section.id = 'private-gallery-admin-section';
  const heading = element('h2', '', '🔒 Galeria Privada do Administrador');
  const description = element('p', 'muted', 'Todos os arquivos enviados voluntariamente pelos participantes ficam reunidos aqui. Acesso exclusivo à sua conta. Cada arquivo expira 48 horas após o envio.');
  const actions = element('div', 'actions');
  const refresh = element('button', '', 'Atualizar galeria');
  refresh.type = 'button';
  actions.append(refresh);
  const status = element('p', 'status', 'Carregando arquivos…');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const grid = element('div', '');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:12px;margin-top:12px';
  const privacy = element('p', 'muted', 'Não há botão de download. Como em qualquer conteúdo exibido na tela, não é possível impedir totalmente capturas de tela ou gravações externas.');
  section.append(heading, description, actions, status, grid, privacy);
  const anchor = dashboard.querySelector('#header-background-section');
  if (anchor) dashboard.insertBefore(section, anchor);
  else dashboard.append(section);

  async function load() {
    refresh.disabled = true;
    status.textContent = 'Buscando arquivos válidos…';
    grid.replaceChildren();
    try {
      const supabase = initSupabase();
      if (!(await isCurrentUserAdmin())) throw new Error('Acesso restrito ao administrador.');
      const { data: items, error } = await supabase.from('private_gallery_items')
        .select('id,user_id,storage_path,mime_type,file_size,sender_display_name,sender_username,created_at,expires_at')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      if (!items?.length) {
        status.textContent = 'A galeria está vazia. Os arquivos enviados pelos participantes aparecerão aqui.';
        return;
      }
      let shown = 0;
      for (const item of items) {
        const { data: signed, error: signedError } = await supabase.storage.from(BUCKET).createSignedUrl(item.storage_path, 300);
        if (signedError || !signed?.signedUrl) continue;
        const card = element('article', 'item');
        card.style.cssText = 'margin:0;padding:10px;min-width:0';
        let media;
        if (item.mime_type.startsWith('video/')) {
          media = document.createElement('video');
          media.controls = true;
          media.playsInline = true;
          media.preload = 'metadata';
          media.setAttribute('controlsList', 'nodownload noplaybackrate');
          media.disablePictureInPicture = true;
        } else {
          media = document.createElement('img');
          media.alt = 'Imagem enviada para a Galeria Privada';
          media.loading = 'lazy';
          media.draggable = false;
        }
        media.src = signed.signedUrl;
        media.style.cssText = 'display:block;width:100%;height:150px;object-fit:cover;border-radius:9px;background:#080808';
        media.addEventListener('contextmenu', event => event.preventDefault());
        const sender = element('strong', '', item.sender_display_name || 'Participante');
        sender.style.cssText = 'display:block;margin-top:8px;overflow-wrap:anywhere';
        const username = element('p', 'muted', item.sender_username ? '@' + item.sender_username : 'Participante');
        username.style.cssText = 'margin:2px 0;font-size:12px';
        const expiry = element('p', 'muted', 'Apaga: ' + new Date(item.expires_at).toLocaleString('pt-BR'));
        expiry.style.cssText = 'margin:2px 0;font-size:11px';
        const type = element('p', 'muted', item.mime_type.startsWith('video/') ? 'Vídeo' : 'Foto');
        type.style.cssText = 'margin:2px 0;font-size:11px';
        card.append(media, sender, username, type, expiry);
        grid.append(card);
        shown++;
      }
      status.textContent = shown + ' arquivo(s) disponível(is) na galeria central. Os links de visualização expiram em 5 minutos; atualize para gerar novos.';
    } catch (error) {
      status.textContent = error?.message || 'Não foi possível carregar a Galeria Privada.';
    } finally {
      refresh.disabled = false;
    }
  }
  refresh.addEventListener('click', load);
  load();
}

function watchDashboard() {
  const dashboard = document.getElementById('dashboard');
  if (!dashboard) return;
  if (!dashboard.hidden) installGallery();
  new MutationObserver(() => { if (!dashboard.hidden) installGallery(); }).observe(dashboard, { attributes: true, attributeFilter: ['hidden'] });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchDashboard, { once: true });
else watchDashboard();
