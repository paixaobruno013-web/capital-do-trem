-- Bucket privado reservado às gravações de lives.
-- Não publicar URLs públicas; o Feed só deve receber mídia após validação do estado ready.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'live-recordings',
  'live-recordings',
  false,
  524288000,
  array['video/mp4', 'video/webm']
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Live recordings backend access only" on storage.objects;
create policy "Live recordings backend access only"
on storage.objects
for all
to service_role
using (bucket_id = 'live-recordings')
with check (bucket_id = 'live-recordings');
