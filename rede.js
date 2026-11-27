import {createCapitalMusicPlayer} from './capital-music-player.js';
import {loadPostMusic,createPostMusicControl} from './post-music.js';
import * as api from './supabase/auth.js';
const $=id=>document.getElementById(id);
const supabase=api.initSupabase();
function setMusicFocusMode(active){const panel=$('musicas'),back=$('music-catalog-back');if(!panel||!back)return;panel.classList.toggle('music-focus-mode',Boolean(active));back.hidden=!active;}
const musicPlayer=createCapitalMusicPlayer('rede-music-player',{onPlay:song=>{api.recordSongPlay(song.id).catch(()=>{});setMusicFocusMode(true);}});
$('music-catalog-back')?.addEventListener('click',()=>setMusicFocusMode(false));
let me=null,profile=null,currentProfileUserId=null,allPosts=[],allMedia=[],allPeople=[],allSongs=[];
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials=value=>String(value||'Capital do Trem').trim().slice(0,2).toUpperCase();
function avatarUrl(p){if(p?.avatar_type==='photo'&&p.avatar_url)return p.avatar_url;if(p?.avatar_type==='character'&&p.avatar_data){const d=p.avatar_data;return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#171717"/><circle cx="50" cy="40" r="23" fill="'+(d.skin||'#8d5524')+'"/><path d="M20 100 Q25 65 50 65 Q75 65 80 100" fill="'+(d.shirt||'#ed1c24')+'"/></svg>')}return '';}
function setAvatar(img,p){const url=avatarUrl(p);if(url){img.src=url;img.alt=p.display_name||'Foto do perfil'}else{img.removeAttribute('src');img.alt=initials(p?.display_name)}}
function makeCoverPreset(kind){const themes={red:['#080808','#ed1c24','#65050b','CAPITAL DO TREM'],minas:['#f5f1e8','#d71920','#222222','MINAS GERAIS 🔺'],funk:['#080808','#8b1235','#ed1c24','FUNK • CULTURA • COMUNIDADE'],train:['#05070d','#24344d','#ed1c24','A MÚSICA NÃO PARA']};const [a,b,c,label]=themes[kind]||themes.red;const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 420"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="'+a+'"/><stop offset=".58" stop-color="'+b+'"/><stop offset="1" stop-color="'+c+'"/></linearGradient></defs><rect width="1200" height="420" fill="url(#g)"/><path d="M760 0 L1200 0 L1200 420 L980 420 Z" fill="#fff" opacity=".07"/><path d="M900 50 L1040 300 L760 300 Z" fill="none" stroke="#fff" stroke-width="12" opacity=".28"/><text x="65" y="230" fill="#fff" font-family="Arial,sans-serif" font-size="58" font-weight="900" letter-spacing="5">'+label+'</text><text x="70" y="290" fill="#fff" opacity=".8" font-family="Arial,sans-serif" font-size="24">PERFIL DA COMUNIDADE</text></svg>';return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}
function notice(id,msg){$(id).textContent=msg}
const socialComposerStyle=document.createElement('style');
socialComposerStyle.textContent=`
.composer-card{position:relative;overflow:hidden;border:1px solid #ed1c2477!important;background:radial-gradient(ellipse at 100% 0%,#ed1c2422,transparent 45%),linear-gradient(145deg,#11131b,#090a10)!important;padding:clamp(16px,4vw,24px)!important}
.composer-heading,.playlist-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.composer-heading h2,.playlist-heading h3{margin:5px 0;font-size:clamp(21px,5vw,28px)}
.composer-kicker{font-size:10px;letter-spacing:1.5px;font-weight:950;color:#ff5965}
.composer-live,.playlist-mark{border:1px solid #ed1c2477;border-radius:999px;padding:6px 10px;color:#ff6570;font-size:10px;font-weight:950;white-space:nowrap}
.composer-card textarea{min-height:125px;resize:vertical;border-radius:15px!important;padding:15px!important;font-size:16px!important;background:#07090f!important}
.composer-meta{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;color:#9da5b5;font-size:11px;margin:7px 2px 14px}
.composer-attachment{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px;border:1px dashed #ed1c2477;border-radius:13px;background:#ed1c240c}
.composer-attachment input[type=file]{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.composer-attach-btn{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:8px 13px;border-radius:10px;background:#ed1c24;color:white;font-weight:850;cursor:pointer}
.composer-clear{border:1px solid #ffffff30;border-radius:9px;padding:7px 10px;background:transparent;color:inherit}
.post-upload-preview{margin-top:12px;border:1px solid #ffffff20;border-radius:13px;overflow:hidden;background:#050505}
.post-upload-preview img,.post-upload-preview video{display:block;width:100%;max-height:380px;object-fit:contain}
.composer-submit-row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:13px}
.composer-submit-row .status{margin:0;min-height:0}
.feed-section-heading{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:20px 4px 10px;flex-wrap:wrap}
.feed-section-heading h2{margin:0;font-size:19px}.feed-section-heading span{font-size:11px;color:#9da5b5}
.playlist-manager{border:1px solid #54e9ff44!important;background:linear-gradient(145deg,#10151d,#090b11)!important}
.playlist-mark{font-size:21px;color:#54e9ff;border-color:#54e9ff55}
.playlist-create-row{display:flex;gap:9px;align-items:center;margin:12px 0;flex-wrap:wrap}
.playlist-create-row input{flex:1;min-width:160px;margin:0}
.playlist-card{padding:13px;margin:10px 0;border:1px solid #ffffff20;border-radius:13px;background:#080a10}
.playlist-card-head,.playlist-song-row{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.playlist-card-head strong{font-size:16px}
.playlist-card-actions,.playlist-song-actions{display:flex;gap:6px;flex-wrap:wrap}
.playlist-card button,.playlist-song-row button{min-height:34px;padding:6px 9px;border-radius:8px;font-size:12px}
.playlist-add-row{display:flex;gap:8px;margin:10px 0;align-items:center}
.playlist-add-row select{flex:1;min-width:0;margin:0}
.playlist-song-row{padding:8px 0;border-top:1px solid #ffffff16}
.playlist-song-copy{min-width:0;flex:1}.playlist-song-copy strong,.playlist-song-copy small{display:block;overflow-wrap:anywhere}
.playlist-song-copy small{color:#9da5b5}
@media(max-width:520px){.composer-meta{font-size:10px}.playlist-add-row{align-items:stretch;flex-direction:column}.playlist-add-row button{width:100%}.composer-submit-row .btn{width:100%}}
.post-music-control{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;margin:8px 0;border:1px solid #ed1c2455;border-radius:12px;background:#ed1c2410}.post-music-play{border:1px solid #ed1c24;border-radius:999px;padding:8px 13px;background:#ed1c24;color:#fff;font-weight:850}.post-music-label{font-size:12px;color:var(--muted);overflow-wrap:anywhere}
`;
socialComposerStyle.textContent += `
.post-mention-composer{position:relative;margin:12px 0;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--panel2)}
.post-mention-composer label{display:block;font-weight:800;margin:0 0 6px}
.post-mention-composer input{margin:0}
.post-mention-suggestions{display:grid;gap:4px;margin-top:6px;padding:6px;border:1px solid var(--line);border-radius:10px;background:var(--panel);max-height:220px;overflow:auto}
.post-mention-option{width:100%;padding:10px;text-align:left;border:0;border-radius:8px;background:var(--panel2);color:var(--fg)}
.post-mention-selected{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.post-mention-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;background:#ed1c2422;border:1px solid #ed1c2466;font-size:13px}
.post-mention-chip button{border:0;background:transparent;color:var(--fg);font-weight:900}
.post-mention-display{margin:8px 0;color:var(--muted);font-size:13px}
.post-mention-display a{color:#ff5960;font-weight:800;text-decoration:none}
`;
document.head.append(socialComposerStyle);
const postCaption=$('post-caption'),postFile=$('post-file'),postPreview=$('post-preview');
function updatePostCaptionCount(){if($('post-caption-count'))$('post-caption-count').textContent=(postCaption?.value.length||0)+'/1500 caracteres'}
let postMusicPreview=null;
const selectedPostMentions=new Map();
const mentionSearch=$('post-mention-search'),mentionSuggestions=$('post-mention-suggestions'),mentionSelected=$('post-mention-selected');
function renderSelectedPostMentions(){
 if(!mentionSelected)return;
 mentionSelected.replaceChildren();
 for(const [id,person] of selectedPostMentions){
  const chip=document.createElement('span');chip.className='post-mention-chip';chip.textContent='@'+person.username+' ';
  const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Remover marcação de '+person.username);
  remove.onclick=()=>{selectedPostMentions.delete(id);renderSelectedPostMentions()};
  chip.append(remove);mentionSelected.append(chip);
 }
}
let mentionSearchSequence=0;
mentionSearch?.addEventListener('input',async()=>{
 const sequence=++mentionSearchSequence,term=mentionSearch.value.trim().replace(/^@/,'').toLowerCase();
 if(!mentionSuggestions)return;
 mentionSuggestions.replaceChildren();
 if(term.length<2){mentionSuggestions.hidden=true;return}
 try{
  const {data,error}=await supabase.from('profiles').select('user_id,username,display_name,avatar_type,avatar_url,avatar_data').eq('is_public',true).ilike('username',term+'%').limit(8);
  if(error)throw error;
  if(sequence!==mentionSearchSequence)return;
  const people=(data||[]).filter(p=>p.user_id!==me?.id&&!selectedPostMentions.has(p.user_id));
  mentionSuggestions.hidden=!people.length;
  for(const person of people){
   const option=document.createElement('button');option.type='button';option.className='post-mention-option';option.setAttribute('role','option');
   const label=document.createElement('span');label.textContent='@'+person.username+' · '+(person.display_name||'Maquinista');
   option.append(label);option.onclick=()=>{selectedPostMentions.set(person.user_id,{username:person.username,display_name:person.display_name});mentionSearch.value='';mentionSuggestions.hidden=true;renderSelectedPostMentions()};
   mentionSuggestions.append(option);
  }
  if(!people.length){mentionSuggestions.hidden=false;const empty=document.createElement('span');empty.className='muted';empty.textContent='Nenhum perfil público encontrado com esse início.';mentionSuggestions.append(empty)}
 }catch(error){if(sequence===mentionSearchSequence){mentionSuggestions.hidden=true;notice('post-status','Não foi possível buscar usuários para marcar.')}}
});

function stopPostMusicPreview(){if(postMusicPreview){postMusicPreview.pause();postMusicPreview.currentTime=0;postMusicPreview=null}const b=$('post-music-preview');if(b)b.textContent='▶ Pré-escutar trecho'}
function renderPostMusicOptions(){const select=$('post-music-song');if(!select)return;const selected=select.value;select.replaceChildren(new Option('Sem música',''));for(const song of allSongs){const option=new Option(song.title+' — '+song.artist_name,song.id);select.add(option)}if(allSongs.some(song=>song.id===selected))select.value=selected;}
$('post-music-song')?.addEventListener('change',()=>{stopPostMusicPreview();notice('post-music-status','Prévia disponível para a faixa selecionada.');});
$('post-music-preview')?.addEventListener('click',async()=>{const song=allSongs.find(item=>item.id===$('post-music-song')?.value);if(!song){notice('post-music-status','Escolha uma música publicada no catálogo.');return}stopPostMusicPreview();const audio=new Audio(song.audio_url);postMusicPreview=audio;const start=Math.max(0,Number($('post-music-start')?.value)||0),duration=Math.min(60,Math.max(5,Number($('post-music-duration')?.value)||15));audio.volume=.8;const button=$('post-music-preview');button.textContent='Ⅱ Reproduzindo…';audio.addEventListener('timeupdate',()=>{if(audio.currentTime>=start+duration){stopPostMusicPreview()}},{once:false});audio.addEventListener('ended',stopPostMusicPreview,{once:true});try{if(audio.readyState<1)await new Promise((resolve,reject)=>{audio.addEventListener('loadedmetadata',resolve,{once:true});audio.addEventListener('error',reject,{once:true});audio.load()});audio.currentTime=Math.min(start,Math.max(0,audio.duration-.1));await audio.play();notice('post-music-status','Prévia de '+duration+' segundos: '+song.title)}catch{stopPostMusicPreview();notice('post-music-status','Não foi possível pré-escutar esta faixa.')}});
postCaption?.addEventListener('input',updatePostCaptionCount);
function clearPostPreview(){if(!postPreview)return;const old=postPreview.querySelector('img,video');if(old?.dataset.objectUrl)URL.revokeObjectURL(old.dataset.objectUrl);postPreview.replaceChildren();postPreview.hidden=true;if($('post-file-name'))$('post-file-name').textContent='Nenhuma mídia selecionada';if($('clear-post-file'))$('clear-post-file').hidden=true}
postFile?.addEventListener('change',()=>{clearPostPreview();stopPostMusicPreview();const file=postFile.files?.[0];const options=$('post-music-options');if(options)options.hidden=!(file&&file.type.startsWith('image/'));if(!file||!file.type.startsWith('image/')){stopPostMusicPreview();if($('post-music-song'))$('post-music-song').value='';}if(!file)return;const url=URL.createObjectURL(file),media=document.createElement(file.type.startsWith('video/')?'video':'img');media.src=url;media.dataset.objectUrl=url;if(media.tagName==='VIDEO'){media.controls=true;media.playsInline=true;media.preload='metadata'}else media.alt='Prévia da publicação';postPreview.append(media);postPreview.hidden=false;$('post-file-name').textContent=file.name;$('clear-post-file').hidden=false;if(options&&!options.hidden)renderPostMusicOptions()});
$('clear-post-file')?.addEventListener('click',()=>{postFile.value='';clearPostPreview();stopPostMusicPreview();if($('post-music-options'))$('post-music-options').hidden=true;if($('post-music-song'))$('post-music-song').value=''});
updatePostCaptionCount();

async function resolveMediaUrls(items){const groups=new Map();for(const item of items||[]){const bucketId=item.bucket_id||'capital-do-trem-social';const list=groups.get(bucketId)||[];list.push(item);groups.set(bucketId,list)}const urls=new Map();await Promise.all([...groups].map(async([bucketId,rows])=>{const {data,error}=await supabase.storage.from(bucketId).createSignedUrls(rows.map(row=>row.storage_path),60*60);if(error)throw error;for(const entry of data||[])if(entry.path&&entry.signedUrl)urls.set(bucketId+':'+entry.path,entry.signedUrl)}));return urls}
function switchTab(tab){document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===tab));if(tab==='feed')loadFeed();if(tab==='midias')renderMedia();if(tab==='buscar')renderPeople(allPeople)}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
let profileImageViewer=null;
function openProfileImage(src,alt){
 if(!src)return;
 if(!profileImageViewer){
  profileImageViewer=document.createElement('div');profileImageViewer.className='profile-image-viewer';profileImageViewer.hidden=true;profileImageViewer.setAttribute('role','dialog');profileImageViewer.setAttribute('aria-modal','true');profileImageViewer.setAttribute('aria-label','Visualização da imagem do perfil');
  const close=document.createElement('button');close.type='button';close.className='profile-image-viewer-close';close.textContent='✕';close.setAttribute('aria-label','Fechar imagem');
  const image=document.createElement('img');image.className='profile-image-viewer-image';image.alt='';
  profileImageViewer.append(close,image);document.body.append(profileImageViewer);
  const dismiss=()=>{profileImageViewer.hidden=true;document.body.classList.remove('profile-image-viewer-open')};
  close.addEventListener('click',dismiss);profileImageViewer.addEventListener('click',e=>{if(e.target===profileImageViewer)dismiss()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!profileImageViewer.hidden)dismiss()});
 }
 const image=profileImageViewer.querySelector('img');image.src=src;image.alt=alt||'Imagem do perfil';profileImageViewer.hidden=false;document.body.classList.add('profile-image-viewer-open');profileImageViewer.querySelector('button').focus();
}
function showProfileImageActions(el,label,onChange){
 const src=el.currentSrc||el.src||'';
 const sheet=document.createElement('div');
 sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label','Opções da '+label);
 sheet.style.cssText='position:fixed;inset:0;z-index:12000;display:flex;align-items:flex-end;justify-content:center;padding:18px;background:#000b';
 const panel=document.createElement('div');
 panel.style.cssText='width:min(420px,100%);padding:18px;border:1px solid #ed1c24;border-radius:18px;background:#101010;color:#fff;box-shadow:0 12px 40px #000c;display:grid;gap:10px';
 const heading=document.createElement('strong');heading.textContent=label==='foto de perfil'?'Foto de perfil':'Foto de capa';heading.style.cssText='font-size:16px;margin-bottom:4px';
 const makeButton=(text,primary,action,disabled=false)=>{const button=document.createElement('button');button.type='button';button.textContent=text;button.disabled=disabled;button.style.cssText='min-height:48px;padding:11px 14px;border:1px solid '+(primary?'#ed1c24':'#444')+';border-radius:11px;background:'+(primary?'#ed1c24':'#202020')+';color:#fff;font:700 14px system-ui;opacity:'+(disabled?'.45':'1');button.addEventListener('click',()=>{sheet.remove();action?.()});return button};
 const close=()=>sheet.remove();
 panel.append(heading,makeButton('Ver imagem ampliada',false,()=>openProfileImage(src,label),!src),makeButton(label==='foto de perfil'?'Trocar foto de perfil':'Trocar foto de capa',true,onChange));
 panel.append(makeButton('Cancelar',false,close));
 sheet.append(panel);sheet.addEventListener('click',event=>{if(event.target===sheet)close()});
 const onKey=event=>{if(event.key==='Escape'&&sheet.isConnected){close();document.removeEventListener('keydown',onKey)}};
 document.addEventListener('keydown',onKey);document.body.append(sheet);
 panel.querySelector('button:not(:disabled)')?.focus();
}
function makeProfileImageOpenable(el,label,onActivate=null){
 if(!el)return;
 el.tabIndex=0;el.setAttribute('role','button');
 const canChange=typeof onActivate==='function';
 el.setAttribute('aria-label',canChange?'Abrir opções da '+label:'Ampliar '+label);
 el.title=canChange?'Toque para ampliar ou trocar':'Toque para ampliar';
 const open=()=>{if(canChange){showProfileImageActions(el,label,onActivate);return;}openProfileImage(el.currentSrc||el.src,label)};
 el.onclick=open;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}};
}
function openProfilePostMedia(src,type,label,buildActions){
 if(!src)return;
 let viewer=document.getElementById('profile-post-media-viewer');
 if(!viewer){
  viewer=document.createElement('div');viewer.id='profile-post-media-viewer';viewer.className='profile-image-viewer';viewer.hidden=true;viewer.setAttribute('role','dialog');viewer.setAttribute('aria-modal','true');viewer.setAttribute('aria-label','Visualização da publicação');
  viewer.style.cssText='z-index:10000;flex-direction:column;align-items:center;justify-content:flex-start;gap:12px;padding:64px 14px 20px';
  const close=document.createElement('button');close.type='button';close.className='profile-image-viewer-close';close.textContent='✕';close.setAttribute('aria-label','Fechar publicação');
  const stage=document.createElement('div');stage.className='profile-post-media-stage';stage.style.cssText='display:flex;align-items:center;justify-content:center;width:100%;flex:1 1 auto;min-height:0;max-height:calc(100dvh - 150px)';
  const actions=document.createElement('div');actions.className='profile-post-media-actions';actions.setAttribute('aria-label','Ações da publicação');
  viewer.append(close,stage,actions);document.body.append(viewer);
  const dismiss=()=>{const active=stage.querySelector('video');if(active){active.pause();active.removeAttribute('src');active.load()}stage.replaceChildren();actions.replaceChildren();viewer.hidden=true;document.body.classList.remove('profile-image-viewer-open')};
  close.addEventListener('click',dismiss);viewer.addEventListener('click',e=>{if(e.target===viewer)dismiss()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!viewer.hidden)dismiss()});
 }
 const stage=viewer.querySelector('.profile-post-media-stage'),actions=viewer.querySelector('.profile-post-media-actions');stage.replaceChildren();actions.replaceChildren();
 let media;
 if(type==='video'){media=document.createElement('video');media.controls=true;media.playsInline=true;media.preload='auto';media.autoplay=true;media.style.cssText='display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;border-radius:10px;background:#000'}
 else{media=document.createElement('img');media.alt=label||'Publicação';media.style.cssText='display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;border-radius:10px;box-shadow:0 12px 48px #000b'}
 media.src=src;stage.append(media);if(typeof buildActions==='function')buildActions(actions);viewer.hidden=false;document.body.classList.add('profile-image-viewer-open');viewer.querySelector('button').focus();if(type==='video')media.play().catch(()=>{});
}
function makeProfilePostMediaOpenable(el,type,label,buildActions){
 if(!el)return;el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',(type==='video'?'Reproduzir vídeo':'Ampliar foto')+' da publicação');el.title='Toque para abrir e ver as opções';
 const open=()=>openProfilePostMedia(el.currentSrc||el.src,type,label,buildActions);el.addEventListener('click',open);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
}
function buildProfileMediaActions(post,item,index,url){
 return container=>{
  const add=(label,handler)=>{const b=document.createElement('button');b.type='button';b.className='btn';b.textContent=label;b.addEventListener('click',handler);container.append(b);return b};
  const like=add('❤️ Curtir',async()=>{like.disabled=true;try{const liked=await api.togglePostLike(post.id);const social=await api.getPostSocial(post.id);like.textContent=(liked?'❤️ Curtido':'❤️ Curtir')+' · '+social.likeCount}catch(e){notice('global-status',e.message||'Não foi possível curtir.')}finally{like.disabled=false}});
  add('💬 Comentar',async()=>{const value=prompt('Escreva seu comentário:');if(!value?.trim())return;try{await api.addPostComment(post.id,value.trim());notice('global-status','Comentário publicado!')}catch(e){notice('global-status',e.message||'Não foi possível comentar.')}});
  const download=add(item.media_type==='video'?'⬇️ Fazer download do vídeo':'⬇️ Fazer download da foto',async()=>{download.disabled=true;try{const ext=(item.storage_path.split('.').pop()||(item.media_type==='video'?'mp4':'jpg')).toLowerCase();await downloadPostMedia(url,'capital-do-trem-'+post.id+'-'+(index+1)+'.'+ext,item.media_type)}catch(e){notice('global-status',e.message||'Não foi possível baixar a mídia.')}finally{download.disabled=false}});
 };
}
function renderProfile(p,stats,own){const avatar=$('profile-avatar');if(avatar)setAvatar(avatar,p);const verifiedSeal=$('profile-verified-seal');if(verifiedSeal){verifiedSeal.hidden=true;if(p.account_type==='artist')supabase.from('artists').select('id').eq('user_id',p.user_id).eq('status','published').maybeSingle().then(({data,error})=>{verifiedSeal.hidden=!!error||!data}).catch(()=>{verifiedSeal.hidden=true})}const cover=$('profile-cover');if(cover){if(p.cover_url){cover.src=p.cover_url;cover.style.objectFit='cover'}else{cover.removeAttribute('src');cover.style.objectFit='cover'}makeProfileImageOpenable(cover,'foto de capa',own?()=>{const input=$('edit-cover');if(input){const editor=$('profile-edit');if(editor)editor.open=true;input.dataset.directImageChange='1';input.click()}}:null)}makeProfileImageOpenable(avatar,'foto de perfil',own?()=>{const input=$('edit-avatar');if(input){const editor=$('profile-edit');if(editor)editor.open=true;input.dataset.directImageChange='1';input.click()}}:null);for(const [id,value] of [['profile-name',p.display_name||'Usuário Uai'],['profile-handle','@'+(p.username||'')],['profile-city',p.city||'Cidade não informada'],['profile-bio',p.bio||''],['stat-posts',stats.posts],['stat-followers',stats.followers],['stat-following',stats.following]]){const el=$(id);if(el)el.textContent=value};for(const [id,kind,label] of [['stat-followers','followers','Abrir lista de seguidores'],['stat-following','following','Abrir lista de perfis seguidos']]){const count=$(id),wrap=$(id+'-wrap');if(count&&wrap){wrap.setAttribute('role','button');wrap.setAttribute('tabindex','0');wrap.setAttribute('aria-label',label);wrap.onclick=()=>showFollowDirectory(kind,p.user_id);wrap.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();showFollowDirectory(kind,p.user_id)}}}}const editor=$('profile-edit');if(editor)editor.hidden=!own;const imageHint=$('profile-image-edit-hint');if(imageHint)imageHint.hidden=!own;const actions=$('profile-actions');if(actions){actions.replaceChildren();if(!own){const b=document.createElement('button');b.className='btn primary';b.textContent='Seguir';b.onclick=()=>toggleFollow(p.user_id,b);actions.append(b)}}}
async function getStats(userId){
 const [posts,followers,following]=await Promise.all([
  supabase.from('posts').select('id',{count:'exact',head:true}).eq('author_id',userId).eq('status','published'),
  supabase.from('profile_follows').select('follower_id',{count:'exact',head:true}).eq('followed_id',userId),
  supabase.from('profile_follows').select('followed_id',{count:'exact',head:true}).eq('follower_id',userId)
 ]);
 // Falha em um contador não pode impedir a abertura do perfil nem dos seus controles.
 return{posts:posts.error?0:(posts.count||0),followers:followers.error?0:(followers.count||0),following:following.error?0:(following.count||0)};
}

