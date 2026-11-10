// Capital do Trem — cliente de autenticação Supabase
// Este módulo só deve ser importado pela interface depois de configurar os dados públicos.
// Nunca inserir a chave service_role neste arquivo.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://zmjxkfjzrbbxyvgkwirv.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_FLbDg6UCePQHb7s0wkywng_J9pNKlsP';

let client = null;
let presenceLifecycleStarted = false;
let presenceCleanup = null;

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

  // Mantém a presença ativa em todas as telas autenticadas (início, conta e conversas).
  if (!presenceLifecycleStarted) {
    presenceLifecycleStarted = true;
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        if (presenceCleanup) presenceCleanup();
        presenceCleanup = null;
        return;
      }
      if (session?.user) {
        window.setTimeout(async () => {
          if (presenceCleanup) return;
          try { presenceCleanup = await startUserPresence(); }
          catch (error) { console.warn('Não foi possível iniciar a presença online.', error); }
        }, 0);
      }
    });
  }

  return client;
}

export async function registerAccount({ email, password, displayName, username, accountType = 'user' }) {
  const cleanUsername = String(username || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_]{2,31}$/.test(cleanUsername)) throw new Error('O nome de usuário deve ter de 3 a 32 caracteres: letras minúsculas, números e _.');
  const supabase = initSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { name: String(displayName || '').trim().slice(0, 80), username: cleanUsername, account_type: accountType === 'artist' ? 'artist' : 'user' },
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

export async function signInWithGoogleAccount({ redirectTo = window.location.href } = {}) {
  const supabase = initSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: { prompt: 'select_account' }
    }
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

export async function updateAccountPassword(newPassword) {
  const supabase = initSupabase();
  const cleanPassword = String(newPassword || '');
  if (cleanPassword.length < 8) throw new Error('A nova senha precisa ter pelo menos 8 caracteres.');
  const { data, error } = await supabase.auth.updateUser({ password: cleanPassword });
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

// Avatar sincronizado com o perfil e replicado automaticamente no CHAMA.
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

export async function uploadMyAvatar(file) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para enviar uma foto.');
  if (!(file instanceof File)) throw new Error('Selecione uma foto para o avatar.');
  const allowed = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  if (!allowed[file.type]) throw new Error('Use uma foto JPG, PNG ou WebP.');
  if (file.size < 1 || file.size > 5 * 1024 * 1024) throw new Error('A foto do avatar deve ter até 5 MB.');
  const path = user.id + '/avatar/' + crypto.randomUUID() + '.' + allowed[file.type];
  const { error } = await supabase.storage.from('capital-do-trem-media').upload(path, file, {
    contentType: file.type, cacheControl: '3600', upsert: false
  });
  if (error) throw error;
  return { path };
}

export async function saveMyAvatar({ type, path = null, data = null }) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para salvar o avatar.');
  let payload;
  if (type === 'photo') {
    if (typeof path !== 'string' || !path.startsWith(user.id + '/avatar/')) {
      throw new Error('A foto enviada não pertence à sua conta. Envie novamente.');
    }
    const { data: publicData } = supabase.storage.from('capital-do-trem-media').getPublicUrl(path);
    if (!publicData?.publicUrl) throw new Error('Não foi possível obter a foto do avatar.');
    payload = { avatar_type: 'photo', avatar_url: publicData.publicUrl, avatar_path: path, avatar_data: null };
  } else if (type === 'character') {
    const allowed = {
      gender: ['male', 'female'],
      skin: ['#8d5524', '#f1c27d', '#c68642', '#5a3825', '#e0ac69'],
      hair: ['#171313', '#5b321d', '#d6a84b', '#a52a2a', '#777777'],
      shirt: ['#ed1c24', '#111111', '#eeeeee', '#2465a8', '#21834a', '#7a42a6']
    };
    const clean = {};
    for (const [key, choices] of Object.entries(allowed)) {
      if (!choices.includes(data?.[key])) throw new Error('As opções do personagem são inválidas. Atualize a página e tente novamente.');
      clean[key] = data[key];
    }
    payload = { avatar_type: 'character', avatar_url: null, avatar_path: null, avatar_data: clean };
  } else {
    throw new Error('Tipo de avatar inválido.');
  }
  const { data: previous, error: previousError } = await supabase.from('profiles')
    .select('avatar_path').eq('user_id', user.id).single();
  if (previousError) throw previousError;
  const { data: saved, error } = await supabase.from('profiles')
    .update(payload).eq('user_id', user.id)
    .select('avatar_type, avatar_url, avatar_path, avatar_data').single();
  if (error) throw error;
  if (previous?.avatar_path && previous.avatar_path !== saved.avatar_path &&
      previous.avatar_path.startsWith(user.id + '/avatar/')) {
    await supabase.storage.from('capital-do-trem-media').remove([previous.avatar_path]);
  }
  return saved;
}

