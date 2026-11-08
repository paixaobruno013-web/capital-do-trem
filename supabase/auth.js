// Capital do Trem — cliente de autenticação Supabase
// Este módulo só deve ser importado pela interface depois de configurar os dados públicos.
// Nunca inserir a chave service_role neste arquivo.

// O aplicativo pode ser aberto dentro de navegadores móveis com bloqueios pontuais de CDN.
let createClient;
try {
  ({ createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'));
} catch (primaryError) {
  try {
    ({ createClient } = await import('https://esm.sh/@supabase/supabase-js@2'));
  } catch (fallbackError) {
    throw new Error('Não foi possível carregar a biblioteca segura de autenticação. Verifique a conexão e tente novamente.');
  }
}

const SUPABASE_URL = 'https://zmjxkfjzrbbxyvgkwirv.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_FLbDg6UCePQHb7s0wkywng_J9pNKlsP';

let client = null;

export function initSupabase() {
  if (client) return client;

  if (
    !SUPABASE_URL.startsWith('https://') ||
    SUPABASE_URL.includes('COLE_AQUI') ||
    !SUPABASE_PUBLISHABLE_KEY ||
    SUPABASE_PUBLISHABLE_KEY.includes('COLE_AQUI')
  ) {
    throw new Error('O Capital do Trem ainda precisa ser conectado ao projeto Supabase.');
  }

  client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  return client;
}

export async function registerAccount({ email, password, displayName, accountType = 'user' }) {
  const supabase = initSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { name: String(displayName || '').trim().slice(0, 80), account_type: accountType === 'artist' ? 'artist' : 'user' },
      emailRedirectTo: window.location.href
    }
  });
  if (error) throw error;
  return data;
}

export async function signInAccount({ email, password }) {
  const supabase = initSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password
  });
  if (error) throw error;
  return data;
}

export async function signOutAccount() {
  const supabase = initSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function sendPasswordReset(email) {
  const supabase = initSupabase();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.href
  });
  if (error) throw error;
  return data;
}

export async function getCurrentSession() {
  const supabase = initSupabase();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function watchAuthChanges(callback) {
  const supabase = initSupabase();
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback({ event, session });
  });
  return () => data.subscription.unsubscribe();
}


// Envio de mídia: arquivos privados por pasta de usuário, com validação no cliente
// e limites reforçados pelo bucket/políticas do Supabase.
export async function uploadMyMedia(file, category) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para enviar uma imagem.');
  if (!(file instanceof File)) throw new Error('Selecione uma imagem.');
  const allowed = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  if (!allowed[file.type]) throw new Error('Use uma imagem JPG, PNG ou WebP.');
  if (file.size < 1 || file.size > 5 * 1024 * 1024) throw new Error('A imagem deve ter até 5 MB.');
  if (!['artist', 'event'].includes(category)) throw new Error('Tipo de imagem inválido.');
  const path = user.id + '/' + category + '/' + crypto.randomUUID() + '.' + allowed[file.type];
  const { error } = await supabase.storage.from('capital-do-trem-media').upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false
  });
  if (error) throw error;
  const { data } = supabase.storage.from('capital-do-trem-media').getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('Não foi possível obter o endereço da imagem enviada.');
  return data.publicUrl;
}

// Avatar da conta: foto otimizada no bucket de mídia ou personagem configurável.
export async function getMyAvatar() {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para acessar seu avatar.');
  const { data, error } = await supabase.from('profiles')
    .select('avatar_type, avatar_url, avatar_path, avatar_data')
    .eq('user_id', user.id).single();
  if (error) throw error;
  return data;
}

