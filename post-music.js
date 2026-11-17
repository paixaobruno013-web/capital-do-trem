// Carrega a trilha opcional associada às publicações com foto.
export async function loadPostMusic(supabase, postIds) {
  const ids = [...new Set((postIds || []).filter(Boolean))];
  const result = new Map();
  if (!ids.length) return result;

  const { data: links, error } = await supabase
    .from('post_music')
    .select('post_id,song_id,start_seconds,duration_seconds,volume')
    .in('post_id', ids);
  if (error) {
    const message = String(error.message || '').toLowerCase();
    if (error.code === '42P01' || error.code === 'PGRST205' || message.includes('post_music') && message.includes('schema cache')) return result;
    throw error;
  }
  if (!links?.length) return result;

  const songIds = [...new Set(links.map(item => item.song_id))];
  const { data: songs, error: songsError } = await supabase
    .from('songs')
    .select('id,title,artist_name,storage_path')
    .in('id', songIds)
    .eq('status', 'published');
  if (songsError) throw songsError;

  const songMap = new Map((songs || []).map(song => [song.id, song]));
  const available = links.filter(link => songMap.has(link.song_id));
  if (!available.length) return result;

  const paths = [...new Set(available.map(link => songMap.get(link.song_id).storage_path))];
  const { data: signed, error: signedError } = await supabase.storage
    .from('capital-do-trem-audio')
    .createSignedUrls(paths, 60 * 60);
  if (signedError) throw signedError;
  const urls = new Map((signed || []).filter(item => item.path && item.signedUrl).map(item => [item.path, item.signedUrl]));

  for (const link of available) {
    const song = songMap.get(link.song_id);
    const audioUrl = urls.get(song.storage_path);
    if (audioUrl) result.set(link.post_id, {
      title: song.title,
      artist: song.artist_name,
      audioUrl,
      startSeconds: Math.max(0, Number(link.start_seconds) || 0),
      durationSeconds: Math.min(60, Math.max(5, Number(link.duration_seconds) || 15)),
      volume: Math.min(1, Math.max(0, Number(link.volume) || 0.8))
    });
  }
  return result;
}

export function createPostMusicControl(track) {
  const root = document.createElement('div');
  root.className = 'post-music-control';
  root.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;margin:8px 0;border:1px solid #ed1c2455;border-radius:12px;background:#ed1c2410';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'post-music-play';
  button.style.cssText = 'border:1px solid #ed1c24;border-radius:999px;padding:8px 13px;background:#ed1c24;color:#fff;font-weight:850';
  button.textContent = '♫ Ouvir trecho';
  button.setAttribute('aria-label', 'Ouvir trecho de ' + track.title);
  const label = document.createElement('span');
  label.textContent = [track.title, track.artist].filter(Boolean).join(' · ');
  label.className = 'post-music-label';
  label.style.cssText = 'font-size:12px;color:var(--muted);overflow-wrap:anywhere';
  const audio = new Audio(track.audioUrl);
  audio.preload = 'none';
  audio.volume = track.volume;
  let stopping = false;

  const reset = () => {
    stopping = true;
    audio.pause();
    try { audio.currentTime = track.startSeconds; } catch {}
    button.textContent = '♫ Ouvir trecho';
  };
  audio.addEventListener('timeupdate', () => {
    if (!stopping && audio.currentTime >= track.startSeconds + track.durationSeconds) reset();
  });
  audio.addEventListener('ended', reset);
  audio.addEventListener('pause', () => {
    if (!stopping) button.textContent = '♫ Ouvir trecho';
  });
  button.addEventListener('click', async () => {
    if (!audio.paused) { reset(); return; }
    stopping = false;
    try {
      if (audio.readyState < 1) await new Promise((resolve, reject) => {
        audio.addEventListener('loadedmetadata', resolve, { once: true });
        audio.addEventListener('error', reject, { once: true });
        audio.load();
      });
      audio.currentTime = Math.min(track.startSeconds, Math.max(0, audio.duration - 0.1));
      await audio.play();
      button.textContent = 'Ⅱ Pausar trecho';
    } catch {
      button.textContent = 'Não foi possível reproduzir';
    }
  });
  root.append(button, label);
  return root;
}