async function showFollowDirectory(kind,userId){
 const title=kind==='followers'?'Seguidores':'Seguindo';
 let dialog=document.getElementById('profile-follow-directory');
 if(!dialog){dialog=document.createElement('section');dialog.id='profile-follow-directory';dialog.className='card';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','profile-follow-directory-title');dialog.style.cssText='position:fixed;z-index:1200;inset:8% 14px auto;margin:auto;width:min(520px,calc(100% - 28px));max-height:84vh;overflow:auto;background:var(--panel,#111);border:1px solid var(--red,#ed1c24);border-radius:18px;padding:18px;box-shadow:0 18px 60px #000c';document.body.append(dialog);}
 dialog.replaceChildren();
 const heading=document.createElement('h2');heading.id='profile-follow-directory-title';heading.textContent=title;
 const close=document.createElement('button');close.type='button';close.className='btn';close.textContent='Fechar';close.addEventListener('click',()=>{dialog.hidden=true;});
 const status=document.createElement('p');status.className='muted';status.textContent='Carregando perfis…';
 const search=document.createElement('input');search.type='search';search.placeholder='Buscar por nome ou @usuário…';search.setAttribute('aria-label','Buscar '+title.toLowerCase());search.autocomplete='off';
 const list=document.createElement('div');list.className='follow-directory-list';dialog.append(heading,close,search,status,list);dialog.hidden=false;
 try{
  const column=kind==='followers'?'follower_id':'followed_id';
  const ids=[];const pageSize=500;let from=0;
  while(true){
   const relation=await supabase.from('profile_follows').select(column).eq(kind==='followers'?'followed_id':'follower_id',userId).range(from,from+pageSize-1);
   if(relation.error)throw relation.error;
   const batch=(relation.data||[]).map(row=>row[column]).filter(Boolean);ids.push(...batch);
   if(batch.length<pageSize)break;
   from+=pageSize;
  }
  if(!ids.length){status.textContent=kind==='followers'?'Este perfil ainda não tem seguidores.':'Este perfil ainda não segue outros usuários.';search.hidden=true;return;}
  const peopleRows=[];
  for(let i=0;i<ids.length;i+=100){
   const people=await supabase.from('profiles').select('user_id,display_name,username,city,avatar_type,avatar_url,avatar_data').in('user_id',ids.slice(i,i+100)).eq('is_public',true);
   if(people.error)throw people.error;
   peopleRows.push(...(people.data||[]));
  }
  const people=peopleRows.sort((a,b)=>(a.display_name||a.username||'').localeCompare(b.display_name||b.username||'','pt-BR'));
  function renderMatches(){
   const query=search.value.trim().toLocaleLowerCase('pt-BR');list.replaceChildren();let shown=0;
   for(const person of people){
    const name=person.display_name||'Usuário Uai';const username='@'+(person.username||'');
    if(query&&!((name+' '+username+' '+(person.city||'')).toLocaleLowerCase('pt-BR').includes(query)))continue;
    const row=document.createElement('a');row.className='user-row';row.href='./rede.html?perfil='+encodeURIComponent(person.user_id);row.style.cssText='display:flex;align-items:center;gap:12px;padding:10px 0;color:inherit;text-decoration:none;border-bottom:1px solid var(--line,#333)';
    const avatar=document.createElement('img');avatar.width=44;avatar.height=44;avatar.style.cssText='width:44px;height:44px;border-radius:50%;object-fit:cover';setAvatar(avatar,person);
    const copy=document.createElement('span');copy.className='grow';const label=document.createElement('strong');label.textContent=name;
    const meta=document.createElement('small');meta.className='muted';meta.textContent=username+(person.city?' · '+person.city:'');
    copy.append(label,document.createElement('br'),meta);row.append(avatar,copy);list.append(row);shown++;
   }
   if(!shown){const empty=document.createElement('p');empty.className='muted';empty.textContent='Nenhum perfil encontrado com essa pesquisa.';list.append(empty);}
   status.textContent=shown+' perfil(is) encontrado(s).';
  }
  search.addEventListener('input',renderMatches);renderMatches();
 }catch(error){status.textContent=error?.message||'Não foi possível carregar essa lista agora.';}
}

let profileLoadStage='inicialização';
function setProfileLoadStage(stage){
 profileLoadStage=stage;
 const root=$('profile-posts');
 if(root&&!root.querySelector('.profile-load-error')){
  const status=root.querySelector('.empty');
  if(status)status.textContent=stage;
 }
}
function showProfileLoadError(error){
 const root=$('profile-posts');
 const heading=$('profile-name');
 if(heading)heading.textContent='Perfil indisponível';
 const handle=$('profile-handle');if(handle)handle.textContent='';
 const city=$('profile-city');if(city)city.textContent='';
 const bio=$('profile-bio');if(bio)bio.textContent='';
 if(!root)return;
 root.replaceChildren();
 const message=document.createElement('p');message.className='status profile-load-error';message.setAttribute('role','alert');
 message.textContent='Falha ao '+profileLoadStage.toLowerCase()+': '+(error?.message||'verifique a conexão e tente novamente.');
 const retry=document.createElement('button');retry.type='button';retry.className='btn primary';retry.textContent='↻ Tentar carregar perfil novamente';
 retry.addEventListener('click',async()=>{retry.disabled=true;retry.textContent='Carregando…';try{await loadMyProfile()}catch(e){showProfileLoadError(e)}finally{retry.disabled=false;retry.textContent='↻ Tentar carregar perfil novamente'}});
 root.append(message,retry);
}
function withProfileTimeout(promise,milliseconds,label){
 let timer;
 return Promise.race([
  Promise.resolve(promise),
  new Promise((_,reject)=>{timer=window.setTimeout(()=>reject(new Error(label)),milliseconds)})
 ]).finally(()=>window.clearTimeout(timer));
}
async function loadMyProfile(){
 setProfileLoadStage('verificar a sessão');
 const session=await withProfileTimeout(api.getCurrentSession(),8000,'A sessão demorou para responder. Verifique a conexão e tente novamente.');
 if(!session){location.href='./conta.html?retorno=rede';return}
 me=session.user;
 const requested=new URLSearchParams(location.search).get('perfil');
 if(requested&&requested!==me.id){
  const query=await withProfileTimeout(
   supabase.from('profiles').select('user_id,display_name,username,account_type,bio,city,is_public,avatar_type,avatar_url,avatar_data,cover_url,cover_path').eq('user_id',requested).eq('is_public',true).maybeSingle(),
   10000,'O perfil público demorou para responder.'
  );
  if(query.error)throw query.error;
  if(!query.data)throw new Error('Este perfil não está público ou não foi encontrado.');
  profile=query.data;currentProfileUserId=requested;
  renderProfile(profile,{posts:0,followers:0,following:0},false);
  const editor=$('profile-edit');if(editor)editor.hidden=true;
  const statsPromise=withProfileTimeout(getStats(requested),8000,'Os contadores do perfil demoraram para responder.').catch(()=>({posts:0,followers:0,following:0}));
  await withProfileTimeout(loadProfilePosts(requested),15000,'As publicações do perfil demoraram para carregar.');
  const stats=await statsPromise;
  for(const [id,value] of [['stat-posts',stats.posts],['stat-followers',stats.followers],['stat-following',stats.following]]){const el=$(id);if(el)el.textContent=value}
  return;
 }
 setProfileLoadStage('buscar os dados da conta');
 profile=await withProfileTimeout(api.getMyBasicProfile(),10000,'Os dados do seu perfil demoraram para responder. Verifique a conexão e tente novamente.');
 currentProfileUserId=me.id;
 // getMyBasicProfile já inclui avatar e capa: não fazemos uma segunda consulta redundante.
 renderProfile(profile,{posts:0,followers:0,following:0},true);
 for(const [id,value] of [['edit-name',profile.display_name||''],['edit-username',profile.username||''],['edit-city',profile.city||''],['edit-bio',profile.bio||'']]){const el=$(id);if(el)el.value=value}
 const publicField=$('edit-public');if(publicField)publicField.checked=!!profile.is_public;
 setProfileLoadStage('carregar as publicações');
 const statsPromise=withProfileTimeout(getStats(me.id),8000,'Os contadores do perfil demoraram para responder.').catch(()=>({posts:0,followers:0,following:0}));
 await withProfileTimeout(loadProfilePosts(me.id),15000,'As publicações do perfil demoraram para carregar.');
 const stats=await statsPromise;
 for(const [id,value] of [['stat-posts',stats.posts],['stat-followers',stats.followers],['stat-following',stats.following]]){const el=$(id);if(el)el.textContent=value}
}
let activeProfileView='posts';
async function loadProfilePosts(userId,view=activeProfileView){activeProfileView=view;document.querySelectorAll('[data-profile-view]').forEach(b=>b.classList.toggle('active',b.dataset.profileView===view));const grid=$('profile-posts');grid.innerHTML='<p class="empty">Carregando…</p>';
if(view==='music'){
 grid.replaceChildren();
 if(me?.id===userId){
  const heading=document.createElement('div');heading.className='profile-playlists-heading';
  const headingText=document.createElement('strong');headingText.textContent='♫ Minhas playlists';
  const create=document.createElement('button');create.type='button';create.className='btn primary profile-playlist-create';create.textContent='＋ Criar playlist';
  create.addEventListener('click',async()=>{const name=prompt('Nome da nova playlist:');if(name===null)return;try{await api.createMyPlaylist(name);notice('profile-playlist-status','Playlist criada!');await loadProfilePosts(userId,'music')}catch(e){notice('profile-playlist-status',e.message||'Não foi possível criar a playlist.')}});
  heading.append(headingText,create);grid.append(heading);
  const status=document.createElement('p');status.id='profile-playlist-status';status.className='status';status.setAttribute('role','status');grid.append(status);
  try{
   const playlists=await api.getMyPlaylists();
   if(!playlists.length){const empty=document.createElement('p');empty.className='empty profile-playlist-empty';empty.textContent='Você ainda não criou uma playlist. Toque em + Criar playlist para começar.';grid.append(empty)}
   if(!allSongs.length)allSongs=await api.getPublishedSongs();
   const songById=new Map(allSongs.map(song=>[song.id,song]));
   for(const playlist of playlists){
    const card=document.createElement('section');card.className='profile-playlist-card';
    const title=document.createElement('h3');title.textContent=playlist.name;card.append(title);
    const list=document.createElement('div');list.className='profile-playlist-track-list';
    for(const entry of playlist.songs){
     const song=songById.get(entry.song_id);if(!song)continue;
     const row=document.createElement('div');row.className='profile-playlist-track';
     const copy=document.createElement('div');copy.className='profile-playlist-track-copy';
     const songTitle=document.createElement('strong');songTitle.textContent=song.title||'Faixa sem título';
     const artist=document.createElement('span');artist.textContent=song.artist_name||'Artista da comunidade';
     copy.append(songTitle,artist);
     const play=document.createElement('button');play.type='button';play.className='profile-playlist-play';play.textContent='▶';play.setAttribute('aria-label','Tocar '+(song.title||'música'));
     play.addEventListener('click',()=>{musicPlayer.playSong(song);$('rede-music-player')?.scrollIntoView({behavior:'smooth',block:'center'})});
     row.append(copy,play);list.append(row);
    }
    if(!list.children.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='Adicione músicas a esta playlist pela área de Músicas.';list.append(empty)}
    card.append(list);grid.append(card);
   }
  }catch(e){const error=document.createElement('p');error.className='status';error.textContent='Não foi possível carregar suas playlists: '+(e.message||'Tente novamente.');grid.append(error)}
  return;
 }
 const songs=await api.getPublishedSongsForProfile(userId);
 let viewerSession=null,viewerPlaylists=[];
 try{viewerSession=await api.getCurrentSession();if(viewerSession?.user)viewerPlaylists=await api.getMyPlaylists()}catch(error){console.warn('Não foi possível carregar as playlists para este perfil.',error)}
 const playlistStatus=document.createElement('p');playlistStatus.className='status';playlistStatus.setAttribute('role','status');playlistStatus.setAttribute('aria-live','polite');grid.append(playlistStatus);
 for(const song of songs){
  const card=document.createElement('article');card.className='song-card profile-song-card';
  const cover=document.createElement('div');cover.className='song-cover';
  const coverTitle=document.createElement('span');coverTitle.textContent=song.title||'CAPITAL DO TREM';cover.append(coverTitle);
  const title=document.createElement('strong');title.className='song-title';title.textContent=song.title;
  const artist=document.createElement('p');artist.className='muted song-artist';artist.textContent=[song.artist_name,song.producer_name].filter(Boolean).join(' • ');
  const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.src=song.audio_url;
  card.append(cover,title,artist,audio);
  if(viewerSession?.user){
   const add=document.createElement('button');add.type='button';add.className='btn alt';add.textContent='＋ Adicionar à minha playlist';add.disabled=!viewerPlaylists.length;
   if(!viewerPlaylists.length)add.title='Crie uma playlist na área AQUI A MÚSICA NÃO PARA! primeiro';
   add.addEventListener('click',async()=>{
    if(!viewerPlaylists.length){playlistStatus.textContent='Você ainda não tem playlists. Crie uma na área AQUI A MÚSICA NÃO PARA! e volte aqui para adicionar esta faixa.';return}
    const choices=viewerPlaylists.map((item,index)=>(index+1)+'. '+item.name).join('\n');
    const choice=prompt('Escolha a playlist para adicionar esta música:\n'+choices+'\nDigite o número:');
    if(choice===null)return;
    const selected=viewerPlaylists[Number(choice)-1];
    if(!selected){playlistStatus.textContent='Escolha um número válido.';return}
    add.disabled=true;
    try{const added=await api.addSongToMyPlaylist(selected.id,song.id);playlistStatus.textContent=added?'Música adicionada à playlist “'+selected.name+'”.':'Esta música já está nessa playlist.'}
    catch(error){playlistStatus.textContent=error.message||'Não foi possível adicionar a música.'}
    finally{add.disabled=false}
   });
   card.append(add);
  }else{
   const login=document.createElement('a');login.className='btn alt';login.href='./conta.html';login.textContent='Entre para adicionar à playlist';card.append(login);
  }
  grid.append(card);
 }
 if(!songs.length)grid.innerHTML='<p class="empty">As músicas publicadas por este artista aparecerão aqui.</p>';
 return;
}
let postsQ;if(view==='likes'){const liked=await supabase.from('post_likes').select('post_id').eq('user_id',userId).order('created_at',{ascending:false}).limit(100);if(liked.error)throw liked.error;const ids=(liked.data||[]).map(x=>x.post_id);postsQ=ids.length?await supabase.from('posts').select('id,content,created_at').in('id',ids).eq('status','published'):{data:[],error:null};}else postsQ=await supabase.from('posts').select('id,content,created_at').eq('author_id',userId).eq('status','published').order('created_at',{ascending:false}).limit(60);if(postsQ.error)throw postsQ.error;const data=postsQ.data||[];const ids=data.map(x=>x.id);let media=[];if(ids.length){const q=await supabase.from('post_media').select('post_id,storage_path,media_type,bucket_id').in('post_id',ids).order('sort_order');if(q.error)throw q.error;media=q.data||[]}const visibleMedia=media.filter(m=>view==='videos'?m.media_type==='video':view==='photos'?m.media_type!=='video':true);const urls=await resolveMediaUrls(visibleMedia);const postMusic=await loadPostMusic(supabase,ids);grid.replaceChildren();const mediaByPost=new Map();for(const item of visibleMedia){const list=mediaByPost.get(item.post_id)||[];list.push(item);mediaByPost.set(item.post_id,list)}for(const post of data){const postMedia=mediaByPost.get(post.id)||[];if(!postMedia.length)continue;for(let index=0;index<postMedia.length;index++){const item=postMedia[index],url=urls.get((item.bucket_id||'capital-do-trem-social')+':'+item.storage_path)||'',isVideo=item.media_type==='video';const card=document.createElement('article');card.className='profile-post-card profile-media-tile';const el=document.createElement(isVideo?'video':'img');el.src=url;if(isVideo){el.controls=false;el.muted=true;el.preload='metadata';el.playsInline=true;el.setAttribute('webkit-playsinline','');el.addEventListener('loadedmetadata',()=>{if(Number.isFinite(el.duration)&&el.duration>0)el.currentTime=Math.min(.2,el.duration/2)},{once:true});el.addEventListener('seeked',()=>el.classList.add('has-video-preview'),{once:true});el.addEventListener('error',()=>el.classList.add('video-preview-unavailable'),{once:true});el.load()}else el.alt=post.content||'Publicação';makeProfilePostMediaOpenable(el,isVideo?'video':'image',post.content||(isVideo?'Vídeo da publicação':'Foto da publicação'),buildProfileMediaActions(post,item,index,url));const kind=document.createElement('span');kind.className='profile-media-kind'+(isVideo?' is-video':postMedia.length>1?' is-carousel':'');kind.textContent=isVideo?'▶':postMedia.length>1?'▣':'▧';card.append(el,kind);grid.append(card)}}if(!grid.children.length)grid.innerHTML='<p class="empty">'+(view==='likes'?'As publicações curtidas aparecerão aqui.':view==='videos'?'Seus vídeos publicados aparecerão aqui.':'Suas fotos aparecerão aqui.')+'</p>'}
document.querySelectorAll('[data-profile-view]').forEach(b=>b.addEventListener('click',()=>loadProfilePosts(currentProfileUserId||profile?.user_id,b.dataset.profileView).catch(e=>notice('global-status',e.message))));
async function toggleFollow(target,button){if(!me){notice('global-status','Entre na sua conta para seguir perfis.');return}button.disabled=true;try{const existing=await supabase.from('profile_follows').select('follower_id').eq('follower_id',me.id).eq('followed_id',target).maybeSingle();if(existing.error)throw existing.error;if(existing.data){const r=await supabase.from('profile_follows').delete().eq('follower_id',me.id).eq('followed_id',target);if(r.error)throw r.error;button.textContent='Seguir'}else{const r=await supabase.from('profile_follows').insert({follower_id:me.id,followed_id:target});if(r.error)throw r.error;button.textContent='Seguindo'} }catch(e){notice('global-status',e.message||'Não foi possível atualizar seguidores.')}finally{button.disabled=false}}
const avatarPicker=$('edit-avatar'),coverPicker=$('edit-cover'),profileCoverPreview=$('profile-cover'),profileAvatarPreview=$('profile-avatar');let avatarPreviewUrl=null,coverPreviewUrl=null;
function previewGalleryImage(input,target,kind){input?.addEventListener('change',()=>{const file=input.files?.[0];if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)){notice('profile-edit-status','Escolha uma imagem JPG, PNG ou WebP da galeria.');input.value='';return}if(kind==='avatar'&&file.size>5*1024*1024){notice('profile-edit-status','A foto de perfil deve ter até 5 MB.');input.value='';return}if(kind==='cover'&&file.size>5*1024*1024){notice('profile-edit-status','A foto de capa deve ter até 5 MB.');input.value='';return}const previous=kind==='avatar'?avatarPreviewUrl:coverPreviewUrl;if(previous)URL.revokeObjectURL(previous);const url=URL.createObjectURL(file);if(kind==='avatar')avatarPreviewUrl=url;else coverPreviewUrl=url;if(target)target.src=url;if(kind==='cover')$('cover-preset').value='';notice('profile-edit-status','Prévia carregada. Toque em “Salvar perfil” para confirmar.');});}
previewGalleryImage(avatarPicker,profileAvatarPreview,'avatar');previewGalleryImage(coverPicker,profileCoverPreview,'cover');
async function saveDirectProfileImage(input,kind){
 input?.addEventListener('change',async()=>{
  if(input.dataset.directImageChange!=='1')return;
  input.dataset.directImageChange='0';
  const file=input.files?.[0];if(!file)return;
  input.disabled=true;notice('profile-edit-status','Atualizando sua '+(kind==='avatar'?'foto de perfil':'foto de capa')+'…');
  try{
   if(kind==='avatar'){
    const uploaded=await api.uploadMyAvatar(file);
    const saved=await api.saveMyAvatar({type:'photo',path:uploaded.path});
    profile={...profile,...saved};
   }else{
    const saved=await api.uploadMyCover(file);
    profile={...profile,...saved};
   }
   if(avatarPreviewUrl){URL.revokeObjectURL(avatarPreviewUrl);avatarPreviewUrl=null;}
   if(coverPreviewUrl){URL.revokeObjectURL(coverPreviewUrl);coverPreviewUrl=null;}
   await loadMyProfile();
   notice('profile-edit-status','Imagem atualizada e salva no seu perfil!');
  }catch(error){notice('profile-edit-status',error.message||'Não foi possível atualizar a imagem. Tente novamente.');}
  finally{input.disabled=false;input.value='';}
 });
}
saveDirectProfileImage(avatarPicker,'avatar');
saveDirectProfileImage(coverPicker,'cover');
$('cover-preset')?.addEventListener('change',()=>{const value=$('cover-preset').value;if(value){if(profileCoverPreview)profileCoverPreview.src=makeCoverPreset(value);if(coverPicker)coverPicker.value='';if(coverPreviewUrl){URL.revokeObjectURL(coverPreviewUrl);coverPreviewUrl=null}}});
$('edit-username')?.addEventListener('blur',async()=>{const candidate=$('edit-username').value.trim().toLowerCase();if(!candidate||candidate===String(profile?.username||'').toLowerCase())return;try{const available=await api.isUsernameAvailable(candidate);notice('profile-edit-status',available?'Nome de usuário disponível.':'Este nome de usuário já está em uso.');}catch(error){notice('profile-edit-status',error.message||'Não foi possível verificar o nome de usuário.');}});
$('save-profile').addEventListener('click',async()=>{const b=$('save-profile');b.disabled=true;notice('profile-edit-status','Salvando…');try{const desiredUsername=$('edit-username').value.trim().toLowerCase();if(desiredUsername&&desiredUsername!==String(profile?.username||'').toLowerCase()&&!(await api.isUsernameAvailable(desiredUsername)))throw new Error('Este nome de usuário já está em uso. Escolha outro.');const avatarFile=$('edit-avatar').files[0],coverFile=$('edit-cover').files[0],coverPreset=$('cover-preset').value;if(avatarFile){const uploaded=await api.uploadMyAvatar(avatarFile);await api.saveMyAvatar({type:'photo',path:uploaded.path});$('edit-avatar').value=''}if(coverFile){const allowed=['image/jpeg','image/png','image/webp'];if(!allowed.includes(coverFile.type)||coverFile.size<1||coverFile.size>5*1024*1024)throw new Error('A capa deve ser JPG, PNG ou WebP de até 5 MB.');const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[coverFile.type],path=me.id+'/cover/'+crypto.randomUUID()+'.'+ext;const up=await supabase.storage.from('capital-do-trem-media').upload(path,coverFile,{contentType:coverFile.type,cacheControl:'3600',upsert:false});if(up.error)throw up.error;const {data:pub}=supabase.storage.from('capital-do-trem-media').getPublicUrl(path);const oldPath=profile.cover_path;const saved=await supabase.from('profiles').update({cover_url:pub.publicUrl,cover_path:path}).eq('user_id',me.id);if(saved.error){await supabase.storage.from('capital-do-trem-media').remove([path]);throw saved.error}if(oldPath&&oldPath.startsWith(me.id+'/cover/'))await supabase.storage.from('capital-do-trem-media').remove([oldPath]);$('edit-cover').value=''}else if(coverPreset){const oldPath=profile.cover_path;const saved=await supabase.from('profiles').update({cover_url:makeCoverPreset(coverPreset),cover_path:null}).eq('user_id',me.id);if(saved.error)throw saved.error;if(oldPath&&oldPath.startsWith(me.id+'/cover/'))await supabase.storage.from('capital-do-trem-media').remove([oldPath])}const savedProfile=await api.saveMyBasicProfile({display_name:$('edit-name').value.trim(),username:$('edit-username').value.trim()||profile.username,account_type:profile.account_type,bio:$('edit-bio').value.trim(),city:$('edit-city').value.trim(),is_public:$('edit-public').checked});profile={...profile,...savedProfile};await loadMyProfile();$('cover-preset').value='';notice('profile-edit-status','Perfil atualizado!')}catch(e){notice('profile-edit-status',e.message||'Não foi possível salvar o perfil.')}finally{b.disabled=false}});
async function downloadPostMedia(url,filename,mediaType){
 if(!url)throw new Error('Mídia indisponível para download.');
 notice('global-status',mediaType==='video'?'Preparando vídeo com a marca oficial. Mantenha o aplicativo aberto…':'Preparando foto com a marca oficial…');
 const response=await fetch(url);if(!response.ok)throw new Error('Não foi possível baixar esta mídia.');
 const original=await response.blob();let blob,downloadName=filename||'capital-do-trem-midia';
 if(mediaType==='video'){
  const {createWatermarkedVideo}=await import('./media-watermark.js');blob=await createWatermarkedVideo(original);downloadName=downloadName.replace(/\\.[^.]+$/i,'.webm');
 }else{
  const {createWatermarkedImage}=await import('./media-watermark.js');blob=await createWatermarkedImage(original);
  downloadName=downloadName.replace(/\\.(jpe?g|png|webp)$/i,blob.type==='image/png'?'.png':blob.type==='image/webp'?'.webp':'.jpg');
 }
 const objectUrl=URL.createObjectURL(blob),link=document.createElement('a');link.href=objectUrl;link.download=downloadName;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),1500);
 notice('global-status','Download concluído com a marca oficial do CAPITAL DO TREM.');
}
const feedAutoplayAllowed=()=>document.visibilityState==='visible'&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches&&!navigator.connection?.saveData;
function pauseFeedVideos(){document.querySelectorAll('video[data-feed-autoplay]').forEach(video=>video.pause())}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible')pauseFeedVideos()});window.addEventListener('pagehide',pauseFeedVideos);
function setupFeedVideoAutoplay(video){video.muted=true;video.playsInline=true;video.preload='none';video.controls=true;video.dataset.feedAutoplay='true';}
const feedVideoObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries){const video=entry.target;if(entry.isIntersecting&&entry.intersectionRatio>=0.6&&feedAutoplayAllowed()){video.muted=true;document.querySelectorAll('video[data-feed-autoplay]').forEach(other=>{if(other!==video)other.pause()});video.preload='metadata';video.play().catch(()=>{video.dataset.autoplayBlocked='true'});}else video.pause();}},{threshold:[0,0.6,1]}):null;
async function loadFeed(){const root=$('feed-list');root.innerHTML='<p class="empty">Carregando…</p>';try{const {data,error}=await supabase.from('posts').select('id,author_id,content,created_at').eq('status','published').order('created_at',{ascending:false}).limit(30);if(error)throw error;allPosts=data||[];const ids=allPosts.map(p=>p.id),authors=[...new Set(allPosts.map(p=>p.author_id))];const [mediaQ,peopleQ,savedRows,mentionsQ]=await Promise.all([ids.length?supabase.from('post_media').select('post_id,storage_path,media_type,bucket_id').in('post_id',ids).order('sort_order'):{data:[]},authors.length?supabase.from('profiles').select('user_id,display_name,username,avatar_type,avatar_url,avatar_data').in('user_id',authors):{data:[]},api.getMySavedPosts().catch(()=>[]),ids.length?supabase.from('post_mentions').select('post_id,mentioned_user_id').in('post_id',ids):{data:[]}]);if(mediaQ.error)throw mediaQ.error;if(peopleQ.error)throw peopleQ.error;if(mentionsQ.error)throw mentionsQ.error;const savedIds=new Set((savedRows||[]).map(p=>p.id));const people=new Map((peopleQ.data||[]).map(p=>[p.user_id,p]));const mentionedIds=[...new Set((mentionsQ.data||[]).map(m=>m.mentioned_user_id))];const mentionedQ=mentionedIds.length?await supabase.from('profiles').select('user_id,username,display_name').in('user_id',mentionedIds):{data:[]};if(mentionedQ.error)throw mentionedQ.error;const mentionedPeople=new Map((mentionedQ.data||[]).map(p=>[p.user_id,p]));const mentionsByPost=new Map();for(const m of mentionsQ.data||[]){const arr=mentionsByPost.get(m.post_id)||[];const person=mentionedPeople.get(m.mentioned_user_id);if(person){arr.push(person);mentionsByPost.set(m.post_id,arr)}}const mediaUrls=await resolveMediaUrls(mediaQ.data||[]);const postMusic=await loadPostMusic(supabase,ids);const mediaByPost=new Map();for(const m of mediaQ.data||[]){const arr=mediaByPost.get(m.post_id)||[];arr.push({...m,url:mediaUrls.get((m.bucket_id||'capital-do-trem-social')+':'+m.storage_path)});mediaByPost.set(m.post_id,arr)}root.replaceChildren();for(const post of allPosts){const p=people.get(post.author_id)||{display_name:'Usuário Uai'};const card=document.createElement('article');card.className='card';const head=document.createElement('div');head.className='post-head';const profileLink=document.createElement('a');profileLink.href='./rede.html?perfil='+encodeURIComponent(post.author_id);profileLink.style.cssText='display:flex;align-items:center;gap:9px;color:inherit;text-decoration:none;min-width:0';const img=document.createElement('img');setAvatar(img,p);const name=document.createElement('strong');name.textContent=p.display_name||'Usuário Uai';profileLink.append(img,name);head.append(profileLink);card.append(head);const text=document.createElement('p');text.textContent=post.content;card.append(text);const tagged=mentionsByPost.get(post.id)||[];if(tagged.length){const tags=document.createElement('p');tags.className='post-mention-display';const prefix=document.createTextNode('👥 Com ');tags.append(prefix);tagged.forEach((person,index)=>{if(index)tags.append(document.createTextNode(', '));const link=document.createElement('a');link.href='./rede.html?perfil='+encodeURIComponent(person.user_id);link.textContent='@'+person.username;tags.append(link)});card.append(tags)}const postMedia=mediaByPost.get(post.id)||[];for(const m of postMedia){const el=document.createElement(m.media_type==='video'?'video':'img');el.className='post-media';el.src=m.url||'';if(m.media_type==='video'){setupFeedVideoAutoplay(el);feedVideoObserver?.observe(el)}else{el.alt=post.content;el.tabIndex=0;el.title='Toque para ampliar (opcional)';makeProfilePostMediaOpenable(el,'image',post.content||'Publicação do Feed')}card.append(el)}if(postMusic.has(post.id))card.append(createPostMusicControl(postMusic.get(post.id)));const actions=document.createElement('div');actions.className='post-actions';const like=document.createElement('button');like.textContent='❤️ Curtir';like.onclick=async()=>{like.disabled=true;try{const liked=await api.togglePostLike(post.id);const social=await api.getPostSocial(post.id);like.textContent=(liked?'❤️ Curtido':'❤️ Curtir')+' · '+social.likeCount}catch(e){notice('global-status',e.message)}finally{like.disabled=false}};const comments=document.createElement('button');comments.textContent='💬 Comentários';const save=document.createElement('button');save.textContent=savedIds.has(post.id)?'🔖 Salvo':'🔖 Salvar';save.onclick=async()=>{save.disabled=true;try{const saved=await api.toggleSavedPost(post.id);if(saved)savedIds.add(post.id);else savedIds.delete(post.id);save.textContent=saved?'🔖 Salvo':'🔖 Salvar';notice('global-status',saved?'Publicação salva na sua coleção!':'Publicação removida dos salvos.')}catch(e){notice('global-status',e.message)}finally{save.disabled=false}};actions.append(like,comments,save);
if(me?.id===post.author_id){
 const editPost=document.createElement('button');editPost.type='button';editPost.textContent='✏️ Editar publicação';
 editPost.onclick=async()=>{const value=prompt('Edite o texto da publicação:',post.content||'');if(value===null)return;editPost.disabled=true;try{const updated=await api.updateMyPost(post.id,value);post.content=updated.content;text.textContent=updated.content;notice('global-status','Publicação atualizada!')}catch(e){notice('global-status',e.message||'Não foi possível editar a publicação.')}finally{editPost.disabled=false}};
 const deletePost=document.createElement('button');deletePost.type='button';deletePost.textContent='🗑️ Excluir publicação';
 deletePost.onclick=async()=>{if(!confirm('Excluir esta publicação e suas mídias? Esta ação não pode ser desfeita.'))return;deletePost.disabled=true;try{await api.deleteMyPost(post.id);card.remove();notice('global-status','Publicação excluída.')}catch(e){notice('global-status',e.message||'Não foi possível excluir a publicação.')}finally{deletePost.disabled=false}};
 actions.append(editPost,deletePost);
}for(let index=0;index<postMedia.length;index++){const m=postMedia[index];const download=document.createElement('button');download.textContent=m.media_type==='video'?'⬇️ Baixar vídeo':'⬇️ Baixar foto';download.onclick=async()=>{download.disabled=true;try{const ext=(m.storage_path.split('.').pop()|| (m.media_type==='video'?'mp4':'jpg')).toLowerCase();await downloadPostMedia(m.url,'capital-do-trem-'+post.id+'-'+(index+1)+'.'+ext,m.media_type)}catch(e){notice('global-status',e.message)}finally{download.disabled=false}};actions.append(download)}card.append(actions);const commentPanel=document.createElement('div');commentPanel.hidden=true;commentPanel.style.cssText='margin-top:10px;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--panel2)';const commentList=document.createElement('div');commentList.className='post-comments-list';const commentInput=document.createElement('textarea');commentInput.rows=2;commentInput.maxLength=1000;commentInput.placeholder='Escreva um comentário…';const sendComment=document.createElement('button');sendComment.className='btn primary';sendComment.textContent='Publicar comentário';const renderComments=items=>{commentList.replaceChildren();for(const item of items){
 const row=document.createElement('div');row.style.cssText='padding:8px 0;margin:0;border-bottom:1px solid var(--line);overflow-wrap:anywhere';
 const author=document.createElement('strong');author.textContent=(item.author_name||'Maquinista')+': ';
 const content=document.createElement('span');content.textContent=item.content;row.append(author,content);
 if(me?.id===item.author_id){
  const tools=document.createElement('div');tools.style.cssText='display:flex;gap:6px;margin-top:6px;flex-wrap:wrap';
  const edit=document.createElement('button');edit.type='button';edit.className='btn alt';edit.textContent='✏️ Editar comentário';
  edit.onclick=async()=>{const value=prompt('Edite seu comentário:',item.content||'');if(value===null)return;edit.disabled=true;try{await api.updateMyPostComment(item.id,value);const social=await api.getPostSocial(post.id);renderComments(social.comments);comments.textContent='💬 Comentários · '+social.comments.length;notice('global-status','Comentário atualizado!')}catch(e){notice('global-status',e.message||'Não foi possível editar o comentário.')}finally{edit.disabled=false}};
  const remove=document.createElement('button');remove.type='button';remove.className='btn alt';remove.textContent='🗑️ Excluir comentário';
  remove.onclick=async()=>{if(!confirm('Excluir seu comentário?'))return;remove.disabled=true;try{await api.deleteMyPostComment(item.id);const social=await api.getPostSocial(post.id);renderComments(social.comments);comments.textContent='💬 Comentários · '+social.comments.length;notice('global-status','Comentário excluído.')}catch(e){notice('global-status',e.message||'Não foi possível excluir o comentário.')}finally{remove.disabled=false}};
  tools.append(edit,remove);row.append(tools);
 }
 commentList.append(row);
 }if(!items.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='Seja o primeiro a comentar.';commentList.append(empty)}};comments.onclick=async()=>{commentPanel.hidden=!commentPanel.hidden;if(!commentPanel.hidden&&!commentPanel.dataset.loaded){try{const social=await api.getPostSocial(post.id);renderComments(social.comments);commentPanel.dataset.loaded='1';comments.textContent='💬 Comentários · '+social.comments.length}catch(e){notice('global-status',e.message)}}};sendComment.onclick=async()=>{sendComment.disabled=true;try{await api.addPostComment(post.id,commentInput.value);commentInput.value='';const social=await api.getPostSocial(post.id);renderComments(social.comments);commentPanel.dataset.loaded='1';comments.textContent='💬 Comentários · '+social.comments.length;notice('global-status','Comentário publicado!')}catch(e){notice('global-status',e.message)}finally{sendComment.disabled=false}};commentPanel.append(commentList,commentInput,sendComment);card.append(commentPanel);root.append(card)}if(!root.children.length)root.innerHTML='<p class="empty">Ainda não há publicações. Seja o primeiro a compartilhar!</p>'}catch(e){root.textContent='Não foi possível carregar o feed: '+e.message}}