export async function saveMyAvatar({ type, file = null, character = null }) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para salvar seu avatar.');
  if (!['photo', 'character', 'default'].includes(type)) throw new Error('Tipo de avatar inválido.');

  const { data: current, error: currentError } = await supabase.from('profiles')
    .select('avatar_path').eq('user_id', user.id).single();
  if (currentError) throw currentError;

  let avatarUrl = null;
  let avatarPath = null;
  let avatarData = null;
  if (type === 'photo') {
    if (!(file instanceof File)) throw new Error('Escolha uma foto antes de salvar.');
    const allowed = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    if (!allowed[file.type] || file.size < 1 || file.size > 5 * 1024 * 1024) {
      throw new Error('Use uma foto JPG, PNG ou WebP de até 5 MB.');
    }
    avatarPath = user.id + '/avatar/' + crypto.randomUUID() + '.' + allowed[file.type];
    const { error: uploadError } = await supabase.storage.from('capital-do-trem-media')
      .upload(avatarPath, file, { contentType: file.type, cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('capital-do-trem-media').getPublicUrl(avatarPath);
    avatarUrl = data?.publicUrl || null;
    if (!avatarUrl) {
      await supabase.storage.from('capital-do-trem-media').remove([avatarPath]);
      throw new Error('Não foi possível gerar o endereço da foto.');
    }
  } else if (type === 'character') {
    if (!character || typeof character !== 'object') throw new Error('Configure seu personagem antes de salvar.');
    const allowed = {
      gender: ['male', 'female'],
      skin: ['#8d5524', '#f1c27d', '#c68642', '#5a3825', '#e0ac69'],
      hair: ['#171313', '#5b321d', '#d6a84b', '#a52a2a', '#777777'],
      shirt: ['#ed1c24', '#111111', '#eeeeee', '#2465a8', '#21834a', '#7a42a6']
    };
    for (const [key, values] of Object.entries(allowed)) {
      if (!values.includes(character[key])) throw new Error('Uma das opções do personagem é inválida.');
    }
    avatarData = { gender: character.gender, skin: character.skin, hair: character.hair, shirt: character.shirt };
  }

  const { error: updateError } = await supabase.from('profiles').update({
    avatar_type: type, avatar_url: avatarUrl, avatar_path: avatarPath, avatar_data: avatarData
  }).eq('user_id', user.id);
  if (updateError) {
    if (avatarPath) await supabase.storage.from('capital-do-trem-media').remove([avatarPath]);
    throw updateError;
  }
  if (current.avatar_path && current.avatar_path !== avatarPath) {
    const { error: removeError } = await supabase.storage.from('capital-do-trem-media').remove([current.avatar_path]);
    if (removeError) console.warn('Avatar antigo mantido no armazenamento:', removeError.message);
  }
  return { avatar_type: type, avatar_url: avatarUrl, avatar_path: avatarPath, avatar_data: avatarData };
}

// Perfil público do artista — sempre limitado ao usuário autenticado pelas políticas RLS.
export async function getMyArtistProfile() {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para acessar o perfil.');
  const { data, error } = await supabase
    .from('artists')
    .select('id, artist_name, style, city, instagram, youtube, bio, photo_url, status')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveMyArtistProfile(profile) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para salvar o perfil.');

  const clean = (value, max, label) => {
    const result = String(value || '').trim();
    if (result.length > max) throw new Error(label + ' ultrapassa o limite de ' + max + ' caracteres.');
    return result;
  };
  const instagram = clean(profile.instagram, 120, 'Instagram');
  const youtube = clean(profile.youtube, 240, 'YouTube');
  const validInstagram = !instagram || /^@?[A-Za-z0-9._]{1,30}$/.test(instagram) ||
    /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]+\/?$/.test(instagram);
  const validYouTube = !youtube || /^@?[A-Za-z0-9._-]{1,100}$/.test(youtube) ||
    /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(youtube);
  if (!validInstagram) throw new Error('Informe um @ do Instagram ou um link https://instagram.com válido.');
  if (!validYouTube) throw new Error('Informe um canal do YouTube ou um link https://youtube.com válido.');

  const artistName = clean(profile.artist_name, 100, 'Nome artístico');
  if (artistName.length < 2) throw new Error('O nome artístico precisa ter pelo menos 2 caracteres.');
  const payload = {
    user_id: user.id,
    artist_name: artistName,
    style: clean(profile.style, 80, 'Estilo musical'),
    city: clean(profile.city, 100, 'Cidade'),
    instagram,
    youtube,
    bio: clean(profile.bio, 1500, 'Apresentação'),
    photo_url: profile.photo_url || null,
    status: 'pending'
  };
  const { data, error } = await supabase
    .from('artists')
    .upsert(payload, { onConflict: 'user_id' })
    .select('id, artist_name, style, city, instagram, youtube, bio, photo_url, status')
    .single();
  if (error) throw error;
  return data;
}
 
// Eventos enviados pelo usuário autenticado. O RLS limita os registros ao autor.
export async function submitMyEvent(eventData) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para enviar um evento.');
  const payload = {
    title: String(eventData.title || '').trim(),
    event_date: eventData.event_date,
    event_time: eventData.event_time || null,
    address: String(eventData.address || '').trim(),
    category: eventData.category || 'show',
    description: String(eventData.description || '').trim(),
    contact: String(eventData.contact || '').trim(),
    poster_url: eventData.poster_url || null,
    created_by: user.id,
    status: 'pending'
  };
  const { data, error } = await supabase.from('events').insert(payload)
    .select('id, title, event_date, address, status').single();
  if (error) throw error;
  return data;
}

