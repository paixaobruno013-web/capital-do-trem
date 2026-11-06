-- Capital do Trem — catálogo de músicas com armazenamento privado.
-- Migração repetível: cria estrutura sem apagar dados existentes.
-- Catálogo de músicas: arquivos privados até a aprovação da equipe.
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  artist_name text not null check (char_length(artist_name) between 1 and 100),
  description text not null default '' check (char_length(description) <= 1000),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('audio/mpeg','audio/mp4','audio/aac','audio/wav','audio/ogg','audio/x-wav')),
  file_size bigint not null check (file_size > 0 and file_size <= 52428800),
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  created_at timestamptz not null default now()
);

alter table public.songs enable row level security;
grant select, insert, update, delete on public.songs to authenticated;
grant select on public.songs to anon;

drop policy if exists "songs_read_published_owner_admin" on public.songs;
create policy "songs_read_published_owner_admin" on public.songs
  for select to anon, authenticated
  using (status = 'published' or user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "songs_insert_own_pending" on public.songs;
create policy "songs_insert_own_pending" on public.songs
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');

drop policy if exists "songs_update_own_pending_admin" on public.songs;
create policy "songs_update_own_pending_admin" on public.songs
  for update to authenticated
  using ((user_id = (select auth.uid()) and status in ('pending','rejected')) or (select public.is_admin()))
  with check ((user_id = (select auth.uid()) and status = 'pending') or (select public.is_admin()));

drop policy if exists "songs_delete_own_pending_admin" on public.songs;
create policy "songs_delete_own_pending_admin" on public.songs
  for delete to authenticated
  using ((user_id = (select auth.uid()) and status = 'pending') or (select public.is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('capital-do-trem-audio','capital-do-trem-audio',false,52428800,
  array['audio/mpeg','audio/mp4','audio/aac','audio/wav','audio/ogg','audio/x-wav'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "audio_upload_own_folder" on storage.objects;
create policy "audio_upload_own_folder" on storage.objects
  for insert to authenticated
  with check (bucket_id='capital-do-trem-audio'
    and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "audio_read_published_owner_admin" on storage.objects;
create policy "audio_read_published_owner_admin" on storage.objects
  for select to anon, authenticated
  using (bucket_id='capital-do-trem-audio' and (
    exists (select 1 from public.songs s where s.storage_path=storage.objects.name and s.status='published')
    or (storage.foldername(name))[1]=(select auth.uid())::text
    or (select public.is_admin())
  ));

drop policy if exists "audio_delete_owner_admin" on storage.objects;
create policy "audio_delete_owner_admin" on storage.objects
  for delete to authenticated
  using (bucket_id='capital-do-trem-audio' and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or (select public.is_admin())
  ));
