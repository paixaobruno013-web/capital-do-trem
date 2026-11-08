-- Reforço de segurança: alinhar as políticas reais do banco ao modelo do aplicativo.
-- Apenas administradores podem inserir músicas e arquivos de áudio.

drop policy if exists "songs_insert_own_pending" on public.songs;
drop policy if exists "songs_insert_admin_only" on public.songs;
create policy "songs_insert_admin_only" on public.songs
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.is_admin())
  );

drop policy if exists "audio_upload_own_folder" on storage.objects;
drop policy if exists "audio_upload_admin_only" on storage.objects;
create policy "audio_upload_admin_only" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'capital-do-trem-audio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_admin())
  );
