alter table public.user_stories
  add column if not exists music_url text,
  add column if not exists music_title text not null default '',
  add column if not exists music_artist text not null default '';
alter table public.admin_stories
  add column if not exists music_url text,
  add column if not exists music_title text not null default '',
  add column if not exists music_artist text not null default '';
