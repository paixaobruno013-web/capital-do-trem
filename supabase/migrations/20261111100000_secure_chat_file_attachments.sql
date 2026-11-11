-- Anexos privados e compartilhados do chat com autorização por conversa.
-- Novos arquivos deixam o bucket público de mídia e passam a usar URLs assinadas.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'capital-do-trem-chat',
  'capital-do-trem-chat',
  false,
  20971520,
  array[
    'image/jpeg','image/png','image/webp',
    'video/mp4','video/webm',
    'audio/mpeg','audio/mp4','audio/aac','audio/ogg','audio/wav','audio/x-wav','audio/webm',
    'application/pdf','text/plain','text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.chat_messages
  add column if not exists attachment_path text;

alter table public.chat_messages
  drop constraint if exists chat_messages_attachment_type_check;
alter table public.chat_messages
  add constraint chat_messages_attachment_type_check
  check (attachment_type is null or attachment_type in ('image','video','audio','document'));

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
    (attachment_url is null and attachment_path is null and attachment_type is null and attachment_name is null and attachment_mime is null and attachment_size is null)
    or
    ((attachment_url is not null or attachment_path is not null) and attachment_type is not null and attachment_name is not null and attachment_mime is not null and attachment_size is not null)
  );

alter table public.private_messages
  add column if not exists attachment_path text,
  add column if not exists attachment_type text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime text,
  add column if not exists attachment_size bigint;

alter table public.private_messages
  drop constraint if exists private_messages_attachment_type_check;
alter table public.private_messages
  add constraint private_messages_attachment_type_check
  check (attachment_type is null or attachment_type in ('image','video','audio','document'));

alter table public.private_messages
  drop constraint if exists private_messages_attachment_size_check;
alter table public.private_messages
  add constraint private_messages_attachment_size_check
  check (attachment_size is null or attachment_size between 1 and 20971520);

alter table public.private_messages
  drop constraint if exists private_messages_attachment_metadata_check;
alter table public.private_messages
  add constraint private_messages_attachment_metadata_check
  check (
    (attachment_path is null and attachment_type is null and attachment_name is null and attachment_mime is null and attachment_size is null)
    or
    (attachment_path is not null and attachment_type is not null and attachment_name is not null and attachment_mime is not null and attachment_size is not null)
  );

drop policy if exists chat_private_files_read_authorized on storage.objects;
create policy chat_private_files_read_authorized
on storage.objects for select to authenticated
using (
  bucket_id = 'capital-do-trem-chat'
  and private.is_registered_user()
  and (
    (
      (storage.foldername(name))[1] = 'group'
      and private.is_current_chat_group_member()
    )
    or
    (
      (storage.foldername(name))[1] = 'private'
      and exists (
        select 1
        from public.private_conversations c
        where c.id::text = (storage.foldername(name))[2]
          and c.status = 'accepted'
          and (auth.uid() = c.participant_one or auth.uid() = c.participant_two)
          and not private.private_users_blocked(
            auth.uid(),
            case when c.participant_one = auth.uid() then c.participant_two else c.participant_one end
          )
      )
    )
  )
);

drop policy if exists chat_private_files_upload_authorized on storage.objects;
create policy chat_private_files_upload_authorized
on storage.objects for insert to authenticated
with check (
  bucket_id = 'capital-do-trem-chat'
  and private.is_registered_user()
  and (
    (
      (storage.foldername(name))[1] = 'group'
      and (storage.foldername(name))[2] = auth.uid()::text
      and private.is_current_chat_group_member()
    )
    or
    (
      (storage.foldername(name))[1] = 'private'
      and (storage.foldername(name))[3] = auth.uid()::text
      and exists (
        select 1
        from public.private_conversations c
        where c.id::text = (storage.foldername(name))[2]
          and c.status = 'accepted'
          and (auth.uid() = c.participant_one or auth.uid() = c.participant_two)
          and not private.private_users_blocked(
            auth.uid(),
            case when c.participant_one = auth.uid() then c.participant_two else c.participant_one end
          )
      )
    )
  )
);

drop policy if exists chat_private_files_delete_owner_or_admin on storage.objects;
create policy chat_private_files_delete_owner_or_admin
on storage.objects for delete to authenticated
using (
  bucket_id = 'capital-do-trem-chat'
  and (
    private.is_admin()
    or (
      (storage.foldername(name))[1] = 'group'
      and (storage.foldername(name))[2] = auth.uid()::text
    )
    or (
      (storage.foldername(name))[1] = 'private'
      and (storage.foldername(name))[3] = auth.uid()::text
    )
  )
);
