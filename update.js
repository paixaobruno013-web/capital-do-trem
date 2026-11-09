// Atualizações do Capital do Trem: avisa quando uma nova versão estiver pronta.
(()=>{
 if(!/^https?:$/.test(location.protocol))return;
 // Escurece suavemente a interface inteira enquanto o aparelho estiver sem internet.
 const offlineStyle=document.createElement('style');
 offlineStyle.textContent='html.app-offline::after{content:"";position:fixed;inset:0;background:rgba(0,0,0,.22);pointer-events:none;z-index:9000}html{transition:filter .25s ease}@media(prefers-reduced-motion:reduce){html{transition:none!important}}';
 (document.head||document.documentElement).append(offlineStyle);
 const markOffline=()=>document.documentElement.classList.add('app-offline');
 const markOnline=()=>document.documentElement.classList.remove('app-offline');
 window.addEventListener('offline',markOffline);
 window.addEventListener('online',markOnline);
 if(!navigator.onLine)markOffline();
 // Alerta característico do Capital do Trem quando a conexão cai.
 // O som é uma corneta eletrônica original, sintetizada localmente; não baixa áudio externo.
 const alertBox=document.createElement('aside');
 alertBox.id='train-offline-alert';
 alertBox.setAttribute('role','alert');
 alertBox.setAttribute('aria-live','assertive');
 alertBox.style.cssText='position:fixed;top:calc(12px + env(safe-area-inset-top,0px));left:12px;right:12px;z-index:10002;max-width:420px;margin-inline:auto;display:none;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:18px 18px 16px;background:linear-gradient(180deg,#26090b,#111);color:#fff;border:2px solid #ed1c24;border-radius:18px;box-shadow:0 8px 30px #000b,0 0 18px #ed1c2455;font:700 14px/1.4 system-ui,Arial,sans-serif;text-align:center';
 const trainMark=document.createElement('div');
 trainMark.setAttribute('aria-hidden','true');
 trainMark.style.cssText='width:112px;height:112px;flex:0 0 112px;display:grid;place-items:center;margin-bottom:1px';
 trainMark.innerHTML='<svg viewBox="0 0 100 100" width="112" height="112" xmlns="http://www.w3.org/2000/svg"><path d="M50 18 94 91H6L50 18Z" fill="#16090a" stroke="#ed1c24" stroke-width="4" stroke-linejoin="round"/><g stroke="#fff" stroke-linejoin="round"><path d="M31 57V25q0-8 8-8h22q8 0 8 8v32l-7 9H38z" fill="#e9e9e9" stroke-width="2.4"/><path d="M36 27q0-4 5-4h18q5 0 5 4v15H36z" fill="#171717" stroke-width="2"/><path d="M41 27h18v11H41z" fill="#9ec9d8" stroke="none"/><path d="M24 58h13v12H24zm39 0h13v12H63z" fill="#ed1c24" stroke-width="2"/><path d="M30 53h40v7H30zM38 66h24l6 8H32z" fill="#ed1c24" stroke-width="2"/><path d="M43 44h14v10H43z" fill="#303030" stroke-width="2"/><path d="M47 46h6v6h-6z" fill="#f4d36b" stroke="none"/><path d="M35 79h30" fill="none" stroke="#fff" stroke-width="3"/><path d="M40 12h20l-4-7H44z" fill="#ed1c24" stroke-width="2"/></g><circle cx="30" cy="63" r="3" fill="#fff"/><circle cx="70" cy="63" r="3" fill="#fff"/></svg>';
 const alertText=document.createElement('div');
 alertText.style.cssText='width:100%;min-width:0;text-align:center';
 const alertTitle=document.createElement('strong');
 alertTitle.textContent='ALERTA';
 alertTitle.style.cssText='display:block;color:#fff;font-size:28px;line-height:1.05;font-weight:950;letter-spacing:.08em;text-transform:uppercase';
 const alertDetail=document.createElement('span');
 alertDetail.textContent='VOCE TÁ OFFLINE';
 alertDetail.style.cssText='display:block;margin-top:7px;font-size:16px;line-height:1.2;font-weight:850;color:#fff;letter-spacing:.035em';
 alertText.append(alertTitle,alertDetail);
 const hornButton=document.createElement('button');
 hornButton.type='button';
 hornButton.style.cssText='min-height:44px;padding:9px 16px;border:1px solid #ed1c24;border-radius:10px;background:#ed1c24;color:#fff;font-weight:800;cursor:pointer';
 const preferenceKey='capitaldotrem_train_horn_v1';
 let hornEnabled=true,audioContext=null,audioUnlocked=false,playedThisOutage=false,offlineFeedbackSent=false,reconnectTimer=null;
 try{hornEnabled=localStorage.getItem(preferenceKey)!=='off';}catch{}
 function updateHornButton(){hornButton.textContent=hornEnabled?'🔊 Corneta ligada':'🔇 Corneta desligada';hornButton.setAttribute('aria-pressed',String(hornEnabled));}
 function playTrainHorn(){
  if(!hornEnabled||!audioUnlocked)return;
  try{
   const AudioContextClass=window.AudioContext||window.webkitAudioContext;
   if(!AudioContextClass)return;
   if(!audioContext)audioContext=new AudioContextClass();
   if(audioContext.state==='suspended'){audioContext.resume().then(()=>playHornTone()).catch(()=>{});return;}
   playHornTone();
  }catch(error){/* O aviso visual continua disponível mesmo sem áudio. */}
 }
 function playHornTone(){
  if(!audioContext||audioContext.state!=='running')return;
  const now=audioContext.currentTime;
  const master=audioContext.createGain();master.gain.setValueAtTime(.0001,now);master.gain.exponentialRampToValueAtTime(.20,now+.08);master.gain.setValueAtTime(.20,now+.72);master.gain.exponentialRampToValueAtTime(.0001,now+1.12);master.connect(audioContext.destination);
  const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(1050,now);filter.connect(master);
  [196,246.94,293.66].forEach((frequency,index)=>{
   const oscillator=audioContext.createOscillator();const level=audioContext.createGain();
   oscillator.type=index===0?'sawtooth':'triangle';oscillator.frequency.setValueAtTime(frequency,now);
   level.gain.setValueAtTime(index===0?.48:.27,now);
   oscillator.connect(level);level.connect(filter);oscillator.start(now);oscillator.stop(now+1.14);
  });
 }
 async function unlockHorn(){
  try{
   const AudioContextClass=window.AudioContext||window.webkitAudioContext;
   if(!AudioContextClass)return;
   if(!audioContext)audioContext=new AudioContextClass();
   await audioContext.resume();audioUnlocked=audioContext.state==='running';
   if(hornEnabled&&!playedThisOutage&&document.documentElement.classList.contains('app-offline')){playedThisOutage=true;playTrainHorn();}
  }catch(error){audioUnlocked=false;}
 }
 document.addEventListener('pointerdown',unlockHorn,{once:true,passive:true});
 document.addEventListener('keydown',unlockHorn,{once:true});
 function showOffline(){
  clearTimeout(reconnectTimer);document.documentElement.classList.add('app-offline');
  alertTitle.textContent='ALERTA';
  alertDetail.textContent='VOCE TÁ OFFLINE';
  alertBox.style.borderColor='#ed1c24';alertBox.style.display='flex';
  if(!offlineFeedbackSent){offlineFeedbackSent=true;try{if('vibrate' in navigator)navigator.vibrate(3000);}catch(error){/* Vibração depende do suporte do aparelho e navegador. */}}
  if(!playedThisOutage&&audioUnlocked){playedThisOutage=true;playTrainHorn();}
 }
 function showOnline(){
  document.documentElement.classList.remove('app-offline');
  if(!alertBox.isConnected)return;
  alertTitle.textContent='🚂 CONEXÃO RESTABELECIDA!';
  alertDetail.textContent='A internet voltou. O Capital do Trem está conectado novamente.';
  alertBox.style.borderColor='#269b65';alertBox.style.display='flex';
  playedThisOutage=false;offlineFeedbackSent=false;
  try{if('vibrate' in navigator)navigator.vibrate(0);}catch(error){}
  reconnectTimer=window.setTimeout(()=>{alertBox.style.display='none';},5500);
 }
 hornButton.addEventListener('click',async()=>{
  hornEnabled=!hornEnabled;
  try{localStorage.setItem(preferenceKey,hornEnabled?'on':'off');}catch{}
  updateHornButton();
  if(hornEnabled){await unlockHorn();}
 });
 alertBox.append(trainMark,alertText,hornButton);
 updateHornButton();
 const addTrainAlert=()=>{if(!alertBox.isConnected)document.body.append(alertBox);if(!navigator.onLine||document.documentElement.dataset.offlineFallback==='true')showOffline();};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addTrainAlert,{once:true});
 else addTrainAlert();
 window.addEventListener('offline',showOffline);
 window.addEventListener('online',showOnline);
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
// Performance mobile: imagens fora da primeira tela usam carregamento adiado e decodificação assíncrona.
(()=>{
 const tuneImages=root=>{
  root.querySelectorAll?.('img').forEach(img=>{
   if(img.id==='site-logo'||img.closest?.('.intro-smoke__brand'))return;
   if(!img.hasAttribute('loading'))img.loading='lazy';
   if(!img.hasAttribute('decoding'))img.decoding='async';
   if(!img.hasAttribute('fetchpriority'))img.fetchPriority='low';
  });
 };
 tuneImages(document);
 if('MutationObserver' in window){
  const observer=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{
   if(node.nodeType===1){if(node.matches?.('img'))tuneImages({querySelectorAll:()=>[node]});tuneImages(node);}
  })));
  observer.observe(document.documentElement,{childList:true,subtree:true});
 }
})();
