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
 const art=document.createElement('div');art.className='ct-player-artwork';art.innerHTML='<span class="ct-art-orbit ct-art-orbit-one"></span><span class="ct-art-orbit ct-art-orbit-two"></span><span class="ct-art-triangle">🔺</span><span class="ct-art-equalizer" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><strong class="ct-art-brand">CAPITAL<br>DO TREM</strong><small class="ct-art-caption">A MÚSICA NÃO PARA</small>';artWrap.append(art);
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
 let playlistSelect=null;
 if(showPlaylists){const picker=document.createElement('label');picker.className='ct-player-playlist-label';picker.textContent='SUA PLAYLIST';playlistSelect=document.createElement('select');playlistSelect.className='ct-player-playlist';playlistSelect.setAttribute('aria-label','Escolher playlist');const option=document.createElement('option');option.value='';option.textContent='Carregando playlists…';playlistSelect.append(option);picker.append(playlistSelect);shell.append(top,stage,picker)}else shell.append(top,stage);
 const progressWrap=document.createElement('div');progressWrap.className='ct-player-progress-wrap';const range=document.createElement('input');range.type='range';range.min='0';range.max='1000';range.value='0';range.className='ct-player-range';range.setAttribute('aria-label','Posição da música');const times=document.createElement('div');times.className='ct-player-times';const elapsed=document.createElement('span');elapsed.textContent='0:00';const duration=document.createElement('span');duration.textContent='0:00';times.append(elapsed,duration);progressWrap.append(range,times);
 const controls=document.createElement('div');controls.className='ct-player-controls';
 const previous=document.createElement('button');previous.type='button';previous.className='ct-player-control';previous.textContent='⏮';previous.setAttribute('aria-label','Música anterior');
 const play=document.createElement('button');play.type='button';play.className='ct-player-play';play.textContent='▶';play.setAttribute('aria-label','Reproduzir');
 const next=document.createElement('button');next.type='button';next.className='ct-player-control';next.textContent='⏭';next.setAttribute('aria-label','Próxima música');
 const mute=document.createElement('button');mute.type='button';mute.className='ct-player-volume';mute.textContent='🔊';mute.setAttribute('aria-label','Silenciar ou ativar som');
 controls.append(previous,play,next,mute);
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
 audio.addEventListener('play',()=>{if(current()?.id&&lastRecordedSongId!==current().id){lastRecordedSongId=current().id;if(typeof onPlay==='function')onPlay(current())}shell.classList.add('is-playing');play.textContent='Ⅱ';play.setAttribute('aria-label','Pausar');status.textContent='Tocando agora';if(typeof onPlay==='function'&&current())onPlay(current());if('mediaSession' in navigator){try{navigator.mediaSession.playbackState='playing';navigator.mediaSession.setActionHandler('play',()=>audio.play());navigator.mediaSession.setActionHandler('pause',()=>audio.pause());navigator.mediaSession.setActionHandler('previoustrack',()=>step(-1));navigator.mediaSession.setActionHandler('nexttrack',()=>step(1));}catch{}}});
 audio.addEventListener('pause',()=>{shell.classList.remove('is-playing');play.textContent='▶';play.setAttribute('aria-label','Reproduzir');if('mediaSession' in navigator){try{navigator.mediaSession.playbackState='paused'}catch{}}});
 audio.addEventListener('ended',()=>{if(queue.length>1)step(1);else{play.textContent='↻';status.textContent='Faixa finalizada.'}});
 audio.addEventListener('timeupdate',()=>{if(Number.isFinite(audio.duration)&&audio.duration>0){range.value=String(Math.round(audio.currentTime/audio.duration*1000));elapsed.textContent=formatTime(audio.currentTime);duration.textContent=formatTime(audio.duration)}});
 audio.addEventListener('loadedmetadata',()=>{duration.textContent=formatTime(audio.duration)});
 range.addEventListener('input',()=>{if(Number.isFinite(audio.duration)&&audio.duration>0){audio.currentTime=(Number(range.value)/1000)*audio.duration}});
 window.addEventListener('capital:play-song',event=>{if(event.detail?.song)playSong(event.detail.song)});
 function setCatalog(items){catalog=items||[];if(!queue.length&&catalog.length)setQueue(catalog)}
 function setPlaylists(items){playlists=items||[];if(!playlistSelect)return;playlistSelect.replaceChildren();if(!playlists.length){const o=document.createElement('option');o.value='';o.textContent='Crie uma playlist na Rede Social';playlistSelect.append(o);status.textContent='Monte sua playlist na área Rede Social para ouvir aqui.';return}const first=document.createElement('option');first.value='';first.textContent='Escolha sua playlist…';playlistSelect.append(first);for(const item of playlists){const o=document.createElement('option');o.value=item.id;o.textContent=item.name+' ('+(item.songs?.length||0)+' faixas)';playlistSelect.append(o)}}
 if(playlistSelect)playlistSelect.addEventListener('change',()=>{const selected=playlists.find(item=>item.id===playlistSelect.value);const songs=(selected?.songs||[]).map(entry=>catalog.find(song=>song.id===entry.song_id)).filter(Boolean);setQueue(songs);status.textContent=songs.length?'Playlist pronta • '+songs.length+' faixas.':'Esta playlist ainda não tem faixas publicadas.'});
 return {setCatalog,setPlaylists,setQueue,playSong,getAudio:()=>audio};
}
