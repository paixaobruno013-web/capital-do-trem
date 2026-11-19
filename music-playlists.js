import {getCurrentSession,getPublishedSongs,getPublishedSongsForProfile,searchPublicMusicProfiles,getMyPlaylists,createMyPlaylist,renameMyPlaylist,deleteMyPlaylist,addSongToMyPlaylist,removeSongFromMyPlaylist,moveSongInMyPlaylist} from './supabase/auth.js';
const $=id=>document.getElementById(id);
const root=$('music-playlists-list'),form=$('music-playlist-create'),status=$('music-playlist-status');
const quickCreate=$('create-music-playlist');
quickCreate?.addEventListener('click',()=>{form?.scrollIntoView({behavior:'smooth',block:'center'});$('music-playlist-name')?.focus({preventScroll:true});});
if(root&&form){
 let songs=[], catalogSongs=[];
 const say=value=>{if(status)status.textContent=value||''};
 const mergeSongs=items=>{for(const song of items||[]){const index=songs.findIndex(item=>item.id===song.id);if(index<0)songs.push(song);else songs[index]={...songs[index],...song}}};
 function makeOption(value,label){const option=document.createElement('option');option.value=value;option.textContent=label;return option}
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

   const sourceRow=document.createElement('div');sourceRow.className='music-playlist-source';
   const sourceLabel=document.createElement('label');sourceLabel.textContent='Encontrar música em';
   const source=document.createElement('select');source.setAttribute('aria-label','Origem das músicas');
   source.append(makeOption('catalog','Catálogo geral — primeiras músicas da lista'),makeOption('profile','Perfil de usuário, MC ou DJ'));
   sourceLabel.append(source);sourceRow.append(sourceLabel);
   const profileTools=document.createElement('div');profileTools.className='music-playlist-profile-search';profileTools.hidden=true;
   const query=document.createElement('input');query.type='search';query.placeholder='Nome ou @ do perfil';query.setAttribute('aria-label','Buscar perfil');
   const search=document.createElement('button');search.type='button';search.className='btn alt';search.textContent='Buscar perfil';
   const profiles=document.createElement('select');profiles.setAttribute('aria-label','Selecionar perfil');profiles.append(makeOption('','Selecione um perfil encontrado…'));
   profileTools.append(query,search,profiles);sourceRow.append(profileTools);card.append(sourceRow);

   const row=document.createElement('div');row.className='music-playlist-add';
   const select=document.createElement('select');select.setAttribute('aria-label','Escolher faixa para '+playlist.name);
   const add=document.createElement('button');add.type='button';add.className='btn primary';add.textContent='Adicionar';add.disabled=true;
   let availableSongs=catalogSongs;
   function showSongs(items){availableSongs=items||[];select.replaceChildren(makeOption('',availableSongs.length?'Escolha uma música publicada…':'Nenhuma música encontrada nesta origem'));for(const song of availableSongs)select.append(makeOption(song.id,(song.title||'Faixa')+' — '+(song.artist_name||'Artista')));add.disabled=!availableSongs.length}
   showSongs(catalogSongs);
   source.addEventListener('change',()=>{profileTools.hidden=source.value!=='profile';profiles.replaceChildren(makeOption('','Selecione um perfil encontrado…'));query.value='';showSongs(source.value==='catalog'?catalogSongs:[])});
   search.addEventListener('click',async()=>{search.disabled=true;try{const found=await searchPublicMusicProfiles(query.value);profiles.replaceChildren(makeOption('','Selecione um perfil encontrado…'));for(const profile of found){const name=profile.display_name||profile.username||'Perfil';profiles.append(makeOption(profile.user_id,name+' · @'+(profile.username||'sem_usuario')))}say(found.length?found.length+' perfil(is) encontrado(s). Escolha um para ver as músicas.':'Nenhum perfil público encontrado.');}catch(error){say(error.message)}finally{search.disabled=false}});
   query.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();search.click()}});
   profiles.addEventListener('change',async()=>{if(!profiles.value){showSongs([]);return}profiles.disabled=true;try{const tracks=await getPublishedSongsForProfile(profiles.value);mergeSongs(tracks);showSongs(tracks);say(tracks.length?'Músicas publicadas desse perfil carregadas.':'Esse perfil ainda não tem músicas publicadas.')}catch(error){showSongs([]);say(error.message)}finally{profiles.disabled=false}});
   add.addEventListener('click',async()=>{if(!select.value){say('Escolha uma música primeiro.');return}add.disabled=true;try{const added=await addSongToMyPlaylist(playlist.id,select.value);say(added?'Música adicionada!':'Essa música já está na playlist.');await load()}catch(error){say(error.message)}finally{add.disabled=!availableSongs.length}});
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
 async function load(){try{const playlists=await getMyPlaylists();render(playlists);window.capitalMusicPlayer?.setPlaylists?.(playlists)}catch(error){root.textContent=error.message||'Não foi possível carregar suas playlists.'}}
 form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button');button.disabled=true;try{await createMyPlaylist($('music-playlist-name').value);$('music-playlist-name').value='';say('Playlist criada!');await load()}catch(error){say(error.message)}finally{button.disabled=false}});
 (async()=>{try{const session=await getCurrentSession();if(!session?.user){root.textContent='Entre na sua conta para criar e guardar playlists.';form.querySelector('button').disabled=true;return}catalogSongs=await getPublishedSongs();mergeSongs(catalogSongs);await load()}catch(error){root.textContent=error.message||'Não foi possível carregar o catálogo musical.'}})();
}
