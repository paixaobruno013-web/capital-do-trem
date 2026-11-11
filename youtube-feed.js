import { initSupabase, getCurrentSession } from './supabase/auth.js';

const FEED_ENDPOINT = 'https://zmjxkfjzrbbxyvgkwirv.supabase.co/functions/v1/youtube-channel-feed';
const PUBLIC_KEY = 'sb_publishable_FLbDg6UCePQHb7s0wkywng_J9pNKlsP';
const grid = document.querySelector('.home-youtube-grid');
const status = document.getElementById('youtube-feed-status');
let initialSessionPromise;
function getInitialSession(){if(!initialSessionPromise)initialSessionPromise=getCurrentSession().catch(()=>null);return initialSessionPromise;}

// Biblioteca de vídeos enviada pelo usuário: 20 Shorts anteriores + 5 Shorts novos + 2 Reels.
const SHORTS = [
  'XG6J1-wxmqY','2pi4Chy_T7k','AYaC4UX3LQM','Ln7uxqY68u4','MBXrQa52x7I',
  '6g-LDLVRXmM','l0LLjmqqGPg','6oqpTDwEz_k','x4Wbv87Pl9k','Hhe4uvhFh5M',
  '5xUC-8Zu--s','8YI6twT5FIQ','uDmGRWA_hMU','78IJ7SVpvI4','v2fvGO7GaHs',
  'VLDQtWADNA0','Kjsypc0JzB0','dFVVsD0Nsfg','NcMLXKNkGzg','Pu_QnJPSntA',
  '1KWg2a4EzdE','aGNcqYziW3A','dmPocI-xO80','9Ll_XmCqYH4','rsJLrRqJZK4'
].map((id,index)=>({id,title:'Short enviado '+(index+1),platform:'youtube',url:'https://www.youtube.com/shorts/'+id}));
const INSTAGRAM_REELS = [
  {id:'DcO71e-zVf_',title:'Reel do Instagram 1',platform:'instagram',url:'https://www.instagram.com/reel/DcO71e-zVf_/'},
  {id:'DfkwRcFBY4f',title:'Reel do Instagram 2',platform:'instagram',url:'https://www.instagram.com/reel/DfkwRcFBY4f/'}
];
const EXPLORE_VIDEOS = [...SHORTS,...INSTAGRAM_REELS];

// Os nove vídeos da tela inicial usam proporção 16:9 (1280 × 720).
// Os vídeos verticais da área Explorar mantêm seu formato original.
const HOME_VIDEOS = [
  {id:'LmI04iuudmQ',title:'Vídeo 1 — Capital do Trem'},
  {id:'DDHrNCagaD0',title:'Vídeo 2 — Capital do Trem'},
  {id:'eQHIsU_mamM',title:'Vídeo 3 — Capital do Trem'},
  {id:'W4wnKF5AHQA',title:'Vídeo 4 — Capital do Trem'},
  {id:'-c2QERKILzg',title:'Vídeo 5 — Capital do Trem'},
  {id:'HHKsZAS1eMk',title:'Vídeo 6 — Capital do Trem'},
  {id:'AT-kZl6j-z8',title:'Vídeo 7 — Capital do Trem'},
  {id:'tDINGPA7Wcs',title:'Vídeo 8 — Capital do Trem'},
  {id:'6iovhzLNabU',title:'Vídeo 9 — Capital do Trem'}
];

