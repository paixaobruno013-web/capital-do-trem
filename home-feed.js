import {initSupabase,getCurrentSession,submitMyPost,getPostSocial,togglePostLike,addPostComment,updateMyPost,deleteMyPost} from './supabase/auth.js';
import {loadPostMusic,createPostMusicControl} from './post-music.js';
const supabase=initSupabase();
const $=id=>document.getElementById(id);
const root=$('home-feed-list'),form=$('home-feed-composer'),status=$('home-feed-status'),fileInput=$('home-feed-media'),fileName=$('home-feed-media-name'),preview=$('home-feed-preview'),previewStage=$('home-feed-preview-stage'),clearMedia=$('home-feed-clear-media'),caption=$('home-feed-text'),charCount=$('home-feed-char-count');
let previewUrl='';
function clearSelectedMedia(){if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl='';}if(fileInput)fileInput.value='';if(fileName)fileName.textContent='Nenhuma mídia selecionada';if(previewStage)previewStage.replaceChildren();if(preview)preview.hidden=true;}
function renderSelectedMedia(file){clearSelectedMedia();if(!file)return;fileName.textContent=file.name+' • '+(file.size/1024/1024).toFixed(2)+' MB';previewUrl=URL.createObjectURL(file);const media=document.createElement(file.type.startsWith('video/')?'video':'img');media.src=previewUrl;media.className='home-feed-preview-media';if(media.tagName==='VIDEO'){media.controls=true;media.playsInline=true;}else media.alt='Prévia da foto que será publicada';previewStage.append(media);preview.hidden=false;}
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
 const feedVideoObserver=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries){const video=entry.target;if(entry.isIntersecting&&entry.intersectionRatio>=0.6){video.muted=true;const others=[...document.querySelectorAll('.home-feed-media[data-feed-autoplay]')].filter(item=>item!==video);for(const other of others)other.pause();video.play().catch(()=>{video.dataset.autoplayBlocked='true'});}else{video.pause();}}},{threshold:[0,0.6,1]}):null;
 function observeFeedVideo(video){video.muted=true;video.playsInline=true;video.preload='metadata';video.controls=true;video.dataset.feedAutoplay='true';if(feedVideoObserver)feedVideoObserver.observe(video);}
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
   const {data:posts,error:postsError}=await supabase.from('posts').select('id,author_id,content,created_at').eq('status','published').order('created_at',{ascending:false}).limit(60);if(postsError)throw postsError;
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
   for(const post of posts){
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
    for(const item of media.get(post.id)||[]){
     if(!item.url)continue;
     const el=document.createElement(item.media_type==='video'?'video':'img');
     el.className='home-feed-media';el.src=item.url;el.loading='lazy';
     if(item.media_type==='video'){observeFeedVideo(el)}else{el.alt=item.alt_text||post.content||'Foto publicada na comunidade';el.tabIndex=0;el.title='Toque para ampliar (opcional)';el.addEventListener('click',()=>{const viewer=document.createElement('div');viewer.style.cssText='position:fixed;inset:0;z-index:9999;background:#000e;display:grid;place-items:center;padding:16px';const image=document.createElement('img');image.src=item.url;image.alt=el.alt;image.style.cssText='max-width:100%;max-height:100%;object-fit:contain';const close=document.createElement('button');close.type='button';close.textContent='Fechar';close.style.cssText='position:absolute;top:16px;right:16px;padding:10px 14px;border:1px solid #fff;border-radius:22px;background:#111;color:#fff';close.addEventListener('click',()=>viewer.remove());viewer.addEventListener('click',event=>{if(event.target===viewer)viewer.remove()});viewer.append(image,close);document.body.append(viewer)});}
     card.append(el);
    }
    if(postMusic.has(post.id))card.append(createPostMusicControl(postMusic.get(post.id)));
    const actions=document.createElement('div');actions.className='home-feed-actions';
    const like=document.createElement('button');like.type='button';like.textContent='♡ Curtir';
    const comments=document.createElement('button');comments.type='button';comments.textContent='💬 Comentários';
    try{const social=await getPostSocial(post.id);like.textContent=(social.liked?'♥':'♡')+' '+social.likeCount+' curtidas';comments.textContent='💬 '+social.comments.length+' comentários'}catch{}
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
 fileInput?.addEventListener('change',()=>renderSelectedMedia(fileInput.files?.[0]));
 clearMedia?.addEventListener('click',clearSelectedMedia);
 caption?.addEventListener('input',()=>{if(charCount)charCount.textContent=caption.value.length+'/1500'});
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  const text=$('home-feed-text').value.trim(),file=fileInput?.files?.[0];
  if(!text&&!file){status.textContent='Escreva uma mensagem ou escolha uma foto/vídeo.';return}
  if(file){const allowed=['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'];if(!allowed.includes(file.type)){status.textContent='Formato não permitido.';return}const max=file.type.startsWith('image/')?10*1024*1024:50*1024*1024;if(file.size>max){status.textContent='Arquivo muito grande para publicar.';return}}
  const button=form.querySelector('button[type=submit]');button.disabled=true;status.textContent='Publicando…';
  try{
   const session=await getCurrentSession();if(!session?.user)throw new Error('Entre na sua conta para publicar no Feed.');
   const post=await submitMyPost(text||'📸 Nova publicação na comunidade');
   if(file){
    const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'})[file.type];
    const path=session.user.id+'/posts/'+crypto.randomUUID()+'.'+ext;
    const uploaded=await supabase.storage.from('capital-do-trem-social').upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});
    if(uploaded.error)throw uploaded.error;
    const row=await supabase.from('post_media').insert({post_id:post.id,owner_id:session.user.id,bucket_id:'capital-do-trem-social',storage_path:path,media_type:file.type.startsWith('video/')?'video':'image',mime_type:file.type,byte_size:file.size,alt_text:text.slice(0,200)});
    if(row.error)throw row.error;
   }
   $('home-feed-text').value='';clearSelectedMedia();if(charCount)charCount.textContent='0/1500';status.textContent='Publicação compartilhada com os Maquinistas! ❤️';await load();
  }catch(error){status.textContent=error.message||'Não foi possível publicar.'}
  finally{button.disabled=false}
 });
 (async()=>{try{const session=await getCurrentSession();currentUser=session?.user||null;if(!currentUser){status.textContent='Entre ou crie sua conta para publicar, curtir e comentar.';form.querySelector('button[type=submit]').disabled=true}}catch{}await load()})();
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
