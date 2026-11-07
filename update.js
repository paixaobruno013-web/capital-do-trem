// Atualizações do Capital do Trem: avisa quando uma nova versão estiver pronta.
(()=>{
 if(!/^https?:$/.test(location.protocol))return;
 // Escurece suavemente a interface inteira enquanto o aparelho estiver sem internet.
 const offlineStyle=document.createElement('style');
 offlineStyle.textContent='html.app-offline::after{content:"";position:fixed;inset:0;background:rgba(0,0,0,.28);backdrop-filter:saturate(.68);-webkit-backdrop-filter:saturate(.68);pointer-events:none;z-index:9000}html{transition:filter .25s ease}@media(prefers-reduced-motion:reduce){html{transition:none!important}}';
 (document.head||document.documentElement).append(offlineStyle);
 const markOffline=()=>document.documentElement.classList.add('app-offline');
 const markOnline=()=>document.documentElement.classList.remove('app-offline');
 window.addEventListener('offline',markOffline);
 window.addEventListener('online',markOnline);
 if(!navigator.onLine)markOffline();
 // Aviso de conexão nas páginas que ainda não têm um indicador próprio.
 // A página inicial já possui um aviso mais completo; evitamos duplicá-lo.
 if(!document.getElementById('connection-status')){
  const connectionBanner=document.createElement('aside');
  connectionBanner.id='app-connection-banner';
  connectionBanner.setAttribute('role','status');
  connectionBanner.setAttribute('aria-live','polite');
  connectionBanner.style.cssText='position:fixed;left:12px;right:12px;bottom:calc(88px + env(safe-area-inset-bottom,0px));z-index:10000;max-width:560px;margin-inline:auto;display:none;padding:13px 15px;background:#211719;color:#fff;border:1px solid #ed1c24;border-radius:12px;box-shadow:0 8px 24px #0008;font:600 14px/1.4 system-ui,Arial,sans-serif';
  let reconnectTimer;
  const showConnection=(message)=>{
   connectionBanner.textContent=message;
   connectionBanner.style.display='block';
  };
  const addConnectionBanner=()=>{if(!connectionBanner.isConnected)document.body.append(connectionBanner);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addConnectionBanner,{once:true});
  else addConnectionBanner();
  window.addEventListener('offline',()=>{
   clearTimeout(reconnectTimer);
   showConnection('Você está sem conexão com a internet. Algumas funções podem ficar indisponíveis.');
  });
  window.addEventListener('online',()=>{
   showConnection('Conexão restabelecida. Você já pode tentar novamente.');
   clearTimeout(reconnectTimer);
   reconnectTimer=setTimeout(()=>{connectionBanner.style.display='none';},6500);
  });
  if(!navigator.onLine)showConnection('Você está sem conexão com a internet. Algumas funções podem ficar indisponíveis.');
 }
 if(!('serviceWorker' in navigator))return;
 let registration=null,reloading=false;
 const banner=document.createElement('aside');
 banner.id='app-update-banner';
 banner.setAttribute('role','status');
 banner.setAttribute('aria-live','polite');
 banner.style.cssText='position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:10001;max-width:560px;margin-inline:auto;display:none;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 16px;background:#111;color:#fff;border:1px solid #ed1c24;border-radius:14px;box-shadow:0 8px 30px #0009;font:600 14px/1.4 system-ui,Arial,sans-serif';
 const message=document.createElement('span');
 message.textContent='Uma nova versão do Capital do Trem está pronta.';
 const button=document.createElement('button');
 button.type='button';button.textContent='Atualizar agora';button.setAttribute('aria-label','Atualizar o Capital do Trem para a versão mais recente');
 button.style.cssText='min-height:44px;border:0;border-radius:9px;padding:10px 16px;background:#ed1c24;color:#fff;font-weight:800;cursor:pointer';
 button.addEventListener('focus',()=>{button.style.outline='3px solid #fff';button.style.outlineOffset='3px';});
 button.addEventListener('blur',()=>{button.style.outline='none';});
 button.addEventListener('click',()=>{
  if(!registration?.waiting)return;
  button.disabled=true;button.textContent='Atualizando…';
  registration.waiting.postMessage({type:'SKIP_WAITING'});
 });
 banner.append(message,button);
 function showUpdate(){banner.style.display='flex';}
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(reloading)return;
  reloading=true;
  location.reload();
 });
 navigator.serviceWorker.register('./sw.js').then(reg=>{
  registration=reg;
  if(reg.waiting&&navigator.serviceWorker.controller)showUpdate();
  reg.addEventListener('updatefound',()=>{
   const worker=reg.installing;
   if(!worker)return;
   worker.addEventListener('statechange',()=>{
    if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdate();
   });
  });
  let checkingUpdate=false;
  const check=async()=>{
   if(!navigator.onLine||document.hidden||checkingUpdate)return;
   checkingUpdate=true;
   try{await reg.update();}catch(error){/* Falha temporária de rede: a próxima verificação tentará novamente. */}
   finally{checkingUpdate=false;}
  };
  window.addEventListener('focus',check);
  window.addEventListener('pageshow',check);
  window.addEventListener('online',check);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
  // Confere atualizações periodicamente enquanto o app permanece aberto.
  window.setInterval(check,6*60*60*1000);
  check();
 }).catch(()=>{});
 const addBanner=()=>{if(!banner.isConnected)document.body.append(banner);};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addBanner,{once:true});
 else addBanner();
})();