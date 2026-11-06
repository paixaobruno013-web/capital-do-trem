// Capital do Trem — cliente de autenticação Supabase
// Este módulo só deve ser importado pela interface depois de configurar os dados públicos.
// Nunca inserir a chave service_role neste arquivo.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'COLE_AQUI_A_URL_DO_PROJETO';
const SUPABASE_PUBLISHABLE_KEY = 'COLE_AQUI_A_CHAVE_PUBLICA';

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

export async function registerAccount({ email, password, displayName }) {
  const supabase = initSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { name: String(displayName || '').trim().slice(0, 80) },
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
  const payload = {
    user_id: user.id,
    artist_name: String(profile.artist_name || '').trim(),
    style: String(profile.style || '').trim(),
    city: String(profile.city || '').trim(),
    instagram: String(profile.instagram || '').trim(),
    youtube: String(profile.youtube || '').trim(),
    bio: String(profile.bio || '').trim(),
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
  const [artists, events, posts] = await Promise.all([
    supabase.from('artists').select('id, artist_name, style, city, bio, status, created_at').eq('status','pending').order('created_at',{ascending:true}),
    supabase.from('events').select('id, title, event_date, event_time, address, category, description, status, created_at').eq('status','pending').order('created_at',{ascending:true}),
    supabase.from('posts').select('id, content, status, created_at').eq('status','pending').order('created_at',{ascending:true})
  ]);
  for (const result of [artists,events,posts]) if (result.error) throw result.error;
  return {
    artists: (artists.data||[]).map(item=>({id:item.id,title:item.artist_name,detail:[item.style,item.city,item.bio].filter(Boolean).join(' • ')})),
    events: (events.data||[]).map(item=>({id:item.id,title:item.title,detail:[item.category,item.event_date,item.event_time,item.address,item.description].filter(Boolean).join(' • ')})),
    posts: (posts.data||[]).map(item=>({id:item.id,title:'Divulgação da comunidade',detail:item.content}))
  };
}

export async function moderateItem(table, id, status) {
  const allowedTables = ['artists','events','posts'];
  if (!allowedTables.includes(table)) throw new Error('Tipo de publicação inválido.');
  if (!['published','rejected'].includes(status)) throw new Error('Ação de moderação inválida.');
  const supabase = initSupabase();
  if (!(await isCurrentUserAdmin())) throw new Error('Acesso administrativo não autorizado.');
  const { error } = await supabase.from(table).update({status}).eq('id',id);
  if (error) throw error;
}

// Agenda pública: o RLS permite leitura somente de eventos aprovados para visitantes.
export async function getPublishedEvents() {
  const supabase = initSupabase();
  const { data, error } = await supabase
    .from('events')
    .select('id, title, event_date, event_time, address, description, contact, poster_url')
    .eq('status', 'published')
    .gte('event_date', new Date().toISOString().slice(0, 10))
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true })
    .limit(50);
  if (error) throw error;
  return data || [];
}
