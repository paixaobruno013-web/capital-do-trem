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
`;
  function installStyle(){if(document.getElementById(STYLE_ID))return;const style=document.createElement('style');style.id=STYLE_ID;style.textContent=css;document.head.append(style)}
  function mount(){const root=document.getElementById(ROOT_ID);if(!root)return;installStyle();if(root.parentElement!==document.body)document.body.append(root);root.classList.add('ct-player-persistent');const audio=root.querySelector('audio');if(!audio||wired.has(audio))return;wired.add(audio);const reveal=()=>{root.classList.add('ct-player-ready');document.body.classList.add('ct-has-floating-player')};audio.addEventListener('loadedmetadata',reveal);audio.addEventListener('play',reveal);audio.addEventListener('pause',reveal);if(audio.currentSrc||audio.src)reveal();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
  const observer=new MutationObserver(mount);observer.observe(document.documentElement,{childList:true,subtree:true});
})();
