-- Permite arquivos MOV selecionados da biblioteca do iPhone nos Stories.
update storage.buckets
set allowed_mime_types = array(
  select distinct mime
  from unnest(coalesce(allowed_mime_types, array[]::text[]) || array['video/quicktime']::text[]) as mime
)
where id='capital-do-trem-media';
