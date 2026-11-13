-- Protege mídias das publicações em bucket privado sem alterar o bucket geral
-- usado por avatares, capas, cartazes, Stories e demais imagens públicas.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'capital-do-trem-social',
  'capital-do-trem-social',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.post_media
  drop constraint if exists post_media_bucket_id_check;

alter table public.post_media
  add constraint post_media_bucket_id_check
  check (bucket_id in ('capital-do-trem-media', 'capital-do-trem-social'));

drop policy if exists social_media_read_published_owner_admin on storage.objects;
create policy social_media_read_published_owner_admin
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'capital-do-trem-social'
    and (
      exists (
        select 1
        from public.post_media pm
        join public.posts p on p.id = pm.post_id
        where pm.bucket_id = 'capital-do-trem-social'
          and pm.storage_path = objects.name
          and p.status = 'published'
      )
      or (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.is_admin())
    )
  );

drop policy if exists social_media_upload_own_post on storage.objects;
create policy social_media_upload_own_post
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'capital-do-trem-social'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (storage.foldername(name))[2] = 'posts'
  );

drop policy if exists social_media_update_own_post on storage.objects;
create policy social_media_update_own_post
  on storage.objects for update to authenticated
  using (
    bucket_id = 'capital-do-trem-social'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.is_admin())
    )
  )
  with check (
    bucket_id = 'capital-do-trem-social'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.is_admin())
    )
  );

drop policy if exists social_media_delete_own_post_or_admin on storage.objects;
create policy social_media_delete_own_post_or_admin
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'capital-do-trem-social'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.is_admin())
    )
  );

commit;
