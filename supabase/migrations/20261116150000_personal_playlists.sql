-- Playlists pessoais do Capital do Trem. Cada conta administra somente suas próprias listas.
create table if not exists public.playlists (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(btrim(name)) between 1 and 60),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists playlists_owner_name_unique on public.playlists(user_id, lower(name));
create index if not exists playlists_owner_updated_idx on public.playlists(user_id, updated_at desc);
create table if not exists public.playlist_songs (
 playlist_id uuid not null references public.playlists(id) on delete cascade,
 song_id uuid not null references public.songs(id) on delete cascade,
 position integer not null default 0 check (position >= 0),
 added_at timestamptz not null default now(),
 primary key (playlist_id, song_id)
);
create index if not exists playlist_songs_order_idx on public.playlist_songs(playlist_id, position, added_at);
alter table public.playlists enable row level security;
alter table public.playlist_songs enable row level security;
revoke all privileges on public.playlists, public.playlist_songs from anon, authenticated;
grant select, insert, update, delete on public.playlists to authenticated;
grant select, insert, update, delete on public.playlist_songs to authenticated;
drop policy if exists playlists_select_owner on public.playlists;
create policy playlists_select_owner on public.playlists for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists playlists_insert_owner on public.playlists;
create policy playlists_insert_owner on public.playlists for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists playlists_update_owner on public.playlists;
create policy playlists_update_owner on public.playlists for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists playlists_delete_owner on public.playlists;
create policy playlists_delete_owner on public.playlists for delete to authenticated using ((select auth.uid()) = user_id);
drop policy if exists playlist_songs_select_owner on public.playlist_songs;
create policy playlist_songs_select_owner on public.playlist_songs for select to authenticated using (exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = (select auth.uid())));
drop policy if exists playlist_songs_insert_owner_published_song on public.playlist_songs;
create policy playlist_songs_insert_owner_published_song on public.playlist_songs for insert to authenticated with check (
 exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = (select auth.uid()))
 and exists (select 1 from public.songs s where s.id = song_id and s.status = 'published')
);
drop policy if exists playlist_songs_update_owner on public.playlist_songs;
create policy playlist_songs_update_owner on public.playlist_songs for update to authenticated using (
 exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = (select auth.uid()))
) with check (
 exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = (select auth.uid()))
 and exists (select 1 from public.songs s where s.id = song_id and s.status = 'published')
);
drop policy if exists playlist_songs_delete_owner on public.playlist_songs;
create policy playlist_songs_delete_owner on public.playlist_songs for delete to authenticated using (exists (select 1 from public.playlists p where p.id = playlist_id and p.user_id = (select auth.uid())));