export async function getMyEvents() {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para consultar seus eventos.');
  const { data, error } = await supabase.from('events')
    .select('id, title, event_date, address, status')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Verificação e moderação administrativa. O banco confirma a função do usuário;
// a interface não concede privilégios por conta própria.
// Configura a primeira conta administradora após o cadastro e confirmação do e-mail autorizado.
export async function bootstrapFirstAdmin() {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na conta proprietária para configurar o primeiro administrador.');
  const { data, error } = await supabase.rpc('bootstrap_first_admin');
  if (error) throw error;
  return data === true;
}

export async function isCurrentUserAdmin() {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return false;
  const { data, error } = await supabase.rpc('is_admin');
  if (error) throw error;
  return data === true;
}

export async function getModerationQueue() {
  const supabase = initSupabase();
  if (!(await isCurrentUserAdmin())) throw new Error('Acesso administrativo não autorizado.');
  const [artists, events, posts, songs] = await Promise.all([
    supabase.from('artists').select('id, artist_name, style, city, bio, status, created_at').eq('status','pending').order('created_at',{ascending:true}),
    supabase.from('events').select('id, title, event_date, event_time, address, category, description, status, created_at').eq('status','pending').order('created_at',{ascending:true}),
    supabase.from('posts').select('id, content, status, created_at').eq('status','pending').order('created_at',{ascending:true}),
    supabase.from('songs').select('id,title,artist_name,description,status,created_at').eq('status','pending').order('created_at',{ascending:true})
  ]);
  for (const result of [artists,events,posts,songs]) if (result.error) throw result.error;
  return {
    artists: (artists.data||[]).map(item=>({id:item.id,title:item.artist_name,detail:[item.style,item.city,item.bio].filter(Boolean).join(' • ')})),
    events: (events.data||[]).map(item=>({id:item.id,title:item.title,detail:[item.category,item.event_date,item.event_time,item.address,item.description].filter(Boolean).join(' • ')})),
    posts: (posts.data||[]).map(item=>({id:item.id,title:'Divulgação da comunidade',detail:item.content})),
    songs: (songs.data||[]).map(item=>({id:item.id,title:item.title,detail:[item.artist_name,item.description].filter(Boolean).join(' • ')}))
  };
}

export async function moderateItem(table, id, status) {
  const allowedTables = ['artists','events','posts','songs'];
  if (!allowedTables.includes(table)) throw new Error('Tipo de publicação inválido.');
  if (!['published','rejected'].includes(status)) throw new Error('Ação de moderação inválida.');
  const supabase = initSupabase();
  if (!(await isCurrentUserAdmin())) throw new Error('Acesso administrativo não autorizado.');
  const { error } = await supabase.from(table).update({status}).eq('id',id);
  if (error) throw error;
}


 // Envio de música para análise. O arquivo permanece privado até aprovação.
export async function uploadMySong({ file, title, artistName, description = '' }) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para enviar uma música.');
  // Usuários autenticados podem enviar faixas para moderação; o RLS só aceita status=pending.
  if (!(file instanceof File)) throw new Error('Selecione um arquivo de áudio.');
  const mime = file.type.toLowerCase();
  const allowed = ['audio/mpeg','audio/mp4','audio/aac','audio/wav','audio/x-wav','audio/ogg'];
  if (!allowed.includes(mime)) throw new Error('Formato não aceito. Use MP3, M4A, AAC, WAV ou OGG.');
  if (file.size < 1 || file.size > 50 * 1024 * 1024) throw new Error('A música deve ter até 50 MB.');
  const cleanTitle = String(title || '').trim();
  const cleanArtist = String(artistName || '').trim();
  const cleanDescription = String(description || '').trim();
  if (cleanTitle.length < 1 || cleanTitle.length > 120) throw new Error('O título deve ter até 120 caracteres.');
  if (cleanArtist.length < 2 || cleanArtist.length > 100) throw new Error('Informe o nome artístico (até 100 caracteres).');
  if (cleanDescription.length > 1000) throw new Error('A descrição deve ter até 1.000 caracteres.');
  const extension = ({'audio/mpeg':'mp3','audio/mp4':'m4a','audio/aac':'aac','audio/wav':'wav','audio/x-wav':'wav','audio/ogg':'ogg'})[mime];
  const path = user.id + '/songs/' + crypto.randomUUID() + '.' + extension;
  const { error: uploadError } = await supabase.storage.from('capital-do-trem-audio').upload(path,file,{contentType:mime,cacheControl:'3600',upsert:false});
  if (uploadError) throw uploadError;
  const { data, error } = await supabase.from('songs').insert({
    user_id:user.id,title:cleanTitle,artist_name:cleanArtist,description:cleanDescription,
    storage_path:path,mime_type:mime,file_size:file.size,status:'pending'
  }).select('id,title,artist_name,status,created_at').single();
  if (error) {
    await supabase.storage.from('capital-do-trem-audio').remove([path]);
    throw error;
  }
  return data;
}

