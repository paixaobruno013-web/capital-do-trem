-- Capital do Trem: somente a administração e equipe autorizada enviam arquivos musicais.
-- Remove as políticas permissivas anteriores, que continuavam liberando usuários comuns.
drop policy if exists "songs_insert_registered_users" on public.songs;
drop policy if exists "songs_insert_own_pending" on public.songs;
drop policy if exists "songs_insert_admin_only" on public.songs;
create policy "songs_insert_admin_only" on public.songs
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select private.is_admin())
  );

drop policy if exists "audio_upload_registered_users" on storage.objects;
drop policy if exists "audio_upload_own_folder" on storage.objects;
drop policy if exists "audio_upload_admin_only" on storage.objects;
create policy "audio_upload_admin_only" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'capital-do-trem-audio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.is_admin())
  );

-- Impede que o proprietário de um arquivo musical antigo apague o áudio de uma música publicada.
drop policy if exists "audio_delete_owner_admin" on storage.objects;
drop policy if exists "audio_delete_admin_only" on storage.objects;
create policy "audio_delete_admin_only" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'capital-do-trem-audio'
    and (select private.is_admin())
  );
