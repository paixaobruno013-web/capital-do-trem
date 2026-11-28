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
    },
    // Quando o serviço rejeita conexões (por exemplo, por restrição de quota),
    // aumenta o intervalo entre tentativas para evitar uma tempestade de WebSockets.
    realtime: {
      reconnectAfterMs: (tries) => {
        const delays = [10000, 30000, 60000, 120000];
        return delays[Math.min(Math.max(tries - 1, 0), delays.length - 1)];
      }
    },
    // Configurações da abertura não podem vir de cache HTTP antigo.
    global: {
      fetch: (input, init = {}) => {
        const requestUrl = input instanceof Request ? input.url : String(input);
        if (requestUrl.includes('/rest/v1/site_settings')) {
          const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
          headers.set('Cache-Control', 'no-cache');
          return fetch(input, { ...init, cache: 'no-store', headers });
        }
        return fetch(input, init);
      }
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
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Informe um e-mail válido.');
  let cleanUsername = String(username || '').trim().toLowerCase();
  if (!cleanUsername) {
    const base = (cleanEmail.split('@')[0] || 'usuario').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_]/g, '_').replace(/^[^a-z0-9]+/, '').slice(0, 20) || 'usuario';
    const bytes = new Uint8Array(4);
    if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    const suffix = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    cleanUsername = (base + '_' + suffix).slice(0, 32);
  }
  if (!/^[a-z0-9][a-z0-9_]{2,31}$/.test(cleanUsername)) throw new Error('Não foi possível preparar seu identificador. Tente novamente.');
  const supabase = initSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: { name: String(displayName || cleanEmail.split('@')[0]).trim().slice(0, 80), username: cleanUsername, account_type: accountType === 'artist' ? 'artist' : 'user' },
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

export async function signInWithGoogleAccount({ redirectTo = 'https://paixaobruno013-web.github.io/capital-do-trem/conta.html' } = {}) {
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

export async function linkGoogleIdentityToCurrentAccount({ redirectTo = 'https://paixaobruno013-web.github.io/capital-do-trem/conta.html' } = {}) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta atual antes de vincular o Google.');
  const identities = Array.isArray(user.identities) ? user.identities : [];
  if (identities.some(identity => identity.provider === 'google')) {
    return { alreadyLinked: true };
  }
  const { data, error } = await supabase.auth.linkIdentity({
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
 
// Eventos publicados por artistas cadastrados e pela administração.
export async function submitMyEvent(eventData) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para enviar um evento.');
  const title = String(eventData.title || '').trim();
  const address = String(eventData.address || '').trim();
  if (title.length < 2) throw new Error('Informe o nome do evento.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(eventData.event_date || ''))) throw new Error('Informe uma data válida.');
  const today = new Date();
  const localToday = [today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
  if (eventData.event_date < localToday) throw new Error('A data do evento já passou.');
  if (address.length < 3) throw new Error('Informe o endereço ou use o GPS.');
  const latitude = eventData.latitude == null || eventData.latitude === '' ? null : Number(eventData.latitude);
  const longitude = eventData.longitude == null || eventData.longitude === '' ? null : Number(eventData.longitude);
  if ((latitude == null) !== (longitude == null) || (latitude != null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180))) {
    throw new Error('A localização GPS não é válida. Tente capturá-la novamente.');
  }
  const payload = {
    title,
    event_date: eventData.event_date,
    event_time: eventData.event_time || null,
    address,
    category: eventData.category || 'show',
    description: String(eventData.description || '').trim().slice(0,2000),
    contact: String(eventData.contact || '').trim().slice(0,120),
    poster_url: eventData.poster_url || null,
    latitude,
    longitude,
    music_song_id: eventData.music_song_id || null,
    created_by: user.id,
    status: 'published'
  };
  const { data, error } = await supabase.from('events').insert(payload)
    .select('id, title, event_date, address, status, latitude, longitude, music_song_id').single();
  if (error) throw error;
  return data;
}

export async function getEventMusicOptions() {
  const supabase = initSupabase();
  const { data, error } = await supabase.from('songs')
    .select('id,title,artist_name')
    .eq('status','published')
    .order('created_at',{ascending:false})
    .limit(100);
  if (error) throw error;
  return data || [];
}

export async function getMyEvents() {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para consultar seus eventos.');
  const { data, error } = await supabase.from('events')
    .select('id,title,event_date,event_time,address,status,latitude,longitude,music_song_id')
    .eq('created_by',user.id)
    .order('created_at',{ascending:false});
  if (error) throw error;
  const items=data||[];
  const songIds=[...new Set(items.map(item=>item.music_song_id).filter(Boolean))];
  if(!songIds.length)return items;
  const {data:songs,error:songError}=await supabase.from('songs').select('id,title,artist_name').in('id',songIds);
  if(songError)throw songError;
  const lookup=new Map((songs||[]).map(song=>[song.id,{title:song.title,artist_name:song.artist_name}]));
  return items.map(item=>({...item,music:lookup.get(item.music_song_id)||null}));
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
    supabase.from('songs').select('id,title,artist_name,producer_name,description,status,created_at,storage_path,rights_confirmed_at').eq('status','pending').order('created_at',{ascending:true})
  ]);
  for (const result of [artists,events,posts,songs]) if (result.error) throw result.error;
  const pendingSongs=songs.data||[];
  const paths=pendingSongs.map(item=>item.storage_path).filter(Boolean);
  let audioUrls=new Map();
  if(paths.length){
    const {data:signed,error}=await supabase.storage.from('capital-do-trem-audio').createSignedUrls(paths,60*60);
    if(error)throw error;
    audioUrls=new Map((signed||[]).map(item=>[item.path,item.signedUrl]));
  }
  return {
    artists: (artists.data||[]).map(item=>({id:item.id,title:item.artist_name,detail:[item.style,item.city,item.bio].filter(Boolean).join(' • ')})),
    events: (events.data||[]).map(item=>({id:item.id,title:item.title,detail:[item.category,item.event_date,item.event_time,item.address,item.description].filter(Boolean).join(' • ')})),
    posts: (posts.data||[]).map(item=>({id:item.id,title:'Divulgação da comunidade',detail:item.content})),
    songs: pendingSongs.map(item=>({id:item.id,title:item.title,detail:[item.artist_name,item.producer_name?'Produção: '+item.producer_name:'',item.description,'Direitos declarados: '+(item.rights_confirmed_at?'sim':'não')].filter(Boolean).join(' • '),audio_url:audioUrls.get(item.storage_path)||null,created_at:item.created_at}))
  };
}

export async function moderateItem(table, id, status, reason = '') {
  const allowedTables = ['artists','events','posts','songs'];
  if (!allowedTables.includes(table)) throw new Error('Tipo de publicação inválido.');
  if (!['published','rejected'].includes(status)) throw new Error('Ação de moderação inválida.');
  const supabase = initSupabase();
  if (!(await isCurrentUserAdmin())) throw new Error('Acesso administrativo não autorizado.');
  if (table === 'songs') {
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError)throw userError;
    const cleanReason=String(reason||'').trim();
    if(status==='rejected'&&!cleanReason)throw new Error('Informe o motivo da recusa.');
    const {error}=await supabase.from('songs').update({
      status,moderated_at:new Date().toISOString(),moderated_by:user.id,
      moderation_note:status==='rejected'?cleanReason:''
    }).eq('id',id);
    if(error)throw error;
    return;
  }
  const { error } = await supabase.from(table).update({status}).eq('id',id);
  if (error) throw error;
}


 // Publicação de músicas: somente administradores e membros da equipe autorizados.
export async function isCurrentUserArtistOrAdmin() {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return false;
  if (await isCurrentUserAdmin()) return true;
  const { data, error } = await supabase.from('profiles')
    .select('account_type').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  return data?.account_type === 'artist';
}

/* Upload de áudio tolerante a oscilações: TUS acima de 2 MB e fallback com tentativas limitadas. */
async function uploadSongAudioObject(supabase, path, file, contentType, onProgress) {
  if (file.size > 2 * 1024 * 1024) {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.access_token) throw new Error('Sua sessão expirou. Entre novamente antes de enviar a música.');
    let TusUpload = null;
    try {
      ({ Upload: TusUpload } = await import('https://cdn.jsdelivr.net/npm/tus-js-client@4/+esm'));
    } catch (error) {
      console.warn('TUS indisponível; usando envio direto com tentativas limitadas.', error);
    }
    if (TusUpload) {
      const projectId = new URL(SUPABASE_URL).hostname.split('.')[0];
      await new Promise((resolve, reject) => {
        const upload = new TusUpload(file, {
          endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
          retryDelays: [0, 2000, 5000, 10000, 20000],
          headers: { authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_PUBLISHABLE_KEY },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: { bucketName: 'capital-do-trem-audio', objectName: path, contentType, cacheControl: '3600' },
          chunkSize: 6 * 1024 * 1024,
          onError: reject,
          onProgress: (uploaded, total) => onProgress?.(Math.min(99, Math.round(uploaded / total * 100))),
          onSuccess: resolve
        });
        upload.start();
      });
      onProgress?.(100);
      return;
    }
  }
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { error } = await supabase.storage.from('capital-do-trem-audio').upload(path, file, {
        contentType, cacheControl: '3600', upsert: false
      });
      if (error) throw error;
      onProgress?.(100);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        onProgress?.(0);
        await new Promise(resolve => setTimeout(resolve, attempt * 1200));
      }
    }
  }
  throw lastError || new Error('Não foi possível enviar o áudio.');
}

export async function getSongPlaybackUrl(songId) {
  const supabase = initSupabase();
  if (!songId) throw new Error('Música sem identificador.');
  const { data: song, error: songError } = await supabase.from('songs')
    .select('storage_path').eq('id', songId).maybeSingle();
  if (songError) throw songError;
  if (!song?.storage_path) throw new Error('O arquivo desta música não está disponível.');
  const { data, error } = await supabase.storage.from('capital-do-trem-audio')
    .createSignedUrl(song.storage_path, 60 * 60);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Não foi possível renovar o link da música.');
  return data.signedUrl;
}

export async function uploadMySong({ file, title, artistName, producerName = '', description = '', onProgress = null }) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para enviar uma música.');
  // MCs/DJs enviam para revisão; somente o administrador publica diretamente.
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    const { data: accountProfile, error: accountError } = await supabase.from('profiles')
      .select('account_type').eq('user_id', user.id).maybeSingle();
    if (accountError) throw accountError;
    if (accountProfile?.account_type !== 'artist') throw new Error('Somente contas Artista / DJ podem publicar músicas.');
  }
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
  const cleanProducer = String(producerName || '').trim();
  const cleanDescription = String(description || '').trim();
  if (!cleanTitle) throw new Error('Informe o título da música antes de enviar.');
  if (cleanTitle.length > 120) throw new Error('O título da música deve ter no máximo 120 caracteres.');
  if (cleanArtist.length < 2 || cleanArtist.length > 100) throw new Error('Informe o nome artístico (até 100 caracteres).');
  if (cleanProducer.length > 100) throw new Error('O nome do produtor deve ter até 100 caracteres.');
  if (cleanDescription.length > 1000) throw new Error('A descrição deve ter até 1.000 caracteres.');
  const canonicalMime = ({mp3:'audio/mpeg',m4a:'audio/mp4',aac:'audio/aac',wav:'audio/wav',ogg:'audio/ogg'})[extension];
  const path = user.id + '/songs/' + crypto.randomUUID() + '.' + extension;
  await uploadSongAudioObject(supabase, path, file, canonicalMime, onProgress);
  const { data, error } = await supabase.from('songs').insert({
    user_id:user.id,title:cleanTitle,artist_name:cleanArtist,producer_name:cleanProducer,description:cleanDescription,
    storage_path:path,mime_type:canonicalMime,file_size:file.size,status:isAdmin?'published':'pending'
  }).select('id,title,artist_name,producer_name,status,created_at').single();
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
    .select('id,title,artist_name,producer_name,description,status,created_at,storage_path')
    .eq('user_id',user.id).order('created_at',{ascending:false});
  if (error) throw error;
  const songs = data || [];
  if (!songs.length) return [];
  const paths = songs.map(song => song.storage_path).filter(Boolean);
  const { data: signed, error: signedError } = paths.length
    ? await supabase.storage.from('capital-do-trem-audio').createSignedUrls(paths, 60 * 60)
    : { data: [], error: null };
  if (signedError) throw signedError;
  const urls = new Map((signed || []).map(item => [item.path, item.signedUrl]));
  return songs.map(song => ({
    ...song,
    audio_url: song.storage_path ? (urls.get(song.storage_path) || '') : ''
  }));
}


