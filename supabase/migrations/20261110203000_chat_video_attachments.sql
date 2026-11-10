-- Permitir vídeos nas mídias compartilhadas do bate-papo público.
alter table public.chat_messages
  drop constraint if exists chat_messages_attachment_type_check;
alter table public.chat_messages
  add constraint chat_messages_attachment_type_check
  check (attachment_type is null or attachment_type in ('image','video','audio'));

alter table public.chat_messages
  drop constraint if exists chat_messages_attachment_size_check;
alter table public.chat_messages
  add constraint chat_messages_attachment_size_check
  check (attachment_size is null or attachment_size between 1 and 20971520);

update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp',
      'video/mp4','video/webm',
      'audio/mpeg','audio/mp4','audio/aac','audio/ogg',
      'audio/wav','audio/x-wav','audio/webm'
    ]::text[]
where id = 'capital-do-trem-media';
