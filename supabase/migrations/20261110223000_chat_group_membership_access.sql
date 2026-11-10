-- Participação voluntária no grupo geral e elegibilidade para conversas privadas.
create table if not exists public.chat_group_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz
);
create index if not exists chat_group_members_active_idx
  on public.chat_group_members(user_id) where left_at is null;
alter table public.chat_group_members enable row level security;
revoke all on public.chat_group_members from anon, authenticated;
grant select, insert, update on public.chat_group_members to authenticated;
drop policy if exists chat_group_members_read_self_or_admin on public.chat_group_members;
create policy chat_group_members_read_self_or_admin
  on public.chat_group_members for select to authenticated
  using (user_id=(select auth.uid()) or (select private.is_admin()));
drop policy if exists chat_group_members_join_self on public.chat_group_members;
create policy chat_group_members_join_self
  on public.chat_group_members for insert to authenticated
  with check (user_id=(select auth.uid()) and left_at is null and (select private.is_registered_user()));
drop policy if exists chat_group_members_update_self on public.chat_group_members;
create policy chat_group_members_update_self
  on public.chat_group_members for update to authenticated
  using (user_id=(select auth.uid()))
  with check (user_id=(select auth.uid()));

create or replace function private.is_current_chat_group_member()
returns boolean language sql stable security definer set search_path = ''
as $function$
  select exists (select 1 from public.chat_group_members gm
    where gm.user_id=(select auth.uid()) and gm.left_at is null);
$function$;
revoke all on function private.is_current_chat_group_member() from public, anon;
grant execute on function private.is_current_chat_group_member() to authenticated;

create or replace function private.can_start_private_chat(target_user_id uuid)
returns boolean language plpgsql stable security definer set search_path = ''
as $function$
declare current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null or target_user_id is null or target_user_id=current_user_id then return false; end if;
  return exists (select 1 from public.chat_group_members gm
    where gm.user_id=current_user_id and gm.left_at is null)
    and exists (select 1 from public.chat_messages cm where cm.author_id=current_user_id)
    and exists (select 1 from public.chat_group_members gm
    where gm.user_id=target_user_id and gm.left_at is null)
    and exists (select 1 from public.chat_messages cm where cm.author_id=target_user_id);
end;
$function$;
revoke all on function private.can_start_private_chat(uuid) from public, anon;
grant execute on function private.can_start_private_chat(uuid) to authenticated;

create or replace function public.active_chat_group_member_ids()
returns table(user_id uuid) language sql stable security definer set search_path = ''
as $function$
  select gm.user_id from public.chat_group_members gm
  where gm.left_at is null and (select auth.uid()) is not null
    and (select private.is_registered_user())
    and exists (select 1 from public.chat_messages cm where cm.author_id=gm.user_id);
$function$;
revoke all on function public.active_chat_group_member_ids() from public, anon;
grant execute on function public.active_chat_group_member_ids() to authenticated;

-- Mensagens gerais: apenas membros ativos (e administração) podem ler; somente membros ativos enviam.
drop policy if exists "chat_messages_read_authenticated" on public.chat_messages;
drop policy if exists require_registered_user on public.chat_messages;
create policy chat_messages_read_group_members on public.chat_messages
  for select to authenticated
  using ((select private.is_current_chat_group_member()) or (select private.is_admin()));
drop policy if exists chat_messages_insert_self on public.chat_messages;
create policy chat_messages_insert_self on public.chat_messages
  for insert to authenticated
  with check (author_id=(select auth.uid())
    and (select private.is_registered_user())
    and (select private.is_current_chat_group_member()));

-- Remover políticas permissivas ALL antigas que permitiam contornar as regras por participante.
drop policy if exists require_registered_user on public.private_conversations;
drop policy if exists require_registered_user on public.private_messages;
drop policy if exists require_registered_user on public.private_blocks;

drop policy if exists private_conversations_request_public_user on public.private_conversations;
create policy private_conversations_request_public_user on public.private_conversations
  for insert to authenticated with check (
    initiated_by=(select auth.uid())
    and (select auth.uid()) in(participant_one,participant_two)
    and (select private.is_registered_user())
    and (select private.can_start_private_chat(
      case when participant_one=(select auth.uid()) then participant_two else participant_one end))
    and exists (select 1 from public.profiles p
      where p.user_id=case when participant_one=(select auth.uid()) then participant_two else participant_one end
        and p.is_public=true)
    and not (select private.private_users_blocked((select auth.uid()),
      case when participant_one=(select auth.uid()) then participant_two else participant_one end))
  );

drop policy if exists private_conversations_update_participants on public.private_conversations;
create policy private_conversations_update_participants on public.private_conversations
  for update to authenticated
  using (
    (status='pending'
      and (select auth.uid())=case when initiated_by=participant_one then participant_two else participant_one end
      and (select private.can_start_private_chat(
        case when participant_one=(select auth.uid()) then participant_two else participant_one end)))
    or (status='accepted' and (select auth.uid()) in(participant_one,participant_two))
  )
  with check (
    (status in('accepted','declined')
      and (select auth.uid())=case when initiated_by=participant_one then participant_two else participant_one end
      and (select private.can_start_private_chat(
        case when participant_one=(select auth.uid()) then participant_two else participant_one end)))
    or (status='accepted' and (select auth.uid()) in(participant_one,participant_two))
  );

drop policy if exists private_messages_read_accepted_participants on public.private_messages;
create policy private_messages_read_accepted_participants on public.private_messages
  for select to authenticated using (
    (select private.is_registered_user())
    and exists (select 1 from public.private_conversations c
      where c.id=conversation_id and c.status='accepted'
        and (select auth.uid()) in(c.participant_one,c.participant_two))
    and not exists (select 1 from public.private_conversations c
      where c.id=conversation_id and (select private.private_users_blocked((select auth.uid()),
        case when c.participant_one=(select auth.uid()) then c.participant_two else c.participant_one end)))
  );

drop policy if exists private_messages_insert_accepted_participants on public.private_messages;
create policy private_messages_insert_accepted_participants on public.private_messages
  for insert to authenticated with check (
    sender_id=(select auth.uid()) and (select private.is_registered_user())
    and exists (select 1 from public.private_conversations c
      where c.id=conversation_id and c.status='accepted'
        and (select auth.uid()) in(c.participant_one,c.participant_two)
        and not (select private.private_users_blocked((select auth.uid()),
          case when c.participant_one=(select auth.uid()) then c.participant_two else c.participant_one end)))
  );

-- Bloqueios continuam privados para a conta que os criou.
drop policy if exists private_blocks_read_own on public.private_blocks;
create policy private_blocks_read_own on public.private_blocks
  for select to authenticated using (blocker_id=(select auth.uid()) and (select private.is_registered_user()));
drop policy if exists private_blocks_insert_own on public.private_blocks;
create policy private_blocks_insert_own on public.private_blocks
  for insert to authenticated with check (blocker_id=(select auth.uid()) and (select private.is_registered_user()));
drop policy if exists private_blocks_delete_own on public.private_blocks;
create policy private_blocks_delete_own on public.private_blocks
  for delete to authenticated using (blocker_id=(select auth.uid()) and (select private.is_registered_user()));
