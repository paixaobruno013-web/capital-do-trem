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
 // Alerta característico do Capital do Trem quando a conexão cai.
 // O som é uma corneta eletrônica original, sintetizada localmente; não baixa áudio externo.
 const alertBox=document.createElement('aside');
 alertBox.id='train-offline-alert';
 alertBox.setAttribute('role','alert');
 alertBox.setAttribute('aria-live','assertive');
 alertBox.style.cssText='position:fixed;top:calc(12px + env(safe-area-inset-top,0px));left:12px;right:12px;z-index:10002;max-width:560px;margin-inline:auto;display:none;align-items:center;gap:12px;flex-wrap:wrap;padding:15px 16px;background:linear-gradient(135deg,#26090b,#111);color:#fff;border:2px solid #ed1c24;border-radius:15px;box-shadow:0 8px 30px #000b,0 0 18px #ed1c2455;font:700 14px/1.4 system-ui,Arial,sans-serif';
 const trainMark=document.createElement('div');
 trainMark.setAttribute('aria-hidden','true');
 trainMark.style.cssText='width:58px;height:58px;flex:0 0 58px;display:grid;place-items:center';
 trainMark.innerHTML='<svg viewBox="0 0 64 64" width="58" height="58" xmlns="http://www.w3.org/2000/svg"><path d="M32 4 60 56H4L32 4Z" fill="#16090a" stroke="#ed1c24" stroke-width="3.5" stroke-linejoin="round"/><path d="M19 25h26v16H19z" fill="#fff" stroke="#fff" stroke-width="1.5"/><path d="M23 29h7v6h-7zm11 0h7v6h-7z" fill="#ed1c24"/><path d="M16 43h32l-4 5H20z" fill="#ed1c24"/><circle cx="25" cy="43" r="2.5" fill="#fff"/><circle cx="39" cy="43" r="2.5" fill="#fff"/></svg>';
 const alertText=document.createElement('div');
 alertText.style.cssText='flex:1;min-width:180px';
 const alertTitle=document.createElement('strong');
 alertTitle.textContent='🚨 ALERTA: VOCÊ TÁ OFFLINE!';
 alertTitle.style.cssText='display:block;color:#ff555b;font-size:16px;letter-spacing:.02em';
 const alertDetail=document.createElement('span');
 alertDetail.textContent='A conexão caiu. O trem está aguardando a internet voltar.';
 alertDetail.style.cssText='display:block;margin-top:3px;font-weight:500;color:#eee';
 alertText.append(alertTitle,alertDetail);
 const hornButton=document.createElement('button');
 hornButton.type='button';
 hornButton.style.cssText='min-height:44px;padding:9px 12px;border:1px solid #ed1c24;border-radius:10px;background:#ed1c24;color:#fff;font-weight:800;cursor:pointer';
 const preferenceKey='capitaldotrem_train_horn_v1';
 let hornEnabled=true,audioContext=null,audioUnlocked=false,playedThisOutage=false,reconnectTimer=null;
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
   if(!playedThisOutage&&document.documentElement.classList.contains('app-offline')){playedThisOutage=true;playTrainHorn();}
  }catch(error){audioUnlocked=false;}
 }
 document.addEventListener('pointerdown',unlockHorn,{once:true,passive:true});
 document.addEventListener('keydown',unlockHorn,{once:true});
 function showOffline(){
  clearTimeout(reconnectTimer);document.documentElement.classList.add('app-offline');
  alertTitle.textContent='🚨 ALERTA: VOCÊ TÁ OFFLINE!';
  alertDetail.textContent='A conexão caiu. O trem está aguardando a internet voltar.';
  alertBox.style.borderColor='#ed1c24';alertBox.style.display='flex';
  if(!playedThisOutage&&audioUnlocked){playedThisOutage=true;playTrainHorn();}
 }
 function showOnline(){
  document.documentElement.classList.remove('app-offline');
  if(!alertBox.isConnected)return;
  alertTitle.textContent='🚂 CONEXÃO RESTABELECIDA!';
  alertDetail.textContent='A internet voltou. O Capital do Trem está conectado novamente.';
  alertBox.style.borderColor='#269b65';alertBox.style.display='flex';
  playedThisOutage=false;
  reconnectTimer=window.setTimeout(()=>{alertBox.style.display='none';},5500);
 }
 hornButton.addEventListener('click',async()=>{
  hornEnabled=!hornEnabled;
  try{localStorage.setItem(preferenceKey,hornEnabled?'on':'off');}catch{}
  updateHornButton();
  if(hornEnabled){await unlockHorn();if(document.documentElement.classList.contains('app-offline')){playedThisOutage=true;playTrainHorn();}}
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