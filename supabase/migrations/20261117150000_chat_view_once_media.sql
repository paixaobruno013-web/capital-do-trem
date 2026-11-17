-- Mídia de visualização única no chat: cada destinatário tem seu próprio primeiro e único acesso.
alter table public.chat_messages
  add column if not exists view_once boolean not null default false;
alter table public.private_messages
  add column if not exists view_once boolean not null default false;

alter table public.chat_messages
  drop constraint if exists chat_messages_view_once_media_check;
alter table public.chat_messages
  add constraint chat_messages_view_once_media_check
  check (not view_once or (attachment_path is not null and attachment_type in ('image','video','audio')));

alter table public.private_messages
  drop constraint if exists private_messages_view_once_media_check;
alter table public.private_messages
  add constraint private_messages_view_once_media_check
  check (not view_once or (attachment_path is not null and attachment_type in ('image','video','audio')));

create table if not exists public.chat_message_views (
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (message_id, viewer_id)
);
create table if not exists public.private_message_views (
  message_id uuid not null references public.private_messages(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (message_id, viewer_id)
);

alter table public.chat_message_views enable row level security;
alter table public.private_message_views enable row level security;
revoke all on public.chat_message_views from anon, authenticated;
revoke all on public.private_message_views from anon, authenticated;
grant select, insert on public.chat_message_views to authenticated;
grant select, insert on public.private_message_views to authenticated;

drop policy if exists chat_message_views_read_self on public.chat_message_views;
create policy chat_message_views_read_self on public.chat_message_views
for select to authenticated using (viewer_id = (select auth.uid()));
drop policy if exists chat_message_views_insert_recipient on public.chat_message_views;
create policy chat_message_views_insert_recipient on public.chat_message_views
for insert to authenticated with check (
  viewer_id = (select auth.uid())
  and exists (
    select 1 from public.chat_messages m
    where m.id = message_id
      and m.author_id <> (select auth.uid())
      and m.view_once = true
      and m.attachment_path is not null
      and m.attachment_type in ('image','video','audio')
      and private.is_current_chat_group_member()
  )
);

drop policy if exists private_message_views_read_self on public.private_message_views;
create policy private_message_views_read_self on public.private_message_views
for select to authenticated using (viewer_id = (select auth.uid()));
drop policy if exists private_message_views_insert_recipient on public.private_message_views;
create policy private_message_views_insert_recipient on public.private_message_views
for insert to authenticated with check (
  viewer_id = (select auth.uid())
  and exists (
    select 1
    from public.private_messages m
    join public.private_conversations c on c.id = m.conversation_id
    where m.id = message_id
      and m.sender_id <> (select auth.uid())
      and m.view_once = true
      and m.attachment_path is not null
      and m.attachment_type in ('image','video','audio')
      and c.status = 'accepted'
      and (select auth.uid()) in (c.participant_one, c.participant_two)
      and not private.private_users_blocked(
        (select auth.uid()),
        case when c.participant_one = (select auth.uid()) then c.participant_two else c.participant_one end
      )
  )
);

-- O remetente não pode transformar um anexo comum em visualização única depois do envio,
-- nem alterar o caminho/tipo do arquivo por uma atualização de mensagem.
create or replace function private.protect_chat_view_once_metadata()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if new.view_once is distinct from old.view_once
     or new.attachment_path is distinct from old.attachment_path
     or new.attachment_type is distinct from old.attachment_type then
    raise exception 'Os metadados de mídia da mensagem não podem ser alterados após o envio.';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_chat_view_once_metadata() from public, anon, authenticated;
drop trigger if exists chat_messages_protect_view_once_metadata on public.chat_messages;
create trigger chat_messages_protect_view_once_metadata
before update on public.chat_messages for each row
execute function private.protect_chat_view_once_metadata();
drop trigger if exists private_messages_protect_view_once_metadata on public.private_messages;
create trigger private_messages_protect_view_once_metadata
before update on public.private_messages for each row
execute function private.protect_chat_view_once_metadata();