export async function resetMyAvatar() {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para atualizar o avatar.');
  const { data: previous, error: previousError } = await supabase.from('profiles')
    .select('avatar_path').eq('user_id', user.id).single();
  if (previousError) throw previousError;
  const { error } = await supabase.from('profiles').update({
    avatar_type: 'default', avatar_url: null, avatar_path: null, avatar_data: null
  }).eq('user_id', user.id);
  if (error) throw error;
  if (previous?.avatar_path && previous.avatar_path.startsWith(user.id + '/avatar/')) {
    await supabase.storage.from('capital-do-trem-media').remove([previous.avatar_path]);
  }
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
    status: 'published'
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
export async function isCurrentUserAdmin() {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return false;
  const { data, error } = await supabase.rpc('is_admin');
  if (error) throw error;
  return data === true;
}

// Ativa o primeiro administrador somente para o e-mail autorizado no banco.
// A função SQL valida novamente a identidade e só inicializa se ainda não houver administrador.
export async function bootstrapFirstAdmin() {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user || (user.email || '').toLowerCase() !== 'capitaldotrem07@gmail.com') return false;
  const { data, error } = await supabase.rpc('bootstrap_first_admin');
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


 // Publicação de músicas: somente administradores e membros da equipe autorizados.
export async function isCurrentUserArtistOrAdmin() {
  return await isCurrentUserAdmin();
}

export async function uploadMySong({ file, title, artistName, description = '' }) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para enviar uma música.');
  // A autorização é confirmada pela função administrativa no banco; tipo de perfil artístico não concede publicação.
  if (!(await isCurrentUserAdmin())) throw new Error('Somente a administração e a equipe autorizada podem publicar músicas.');
  if (!(file instanceof File)) throw new Error('Selecione um arquivo de áudio.');
  // Alguns seletores de arquivo do Android informam aliases ou MIME genérico.
  // Aceita MIME conhecido ou extensão de áudio permitida e grava sempre o MIME canônico.
  const mime = String(file.type || '').toLowerCase().split(';')[0].trim();
  const mimeExtensions = {
    'audio/mpeg':'mp3','audio/mp3':'mp3','audio/x-mp3':'mp3',
    'audio/mp4':'m4a','audio/x-m4a':'m4a','audio/m4a':'m4a',
    'audio/aac':'aac','audio/x-aac':'aac',
    'audio/wav':'wav','audio/x-wav':'wav','audio/wave':'wav','audio/vnd.wave':'wav',
    'audio/ogg':'ogg','application/ogg':'ogg'
  };
  const extensionFromName = String(file.name || '').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
  const extension = mimeExtensions[mime] || (['mp3','m4a','aac','wav','ogg'].includes(extensionFromName) ? extensionFromName : '');
  if (!extension) throw new Error('Formato não aceito. Use MP3, M4A, AAC, WAV ou OGG.');
  if (file.size < 1 || file.size > 50 * 1024 * 1024) throw new Error('A música deve ter até 50 MB.');
  const cleanTitle = String(title || '').trim();
  const cleanArtist = String(artistName || '').trim();
  const cleanDescription = String(description || '').trim();
  if (cleanTitle.length < 1 || cleanTitle.length > 120) throw new Error('O título deve ter até 120 caracteres.');
  if (cleanArtist.length < 2 || cleanArtist.length > 100) throw new Error('Informe o nome artístico (até 100 caracteres).');
  if (cleanDescription.length > 1000) throw new Error('A descrição deve ter até 1.000 caracteres.');
  const canonicalMime = ({mp3:'audio/mpeg',m4a:'audio/mp4',aac:'audio/aac',wav:'audio/wav',ogg:'audio/ogg'})[extension];
  const path = user.id + '/songs/' + crypto.randomUUID() + '.' + extension;
  const { error: uploadError } = await supabase.storage.from('capital-do-trem-audio').upload(path,file,{contentType:canonicalMime,cacheControl:'3600',upsert:false});
  if (uploadError) throw uploadError;
  const { data, error } = await supabase.from('songs').insert({
    user_id:user.id,title:cleanTitle,artist_name:cleanArtist,description:cleanDescription,
    storage_path:path,mime_type:canonicalMime,file_size:file.size,status:'published'
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

// Agenda pública: visitantes podem consultar eventos publicados diretamente.
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

// Publica uma divulgação imediatamente no mural da comunidade.
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
    .insert({ author_id: user.id, content: cleanContent, status: 'published' })
    .select('id, content, status, created_at').single();
  if (error) throw error;
  return data;
}

// Mural público: visitantes recebem divulgações publicadas diretamente.
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
    .select('user_id, display_name, username, account_type, bio, city, is_public')
    .eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  if (data) return data;
  // Se o cadastro foi confirmado por e-mail e ainda não existe perfil básico,
  // recupera o tipo escolhido no cadastro e cria o perfil na primeira entrada.
  const metadata = user.user_metadata || {};
  const accountType = metadata.account_type === 'artist' ? 'artist' : 'user';
  const created = await saveMyBasicProfile({
    display_name: metadata.name || (user.email || '').split('@')[0] || 'Participante',
    username: metadata.username || ('uai_' + user.id.replace(/-/g, '').slice(0, 12)),
    account_type: accountType,
    is_public: false
  });
  return created;
}

export async function saveMyBasicProfile(profile) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para salvar seu perfil.');
  const username = String(profile.username || '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_]{2,31}$/.test(username)) throw new Error('O nome de usuário deve ter de 3 a 32 caracteres: letras minúsculas, números e _.');
  const payload = {
    user_id: user.id,
    username,
    display_name: String(profile.display_name || '').trim().slice(0, 80),
    account_type: profile.account_type === 'artist' ? 'artist' : 'user',
    bio: String(profile.bio || '').trim().slice(0, 500),
    city: String(profile.city || '').trim().slice(0, 100),
    is_public: profile.is_public === true
  };
  const { data, error } = await supabase.from('profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select('user_id, display_name, username, account_type, bio, city, is_public').single();
  if (error) throw error;
  return data;
}

export async function getPublicProfiles() {
  const supabase = initSupabase();
  const { data, error } = await supabase.from('profiles')
    .select('user_id, display_name, username, account_type, bio, city, avatar_type, avatar_url, avatar_data')
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
    .select('id, author_id, author_name, content, created_at, author_avatar_type, author_avatar_url, author_avatar_data, attachment_url, attachment_type, attachment_name, attachment_mime, attachment_size')
    .order('created_at', { ascending: false }).limit(Math.min(Math.max(Number(limit) || 60, 1), 100));
  if (error) throw error;
  // Busca as mensagens mais recentes e as apresenta em ordem cronológica.
  return (data || []).reverse();
}

export async function uploadChatAttachment(file) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para enviar mídia.');
  if (!(file instanceof File)) throw new Error('Selecione uma imagem ou áudio.');
  const imageTypes = ['image/jpeg','image/png','image/webp'];
  const audioTypes = ['audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/wav','audio/x-wav','audio/webm'];
  const isImage = imageTypes.includes(file.type);
  const isAudio = audioTypes.includes(file.type);
  if (!isImage && !isAudio) throw new Error('Formato não permitido. Envie JPG, PNG, WebP ou áudio MP3, M4A, AAC, OGG, WAV ou WebM.');
  const max = isImage ? 8*1024*1024 : 20*1024*1024;
  if (file.size < 1 || file.size > max) throw new Error(isImage ? 'A imagem deve ter até 8 MB.' : 'O áudio deve ter até 20 MB.');
  const ext = (file.name.split('.').pop() || (isImage ? 'jpg':'mp3')).toLowerCase().replace(/[^a-z0-9]/g,'') || (isImage?'jpg':'mp3');
  const path = user.id + '/chat/' + crypto.randomUUID() + '.' + ext;
  const { error } = await supabase.storage.from('capital-do-trem-media').upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});
  if (error) throw error;
  const { data } = supabase.storage.from('capital-do-trem-media').getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('Não foi possível gerar o link da mídia.');
  return { url:data.publicUrl, type:isImage?'image':'audio', name:file.name, mime:file.type, size:file.size };
}

