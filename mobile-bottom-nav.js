(() => {
  if (document.querySelector('.cdt-mobile-bottom-nav')) return;
  const path = location.pathname.toLowerCase();
  const isHome = path.endsWith('/') || path.endsWith('/index.html');
  const getActive = () => {
    if (path.endsWith('/bate-papo.html') || path.endsWith('/mensagens.html')) return 'chat';
    if (path.endsWith('/rede.html')) return 'perfil';
    if (isHome) {
      const hash = location.hash.replace(/^#/, '').toLowerCase();
      if (hash === 'musicas') return 'musicas';
      if (hash === 'pesquisa' || hash === 'pesquisas') return 'pesquisa';
      return 'feed';
    }
    return '';
  };
  const nav = document.createElement('nav');
  nav.className = 'cdt-mobile-bottom-nav';
  nav.setAttribute('aria-label', 'Navegação principal');
  const items = [
    { id: 'feed', label: 'Feed', icon: '⌂', href: './index.html#inicio' },
    { id: 'chat', label: 'Chat', icon: '💬', href: './mensagens.html' },
    { id: 'musicas', label: 'Músicas', icon: '♫', href: './index.html#musicas' },
    { id: 'pesquisa', label: 'Pesquisa', icon: '⌕', href: './index.html#pesquisa' },
    { id: 'perfil', label: 'Perfil', icon: '👤', href: './rede.html' }
  ];
  const links = new Map();
  for (const item of items) {
    const link = document.createElement('a');
    link.href = item.href;
    link.dataset.section = item.id;
    const icon = document.createElement('span');
    icon.className = 'cdt-nav-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = item.icon;
    const label = document.createElement('span');
    label.textContent = item.label;
    link.append(icon, label);
    nav.append(link);
    links.set(item.id, link);
  }
  const updateActive = () => {
    const active = getActive();
    for (const [id, link] of links) {
      const selected = id === active;
      link.classList.toggle('is-active', selected);
      if (selected) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  };
  const style = document.createElement('style');
  style.textContent = `
    body { padding-bottom: calc(78px + env(safe-area-inset-bottom, 0px)) !important; }
    .cdt-mobile-bottom-nav { position:fixed; z-index:9990; left:0; right:0; bottom:0; display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:2px; padding:7px 5px calc(7px + env(safe-area-inset-bottom,0px)); border-top:1px solid rgba(237,28,36,.5); background:rgba(5,5,7,.97); box-shadow:0 -8px 28px rgba(0,0,0,.48); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); }
    .cdt-mobile-bottom-nav a { min-width:0; min-height:52px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; border:1px solid transparent; border-radius:12px; color:#d5d5d5; text-decoration:none; font:700 10px/1.15 system-ui,Arial,sans-serif; }
    .cdt-mobile-bottom-nav .cdt-nav-icon { font-size:20px; line-height:1.1; }
    .cdt-mobile-bottom-nav a.is-active { color:#fff; background:linear-gradient(145deg,#501015,#16090b); border-color:#ed1c24; box-shadow:0 0 12px rgba(237,28,36,.28),inset 0 0 10px rgba(237,28,36,.12); }
    .cdt-mobile-bottom-nav a:focus-visible { outline:2px solid #fff; outline-offset:2px; }
    @media(min-width:760px){ .cdt-mobile-bottom-nav { left:50%; right:auto; width:min(720px,calc(100% - 32px)); transform:translateX(-50%); border:1px solid rgba(237,28,36,.5); border-bottom:0; border-radius:16px 16px 0 0; } }
  `;
  document.head.append(style);
  document.body.append(nav);
  updateActive();
  window.addEventListener('hashchange', updateActive);
  const composer = document.querySelector('.composer');
  if (composer) composer.style.bottom = 'calc(68px + env(safe-area-inset-bottom, 0px))';
})();