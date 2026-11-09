-- Mídia no bate-papo geral: texto continua opcional quando há anexo.
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

-- Arquivos são guardados na pasta individual do usuário no bucket público já usado pelo app.
-- A política de upload existente limita a primeira pasta ao ID do usuário autenticado.
