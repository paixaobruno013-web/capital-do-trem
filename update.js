// Atualizações do Capital do Trem: avisa quando uma nova versão estiver pronta.
(()=>{
 if(!/^https?:$/.test(location.protocol))return;
 // Aviso de conexão: funciona mesmo em navegadores sem suporte a Service Worker.
 const connectionBanner=document.createElement('aside');
 connectionBanner.id='app-connection-banner';
 connectionBanner.setAttribute('role','status');
 connectionBanner.setAttribute('aria-live','polite');
 connectionBanner.textContent='Você está sem conexão com a internet. Algumas funções podem ficar indisponíveis.';
 connectionBanner.style.cssText='position:fixed;left:12px;right:12px;bottom:calc(88px + env(safe-area-inset-bottom,0px));z-index:10000;display:none;padding:13px 15px;background:#211719;color:#fff;border:1px solid #ed1c24;border-radius:12px;box-shadow:0 8px 24px #0008;font:600 14px/1.4 system-ui,Arial,sans-serif';
 const updateConnectionNotice=()=>{connectionBanner.style.display=navigator.onLine?'none':'block';};
 window.addEventListener('offline',updateConnectionNotice);
 window.addEventListener('online',updateConnectionNotice);
 updateConnectionNotice();
 const addConnectionBanner=()=>{if(!connectionBanner.isConnected)document.body.append(connectionBanner);updateConnectionNotice();};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addConnectionBanner,{once:true});
 else addConnectionBanner();
 if(!('serviceWorker' in navigator))return;
 let registration=null,reloading=false;
 const banner=document.createElement('aside');
 banner.id='app-update-banner';
 banner.setAttribute('role','status');
 banner.setAttribute('aria-live','polite');
 banner.style.cssText='position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:10001;display:none;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 16px;background:#111;color:#fff;border:1px solid #ed1c24;border-radius:14px;box-shadow:0 8px 30px #0009;font:600 14px/1.4 system-ui,Arial,sans-serif';
 const message=document.createElement('span');
 message.textContent='Uma nova versão do Capital do Trem está pronta.';
 const button=document.createElement('button');
 button.type='button';button.textContent='Atualizar agora';
 button.style.cssText='border:0;border-radius:9px;padding:10px 14px;background:#ed1c24;color:#fff;font-weight:800;cursor:pointer';
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
  const check=()=>{if(navigator.onLine)reg.update().catch(()=>{});};
  window.addEventListener('focus',check);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
  check();
 }).catch(()=>{});
 const addBanner=()=>{if(!banner.isConnected)document.body.append(banner);};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addBanner,{once:true});
 else addBanner();
})();