export async function getMySongs() {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para consultar suas músicas.');
  const { data, error } = await supabase.from('songs')
    .select('id,title,artist_name,description,status,created_at')
    .eq('user_id',user.id).order('created_at',{ascending:false});
  if (error) throw error;
  return data || [];
}

export async function getPublishedSongs() {
  const supabase = initSupabase();
  const { data, error } = await supabase.from('songs')
    .select('id,title,artist_name,description,storage_path')
    .eq('status','published').order('created_at',{ascending:false}).limit(100);
  if (error) throw error;
  const songs = await Promise.all((data || []).map(async song => {
    const storage = supabase.storage.from('capital-do-trem-audio');
    const [{ data: signed, error: signedError }, { data: downloadable, error: downloadError }] = await Promise.all([
      storage.createSignedUrl(song.storage_path, 60 * 60),
      storage.createSignedUrl(song.storage_path, 60 * 60, { download: true })
    ]);
    if (signedError) throw signedError;
    if (downloadError) throw downloadError;
    return {
      id:song.id,
      title:song.title,
      artist_name:song.artist_name,
      description:song.description,
      audio_url:signed.signedUrl,
      download_url:downloadable.signedUrl
    };
  }));
  return songs;
}

// Agenda pública: o RLS permite leitura somente de eventos aprovados para visitantes.
export async function getPublishedEvents() {
  const supabase = initSupabase();
  const { data, error } = await supabase
    .from('events')
    .select('id, title, event_date, event_time, address, description, contact, poster_url')
    .eq('status', 'published')
    // Usa a data local do aparelho para não antecipar/atrasar a agenda por causa do UTC.
    .gte('event_date', (() => { const now = new Date(); return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-'); })())
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true })
    .limit(50);
  if (error) throw error;
  return data || [];
}

// Envia uma divulgação autenticada para análise; novas publicações começam pendentes.
export async function submitMyPost(content) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para enviar uma divulgação.');
  const cleanContent = String(content || '').trim();
  if (cleanContent.length < 1 || cleanContent.length > 1500) {
    throw new Error('A divulgação deve ter entre 1 e 1.500 caracteres.');
  }
  const { data, error } = await supabase.from('posts')
    .insert({ author_id: user.id, content: cleanContent, status: 'pending' })
    .select('id, content, status, created_at').single();
  if (error) throw error;
  return data;
}