export async function sendChatMessage(content, attachment = null) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para participar do bate-papo.');
  const cleanContent = String(content || '').trim();
  if ((!cleanContent && !attachment) || cleanContent.length > 1000) throw new Error('Escreva uma mensagem ou anexe uma mídia. O texto pode ter até 1.000 caracteres.');
  const payload = { author_id:user.id, content:cleanContent || (attachment?.type === 'image' ? '📷 Imagem' : '🎵 Áudio') };
  if (attachment) Object.assign(payload,{attachment_url:attachment.url,attachment_type:attachment.type,attachment_name:attachment.name,attachment_mime:attachment.mime,attachment_size:attachment.size});
  const { data, error } = await supabase.from('chat_messages').insert(payload)
    .select('id, author_id, author_name, content, created_at, author_avatar_type, author_avatar_url, author_avatar_data, attachment_url, attachment_type, attachment_name, attachment_mime, attachment_size').single();
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
    .select('id, author_id, author_name, content, created_at')
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


// Conversas privadas: pedidos de contato, aceite, mensagens e bloqueios.
export async function getPrivateConversationData() {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para acessar suas conversas.');
  const [{ data: conversations, error: conversationError }, { data: people, error: peopleError }, { data: blocks, error: blockError }] = await Promise.all([
    supabase.from('private_conversations').select('id,participant_one,participant_two,initiated_by,status,created_at,updated_at').or('participant_one.eq.' + user.id + ',participant_two.eq.' + user.id).order('updated_at',{ascending:false}).limit(100),
    supabase.from('profiles').select('user_id,display_name,username,account_type,city,avatar_type,avatar_url,avatar_data').eq('is_public',true).neq('user_id',user.id).order('display_name',{ascending:true}).limit(100),
    supabase.from('private_blocks').select('blocked_id').eq('blocker_id',user.id)
  ]);
  if (conversationError) throw conversationError;
  if (peopleError) throw peopleError;
  if (blockError) throw blockError;
  return { userId:user.id, conversations:conversations||[], people:people||[], blocked:(blocks||[]).map(row=>row.blocked_id) };
}

