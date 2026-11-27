create table if not exists public.user_area_covers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  home_cover_url text,
  home_cover_path text,
  music_cover_url text,
  music_cover_path text,
  updated_at timestamptz not null default now()
);

alter table public.user_area_covers enable row level security;
grant select, insert, update, delete on public.user_area_covers to authenticated;

create policy user_area_covers_select_own
  on public.user_area_covers for select to authenticated
  using ((select auth.uid()) = user_id and (select private.is_registered_user()));

create policy user_area_covers_insert_own
  on public.user_area_covers for insert to authenticated
  with check ((select auth.uid()) = user_id and (select private.is_registered_user()));

create policy user_area_covers_update_own
  on public.user_area_covers for update to authenticated
  using ((select auth.uid()) = user_id and (select private.is_registered_user()))
  with check ((select auth.uid()) = user_id and (select private.is_registered_user()));

create policy user_area_covers_delete_own
  on public.user_area_covers for delete to authenticated
  using ((select auth.uid()) = user_id and (select private.is_registered_user()));

alter table public.profiles
  drop column if exists home_cover_url,
  drop column if exists home_cover_path,
  drop column if exists music_cover_url,
  drop column if exists music_cover_path;
