-- Trilha musical opcional associada a uma publicação com foto.
-- A faixa continua no catálogo original; apenas guardamos a referência e o trecho.
create table if not exists public.post_music (
  post_id uuid primary key references public.posts(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  start_seconds numeric(8,2) not null default 0 check (start_seconds between 0 and 3600),
  duration_seconds smallint not null default 15 check (duration_seconds between 5 and 60),
  volume numeric(3,2) not null default 0.80 check (volume >= 0 and volume <= 1),
  created_at timestamptz not null default now()
);

create index if not exists post_music_song_id_idx on public.post_music(song_id);
alter table public.post_music enable row level security;
grant select on public.post_music to anon, authenticated;
grant insert, update, delete on public.post_music to authenticated;

drop policy if exists post_music_read_published on public.post_music;
create policy post_music_read_published on public.post_music
for select to anon, authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_id and p.status = 'published'
  )
);

drop policy if exists post_music_insert_owner_photo_and_published_song on public.post_music;
create policy post_music_insert_owner_photo_and_published_song on public.post_music
for insert to authenticated
with check (
  exists (
    select 1 from public.posts p
    where p.id = post_id and p.author_id = (select auth.uid()) and p.status = 'published'
  )
  and exists (
    select 1 from public.post_media m
    where m.post_id = post_id and m.owner_id = (select auth.uid()) and m.media_type = 'image'
  )
  and exists (
    select 1 from public.songs s
    where s.id = song_id and s.status = 'published'
  )
);

drop policy if exists post_music_update_owner_photo_and_published_song on public.post_music;
create policy post_music_update_owner_photo_and_published_song on public.post_music
for update to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_id and p.author_id = (select auth.uid()) and p.status = 'published'
  )
)
with check (
  exists (
    select 1 from public.posts p
    where p.id = post_id and p.author_id = (select auth.uid()) and p.status = 'published'
  )
  and exists (
    select 1 from public.post_media m
    where m.post_id = post_id and m.media_type = 'image'
  )
  and exists (
    select 1 from public.songs s
    where s.id = song_id and s.status = 'published'
  )
);

drop policy if exists post_music_delete_owner on public.post_music;
create policy post_music_delete_owner on public.post_music
for delete to authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_id and p.author_id = (select auth.uid())
  )
);
