-- Envio de músicas por artistas: arquivos ficam privados até a publicação pela equipe.
alter table public.songs
  add column if not exists producer_name text not null default '';

alter table public.songs
  drop constraint if exists songs_producer_name_length;
alter table public.songs
  add constraint songs_producer_name_length
  check (char_length(producer_name) <= 100);

drop policy if exists "songs_insert_admin_only" on public.songs;
drop policy if exists "songs_insert_own_pending" on public.songs;
create policy "songs_insert_artist_pending_or_admin" on public.songs
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      (status = 'pending' and exists (
        select 1 from public.artists a where a.user_id = (select auth.uid())
      ))
      or (select private.is_admin())
    )
  );

drop policy if exists "audio_upload_admin_only" on storage.objects;
drop policy if exists "audio_upload_own_folder" on storage.objects;
create policy "audio_upload_artist_own_folder_or_admin" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'capital-do-trem-audio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (
      (select private.is_admin())
      or exists (
        select 1 from public.artists a where a.user_id = (select auth.uid())
      )
    )
  );
