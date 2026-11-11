import * as auth from './supabase/auth.js';
const el=id=>document.getElementById(id);
const say=(id,msg)=>{const n=el(id);if(n)n.textContent=msg;};
const busy=(b,v,label)=>{if(b){b.disabled=v;if(label)b.textContent=label;}};
function bindPreview(inputId,previewId,statusId,label){
 const input=el(inputId),preview=el(previewId);if(!input||!preview)return;
 let current='';
 input.addEventListener('change',()=>{
  const f=input.files&&input.files[0];if(!f)return;
  if(current)URL.revokeObjectURL(current);
  current=URL.createObjectURL(f);preview.src=current;preview.style.display='block';
  say(statusId,label+' selecionado: '+f.name+'. Agora toque em PUBLICAR.');
 });
}
async function upload(inputId,buttonId,statusId,fn,success,label,maxBytes){
 const input=el(inputId),button=el(buttonId);if(!input||!button)return;
 const file=input.files&&input.files[0];
 if(!file){say(statusId,'Selecione o arquivo antes de publicar.');return;}
 if(file.size<1||file.size>maxBytes){say(statusId,'Arquivo vazio ou acima do limite permitido.');return;}
 busy(button,true);
 say(statusId,'Enviando arquivo… aguarde a confirmação.');
 try{
  await auth.initSupabase();
  const url=await fn(file);
  say(statusId,success);
  input.value='';
  return url;
 }catch(e){
  say(statusId,'ERRO AO PUBLICAR: '+[e&&e.message,e&&e.code,e&&e.status,e&&e.details,e&&e.hint].filter(Boolean).join(' | '));
 }finally{busy(button,false,label);}
}
bindPreview('opening-video-file-direct','opening-video-preview-direct','opening-media-direct-status','Vídeo');
bindPreview('opening-image-file-direct','opening-image-preview-direct','opening-media-direct-status','Imagem');
bindPreview('header-background-file-direct','header-background-preview-direct','header-background-direct-status','Imagem do cabeçalho');
el('opening-video-save-direct')?.addEventListener('click',()=>upload(
 'opening-video-file-direct','opening-video-save-direct','opening-media-direct-status',
 async f=>{
   const url=await auth.saveAdminOpeningVideo(f,{x:50,y:50,fit:'cover'});
   const saved=await auth.getPublicBranding();
   if(saved.openingVideoUrl!==url)throw new Error('O upload terminou, mas a configuração pública ainda aponta para outro vídeo. Recarregue o painel e tente novamente.');
   const response=await fetch(url+(url.includes('?')?'&':'?')+'cdt_verify='+Date.now(),{method:'HEAD',cache:'no-store'});
   if(!response.ok)throw new Error('O vídeo foi enviado, mas o endereço publicado não respondeu corretamente ('+response.status+').');
   const type=response.headers.get('content-type')||'';
   if(!type.toLowerCase().includes('video/'))throw new Error('O endereço publicado não está retornando um arquivo de vídeo.');
   return url;
  },
 'VÍDEO PUBLICADO E CONFERIDO. A abertura já está apontando para o arquivo novo.','PUBLICAR VÍDEO NA ABERTURA',20*1024*1024
));
el('opening-image-save-direct')?.addEventListener('click',()=>upload(
 'opening-image-file-direct','opening-image-save-direct','opening-media-direct-status',
 f=>auth.saveAdminOpeningImage(f,{x:50,y:50,fit:'cover'}),
 'IMAGEM PUBLICADA. ELA FICARÁ NA ABERTURA POR 10 SEGUNDOS.','PUBLICAR IMAGEM NA ABERTURA (10 SEGUNDOS)',5*1024*1024
));
async function verifyHeaderBackground(url){
 await new Promise((resolve,reject)=>{
  const image=new Image();
  image.onload=resolve;
  image.onerror=()=>reject(new Error('O arquivo foi enviado, mas a imagem não abriu pelo endereço público.'));
  image.src=url+(url.includes('?')?'&':'?')+'cdt_verify='+Date.now();
 });
 const saved=await auth.getPublicBranding();
 if(saved.headerBackgroundImageUrl!==url)throw new Error('A imagem abriu, mas a configuração do cabeçalho não foi confirmada na leitura pública.');
}
el('header-background-save-direct')?.addEventListener('click',async()=>{
 const status='header-background-direct-status';
 try{
  const url=await upload(
   'header-background-file-direct','header-background-save-direct',status,
   f=>auth.saveAdminHeaderBackground(f,{x:50,y:50,blur:0,fit:'cover'}),
   'Imagem enviada. Conferindo gravação e exibição…','PUBLICAR FUNDO DO CABEÇALHO',8*1024*1024
  );
  if(!url)return;
  await verifyHeaderBackground(url);
  const preview=el('header-background-preview-direct');
  if(preview){preview.src=url;preview.style.display='block';}
  say(status,'CONFIRMADO: imagem enviada, aberta e configuração gravada. Atualize a tela inicial para visualizar o novo cabeçalho.');
 }catch(e){say(status,'NÃO FOI POSSÍVEL CONFIRMAR O FUNDO: '+[e?.message,e?.code,e?.status,e?.details,e?.hint].filter(Boolean).join(' | '));}
});

const volumeInput=el('opening-video-volume');
const audioMode=el('opening-video-audio-mode');
const videoPreview=el('opening-video-preview-direct');
function syncVideoPreviewAudio(){
 if(videoPreview){videoPreview.muted=audioMode?.value!=='sound';videoPreview.volume=Math.max(0,Math.min(1,Number(volumeInput?.value??70)/100));}
 if(volumeValue&&volumeInput)volumeValue.textContent=volumeInput.value+'%';
}
const volumeValue=el('opening-video-volume-value');
volumeInput?.addEventListener('input',syncVideoPreviewAudio);
audioMode?.addEventListener('change',syncVideoPreviewAudio);
auth.getPublicBranding().then(branding=>{
 const mode=el('opening-video-audio-mode');
 if(mode)mode.value=branding.openingVideoMuted?'muted':'sound';
 if(volumeInput)volumeInput.value=String(Math.round((branding.openingVideoVolume??0.7)*100));
 syncVideoPreviewAudio();
}).catch(()=>{});
el('opening-video-audio-save')?.addEventListener('click',async()=>{
 const button=el('opening-video-audio-save');
 busy(button,true,'SALVANDO OPÇÕES…');
 say('opening-video-audio-status','Salvando preferências de áudio…');
 try{
  await auth.saveAdminOpeningVideoSettings({muted:el('opening-video-audio-mode')?.value!=='sound',volume:Number(volumeInput?.value??70)/100});
  say('opening-video-audio-status','OPÇÕES DE ÁUDIO SALVAS. '+(el('opening-video-audio-mode')?.value==='sound'?'O áudio ficará ligado por padrão; navegadores externos podem aplicar restrições de autoplay com som.':'O vídeo será reproduzido sem áudio.'));
 }catch(e){say('opening-video-audio-status','ERRO AO SALVAR ÁUDIO: '+[e?.message,e?.code,e?.status,e?.details,e?.hint].filter(Boolean).join(' | '));}
 finally{busy(button,false,'SALVAR OPÇÕES DE ÁUDIO');}
});

say('opening-media-direct-status','CONTROLES PRONTOS. Escolha um vídeo ou imagem e publique.');
say('header-background-direct-status','CONTROLE PRONTO. Escolha a imagem e publique.');
