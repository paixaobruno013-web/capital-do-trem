-- Registra quando uma mensagem de texto foi editada pelo próprio remetente.
alter table public.chat_messages add column if not exists edited_at timestamptz;
alter table public.private_messages add column if not exists edited_at timestamptz;

create or replace function private.mark_chat_message_edited()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if new.content is distinct from old.content then
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;
  end if;
  return new;
end;
$$;
revoke all on function private.mark_chat_message_edited() from public,anon,authenticated;

drop trigger if exists chat_messages_mark_edited on public.chat_messages;
create trigger chat_messages_mark_edited
before update of content on public.chat_messages
for each row execute function private.mark_chat_message_edited();

drop trigger if exists private_messages_mark_edited on public.private_messages;
create trigger private_messages_mark_edited
before update of content on public.private_messages
for each row execute function private.mark_chat_message_edited();
