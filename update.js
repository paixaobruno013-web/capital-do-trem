// Atualizações do Capital do Trem: avisa quando uma nova versão estiver pronta.
(()=>{
 const supportsServiceWorkerUpdates=/^https?:$/.test(location.protocol);
 // Escurece suavemente a interface inteira enquanto o aparelho estiver sem internet.
 const offlineStyle=document.createElement('style');
 offlineStyle.textContent='html.app-offline::after{content:"";position:fixed;inset:0;background:rgba(0,0,0,.22);pointer-events:none;z-index:9000}html{transition:filter .25s ease}#train-offline-alert .offline-train{transform-box:fill-box;transform-origin:center;animation:capital-train-exit 1.35s cubic-bezier(.2,.75,.25,1) infinite alternate}#train-offline-alert .offline-triangle{transform-origin:50% 50%;animation:capital-triangle-pulse 1.1s ease-in-out infinite alternate}@keyframes capital-train-exit{0%{transform:translate(0,0) scale(.78)}55%{transform:translate(0,17px) scale(1.08)}100%{transform:translate(0,34px) scale(1.28)}}@keyframes capital-triangle-pulse{from{filter:drop-shadow(0 0 1px #ed1c24)}to{filter:drop-shadow(0 0 9px #ed1c24)}}@media(prefers-reduced-motion:reduce){html{transition:none!important}#train-offline-alert .offline-train,#train-offline-alert .offline-triangle{animation:none!important}}';
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
 trainMark.innerHTML='<svg viewBox="0 0 100 100" width="112" height="112" style="overflow:visible" xmlns="http://www.w3.org/2000/svg"><path class="offline-triangle" d="M50 18 94 91H6L50 18Z" fill="#16090a" stroke="#ed1c24" stroke-width="4" stroke-linejoin="round"/><g class="offline-train" stroke="#fff" stroke-linejoin="round"><path d="M31 57V25q0-8 8-8h22q8 0 8 8v32l-7 9H38z" fill="#e9e9e9" stroke-width="2.4"/><path d="M36 27q0-4 5-4h18q5 0 5 4v15H36z" fill="#171717" stroke-width="2"/><path d="M41 27h18v11H41z" fill="#9ec9d8" stroke="none"/><path d="M24 58h13v12H24zm39 0h13v12H63z" fill="#ed1c24" stroke-width="2"/><path d="M30 53h40v7H30zM38 66h24l6 8H32z" fill="#ed1c24" stroke-width="2"/><path d="M43 44h14v10H43z" fill="#303030" stroke-width="2"/><path d="M47 46h6v6h-6z" fill="#f4d36b" stroke="none"/><path d="M35 79h30" fill="none" stroke="#fff" stroke-width="3"/><path d="M40 12h20l-4-7H44z" fill="#ed1c24" stroke-width="2"/></g><circle cx="30" cy="63" r="3" fill="#fff"/><circle cx="70" cy="63" r="3" fill="#fff"/></svg>';
 const alertText=document.createElement('div');
 alertText.style.cssText='width:100%;min-width:0;text-align:center';
 const alertTitle=document.createElement('strong');
 alertTitle.textContent='ALERTA';
   alertTitle.style.color='#fff';
 alertTitle.style.cssText='display:block;color:#fff;font-size:28px;line-height:1.05;font-weight:950;letter-spacing:.08em;text-transform:uppercase';
 const alertDetail=document.createElement('span');
 alertDetail.textContent='VOCE TÁ OFFLINE';
   alertDetail.style.color='#fff';
 alertDetail.style.cssText='display:block;margin-top:7px;font-size:16px;line-height:1.2;font-weight:850;color:#fff;letter-spacing:.035em';
 alertText.append(alertTitle,alertDetail);
 const hornButton=document.createElement('button');
 hornButton.type='button';
 hornButton.style.cssText='min-height:44px;padding:9px 16px;border:1px solid #ed1c24;border-radius:10px;background:#ed1c24;color:#fff;font-weight:800;cursor:pointer';
 const preferenceKey='capitaldotrem_train_horn_v1';
 // Não depende de baixar bibliotecas pela internet: o alerta também precisa funcionar offline.
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
  const fallbackStatus=document.getElementById('connection-status');if(fallbackStatus)fallbackStatus.hidden=true;
  clearTimeout(reconnectTimer);document.documentElement.classList.add('app-offline');
  alertTitle.textContent='ALERTA';
  alertTitle.style.color='#fff';
  alertDetail.textContent='VOCE TÁ OFFLINE';
  alertDetail.style.color='#fff';
  alertBox.style.background='linear-gradient(180deg,#26090b,#111)';
   alertBox.style.boxShadow='0 8px 30px #000b,0 0 18px #ed1c2455';
   alertBox.style.borderColor='#ed1c24';alertBox.style.display='flex';
  if(!offlineFeedbackSent){
   offlineFeedbackSent=true;
   (async()=>{
    try{
     const nativeHaptics=window.Capacitor?.Plugins?.Haptics;
     if(nativeHaptics?.vibrate&&window.Capacitor?.isNativePlatform?.())await nativeHaptics.vibrate({duration:3000});
     else if(typeof navigator.vibrate==='function')navigator.vibrate(3000);
    }catch(error){try{if(typeof navigator.vibrate==='function')navigator.vibrate(3000);}catch{}}
   })();
  }
  if(!playedThisOutage&&audioUnlocked){playedThisOutage=true;playTrainHorn();}
 }
 function showOnline(){
  const fallbackStatus=document.getElementById('connection-status');if(fallbackStatus)fallbackStatus.hidden=true;
  document.documentElement.classList.remove('app-offline');
  // Reinicia o ciclo mesmo se a conexão voltar antes de o alerta entrar no DOM.
  playedThisOutage=false;offlineFeedbackSent=false;
  try{if(typeof navigator.vibrate==='function')navigator.vibrate(0);}catch(error){}
  if(!alertBox.isConnected)return;
  alertTitle.textContent='ONLINE';
   alertTitle.style.color='#48e08b';
  alertDetail.textContent='🚂 CONEXÃO RESTABELECIDA! A INTERNET VOLTOU.';
   alertDetail.style.color='#b9ffd5';
  alertBox.style.background='linear-gradient(180deg,#09291a,#07130d)';
   alertBox.style.borderColor='#269b65';
   alertBox.style.boxShadow='0 8px 30px #000b,0 0 20px #269b6577';
   alertBox.style.display='flex';
  clearTimeout(reconnectTimer);
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
 // navigator.onLine pode continuar true quando o Wi-Fi está conectado, mas sem internet.
 // A verificação usa um endpoint externo ao cache PWA para detectar a queda real.
 let probeRunning=false,lastProbeOnline=null,lastProbeAt=0,consecutiveProbeFailures=0;
 async function verifyRealConnection(){
  // Evita sondagens de rede em segundo plano; a retomada verifica a conexão pelos eventos de foco/visibilidade.
  if(probeRunning||document.hidden)return;
  probeRunning=true;
  const controller=new AbortController();
  const timeout=window.setTimeout(()=>controller.abort(),2500);
  try{
   if(!navigator.onLine)throw new Error('Dispositivo sem rede');
   const response=await fetch('https://zmjxkfjzrbbxyvgkwirv.supabase.co/auth/v1/health?cdt_probe='+Date.now(),{
    method:'GET',mode:'cors',cache:'no-store',credentials:'omit',redirect:'follow',
    headers:{apikey:'sb_publishable_FLbDg6UCePQHb7s0wkywng_J9pNKlsP'},signal:controller.signal
   });
   if(!response.ok)throw new Error('A internet não respondeu ao teste de conexão');
   const wasOffline=document.documentElement.classList.contains('app-offline')||lastProbeOnline===false;
   consecutiveProbeFailures=0;lastProbeOnline=true;lastProbeAt=Date.now();
   if(wasOffline)showOnline();else markOnline();
  }catch(error){
   lastProbeAt=Date.now();
   consecutiveProbeFailures++;
   // Uma falha isolada ou resposta lenta não deve disparar falso alerta.
   // Sem rede no aparelho: alerta imediato. Com Wi-Fi/dados ativos: confirma em duas falhas seguidas.
   if(!navigator.onLine||consecutiveProbeFailures>=2||document.documentElement.classList.contains('app-offline')){
    lastProbeOnline=false;
    showOffline();
   }
  }finally{
   window.clearTimeout(timeout);
   probeRunning=false;
  }
 }
 // Interface de diagnóstico usada pela página Verificar sistema.
 window.CapitalDoTremConnection={
  simulateOffline:showOffline,
  simulateOnline:showOnline,
  check:verifyRealConnection,
  getState:()=>({deviceOnline:navigator.onLine,verifiedOnline:lastProbeOnline,lastCheckAt:lastProbeAt})
 };
 window.addEventListener('online',()=>window.setTimeout(verifyRealConnection,300));
 window.addEventListener('offline',showOffline);
 window.addEventListener('pageshow',verifyRealConnection);
 window.addEventListener('focus',verifyRealConnection);
 navigator.connection?.addEventListener?.('change',verifyRealConnection);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)verifyRealConnection();});
 window.setTimeout(verifyRealConnection,500);
 // Eventos online/offline continuam imediatos; a sondagem periódica fica em 60 s para poupar bateria e dados móveis.
 window.setInterval(verifyRealConnection,60*1000);
 if(!supportsServiceWorkerUpdates||!('serviceWorker' in navigator))return;
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
  if(hasUnsavedWork()){message.textContent='Salve o que está preenchendo antes de atualizar.';return;}
  applyWaitingUpdate();
 });
 banner.append(message,button);
 function showUpdate(){banner.style.display='flex';}
 function hasUnsavedWork(){
  const active=document.activeElement;
  if(active&&/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName))return true;
  return [...document.querySelectorAll('input,textarea,select')].some(field=>{
   if(field.type==='file')return !!field.files?.length;
   if(field.type==='checkbox'||field.type==='radio')return field.checked!==field.defaultChecked;
   return field.value!==field.defaultValue&&field.value.trim()!=='';
  });
 }
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
  window.setInterval(check,30*60*1000);
  window.addEventListener('focus',()=>{if(reg.waiting)showUpdate();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&reg.waiting)showUpdate();});
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


