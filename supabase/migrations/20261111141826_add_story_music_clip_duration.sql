alter table public.user_stories
  add column if not exists music_duration_seconds smallint not null default 15 check (music_duration_seconds between 5 and 60);
alter table public.admin_stories
  add column if not exists music_duration_seconds smallint not null default 15 check (music_duration_seconds between 5 and 60);