// Faixas publicadas vinculadas ao perfil público do artista/MC/DJ.
export async function getPublishedSongsForProfile(userId) {
  const supabase = initSupabase();
  const songs = [];
  const pageSize = 100;
  // Pagina o perfil para não esconder faixas antigas quando o artista tiver
  // mais de 100 publicações, mantendo a mesma ordenação do catálogo geral.
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from('songs')
      .select('id,title,artist_name,producer_name,description,storage_path')
      .eq('user_id', userId).eq('status', 'published')
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const page = data || [];
    songs.push(...page);
    if (page.length < pageSize) break;
  }
  if (!songs.length) return [];
  const storage = supabase.storage.from('capital-do-trem-audio');
  const available = [];
  // Assina em lotes para respeitar os limites do Storage.
  for (let from = 0; from < songs.length; from += pageSize) {
    const batch = songs.slice(from, from + pageSize);
    const { data: signed, error: signedError } = await storage
      .createSignedUrls(batch.map(song => song.storage_path), 60 * 60);
    if (signedError) throw signedError;
    const urls = new Map((signed || []).map(item => [item.path, item.signedUrl]));
    for (const song of batch) {
      const audioUrl = urls.get(song.storage_path);
      if (!audioUrl) continue;
      available.push({
        id: song.id, title: song.title, artist_name: song.artist_name,
        producer_name: song.producer_name || '', description: song.description || '',
        audio_url: audioUrl
      });
    }
  }
  return available;
}

// Busca perfis públicos pelo nome ou @ para localizar músicas diretamente na página do artista/usuário.
export async function searchPublicMusicProfiles(query) {
  const supabase = initSupabase();
  const term = String(query || '').trim().replace(/^@+/, '').replace(/[%,()_*.,]/g, ' ').replace(/\s+/g, ' ').slice(0, 60);
  if (term.length < 2) throw new Error('Digite pelo menos 2 caracteres do nome ou @ do perfil.');
  const pattern = '%' + term + '%';
  const { data, error } = await supabase.from('profiles')
    .select('user_id,display_name,username,account_type')
    .eq('is_public', true)
    .or('display_name.ilike.' + pattern + ',username.ilike.' + pattern)
    .order('display_name', { ascending: true }).limit(30);
  if (error) throw error;
  return data || [];
}

export async function getPublishedSongs() {
  const supabase = initSupabase();
  // Busca o catálogo completo em páginas para que novas publicações não fiquem
  // escondidas depois das primeiras 100 músicas.
  const items = [];
  const pageSize = 100;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from('songs')
      .select('id,title,artist_name,producer_name,description,storage_path')
      .eq('status','published')
      .order('created_at',{ascending:false})
      .order('id',{ascending:true})
      .range(from,from + pageSize - 1);
    if (error) throw error;
    const page = data || [];
    items.push(...page);
    if (page.length < pageSize) break;
  }
  if (!items.length) return [];
  const storage = supabase.storage.from('capital-do-trem-audio');
  const available = [];
  // Assina lotes menores para o catálogo crescer sem exceder o limite de
  // caminhos aceitos pelo Storage em uma única chamada.
  for (let from = 0; from < items.length; from += pageSize) {
    const batch = items.slice(from, from + pageSize);
    const paths = batch.map(song => song.storage_path);
    // A reprodução é essencial para selecionar uma faixa no Feed e nos Stories.
    // O link de download é complementar: uma falha nele não pode bloquear o catálogo.
    const [streamResult, downloadResult] = await Promise.all([
      storage.createSignedUrls(paths, 60 * 60),
      storage.createSignedUrls(paths, 60 * 60, { download: true }).catch(error => ({ data: null, error }))
    ]);
    if (streamResult.error) throw streamResult.error;
    const signedByPath = new Map((streamResult.data || []).map(item => [item.path, item.signedUrl]));
    const downloadByPath = new Map((downloadResult.data || []).map(item => [item.path, item.signedUrl]));
    for (const song of batch) {
      const audioUrl = signedByPath.get(song.storage_path);
      // Uma falha isolada ao gerar o link de download não deve esconder uma
      // música que continua disponível para streaming.
      if (!audioUrl) continue;
      available.push({
        id:song.id,
        title:song.title,
        artist_name:song.artist_name,
        producer_name:song.producer_name || '',
        description:song.description,
        audio_url:audioUrl,
        download_url:downloadByPath.get(song.storage_path) || audioUrl
      });
    }
  }
  return available;
}

// Agenda pública: visitantes podem consultar eventos publicados diretamente.
export async function getPublishedEvents() {
  const supabase = initSupabase();
  const today = (() => { const now = new Date(); return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-'); })();
  const { data, error } = await supabase.from('events')
    .select('id,title,event_date,event_time,address,description,contact,poster_url,latitude,longitude,music_song_id')
    .eq('status','published')
    .gte('event_date',today)
    .order('event_date',{ascending:true})
    .order('event_time',{ascending:true})
    .limit(50);
  if (error) throw error;
  const events = data || [];
  const songIds = [...new Set(events.map(item=>item.music_song_id).filter(Boolean))];
  if (songIds.length) {
    const { data: songs, error: songsError } = await supabase.from('songs')
      .select('id,title,artist_name,storage_path')
      .in('id',songIds).eq('status','published');
    if (songsError) throw songsError;
    const songsById = new Map();
    for (const song of songs || []) {
      const { data: signed } = await supabase.storage.from('capital-do-trem-audio').createSignedUrl(song.storage_path,60*60);
      songsById.set(song.id,{title:song.title,artist_name:song.artist_name,audio_url:signed?.signedUrl||null});
    }
    return events.map(item=>({...item,music:songsById.get(item.music_song_id)||null}));
  }
  return events.map(item=>({...item,music:null}));
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
    .select('user_id, display_name, username, account_type, bio, city, is_public, avatar_type, avatar_url, avatar_path, avatar_data, cover_url, cover_path')
    .eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  // Perfil existente é devolvido imediatamente: não bloquear a tela com RPCs
  // de bootstrap administrativo que só são necessários na primeira criação.
  if (data) return data;

  // Prepara o primeiro perfil administrativo somente quando ainda não existe.
  // Perfis já cadastrados nunca são sobrescritos durante uma simples leitura.
  if ((user.email || '').toLowerCase() === 'capitaldotrem07@gmail.com') {
    try { await bootstrapFirstAdmin(); } catch (error) { console.warn('Bootstrap administrativo não concluído:', error); }
    if (await isCurrentUserAdmin() && !data) {
      const taken = await supabase.from('profiles').select('user_id')
        .eq('username', 'sbrunochock').neq('user_id', user.id).maybeSingle();
      if (taken.error) throw taken.error;
      if (taken.data) throw new Error('O identificador @sbrunochock já está associado a outra conta. A equipe precisa revisar o cadastro.');
      return saveMyBasicProfile({
        display_name: 'Administrador',
        username: 'sbrunochock',
        account_type: 'user',
        city: 'Belo Horizonte • MG',
        bio: 'Administrador oficial do Capital do Trem',
        is_public: true
      });
    }
  }
  // Perfis comuns também são criados automaticamente na primeira entrada.
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

export async function isUsernameAvailable(value) {
  const username=String(value||'').trim().toLowerCase();
  if(!/^[a-z0-9][a-z0-9_]{2,31}$/.test(username))throw new Error('Use de 3 a 32 caracteres: letras minúsculas, números e sublinhado; comece com letra ou número.');
  const supabase=initSupabase();
  const {data,error}=await supabase.rpc('is_username_available',{p_username:username});
  if(error)throw error;
  return data===true;
}

export async function saveMyBasicProfile(profile) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para salvar seu perfil.');
  const {data:existing,error:existingError}=await supabase.from('profiles').select('username').eq('user_id',user.id).maybeSingle();
  if(existingError)throw existingError;
  // O identificador técnico só é gerado quando a conta ainda não possui username.
  let username = String(profile.username || existing?.username || '').trim().toLowerCase();
  if (!username) username = ('uai_' + user.id.replace(/-/g, '').slice(0, 12)).slice(0,32);
  if (!/^[a-z0-9][a-z0-9_]{2,31}$/.test(username)) {
    throw new Error('Nome de usuário inválido. Use de 3 a 32 caracteres: letras minúsculas, números e sublinhado.');
  }
  if(existing?.username && username!==String(existing.username).toLowerCase()){
    if(!(await isUsernameAvailable(username)))throw new Error('Este nome de usuário já está em uso. Escolha outro.');
  }
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
    .select('user_id, display_name, username, account_type, bio, city, is_public, avatar_type, avatar_url, avatar_path, avatar_data, cover_url, cover_path').single();
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

// Participação voluntária no grupo geral. A autorização real também é aplicada pelo RLS no banco.
export async function getChatGroupMembership() {
  const supabase=initSupabase();
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError)throw userError;
  if(!user)throw new Error('Entre na sua conta para verificar sua participação.');
  const {data,error}=await supabase.from('chat_group_members')
    .select('user_id,joined_at,left_at').eq('user_id',user.id).maybeSingle();
  if(error)throw error;
  return {isMember:!!data&&!data.left_at,membership:data||null};
}

export async function joinChatGroup() {
  const supabase=initSupabase();
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError)throw userError;
  if(!user)throw new Error('Entre na sua conta para participar do grupo.');
  const {data,error}=await supabase.from('chat_group_members')
    .upsert({user_id:user.id,joined_at:new Date().toISOString(),left_at:null},{onConflict:'user_id'})
    .select('user_id,joined_at,left_at').single();
  if(error)throw error;
  return data;
}

export async function leaveChatGroup() {
  const supabase=initSupabase();
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError)throw userError;
  if(!user)throw new Error('Entre na sua conta.');
  const {data,error}=await supabase.from('chat_group_members')
    .update({left_at:new Date().toISOString()}).eq('user_id',user.id)
    .select('user_id,left_at').single();
  if(error)throw error;
  return data;
}

