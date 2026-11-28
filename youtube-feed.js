// Biblioteca independente da tela Pesquisa: vídeos ficam apenas em Explorar, na área Artistas.
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
function createPlayer(id,title){
  const frame=document.createElement('iframe');
  frame.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?playsinline=1&rel=0&autoplay=1';
  frame.title=title;frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  frame.allowFullscreen=true;frame.className='explore-video-iframe';return frame;
}
function makeExploreCard(video){
  const article=document.createElement('article');article.className='explore-video-card';
  const heading=document.createElement('h3');heading.textContent=video.title;
  const stage=document.createElement('div');stage.className='explore-video-stage';
  const play=document.createElement('button');play.type='button';play.className='explore-video-play';
  play.textContent=video.platform==='youtube'?'▶ Assistir no aplicativo':'▶ Reproduzir Reel';
  play.setAttribute('aria-label','Assistir '+video.title+' dentro do aplicativo');
  if(video.platform==='youtube'){
    const image=document.createElement('img');image.src='https://i.ytimg.com/vi/'+video.id+'/hqdefault.jpg';image.alt='Prévia do Short';image.loading='lazy';image.decoding='async';play.prepend(image);
    play.addEventListener('click',()=>stage.replaceChildren(createPlayer(video.id,video.title)),{once:true});
  }else{
    play.addEventListener('click',()=>{const frame=document.createElement('iframe');frame.className='explore-video-iframe';frame.src='https://www.instagram.com/reel/'+encodeURIComponent(video.id)+'/embed';frame.title=video.title;frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';frame.allow='autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share';frame.allowFullscreen=true;stage.replaceChildren(frame);},{once:true});
  }
  stage.append(play);
  const link=document.createElement('a');link.href=video.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=video.platform==='youtube'?'Abrir no YouTube':'Abrir no Instagram';
  article.append(heading,stage,link);return article;
}
function renderExploreVideos(){
  const target=document.getElementById('explore-video-library');if(!target)return;
  const count=document.createElement('p');count.className='muted';count.textContent='27 vídeos: 25 Shorts do YouTube e 2 Reels do Instagram.';
  const grid=document.createElement('div');grid.className='explore-video-grid';
  grid.append(...EXPLORE_VIDEOS.map(makeExploreCard));target.replaceChildren(count,grid);
}
renderExploreVideos();
