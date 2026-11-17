-- Capa pública armazenada no bucket existente, com escrita restrita à pasta do proprietário.
drop policy if exists "profile_cover_upload_own" on storage.objects;
create policy "profile_cover_upload_own" on storage.objects for insert to authenticated
with check (bucket_id='capital-do-trem-media' and (storage.foldername(name))[1]=(select auth.uid())::text and (storage.foldername(name))[2]='cover');
drop policy if exists "profile_cover_delete_own" on storage.objects;
create policy "profile_cover_delete_own" on storage.objects for delete to authenticated
using (bucket_id='capital-do-trem-media' and (storage.foldername(name))[1]=(select auth.uid())::text and (storage.foldername(name))[2]='cover');
