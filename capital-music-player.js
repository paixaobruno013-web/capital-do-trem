const byId=id=>document.getElementById(id);
const formatTime=value=>{if(!Number.isFinite(value)||value<0)return '0:00';const m=Math.floor(value/60),s=Math.floor(value%60);return m+':'+String(s).padStart(2,'0')};
function safeAudioUrl(value){try{const url=new URL(value,location.href);return ['https:','http:','blob:'].includes(url.protocol)?url.href:''}catch{return ''}}
export function createCapitalMusicPlayer(rootId,{showPlaylists=false,onPlay=null}={}){
 const root=typeof rootId==='string'?byId(rootId):rootId;if(!root)return null;
 root.replaceChildren();root.classList.add('ct-player-host');
 const shell=document.createElement('section');shell.className='ct-player-shell';shell.setAttribute('aria-label','Player musical Capital do Trem');
 const top=document.createElement('div');top.className='ct-player-topline';const brand=document.createElement('span');brand.textContent='CAPITAL DO TREM • MUSIC EXPERIENCE';const live=document.createElement('span');live.className='ct-player-live';live.textContent='● PLAYER';top.append(brand,live);
 const stage=document.createElement('div');stage.className='ct-player-stage';
 const artWrap=document.createElement('div');artWrap.className='ct-player-art-wrap';
 const art=document.createElement('div');art.className='ct-player-artwork';art.innerHTML='<span class="ct-art-orbit ct-art-orbit-one"></span><span class="ct-art-orbit ct-art-orbit-two"></span><img class="ct-art-mini-logo logo-one" src="./marca.svg" alt="Logo Capital do Trem"><img class="ct-art-mini-logo logo-two" src="./marca.svg" alt="Logo Capital do Trem"><img class="ct-art-mini-logo logo-three" src="./marca.svg" alt="Logo Capital do Trem"><span class="ct-art-triangle">🔺</span><span class="ct-art-equalizer" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><strong class="ct-art-brand">CAPITAL<br>DO TREM</strong><small class="ct-art-caption">A MÚSICA NÃO PARA</small>';artWrap.append(art);
 const disc=document.createElement('div');disc.className='ct-player-disc';disc.setAttribute('aria-hidden','true');artWrap.append(disc);
 const info=document.createElement('div');info.className='ct-player-info';
 const eyebrow=document.createElement('span');eyebrow.className='ct-player-eyebrow';eyebrow.textContent='TOCANDO AGORA';
 const title=document.createElement('h3');title.className='ct-player-title';title.textContent='Escolha uma música';
 const artist=document.createElement('p');artist.className='ct-player-artist';artist.textContent='Artista da comunidade';
 const artTitle=document.createElement('strong');artTitle.className='ct-art-track-title';artTitle.textContent='SUA PRÓXIMA FAIXA';
 const artArtist=document.createElement('small');artArtist.className='ct-art-track-artist';artArtist.textContent='ARTISTA DA COMUNIDADE';
 art.append(artTitle,artArtist);
 const producer=document.createElement('p');producer.className='ct-player-producer';producer.hidden=true;
 info.append(eyebrow,title,artist,producer);stage.append(artWrap,info);
 const catalogPicker=document.createElement('label');catalogPicker.className='ct-player-playlist-label ct-player-catalog-label';catalogPicker.textContent='MÚSICAS DISPONÍVEIS';const catalogSelect=document.createElement('select');catalogSelect.className='ct-player-playlist ct-player-catalog-select';catalogSelect.setAttribute('aria-label','Escolher música publicada');const catalogPlaceholder=document.createElement('option');catalogPlaceholder.value='';catalogPlaceholder.textContent='Carregando músicas publicadas…';catalogSelect.append(catalogPlaceholder);catalogPicker.append(catalogSelect);shell.append(top,stage,catalogPicker);
 let playlistSelect=null;
 if(showPlaylists){const picker=document.createElement('label');picker.className='ct-player-playlist-label';picker.textContent='SUA PLAYLIST';playlistSelect=document.createElement('select');playlistSelect.className='ct-player-playlist';playlistSelect.setAttribute('aria-label','Escolher playlist');const option=document.createElement('option');option.value='';option.textContent='Carregando playlists…';playlistSelect.append(option);picker.append(playlistSelect);shell.append(picker)}
 const progressWrap=document.createElement('div');progressWrap.className='ct-player-progress-wrap';const range=document.createElement('input');range.type='range';range.min='0';range.max='1000';range.value='0';range.className='ct-player-range';range.setAttribute('aria-label','Posição da música');const times=document.createElement('div');times.className='ct-player-times';const elapsed=document.createElement('span');elapsed.textContent='0:00';const duration=document.createElement('span');duration.textContent='0:00';times.append(elapsed,duration);progressWrap.append(range,times);
 const controls=document.createElement('div');controls.className='ct-player-controls';
 const previous=document.createElement('button');previous.type='button';previous.className='ct-player-control';previous.textContent='⏮';previous.setAttribute('aria-label','Música anterior');
 const play=document.createElement('button');play.type='button';play.className='ct-player-play';play.textContent='▶';play.setAttribute('aria-label','Reproduzir');
 const next=document.createElement('button');next.type='button';next.className='ct-player-control';next.textContent='⏭';next.setAttribute('aria-label','Próxima música');
 const mute=document.createElement('button');mute.type='button';mute.className='ct-player-volume';mute.textContent='🔊';mute.setAttribute('aria-label','Silenciar ou ativar som');
 const fullscreen=document.createElement('button');fullscreen.type='button';fullscreen.className='ct-player-fullscreen';fullscreen.textContent='⛶';fullscreen.title='Expandir o reprodutor';fullscreen.setAttribute('aria-label','Abrir player em tela cheia');fullscreen.setAttribute('aria-pressed','false');
 controls.append(previous,play,next,mute,fullscreen);
 const status=document.createElement('p');status.className='ct-player-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent='Escolha uma faixa para começar a ouvir.';
 const audio=document.createElement('audio');audio.preload='none';audio.hidden=true;
 shell.append(progressWrap,controls,status,audio);root.append(shell);
 let catalog=[],queue=[],index=0,playlists=[],lastRecordedSongId=null;
 const current=()=>queue[index]||null;
 function setCurrent(song,{autoplay=false}={}){
  lastRecordedSongId=null;
  if(!song){audio.pause();audio.removeAttribute('src');audio.load();title.textContent='Escolha uma música';artist.textContent='Artista da comunidade';producer.hidden=true;range.value='0';elapsed.textContent='0:00';duration.textContent='0:00';play.textContent='▶';status.textContent='Nenhuma faixa disponível nesta seleção.';return}
  const url=safeAudioUrl(song.audio_url);if(!url){status.textContent='O áudio desta faixa está indisponível.';return}
  audio.pause();audio.src=url;audio.load();title.textContent=song.title||'Faixa sem título';artist.textContent=song.artist_name||'Artista da comunidade';producer.textContent=song.producer_name?'Produção: '+song.producer_name:'';producer.hidden=!song.producer_name;
  artTitle.textContent=song.title||'FAIXA MUSICAL';artArtist.textContent=(song.artist_name||'ARTISTA DA COMUNIDADE').toUpperCase();
  if(catalogSelect&&song.id)catalogSelect.value=song.id;
  art.dataset.songId=song.id||'';art.style.setProperty('--art-hue',String((String(song.id||song.title||'trem').split('').reduce((n,ch)=>n+ch.charCodeAt(0),0)*7)%360));
  range.value='0';elapsed.textContent='0:00';duration.textContent='0:00';play.textContent='▶';status.textContent='Faixa '+(index+1)+' de '+queue.length+' • pronta para tocar.';
  if('mediaSession' in navigator){try{navigator.mediaSession.metadata=new MediaMetadata({title:song.title||'Capital do Trem',artist:song.artist_name||'Artista da comunidade',album:'Capital do Trem',artwork:[{src:'./marca.svg',sizes:'any',type:'image/svg+xml'}]});}catch{}}
  if(autoplay)audio.play().catch(()=>{status.textContent='Toque em reproduzir para ouvir esta faixa.'});
 }
 function setQueue(items,start=0,{autoplay=false}={}){queue=(items||[]).filter(song=>safeAudioUrl(song.audio_url));index=Math.max(0,Math.min(start,queue.length-1));setCurrent(current(),{autoplay});}
 function playSong(song){const found=catalog.findIndex(item=>item.id===song?.id);if(found>=0&&safeAudioUrl(song.audio_url)===safeAudioUrl(catalog[found].audio_url)){setQueue(catalog,found,{autoplay:true});return}setQueue([song],0,{autoplay:true});}
 function step(amount){if(!queue.length)return;index=(index+amount+queue.length)%queue.length;setCurrent(current(),{autoplay:true});}
 play.addEventListener('click',()=>{if(!current()){status.textContent='Escolha uma música no catálogo ou uma playlist.';return}if(audio.paused)audio.play().catch(()=>{status.textContent='Não foi possível iniciar a reprodução. Tente novamente.'});else audio.pause()});
 previous.addEventListener('click',()=>{if(audio.currentTime>3){audio.currentTime=0;return}step(-1)});
 next.addEventListener('click',()=>step(1));
 mute.addEventListener('click',()=>{audio.muted=!audio.muted;mute.textContent=audio.muted?'🔇':'🔊';mute.setAttribute('aria-label',audio.muted?'Ativar som':'Silenciar')});
 function setFullscreen(enabled){
  root.classList.toggle('ct-player-fullscreen',enabled);
  document.body.classList.toggle('ct-player-fullscreen-open',enabled);
  fullscreen.setAttribute('aria-pressed',String(enabled));
  fullscreen.setAttribute('aria-label',enabled?'Recolher reprodutor':'Expandir reprodutor');fullscreen.title=enabled?'Recolher reprodutor e continuar navegando':'Expandir reprodutor';
  fullscreen.textContent=enabled?'⌄':'⛶';
 }
 fullscreen.addEventListener('click',()=>setFullscreen(!root.classList.contains('ct-player-fullscreen')));
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&root.classList.contains('ct-player-fullscreen'))setFullscreen(false)});
 function updateMediaPosition(){if(!('mediaSession' in navigator)||!Number.isFinite(audio.duration)||audio.duration<=0)return;try{navigator.mediaSession.setPositionState({duration:audio.duration,playbackRate:audio.playbackRate,position:Math.min(audio.currentTime,audio.duration)})}catch{}}
 function configureMediaSession(){if(!('mediaSession' in navigator))return;const actions=[['play',()=>audio.play()],['pause',()=>audio.pause()],['previoustrack',()=>step(-1)],['nexttrack',()=>step(1)],['seekbackward',details=>{audio.currentTime=Math.max(0,audio.currentTime-(details.seekOffset||10))}],['seekforward',details=>{audio.currentTime=Math.min(audio.duration||Infinity,audio.currentTime+(details.seekOffset||10))}],['seekto',details=>{if(Number.isFinite(details.seekTime))audio.currentTime=Math.max(0,Math.min(audio.duration||Infinity,details.seekTime))}]];for(const [action,handler] of actions){try{navigator.mediaSession.setActionHandler(action,handler)}catch{}}}
 audio.addEventListener('play',()=>{if(current()&&typeof onPlay==='function'&&lastRecordedSongId!==current().id){lastRecordedSongId=current().id;onPlay(current())}shell.classList.add('is-playing');play.textContent='Ⅱ';play.setAttribute('aria-label','Pausar');status.textContent='Tocando agora';if('mediaSession' in navigator){try{navigator.mediaSession.playbackState='playing';configureMediaSession();updateMediaPosition()}catch{}}});
 audio.addEventListener('pause',()=>{shell.classList.remove('is-playing');play.textContent='▶';play.setAttribute('aria-label','Reproduzir');if('mediaSession' in navigator){try{navigator.mediaSession.playbackState='paused'}catch{}}});
 audio.addEventListener('ended',()=>{if('mediaSession' in navigator){try{navigator.mediaSession.playbackState='none'}catch{}}if(queue.length>1)step(1);else{play.textContent='↻';status.textContent='Faixa finalizada.'}});
 audio.addEventListener('error',()=>{shell.classList.remove('is-playing');play.textContent='▶';status.textContent='Não foi possível carregar esta música. Verifique a conexão e tente novamente.';});
 audio.addEventListener('timeupdate',()=>{if(Number.isFinite(audio.duration)&&audio.duration>0){range.value=String(Math.round(audio.currentTime/audio.duration*1000));elapsed.textContent=formatTime(audio.currentTime);duration.textContent=formatTime(audio.duration);updateMediaPosition()}});
 audio.addEventListener('loadedmetadata',()=>{duration.textContent=formatTime(audio.duration)});
 range.addEventListener('input',()=>{if(Number.isFinite(audio.duration)&&audio.duration>0){audio.currentTime=(Number(range.value)/1000)*audio.duration}});
 window.addEventListener('capital:play-song',event=>{if(event.detail?.song)playSong(event.detail.song)});
 function setCatalog(items){
  catalog=(items||[]).filter(song=>safeAudioUrl(song.audio_url));
  catalogSelect.replaceChildren();
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=catalog.length?'Escolha uma música publicada…':'Nenhuma música publicada no momento';catalogSelect.append(placeholder);
  for(const song of catalog){const option=document.createElement('option');option.value=song.id;option.textContent=(song.title||'Faixa sem título')+' — '+(song.artist_name||'Capital do Trem');catalogSelect.append(option);}
  if(!queue.length&&catalog.length)setQueue(catalog);
 }
 function setPlaylists(items){playlists=items||[];if(!playlistSelect)return;playlistSelect.replaceChildren();if(!playlists.length){const o=document.createElement('option');o.value='';o.textContent='Crie uma playlist na área Músicas';playlistSelect.append(o);status.textContent='Crie sua playlist na área Músicas para ouvir aqui.';return}const first=document.createElement('option');first.value='';first.textContent='Escolha sua playlist…';playlistSelect.append(first);for(const item of playlists){const o=document.createElement('option');o.value=item.id;o.textContent=item.name+' ('+(item.songs?.length||0)+' faixas)';playlistSelect.append(o)}}
 catalogSelect.addEventListener('change',()=>{const chosen=catalog.find(song=>song.id===catalogSelect.value);if(chosen){const playable=catalog;const start=playable.findIndex(song=>song.id===chosen.id);setQueue(playable,start,{autoplay:true});}});
 if(playlistSelect)playlistSelect.addEventListener('change',()=>{const selected=playlists.find(item=>item.id===playlistSelect.value);const songs=(selected?.songs||[]).map(entry=>catalog.find(song=>song.id===entry.song_id)).filter(Boolean);setQueue(songs);status.textContent=songs.length?'Playlist pronta • '+songs.length+' faixas.':'Esta playlist ainda não tem faixas publicadas.'});
 return {setCatalog,setPlaylists,setQueue,playSong,getAudio:()=>audio};
}