export async function requestPrivateConversation(otherUserId) {
  const supabase=initSupabase();
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError)throw userError;
  if(!user)throw new Error('Entre na sua conta para enviar um convite.');
  if(!otherUserId||otherUserId===user.id)throw new Error('Escolha outra pessoa.');
  const [one,two]=[user.id,otherUserId].sort();
  const {data:existing,error:lookupError}=await supabase.from('private_conversations')
    .select('id,status,initiated_by').eq('participant_one',one).eq('participant_two',two).maybeSingle();
  if(lookupError)throw lookupError;
  if(existing){
    if(existing.status==='accepted')return existing;
    if(existing.status==='pending')throw new Error(existing.initiated_by===user.id?'Seu convite já foi enviado.':'Essa pessoa já enviou um convite. Aceite na lista de convites recebidos.');
    throw new Error('Esse convite já foi recusado. Peça à pessoa para iniciar uma nova conversa.');
  }
  const {data,error}=await supabase.from('private_conversations')
    .insert({participant_one:one,participant_two:two,initiated_by:user.id,status:'pending'})
    .select('id,status,initiated_by').single();
  if(error)throw error;
  return data;
}

export async function decidePrivateConversation(conversationId,decision) {
  const supabase=initSupabase();
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError)throw userError;
  if(!user)throw new Error('Entre na sua conta.');
  if(!['accepted','declined'].includes(decision))throw new Error('Decisão inválida.');
  const {data,error}=await supabase.from('private_conversations').update({status:decision,updated_at:new Date().toISOString()})
    .eq('id',conversationId).eq('status','pending')
    .select('id,status').single();
  if(error)throw error;
  return data;
}

export async function getPrivateMessages(conversationId) {
  const supabase=initSupabase();
  const {data,error}=await supabase.from('private_messages')
    .select('id,conversation_id,sender_id,content,created_at')
    .eq('conversation_id',conversationId).order('created_at',{ascending:true}).limit(100);
  if(error)throw error;
  return data||[];
}

export async function sendPrivateMessage(conversationId,content) {
  const supabase=initSupabase();
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError)throw userError;
  if(!user)throw new Error('Entre na sua conta para enviar mensagens.');
  const clean=String(content||'').trim();
  if(!clean||clean.length>2000)throw new Error('A mensagem deve ter entre 1 e 2.000 caracteres.');
  const {data,error}=await supabase.from('private_messages')
    .insert({conversation_id:conversationId,sender_id:user.id,content:clean})
    .select('id,conversation_id,sender_id,content,created_at').single();
  if(error)throw error;
  await supabase.from('private_conversations').update({updated_at:new Date().toISOString()}).eq('id',conversationId);
  return data;
}

export async function subscribePrivateMessages(conversationId,onMessage,onStatus) {
  const supabase=initSupabase();
  const channel=supabase.channel('private-chat-'+conversationId)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'private_messages',filter:'conversation_id=eq.'+conversationId},payload=>{
      if(typeof onMessage==='function')onMessage(payload.new);
    }).subscribe(status=>{if(typeof onStatus==='function')onStatus(status);});
  return ()=>{supabase.removeChannel(channel);};
}

export async function blockPrivateUser(otherUserId) {
  const supabase=initSupabase();
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError)throw userError;
  if(!user)throw new Error('Entre na sua conta.');
  if(!otherUserId||otherUserId===user.id)throw new Error('Usuário inválido.');
  const {error}=await supabase.from('private_blocks').insert({blocker_id:user.id,blocked_id:otherUserId});
  if(error&&error.code!=='23505')throw error;
}