// Arquivos do chat: bucket privado, permissões por grupo/conversa e links temporários.
const CHAT_ATTACHMENT_BUCKET = 'capital-do-trem-chat';
const CHAT_ATTACHMENT_TYPES = {
  jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',
  mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',
  mp3:'audio/mpeg',m4a:'audio/mp4',aac:'audio/aac',ogg:'audio/ogg',oga:'audio/ogg',wav:'audio/wav',
  pdf:'application/pdf',txt:'text/plain',csv:'text/csv',
  doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'
};
function describeChatFile(file) {
  if (!(file instanceof File)) throw new Error('Escolha um arquivo do celular.');
  const extension = String(file.name || '').split('.').pop().toLowerCase();
  const rawMime = String(file.type || '').toLowerCase().split(';')[0].trim();
  const allowedMimes = [...Object.values(CHAT_ATTACHMENT_TYPES), 'audio/webm'];
  const mime = allowedMimes.includes(rawMime) ? rawMime : CHAT_ATTACHMENT_TYPES[extension];
  if (!mime) throw new Error('Formato não permitido. Envie foto, vídeo, áudio, PDF, texto ou documento Office.');
  const type = mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : mime.startsWith('audio/') ? 'audio' : 'document';
  const canonicalExtension = mime === 'audio/webm' ? 'webm' : (Object.entries(CHAT_ATTACHMENT_TYPES).find(([, value]) => value === mime)?.[0] || extension);
  if (file.size < 1 || file.size > 20 * 1024 * 1024) throw new Error('O arquivo precisa ter até 20 MB.');
  if (type === 'image' && file.size > 12 * 1024 * 1024) throw new Error('Fotos precisam ter até 12 MB.');
  return { type, mime, extension:canonicalExtension, name: String(file.name || 'arquivo').slice(0,180), size: file.size };
}
async function uploadChatFile(file, path) {
  const supabase = initSupabase();
  const meta = describeChatFile(file);
  const { error } = await supabase.storage.from(CHAT_ATTACHMENT_BUCKET).upload(path, file, {
    contentType: meta.mime, cacheControl: '60', upsert: false
  });
  if (error) throw error;
  return { ...meta, path };
}
async function signChatAttachment(path, expiresIn = 900) {
  if (!path) return null;
  const supabase = initSupabase();
  const { data, error } = await supabase.storage.from(CHAT_ATTACHMENT_BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data?.signedUrl || null;
}
async function hydrateChatMessage(message) {
  if (message?.view_once) return { ...message, attachment_url: null, viewed_by_me: false };
  if (!message?.attachment_path) return message;
  try { return { ...message, attachment_url: await signChatAttachment(message.attachment_path) }; }
  catch (error) {
    console.warn('Anexo temporariamente indisponível; a mensagem continuará visível.', error);
    return { ...message, attachment_url: null };
  }
}
async function hydrateChatMessages(messages, kind = 'group') {
  const rows = messages || [];
  const supabase = initSupabase();
  const viewOnceRows = rows.filter(message => message.view_once === true);
  const viewedIds = new Set();
  if (viewOnceRows.length) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const table = kind === 'private' ? 'private_message_views' : 'chat_message_views';
      const { data: views, error: viewError } = await supabase.from(table)
        .select('message_id').eq('viewer_id', user.id)
        .in('message_id', viewOnceRows.map(message => message.id));
      if (viewError) console.warn('Não foi possível consultar o histórico de visualização única.', viewError);
      for (const view of views || []) viewedIds.add(view.message_id);
    }
  }
  const regular = rows.filter(message => !message.view_once && message.attachment_path);
  const paths = [...new Set(regular.map(message => message.attachment_path))];
  const signed = new Map();
  if (paths.length) {
    try {
      const { data, error } = await supabase.storage.from(CHAT_ATTACHMENT_BUCKET).createSignedUrls(paths, 900);
      if (error) throw error;
      for (const item of data || []) if (item?.path && item?.signedUrl) signed.set(item.path, item.signedUrl);
    } catch (error) {
      console.warn('Não foi possível assinar alguns anexos; as mensagens continuam disponíveis.', error);
    }
  }
  return rows.map(message => {
    if (message.view_once) return { ...message, attachment_url: null, viewed_by_me: viewedIds.has(message.id) };
    return { ...message, attachment_url: message.attachment_path ? (signed.get(message.attachment_path) || null) : message.attachment_url };
  });
}
export async function openViewOnceChatMedia(messageId, kind = 'private') {
  const supabase = initSupabase();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.access_token) throw new Error('Entre na sua conta para abrir esta mídia.');
  if (!['group','private'].includes(kind)) throw new Error('Tipo de conversa inválido.');

  // A Edge Function valida a participação, consome a visualização com chave única
  // no banco e só então devolve os bytes. Nenhum URL reutilizável é emitido ao cliente.
  const response = await fetch(`${SUPABASE_URL}/functions/v1/open-view-once-chat-media`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify({ message_id: messageId, kind }),
    cache: 'no-store'
  });
  if (!response.ok) {
    let detail = '';
    try { detail = (await response.text()).slice(0, 300); } catch {}
    if (response.status === 409) throw new Error('Você já visualizou esta mídia. Ela não pode ser aberta novamente.');
    if (response.status === 401 || response.status === 403) throw new Error('Você não tem autorização para abrir esta mídia.');
    throw new Error(detail || 'Não foi possível abrir esta mídia agora.');
  }
  const type = response.headers.get('X-Chat-Media-Type');
  if (!['image','video','audio'].includes(type)) throw new Error('O servidor retornou um formato de mídia inválido.');
  const blob = await response.blob();
  if (!blob.size) throw new Error('A mídia está vazia ou indisponível.');
  return { url: URL.createObjectURL(blob), type };
}

// Bate-papo geral em tempo real para todos os usuários autenticados.
export async function getChatMessages(limit = 60) {
  const supabase = initSupabase();
  const { data, error } = await supabase.from('chat_messages')
    .select('id, author_id, author_name, content, created_at, author_avatar_type, author_avatar_url, author_avatar_data, attachment_url, attachment_path, attachment_type, attachment_name, attachment_mime, attachment_size, view_once, edited_at')
    .order('created_at', { ascending: false }).limit(Math.min(Math.max(Number(limit) || 60, 1), 100));
  if (error) throw error;
  return await hydrateChatMessages((data || []).reverse(),'group');
}

export async function uploadChatAttachment(file) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para enviar arquivos.');
  const meta = describeChatFile(file);
  const path = 'group/' + user.id + '/' + crypto.randomUUID() + '.' + meta.extension;
  return await uploadChatFile(file, path);
}

export async function sendChatMessage(content, attachment = null, viewOnce = false) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para participar do bate-papo.');
  const cleanContent = String(content || '').trim();
  if ((!cleanContent && !attachment) || cleanContent.length > 1000) throw new Error('Escreva uma mensagem ou anexe um arquivo. O texto pode ter até 1.000 caracteres.');
  const fallback = attachment?.type === 'image' ? '📷 Foto' : attachment?.type === 'video' ? '🎬 Vídeo' : attachment?.type === 'audio' ? '🎵 Áudio' : '📎 ' + (attachment?.name || 'Documento');
  const payload = { author_id:user.id, content:cleanContent || fallback, view_once:Boolean(viewOnce&&attachment&&['image','video','audio'].includes(attachment.type)) };
  if (attachment) Object.assign(payload,{
    attachment_path:attachment.path,attachment_type:attachment.type,attachment_name:attachment.name,
    attachment_mime:attachment.mime,attachment_size:attachment.size
  });
  const { data, error } = await supabase.from('chat_messages').insert(payload)
    .select('id, author_id, author_name, content, created_at, author_avatar_type, author_avatar_url, author_avatar_data, attachment_url, attachment_path, attachment_type, attachment_name, attachment_mime, attachment_size, view_once, edited_at').single();
  if (error) {
    if (attachment?.path) await supabase.storage.from(CHAT_ATTACHMENT_BUCKET).remove([attachment.path]).catch(() => {});
    throw error;
  }
  return await hydrateChatMessage(data);
}

