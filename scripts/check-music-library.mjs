import { readFile } from 'node:fs/promises';
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const auth = await readFile(new URL('../supabase/auth.js', import.meta.url), 'utf8');
const sql = await readFile(new URL('../supabase/migrations/20261111024251_add_personal_music_library.sql', import.meta.url), 'utf8');
const checks = [
  [index.includes('id="music-library"'), 'Painel da biblioteca musical ausente.'],
  [index.includes('id="saved-songs-list"') && index.includes('id="recent-songs-list"'), 'Listas de salvas e recentes ausentes.'],
  [index.includes("toggleSavedSong(song.id)"), 'Botão de salvar música não está ligado ao banco.'],
  [index.includes("api.recordSongPlay(song.id)"), 'Reprodução não registra histórico.'],
  [auth.includes('export async function getMyMusicLibrary') && auth.includes('export async function toggleSavedSong') && auth.includes('export async function recordSongPlay'), 'Funções da biblioteca ausentes.'],
  [sql.includes('enable row level security') && sql.includes('saved_songs_select_own') && sql.includes('song_play_history_select_own'), 'Migração sem RLS e políticas de propriedade.']
];
for (const [ok, message] of checks) if (!ok) throw new Error(message);
console.log('Biblioteca musical: painel, salvar, histórico sincronizado e políticas RLS conferidos.');
