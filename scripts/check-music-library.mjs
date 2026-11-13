import { readFile } from 'node:fs/promises';
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const auth = await readFile(new URL('../supabase/auth.js', import.meta.url), 'utf8');
const sql = await readFile(new URL('../supabase/migrations/20261111024251_add_personal_music_library.sql', import.meta.url), 'utf8');
const indexHtml = index;
const offlinePolicy = await readFile(new URL('../supabase/migrations/20261113080000_post_publication_song_restrictions.sql', import.meta.url), 'utf8');
const checks = [
  [index.includes('id="music-library"'), 'Painel da biblioteca musical ausente.'],
  [indexHtml.includes('id="offline-music-list"') && indexHtml.includes('getAllOfflineMusic') && indexHtml.includes("objectStore('tracks').getAll()"), 'Playlist local não lista arquivos salvos sem depender do catálogo remoto.'],
  [indexHtml.includes('id="offline-music-player"') && indexHtml.includes('URL.createObjectURL(track.blob)'), 'Playlist local não possui player independente para áudio salvo.'],
  [offlinePolicy.includes("status = 'published'") && offlinePolicy.includes("or user_id = (select auth.uid())") && offlinePolicy.includes("or (select private.is_admin())") && offlinePolicy.includes("s.status = 'published'"), 'Faixas privadas não estão isoladas do catálogo público ou o proprietário perdeu acesso.'],
  [index.includes('id="saved-songs-list"') && index.includes('id="recent-songs-list"'), 'Listas de salvas e recentes ausentes.'],
  [index.includes("toggleSavedSong(song.id)"), 'Botão de salvar música não está ligado ao banco.'],
  [index.includes("api.recordSongPlay(song.id)"), 'Reprodução não registra histórico.'],
  [auth.includes('export async function getMyMusicLibrary') && auth.includes('export async function toggleSavedSong') && auth.includes('export async function recordSongPlay'), 'Funções da biblioteca ausentes.'],
  [sql.includes('enable row level security') && sql.includes('saved_songs_select_own') && sql.includes('song_play_history_select_own'), 'Migração sem RLS e políticas de propriedade.']
];
for (const [ok, message] of checks) if (!ok) throw new Error(message);
console.log('Biblioteca musical: painel, salvar, histórico sincronizado e políticas RLS conferidos.');
