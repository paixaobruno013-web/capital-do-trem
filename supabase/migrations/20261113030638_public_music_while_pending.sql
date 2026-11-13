-- Faixas em análise permanecem disponíveis para audição pública.
-- Faixas rejeitadas continuam privadas; uploads e exclusões seguem as regras atuais.

drop policy if exists "songs_read_published_owner_admin" on public.songs;
create policy "songs_read_public_catalog_pending_published_owner_admin"
on public.songs
for select
to anon, authenticated
using (
  status in ('pending', 'published')
  or user_id = (select auth.uid())
  or (select private.is_admin())
);

drop policy if exists "audio_read_published_owner_admin" on storage.objects;
create policy "audio_read_pending_and_published_owner_admin"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'capital-do-trem-audio'
  and (
    exists (
      select 1
      from public.songs s
      where s.storage_path = objects.name
        and s.status in ('pending', 'published')
    )
    or (storage.foldername(name))[1] = (select auth.uid())::text
    or (select private.is_admin())
  )
);