// Mural público: visitantes só recebem divulgações aprovadas.
export async function getPublishedPosts() {
  const supabase = initSupabase();
  const { data, error } = await supabase.from('posts')
    .select('id, content, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

// Perfil básico para qualquer participante. A visibilidade pública é opcional.
export async function getMyBasicProfile() {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para acessar seu perfil.');
  const { data, error } = await supabase.from('profiles')
    .select('user_id, display_name, account_type, bio, city, is_public')
    .eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveMyBasicProfile(profile) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para salvar seu perfil.');
  const payload = {
    user_id: user.id,
    display_name: String(profile.display_name || '').trim().slice(0, 80),
    account_type: profile.account_type === 'artist' ? 'artist' : 'user',
    bio: String(profile.bio || '').trim().slice(0, 500),
    city: String(profile.city || '').trim().slice(0, 100),
    is_public: profile.is_public === true
  };
  const { data, error } = await supabase.from('profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('user_id, display_name, account_type, bio, city, is_public').single();
  if (error) throw error;
  return data;
}

export async function getPublicProfiles() {
  const supabase = initSupabase();
  const { data, error } = await supabase.from('profiles')
    .select('user_id, display_name, account_type, bio, city')
    .eq('is_public', true)
    .order('display_name', { ascending: true })
    .limit(100);
  if (error) throw error;
  return data || [];
}


// Vitrine pública: somente perfis de artistas aprovados pela equipe.
export async function getPublishedArtists() {
  const supabase = initSupabase();
  const { data, error } = await supabase
    .from('artists')
    .select('id, artist_name, style, city, instagram, youtube, bio, photo_url')
    .eq('status', 'published')
    .order('artist_name', { ascending: true })
    .limit(100);
  if (error) throw error;
  return data || [];
}


// Interações do catálogo: curtidas e comentários ficam vinculados à conta.
export async function getSongSocial(songId) {
  const supabase = initSupabase();
  const [likes, comments] = await Promise.all([
    supabase.from('song_likes').select('user_id', { count: 'exact', head: true }).eq('song_id', songId),
    supabase.from('song_comments').select('id, song_id, author_id, author_name, content, created_at').eq('song_id', songId).order('created_at', { ascending: true }).limit(100)
  ]);
  if (likes.error) throw likes.error;
  if (comments.error) throw comments.error;
  const { data: { user } } = await supabase.auth.getUser();
  let liked = false;
  if (user) {
    const { data, error } = await supabase.from('song_likes').select('song_id').eq('song_id', songId).eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    liked = !!data;
  }
  return { likeCount: likes.count || 0, liked, comments: comments.data || [] };
}

export async function toggleSongLike(songId) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para curtir uma música.');
  const { data: existing, error: lookupError } = await supabase.from('song_likes')
    .select('song_id').eq('song_id', songId).eq('user_id', user.id).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) {
    const { error } = await supabase.from('song_likes').delete().eq('song_id', songId).eq('user_id', user.id);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from('song_likes').insert({ song_id: songId, user_id: user.id });
  if (error) throw error;
  return true;
}

export async function addSongComment(songId, content) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para comentar.');
  const cleanContent = String(content || '').trim();
  if (!cleanContent || cleanContent.length > 1000) throw new Error('O comentário deve ter entre 1 e 1.000 caracteres.');
  const { data, error } = await supabase.from('song_comments')
    .insert({ song_id: songId, author_id: user.id, content: cleanContent })
    .select('id, song_id, author_id, author_name, content, created_at').single();
  if (error) throw error;
  return data;
}

// Bate-papo geral em tempo real para todos os usuários autenticados.
export async function getChatMessages(limit = 60) {
  const supabase = initSupabase();
  const { data, error } = await supabase.from('chat_messages')
    .select('id, author_id, author_name, author_avatar_type, author_avatar_url, author_avatar_data, content, created_at')
    .order('created_at', { ascending: false }).limit(Math.min(Math.max(Number(limit) || 60, 1), 100));
  if (error) throw error;
  // Busca as mensagens mais recentes e as apresenta em ordem cronológica.
  return (data || []).reverse();
}

export async function sendChatMessage(content) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para participar do bate-papo.');
  const cleanContent = String(content || '').trim();
  if (!cleanContent || cleanContent.length > 1000) throw new Error('A mensagem deve ter entre 1 e 1.000 caracteres.');
  const { data, error } = await supabase.from('chat_messages')
    .insert({ author_id: user.id, content: cleanContent })
    .select('id, author_id, author_name, author_avatar_type, author_avatar_url, author_avatar_data, content, created_at').single();
  if (error) throw error;
  return data;
}

export function subscribeChatMessages(onMessage, onStatus) {
  const supabase = initSupabase();
  const channel = supabase.channel('capital-do-trem-chat')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
      if (typeof onMessage === 'function') onMessage(payload.new);
    }).subscribe(status => {
      if (typeof onStatus === 'function') onStatus(status);
    });
  return () => { supabase.removeChannel(channel); };
}


// Ferramentas de moderação do bate-papo (somente equipe autorizada).
export async function getRecentChatMessagesForAdmin(limit = 100) {
  const supabase = initSupabase();
  if (!(await isCurrentUserAdmin())) throw new Error('Acesso administrativo não autorizado.');
  const { data, error } = await supabase.from('chat_messages')
    .select('id, author_id, author_name, author_avatar_type, author_avatar_url, author_avatar_data, content, created_at')
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(Number(limit) || 100, 1), 200));
  if (error) throw error;
  return data || [];
}

export async function deleteChatMessage(messageId) {
  const supabase = initSupabase();
  if (!(await isCurrentUserAdmin())) throw new Error('Acesso administrativo não autorizado.');
  const { error } = await supabase.from('chat_messages').delete().eq('id', messageId);
  if (error) throw error;
}
