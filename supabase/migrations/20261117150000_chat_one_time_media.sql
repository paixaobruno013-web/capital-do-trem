-- Visualização única de anexos de imagem, vídeo e áudio no chat.
-- Cada destinatário pode consumir a própria visualização uma vez; o remetente não pode abrir.
alter table public.chat_messages add column if not exists attachment_once boolean not null default false;
alter table public.private_messages add column if not exists attachment_once boolean not null default false;

alter table public.chat_messages drop constraint if exists chat_messages_attachment_once_check;
alter table public.chat_messages add constraint chat_messages_attachment_once_check
check (not attachment_once or (attachment_path is not null and attachment_type in ('image','video','audio')));

alter table public.private_messages drop constraint if exists private_messages_attachment_once_check;
alter table public.private_messages add constraint private_messages_attachment_once_check
check (not attachment_once or (attachment_path is not null and attachment_type in ('image','video','audio')));

create table if not exists public.chat_message_media_views (
  message_kind text not null check (message_kind in ('group','private')),
  message_id uuid not null,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (message_kind,message_id,viewer_id)
);
create index if not exists chat_message_media_views_viewer_idx
  on public.chat_message_media_views(viewer_id,viewed_at desc);
alter table public.chat_message_media_views enable row level security;
revoke all on public.chat_message_media_views from anon,authenticated;

create or replace function public.consume_one_time_chat_media(p_message_kind text,p_message_id uuid)
returns table(storage_path text,attachment_type text)
language plpgsql
security definer
set search_path=''
as $$
declare
  current_user_id uuid := (select auth.uid());
  v_path text;
  v_type text;
  v_sender uuid;
  v_once boolean;
  v_conversation uuid;
  inserted_rows integer;
begin
  if current_user_id is null then raise exception 'Autenticação necessária.'; end if;
  if p_message_kind not in ('group','private') or p_message_id is null then
    raise exception 'Solicitação de mídia inválida.';
  end if;

  if p_message_kind='group' then
    select m.attachment_path,m.attachment_type,m.author_id,m.attachment_once
      into v_path,v_type,v_sender,v_once
      from public.chat_messages m where m.id=p_message_id;
    if not found or not v_once or v_sender=current_user_id
       or not (select private.is_current_chat_group_member()) then
      raise exception 'Mídia indisponível para esta conta.';
    end if;
  else
    select m.attachment_path,m.attachment_type,m.sender_id,m.attachment_once,m.conversation_id
      into v_path,v_type,v_sender,v_once,v_conversation
      from public.private_messages m where m.id=p_message_id;
    if not found or not v_once or v_sender=current_user_id
       or not exists (
         select 1 from public.private_conversations c
         where c.id=v_conversation and c.status='accepted'
           and current_user_id in(c.participant_one,c.participant_two)
       ) then
      raise exception 'Mídia indisponível para esta conta.';
    end if;
  end if;

  if v_path is null or v_type not in ('image','video','audio') then
    raise exception 'Formato de mídia não permitido.';
  end if;

  insert into public.chat_message_media_views(message_kind,message_id,viewer_id)
  values(p_message_kind,p_message_id,current_user_id)
  on conflict do nothing;
  get diagnostics inserted_rows = row_count;
  if inserted_rows=0 then
    return;
  end if;

  return query select v_path,v_type;
end;
$$;

revoke all on function public.consume_one_time_chat_media(text,uuid) from public,anon;
grant execute on function public.consume_one_time_chat_media(text,uuid) to authenticated;