export function subscribeChatMessages(onMessage, onStatus) {
  const supabase = initSupabase();
  const channel = supabase.channel('capital-do-trem-chat')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async payload => {
      if (typeof onMessage === 'function') {
        try { onMessage(await hydrateChatMessage(payload.new)); }
        catch (error) { console.warn('Não foi possível abrir o anexo da mensagem.', error); onMessage(payload.new); }
      }
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


// Salas de bate-papo por assunto: cada participante entra na sala antes de ler ou enviar mensagens.
export async function getDiscussionTopics(){
 const supabase=initSupabase();
 const {data:{user},error:userError}=await supabase.auth.getUser();if(userError)throw userError;if(!user)throw new Error('Entre na sua conta para descobrir assuntos.');
 const {data:topics,error}=await supabase.from('discussion_topics').select('id,creator_id,title,description,created_at').order('created_at',{ascending:false}).limit(100);
 if(error)throw error;if(!topics?.length)return [];
 const ids=topics.map(t=>t.id);
 const {data:members,error:membersError}=await supabase.from('discussion_topic_members').select('topic_id,user_id').in('topic_id',ids);
 if(membersError)throw membersError;
 const counts=new Map(),joined=new Set();
 for(const member of members||[]){counts.set(member.topic_id,(counts.get(member.topic_id)||0)+1);if(member.user_id===user.id)joined.add(member.topic_id)}
 return topics.map(topic=>({...topic,member_count:counts.get(topic.id)||0,is_member:joined.has(topic.id)}));
}
export async function createDiscussionTopic(title,description=''){
 const supabase=initSupabase();const {data:{user},error:userError}=await supabase.auth.getUser();if(userError)throw userError;if(!user)throw new Error('Entre na sua conta para criar um assunto.');
 const cleanTitle=String(title||'').trim(),cleanDescription=String(description||'').trim();
 if(cleanTitle.length<3||cleanTitle.length>80)throw new Error('O assunto precisa ter de 3 a 80 caracteres.');
 if(cleanDescription.length>400)throw new Error('A descrição pode ter até 400 caracteres.');
 const {data,error}=await supabase.from('discussion_topics').insert({creator_id:user.id,title:cleanTitle,description:cleanDescription}).select('id,creator_id,title,description,created_at').single();
 if(error)throw error;return data;
}
export async function joinDiscussionTopic(topicId){
 const supabase=initSupabase();const {data:{user},error:userError}=await supabase.auth.getUser();if(userError)throw userError;if(!user)throw new Error('Entre na sua conta para participar.');
 const {data,error}=await supabase.from('discussion_topic_members').upsert({topic_id:topicId,user_id:user.id},{onConflict:'topic_id,user_id'}).select('topic_id,user_id').single();
 if(error)throw error;return data;
}
export async function getDiscussionMessages(topicId,limit=60){
 const supabase=initSupabase();const {data,error}=await supabase.from('discussion_topic_messages').select('id,topic_id,author_id,content,created_at').eq('topic_id',topicId).order('created_at',{ascending:false}).limit(Math.min(Math.max(Number(limit)||60,1),100));
 if(error)throw error;const messages=(data||[]).reverse();const ids=[...new Set(messages.map(m=>m.author_id))];
 if(!ids.length)return [];
 const {data:profiles,error:profileError}=await supabase.from('profiles').select('user_id,display_name,username,avatar_type,avatar_url,avatar_data').in('user_id',ids);
 if(profileError)throw profileError;const byId=new Map((profiles||[]).map(p=>[p.user_id,p]));
 return messages.map(m=>({...m,author:byId.get(m.author_id)||{display_name:'Maquinista'}}));
}
export async function sendDiscussionMessage(topicId,content){
 const supabase=initSupabase();const {data:{user},error:userError}=await supabase.auth.getUser();if(userError)throw userError;if(!user)throw new Error('Entre na sua conta para enviar mensagens.');
 const clean=String(content||'').trim();if(!clean||clean.length>1000)throw new Error('A mensagem deve ter de 1 a 1.000 caracteres.');
 const {data,error}=await supabase.from('discussion_topic_messages').insert({topic_id:topicId,author_id:user.id,content:clean}).select('id,topic_id,author_id,content,created_at').single();
 if(error)throw error;return data;
}
export function subscribeDiscussionMessages(topicId,onMessage,onStatus){
 const supabase=initSupabase();const channel=supabase.channel('discussion-topic-'+topicId).on('postgres_changes',{event:'INSERT',schema:'public',table:'discussion_topic_messages',filter:'topic_id=eq.'+topicId},async payload=>{
  if(typeof onMessage!=='function')return;
  try{const {data,error}=await supabase.from('profiles').select('user_id,display_name,username,avatar_type,avatar_url,avatar_data').eq('user_id',payload.new.author_id).maybeSingle();if(error)throw error;onMessage({...payload.new,author:data||{display_name:'Maquinista'}})}catch{onMessage({...payload.new,author:{display_name:'Maquinista'}})}
 }).subscribe(status=>{if(typeof onStatus==='function')onStatus(status)});
 return ()=>supabase.removeChannel(channel);
}

// Conversas privadas: pedidos de contato, aceite, mensagens e bloqueios.
export async function getPrivateConversationData() {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para acessar suas conversas.');
  const [{ data: conversations, error: conversationError }, { data: membership, error: membershipError }, { data: memberRows, error: membersError }, { data: blocks, error: blockError }] = await Promise.all([
    supabase.from('private_conversations').select('id,participant_one,participant_two,initiated_by,status,created_at,updated_at').or('participant_one.eq.' + user.id + ',participant_two.eq.' + user.id).order('updated_at',{ascending:false}).limit(100),
    supabase.from('chat_group_members').select('user_id,joined_at,left_at').eq('user_id',user.id).maybeSingle(),
    supabase.rpc('active_chat_group_member_ids'),
    supabase.from('private_blocks').select('blocked_id').eq('blocker_id',user.id)
  ]);
  if (conversationError) throw conversationError;
  if (membershipError) throw membershipError;
  if (membersError) throw membersError;
  if (blockError) throw blockError;
  const isGroupMember=!!membership&&!membership.left_at;
  const allMemberIds=(memberRows||[]).map(row=>row.user_id);
  const canStartPrivate=isGroupMember&&allMemberIds.includes(user.id);
  const memberIds=allMemberIds.filter(id=>id!==user.id);
  let people=[];
  if(canStartPrivate&&memberIds.length){
    const {data,error}=await supabase.from('profiles')
      .select('user_id,display_name,username,account_type,city,avatar_type,avatar_url,avatar_data')
      .eq('is_public',true).in('user_id',memberIds).order('display_name',{ascending:true}).limit(100);
    if(error)throw error;
    people=data||[];
  }
  return { userId:user.id, isGroupMember, canStartPrivate, conversations:conversations||[], people, memberIds, blocked:(blocks||[]).map(row=>row.blocked_id) };
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
    .select('id,conversation_id,sender_id,content,created_at,attachment_path,attachment_type,attachment_name,attachment_mime,attachment_size,view_once,edited_at')
    .eq('conversation_id',conversationId).order('created_at',{ascending:true}).limit(100);
  if(error)throw error;
  return await hydrateChatMessages(data||[],'private');
}

export async function sendPrivateMessage(conversationId,content,file=null,viewOnce=false) {
  const supabase=initSupabase();
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError)throw userError;
  if(!user)throw new Error('Entre na sua conta para enviar mensagens.');
  const clean=String(content||'').trim();
  if(clean.length>2000)throw new Error('A mensagem pode ter até 2.000 caracteres.');
  if(!clean&&!file)throw new Error('Escreva uma mensagem ou escolha um arquivo.');
  let attachment=null;
  if(file){
    const meta=describeChatFile(file);
    const path='private/'+conversationId+'/'+user.id+'/'+crypto.randomUUID()+'.'+meta.extension;
    attachment=await uploadChatFile(file,path);
  }
  const fallback=attachment?.type==='image'?'📷 Foto':attachment?.type==='video'?'🎬 Vídeo':attachment?.type==='audio'?'🎵 Áudio':'📎 '+(attachment?.name||'Documento');
  const payload={conversation_id:conversationId,sender_id:user.id,content:clean||fallback,view_once:Boolean(viewOnce&&attachment&&['image','video','audio'].includes(attachment.type))};
  if(attachment)Object.assign(payload,{
    attachment_path:attachment.path,attachment_type:attachment.type,attachment_name:attachment.name,
    attachment_mime:attachment.mime,attachment_size:attachment.size
  });
  const {data,error}=await supabase.from('private_messages')
    .insert(payload)
    .select('id,conversation_id,sender_id,content,created_at,attachment_path,attachment_type,attachment_name,attachment_mime,attachment_size,view_once,edited_at').single();
  if(error){
    if(attachment?.path)await supabase.storage.from(CHAT_ATTACHMENT_BUCKET).remove([attachment.path]).catch(()=>{});
    throw error;
  }
  await supabase.from('private_conversations').update({updated_at:new Date().toISOString()}).eq('id',conversationId);
  return await hydrateChatMessage(data);
}

export async function subscribePrivateMessages(conversationId,onMessage,onStatus) {
  const supabase=initSupabase();
  const channel=supabase.channel('private-chat-'+conversationId)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'private_messages',filter:'conversation_id=eq.'+conversationId},async payload=>{
      if(typeof onMessage==='function'){
        try{onMessage(await hydrateChatMessage(payload.new));}
        catch(error){console.warn('Não foi possível abrir o anexo privado.',error);onMessage(payload.new);}
      }
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


// Denúncias e ações de moderação protegidas por funções do banco.
export async function reportChatParticipant(targetUserId,reason,details='') {
 const supabase=initSupabase();
 const {data,error}=await supabase.rpc('report_chat_participant',{p_target_user_id:targetUserId,p_reason:reason,p_details:details});
 if(error)throw error;
 return data;
}
export async function moderateChatParticipant(targetUserId,action,reason='') {
 const supabase=initSupabase();
 const {data,error}=await supabase.rpc('moderate_chat_participant',{p_target_user_id:targetUserId,p_action:action,p_reason:reason});
 if(error)throw error;
 return data;
}
export async function getChatModerationReports(limit=100) {
 const supabase=initSupabase();
 if(!(await isCurrentUserAdmin()))throw new Error('Acesso administrativo não autorizado.');
 const {data,error}=await supabase.from('chat_moderation_reports')
  .select('id,reporter_id,target_user_id,reason,details,status,created_at')
  .order('created_at',{ascending:false}).limit(Math.min(Math.max(Number(limit)||100,1),200));
 if(error)throw error;
 return data||[];
}


/* Imagens oficiais do FALA UAI: leitura compartilhada e gravação exclusiva do administrador. */
export async function getPublicChatProfileImages() {
  const supabase = initSupabase();
  const { data, error } = await supabase.from('site_settings')
    .select('setting_key,setting_value')
    .in('setting_key', ['chat_brand_profile_image_url','chat_group_profile_image_url']);
  if (error) throw error;
  const settings = Object.fromEntries((data || []).map(row => [row.setting_key, row.setting_value]));
  return {
    brand: settings.chat_brand_profile_image_url || '',
    group: settings.chat_group_profile_image_url || ''
  };
}

export async function saveAdminChatProfileImages(files = {}) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user || !(await isCurrentUserAdmin())) throw new Error('Somente o administrador pode alterar as imagens oficiais do FALA UAI.');
  const selected = [['brand',files.brand,'chat-brand'],['group',files.group,'chat-group']].filter(([,file]) => file instanceof File);
  if (!selected.length) throw new Error('Escolha pelo menos uma imagem antes de salvar.');
  const rows = [];
  for (const [kind,file,prefix] of selected) {
    const format = await getBrandingUploadFormat(file, { jpg:true, jpeg:true, png:true, webp:true });
    if (file.size < 1 || file.size > 5 * 1024 * 1024) throw new Error('Cada imagem deve ter até 5 MB.');
    const path = user.id + '/branding/' + prefix + '-' + crypto.randomUUID() + '.' + format.extension;
    const { error: uploadError } = await supabase.storage.from('capital-do-trem-media').upload(path,file,{
      contentType:format.contentType,cacheControl:'3600',upsert:false
    });
    if (uploadError) throw uploadError;
    const { data: publicData } = supabase.storage.from('capital-do-trem-media').getPublicUrl(path);
    if (!publicData?.publicUrl) throw new Error('Não foi possível gerar o endereço público da imagem.');
    rows.push({setting_key:kind==='brand'?'chat_brand_profile_image_url':'chat_group_profile_image_url',setting_value:publicData.publicUrl,updated_at:new Date().toISOString()});
  }
  const { data: savedRows, error } = await supabase.from('site_settings')
    .upsert(rows,{onConflict:'setting_key'})
    .select('setting_key,setting_value');
  if (error) throw error;
  if (!Array.isArray(savedRows) || savedRows.length !== rows.length) {
    throw new Error('As imagens foram enviadas, mas não foi possível confirmar a gravação das configurações. Tente salvar novamente.');
  }
  return await getPublicChatProfileImages();
}

/* Diretório do grupo: IDs ativos e perfis públicos, sem expor dados privados. */
export async function getChatGroupDirectory() {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para ver os participantes.');
  const { data: members, error: membersError } = await supabase.from('chat_group_members')
    .select('user_id').is('left_at', null).order('joined_at', { ascending:true }).limit(500);
  if (membersError) throw membersError;
  const memberIds = (members || []).map(row => row.user_id).filter(Boolean);
  if (!memberIds.length) return { count:0, participants:[] };
  const { data: profiles, error: profilesError } = await supabase.from('profiles')
    .select('user_id,display_name,username,avatar_type,avatar_url,avatar_data')
    .in('user_id',memberIds).eq('is_public',true).order('display_name',{ascending:true}).limit(200);
  if (profilesError) throw profilesError;
  return { count:memberIds.length, participants:profiles || [] };
}

// Identidade visual oficial do aplicativo: leitura pública e gravação exclusiva de administradores.
export async function getPublicBranding() {
  const supabase = initSupabase();
  const { data, error } = await supabase.from('site_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['official_profile_image_url', 'app_opening_image_url', 'app_opening_video_url', 'app_opening_video_muted', 'app_opening_video_volume', 'app_opening_x', 'app_opening_y', 'app_opening_fit', 'app_home_background_image_url', 'app_home_background_x', 'app_home_background_y', 'app_home_background_blur', 'app_home_background_fit', 'app_header_background_image_url', 'app_header_background_x', 'app_header_background_y', 'app_header_background_blur', 'app_header_background_fit', 'app_music_cover_image_url', 'app_music_cover_x', 'app_music_cover_y', 'app_music_cover_fit']);
  if (error) throw error;
  const settings = Object.fromEntries((data || []).map(row => [row.setting_key, row.setting_value]));
  return {
    profileImageUrl: settings.official_profile_image_url || '',
    openingImageUrl: settings.app_opening_image_url || '',
    openingVideoUrl: settings.app_opening_video_url || '',
    openingVideoMuted: settings.app_opening_video_muted === 'true',
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
    headerBackgroundFit: settings.app_header_background_fit === 'contain' ? 'contain' : 'cover',
    musicCoverUrl: settings.app_music_cover_image_url || '',
    musicCoverX: Number(settings.app_music_cover_x ?? 50),
    musicCoverY: Number(settings.app_music_cover_y ?? 50),
    musicCoverFit: settings.app_music_cover_fit === 'contain' ? 'contain' : 'cover'
  };
}

/* Capa independente da biblioteca musical: somente administradores podem publicar e ajustar. */
export async function saveAdminMusicCover(file, options = {}) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user || !(await isCurrentUserAdmin())) throw new Error('Somente um administrador pode alterar a capa da área Músicas.');
  if (!(file instanceof File)) throw new Error('Escolha uma imagem para a capa.');
  const format = await getBrandingUploadFormat(file, { jpg: true, jpeg: true, png: true, webp: true });
  if (file.size < 1 || file.size > 8 * 1024 * 1024) throw new Error('A capa deve ter até 8 MB.');
  const path = user.id + '/branding/music-cover-' + crypto.randomUUID() + '.' + format.extension;
  const { error: uploadError } = await supabase.storage.from('capital-do-trem-media').upload(path, file, {
    contentType: format.contentType, cacheControl: '3600', upsert: false
  });
  if (uploadError) throw uploadError;
  const { data: publicData } = supabase.storage.from('capital-do-trem-media').getPublicUrl(path);
  if (!publicData?.publicUrl) throw new Error('Não foi possível gerar o endereço público da capa.');
  const now = new Date().toISOString();
  const clamp = value => Math.max(0, Math.min(100, Number(value ?? 50)));
  const { error: saveError } = await supabase.from('site_settings').upsert([
    { setting_key: 'app_music_cover_image_url', setting_value: publicData.publicUrl, updated_at: now },
    { setting_key: 'app_music_cover_x', setting_value: String(clamp(options.x)), updated_at: now },
    { setting_key: 'app_music_cover_y', setting_value: String(clamp(options.y)), updated_at: now },
    { setting_key: 'app_music_cover_fit', setting_value: options.fit === 'contain' ? 'contain' : 'cover', updated_at: now }
  ], { onConflict: 'setting_key' });
  if (saveError) throw saveError;
  return publicData.publicUrl;
}

