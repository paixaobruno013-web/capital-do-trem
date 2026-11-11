create table if not exists public.saved_songs (
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, song_id)
);
create table if not exists public.song_play_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  last_played_at timestamptz not null default now(),
  primary key (user_id, song_id)
);
create index if not exists saved_songs_song_id_idx on public.saved_songs(song_id);
create index if not exists song_play_history_recent_idx on public.song_play_history(user_id,last_played_at desc);
create index if not exists song_play_history_song_id_idx on public.song_play_history(song_id);
alter table public.saved_songs enable row level security;
alter table public.song_play_history enable row level security;
revoke all privileges on public.saved_songs, public.song_play_history from anon, authenticated;
grant select, insert, delete on public.saved_songs to authenticated;
grant select, insert, update, delete on public.song_play_history to authenticated;
create policy saved_songs_select_own on public.saved_songs for select to authenticated using ((select auth.uid()) = user_id);
create policy saved_songs_insert_own on public.saved_songs for insert to authenticated with check ((select auth.uid()) = user_id);
create policy saved_songs_delete_own on public.saved_songs for delete to authenticated using ((select auth.uid()) = user_id);
create policy song_play_history_select_own on public.song_play_history for select to authenticated using ((select auth.uid()) = user_id);
create policy song_play_history_insert_own on public.song_play_history for insert to authenticated with check ((select auth.uid()) = user_id);
create policy song_play_history_update_own on public.song_play_history for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy song_play_history_delete_own on public.song_play_history for delete to authenticated using ((select auth.uid()) = user_id);
