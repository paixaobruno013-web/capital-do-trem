-- Permite que qualquer conta registrada publique suas próprias músicas.
-- Cada usuário só pode inserir a linha vinculada ao próprio auth.uid().
-- O arquivo de áudio deve ficar na pasta cujo primeiro segmento é o UUID do usuário.
drop policy if exists songs_insert_admin_only on public.songs;
drop policy if exists songs_insert_own_pending on public.songs;
drop policy if exists songs_insert_registered_users on public.songs;
create policy songs_insert_registered_users
on public.songs
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'published'
);

drop policy if exists audio_upload_admin_only on storage.objects;
drop policy if exists audio_upload_own_folder on storage.objects;
drop policy if exists audio_upload_registered_users on storage.objects;
create policy audio_upload_registered_users
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'capital-do-trem-audio'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