// Identidade visual oficial do aplicativo: leitura pública e gravação exclusiva de administradores.
export async function getPublicBranding() {
  const supabase = initSupabase();
  const { data, error } = await supabase.from('site_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['official_profile_image_url', 'app_opening_image_url', 'app_opening_video_url', 'app_opening_video_muted', 'app_opening_video_volume', 'app_opening_x', 'app_opening_y', 'app_opening_fit', 'app_home_background_image_url', 'app_home_background_x', 'app_home_background_y', 'app_home_background_blur', 'app_home_background_fit', 'app_header_background_image_url', 'app_header_background_x', 'app_header_background_y', 'app_header_background_blur', 'app_header_background_fit']);
  if (error) throw error;
  const settings = Object.fromEntries((data || []).map(row => [row.setting_key, row.setting_value]));
  return {
    profileImageUrl: settings.official_profile_image_url || '',
    openingImageUrl: settings.app_opening_image_url || '',
    openingVideoUrl: settings.app_opening_video_url || '',
    openingVideoMuted: settings.app_opening_video_muted !== 'false',
    openingVideoVolume: Math.max(0, Math.min(1, Number(settings.app_opening_video_volume ?? 0.7))),
    openingX: Number(settings.app_opening_x ?? 50),
    openingY: Number(settings.app_opening_y ?? 50),
    openingFit: settings.app_opening_fit === 'contain' ? 'contain' : 'cover',
    homeBackgroundImageUrl: settings.app_home_background_image_url || '',
    homeBackgroundX: Number(settings.app_home_background_x ?? 50),
    homeBackgroundY: Number(settings.app_home_background_y ?? 50),
    homeBackgroundBlur: Number(settings.app_home_background_blur ?? 0),
    homeBackgroundFit: settings.app_home_background_fit === 'contain' ? 'contain' : 'cover',
    headerBackgroundImageUrl: settings.app_header_background_image_url || '',
    headerBackgroundX: Number(settings.app_header_background_x ?? 50),
    headerBackgroundY: Number(settings.app_header_background_y ?? 50),
    headerBackgroundBlur: Number(settings.app_header_background_blur ?? 0),
    headerBackgroundFit: settings.app_header_background_fit === 'contain' ? 'contain' : 'cover'
  };
}


// Normaliza MIME genérico/vazio devolvido por alguns seletores Android.
async function getBrandingUploadFormat(file, allowed) {
 const has=(key)=>Object.prototype.hasOwnProperty.call(allowed,key);
 const ext=String(file?.name||'').split('.').pop().toLowerCase();
 const mimeExt={'image/jpeg':'jpg','image/jpg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'};
 let detected='';
 try {
  const b=new Uint8Array(await file.slice(0,16).arrayBuffer());
  if(b[0]===0xff&&b[1]===0xd8&&b[2]===0xff)detected='jpg';
  else if(b[0]===0x89&&b[1]===0x50&&b[2]===0x4e&&b[3]===0x47)detected='png';
  else if(String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP')detected='webp';
  else if(String.fromCharCode(...b.slice(4,8))==='ftyp')detected='mp4';
  else if(b[0]===0x1a&&b[1]===0x45&&b[2]===0xdf&&b[3]===0xa3)detected='webm';
 } catch {}
 const byMime=mimeExt[String(file?.type||'').toLowerCase()]||'';
 const candidates=[detected,byMime,ext];
 const chosen=candidates.find(candidate=>candidate&&has(candidate));
 if(!chosen)throw new Error('Não reconheci o arquivo. Use imagem JPG/PNG/WebP ou vídeo MP4/WebM. Se veio do WhatsApp, salve o arquivo no aparelho e tente novamente.');
 const normalized=chosen==='jpeg'?'jpg':chosen;
 const contentType=normalized==='jpg'?'image/jpeg':normalized==='png'?'image/png':normalized==='webp'?'image/webp':normalized==='mp4'?'video/mp4':'video/webm';
 return {extension:normalized,contentType};
}

// Publica um único arquivo e grava o mesmo endereço nas duas posições oficiais.
export async function saveAdminBrandingPair(file) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user || !(await isCurrentUserAdmin())) throw new Error('Somente um administrador pode alterar a identidade visual.');
  if (!(file instanceof File)) throw new Error('Escolha a arte oficial na galeria do celular.');
  const format = await getBrandingUploadFormat(file, { jpg: true, jpeg: true, png: true, webp: true });
  if (file.size < 1 || file.size > 5 * 1024 * 1024) throw new Error('A imagem deve ter até 5 MB.');
  const path = user.id + '/branding/official-logo-' + crypto.randomUUID() + '.' + format.extension;
  const { error: uploadError } = await supabase.storage.from('capital-do-trem-media').upload(path, file, { contentType: format.contentType, cacheControl: '3600', upsert: false });
  if (uploadError) throw uploadError;
  const { data: publicData } = supabase.storage.from('capital-do-trem-media').getPublicUrl(path);
  if (!publicData?.publicUrl) throw new Error('Não foi possível gerar o endereço público da imagem.');
  const now = new Date().toISOString();
  const { error: saveError } = await supabase.from('site_settings').upsert([
    { setting_key: 'official_profile_image_url', setting_value: publicData.publicUrl, updated_at: now },
    { setting_key: 'app_opening_image_url', setting_value: publicData.publicUrl, updated_at: now },
    { setting_key: 'app_opening_video_url', setting_value: '', updated_at: now }
  ], { onConflict: 'setting_key' });
  if (saveError) throw saveError;
  return publicData.publicUrl;
}