function setStatus(message){if(status)status.textContent=message;}
function videoUrl(id){return 'https://youtu.be/'+encodeURIComponent(id);}
function createPlayer(id,title){
  const frame=document.createElement('iframe');
  frame.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?playsinline=1&rel=0&autoplay=1';
  frame.title=title;
  frame.loading='lazy';
  frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  frame.allowFullscreen=true;
  return frame;
}
async function requireSession(){
  const session=await getCurrentSession();
  if(session?.user)initialSessionPromise=Promise.resolve(session);
  if(!session?.user){setStatus('Entre na sua conta para curtir ou comentar.');return null;}
  return session;
}
async function loadInteractions(card,video){
  try{
    const client=initSupabase();
    const [{count,error:likeError},{data:ownLike,error:ownError}]=await Promise.all([
      client.from('video_likes').select('id',{count:'exact',head:true}).eq('youtube_video_id',video.id),
      getInitialSession().then(session=>session?.user?client.from('video_likes').select('id').eq('youtube_video_id',video.id).eq('user_id',session.user.id).maybeSingle():{data:null,error:null})
    ]);
    if(likeError)throw likeError;
    if(ownError)throw ownError;
    const like=card.querySelector('[data-action="like"]');
    like.textContent='♥ Curtir ('+(count||0)+')';
    like.setAttribute('aria-pressed',String(Boolean(ownLike)));

  }catch(error){
    console.warn('Interações dos vídeos ainda não estão disponíveis:',error);
    setStatus('Não foi possível carregar as curtidas agora. Tente novamente em instantes.');
  }
}
async function loadComments(card,video){
  const list=card.querySelector('.home-youtube-comment-list');
  if(!list)return;
  try{
    const client=initSupabase();
    const {data,error}=await client.from('video_comments').select('body,created_at').eq('youtube_video_id',video.id).order('created_at',{ascending:false}).limit(20);
    if(error)throw error;
    list.replaceChildren();
    (data||[]).reverse().forEach(item=>{
      const p=document.createElement('p');p.className='home-youtube-comment';p.textContent=item.body;
      const time=document.createElement('time');time.dateTime=item.created_at;time.textContent=new Date(item.created_at).toLocaleString('pt-BR');
      p.append(time);list.append(p);
    });
  }catch(error){setStatus('Não foi possível carregar os comentários.');console.warn(error);}
}
function makeCard(video,index){
  const article=document.createElement('article');
  article.className='home-youtube-video home-youtube-featured';
  const title=document.createElement('h3');title.textContent=video.title||'Vídeo da Capital do Trem';
  const frame=document.createElement('div');frame.className='home-youtube-frame';
  const cover=document.createElement('button');cover.type='button';cover.className='home-youtube-load';
  cover.setAttribute('aria-label','Reproduzir '+title.textContent);
  const image=document.createElement('img');image.src='https://i.ytimg.com/vi/'+video.id+'/hqdefault.jpg';image.alt='';image.loading='lazy';image.decoding='async';
  const play=document.createElement('span');play.textContent='▶ Reproduzir aqui';
  cover.append(image,play);
  cover.addEventListener('click',()=>cover.replaceWith(createPlayer(video.id,title.textContent)),{once:true});
  frame.append(cover);
  const actions=document.createElement('div');actions.className='home-youtube-actions';
  const like=document.createElement('button');like.type='button';like.dataset.action='like';like.textContent='♥ Curtir';like.addEventListener('click',async()=>{
    try{
      const session=await requireSession();if(!session)return;
      const client=initSupabase();
      const {data:own,error}=await client.from('video_likes').select('id').eq('youtube_video_id',video.id).eq('user_id',session.user.id).maybeSingle();
      if(error)throw error;
      if(own){const removed=await client.from('video_likes').delete().eq('id',own.id);if(removed.error)throw removed.error;}
      else{const added=await client.from('video_likes').insert({youtube_video_id:video.id,user_id:session.user.id});if(added.error)throw added.error;}
      await loadInteractions(article,video);
    }catch(error){setStatus(error?.message||'Não foi possível registrar sua curtida.');}
  });
  const commentToggle=document.createElement('button');commentToggle.type='button';commentToggle.textContent='💬 Comentar';
  const share=document.createElement('button');share.type='button';share.textContent='↗ Compartilhar';
  share.addEventListener('click',async()=>{
    const url=videoUrl(video.id);
    try{if(navigator.share)await navigator.share({title:video.title,text:'Olha esse vídeo no Capital do Trem!',url});else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);setStatus('Link copiado para compartilhar.');}else window.prompt('Copie o link do vídeo:',url);}catch(error){if(error?.name!=='AbortError')setStatus('Não foi possível compartilhar agora.');}
  });
  const send=document.createElement('a');send.className='btn alt';send.textContent='💬 Koe Fala Tu';
  const messageUrl=new URL('./mensagens.html',window.location.href);messageUrl.searchParams.set('share_title',video.title);messageUrl.searchParams.set('share_url',videoUrl(video.id));messageUrl.searchParams.set('share_source','YouTube');send.href=messageUrl.pathname+messageUrl.search;
  actions.append(like,commentToggle,share,send);
  const panel=document.createElement('div');panel.className='home-youtube-comments';panel.hidden=true;
  const form=document.createElement('form');const textarea=document.createElement('textarea');textarea.maxLength=1000;textarea.required=true;textarea.placeholder='Escreva um comentário…';
  const submit=document.createElement('button');submit.type='submit';submit.textContent='Publicar comentário';
  form.append(textarea,submit);
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const body=textarea.value.trim();if(!body)return;
    try{const session=await requireSession();if(!session)return;const client=initSupabase();const {error}=await client.from('video_comments').insert({youtube_video_id:video.id,user_id:session.user.id,body});if(error)throw error;textarea.value='';await loadComments(article,video);setStatus('Comentário publicado.');}
    catch(error){setStatus(error?.message||'Não foi possível publicar o comentário.');}
  });
  const list=document.createElement('div');list.className='home-youtube-comment-list';
  panel.append(form,list);
  commentToggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;if(!panel.hidden)loadComments(article,video);});
  article.append(title,frame,actions,panel);
  loadInteractions(article,video);
  return article;
}

