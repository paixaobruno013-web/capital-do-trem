-- Moderação posterior por faixa: publicação imediata, com opção de restrição privada pelo administrador.
alter table public.songs drop constraint if exists songs_status_check;
alter table public.songs add constraint songs_status_check
  check (status in ('pending','published','rejected','private'));

drop policy if exists "songs_read_public_catalog_pending_published_owner_admin" on public.songs;
drop policy if exists "songs_read_published_owner_admin" on public.songs;
create policy "songs_read_public_catalog_or_owner_admin" on public.songs
  for select to anon, authenticated
  using (
    status = 'published'
    or user_id = (select auth.uid())
    or (select private.is_admin())
  );

drop policy if exists "songs_update_own_pending_admin" on public.songs;
create policy "songs_update_own_song_or_admin" on public.songs
  for update to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()))
  with check (
    (user_id = (select auth.uid()) and status = 'published')
    or (select private.is_admin())
  );

drop policy if exists "audio_read_pending_and_published_owner_admin" on storage.objects;
drop policy if exists "audio_read_published_owner_admin" on storage.objects;
create policy "audio_read_public_catalog_or_owner_admin" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'capital-do-trem-audio'
    and (
      exists (
        select 1 from public.songs s
        where s.storage_path = objects.name and s.status = 'published'
      )
      or (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.is_admin())
    )
  );
