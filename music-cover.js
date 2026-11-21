import { getPublicBranding, isCurrentUserAdmin, saveAdminMusicCover, saveAdminMusicCoverSettings } from './supabase/auth.js';
const $ = id => document.getElementById(id);
const area=$('music-cover-area'), preview=$('music-cover-preview'), empty=$('music-cover-empty');
const controls=$('music-cover-controls'), fileInput=$('music-cover-file'), xInput=$('music-cover-x'), yInput=$('music-cover-y'), fitInput=$('music-cover-fit');
const uploadButton=$('music-cover-upload'), saveButton=$('music-cover-save'), status=$('music-cover-status');
if(area&&preview&&empty){
 let currentCoverUrl='',temporaryPreviewUrl='';
 const adminMode=Boolean(controls&&fileInput&&xInput&&yInput&&fitInput&&uploadButton&&saveButton&&status);
 const readControls=()=>({x:Number(xInput.value),y:Number(yInput.value),fit:fitInput.value});
 function applySettings(){if(adminMode){preview.style.objectPosition=`${xInput.value}% ${yInput.value}%`;preview.style.objectFit=fitInput.value==='contain'?'contain':'cover';}}
 function showCover(url){currentCoverUrl=url||'';if(currentCoverUrl){preview.src=currentCoverUrl;preview.hidden=false;empty.hidden=true;}else{preview.removeAttribute('src');preview.hidden=true;empty.hidden=false;}applySettings();}
 async function initialize(){try{
  const branding=await getPublicBranding();showCover(branding.musicCoverUrl);
  if(!adminMode){area.hidden=!branding.musicCoverUrl;return;}
  const admin=await isCurrentUserAdmin();controls.hidden=!admin;area.hidden=!admin;if(!admin)return;
  xInput.value=String(branding.musicCoverX??50);yInput.value=String(branding.musicCoverY??50);fitInput.value=branding.musicCoverFit==='cover'?'cover':'contain';applySettings();
  [xInput,yInput,fitInput].forEach(el=>el.addEventListener('input',applySettings));
  fileInput.addEventListener('change',()=>{const file=fileInput.files?.[0];if(temporaryPreviewUrl)URL.revokeObjectURL(temporaryPreviewUrl);temporaryPreviewUrl='';if(!file){showCover(currentCoverUrl);status.textContent='';return;}temporaryPreviewUrl=URL.createObjectURL(file);showCover(temporaryPreviewUrl);status.textContent=`${file.name} • ${(file.size/1024/1024).toFixed(2)} MB. Confira o enquadramento antes de enviar.`;});
  uploadButton.addEventListener('click',async()=>{const file=fileInput.files?.[0];if(!file){status.textContent='Escolha uma imagem antes de enviar.';return;}uploadButton.disabled=true;saveButton.disabled=true;status.textContent='Enviando e salvando sua capa…';try{const url=await saveAdminMusicCover(file,readControls());showCover(url);fileInput.value='';if(temporaryPreviewUrl)URL.revokeObjectURL(temporaryPreviewUrl);temporaryPreviewUrl='';status.textContent='Capa publicada na área Músicas!';}catch(error){status.textContent=error?.message||'Não foi possível publicar a capa. Confira a conexão e as permissões.';}finally{uploadButton.disabled=false;saveButton.disabled=false;}});
  saveButton.addEventListener('click',async()=>{if(temporaryPreviewUrl){status.textContent='Publique a nova imagem antes de salvar o enquadramento definitivo.';return;}if(!currentCoverUrl){status.textContent='Envie uma capa antes de salvar o enquadramento.';return;}saveButton.disabled=true;status.textContent='Salvando os ajustes…';try{await saveAdminMusicCoverSettings(readControls());status.textContent='Enquadramento salvo para todos os usuários.';}catch(error){status.textContent=error?.message||'Não foi possível salvar os ajustes.';}finally{saveButton.disabled=false;}});
 }catch(error){if(adminMode)area.hidden=true;console.warn('Não foi possível carregar a capa da área Músicas.',error);}}
 initialize();
}