/* Atualiza somente a arte da abertura, preservando a foto oficial do perfil. */
export async function saveAdminOpeningImage(file, options = {}) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user || !(await isCurrentUserAdmin())) throw new Error('Somente um administrador pode alterar a abertura.');
  if (!(file instanceof File)) throw new Error('Escolha a arte completa da abertura.');
  const format = await getBrandingUploadFormat(file, { jpg: true, jpeg: true, png: true, webp: true });
  if (file.size < 1 || file.size > 5 * 1024 * 1024) throw new Error('A imagem deve ter até 5 MB.');
  const path = user.id + '/branding/opening-' + crypto.randomUUID() + '.' + format.extension;
  const { error: uploadError } = await supabase.storage.from('capital-do-trem-media').upload(path, file, { contentType: format.contentType, cacheControl: '3600', upsert: false });
  if (uploadError) throw uploadError;
  const { data: publicData } = supabase.storage.from('capital-do-trem-media').getPublicUrl(path);
  if (!publicData?.publicUrl) throw new Error('Não foi possível gerar o endereço público da abertura.');
  const { error: saveError } = await supabase.from('site_settings').upsert([
    { setting_key: 'app_opening_image_url', setting_value: publicData.publicUrl, updated_at: new Date().toISOString() },
    { setting_key: 'app_opening_video_url', setting_value: '', updated_at: new Date().toISOString() },
    { setting_key: 'app_opening_x', setting_value: String(Math.max(0, Math.min(100, Number(options.x ?? 50)))), updated_at: new Date().toISOString() },
    { setting_key: 'app_opening_y', setting_value: String(Math.max(0, Math.min(100, Number(options.y ?? 50)))), updated_at: new Date().toISOString() },
    { setting_key: 'app_opening_fit', setting_value: options.fit === 'contain' ? 'contain' : 'cover', updated_at: new Date().toISOString() }
  ], { onConflict: 'setting_key' });
  if (saveError) throw saveError;
  return publicData.publicUrl;
}

/* Salva somente o enquadramento da mídia atual da abertura, sem novo upload. */
export async function saveAdminOpeningMediaSettings(options = {}) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user || !(await isCurrentUserAdmin())) throw new Error('Somente um administrador pode ajustar a abertura.');
  const now = new Date().toISOString();
  const rows = [
    { setting_key: 'app_opening_x', setting_value: String(Math.max(0, Math.min(100, Number(options.x ?? 50)))), updated_at: now },
    { setting_key: 'app_opening_y', setting_value: String(Math.max(0, Math.min(100, Number(options.y ?? 50)))), updated_at: now },
    { setting_key: 'app_opening_fit', setting_value: options.fit === 'contain' ? 'contain' : 'cover', updated_at: now }
  ];
  const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'setting_key' });
  if (error) throw error;
  return true;
}

/* Imagem de fundo do painel central, com enquadramento e desfoque ajustáveis. */


/* Permite ao administrador substituir a abertura por vídeo MP4 ou WebM. */
export async function saveAdminOpeningVideo(file, options = {}) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user || !(await isCurrentUserAdmin())) throw new Error('Somente um administrador pode alterar o vídeo de abertura.');
  if (!(file instanceof File)) throw new Error('Escolha um vídeo MP4 ou WebM.');
  const format = await getBrandingUploadFormat(file, { mp4: true, webm: true });
  if (file.size < 1 || file.size > 50 * 1024 * 1024) throw new Error('O vídeo deve ter até 50 MB.');
  const path = user.id + '/branding/opening-video-' + crypto.randomUUID() + '.' + format.extension;
  const { error: uploadError } = await supabase.storage.from('capital-do-trem-media').upload(path, file, { contentType: format.contentType, cacheControl: '3600', upsert: false });
  if (uploadError) throw uploadError;
  const { data: publicData } = supabase.storage.from('capital-do-trem-media').getPublicUrl(path);
  if (!publicData?.publicUrl) throw new Error('Não foi possível gerar o endereço público do vídeo.');
  const now = new Date().toISOString();
  const { error: saveError } = await supabase.from('site_settings').upsert([
    { setting_key: 'app_opening_video_url', setting_value: publicData.publicUrl, updated_at: now },
    { setting_key: 'app_opening_image_url', setting_value: '', updated_at: now },
    { setting_key: 'app_opening_x', setting_value: String(Math.max(0, Math.min(100, Number(options.x ?? 50)))), updated_at: now },
    { setting_key: 'app_opening_y', setting_value: String(Math.max(0, Math.min(100, Number(options.y ?? 50)))), updated_at: now },
    { setting_key: 'app_opening_fit', setting_value: options.fit === 'contain' ? 'contain' : 'cover', updated_at: now }
  ], { onConflict: 'setting_key' });
  if (saveError) throw saveError;
  return publicData.publicUrl;
}

