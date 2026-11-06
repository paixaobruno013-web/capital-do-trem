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
