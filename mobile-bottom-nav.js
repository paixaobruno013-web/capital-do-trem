(() => {
  // Em todas as áreas, a navegação principal fica somente na barra inferior.
  const cleanup = document.createElement('style');
  cleanup.id = 'capital-top-navigation-cleanup';
  cleanup.textContent = `
    /* O cabeçalho antigo e os atalhos superiores saem; o conteúdo ocupa o espaço liberado. */
    body > header { display: none !important; }
    .chat-area-nav { display: none !important; }
    html { scroll-padding-top: 8px !important; scroll-padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px)) !important; }
    body { min-height: 100vh; min-height: 100svh; padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px)) !important; }
    body > main {
      padding-top: 8px !important;
      padding-bottom: calc(24px + 88px + env(safe-area-inset-bottom, 0px)) !important;
      margin-top: 0 !important;
    }
    @media (max-width: 759px) {
      body > main { padding-left: 10px !important; padding-right: 10px !important; }
    }
    /* O espaço final de cada tela fica livre para a barra fixa, sem cobrir conteúdo. */
    body > main > :last-child { scroll-margin-bottom: calc(96px + env(safe-area-inset-bottom, 0px)); }
  `;
  if (!document.getElementById(cleanup.id)) document.head.append(cleanup);

  // A página inicial já possui a navegação original (#nav). Não criar uma segunda barra.
  if (document.querySelector('nav#nav')) return;

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

  // Mesma estrutura e identidade visual da barra original da página inicial.
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Navegação principal');
  const items = [
    { id: 'feed', label: 'Feed', icon: '⌂', href: './index.html#inicio' },
    { id: 'chat', label: 'Chat', icon: '💬', href: './bate-papo.html' },
    { id: 'musicas', label: 'Músicas', icon: '♫', href: './index.html#musicas' },
    { id: 'pesquisa', label: 'Pesquisa', icon: '⌕', href: './index.html#pesquisa' },
    { id: 'perfil', label: 'Perfil', icon: '♙', href: './rede.html' }
  ];
  const links = new Map();
  for (const item of items) {
    const link = document.createElement('a');
    link.href = item.href;
    link.dataset.section = item.id;
    link.setAttribute('aria-label', item.label);
    const icon = document.createElement('span');
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
      link.classList.toggle('active', selected);
      if (selected) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  };

  const style = document.createElement('style');
  style.textContent = `
    body { padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px)) !important; }
    nav#nav {
      position:fixed!important;z-index:500!important;left:0!important;right:0!important;
      bottom:0!important;top:auto!important;height:78px!important;display:flex!important;
      justify-content:space-around!important;align-items:center!important;gap:2px!important;
      padding:5px 8px calc(5px + env(safe-area-inset-bottom,0px))!important;
      margin:0!important;border-radius:0!important;border-top:1px solid #444!important;
      background:#050505!important;box-shadow:none!important;overflow:hidden!important;
    }
    nav#nav a {
      flex:1 1 20%!important;width:20%!important;max-width:20%!important;min-width:0!important;
      min-height:62px!important;display:flex!important;flex-direction:column!important;
      align-items:center!important;justify-content:center!important;gap:4px!important;
      padding:4px 1px!important;border:0!important;border-radius:0!important;
      background:transparent!important;color:#fff!important;text-decoration:none!important;
      font:700 11px/1.1 system-ui,Arial,sans-serif!important;text-align:center!important;
    }
    nav#nav a span:first-child { display:block!important;font-size:23px!important;line-height:1!important; }
    nav#nav a.active { background:transparent!important;color:#ff1525!important;box-shadow:inset 0 2px #ff1525!important; }
    nav#nav a:focus-visible { outline:3px solid #fff!important;outline-offset:-3px!important; }
  `;
  document.head.append(style);
  document.body.append(nav);
  updateActive();
  window.addEventListener('hashchange', updateActive);

  const composer = document.querySelector('.composer');
  if (composer) composer.style.bottom = 'calc(86px + env(safe-area-inset-bottom, 0px))';
})();