export async function saveAdminHomeBackground(file, options = {}) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user || !(await isCurrentUserAdmin())) throw new Error('Somente um administrador pode alterar o fundo do painel.');
  const allowed = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  let imageUrl = '';
  if (file) {
    if (!(file instanceof File) || !allowed[file.type]) throw new Error('Escolha uma imagem JPG, PNG ou WebP.');
    if (file.size < 1 || file.size > 8 * 1024 * 1024) throw new Error('A imagem deve ter até 8 MB.');
    const path = user.id + '/branding/home-background-' + crypto.randomUUID() + '.' + allowed[file.type];
    const { error: uploadError } = await supabase.storage.from('capital-do-trem-media').upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;
    const { data: publicData } = supabase.storage.from('capital-do-trem-media').getPublicUrl(path);
    if (!publicData?.publicUrl) throw new Error('Não foi possível gerar o endereço público do fundo.');
    imageUrl = publicData.publicUrl;
  } else {
    const { data, error } = await supabase.from('site_settings').select('setting_value').eq('setting_key', 'app_home_background_image_url').maybeSingle();
    if (error) throw error;
    imageUrl = data?.setting_value || '';
    if (!imageUrl) throw new Error('Escolha uma imagem de fundo antes de salvar os ajustes.');
  }
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const now = new Date().toISOString();
  const rows = [
    { setting_key: 'app_home_background_image_url', setting_value: imageUrl, updated_at: now },
    { setting_key: 'app_home_background_x', setting_value: String(clamp(options.x ?? 50, 0, 100)), updated_at: now },
    { setting_key: 'app_home_background_y', setting_value: String(clamp(options.y ?? 50, 0, 100)), updated_at: now },
    { setting_key: 'app_home_background_blur', setting_value: String(clamp(options.blur ?? 0, 0, 12)), updated_at: now },
    { setting_key: 'app_home_background_fit', setting_value: options.fit === 'contain' ? 'contain' : 'cover', updated_at: now }
  ];
  const { error: saveError } = await supabase.from('site_settings').upsert(rows, { onConflict: 'setting_key' });
  if (saveError) throw saveError;
  return imageUrl;
}


export async function saveAdminBrandingImage(kind, file) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user || !(await isCurrentUserAdmin())) throw new Error('Somente um administrador pode alterar a identidade visual.');
  const keys = { profile: 'official_profile_image_url', opening: 'app_opening_image_url', header: 'app_header_background_image_url' };
  if (!Object.prototype.hasOwnProperty.call(keys, kind)) throw new Error('Tipo de imagem inválido.');
  if (!(file instanceof File)) throw new Error('Escolha uma imagem na galeria do celular.');
  const allowed = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  if (!allowed[file.type]) throw new Error('Use uma imagem JPG, PNG ou WebP.');
  if (file.size < 1 || file.size > 5 * 1024 * 1024) throw new Error('A imagem deve ter até 5 MB.');
  const path = user.id + '/branding/' + kind + '-' + crypto.randomUUID() + '.' + allowed[file.type];
  const { error: uploadError } = await supabase.storage.from('capital-do-trem-media').upload(path, file, {
    contentType: file.type, cacheControl: '3600', upsert: false
  });
  if (uploadError) throw uploadError;
  const { data: publicData } = supabase.storage.from('capital-do-trem-media').getPublicUrl(path);
  if (!publicData?.publicUrl) throw new Error('Não foi possível gerar o endereço público da imagem.');
  const rows = [{ setting_key: keys[kind], setting_value: publicData.publicUrl, updated_at: new Date().toISOString() }];
  if (kind === 'opening') rows.push({ setting_key: 'app_opening_video_url', setting_value: '', updated_at: new Date().toISOString() });
  const { error: saveError } = await supabase.from('site_settings').upsert(rows, { onConflict: 'setting_key' });
  if (saveError) throw saveError;
  return publicData.publicUrl;
}



// Preferências de áudio do vídeo de abertura, separadas do envio do arquivo.
export async function saveAdminOpeningVideoSettings(options = {}) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user || !(await isCurrentUserAdmin())) throw new Error('Somente um administrador pode ajustar o áudio da abertura.');
  const volume = Math.max(0, Math.min(1, Number(options.volume ?? 0.7)));
  const now = new Date().toISOString();
  const rows = [
    { setting_key: 'app_opening_video_muted', setting_value: options.muted === false ? 'false' : 'true', updated_at: now },
    { setting_key: 'app_opening_video_volume', setting_value: String(volume), updated_at: now }
  ];
  const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'setting_key' });
  if (error) throw error;
  return { muted: options.muted !== false, volume };
}

// Salva a imagem do cabeçalho e seus ajustes de enquadramento de forma independente do painel inferior.
export async function saveAdminHeaderBackground(file, options = {}) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user || !(await isCurrentUserAdmin())) throw new Error('Somente um administrador pode alterar o fundo do cabeçalho.');
  let imageUrl = '';
  if (file) {
    if (!(file instanceof File)) throw new Error('Escolha uma imagem JPG, PNG ou WebP.');
    const format = await getBrandingUploadFormat(file, { jpg: true, png: true, webp: true });
    if (file.size < 1 || file.size > 8 * 1024 * 1024) throw new Error('A imagem deve ter até 8 MB.');
    const path = user.id + '/branding/header-' + crypto.randomUUID() + '.' + format.extension;
    const { error: uploadError } = await supabase.storage.from('capital-do-trem-media').upload(path, file, { contentType: format.contentType, cacheControl: '3600', upsert: false });
    if (uploadError) throw uploadError;
    const { data: publicData } = supabase.storage.from('capital-do-trem-media').getPublicUrl(path);
    if (!publicData?.publicUrl) throw new Error('Não foi possível gerar o endereço público do fundo.');
    imageUrl = publicData.publicUrl;
  } else {
    const { data, error } = await supabase.from('site_settings').select('setting_value').eq('setting_key', 'app_header_background_image_url').maybeSingle();
    if (error) throw error;
    imageUrl = data?.setting_value || '';
    if (!imageUrl) throw new Error('Escolha uma imagem de cabeçalho antes de salvar os ajustes.');
  }
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
  const now = new Date().toISOString();
  const rows = [
    { setting_key: 'app_header_background_image_url', setting_value: imageUrl, updated_at: now },
    { setting_key: 'app_header_background_x', setting_value: String(clamp(options.x ?? 50, 0, 100)), updated_at: now },
    { setting_key: 'app_header_background_y', setting_value: String(clamp(options.y ?? 50, 0, 100)), updated_at: now },
    { setting_key: 'app_header_background_blur', setting_value: '0', updated_at: now },
    { setting_key: 'app_header_background_fit', setting_value: options.fit === 'contain' ? 'contain' : 'cover', updated_at: now }
  ];
  const { error: saveError } = await supabase.from('site_settings').upsert(rows, { onConflict: 'setting_key' });
  if (saveError) throw saveError;
  return imageUrl;
}

