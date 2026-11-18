(()=>{
  const ROOT_ID='capital-music-player';
  const STYLE_ID='capital-music-background-style';
  const wired=new WeakSet();
  const css=`
#capital-music-player.ct-player-persistent{position:fixed!important;z-index:480;left:8px;right:8px;bottom:calc(84px + env(safe-area-inset-bottom,0px));width:auto;max-width:760px;margin:0 auto;display:none;pointer-events:none}
#capital-music-player.ct-player-persistent.ct-player-ready{display:block}
#capital-music-player.ct-player-persistent .ct-player-shell{pointer-events:auto;display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"info controls" "progress progress";align-items:center;gap:5px 12px;padding:10px 12px;border:1px solid rgba(237,28,36,.72);border-radius:15px;background:rgba(8,8,10,.97);box-shadow:0 8px 28px #000b,0 0 18px rgba(237,28,36,.22);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
#capital-music-player.ct-player-persistent .ct-player-topline,#capital-music-player.ct-player-persistent .ct-player-art-wrap,#capital-music-player.ct-player-persistent .ct-player-disc,#capital-music-player.ct-player-persistent .ct-player-catalog-label,#capital-music-player.ct-player-persistent .ct-player-playlist-label,#capital-music-player.ct-player-persistent .ct-player-status{display:none!important}
#capital-music-player.ct-player-persistent .ct-player-stage{grid-area:info;display:block;min-width:0;margin:0}
#capital-music-player.ct-player-persistent .ct-player-info{min-width:0}
#capital-music-player.ct-player-persistent .ct-player-eyebrow{display:block;font-size:9px;letter-spacing:1px;color:#ff6972}
#capital-music-player.ct-player-persistent .ct-player-title{font-size:14px;line-height:1.25;margin:1px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#capital-music-player.ct-player-persistent .ct-player-artist{font-size:11px;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#capital-music-player.ct-player-persistent .ct-player-producer{display:none!important}
#capital-music-player.ct-player-persistent .ct-player-controls{grid-area:controls;display:flex;align-items:center;gap:7px;margin:0}
#capital-music-player.ct-player-persistent .ct-player-controls button{width:38px;height:38px;min-height:38px;min-width:38px;padding:0;border-radius:50%;font-size:16px}
#capital-music-player.ct-player-persistent .ct-player-controls .ct-player-play{width:44px;height:44px;min-width:44px;min-height:44px;font-size:18px}
#capital-music-player.ct-player-persistent .ct-player-progress-wrap{grid-area:progress;margin:0;display:flex;align-items:center;gap:8px}
#capital-music-player.ct-player-persistent .ct-player-range{height:4px;min-height:4px;margin:0;flex:1;accent-color:#ed1c24}
#capital-music-player.ct-player-persistent .ct-player-times{display:flex;gap:6px;font-size:9px;white-space:nowrap}

#capital-music-player.ct-player-persistent{transform:translateY(calc(-1 * var(--ct-player-offset-y,0px)));will-change:transform}
#capital-music-player.ct-player-persistent .ct-player-shell{position:relative;padding-top:25px}
#capital-music-player.ct-player-persistent .ct-player-drag-handle{position:absolute;top:6px;left:50%;transform:translateX(-50%);width:54px;height:14px;padding:0;border:0;border-radius:999px;background:transparent;display:grid;place-items:center;cursor:grab;touch-action:none;z-index:4}
#capital-music-player.ct-player-persistent .ct-player-drag-handle::before{content:"";display:block;width:34px;height:4px;border-radius:99px;background:#aaa;box-shadow:0 0 7px rgba(255,255,255,.28)}
#capital-music-player.ct-player-persistent .ct-player-drag-handle:active{cursor:grabbing}
#capital-music-player.ct-player-persistent .ct-player-compact-toggle{width:30px;height:30px;min-width:30px;min-height:30px;padding:0;border:1px solid rgba(255,255,255,.3);border-radius:50%;background:#171717;color:#fff;font-size:14px;line-height:1}
#capital-music-player.ct-player-persistent.ct-player-compact .ct-player-shell{grid-template-areas:"info controls";padding:20px 9px 8px;gap:4px 8px;border-radius:13px}
#capital-music-player.ct-player-persistent.ct-player-compact .ct-player-progress-wrap,
#capital-music-player.ct-player-persistent.ct-player-compact .ct-player-eyebrow,
#capital-music-player.ct-player-persistent.ct-player-compact .ct-player-artist,
#capital-music-player.ct-player-persistent.ct-player-compact .ct-player-producer,
#capital-music-player.ct-player-persistent.ct-player-compact .ct-player-controls .ct-player-control,
#capital-music-player.ct-player-persistent.ct-player-compact .ct-player-controls .ct-player-volume{display:none!important}
#capital-music-player.ct-player-persistent.ct-player-compact .ct-player-title{font-size:12px;margin:0}
#capital-music-player.ct-player-persistent.ct-player-compact .ct-player-controls{gap:6px}
#capital-music-player.ct-player-persistent.ct-player-compact .ct-player-controls .ct-player-play{width:34px;height:34px;min-width:34px;min-height:34px}
#capital-music-player.ct-player-persistent.ct-player-compact .ct-player-compact-toggle{width:28px;height:28px;min-width:28px;min-height:28px}
#capital-music-player.ct-player-persistent .ct-player-art-wrap::after{content:"";position:absolute;inset:6%;z-index:5;pointer-events:none;border:2px solid hsl(var(--art-hue,345) 100% 64% / .95);border-radius:23px;box-shadow:0 0 7px hsl(var(--art-hue,345) 100% 60% / .9),0 0 17px hsl(var(--art-hue,345) 100% 55% / .65),0 0 34px hsl(var(--art-hue,345) 100% 55% / .42),inset 0 0 12px hsl(var(--art-hue,345) 100% 60% / .2);animation:ct-player-logo-halo 2.4s ease-in-out infinite alternate}
@keyframes ct-player-logo-halo{from{opacity:.68;filter:brightness(.9)}to{opacity:1;filter:brightness(1.25)}}
@media(prefers-reduced-motion:reduce){#capital-music-player.ct-player-persistent .ct-player-art-wrap::after{animation:none}}
#capital-music-player.ct-player-persistent.ct-player-fullscreen{transform:none!important}
#capital-music-player.ct-player-persistent.ct-player-fullscreen .ct-player-drag-handle,
#capital-music-player.ct-player-persistent.ct-player-fullscreen .ct-player-compact-toggle{display:none!important}

body.ct-has-floating-player{padding-bottom:190px!important}
body.light #capital-music-player.ct-player-persistent .ct-player-shell{background:rgba(255,255,255,.97);color:#111;border-color:#ed1c24;box-shadow:0 8px 28px #0002,0 0 18px rgba(237,28,36,.14)}
@media(min-width:760px){#capital-music-player.ct-player-persistent{left:242px;right:16px;bottom:14px;max-width:720px}body.ct-has-floating-player{padding-bottom:24px!important}}
@media(prefers-reduced-motion:reduce){#capital-music-player.ct-player-persistent .ct-player-shell{backdrop-filter:none;-webkit-backdrop-filter:none}}
`;
  function installStyle(){if(document.getElementById(STYLE_ID))return;const style=document.createElement('style');style.id=STYLE_ID;style.textContent=css;document.head.append(style)}
  function mount(){
    const root=document.getElementById(ROOT_ID);if(!root)return;
    installStyle();if(root.parentElement!==document.body)document.body.append(root);
    root.classList.add('ct-player-persistent');
    const shell=root.querySelector('.ct-player-shell');
    if(shell&&!root.querySelector('.ct-player-drag-handle')){
      const handle=document.createElement('button');handle.type='button';handle.className='ct-player-drag-handle';handle.setAttribute('aria-label','Arraste para mover o player para cima ou para baixo');handle.title='Arraste para reposicionar o player';shell.prepend(handle);
      const controls=shell.querySelector('.ct-player-controls');
      if(controls){
        const compact=document.createElement('button');compact.type='button';compact.className='ct-player-compact-toggle';compact.textContent='⌄';compact.title='Compactar player';compact.setAttribute('aria-label','Compactar player');compact.setAttribute('aria-pressed','false');controls.append(compact);
        const applyCompact=enabled=>{root.classList.toggle('ct-player-compact',enabled);compact.textContent=enabled?'⌃':'⌄';compact.title=enabled?'Expandir player':'Compactar player';compact.setAttribute('aria-label',enabled?'Expandir player':'Compactar player');compact.setAttribute('aria-pressed',String(enabled));try{localStorage.setItem('ct-player-compact',String(enabled))}catch{}};
        try{applyCompact(localStorage.getItem('ct-player-compact')==='true')}catch{}
        compact.addEventListener('click',()=>applyCompact(!root.classList.contains('ct-player-compact')));
      }
      let offset=0;try{offset=Number(localStorage.getItem('ct-player-offset-y')||0)||0}catch{}
      const applyOffset=value=>{offset=Math.max(-Math.round(innerHeight*.22),Math.min(Math.round(innerHeight*.62),value));root.style.setProperty('--ct-player-offset-y',offset+'px');try{localStorage.setItem('ct-player-offset-y',String(offset))}catch{}};
      applyOffset(offset);
      handle.addEventListener('pointerdown',event=>{if(root.classList.contains('ct-player-fullscreen'))return;event.preventDefault();handle.setPointerCapture?.(event.pointerId);const startY=event.clientY,startOffset=offset;const move=e=>applyOffset(startOffset-(e.clientY-startY));const finish=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',finish)};handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish)});
    }
    const audio=root.querySelector('audio');if(!audio||wired.has(audio))return;wired.add(audio);
    const reveal=()=>{root.classList.add('ct-player-ready');document.body.classList.add('ct-has-floating-player')};
    audio.addEventListener('loadedmetadata',reveal);audio.addEventListener('play',reveal);audio.addEventListener('pause',reveal);if(audio.currentSrc||audio.src)reveal();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  const observer=new MutationObserver(mount);observer.observe(document.documentElement,{childList:true,subtree:true});
})();
