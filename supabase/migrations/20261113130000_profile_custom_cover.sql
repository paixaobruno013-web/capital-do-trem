alter table public.profiles
  add column if not exists cover_url text,
  add column if not exists cover_path text;

comment on column public.profiles.cover_url is 'Public URL for the member-selected profile cover image.';
comment on column public.profiles.cover_path is 'Storage object path for the member-selected profile cover image.';
