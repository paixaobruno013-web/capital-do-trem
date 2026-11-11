-- Exige conta Artista/DJ ativa no perfil, além da ficha artística, para enviar áudio.
drop policy if exists "songs_insert_artist_published_or_admin" on public.songs;
create policy "songs_insert_artist_published_or_admin" on public.songs
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      (
        status = 'published'
        and exists (
          select 1 from public.profiles p
          where p.user_id = (select auth.uid()) and p.account_type = 'artist'
        )
        and exists (
          select 1 from public.artists a
          where a.user_id = (select auth.uid())
        )
      )
      or (select private.is_admin())
    )
  );

drop policy if exists "audio_upload_artist_own_folder_or_admin" on storage.objects;
create policy "audio_upload_artist_own_folder_or_admin" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'capital-do-trem-audio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (
      (select private.is_admin())
      or (
        exists (
          select 1 from public.profiles p
          where p.user_id = (select auth.uid()) and p.account_type = 'artist'
        )
        and exists (
          select 1 from public.artists a
          where a.user_id = (select auth.uid())
        )
      )
    )
  );