function makeExploreCard(video,index){
  const article=document.createElement('article');article.className='explore-video-card';
  const heading=document.createElement('h3');heading.textContent=video.title;
  const stage=document.createElement('div');stage.className='explore-video-stage';
  const play=document.createElement('button');play.type='button';play.className='explore-video-play';play.textContent='▶ Assistir';
  if(video.platform==='youtube'){
    const image=document.createElement('img');image.src='https://i.ytimg.com/vi/'+video.id+'/hqdefault.jpg';image.alt='Prévia do Short';image.loading='lazy';image.decoding='async';
    play.prepend(image);
    play.addEventListener('click',()=>{const frame=createPlayer(video.id,video.title);frame.className='explore-video-iframe';stage.replaceChildren(frame);},{once:true});
  }else{
    play.textContent='▶ Reproduzir Reel';
    play.addEventListener('click',()=>{const frame=document.createElement('iframe');frame.className='explore-video-iframe';frame.src='https://www.instagram.com/reel/'+encodeURIComponent(video.id)+'/embed';frame.title=video.title;frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';frame.allow='autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share';frame.allowFullscreen=true;stage.replaceChildren(frame);},{once:true});
  }
  stage.append(play);
  const link=document.createElement('a');link.href=video.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=video.platform==='youtube'?'Abrir no YouTube':'Abrir no Instagram';
  article.append(heading,stage,link);return article;
}
function renderExploreVideos(){
  const target=document.getElementById('explore-video-library');
  if(!target)return;
  const count=document.createElement('p');count.className='muted';count.textContent='27 vídeos enviados: 25 Shorts do YouTube e 2 Reels do Instagram. A reprodução acontece nesta área quando disponível.';
  const grid=document.createElement('div');grid.className='explore-video-grid';
  grid.append(...EXPLORE_VIDEOS.map(makeExploreCard));
  target.replaceChildren(count,grid);
}

async function render(){
  if(!grid)return;
  const videos=HOME_VIDEOS;
  grid.replaceChildren(...videos.map(makeCard));
  setStatus('Tela inicial: seis vídeos originais. Os Shorts e Reels ficam reunidos na área Explorar.');
  renderExploreVideos();
}
render();