$('publish-post').addEventListener('click',async()=>{const b=$('publish-post'),file=$('post-file').files[0],caption=$('post-caption').value.trim(),songId=$('post-music-song')?.value||'',song=allSongs.find(item=>item.id===songId);if(!caption&&!file){notice('post-status','Escreva uma mensagem ou escolha uma foto/vídeo.');return}if(songId&&(!file||!file.type.startsWith('image/'))){notice('post-status','A música só pode ser adicionada a uma publicação com foto.');return}if(songId&&!song){notice('post-status','A música escolhida não está mais disponível no catálogo.');return}b.disabled=true;notice('post-status','Publicando sua novidade…');let path=null;try{const {data:{user},error:userError}=await supabase.auth.getUser();if(userError)throw userError;if(!user)throw new Error('Entre na conta para publicar.');if(file){const allowed=['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'];if(!allowed.includes(file.type))throw new Error('Formato de mídia não aceito.');const maxBytes=file.type.startsWith('image/')?10*1024*1024:50*1024*1024;if(file.size<1||file.size>maxBytes)throw new Error(file.type.startsWith('image/')?'A foto deve ter até 10 MB.':'O vídeo deve ter até 50 MB.');}const post=await api.submitMyPost(caption||'📸 Nova publicação na Capital do Trem');if(selectedPostMentions.size){const mentionRows=[...selectedPostMentions.keys()].map(mentioned_user_id=>({post_id:post.id,mentioned_user_id,mentioned_by:user.id}));const mentionInsert=await supabase.from('post_mentions').insert(mentionRows);if(mentionInsert.error){try{await api.deleteMyPost(post.id)}catch(rollbackError){throw new Error('Não foi possível salvar as marcações e a publicação ficou criada. Tente excluí-la pelo menu da publicação. '+(rollbackError.message||''))}throw new Error('As marcações não puderam ser salvas. A publicação foi cancelada para não ficar incompleta. '+mentionInsert.error.message)}}if(file){const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'})[file.type];path=user.id+'/posts/'+crypto.randomUUID()+'.'+ext;const up=await supabase.storage.from('capital-do-trem-social').upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});if(up.error)throw up.error;const row=await supabase.from('post_media').insert({post_id:post.id,owner_id:user.id,bucket_id:'capital-do-trem-social',storage_path:path,media_type:file.type.startsWith('video/')?'video':'image',mime_type:file.type,byte_size:file.size,alt_text:caption.slice(0,200)});if(row.error)throw row.error;if(song){const musicRow=await supabase.from('post_music').insert({post_id:post.id,song_id:song.id,start_seconds:Math.max(0,Number($('post-music-start').value)||0),duration_seconds:Math.min(60,Math.max(5,Number($('post-music-duration').value)||15)),volume:0.8});if(musicRow.error)throw new Error('A foto foi publicada, mas a música não foi anexada. Confirme se a atualização do banco foi aplicada. '+musicRow.error.message)}}$('post-caption').value='';$('post-file').value='';selectedPostMentions.clear();renderSelectedPostMentions();if(mentionSearch)mentionSearch.value='';if(mentionSuggestions)mentionSuggestions.hidden=true;clearPostPreview();stopPostMusicPreview();if($('post-music-options'))$('post-music-options').hidden=true;if($('post-music-song'))$('post-music-song').value='';updatePostCaptionCount();notice('post-status','Publicação no ar! ❤️');await loadFeed();await loadProfilePosts(me.id)}catch(e){notice('post-status',e.message||'Falha ao publicar.')}finally{b.disabled=false}});
function renderPendingSongs(items){
 const root=$('pending-song-list');root.replaceChildren();
 for(const song of items){
  const card=document.createElement('article');card.className='song-card';
  const cover=document.createElement('div');cover.className='song-cover';cover.style.background='linear-gradient(145deg,#101010,#ed1c24 55%,#080808)';
  const span=document.createElement('span');span.textContent=song.title||'Faixa enviada';cover.append(span);
  const title=document.createElement('strong');title.textContent=song.title||'Sem título';
  const artist=document.createElement('p');artist.className='muted';artist.textContent=song.artist_name||'Artista não informado';
  const status=document.createElement('p');status.className='muted';status.textContent=song.status==='pending'?'🕒 Em análise':song.status==='rejected'?'⚠️ Precisa de ajustes':song.status==='published'?'✅ Publicada no catálogo':'Status: '+song.status;
  const note=document.createElement('small');note.className='muted';note.textContent='Você pode corrigir título, artista, produtor e descrição ou excluir sua própria faixa.';
  const edit=document.createElement('details');edit.className='song-edit-details';
  const summary=document.createElement('summary');summary.textContent='✏️ Editar informações da música';
  const titleInput=document.createElement('input');titleInput.maxLength=120;titleInput.value=song.title||'';titleInput.placeholder='Título da música';titleInput.setAttribute('aria-label','Título da música');
  const artistInput=document.createElement('input');artistInput.maxLength=100;artistInput.value=song.artist_name||'';artistInput.placeholder='Artista';artistInput.setAttribute('aria-label','Artista');
  const producerInput=document.createElement('input');producerInput.maxLength=100;producerInput.value=song.producer_name||'';producerInput.placeholder='Produtor';producerInput.setAttribute('aria-label','Produtor');
  const descriptionInput=document.createElement('textarea');descriptionInput.maxLength=1000;descriptionInput.rows=2;descriptionInput.value=song.description||'';descriptionInput.placeholder='Descrição';descriptionInput.setAttribute('aria-label','Descrição da música');
  const save=document.createElement('button');save.type='button';save.className='btn primary';save.textContent='Salvar alterações';
  save.onclick=async()=>{save.disabled=true;try{await api.updateMySong(song.id,{title:titleInput.value,artistName:artistInput.value,producerName:producerInput.value,description:descriptionInput.value});notice('global-status','Informações da música atualizadas!');await loadMyPendingSongs();await loadSongs()}catch(e){notice('global-status',e.message||'Não foi possível editar a música.')}finally{save.disabled=false}};
  edit.append(summary,titleInput,artistInput,producerInput,descriptionInput,save);
  const remove=document.createElement('button');remove.type='button';remove.className='btn alt';remove.textContent='🗑️ Excluir minha música';
  remove.onclick=async()=>{if(!confirm('Você deseja mesmo excluir esse arquivo?'))return;remove.disabled=true;try{await api.deleteMySong(song.id);notice('global-status','Sua música foi excluída.');await loadMyPendingSongs();await loadSongs()}catch(e){notice('global-status',e.message||'Não foi possível excluir a música.')}finally{remove.disabled=false}};
  card.append(cover,title,artist,status,note,edit,remove);root.append(card);
 }
 if(!root.children.length)root.innerHTML='<p class="empty">Você ainda não enviou músicas.</p>';
}
async function loadMyPendingSongs(){try{const items=await api.getMySongs();renderPendingSongs(items)}catch(e){$('pending-song-list').textContent='Não foi possível consultar suas músicas: '+e.message}}
async function loadSongs(){
 const root=$('song-list');if(root)root.innerHTML='<p class="empty">Carregando catálogo de músicas…</p>';
 try{
  allSongs=await Promise.race([
   api.getPublishedSongs(),
   new Promise((_,reject)=>window.setTimeout(()=>reject(new Error('O catálogo demorou mais de 12 segundos para responder. Você ainda pode selecionar músicas do aparelho; tente atualizar o catálogo quando a conexão voltar.')),12000))
  ]);
  renderSongs(allSongs);renderPostMusicOptions();
 }catch(e){
  if(root){
   root.replaceChildren();
   const message=document.createElement('p');message.className='status';message.textContent='Não foi possível carregar as músicas: '+(e.message||'tente novamente.');
   const retry=document.createElement('button');retry.type='button';retry.className='btn primary';retry.textContent='↻ Tentar carregar músicas';
   retry.addEventListener('click',()=>{retry.disabled=true;loadSongs().finally(()=>{retry.disabled=false})});
   root.append(message,retry);
  }
 }
}

// Mantém o catálogo sincronizado: uma faixa recém-publicada aparece sem o usuário
// precisar sair da tela ou adicionar o arquivo manualmente. O foco/retorno ao app
// também atualiza o catálogo caso o Realtime não esteja disponível no projeto.
let musicCatalogChannel=null;
let musicCatalogRefreshPending=false;
function refreshMusicCatalog(){
  if(musicCatalogRefreshPending)return;
  musicCatalogRefreshPending=true;
  Promise.resolve().then(loadSongs).finally(()=>{musicCatalogRefreshPending=false});
}
function watchMusicCatalog(){
  if(!musicCatalogChannel){
    musicCatalogChannel=supabase.channel('capital-music-catalog')
      .on('postgres_changes',{event:'*',schema:'public',table:'songs'},refreshMusicCatalog)
      .subscribe();
  }
  window.addEventListener('focus',refreshMusicCatalog);
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')refreshMusicCatalog();
  });
}

async function loadPlaylists(){
 const root=$('my-playlists-list');if(!root)return;
 root.innerHTML='<p class="empty">Carregando playlists…</p>';
 try{
  const playlists=await api.getMyPlaylists();
  root.replaceChildren();
  if(!playlists.length){root.innerHTML='<p class="empty">Você ainda não criou uma playlist. Monte a primeira e leve sua trilha sonora para o FALA UAI!</p>';return}
  for(const playlist of playlists){
   const card=document.createElement('article');card.className='playlist-card';
   const head=document.createElement('div');head.className='playlist-card-head';
   const title=document.createElement('strong');title.textContent='♫ '+playlist.name+' · '+playlist.songs.length+' faixa(s)';
   const actions=document.createElement('div');actions.className='playlist-card-actions';
   const rename=document.createElement('button');rename.type='button';rename.className='btn alt';rename.textContent='✎ Renomear';
   rename.onclick=async()=>{const value=prompt('Novo nome da playlist:',playlist.name);if(value===null)return;try{await api.renameMyPlaylist(playlist.id,value);notice('playlist-status','Playlist renomeada.');await loadPlaylists()}catch(e){notice('playlist-status',e.message)}};
   const remove=document.createElement('button');remove.type='button';remove.className='btn alt';remove.textContent='Excluir';
   remove.onclick=async()=>{if(!confirm('Excluir a playlist "'+playlist.name+'"? As músicas do catálogo não serão apagadas.'))return;try{await api.deleteMyPlaylist(playlist.id);notice('playlist-status','Playlist excluída.');await loadPlaylists()}catch(e){notice('playlist-status',e.message)}};
   actions.append(rename,remove);head.append(title,actions);card.append(head);
   const addRow=document.createElement('div');addRow.className='playlist-add-row';
   const select=document.createElement('select');select.setAttribute('aria-label','Escolher música para '+playlist.name);
   const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=allSongs.length?'Escolha uma música publicada…':'Nenhuma música publicada disponível';select.append(placeholder);
   for(const song of allSongs){const option=document.createElement('option');option.value=song.id;option.textContent=song.title+' — '+song.artist_name;select.append(option)}
   const add=document.createElement('button');add.type='button';add.className='btn primary';add.textContent='＋ Adicionar faixa';
   add.disabled=!allSongs.length;
   add.onclick=async()=>{if(!select.value){notice('playlist-status','Escolha uma música primeiro.');return}add.disabled=true;try{const added=await api.addSongToMyPlaylist(playlist.id,select.value);notice('playlist-status',added?'Música adicionada à playlist.':'Essa música já está na playlist.');await loadPlaylists()}catch(e){notice('playlist-status',e.message)}finally{add.disabled=false}};
   addRow.append(select,add);card.append(addRow);
   if(!playlist.songs.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='Adicione músicas do catálogo para começar.';card.append(empty)}
   for(let index=0;index<playlist.songs.length;index++){
    const entry=playlist.songs[index],song=allSongs.find(item=>item.id===entry.song_id);
    const row=document.createElement('div');row.className='playlist-song-row';
    const copy=document.createElement('div');copy.className='playlist-song-copy';
    const songTitle=document.createElement('strong');songTitle.textContent=(index+1)+'. '+(song?.title||'Faixa indisponível');
    const artist=document.createElement('small');artist.textContent=song?.artist_name||'Não está mais no catálogo publicado';
    copy.append(songTitle,artist);
    const tools=document.createElement('div');tools.className='playlist-song-actions';
    const up=document.createElement('button');up.type='button';up.className='btn alt';up.textContent='↑';up.disabled=index===0;up.setAttribute('aria-label','Mover faixa para cima');up.onclick=async()=>{try{await api.moveSongInMyPlaylist(playlist.id,entry.song_id,-1);await loadPlaylists()}catch(e){notice('playlist-status',e.message)}};
    const down=document.createElement('button');down.type='button';down.className='btn alt';down.textContent='↓';down.disabled=index===playlist.songs.length-1;down.setAttribute('aria-label','Mover faixa para baixo');down.onclick=async()=>{try{await api.moveSongInMyPlaylist(playlist.id,entry.song_id,1);await loadPlaylists()}catch(e){notice('playlist-status',e.message)}};
    const del=document.createElement('button');del.type='button';del.className='btn alt';del.textContent='Remover';del.onclick=async()=>{try{await api.removeSongFromMyPlaylist(playlist.id,entry.song_id);notice('playlist-status','Faixa removida.');await loadPlaylists()}catch(e){notice('playlist-status',e.message)}};
    tools.append(up,down,del);row.append(copy,tools);card.append(row);
   }
   root.append(card);
  }
 }catch(e){root.textContent='Não foi possível carregar suas playlists: '+(e.message||'Tente novamente.')}
}
$('create-playlist')?.addEventListener('click',async()=>{const input=$('playlist-name'),button=$('create-playlist');button.disabled=true;try{await api.createMyPlaylist(input.value);input.value='';notice('playlist-status','Playlist criada! Agora adicione músicas do catálogo.');await loadPlaylists()}catch(e){notice('playlist-status',e.message)}finally{button.disabled=false}});
function renderSongs(items){
 const root=$('song-list');root.replaceChildren();musicPlayer.setCatalog(allSongs);
 for(const song of items){
  const card=document.createElement('article');card.className='song-card';
  const cover=document.createElement('div');cover.className='song-cover';cover.setAttribute('aria-hidden','true');
  const span=document.createElement('span');span.textContent=song.title||'Faixa musical';cover.append(span);
  const title=document.createElement('strong');title.className='song-title';title.textContent=song.title||'Faixa sem título';
  const artist=document.createElement('p');artist.className='muted song-artist';artist.textContent=song.artist_name||'Artista da comunidade';
  const play=document.createElement('button');play.type='button';play.className='song-preview-button btn primary';play.textContent='▶ Ouvir no player 3D';play.addEventListener('click',()=>{musicPlayer.playSong(song);$('rede-music-player')?.scrollIntoView({behavior:'smooth',block:'center'});});
  card.append(cover,title,artist,play);root.append(card);
 }
 if(!root.children.length)root.innerHTML='<p class="empty">Nenhuma música publicada ainda.</p>';
}
$('song-search').addEventListener('input',()=>{const q=$('song-search').value.toLowerCase();renderSongs(allSongs.filter(s=>(s.title+' '+s.artist_name).toLowerCase().includes(q)))});
async function loadPeople(){try{allPeople=await api.getPublicProfiles();renderPeople(allPeople)}catch(e){$('people-list').textContent='Busca indisponível: '+e.message}}
function renderPeople(items){const root=$('people-list');root.replaceChildren();for(const p of items){if(p.user_id===me?.id)continue;const row=document.createElement('div');row.className='user-row';const img=document.createElement('img');setAvatar(img,p);const copy=document.createElement('div');copy.className='grow';const name=document.createElement('a');name.href='./rede.html?perfil='+encodeURIComponent(p.user_id);name.textContent=p.display_name;const meta=document.createElement('div');meta.className='muted';meta.textContent='@'+p.username+' · '+(p.city||'');copy.append(name,meta);const follow=document.createElement('button');follow.className='btn';follow.textContent='Seguir';follow.onclick=()=>toggleFollow(p.user_id,follow);row.append(img,copy,follow);root.append(row)}if(!root.children.length)root.innerHTML='<p class="empty">Nenhum perfil público encontrado ainda.</p>'}
$('people-search').addEventListener('input',()=>{const q=$('people-search').value.toLowerCase();renderPeople(allPeople.filter(p=>(p.display_name+' '+p.username+' '+p.city).toLowerCase().includes(q)))});
async function renderMedia(){if(!allPosts.length)await loadFeed();const root=$('media-list');root.replaceChildren();const ids=allPosts.map(p=>p.id);if(!ids.length){root.innerHTML='<p class="empty">As mídias publicadas aparecerão aqui.</p>';return}const {data,error}=await supabase.from('post_media').select('post_id,storage_path,media_type,bucket_id').in('post_id',ids).order('created_at',{ascending:false});if(error){root.textContent='Não foi possível carregar as mídias: '+error.message;return}const posts=new Map(allPosts.map(p=>[p.id,p]));const authors=[...new Set(allPosts.map(p=>p.author_id))];const profilesQ=authors.length?await supabase.from('profiles').select('user_id,display_name,username').in('user_id',authors):{data:[],error:null};if(profilesQ.error){root.textContent='Não foi possível carregar os autores das mídias: '+profilesQ.error.message;return}const people=new Map((profilesQ.data||[]).map(p=>[p.user_id,p]));const mediaUrls=await resolveMediaUrls(data||[]);for(const m of data||[]){const el=document.createElement(m.media_type==='video'?'video':'img');el.src=mediaUrls.get((m.bucket_id||'capital-do-trem-media')+':'+m.storage_path)||'';if(m.media_type==='video'){el.controls=true;el.playsInline=true}const post=posts.get(m.post_id);const person=people.get(post?.author_id);el.title=[post?.content||'Mídia da comunidade',person?.display_name||'',person?.username?'@'+person.username:''].filter(Boolean).join(' · ');root.append(el)}if(!root.children.length)root.innerHTML='<p class="empty">As mídias publicadas aparecerão aqui.</p>'}

async function loadEvents(){try{const events=await api.getPublishedEvents();const root=$('event-list');root.replaceChildren();for(const e of events){const card=document.createElement('article');card.className='feed-event';const h=document.createElement('strong');h.textContent=e.title;const p=document.createElement('p');p.textContent=new Date(e.event_date+'T12:00:00').toLocaleDateString('pt-BR')+' · '+e.address;card.append(h,p);root.append(card)}if(!root.children.length)root.innerHTML='<p class="empty">Nenhum evento publicado no momento.</p>'}catch(e){$('event-list').textContent=e.message}}
$('media-search').addEventListener('input',()=>{const q=$('media-search').value.toLowerCase();[...$('media-list').children].forEach(el=>{el.hidden=q&&!el.title.toLowerCase().includes(q)})});
// Cada área inicia de forma independente: uma falha no perfil não bloqueia o catálogo musical.
const profileStartup=loadMyProfile().catch(error=>{
 showProfileLoadError(error);
 notice('global-status','Perfil indisponível no momento: '+(error.message||'tente novamente.'));
});
const independentStartup=[
 loadSongs(),
 loadMyPendingSongs(),
 loadPeople(),
 loadEvents()
];
await Promise.allSettled([profileStartup,...independentStartup]);
watchMusicCatalog();
loadPlaylists().catch(error=>notice('playlist-status',error.message||'Não foi possível carregar as playlists.'));
