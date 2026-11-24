-- Permite que somente administradores enviem a arte da capa da área Músicas.
-- O código grava em {user_id}/branding/, portanto a política antiga de capas
-- de perfil ({user_id}/cover/) não autorizava esse caminho.
drop policy if exists "admin_music_cover_upload" on storage.objects;
create policy "admin_music_cover_upload" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'capital-do-trem-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'branding'
  and (select private.is_admin())
);

drop policy if exists "admin_music_cover_delete" on storage.objects;
create policy "admin_music_cover_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'capital-do-trem-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = 'branding'
  and (select private.is_admin())
);
