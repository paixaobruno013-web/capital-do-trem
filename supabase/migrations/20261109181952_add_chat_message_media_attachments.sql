-- Suporte a anexos de imagem e áudio no Koe Fala Tu.
alter table public.chat_messages
  add column if not exists attachment_url text,
  add column if not exists attachment_type text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime text,
  add column if not exists attachment_size bigint;

alter table public.chat_messages
  drop constraint if exists chat_messages_attachment_type_check;
alter table public.chat_messages
  add constraint chat_messages_attachment_type_check
  check (attachment_type is null or attachment_type in ('image','audio'));

alter table public.chat_messages
  drop constraint if exists chat_messages_attachment_size_check;
alter table public.chat_messages
  add constraint chat_messages_attachment_size_check
  check (attachment_size is null or attachment_size between 1 and 20971520);

alter table public.chat_messages
  drop constraint if exists chat_messages_attachment_metadata_check;
alter table public.chat_messages
  add constraint chat_messages_attachment_metadata_check
  check (
    (attachment_url is null and attachment_type is null and attachment_name is null and attachment_mime is null and attachment_size is null)
    or
    (attachment_url is not null and attachment_type is not null and attachment_name is not null and attachment_mime is not null and attachment_size is not null)
  );

-- O bucket permite os mesmos formatos validados pelo cliente e limite de até 20 MB.
update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp',
      'audio/mpeg','audio/mp4','audio/aac','audio/ogg',
      'audio/wav','audio/x-wav','audio/webm'
    ]::text[]
where id = 'capital-do-trem-media';