export async function saveAdminMusicCoverSettings(options = {}) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user || !(await isCurrentUserAdmin())) throw new Error('Somente um administrador pode ajustar a capa da área Músicas.');
  const clamp = value => Math.max(0, Math.min(100, Number(value ?? 50)));
  const now = new Date().toISOString();
  const rows = [
    { setting_key: 'app_music_cover_x', setting_value: String(clamp(options.x)), updated_at: now },
    { setting_key: 'app_music_cover_y', setting_value: String(clamp(options.y)), updated_at: now },
    { setting_key: 'app_music_cover_fit', setting_value: options.fit === 'contain' ? 'contain' : 'cover', updated_at: now }
  ];
  const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'setting_key' });
  if (error) throw error;
  return true;
}


// Normaliza fotos HEIC/HEIF da galeria (comuns no iPhone) para JPEG antes do upload.
// Os demais formatos seguem intactos para preservar qualidade e transparência.
export async function prepareStoryMediaFile(file) {
  if (!(file instanceof File)) throw new Error('Escolha uma foto ou vídeo.');
  const extension = String(file.name || '').split('.').pop().toLowerCase();
  const heic = ['heic', 'heif'].includes(extension) || /image\/(heic|heif)/i.test(file.type || '');
  if (!heic) return file;
  let source = null;
  let objectUrl = '';
  try {
    if (typeof createImageBitmap === 'function') {
      try { source = await createImageBitmap(file); } catch {}
    }
    if (!source) {
      objectUrl = URL.createObjectURL(file);
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('Este aparelho não conseguiu decodificar a foto HEIC. Exporte a imagem como JPG na galeria e tente novamente.'));
        image.src = objectUrl;
      });
      source = image;
    }
    const width = source.width || source.naturalWidth;
    const height = source.height || source.naturalHeight;
    if (!width || !height) throw new Error('A foto selecionada está inválida. Escolha outra imagem.');
    const scale = Math.min(1, 1440 / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Não foi possível preparar a foto para publicação.');
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    let blob = null;
    for (const quality of [0.84, 0.76, 0.68]) {
      blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && blob.size <= 7.5 * 1024 * 1024) break;
    }
    if (!blob || blob.size > 8 * 1024 * 1024) throw new Error('A foto ficou muito pesada após a conversão. Escolha uma imagem menor.');
    return new File([blob], 'capital-do-trem-story.jpg', { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    source?.close?.();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

// Normaliza MIME genérico/vazio devolvido por alguns seletores Android.
async function getBrandingUploadFormat(file, allowed) {
 const has=(key)=>Object.prototype.hasOwnProperty.call(allowed,key);
 const ext=String(file?.name||'').split('.').pop().toLowerCase();
 const mimeExt={'image/jpeg':'jpg','image/jpg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'};
 let detected='';
 try {
  const b=new Uint8Array(await file.slice(0,16).arrayBuffer());
  if(b[0]===0xff&&b[1]===0xd8&&b[2]===0xff)detected='jpg';
  else if(b[0]===0x89&&b[1]===0x50&&b[2]===0x4e&&b[3]===0x47)detected='png';
  else if(String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP')detected='webp';
  else if(String.fromCharCode(...b.slice(4,8))==='ftyp')detected=String.fromCharCode(...b.slice(8,12))==='qt  '?'mov':'mp4';
  else if(b[0]===0x1a&&b[1]===0x45&&b[2]===0xdf&&b[3]===0xa3)detected='webm';
 } catch {}
 const byMime=mimeExt[String(file?.type||'').toLowerCase()]||'';
 const candidates=[detected,byMime,ext];
 const chosen=candidates.find(candidate=>candidate&&has(candidate));
 if(!chosen)throw new Error('Não reconheci o arquivo. Use imagem JPG/PNG/WebP ou vídeo MP4/MOV/WebM. Se veio do WhatsApp, salve o arquivo no aparelho e tente novamente.');
 const normalized=chosen==='jpeg'?'jpg':chosen;
 const contentType=normalized==='jpg'?'image/jpeg':normalized==='png'?'image/png':normalized==='webp'?'image/webp':normalized==='mp4'?'video/mp4':normalized==='mov'?'video/quicktime':'video/webm';
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


/* Envia vídeos maiores por TUS para tolerar oscilações de rede no celular. */
async function uploadOpeningVideoFile(supabase, path, file, contentType, onProgress) {
  if (file.size <= 6 * 1024 * 1024) {
    const { error } = await supabase.storage.from('capital-do-trem-media').upload(path, file, {
      contentType, cacheControl: '3600', upsert: false
    });
    if (error) throw error;
    onProgress?.(100);
    return;
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.access_token) throw new Error('Sua sessão expirou. Entre novamente no painel administrador.');

  let TusUpload;
  try {
    ({ Upload: TusUpload } = await import('https://cdn.jsdelivr.net/npm/tus-js-client@4/+esm'));
  } catch {
    throw new Error('Não foi possível iniciar o envio seguro do vídeo. Atualize o painel e tente novamente.');
  }

  const projectId = new URL(SUPABASE_URL).hostname.split('.')[0];
  await new Promise((resolve, reject) => {
    const upload = new TusUpload(file, {
      endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${session.access_token}` },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: 'capital-do-trem-media',
        objectName: path,
        contentType,
        cacheControl: '3600'
      },
      chunkSize: 6 * 1024 * 1024,
      onError: reject,
      onProgress: (uploaded, total) => onProgress?.(Math.min(99, Math.round(uploaded / total * 100))),
      onSuccess: resolve
    });
    upload.start();
  });
  onProgress?.(100);
}

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
  await uploadOpeningVideoFile(supabase, path, file, format.contentType, options.onProgress);
  const { data: publicData } = supabase.storage.from('capital-do-trem-media').getPublicUrl(path);
  if (!publicData?.publicUrl) throw new Error('O vídeo foi enviado, mas não foi possível gerar o endereço público.');
  const now = new Date().toISOString();
  const { error: saveError } = await supabase.from('site_settings').upsert([
    { setting_key: 'app_opening_video_url', setting_value: publicData.publicUrl, updated_at: now },
    { setting_key: 'app_opening_image_url', setting_value: '', updated_at: now },
    { setting_key: 'app_opening_video_muted', setting_value: 'false', updated_at: now },
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
  const { data: count, error: countError } = await supabase.rpc('get_app_installation_count');
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

export function subscribeUserPresence(onChange) {
  const supabase = initSupabase();
  const channel = supabase.channel('capital-do-trem-user-presence');
  const emit = () => {
    const state = channel.presenceState();
    if (typeof onChange === 'function') onChange(new Set(Object.keys(state || {})));
  };
  channel.on('presence', { event: 'sync' }, emit)
    .on('presence', { event: 'join' }, emit)
    .on('presence', { event: 'leave' }, emit)
    .subscribe(status => { if (status === 'SUBSCRIBED') emit(); });
  return () => { supabase.removeChannel(channel); };
}

export async function subscribePrivateTyping(conversationId, onTyping) {
  const supabase = initSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('Entre na sua conta para usar o chat.');
  const channel = supabase.channel('private-typing-' + conversationId);
  channel.on('broadcast', { event: 'typing' }, message => {
    const payload = message?.payload || {};
    if (payload.user_id && payload.user_id !== user.id && typeof onTyping === 'function') {
      onTyping({ user_id: payload.user_id, typing: payload.typing === true });
    }
  }).subscribe();
  return {
    send: typing => channel.send({ type: 'broadcast', event: 'typing', payload: { user_id: user.id, typing: Boolean(typing) } }),
    unsubscribe: () => supabase.removeChannel(channel)
  };
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
  const presenceChannel = supabase.channel('capital-do-trem-user-presence', { config: { presence: { key: user.id } } });
  presenceChannel.subscribe(async status => {
    if (status === 'SUBSCRIBED' && !stopped) {
      try { await presenceChannel.track({ user_id: user.id, online_at: new Date().toISOString() }); }
      catch (error) { console.warn('Não foi possível publicar presença em tempo real.', error); }
    }
  });
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
    supabase.removeChannel(presenceChannel);
  };
}


// ============================================================
// Stories oficiais da Capital do Trem — somente administradores publicam.
// Cada story expira automaticamente após 24 horas.
// ============================================================
export async function createAdminStory({ file, caption = '', musicSongId = '', musicStartSeconds = 0, musicVolume = 0.8, musicDurationSeconds = 15 }) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user || !(await isCurrentUserAdmin())) throw new Error('Somente o administrador pode publicar Stories.');
  if (!(file instanceof File)) throw new Error('Escolha uma foto ou vídeo para o Story.');
  const format = await getBrandingUploadFormat(file, { jpg: true, jpeg: true, png: true, webp: true, mp4: true, webm: true, mov: true });
  const isVideo = ['mp4', 'webm'].includes(format.extension);
  const maxSize = isVideo ? 20 * 1024 * 1024 : 8 * 1024 * 1024;
  if (file.size < 1 || file.size > maxSize) throw new Error(isVideo ? 'O vídeo deve ter até 20 MB.' : 'A imagem deve ter até 8 MB.');
  const cleanCaption = String(caption || '').trim().slice(0, 280);
  let music = { music_song_id: null, music_url: null, music_title: '', music_artist: '', music_start_seconds: 0, music_volume: 0.8, music_duration_seconds: 15 };
  if (musicSongId) {
    const { data: song, error: songError } = await supabase.from('songs').select('id,title,artist_name,storage_path').eq('id', musicSongId).eq('status', 'published').single();
    if (songError || !song) throw new Error('Essa música não está disponível para uso nos Stories.');
    const { data: signed, error: signedError } = await supabase.storage.from('capital-do-trem-audio').createSignedUrl(song.storage_path, 25 * 60 * 60);
    if (signedError || !signed?.signedUrl) throw new Error('Não foi possível preparar a música para o Story.');
    music = { music_song_id: song.id, music_url: signed.signedUrl, music_title: String(song.title || '').slice(0,120), music_artist: String(song.artist_name || '').slice(0,100), music_start_seconds: Math.max(0, Math.min(3600, Number(musicStartSeconds) || 0)), music_volume: Math.max(0, Math.min(1, Number(musicVolume) || 0)), music_duration_seconds: Math.max(5, Math.min(60, Math.round(Number(musicDurationSeconds) || 15))) };
  }
  const path = user.id + '/stories/story-' + crypto.randomUUID() + '.' + format.extension;
  const { error: uploadError } = await supabase.storage.from('capital-do-trem-media').upload(path, file, {
    contentType: format.contentType, cacheControl: '3600', upsert: false
  });
  if (uploadError) throw uploadError;
  const { data: publicData } = supabase.storage.from('capital-do-trem-media').getPublicUrl(path);
  if (!publicData?.publicUrl) {
    await supabase.storage.from('capital-do-trem-media').remove([path]);
    throw new Error('Não foi possível gerar o endereço público do Story.');
  }
  const { data, error } = await supabase.from('admin_stories').insert({
    created_by: user.id,
    media_path: path,
    media_url: publicData.publicUrl,
    media_type: isVideo ? 'video' : 'image',
    caption: cleanCaption,
    ...music,
    published: true,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }).select('id,media_url,media_type,caption,music_url,music_title,music_artist,music_start_seconds,music_volume,music_duration_seconds,created_at,expires_at,published').single();
  if (error) {
    await supabase.storage.from('capital-do-trem-media').remove([path]);
    throw error;
  }
  return data;
}

export async function getActiveAdminStories() {
  const supabase = initSupabase();
  const { data, error } = await supabase.from('admin_stories')
    .select('id,media_url,media_type,caption,music_url,music_title,music_artist,music_start_seconds,music_volume,music_duration_seconds,created_at,expires_at')
    .eq('published', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getAdminStories() {
  const supabase = initSupabase();
  if (!(await isCurrentUserAdmin())) throw new Error('Acesso administrativo não autorizado.');
  const { data, error } = await supabase.from('admin_stories')
    .select('id,media_url,media_type,caption,music_url,music_title,music_artist,music_start_seconds,music_volume,music_duration_seconds,created_at,expires_at,published')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data || [];
}

export async function deleteAdminStory(id) {
  const supabase = initSupabase();
  if (!(await isCurrentUserAdmin())) throw new Error('Acesso administrativo não autorizado.');
  const { data: story, error: readError } = await supabase.from('admin_stories')
    .select('id,media_path').eq('id', id).single();
  if (readError) throw readError;
  const { error } = await supabase.from('admin_stories').delete().eq('id', id);
  if (error) throw error;
  if (story?.media_path) {
    const { error: storageError } = await supabase.storage.from('capital-do-trem-media').remove([story.media_path]);
    if (storageError) console.warn('Story removido, mas o arquivo de mídia não pôde ser apagado.', storageError);
  }
}

export function subscribeAdminStories(callback) {
  const supabase = initSupabase();
  const channel = supabase.channel('capital-do-trem-admin-stories')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_stories' }, callback)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}


// ============================================================
// Stories pessoais da comunidade — cada conta gerencia os próprios.
// Stories públicos para a comunidade e expiração automática em 24h.
// ============================================================
export async function createMyStory({ file, caption = '', musicSongId = '', musicStartSeconds = 0, musicVolume = 0.8, musicDurationSeconds = 15 }) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para publicar um Story.');
  if (!(file instanceof File)) throw new Error('Escolha uma foto ou vídeo.');
  const format = await getBrandingUploadFormat(file, { jpg: true, jpeg: true, png: true, webp: true, mp4: true, webm: true, mov: true });
  const isVideo = ['mp4', 'webm', 'mov'].includes(format.extension);
  const maxSize = isVideo ? 20 * 1024 * 1024 : 8 * 1024 * 1024;
  if (file.size < 1 || file.size > maxSize) throw new Error(isVideo ? 'O vídeo deve ter até 20 MB.' : 'A imagem deve ter até 8 MB.');
  const profile = await getMyBasicProfile();
  const avatar = await getMyAvatar().catch(() => null);
  const cleanCaption = String(caption || '').trim().slice(0, 280);
  let music = { music_song_id: null, music_url: null, music_title: '', music_artist: '', music_start_seconds: 0, music_volume: 0.8, music_duration_seconds: 15 };
  if (musicSongId) {
    const { data: song, error: songError } = await supabase.from('songs').select('id,title,artist_name,storage_path').eq('id', musicSongId).eq('status', 'published').single();
    if (songError || !song) throw new Error('Essa música não está disponível para uso nos Stories.');
    const { data: signed, error: signedError } = await supabase.storage.from('capital-do-trem-audio').createSignedUrl(song.storage_path, 25 * 60 * 60);
    if (signedError || !signed?.signedUrl) throw new Error('Não foi possível preparar a música para o Story.');
    music = { music_song_id: song.id, music_url: signed.signedUrl, music_title: String(song.title || '').slice(0,120), music_artist: String(song.artist_name || '').slice(0,100), music_start_seconds: Math.max(0, Math.min(3600, Number(musicStartSeconds) || 0)), music_volume: Math.max(0, Math.min(1, Number(musicVolume) || 0)), music_duration_seconds: Math.max(5, Math.min(60, Math.round(Number(musicDurationSeconds) || 15))) };
  }
  const path = user.id + '/stories/' + crypto.randomUUID() + '.' + format.extension;
  const { error: uploadError } = await supabase.storage.from('capital-do-trem-media').upload(path, file, {
    contentType: format.contentType, cacheControl: '3600', upsert: false
  });
  if (uploadError) throw uploadError;
  const { data: publicData } = supabase.storage.from('capital-do-trem-media').getPublicUrl(path);
  const mediaUrl = publicData?.publicUrl;
  if (!mediaUrl) {
    await supabase.storage.from('capital-do-trem-media').remove([path]);
    throw new Error('Não foi possível gerar o endereço público do Story.');
  }
  const { data, error } = await supabase.from('user_stories').insert({
    author_id: user.id,
    display_name: String(profile.display_name || 'Usuário Uai').slice(0, 80),
    username: String(profile.username || '').slice(0, 32),
    avatar_url: avatar?.avatar_url || null,
    media_path: path,
    media_url: mediaUrl,
    media_type: isVideo ? 'video' : 'image',
    caption: cleanCaption,
    ...music,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }).select('id,author_id,display_name,username,avatar_url,media_url,media_type,caption,music_url,music_title,music_artist,music_start_seconds,music_volume,music_duration_seconds,created_at,expires_at').single();
  if (error) {
    await supabase.storage.from('capital-do-trem-media').remove([path]);
    throw error;
  }
  return data;
}

export async function getActiveUserStories() {
  const supabase = initSupabase();
  const { data, error } = await supabase.from('user_stories')
    .select('id,author_id,display_name,username,avatar_url,media_url,media_type,caption,music_url,music_title,music_artist,music_start_seconds,music_volume,music_duration_seconds,created_at,expires_at')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getMyStories() {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para ver seus Stories.');
  const { data, error } = await supabase.from('user_stories')
    .select('id,media_path,media_url,media_type,caption,music_url,music_title,music_artist,music_start_seconds,music_volume,music_duration_seconds,created_at,expires_at')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data || [];
}

export async function deleteMyStory(id) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para excluir um Story.');
  const { data: story, error: readError } = await supabase.from('user_stories')
    .select('id,media_path').eq('id', id).eq('author_id', user.id).single();
  if (readError) throw readError;
  const { error } = await supabase.from('user_stories').delete().eq('id', id).eq('author_id', user.id);
  if (error) throw error;
  if (story?.media_path) {
    const { error: storageError } = await supabase.storage.from('capital-do-trem-media').remove([story.media_path]);
    if (storageError) console.warn('Story removido, mas o arquivo de mídia não pôde ser apagado.', storageError);
  }
}

export function subscribeUserStories(callback) {
  const supabase = initSupabase();
  const channel = supabase.channel('capital-do-trem-user-stories')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_stories' }, callback)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}


async function accountDeletionFunctionError(error, fallback) {
  let message = error?.message || fallback;
  try {
    const response = error?.context;
    if (response && typeof response.clone === 'function') {
      const payload = await response.clone().json();
      if (payload?.error) message = payload.error;
    }
  } catch {}
  return new Error(message);
}

export async function previewMyAccountDeletion() {
  const supabase = initSupabase();
  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: { action: 'preview' }
  });
  if (error) throw await accountDeletionFunctionError(error, 'Não foi possível revisar os dados da conta.');
  if (!data?.ok || data?.canDelete !== true) throw new Error(data?.error || 'Não foi possível revisar os dados da conta.');
  return data;
}

export async function deleteMyAccount(confirmation) {
  const supabase = initSupabase();
  if (String(confirmation || '') !== 'EXCLUIR MINHA CONTA') {
    throw new Error('Digite exatamente EXCLUIR MINHA CONTA para confirmar.');
  }
  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: { action: 'delete', confirmation: String(confirmation) }
  });
  if (error) throw await accountDeletionFunctionError(error, 'Não foi possível excluir a conta.');
  if (!data?.deleted) throw new Error(data?.error || 'O serviço não confirmou a exclusão da conta.');
  await supabase.auth.signOut({ scope: 'local' });
  return data;
}


// Biblioteca musical pessoal sincronizada pela conta entre Android, iOS e web.
export async function getMyMusicLibrary() {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para acessar sua biblioteca.');
  const [saved, recent] = await Promise.all([
    supabase.from('saved_songs').select('song_id,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200),
    supabase.from('song_play_history').select('song_id,last_played_at').eq('user_id', user.id).order('last_played_at', { ascending: false }).limit(30)
  ]);
  if (saved.error) throw saved.error;
  if (recent.error) throw recent.error;
  return {
    savedSongIds: (saved.data || []).map(row => row.song_id),
    recentSongIds: (recent.data || []).map(row => row.song_id)
  };
}

export async function toggleSavedSong(songId) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Entre na sua conta para salvar músicas.');
  const { data: existing, error: lookupError } = await supabase.from('saved_songs')
    .select('song_id').eq('user_id', user.id).eq('song_id', songId).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) {
    const { error } = await supabase.from('saved_songs').delete().eq('user_id', user.id).eq('song_id', songId);
    if (error) throw error;
    return false;
  }
  const { error } = await supabase.from('saved_songs').insert({ user_id: user.id, song_id: songId });
  if (error) throw error;
  return true;
}

export async function recordSongPlay(songId) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return false;
  const { error } = await supabase.from('song_play_history').upsert({
    user_id: user.id,
    song_id: songId,
    last_played_at: new Date().toISOString()
  }, { onConflict: 'user_id,song_id' });
  if (error) throw error;
  return true;
}

// Álbum privado da administração: metadados e mídia só são lidos por administradores.
// Os envios voluntários dos usuários continuam protegidos por consentimento e RLS.
export async function getAdminPrivateGallery() {
  const supabase = initSupabase();
  if (!(await isCurrentUserAdmin())) throw new Error('Somente o administrador pode abrir o álbum privado.');
  const { data, error } = await supabase.from('private_gallery_items')
    .select('id,storage_path,mime_type,file_size,sender_display_name,sender_username,created_at,expires_at')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return await Promise.all((data || []).map(async item => {
    const { data: signed, error: signedError } = await supabase.storage
      .from('capital-do-trem-private-gallery')
      .createSignedUrl(item.storage_path, 15 * 60);
    if (signedError) throw signedError;
    return { ...item, signed_url: signed.signedUrl };
  }));
}

export async function uploadAdminPrivateGalleryItem(file) {
  const supabase = initSupabase();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user || !(await isCurrentUserAdmin())) throw new Error('Somente o administrador pode adicionar arquivos ao álbum.');
  if (!(file instanceof File)) throw new Error('Selecione uma foto ou vídeo.');
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm' };
  const extension = extensions[file.type];
  if (!extension) throw new Error('Use JPG, PNG, WebP, MP4 ou WebM.');
  if (file.size < 1 || file.size > 20 * 1024 * 1024) throw new Error('O arquivo deve ter até 20 MB.');
  const path = user.id + '/admin/' + crypto.randomUUID() + '.' + extension;
  const bucket = supabase.storage.from('capital-do-trem-private-gallery');
  const { error: uploadError } = await bucket.upload(path, file, {
    contentType: file.type, cacheControl: '3600', upsert: false
  });
  if (uploadError) throw uploadError;
  const { error: insertError } = await supabase.from('private_gallery_items').insert({
    user_id: user.id,
    storage_path: path,
    mime_type: file.type,
    file_size: file.size,
    consent_confirmed: true
  });
  if (insertError) {
    await bucket.remove([path]);
    throw insertError;
  }
  return true;
}

export async function deleteAdminPrivateGalleryItem(id) {
  const supabase = initSupabase();
  if (!(await isCurrentUserAdmin())) throw new Error('Somente o administrador pode remover arquivos do álbum.');
  const { data: item, error: readError } = await supabase.from('private_gallery_items')
    .select('id,storage_path').eq('id', id).single();
  if (readError) throw readError;
  const { error: storageError } = await supabase.storage
    .from('capital-do-trem-private-gallery').remove([item.storage_path]);
  if (storageError) throw storageError;
  const { error: deleteError } = await supabase.from('private_gallery_items').delete().eq('id', id);
  if (deleteError) throw deleteError;
  return true;
}



// Interações sociais das divulgações públicas.
export async function getPostSocial(postId) {
 const supabase=initSupabase();
 const [likes,comments]=await Promise.all([
  supabase.from('post_likes').select('user_id',{count:'exact',head:true}).eq('post_id',postId),
  supabase.from('post_comments').select('id,post_id,author_id,author_name,content,created_at').eq('post_id',postId).order('created_at',{ascending:true}).limit(100)
 ]);
 if(likes.error)throw likes.error;if(comments.error)throw comments.error;
 const {data:{user}}=await supabase.auth.getUser();let liked=false;
 if(user){const {data,error}=await supabase.from('post_likes').select('post_id').eq('post_id',postId).eq('user_id',user.id).maybeSingle();if(error)throw error;liked=!!data;}
 return {likeCount:likes.count||0,liked,comments:comments.data||[]};
}
export async function togglePostLike(postId) {
 const supabase=initSupabase();const {data:{user},error:userError}=await supabase.auth.getUser();if(userError)throw userError;if(!user)throw new Error('Entre na sua conta para curtir uma publicação.');
 const {data:existing,error:lookupError}=await supabase.from('post_likes').select('post_id').eq('post_id',postId).eq('user_id',user.id).maybeSingle();if(lookupError)throw lookupError;
 if(existing){const {error}=await supabase.from('post_likes').delete().eq('post_id',postId).eq('user_id',user.id);if(error)throw error;return false;}
 const {error}=await supabase.from('post_likes').insert({post_id:postId,user_id:user.id});if(error)throw error;return true;
}
export async function addPostComment(postId,content) {
 const supabase=initSupabase();const {data:{user},error:userError}=await supabase.auth.getUser();if(userError)throw userError;if(!user)throw new Error('Entre na sua conta para comentar.');
 const clean=String(content||'').trim();if(!clean||clean.length>1000)throw new Error('O comentário deve ter entre 1 e 1.000 caracteres.');
 const {data,error}=await supabase.from('post_comments').insert({post_id:postId,author_id:user.id,content:clean}).select('id,post_id,author_id,author_name,content,created_at').single();if(error)throw error;return data;
}

// Publicações salvas: coleção particular sincronizada pela conta.
export async function getMySavedPosts() {
 const supabase=initSupabase();const {data:{user},error:userError}=await supabase.auth.getUser();if(userError)throw userError;if(!user)throw new Error('Entre na sua conta para ver seus itens salvos.');
 const {data:saved,error:savedError}=await supabase.from('saved_posts').select('post_id,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(200);if(savedError)throw savedError;
 const ids=(saved||[]).map(row=>row.post_id);if(!ids.length)return [];
 const {data:posts,error:postsError}=await supabase.from('posts').select('id,content,created_at').in('id',ids).eq('status','published');if(postsError)throw postsError;
 const byId=new Map((posts||[]).map(post=>[post.id,post]));return ids.map(id=>byId.get(id)).filter(Boolean);
}
export async function toggleSavedPost(postId) {
 const supabase=initSupabase();const {data:{user},error:userError}=await supabase.auth.getUser();if(userError)throw userError;if(!user)throw new Error('Entre na sua conta para salvar publicações.');if(!postId)throw new Error('Publicação inválida.');
 const {data:existing,error:lookupError}=await supabase.from('saved_posts').select('post_id').eq('user_id',user.id).eq('post_id',postId).maybeSingle();if(lookupError)throw lookupError;
 if(existing){const {error}=await supabase.from('saved_posts').delete().eq('user_id',user.id).eq('post_id',postId);if(error)throw error;return false;}
 const {error}=await supabase.from('saved_posts').insert({user_id:user.id,post_id:postId});if(error)throw error;return true;
}


// Playlists pessoais: o banco e as políticas RLS garantem propriedade por usuário.
export async function getMyPlaylists() {
 const supabase=initSupabase(); const {data:{user},error:userError}=await supabase.auth.getUser();
 if(userError)throw userError; if(!user)throw new Error('Entre na sua conta para acessar suas playlists.');
 const {data:playlists,error}=await supabase.from('playlists').select('id,name,created_at,updated_at').eq('user_id',user.id).order('updated_at',{ascending:false}).limit(100);
 if(error)throw error; const ids=(playlists||[]).map(x=>x.id); if(!ids.length)return [];
 const {data:entries,error:entriesError}=await supabase.from('playlist_songs').select('playlist_id,song_id,position,added_at').in('playlist_id',ids).order('position',{ascending:true}).order('added_at',{ascending:true});
 if(entriesError)throw entriesError; const grouped=new Map();
 for(const row of entries||[]){const list=grouped.get(row.playlist_id)||[];list.push(row);grouped.set(row.playlist_id,list);}
 return (playlists||[]).map(x=>({...x,songs:grouped.get(x.id)||[]}));
}
export async function createMyPlaylist(name) {
 const supabase=initSupabase();const {data:{user},error:userError}=await supabase.auth.getUser();
 if(userError)throw userError;if(!user)throw new Error('Entre na sua conta para criar uma playlist.');
 const clean=String(name||'').trim();if(!clean||clean.length>60)throw new Error('O nome deve ter entre 1 e 60 caracteres.');
 const {data,error}=await supabase.from('playlists').insert({user_id:user.id,name:clean}).select('id,name,created_at,updated_at').single();
 if(error){if(error.code==='23505')throw new Error('Você já tem uma playlist com esse nome.');throw error;}return data;
}
export async function renameMyPlaylist(playlistId,name) {
 const supabase=initSupabase();const {data:{user},error:userError}=await supabase.auth.getUser();
 if(userError)throw userError;if(!user)throw new Error('Entre na sua conta para editar playlists.');
 const clean=String(name||'').trim();if(!clean||clean.length>60)throw new Error('O nome deve ter entre 1 e 60 caracteres.');
 const {data,error}=await supabase.from('playlists').update({name:clean,updated_at:new Date().toISOString()}).eq('id',playlistId).eq('user_id',user.id).select('id,name,created_at,updated_at').single();
 if(error)throw error;return data;
}
export async function deleteMyPlaylist(playlistId) {
 const supabase=initSupabase();const {data:{user},error:userError}=await supabase.auth.getUser();
 if(userError)throw userError;if(!user)throw new Error('Entre na sua conta para excluir playlists.');
 const {error}=await supabase.from('playlists').delete().eq('id',playlistId).eq('user_id',user.id);if(error)throw error;
}
export async function addSongToMyPlaylist(playlistId,songId) {
 const supabase=initSupabase();const {data:{user},error:userError}=await supabase.auth.getUser();
 if(userError)throw userError;if(!user)throw new Error('Entre na sua conta para montar playlists.');
 const {data:playlist,error:playlistError}=await supabase.from('playlists').select('id').eq('id',playlistId).eq('user_id',user.id).maybeSingle();
 if(playlistError)throw playlistError;if(!playlist)throw new Error('Playlist não encontrada.');
 const {data:existing,error:existingError}=await supabase.from('playlist_songs').select('song_id').eq('playlist_id',playlistId).eq('song_id',songId).maybeSingle();
 if(existingError)throw existingError;if(existing)return false;
 const {data:last,error:lastError}=await supabase.from('playlist_songs').select('position').eq('playlist_id',playlistId).order('position',{ascending:false}).limit(1).maybeSingle();
 if(lastError)throw lastError;
 const {error}=await supabase.from('playlist_songs').insert({playlist_id:playlistId,song_id:songId,position:(last?.position??-1)+1});if(error)throw error;
 const {error:touchError}=await supabase.from('playlists').update({updated_at:new Date().toISOString()}).eq('id',playlistId).eq('user_id',user.id);if(touchError)throw touchError;return true;
}
export async function removeSongFromMyPlaylist(playlistId,songId) {
 const supabase=initSupabase();const {data:{user},error:userError}=await supabase.auth.getUser();
 if(userError)throw userError;if(!user)throw new Error('Entre na sua conta para editar playlists.');
 const {data:playlist,error:playlistError}=await supabase.from('playlists').select('id').eq('id',playlistId).eq('user_id',user.id).maybeSingle();
 if(playlistError)throw playlistError;if(!playlist)throw new Error('Playlist não encontrada.');
 const {error}=await supabase.from('playlist_songs').delete().eq('playlist_id',playlistId).eq('song_id',songId);if(error)throw error;
}
export async function moveSongInMyPlaylist(playlistId,songId,direction) {
 const supabase=initSupabase();const {data:{user},error:userError}=await supabase.auth.getUser();
 if(userError)throw userError;if(!user)throw new Error('Entre na sua conta para organizar playlists.');
 const {data:playlist,error:playlistError}=await supabase.from('playlists').select('id').eq('id',playlistId).eq('user_id',user.id).maybeSingle();
 if(playlistError)throw playlistError;if(!playlist)throw new Error('Playlist não encontrada.');
 const {data:rows,error}=await supabase.from('playlist_songs').select('song_id,position').eq('playlist_id',playlistId).order('position',{ascending:true}).order('added_at',{ascending:true});
 if(error)throw error;const ordered=rows||[],index=ordered.findIndex(x=>x.song_id===songId),target=index+(direction<0?-1:1);
 if(index<0||target<0||target>=ordered.length)return false;
 const left=ordered[index],right=ordered[target],temporary=(ordered.reduce((max,row)=>Math.max(max,row.position),-1))+1;
 const {error:first}=await supabase.from('playlist_songs').update({position:temporary}).eq('playlist_id',playlistId).eq('song_id',left.song_id);if(first)throw first;
 const {error:second}=await supabase.from('playlist_songs').update({position:left.position}).eq('playlist_id',playlistId).eq('song_id',right.song_id);if(second)throw second;
 const {error:third}=await supabase.from('playlist_songs').update({position:right.position}).eq('playlist_id',playlistId).eq('song_id',left.song_id);if(third)throw third;
 return true;
}

// Capas pessoais em tabela isolada, protegida por RLS: cada usuário acessa apenas as próprias preferências.
const PERSONAL_AREA_COVERS = {
 home: { url: 'home_cover_url', path: 'home_cover_path' },
 music: { url: 'music_cover_url', path: 'music_cover_path' }
};

export async function getMyAreaCovers() {
 const supabase=initSupabase();
 const {data:{user},error:userError}=await supabase.auth.getUser();
 if(userError)throw userError;
 if(!user)throw new Error('Entre na sua conta para acessar suas capas.');
 const {data,error}=await supabase.from('user_area_covers')
  .select('home_cover_url,home_cover_path,music_cover_url,music_cover_path')
  .eq('user_id',user.id).maybeSingle();
 if(error)throw error;
 return data||{home_cover_url:null,music_cover_url:null};
}

export async function saveMyAreaCover(kind, file) {
 const config=PERSONAL_AREA_COVERS[kind];
 if(!config)throw new Error('Área de capa inválida.');
 const supabase=initSupabase();
 const {data:{user},error:userError}=await supabase.auth.getUser();
 if(userError)throw userError;
 if(!user)throw new Error('Entre na sua conta para personalizar a capa.');
 if(!(file instanceof File))throw new Error('Selecione uma imagem.');
 const allowed={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
 if(!allowed[file.type])throw new Error('Use uma imagem JPG, PNG ou WebP.');
 if(file.size<1||file.size>8*1024*1024)throw new Error('A imagem deve ter até 8 MB.');
 const path=user.id+'/cover/'+kind+'-'+crypto.randomUUID()+'.'+allowed[file.type];
 const {error:uploadError}=await supabase.storage.from('capital-do-trem-media').upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});
 if(uploadError)throw uploadError;
 const {data:publicData}=supabase.storage.from('capital-do-trem-media').getPublicUrl(path);
 if(!publicData?.publicUrl){await supabase.storage.from('capital-do-trem-media').remove([path]).catch(()=>{});throw new Error('Não foi possível obter a imagem enviada.');}
 const {data:previous,error:readError}=await supabase.from('user_area_covers').select(config.path).eq('user_id',user.id).maybeSingle();
 if(readError){await supabase.storage.from('capital-do-trem-media').remove([path]).catch(()=>{});throw readError;}
 const payload={user_id:user.id,[config.url]:publicData.publicUrl,[config.path]:path,updated_at:new Date().toISOString()};
 const write=previous
  ? await supabase.from('user_area_covers').update(payload).eq('user_id',user.id)
  : await supabase.from('user_area_covers').insert(payload);
 if(write.error){await supabase.storage.from('capital-do-trem-media').remove([path]).catch(()=>{});throw write.error;}
 const oldPath=previous?.[config.path];
 if(oldPath&&oldPath!==path&&oldPath.startsWith(user.id+'/cover/'))await supabase.storage.from('capital-do-trem-media').remove([oldPath]).catch(()=>{});
 return {[config.url]:publicData.publicUrl,[config.path]:path};
}

export async function resetMyAreaCover(kind) {
 const config=PERSONAL_AREA_COVERS[kind];
 if(!config)throw new Error('Área de capa inválida.');
 const supabase=initSupabase();
 const {data:{user},error:userError}=await supabase.auth.getUser();
 if(userError)throw userError;
 if(!user)throw new Error('Entre na sua conta para restaurar a capa.');
 const {data:previous,error:readError}=await supabase.from('user_area_covers').select(config.path).eq('user_id',user.id).maybeSingle();
 if(readError)throw readError;
 if(previous){
  const {error}=await supabase.from('user_area_covers').update({[config.url]:null,[config.path]:null,updated_at:new Date().toISOString()}).eq('user_id',user.id);
  if(error)throw error;
 }
 const oldPath=previous?.[config.path];
 if(oldPath&&oldPath.startsWith(user.id+'/cover/'))await supabase.storage.from('capital-do-trem-media').remove([oldPath]).catch(()=>{});
 return true;
}

export async function uploadMyCover(file) {
 const supabase=initSupabase();const {data:{user},error:userError}=await supabase.auth.getUser();
 if(userError)throw userError;if(!user)throw new Error('Entre na sua conta para enviar a capa.');
 if(!(file instanceof File))throw new Error('Selecione uma imagem para a capa.');
 const allowed={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
 if(!allowed[file.type])throw new Error('Use uma capa JPG, PNG ou WebP.');
 if(file.size<1||file.size>8*1024*1024)throw new Error('A capa deve ter até 8 MB.');
 const path=user.id+'/cover/'+crypto.randomUUID()+'.'+allowed[file.type];
 const {error}=await supabase.storage.from('capital-do-trem-media').upload(path,file,{contentType:file.type,cacheControl:'3600',upsert:false});
 if(error)throw error;
 const {data:publicData}=supabase.storage.from('capital-do-trem-media').getPublicUrl(path);
 if(!publicData?.publicUrl){await supabase.storage.from('capital-do-trem-media').remove([path]).catch(()=>{});throw new Error('Não foi possível obter o endereço da capa.');}
 const {data:previous,error:readError}=await supabase.from('profiles').select('cover_path').eq('user_id',user.id).single();
 if(readError){await supabase.storage.from('capital-do-trem-media').remove([path]).catch(()=>{});throw readError;}
 const {data:saved,error:saveError}=await supabase.from('profiles').update({cover_url:publicData.publicUrl,cover_path:path}).eq('user_id',user.id).select('cover_url,cover_path').single();
 if(saveError){await supabase.storage.from('capital-do-trem-media').remove([path]).catch(()=>{});throw saveError;}
 if(previous?.cover_path&&previous.cover_path!==path&&previous.cover_path.startsWith(user.id+'/cover/'))await supabase.storage.from('capital-do-trem-media').remove([previous.cover_path]);
 return saved;
}

// Controle de conteúdo do próprio usuário: as políticas RLS do banco são a autoridade final.
async function requireCurrentUserForContent() {
  const supabase = initSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('Entre na sua conta para gerenciar seu conteúdo.');
  return { supabase, user };
}

export async function updateMyPost(postId, content) {
  const { supabase, user } = await requireCurrentUserForContent();
  const clean = String(content || '').trim();
  if (!postId || !clean || clean.length > 1500) throw new Error('Revise o texto da publicação (máximo de 1.500 caracteres).');
  const { data, error } = await supabase.from('posts').update({ content: clean })
    .eq('id', postId).eq('author_id', user.id)
    .select('id,content,created_at').single();
  if (error) throw error;
  return data;
}

export async function deleteMyPost(postId) {
  const { supabase, user } = await requireCurrentUserForContent();
  const { data: media, error: mediaError } = await supabase.from('post_media')
    .select('bucket_id,storage_path').eq('post_id', postId).eq('owner_id', user.id);
  if (mediaError) throw mediaError;
  for (const bucket of [...new Set((media || []).map(item => item.bucket_id))]) {
    const paths = (media || []).filter(item => item.bucket_id === bucket).map(item => item.storage_path);
    if (paths.length) {
      const { error } = await supabase.storage.from(bucket).remove(paths);
      if (error) throw error;
    }
  }
  const { error } = await supabase.from('posts').delete().eq('id', postId).eq('author_id', user.id);
  if (error) throw error;
  return true;
}

export async function updateMyPostComment(commentId, content) {
  const { supabase, user } = await requireCurrentUserForContent();
  const clean = String(content || '').trim();
  if (!clean || clean.length > 1000) throw new Error('O comentário deve ter entre 1 e 1.000 caracteres.');
  const { data, error } = await supabase.from('post_comments').update({ content: clean })
    .eq('id', commentId).eq('author_id', user.id)
    .select('id,content,created_at').single();
  if (error) throw error;
  return data;
}

export async function deleteMyPostComment(commentId) {
  const { supabase, user } = await requireCurrentUserForContent();
  const { error } = await supabase.from('post_comments').delete().eq('id', commentId).eq('author_id', user.id);
  if (error) throw error;
  return true;
}

export async function updateMySong(songId, { title, artistName, producerName = '', description = '' }) {
  const { supabase, user } = await requireCurrentUserForContent();
  const cleanTitle = String(title || '').trim();
  const cleanArtist = String(artistName || '').trim();
  const cleanProducer = String(producerName || '').trim();
  const cleanDescription = String(description || '').trim();
  if (!cleanTitle || cleanTitle.length > 120) throw new Error(`O nome da música deve ter entre 1 e 120 caracteres. Você digitou ${cleanTitle.length}.`);
  if (!cleanArtist || cleanArtist.length > 100) throw new Error('O nome do artista deve ter entre 1 e 100 caracteres.');
  if (cleanProducer.length > 100 || cleanDescription.length > 1000) throw new Error('Confira os campos opcionais antes de salvar.');
  const { data, error } = await supabase.from('songs').update({
    title: cleanTitle, artist_name: cleanArtist, producer_name: cleanProducer, description: cleanDescription
  }).eq('id', songId).eq('user_id', user.id)
    .select('id,title,artist_name,producer_name,description,status').single();
  if (error) throw error;
  return data;
}

export async function deleteMySong(songId) {
  const { supabase, user } = await requireCurrentUserForContent();
  const { data: song, error: readError } = await supabase.from('songs')
    .select('id,storage_path').eq('id', songId).eq('user_id', user.id).single();
  if (readError) throw readError;
  if (song.storage_path) {
    const { error } = await supabase.storage.from('capital-do-trem-audio').remove([song.storage_path]);
    if (error) throw error;
  }
  const { error } = await supabase.from('songs').delete().eq('id', songId).eq('user_id', user.id);
  if (error) throw error;
  return true;
}

export async function updateMyGroupMessage(messageId, content) {
  const { supabase, user } = await requireCurrentUserForContent();
  const clean = String(content || '').trim();
  if (!clean || clean.length > 1000) throw new Error('A mensagem deve ter entre 1 e 1.000 caracteres.');
  const { data, error } = await supabase.from('chat_messages').update({ content: clean })
    .eq('id', messageId).eq('author_id', user.id)
    .select('id,content,created_at,edited_at').single();
  if (error) throw error;
  return data;
}

export async function deleteMyGroupMessage(messageId) {
  const { supabase, user } = await requireCurrentUserForContent();
  const { data: message, error: readError } = await supabase.from('chat_messages')
    .select('attachment_path').eq('id', messageId).eq('author_id', user.id).single();
  if (readError) throw readError;
  if (message.attachment_path) {
    const { error: storageError } = await supabase.storage.from('capital-do-trem-chat').remove([message.attachment_path]);
    if (storageError) throw storageError;
  }
  const { error } = await supabase.from('chat_messages').delete().eq('id', messageId).eq('author_id', user.id);
  if (error) throw error;
  return true;
}

export async function updateMyPrivateMessage(messageId, content) {
  const { supabase, user } = await requireCurrentUserForContent();
  const clean = String(content || '').trim();
  if (!clean || clean.length > 2000) throw new Error('A mensagem deve ter entre 1 e 2.000 caracteres.');
  const { data, error } = await supabase.from('private_messages').update({ content: clean })
    .eq('id', messageId).eq('sender_id', user.id)
    .select('id,content,created_at,edited_at').single();
  if (error) throw error;
  return data;
}

export async function deleteMyPrivateMessage(messageId) {
  const { supabase, user } = await requireCurrentUserForContent();
  const { data: message, error: readError } = await supabase.from('private_messages')
    .select('attachment_path').eq('id', messageId).eq('sender_id', user.id).single();
  if (readError) throw readError;
  if (message.attachment_path) {
    const { error: storageError } = await supabase.storage.from('capital-do-trem-chat').remove([message.attachment_path]);
    if (storageError) throw storageError;
  }
  const { error } = await supabase.from('private_messages').delete().eq('id', messageId).eq('sender_id', user.id);
  if (error) throw error;
  return true;
}