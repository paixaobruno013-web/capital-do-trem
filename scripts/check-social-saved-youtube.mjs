import { readFile } from 'node:fs/promises';
const [profile, auth, messages] = await Promise.all([
  readFile(new URL('../rede.html', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/auth.js', import.meta.url), 'utf8'),
  readFile(new URL('../mensagens.html', import.meta.url), 'utf8'),
]);
const checks = [
  [auth.includes('export async function getMySavedPosts') && auth.includes('export async function toggleSavedPost'), 'API de publicações salvas ausente'],
  [profile.includes('id="saved-publications-list"') && profile.includes('module.toggleSavedPost(item.id)'), 'Coleção pessoal de publicações não está ligada ao banco'],
  [profile.includes('id="saved-publications-login"'), 'Orientação de login da coleção ausente'],
  [messages.includes('Direct + teclado móvel compacto') && messages.includes('#private-emoji-toggle'), 'Aprimoramento visual do Direct/teclado ausente'],
];
for (const [ok, message] of checks) { console.log((ok ? 'OK  ' : 'ERRO ') + message); if (!ok) process.exitCode = 1; }
if (!process.exitCode) console.log('Coleção de publicações e Direct: verificações aprovadas.');