// Monitoramento local de saúde: registra erros técnicos sem enviar dados pessoais.
(()=>{
 const STORAGE_KEY='capitaldotrem_health_incidents_v1';
 const MAX_ITEMS=30;
 const incidents=[];
 let recoveryShown=false;
 function readStored(){
  try{
   const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
   return Array.isArray(saved)?saved.filter(item=>item&&typeof item.kind==='string').slice(-MAX_ITEMS):[];
  }catch{return [];}
 }
 function persist(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(incidents.slice(-MAX_ITEMS)));}catch{}
 }
 incidents.push(...readStored());
 function safeFileName(value){
  if(!value)return '';
  try{return String(value).split(/[?#]/)[0].split('/').pop().slice(0,100);}catch{return '';}
 }
 function reportIncident(kind,details={}){
  const now=Date.now();
  incidents.push({
   kind:String(kind).slice(0,32),
   time:now,
   page:location.pathname.split('/').pop().slice(0,80),
   file:safeFileName(details.file),
   line:Number.isFinite(details.line)?Math.max(0,details.line):0
  });
  while(incidents.length>MAX_ITEMS)incidents.shift();
  persist();
  // Só erros reais de execução entram no gatilho do aviso. Tarefas longas isoladas
  // e falhas de recursos opcionais são registradas, mas não interrompem a atividade.
  const recent=incidents.filter(item=>now-item.time<90000&&(item.kind==='javascript'||item.kind==='promise'));
  const duplicate=incidents.slice(0,-1).some(item=>item.kind===kind&&item.file===safeFileName(details.file)&&item.line===(Number.isFinite(details.line)?Math.max(0,details.line):0)&&now-item.time<30000);
  if(recent.length<3||duplicate||recoveryShown)return;
  recoveryShown=true;
  const notice=document.createElement('aside');
  notice.setAttribute('role','status');
  notice.style.cssText='position:fixed;left:12px;right:12px;bottom:calc(90px + env(safe-area-inset-bottom,0px));z-index:10003;max-width:520px;margin:auto;padding:13px 15px;border:1px solid #ed1c24;border-radius:12px;background:#111;color:#fff;font:600 14px/1.45 system-ui,sans-serif;box-shadow:0 8px 28px #0009';
  notice.textContent='O Capital do Trem identificou uma instabilidade. Seus dados não serão apagados nem a tela será reiniciada automaticamente. Consulte Verificar sistema quando terminar sua atividade.';
  document.body.append(notice);
 }
 window.addEventListener('error',event=>{
  if(event.target&&event.target!==window){
   const tag=event.target.tagName;
   if(tag==='SCRIPT'||tag==='LINK')reportIncident('asset-load',{file:event.target.src||event.target.href});
  }else reportIncident('javascript',{file:event.filename,line:event.lineno});
 },true);
 window.addEventListener('unhandledrejection',()=>reportIncident('promise'));
 if('PerformanceObserver'in window){
  try{
   const observer=new PerformanceObserver(list=>{
    for(const entry of list.getEntries())if(entry.duration>=2000)reportIncident('long-task');
   });
   observer.observe({entryTypes:['longtask']});
  }catch(error){}
 }
 window.CapitalDoTremHealth={
  getIncidents:()=>incidents.slice().reverse(),
  clearIncidents:()=>{incidents.length=0;try{localStorage.removeItem(STORAGE_KEY);}catch{}return true;},
  exportReport:()=>JSON.stringify({createdAt:new Date().toISOString(),page:location.pathname,incidents:incidents.slice().reverse()},null,2)
 };
})();
