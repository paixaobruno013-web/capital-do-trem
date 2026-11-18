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
body.ct-has-floating-player{padding-bottom:190px!important}
body.light #capital-music-player.ct-player-persistent .ct-player-shell{background:rgba(255,255,255,.97);color:#111;border-color:#ed1c24;box-shadow:0 8px 28px #0002,0 0 18px rgba(237,28,36,.14)}
@media(min-width:760px){#capital-music-player.ct-player-persistent{left:242px;right:16px;bottom:14px;max-width:720px}body.ct-has-floating-player{padding-bottom:24px!important}}
@media(prefers-reduced-motion:reduce){#capital-music-player.ct-player-persistent .ct-player-shell{backdrop-filter:none;-webkit-backdrop-filter:none}}

#capital-music-player.ct-player-persistent{touch-action:pan-y}
#capital-music-player.ct-player-persistent .ct-player-shell{grid-template-areas:"tools tools" "info controls" "progress progress"}
#capital-music-player .ct-player-float-tools{grid-area:tools;grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:12px;min-height:22px;order:-1}
#capital-music-player .ct-player-drag-handle{width:52px;height:18px;border:0;border-radius:99px;background:transparent;display:grid;place-items:center;cursor:grab;touch-action:none;padding:0}
#capital-music-player .ct-player-drag-handle:before{content:"";width:34px;height:4px;border-radius:9px;background:#aaa;box-shadow:0 0 7px rgba(237,28,36,.7)}
#capital-music-player .ct-player-drag-handle:active{cursor:grabbing}
#capital-music-player .ct-player-compact-toggle{border:1px solid rgba(237,28,36,.65);border-radius:99px;background:#160609;color:#fff;padding:3px 10px;min-height:25px;font-size:11px;font-weight:800}
#capital-music-player.ct-player-compact .ct-player-shell{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"info controls" "tools tools";gap:4px 8px;padding:6px 9px;border-radius:12px}
#capital-music-player.ct-player-compact .ct-player-stage{display:block!important}
#capital-music-player.ct-player-compact .ct-player-eyebrow,
#capital-music-player.ct-player-compact .ct-player-artist,
#capital-music-player.ct-player-compact .ct-player-progress-wrap{display:none!important}
#capital-music-player.ct-player-compact .ct-player-title{font-size:12px;margin:0}
#capital-music-player.ct-player-compact .ct-player-controls{gap:4px}
#capital-music-player.ct-player-compact .ct-player-controls button{display:none!important}
#capital-music-player.ct-player-compact .ct-player-controls .ct-player-play,
#capital-music-player.ct-player-compact .ct-player-controls .ct-player-fullscreen{display:grid!important;width:34px;height:34px;min-width:34px;min-height:34px}
#capital-music-player.ct-player-compact .ct-player-float-tools{grid-area:tools;min-height:16px}
#capital-music-player.ct-player-compact .ct-player-drag-handle{height:15px}
#capital-music-player.ct-player-compact .ct-player-drag-handle:before{height:3px}
#capital-music-player.ct-player-compact .ct-player-compact-toggle{min-height:22px;padding:1px 9px}
#capital-music-player.ct-player-persistent.ct-player-fullscreen .ct-player-float-tools{display:none!important}
@media(min-width:760px){#capital-music-player.ct-player-compact{max-width:330px}}


#capital-music-player .ct-player-artwork{--song-glow:hsl(var(--art-hue,345),100%,62%);border-color:hsla(var(--art-hue,345),100%,72%,.8);box-shadow:0 24px 34px rgba(0,0,0,.5),0 0 14px var(--song-glow),0 0 34px hsla(var(--art-hue,345),100%,55%,.58),0 0 62px hsla(var(--art-hue,345),100%,55%,.24),inset 0 1px rgba(255,255,255,.28)}
#capital-music-player .ct-art-brand{color:#fff;text-shadow:0 0 5px #fff,0 0 12px var(--song-glow),0 0 24px var(--song-glow),0 0 40px hsla(var(--art-hue,345),100%,55%,.85);animation:ct-logo-song-glow 2.2s ease-in-out infinite alternate}
#capital-music-player .ct-art-orbit{border-color:hsla(var(--art-hue,345),100%,75%,.8);box-shadow:0 0 18px var(--song-glow)}
#capital-music-player .ct-art-orbit-two{border-color:hsla(calc(var(--art-hue,345) + 35),100%,72%,.8)}
#capital-music-player .ct-art-equalizer i{background:var(--song-glow);box-shadow:0 0 8px var(--song-glow),0 0 16px var(--song-glow)}
#capital-music-player .ct-art-mini-logo{position:absolute;z-index:3;width:clamp(21px,5vw,32px);height:clamp(21px,5vw,32px);object-fit:contain;padding:3px;border:1px solid hsla(var(--art-hue,345),100%,78%,.7);border-radius:7px;background:rgba(0,0,0,.55);filter:drop-shadow(0 0 6px var(--song-glow));opacity:.92}
#capital-music-player .ct-art-mini-logo.logo-one{top:13%;left:12%}
#capital-music-player .ct-art-mini-logo.logo-two{top:13%;right:12%}
#capital-music-player .ct-art-mini-logo.logo-three{bottom:13%;right:12%}
@keyframes ct-logo-song-glow{from{filter:drop-shadow(0 0 3px var(--song-glow))}to{filter:drop-shadow(0 0 9px var(--song-glow)) drop-shadow(0 0 17px var(--song-glow))}}
#capital-music-player.ct-player-persistent.ct-player-fullscreen .ct-player-artwork{box-shadow:0 0 20px var(--song-glow),0 0 50px hsla(var(--art-hue,345),100%,55%,.65),0 0 90px hsla(var(--art-hue,345),100%,55%,.28),inset 0 1px rgba(255,255,255,.3)}

`;
  function installStyle(){if(document.getElementById(STYLE_ID))return;const style=document.createElement('style');style.id=STYLE_ID;style.textContent=css;document.head.append(style)}
  function mount(){const root=document.getElementById(ROOT_ID);if(!root)return;installStyle();if(root.parentElement!==document.body)document.body.append(root);root.classList.add('ct-player-persistent');const shell=root.querySelector('.ct-player-shell');if(shell&&!shell.querySelector('.ct-player-float-tools')){const tools=document.createElement('div');tools.className='ct-player-float-tools';const drag=document.createElement('button');drag.type='button';drag.className='ct-player-drag-handle';drag.setAttribute('aria-label','Arrastar painel de música para cima ou para baixo');drag.title='Segure e arraste para mover';const compact=document.createElement('button');compact.type='button';compact.className='ct-player-compact-toggle';compact.textContent='− Compactar';compact.setAttribute('aria-pressed','false');compact.addEventListener('click',()=>{const active=root.classList.toggle('ct-player-compact');compact.textContent=active?'+ Expandir':'− Compactar';compact.setAttribute('aria-pressed',String(active))});tools.append(drag,compact);shell.prepend(tools);let saved=null;try{saved=JSON.parse(localStorage.getItem('ct-player-position')||'null')}catch{}if(saved&&Number.isFinite(saved.top)){root.style.top=Math.max(8,Math.min(innerHeight-90,saved.top))+'px';root.style.bottom='auto'}drag.addEventListener('pointerdown',event=>{if(root.classList.contains('ct-player-fullscreen'))return;event.preventDefault();drag.setPointerCapture?.(event.pointerId);const startY=event.clientY,rect=root.getBoundingClientRect(),startTop=rect.top;const move=e=>{const top=Math.max(8,Math.min(innerHeight-root.offsetHeight-8,startTop+e.clientY-startY));root.style.top=top+'px';root.style.bottom='auto'};const end=()=>{drag.removeEventListener('pointermove',move);drag.removeEventListener('pointerup',end);drag.removeEventListener('pointercancel',end);try{localStorage.setItem('ct-player-position',JSON.stringify({top:root.getBoundingClientRect().top}))}catch{}};drag.addEventListener('pointermove',move);drag.addEventListener('pointerup',end);drag.addEventListener('pointercancel',end)});}const audio=root.querySelector('audio');if(!audio||wired.has(audio))return;wired.add(audio);const reveal=()=>{root.classList.add('ct-player-ready');document.body.classList.add('ct-has-floating-player')};audio.addEventListener('loadedmetadata',reveal);audio.addEventListener('play',reveal);audio.addEventListener('pause',reveal);if(audio.currentSrc||audio.src)reveal();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  const observer=new MutationObserver(mount);observer.observe(document.documentElement,{childList:true,subtree:true});
})();
