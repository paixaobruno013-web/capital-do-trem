import {initSupabase,getCurrentSession,submitMyPost,getPostSocial,togglePostLike,addPostComment,updateMyPost,deleteMyPost,getPublishedSongs,getMyPlaylists,createMyStory} from './supabase/auth.js';
import {loadPostMusic,createPostMusicControl} from './post-music.js';
const supabase=initSupabase();
const $=id=>document.getElementById(id);
const root=$('home-feed-list'),form=$('home-feed-composer'),status=$('home-feed-status'),fileInput=$('home-feed-media'),fileName=$('home-feed-media-name'),preview=$('home-feed-preview'),previewStage=$('home-feed-preview-stage'),clearMedia=$('home-feed-clear-media'),caption=$('home-feed-text'),cropToggle=$('home-feed-crop-toggle'),editToggle=$('home-feed-edit-toggle'),editPanel=$('home-feed-edit-panel'),storyPublishButton=$('home-feed-publish-story');
const composerOpen=$('home-feed-open'),composerFields=$('home-feed-composer-fields'),composerCollapse=$('home-feed-collapse');
function setComposerExpanded(expanded){if(!composerFields||!form)return;composerFields.hidden=!expanded;form.classList.toggle('home-feed-composer-collapsed',!expanded);composerOpen?.setAttribute('aria-expanded',String(expanded));if(composerOpen)composerOpen.hidden=expanded;if(expanded)caption?.focus({preventScroll:true});else if(composerOpen)composerOpen.hidden=false;}
composerOpen?.addEventListener('click',()=>setComposerExpanded(true));composerCollapse?.addEventListener('click',()=>setComposerExpanded(false));
const musicToggle=$('home-feed-music-toggle'),musicPanel=$('home-feed-music-panel'),musicSelect=$('home-feed-music-select'),playlistSelect=$('home-feed-playlist-select'),musicStart=$('home-feed-music-start'),musicDuration=$('home-feed-music-duration'),musicPreview=$('home-feed-music-preview'),musicStatus=$('home-feed-music-status');
let feedSongs=[],feedPlaylists=[],feedSongsLoaded=false,selectedFeedSongId='',cropSelectedImage=false,selectedFiles=[],editedImageFiles=[];
function resetFeedMusicPreview(){if(musicPreview){musicPreview.pause();musicPreview.removeAttribute('src');musicPreview.hidden=true;}}
function renderFeedSongOptions(){if(!musicSelect)return;const playlistId=playlistSelect?.value||'';const ids=playlistId?new Set((feedPlaylists.find(item=>item.id===playlistId)?.songs||[]).map(item=>item.song_id)):null;const selected=selectedFeedSongId;const songs=ids?feedSongs.filter(song=>ids.has(song.id)):feedSongs;musicSelect.replaceChildren(new Option('Sem música',''));for(const song of songs)musicSelect.add(new Option(song.title+' — '+song.artist_name,song.id));if(songs.some(song=>song.id===selected))musicSelect.value=selected;else if(selected){selectedFeedSongId='';resetFeedMusicPreview();}}
async function loadFeedSongs(){if(feedSongsLoaded)return;musicToggle.disabled=true;if(musicStatus)musicStatus.textContent='Carregando catálogo e playlists…';try{const [songs,playlists]=await Promise.all([getPublishedSongs(),getMyPlaylists().catch(error=>{if(musicStatus)musicStatus.textContent='Playlists indisponíveis no momento. O catálogo continua disponível.';return [];})]);feedSongs=songs;feedPlaylists=playlists;playlistSelect?.replaceChildren(new Option('Catálogo completo',''));for(const playlist of feedPlaylists)playlistSelect?.add(new Option('Playlist: '+playlist.name,playlist.id));renderFeedSongOptions();feedSongsLoaded=true;if(musicStatus)musicStatus.textContent=feedSongs.length?'Escolha uma faixa do catálogo ou de uma das suas playlists.':'Ainda não há músicas publicadas.';}catch(error){if(musicStatus)musicStatus.textContent=error.message||'Não foi possível carregar as músicas.';}finally{musicToggle.disabled=false;}}
playlistSelect?.addEventListener('change',renderFeedSongOptions);
musicToggle?.addEventListener('click',async()=>{musicPanel.hidden=!musicPanel.hidden;if(!musicPanel.hidden)await loadFeedSongs();});
musicSelect?.addEventListener('change',()=>{selectedFeedSongId=musicSelect.value;const song=feedSongs.find(item=>item.id===selectedFeedSongId);resetFeedMusicPreview();if(song?.audio_url){musicPreview.src=song.audio_url;musicPreview.hidden=false;if(musicStatus)musicStatus.textContent='Selecionada: '+song.artist_name+' — '+song.title+'. Ajuste o trecho e ouça antes de publicar.';}else if(musicStatus)musicStatus.textContent='A publicação será feita sem música.';});
const previewUrls=[];
function clearSelectedMedia(){previewUrls.forEach(url=>URL.revokeObjectURL(url));previewUrls.length=0;selectedFiles=[];editedImageFiles=[];if(fileInput)fileInput.value='';if(fileName){fileName.textContent='Nenhuma mídia selecionada';fileName.hidden=true;}if(previewStage)previewStage.replaceChildren();if(preview)preview.hidden=true;cropSelectedImage=false;if(cropToggle){cropToggle.setAttribute('aria-pressed','false');cropToggle.disabled=true;}if(editToggle)editToggle.disabled=true;if(editPanel)editPanel.hidden=true;if(storyPublishButton)storyPublishButton.disabled=true;}
function renderSelectedMedia(files){
 const chosen=Array.from(files||[]);clearSelectedMedia();if(!chosen.length)return;
 const hasVideo=chosen.some(file=>file.type.startsWith('video/'));
 if(hasVideo&&chosen.length>1){status.textContent='Escolha um vídeo por publicação ou até 10 fotos.';if(fileInput)fileInput.value='';return;}
 if(chosen.length>10){status.textContent='O limite é de 10 fotos por publicação.';if(fileInput)fileInput.value='';return;}
 if(chosen.some(file=>!['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'].includes(file.type))){status.textContent='Há um arquivo em formato não permitido.';if(fileInput)fileInput.value='';return;}
 selectedFiles=chosen;
 if(fileName){fileName.textContent=chosen.length===1?chosen[0].name:chosen.length+' fotos selecionadas • deslize para conferir';fileName.hidden=false;}
 chosen.forEach((file,index)=>{const url=URL.createObjectURL(file);previewUrls.push(url);const media=document.createElement(file.type.startsWith('video/')?'video':'img');media.src=url;media.className='home-feed-preview-media';media.dataset.mediaIndex=String(index);if(media.tagName==='VIDEO'){media.controls=true;media.playsInline=true;}else{media.alt='Prévia da foto '+(index+1);}});
 if(previewStage){previewStage.classList.toggle('home-feed-preview-gallery',chosen.length>1);chosen.forEach((file,index)=>{const url=previewUrls[index],media=document.createElement(file.type.startsWith('video/')?'video':'img');media.src=url;media.className='home-feed-preview-media';media.dataset.mediaIndex=String(index);if(media.tagName==='VIDEO'){media.controls=true;media.playsInline=true;}else media.alt='Prévia da foto '+(index+1);previewStage.append(media);});}
 if(preview)preview.hidden=false;
 const hasImages=chosen.some(file=>file.type.startsWith('image/'));if(cropToggle)cropToggle.disabled=!hasImages;if(editToggle)editToggle.disabled=!hasImages;
 if(storyPublishButton)storyPublishButton.disabled=false;
}
async function cropImageToSquare(file){
 const image=new Image(),url=URL.createObjectURL(file);
 try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Não foi possível abrir a foto para cortar.'));image.src=url;});
 const side=Math.min(image.naturalWidth,image.naturalHeight),sx=(image.naturalWidth-side)/2,sy=(image.naturalHeight-side)/2,scale=Math.min(1,1600/side);
 const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(side*scale));canvas.height=canvas.width;
 const context=canvas.getContext('2d');if(!context)throw new Error('Não foi possível preparar o corte da foto.');
 context.drawImage(image,sx,sy,side,side,0,0,canvas.width,canvas.height);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.88));if(!blob)throw new Error('Não foi possível salvar o corte da foto.');
 return new File([blob],'capital-do-trem-feed-cortada.jpg',{type:'image/jpeg',lastModified:Date.now()});
 }finally{URL.revokeObjectURL(url);}
}
if(root&&form){
 let currentUser=null;
 const safe=(value)=>String(value??'');
 function avatarSource(profile){
  if(profile?.avatar_type==='photo'&&/^https:\/\//.test(profile.avatar_url||''))return profile.avatar_url;
  if(profile?.avatar_type==='character'&&profile.avatar_data){
   const d=profile.avatar_data;
   const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="50" fill="#171717"/><circle cx="50" cy="40" r="23" fill="'+(d.skin||'#8d5524')+'"/><path d="M20 100 Q25 65 50 65 Q75 65 80 100" fill="'+(d.shirt||'#ed1c24')+'"/></svg>';
   return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }
  return '';
 }
 function initials(name){return Array.from(safe(name).trim()||'U').slice(0,2).join('').toUpperCase()}
 const feedAutoplayAllowed=()=>document.visibilityState==='visible'&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches&&!navigator.connection?.saveData;
 const pauseFeedVideos=()=>document.querySelectorAll('.home-feed-media[data-feed-autoplay]').forEach(video=>video.pause());
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible')pauseFeedVideos();});
 window.addEventListener('pagehide',pauseFeedVideos);
 const feedVideoObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries){const video=entry.target;if(entry.isIntersecting&&entry.intersectionRatio>=0.6&&feedAutoplayAllowed()){const others=[...document.querySelectorAll('.home-feed-media[data-feed-autoplay]')].filter(item=>item!==video);for(const other of others)other.pause();video.preload='metadata';video.play().catch(()=>{video.dataset.autoplayBlocked='true'});}else{video.pause();}}},{threshold:[0,0.6,1]}):null;
 function observeFeedVideo(video){video.muted=true;video.playsInline=true;video.preload='none';video.controls=true;video.dataset.feedAutoplay='true';if(feedVideoObserver)feedVideoObserver.observe(video);}
 async function signedMedia(rows){
  const map=new Map(),groups=new Map();
  for(const row of rows){const bucket=row.bucket_id||'capital-do-trem-social';const list=groups.get(bucket)||[];list.push(row);groups.set(bucket,list)}
  await Promise.all([...groups].map(async([bucket,list])=>{
   const {data,error}=await supabase.storage.from(bucket).createSignedUrls(list.map(x=>x.storage_path),3600);
   if(error)throw error;
   for(const item of data||[])if(item.path&&item.signedUrl)map.set(bucket+':'+item.path,item.signedUrl);
  }));
  return map;
 }
 async function load(){
  root.innerHTML='<p class="muted">Atualizando o Feed dos Maquinistas…</p>';
  try{
   const {data:posts,error:postsError}=await supabase.from('posts').select('id,author_id,content,created_at').eq('status','published').order('created_at',{ascending:false}).limit(30);if(postsError)throw postsError;
   if(!posts.length){root.innerHTML='<p class="muted">Ainda não há publicações. Seja o primeiro Maquinista a compartilhar uma novidade!</p>';return}
   const ids=posts.map(p=>p.id),authors=[...new Set(posts.map(p=>p.author_id))];
   const [mediaQ,profilesQ,artistsQ]=await Promise.all([
    supabase.from('post_media').select('post_id,storage_path,media_type,bucket_id,alt_text').in('post_id',ids).order('sort_order'),
    supabase.from('profiles').select('user_id,display_name,username,account_type,avatar_type,avatar_url,avatar_data,city').in('user_id',authors),
    supabase.from('artists').select('user_id').eq('status','published').in('user_id',authors)
   ]);
   if(mediaQ.error)throw mediaQ.error;if(profilesQ.error)throw profilesQ.error;
   const urls=await signedMedia(mediaQ.data||[]);const postMusic=await loadPostMusic(supabase,ids);
   const people=new Map((profilesQ.data||[]).map(p=>[p.user_id,p]));
   const verified=new Set((artistsQ.data||[]).map(a=>a.user_id));
   const media=new Map();
   for(const row of mediaQ.data||[]){const key=row.post_id,list=media.get(key)||[];list.push({...row,url:urls.get((row.bucket_id||'capital-do-trem-social')+':'+row.storage_path)});media.set(key,list)}
   root.replaceChildren();
   const visiblePosts=posts.filter(post=>(media.get(post.id)||[]).some(item=>item.url&&['image','video'].includes(item.media_type)));
   for(const post of visiblePosts){
    const profile=people.get(post.author_id)||{display_name:'Maquinista do Capital do Trem'};
    const card=document.createElement('article');card.className='home-feed-post';
    const header=document.createElement('header');header.className='home-feed-post-head';
    const avatar=document.createElement('span');avatar.className='home-feed-avatar';
    const avatarUrl=avatarSource(profile);
    if(avatarUrl){const img=document.createElement('img');img.src=avatarUrl;img.alt='';img.loading='lazy';avatar.append(img)}else avatar.textContent=initials(profile.display_name);
    const author=document.createElement('div');author.className='home-feed-author';
    const link=document.createElement('a');link.href='./rede.html?perfil='+encodeURIComponent(post.author_id);link.textContent=profile.display_name||'Maquinista';
    const meta=document.createElement('small');meta.textContent='@'+(profile.username||'maquinista')+(profile.city?' · '+profile.city:'');
    author.append(link,meta);
    if(verified.has(post.author_id)){const seal=document.createElement('span');seal.className='home-verified-seal';seal.textContent='✓';seal.title='Artista verificado pela Capital do Trem';seal.setAttribute('aria-label','Artista verificado');author.append(seal)}
    header.append(avatar,author);card.append(header);
    let text=null;if(post.content){text=document.createElement('p');text.className='home-feed-post-text';text.textContent=post.content;card.append(text)}
    const postMedia=(media.get(post.id)||[]).filter(item=>item.url);
    if(postMedia.length){
     const gallery=document.createElement('div');gallery.className='home-feed-post-gallery';gallery.setAttribute('aria-label',postMedia.length+' mídias. Deslize para o lado para ver todas.');
     for(const item of postMedia){
      const slide=document.createElement('div');slide.className='home-feed-post-slide';
      const el=document.createElement(item.media_type==='video'?'video':'img');el.className='home-feed-media';el.src=item.url;el.loading='lazy';
      if(item.media_type==='video')observeFeedVideo(el);else{el.alt=item.alt_text||post.content||'Foto publicada na comunidade';el.tabIndex=0;el.title='Toque para ampliar (opcional)';el.addEventListener('click',()=>{const viewer=document.createElement('div');viewer.style.cssText='position:fixed;inset:0;z-index:9999;background:#000e;display:grid;place-items:center;padding:16px';const image=document.createElement('img');image.src=item.url;image.alt=el.alt;image.style.cssText='max-width:100%;max-height:100%;object-fit:contain';const close=document.createElement('button');close.type='button';close.textContent='Fechar';close.style.cssText='position:absolute;top:16px;right:16px;padding:10px 14px;border:1px solid #fff;border-radius:22px;background:#111;color:#fff';close.addEventListener('click',()=>viewer.remove());viewer.addEventListener('click',event=>{if(event.target===viewer)viewer.remove()});viewer.append(image,close);document.body.append(viewer)});}
      slide.append(el);gallery.append(slide);
     }
     card.append(gallery);
    }
    if(postMusic.has(post.id))card.append(createPostMusicControl(postMusic.get(post.id)));
    const actions=document.createElement('div');actions.className='home-feed-actions';
    const like=document.createElement('button');like.type='button';like.textContent='♡ Curtir';
    const comments=document.createElement('button');comments.type='button';comments.textContent='💬 Comentários';
    // Não consultar curtidas e comentários para cada cartão durante a abertura do Feed.
    // Os dados sociais são buscados somente quando a pessoa interage.
    like.addEventListener('click',async()=>{like.disabled=true;try{await togglePostLike(post.id);const social=await getPostSocial(post.id);like.textContent=(social.liked?'♥':'♡')+' '+social.likeCount+' curtidas'}catch(error){status.textContent=error.message||'Entre na sua conta para curtir.'}finally{like.disabled=false}});
    comments.addEventListener('click',async()=>{try{const social=await getPostSocial(post.id);const current=social.comments.map(c=>(c.author_name||'Maquinista')+': '+c.content).join('\n');const value=prompt((current?'Comentários existentes:\n'+current+'\n\n':'')+'Escreva seu comentário:');if(value?.trim()){await addPostComment(post.id,value);const updated=await getPostSocial(post.id);comments.textContent='💬 '+updated.comments.length+' comentários';status.textContent='Comentário publicado!'}}catch(error){status.textContent=error.message||'Não foi possível comentar.'}});
    if(currentUser?.id===post.author_id){
     const edit=document.createElement('button');edit.type='button';edit.textContent='✏️ Editar publicação';
     edit.addEventListener('click',async()=>{const value=prompt('Corrija o texto da sua publicação:',post.content||'');if(value===null)return;edit.disabled=true;try{const updated=await updateMyPost(post.id,value);post.content=updated.content;if(text)text.textContent=updated.content;else if(updated.content){const next=document.createElement('p');next.className='home-feed-post-text';next.textContent=updated.content;header.after(next);}status.textContent='Publicação corrigida com sucesso.';}catch(error){status.textContent=error.message||'Não foi possível editar a publicação.';}finally{edit.disabled=false}});
     const remove=document.createElement('button');remove.type='button';remove.textContent='🗑️ Excluir publicação';
     remove.addEventListener('click',async()=>{if(!confirm('Excluir sua publicação e as mídias vinculadas? Esta ação não pode ser desfeita.'))return;remove.disabled=true;try{await deleteMyPost(post.id);card.remove();status.textContent='Sua publicação foi excluída.';}catch(error){status.textContent=error.message||'Não foi possível excluir a publicação.';}finally{remove.disabled=false}});
     actions.append(edit,remove);
    }
    actions.append(like,comments);card.append(actions);root.append(card);
   }
  }catch(error){root.textContent='Não foi possível carregar o Feed: '+(error.message||'verifique sua conexão.')}
 }
 fileInput?.addEventListener('change',()=>renderSelectedMedia(fileInput.files));
  clearMedia?.addEventListener('click',clearSelectedMedia);
  cropToggle?.addEventListener('click',()=>{if(!selectedFiles.some(file=>file.type.startsWith('image/')))return;cropSelectedImage=!cropSelectedImage;cropToggle.setAttribute('aria-pressed',String(cropSelectedImage));cropToggle.textContent=cropSelectedImage?'✓ Corte quadrado':'✂ Cortar';previewStage?.classList.toggle('is-cropped',cropSelectedImage);const image=previewStage?.querySelector('img');if(image)image.classList.toggle('is-cropped',cropSelectedImage);if(selectedFiles.some(file=>file.type.startsWith('video/')))status.textContent='O corte permanente de vídeo ainda não está disponível; o enquadramento da prévia não altera o arquivo.';});
 editToggle?.addEventListener('click',()=>{if(!selectedFiles.some(file=>file.type.startsWith('image/')))return;editPanel.hidden=!editPanel.hidden;});
 $('home-feed-edit-apply')?.addEventListener('click',async()=>{const sources=selectedFiles.filter(file=>file.type.startsWith('image/'));if(!sources.length)return;const button=$('home-feed-edit-apply');if(button)button.disabled=true;try{editedImageFiles=[];for(let index=0;index<sources.length;index++){const source=sources[index];status.textContent='Melhorando foto '+(index+1)+' de '+sources.length+'…';const image=new Image(),url=URL.createObjectURL(source);try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Não foi possível abrir a foto '+(index+1)+'.'));image.src=url;});const canvas=document.createElement('canvas');const scale=Math.min(1,2400/Math.max(image.naturalWidth,image.naturalHeight));canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Não foi possível preparar a foto '+(index+1)+'.');ctx.filter='brightness('+($('home-feed-brightness')?.value||100)+'%) contrast('+($('home-feed-contrast')?.value||100)+'%) saturate('+($('home-feed-saturation')?.value||100)+'%)';ctx.drawImage(image,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.9));if(!blob)throw new Error('Não foi possível exportar a foto '+(index+1)+'.');editedImageFiles.push(new File([blob],'capital-do-trem-imagem-'+(index+1)+'-editada.jpg',{type:'image/jpeg',lastModified:Date.now()}));}finally{URL.revokeObjectURL(url);}}status.textContent='Melhorias aplicadas às '+sources.length+' foto(s). As originais permanecem preservadas até publicar.';}catch(error){editedImageFiles=[];status.textContent=error.message||'Não foi possível editar as imagens.';}finally{if(button)button.disabled=false;}});
  async function publishPost(alsoStory=false){
   const text=caption.value.trim();let files=[...selectedFiles];
   if(!text&&!files.length){status.textContent='Escreva uma mensagem ou escolha fotos/vídeo.';return}
   if(alsoStory&&files.length!==1){status.textContent='Para compartilhar também nos Stories, selecione apenas uma foto ou um vídeo.';return}
   if(alsoStory&&files[0]&&files[0].size>(files[0].type.startsWith('video/')?20:8)*1024*1024){status.textContent=files[0].type.startsWith('video/')?'Para compartilhar também no Story, o vídeo deve ter até 20 MB.':'Para compartilhar também no Story, a foto deve ter até 8 MB.';return}
   if(cropSelectedImage&&files.some(file=>file.type.startsWith('image/'))){try{const photos=files.filter(file=>file.type.startsWith('image/'));let done=0;status.textContent='Preparando o corte das fotos…';files=await Promise.all(files.map(async file=>{if(!file.type.startsWith('image/'))return file;done++;status.textContent='Cortando foto '+done+' de '+photos.length+'…';return cropImageToSquare(file);}));}catch(error){status.textContent=error.message||'Não foi possível cortar as fotos.';return}}
   if(editedImageFiles.length){let editIndex=0;files=files.map(file=>file.type.startsWith('image/')?(editedImageFiles[editIndex++]||file):file);}
   if(selectedFeedSongId&&(!files.length||!files.some(file=>file.type.startsWith('image/')))){status.textContent='Para anexar música no Feed, escolha também uma foto.';return}
   for(const file of files){const max=file.type.startsWith('image/')?10*1024*1024:50*1024*1024;if(file.size>max){status.textContent='Arquivo muito grande para publicar: '+file.name;return}}
   const button=form.querySelector('button[type=submit]');button.disabled=true;if(storyPublishButton)storyPublishButton.disabled=true;status.textContent='Publicando…';
   let createdPost=null,uploadedPaths=[],feedPublished=false,publishStage='validar a conta';
   try{
    status.textContent='Confirmando sua conta…';
    const session=await getCurrentSession();if(!session?.user)throw new Error('Entre na sua conta para publicar no Feed.');
    publishStage='criar a publicação no Feed';status.textContent='Criando publicação…';
    createdPost=await submitMyPost(text||'📸 Nova publicação na comunidade');
    if(files.length){const mediaRows=[];for(let index=0;index<files.length;index++){const file=files[index];publishStage='enviar mídia '+(index+1)+' de '+files.length;status.textContent='Enviando mídia '+(index+1)+' de '+files.length+'…';const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'})[file.type];const path=session.user.id+'/posts/'+crypto.randomUUID()+'.'+ext;const uploaded=await supabase.storage.from('capital-do-trem-social').upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});if(uploaded.error)throw uploaded.error;uploadedPaths.push(path);mediaRows.push({post_id:createdPost.id,owner_id:session.user.id,bucket_id:'capital-do-trem-social',storage_path:path,media_type:file.type.startsWith('video/')?'video':'image',mime_type:file.type,byte_size:file.size,alt_text:text.slice(0,200),sort_order:index});}
     publishStage='vincular mídias à publicação';status.textContent='Finalizando a galeria…';const row=await supabase.from('post_media').insert(mediaRows);if(row.error)throw row.error;}
    const songToPublish=selectedFeedSongId||form.dataset.storyMusicSongId||'';
    if(songToPublish){publishStage='vincular a música à publicação';status.textContent='Adicionando a música…';const start=Math.max(0,Math.min(3600,Number(musicStart?.value)||0)),duration=Math.max(5,Math.min(60,Number(musicDuration?.value)||15));const linked=await supabase.from('post_music').insert({post_id:createdPost.id,song_id:songToPublish,start_seconds:start,duration_seconds:duration,volume:0.8});if(linked.error)throw linked.error;}
    feedPublished=true;
    if(alsoStory){try{publishStage='publicar também nos Stories';status.textContent='Publicação no Feed concluída. Enviando aos Stories…';const start=Math.max(0,Math.min(3600,Number(musicStart?.value)||0)),duration=Math.max(5,Math.min(60,Number(musicDuration?.value)||15));const story=await createMyStory({file:files[0],caption:text,musicSongId:songToPublish,musicStartSeconds:start,musicDurationSeconds:duration});document.dispatchEvent(new CustomEvent('capital:stories-updated',{detail:{id:story.id}}));}
     catch(storyError){status.textContent='Feed publicado! Mas o Story não foi publicado: '+(storyError.message||'tente novamente.');await load();return;}}
    caption.value='';clearSelectedMedia();selectedFeedSongId='';delete form.dataset.storyMusicSongId;if(musicSelect)musicSelect.value='';resetFeedMusicPreview();setComposerExpanded(false);status.textContent=alsoStory?'Compartilhado no Feed e nos Stories! ❤️':'Publicação compartilhada no Feed! ❤️';await load();
   }catch(error){if(!feedPublished){if(uploadedPaths.length){try{const {error:removeError}=await supabase.storage.from('capital-do-trem-social').remove(uploadedPaths);if(removeError)console.error('Falha ao remover mídias órfãs do Feed.',removeError);}catch(cleanupError){console.error('Falha ao limpar mídias órfãs do Feed.',cleanupError);}}
    if(createdPost?.id){try{await deleteMyPost(createdPost.id);}catch(cleanupError){console.error('Falha ao reverter publicação incompleta.',cleanupError);}}}
    status.textContent='Falha ao '+publishStage+': '+(error.message||'não foi possível concluir.');
   }finally{button.disabled=false;if(storyPublishButton)storyPublishButton.disabled=!selectedFiles.length||selectedFiles.length!==1;}
  }
  form.addEventListener('submit',event=>{event.preventDefault();publishPost(false);});
  storyPublishButton?.addEventListener('click',()=>publishPost(true));
  (async()=>{try{const session=await getCurrentSession();currentUser=session?.user||null;if(!currentUser){status.textContent='Entre ou crie sua conta para publicar, curtir e comentar.';form.querySelector('button[type=submit]').disabled=true;if(storyPublishButton)storyPublishButton.disabled=true}}catch{}await load()})();
}
const searchRoot=$('random-video-results');
if(searchRoot){
 const search=$('video-discovery-search');
 (async()=>{
  try{
   const posts=await getPublishedPosts(),ids=posts.map(p=>p.id);
   if(!ids.length){searchRoot.textContent='Ainda não há vídeos públicos.';return}
   const [mediaQ,profilesQ]=await Promise.all([
    supabase.from('post_media').select('post_id,storage_path,media_type,bucket_id').in('post_id',ids).eq('media_type','video'),
    supabase.from('profiles').select('user_id,display_name,username').in('user_id',[...new Set(posts.map(p=>p.author_id))])
   ]);
   if(mediaQ.error)throw mediaQ.error;if(profilesQ.error)throw profilesQ.error;
   const urls=await signedMediaForDiscovery(mediaQ.data||[]);
   const people=new Map((profilesQ.data||[]).map(p=>[p.user_id,p]));
   const items=(mediaQ.data||[]).map(m=>({...m,url:urls.get((m.bucket_id||'capital-do-trem-social')+':'+m.storage_path),post:posts.find(p=>p.id===m.post_id)})).filter(m=>m.url);
   const render=()=>{
    const q=(search?.value||'').toLocaleLowerCase('pt-BR');
    const filtered=items.filter(item=>{const author=people.get(item.post?.author_id)||{};return [item.post?.content,author.display_name,author.username].some(v=>String(v??'').toLocaleLowerCase('pt-BR').includes(q))});
    filtered.sort(()=>Math.random()-.5);searchRoot.replaceChildren();
    for(const item of filtered.slice(0,24)){const card=document.createElement('article');card.className='home-video-card';const video=document.createElement('video');video.src=item.url;video.controls=true;video.playsInline=true;video.preload='metadata';const caption=document.createElement('p');caption.textContent=item.post?.content||'Vídeo da comunidade';const author=document.createElement('small');const p=people.get(item.post?.author_id);author.textContent=p?.display_name||'Maquinista';card.append(video,caption,author);searchRoot.append(card)}
    if(!filtered.length)searchRoot.textContent='Nenhum vídeo encontrado com essa busca.';
   };
   search?.addEventListener('input',render);render();
   $('shuffle-videos')?.addEventListener('click',render);
  }catch(error){searchRoot.textContent='Não foi possível carregar os vídeos agora.'}
 })();
}
async function signedMediaForDiscovery(rows){
 const map=new Map(),groups=new Map();for(const row of rows){const bucket=row.bucket_id||'capital-do-trem-social',list=groups.get(bucket)||[];list.push(row);groups.set(bucket,list)}
 await Promise.all([...groups].map(async([bucket,list])=>{const {data,error}=await supabase.storage.from(bucket).createSignedUrls(list.map(x=>x.storage_path),3600);if(error)throw error;for(const item of data||[])if(item.path&&item.signedUrl)map.set(bucket+':'+item.path,item.signedUrl)}));return map;
}