// Remove a imagem configurada sem apagar arquivos ou alterar outras áreas do aplicativo.
export async function removeAdminBrandingAsset(kind) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user || !(await isCurrentUserAdmin())) throw new Error('Somente um administrador pode remover imagens.');
  const now = new Date().toISOString();
  const keysByKind = {
    profile: ['official_profile_image_url'],
    opening: ['app_opening_image_url', 'app_opening_video_url', 'app_opening_x', 'app_opening_y', 'app_opening_fit'],
    header: ['app_header_background_image_url', 'app_header_background_x', 'app_header_background_y', 'app_header_background_blur', 'app_header_background_fit'],
    home: ['app_home_background_image_url', 'app_home_background_x', 'app_home_background_y', 'app_home_background_blur', 'app_home_background_fit'],
    pair: ['official_profile_image_url', 'app_opening_image_url', 'app_opening_video_url']
  };
  const keys = keysByKind[kind];
  if (!keys) throw new Error('Área de imagem inválida.');
  const rows = keys.map(setting_key => ({
    setting_key,
    setting_value: (kind === 'opening' && setting_key === 'app_opening_fit') ? 'cover'
      : (kind === 'opening' && (setting_key === 'app_opening_x' || setting_key === 'app_opening_y')) ? '50'
      : (kind === 'home' && setting_key === 'app_home_background_fit') || (kind === 'header' && setting_key === 'app_header_background_fit') ? 'cover'
      : (kind === 'home' && setting_key === 'app_home_background_blur') || (kind === 'header' && setting_key === 'app_header_background_blur') ? '0'
      : (kind === 'home' && (setting_key === 'app_home_background_x' || setting_key === 'app_home_background_y')) || (kind === 'header' && (setting_key === 'app_header_background_x' || setting_key === 'app_header_background_y')) ? '50'
      : '',
    updated_at: now
  }));
  const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'setting_key' });
  if (error) throw error;
  return true;
}

// Registro de instalações (uma identificação aleatória por instalação local do app).
export async function registerAppInstallation() {
  const supabase = initSupabase();
  let installationId = '';
  try {
    installationId = localStorage.getItem('capital-do-trem-installation-id') || '';
    if (!/^[0-9a-f-]{36}$/i.test(installationId)) {
      installationId = crypto.randomUUID();
      localStorage.setItem('capital-do-trem-installation-id', installationId);
    }
  } catch {
    installationId = crypto.randomUUID();
  }
  const { error } = await supabase.from('app_installations')
    .upsert({ installation_id: installationId }, { onConflict: 'installation_id', ignoreDuplicates: true });
  if (error) throw error;
  const { count, error: countError } = await supabase.from('app_installations')
    .select('installation_id', { count: 'exact', head: true });
  if (countError) throw countError;
  return Number(count || 0);
}

export async function getOnlineUserIds() {
  const supabase = initSupabase();
  const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data, error } = await supabase.from('user_presence')
    .select('user_id').gte('last_seen_at', cutoff);
  if (error) throw error;
  return new Set((data || []).map(row => row.user_id));
}

export async function startUserPresence() {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return () => {};
  let stopped = false;
  let busy = false;
  const heartbeat = async () => {
    if (stopped || busy || !navigator.onLine || document.visibilityState === 'hidden') return;
    busy = true;
    try {
      const { error } = await supabase.from('user_presence').upsert(
        { user_id: user.id, last_seen_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
      if (error) console.warn('Presença online não atualizada.', error);
    } finally { busy = false; }
  };
  await heartbeat();
  const timer = window.setInterval(heartbeat, 45000);
  const onFocus = () => heartbeat();
  const onOnline = () => heartbeat();
  window.addEventListener('focus', onFocus);
  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onFocus);
  return () => {
    stopped = true;
    window.clearInterval(timer);
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('online', onOnline);
    document.removeEventListener('visibilitychange', onFocus);
  };
}
