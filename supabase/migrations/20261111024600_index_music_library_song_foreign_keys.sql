create index if not exists saved_songs_song_id_idx on public.saved_songs(song_id);
create index if not exists song_play_history_song_id_idx on public.song_play_history(song_id);
