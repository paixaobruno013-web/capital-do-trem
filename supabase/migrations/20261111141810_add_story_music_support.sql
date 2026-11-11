-- Optional licensed/catalog music attached to 24-hour Stories.
alter table public.user_stories
  add column if not exists music_song_id uuid references public.songs(id) on delete set null,
  add column if not exists music_start_seconds numeric(8,2) not null default 0 check (music_start_seconds >= 0),
  add column if not exists music_volume numeric(3,2) not null default 0.80 check (music_volume >= 0 and music_volume <= 1);

alter table public.admin_stories
  add column if not exists music_song_id uuid references public.songs(id) on delete set null,
  add column if not exists music_start_seconds numeric(8,2) not null default 0 check (music_start_seconds >= 0),
  add column if not exists music_volume numeric(3,2) not null default 0.80 check (music_volume >= 0 and music_volume <= 1);

create index if not exists user_stories_music_song_id_idx on public.user_stories(music_song_id) where music_song_id is not null;
create index if not exists admin_stories_music_song_id_idx on public.admin_stories(music_song_id) where music_song_id is not null;
