(() => {
  const path = location.pathname.toLowerCase();
  const isHome = path.endsWith('/') || path.endsWith('/index.html');

  // Escala única da navegação: a barra mantém o mesmo tamanho em todas as telas.
  // Ícone e legenda são estilizados separadamente para evitar que ambos herdem 23px.
  const sharedNavStyle = document.createElement('style');
  sharedNavStyle.id = 'capital-nav-size-standard';
  sharedNavStyle.textContent = `
    @media (max-width: 759px) {
      nav#nav { height:calc(76px + env(safe-area-inset-bottom,0px))!important; min-height:76px!important; gap:2px!important; padding:5px 8px calc(5px + env(safe-area-inset-bottom,0px))!important; justify-content:space-around!important; align-items:center!important; overflow:hidden!important; }
      nav#nav > a, nav#nav > button { box-sizing:border-box!important; flex:1 1 25%!important; width:25%!important; min-width:0!important; max-width:25%!important; min-height:52px!important; height:52px!important; padding:4px 1px!important; display:flex!important; flex-direction:column!important; align-items:center!important; justify-content:center!important; gap:3px!important; font:700 11px/1.1 system-ui,Arial,sans-serif!important; text-align:center!important; white-space:normal!important; }
      nav#nav > a > span:first-child, nav#nav > button > span:first-child { display:block!important; font-size:19px!important; line-height:21px!important; width:auto!important; height:21px!important; margin:0!important; }
      nav#nav > a > span:last-child, nav#nav > button > span:last-child { display:block!important; font-size:10px!important; line-height:12px!important; margin:0!important; }
      nav#nav > button:before { display:none!important; }
    }
  `;;
  if (!document.getElementById(sharedNavStyle.id)) document.head.append(sharedNavStyle);

  // Na página inicial, preserva integralmente o cabeçalho no Feed.
  // Ao entrar em Músicas, recolhe apenas o bloco superior,
  // sem alterar o conteúdo nem a barra inferior.
  if (isHome) {
    const homeItems = [
      ['button[data-page="inicio"]','⌂','Feed'],['a.nav-chat','💬','Chat'],
      ['button[data-page="musicas"]','♫','Músicas'],['a.nav-profile','👤','Perfil']
    ];
    for (const [selector, glyph, label] of homeItems) {
      const item = document.querySelector('nav#nav '+selector);
      if (!item || item.querySelector('.nav-icon')) continue;
      const icon = document.createElement('span'); icon.className='nav-icon'; icon.setAttribute('aria-hidden','true'); icon.textContent=glyph;
      const caption = document.createElement('span'); caption.className='nav-label'; caption.textContent=label;
      item.replaceChildren(icon,caption);
    }
    const homeStyle = document.createElement('style');
    homeStyle.id = 'capital-home-header-by-section';
    homeStyle.textContent = 'body.cdt-secondary-section > header { display:none !important; }';
    if (!document.getElementById(homeStyle.id)) document.head.append(homeStyle);
    const syncHomeHeader = () => {
      const active = document.querySelector('main .page.active');
      document.body.classList.toggle('cdt-secondary-section', !!active && active.id !== 'inicio');
    };
    syncHomeHeader();
    const pageObserver = new MutationObserver(syncHomeHeader);
    document.querySelectorAll('main .page').forEach(page =>
      pageObserver.observe(page, { attributes:true, attributeFilter:['class'] })
    );
    return;
  }

  // Nas áreas internas, mantém os títulos e a identidade de cada tela,
  // removendo apenas atalhos superiores duplicados; a barra inferior permanece.
  const cleanup = document.createElement('style');
  cleanup.id = 'capital-top-navigation-cleanup';
  cleanup.textContent = `
    .chat-area-nav { display: none !important; }
    body > header .actions a { display: none !important; }
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
    body > main > :last-child { scroll-margin-bottom: calc(96px + env(safe-area-inset-bottom, 0px)); }
  `;
  if (!document.getElementById(cleanup.id)) document.head.append(cleanup);

  // Não criar uma segunda barra nas telas que já possuem navegação própria.
  if (document.querySelector('nav#nav')) return;
  const getActive = () => {
    if (path.endsWith('/bate-papo.html') || path.endsWith('/mensagens.html')) return 'chat';
    if (path.endsWith('/rede.html')) return 'perfil';
    if (isHome) {
      const hash = location.hash.replace(/^#/, '').toLowerCase();
      if (hash === 'musicas') return 'musicas';
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
    { id: 'perfil', label: 'Perfil', icon: '👤', href: './rede.html' }
  ];
  const links = new Map();
  for (const item of items) {
    const link = document.createElement('a');
    link.href = item.href;
    link.dataset.section = item.id;
    link.setAttribute('aria-label', item.label);
    const icon = document.createElement('span');
    icon.className = 'nav-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = item.icon;
    const label = document.createElement('span');
    label.className = 'nav-label';
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
      bottom:0!important;top:auto!important;height:calc(78px + env(safe-area-inset-bottom,0px))!important;min-height:78px!important;box-sizing:border-box!important;display:flex!important;
      justify-content:space-around!important;align-items:center!important;gap:2px!important;
      padding:5px 8px calc(5px + env(safe-area-inset-bottom,0px))!important;
      margin:0!important;border-radius:0!important;border-top:1px solid #444!important;
      background:#050505!important;box-shadow:none!important;overflow:hidden!important;
    }
    nav#nav a,nav#nav button {
      flex:1 1 25%!important;width:25%!important;max-width:25%!important;min-width:0!important;
      min-height:62px!important;display:flex!important;flex-direction:column!important;
      align-items:center!important;justify-content:center!important;gap:4px!important;
      padding:4px 1px!important;border:0!important;border-radius:0!important;
      background:transparent!important;color:#fff!important;text-decoration:none!important;
      font:700 11px/1.1 system-ui,Arial,sans-serif!important;text-align:center!important;
    }
    nav#nav a .nav-icon,nav#nav button .nav-icon {display:block!important;font-size:19px!important;line-height:20px!important}
    nav#nav a .nav-label,nav#nav button .nav-label {display:block!important;font-size:10px!important;line-height:1.15!important}
    nav#nav a.active,nav#nav button.active {background:transparent!important;color:#ff1525!important;box-shadow:inset 0 2px #ff1525!important}
    nav#nav .nav-chat:before,nav#nav .nav-profile:before {display:none!important}
    nav#nav a:focus-visible,nav#nav button:focus-visible {outline:3px solid #fff!important;outline-offset:-3px!important}
    @media(min-width:760px){nav#nav a .nav-icon,nav#nav button .nav-icon{display:inline-block!important;margin-right:8px!important}}
  `;
  document.head.append(style);
  document.body.append(nav);
  // Garante que o mesmo padrão visual prevaleça sobre estilos antigos das páginas internas.
  document.head.append(sharedNavStyle);
  updateActive();
  window.addEventListener('hashchange', updateActive);

  const composer = document.querySelector('.composer');
  if (composer) composer.style.bottom = 'calc(86px + env(safe-area-inset-bottom, 0px))';
})();
