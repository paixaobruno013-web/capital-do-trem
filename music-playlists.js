import {getCurrentSession,getPublishedSongs,getMyPlaylists,createMyPlaylist,renameMyPlaylist,deleteMyPlaylist,addSongToMyPlaylist,removeSongFromMyPlaylist,moveSongInMyPlaylist} from './supabase/auth.js';
const $=id=>document.getElementById(id);
const root=$('music-playlists-list'),form=$('music-playlist-create'),status=$('music-playlist-status');
if(root&&form){
 let songs=[];
 const say=value=>{status.textContent=value||''};
 function render(playlists){
  root.replaceChildren();
  if(!playlists.length){root.innerHTML='<p class="muted">Você ainda não criou uma playlist. Crie uma para organizar sua música!</p>';return}
  for(const playlist of playlists){
   const card=document.createElement('article');card.className='music-playlist-card';
   const head=document.createElement('div');head.className='music-playlist-head';
   const title=document.createElement('strong');title.textContent='♫ '+playlist.name+' · '+playlist.songs.length+' faixa(s)';
   const actions=document.createElement('div');actions.className='music-playlist-actions';
   const rename=document.createElement('button');rename.type='button';rename.className='btn alt';rename.textContent='Renomear';rename.addEventListener('click',async()=>{const value=prompt('Novo nome da playlist:',playlist.name);if(value===null)return;try{await renameMyPlaylist(playlist.id,value);say('Playlist renomeada.');await load()}catch(error){say(error.message)}});
   const remove=document.createElement('button');remove.type='button';remove.className='btn alt';remove.textContent='Excluir';remove.addEventListener('click',async()=>{if(!confirm('Excluir a playlist '+playlist.name+'?'))return;try{await deleteMyPlaylist(playlist.id);say('Playlist excluída.');await load()}catch(error){say(error.message)}});
   actions.append(rename,remove);head.append(title,actions);card.append(head);
   const row=document.createElement('div');row.className='music-playlist-add';
   const select=document.createElement('select');select.setAttribute('aria-label','Escolher faixa para '+playlist.name);
   const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=songs.length?'Adicionar uma música publicada…':'Nenhuma música publicada';select.append(placeholder);
   for(const song of songs){const option=document.createElement('option');option.value=song.id;option.textContent=(song.title||'Faixa')+' — '+(song.artist_name||'Artista');select.append(option)}
   const add=document.createElement('button');add.type='button';add.className='btn primary';add.textContent='Adicionar';add.disabled=!songs.length;
   add.addEventListener('click',async()=>{if(!select.value){say('Escolha uma música primeiro.');return}add.disabled=true;try{await addSongToMyPlaylist(playlist.id,select.value);say('Música adicionada!');await load()}catch(error){say(error.message)}finally{add.disabled=false}});
   row.append(select,add);card.append(row);
   playlist.songs.forEach((entry,index)=>{
    const song=songs.find(s=>s.id===entry.song_id),line=document.createElement('div');line.className='music-playlist-song';
    const label=document.createElement('span');label.textContent=(index+1)+'. '+(song?.title||'Faixa indisponível')+' — '+(song?.artist_name||'');
    const tools=document.createElement('div');
    const up=document.createElement('button');up.type='button';up.textContent='↑';up.disabled=index===0;up.setAttribute('aria-label','Mover para cima');up.addEventListener('click',async()=>{try{await moveSongInMyPlaylist(playlist.id,entry.song_id,-1);await load()}catch(error){say(error.message)}});
    const down=document.createElement('button');down.type='button';down.textContent='↓';down.disabled=index===playlist.songs.length-1;down.setAttribute('aria-label','Mover para baixo');down.addEventListener('click',async()=>{try{await moveSongInMyPlaylist(playlist.id,entry.song_id,1);await load()}catch(error){say(error.message)}});
    const del=document.createElement('button');del.type='button';del.textContent='Remover';del.addEventListener('click',async()=>{try{await removeSongFromMyPlaylist(playlist.id,entry.song_id);say('Faixa removida.');await load()}catch(error){say(error.message)}});
    tools.append(up,down,del);line.append(label,tools);card.append(line);
   });
   root.append(card);
  }
 }
 async function load(){
  try{const playlists=await getMyPlaylists();render(playlists);window.capitalMusicPlayer?.setPlaylists?.(playlists)}
  catch(error){root.textContent=error.message||'Não foi possível carregar suas playlists.'}
 }
 form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button');button.disabled=true;try{await createMyPlaylist($('music-playlist-name').value);$('music-playlist-name').value='';say('Playlist criada!');await load()}catch(error){say(error.message)}finally{button.disabled=false}});
 (async()=>{try{const session=await getCurrentSession();songs=await getPublishedSongs();if(!session?.user){root.textContent='Entre na sua conta para criar e guardar playlists.';form.querySelector('button').disabled=true;return}await load()}catch(error){root.textContent=error.message||'Não foi possível carregar o catálogo musical.'}})();
}
