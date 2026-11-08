-- Conversas privadas com convite e aceite, mensagens isoladas e bloqueio.
create table if not exists public.private_conversations (
 id uuid primary key default gen_random_uuid(),
 participant_one uuid not null references auth.users(id) on delete cascade,
 participant_two uuid not null references auth.users(id) on delete cascade,
 initiated_by uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','declined')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint private_conversations_distinct check(participant_one<>participant_two),
 constraint private_conversations_ordered check(participant_one<participant_two),
 constraint private_conversations_initiator check(initiated_by in(participant_one,participant_two)),
 unique(participant_one,participant_two)
);
create table if not exists public.private_messages (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null references public.private_conversations(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 content text not null check(char_length(content) between 1 and 2000),
 created_at timestamptz not null default now()
);
create table if not exists public.private_blocks (
 blocker_id uuid not null references auth.users(id) on delete cascade,
 blocked_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(blocker_id,blocked_id),
 constraint private_blocks_distinct check(blocker_id<>blocked_id)
);
create index if not exists private_conversations_one_idx on public.private_conversations(participant_one,status,updated_at desc);
create index if not exists private_conversations_two_idx on public.private_conversations(participant_two,status,updated_at desc);
create index if not exists private_messages_conversation_created_idx on public.private_messages(conversation_id,created_at);
alter table public.private_conversations enable row level security;
alter table public.private_messages enable row level security;
alter table public.private_blocks enable row level security;
revoke all on public.private_conversations,public.private_messages,public.private_blocks from anon,authenticated;
grant select,insert,update on public.private_conversations to authenticated;
grant select,insert on public.private_messages to authenticated;
grant select,insert,delete on public.private_blocks to authenticated;
drop policy if exists private_conversations_read_participants on public.private_conversations;
create policy private_conversations_read_participants on public.private_conversations for select to authenticated using(auth.uid() in(participant_one,participant_two));
drop policy if exists private_conversations_request_public_user on public.private_conversations;
create policy private_conversations_request_public_user on public.private_conversations for insert to authenticated with check(
 initiated_by=auth.uid() and auth.uid() in(participant_one,participant_two)
 and exists(select 1 from public.profiles p where p.user_id=case when participant_one=auth.uid() then participant_two else participant_one end and p.is_public=true)
 and not exists(select 1 from public.private_blocks b where
 (b.blocker_id=case when participant_one=auth.uid() then participant_two else participant_one end and b.blocked_id=auth.uid())
 or (b.blocker_id=auth.uid() and b.blocked_id=case when participant_one=auth.uid() then participant_two else participant_one end))
);
drop policy if exists private_conversations_recipient_decision on public.private_conversations;
create policy private_conversations_recipient_decision on public.private_conversations for update to authenticated
 using(auth.uid()=case when initiated_by=participant_one then participant_two else participant_one end and status='pending')
 with check(auth.uid()=case when initiated_by=participant_one then participant_two else participant_one end and status in('accepted','declined'));
drop policy if exists private_messages_read_accepted_participants on public.private_messages;
create policy private_messages_read_accepted_participants on public.private_messages for select to authenticated using(
 exists(select 1 from public.private_conversations c where c.id=conversation_id and c.status='accepted' and auth.uid() in(c.participant_one,c.participant_two))
 and not exists(select 1 from public.private_blocks b join public.private_conversations c on c.id=conversation_id
 where (b.blocker_id=auth.uid() and b.blocked_id=case when c.participant_one=auth.uid() then c.participant_two else c.participant_one end)
 or (b.blocker_id=case when c.participant_one=auth.uid() then c.participant_two else c.participant_one end and b.blocked_id=auth.uid()))
);
drop policy if exists private_messages_insert_accepted_participants on public.private_messages;
create policy private_messages_insert_accepted_participants on public.private_messages for insert to authenticated with check(
 sender_id=auth.uid() and exists(select 1 from public.private_conversations c where c.id=conversation_id and c.status='accepted'
 and auth.uid() in(c.participant_one,c.participant_two)
 and not exists(select 1 from public.private_blocks b where
 (b.blocker_id=auth.uid() and b.blocked_id=case when c.participant_one=auth.uid() then c.participant_two else c.participant_one end)
 or (b.blocker_id=case when c.participant_one=auth.uid() then c.participant_two else c.participant_one end and b.blocked_id=auth.uid())))
);
drop policy if exists private_blocks_read_own on public.private_blocks;
create policy private_blocks_read_own on public.private_blocks for select to authenticated using(blocker_id=auth.uid());
drop policy if exists private_blocks_insert_own on public.private_blocks;
create policy private_blocks_insert_own on public.private_blocks for insert to authenticated with check(blocker_id=auth.uid());
drop policy if exists private_blocks_delete_own on public.private_blocks;
create policy private_blocks_delete_own on public.private_blocks for delete to authenticated using(blocker_id=auth.uid());
do $$
begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime')
 and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='private_messages') then
 alter publication supabase_realtime add table public.private_messages;
 end if;
end $$;



-- Índices e chamadas auth.uid() preparadas para desempenho em RLS.
create index if not exists private_blocks_blocked_idx on public.private_blocks(blocked_id);
create index if not exists private_conversations_initiated_idx on public.private_conversations(initiated_by);
create index if not exists private_messages_sender_idx on public.private_messages(sender_id);
drop policy if exists private_conversations_read_participants on public.private_conversations;
create policy private_conversations_read_participants on public.private_conversations for select to authenticated using ((select auth.uid()) in(participant_one,participant_two));
drop policy if exists private_conversations_request_public_user on public.private_conversations;
create policy private_conversations_request_public_user on public.private_conversations for insert to authenticated with check(
 initiated_by=(select auth.uid()) and (select auth.uid()) in(participant_one,participant_two)
 and exists(select 1 from public.profiles p where p.user_id=case when participant_one=(select auth.uid()) then participant_two else participant_one end and p.is_public=true)
 and not exists(select 1 from public.private_blocks b where
 (b.blocker_id=case when participant_one=(select auth.uid()) then participant_two else participant_one end and b.blocked_id=(select auth.uid()))
 or (b.blocker_id=(select auth.uid()) and b.blocked_id=case when participant_one=(select auth.uid()) then participant_two else participant_one end))
);
drop policy if exists private_conversations_recipient_decision on public.private_conversations;
create policy private_conversations_recipient_decision on public.private_conversations for update to authenticated
 using((select auth.uid())=case when initiated_by=participant_one then participant_two else participant_one end and status='pending')
 with check((select auth.uid())=case when initiated_by=participant_one then participant_two else participant_one end and status in('accepted','declined'));
drop policy if exists private_messages_read_accepted_participants on public.private_messages;
create policy private_messages_read_accepted_participants on public.private_messages for select to authenticated using(
 exists(select 1 from public.private_conversations c where c.id=conversation_id and c.status='accepted' and (select auth.uid()) in(c.participant_one,c.participant_two))
 and not exists(select 1 from public.private_blocks b join public.private_conversations c on c.id=conversation_id
 where (b.blocker_id=(select auth.uid()) and b.blocked_id=case when c.participant_one=(select auth.uid()) then c.participant_two else c.participant_one end)
 or (b.blocker_id=case when c.participant_one=(select auth.uid()) then c.participant_two else c.participant_one end and b.blocked_id=(select auth.uid())))
);
drop policy if exists private_messages_insert_accepted_participants on public.private_messages;
create policy private_messages_insert_accepted_participants on public.private_messages for insert to authenticated with check(
 sender_id=(select auth.uid()) and exists(select 1 from public.private_conversations c where c.id=conversation_id and c.status='accepted'
 and (select auth.uid()) in(c.participant_one,c.participant_two)
 and not exists(select 1 from public.private_blocks b where
 (b.blocker_id=(select auth.uid()) and b.blocked_id=case when c.participant_one=(select auth.uid()) then c.participant_two else c.participant_one end)
 or (b.blocker_id=case when c.participant_one=(select auth.uid()) then c.participant_two else c.participant_one end and b.blocked_id=(select auth.uid()))))
);
drop policy if exists private_blocks_read_own on public.private_blocks;
create policy private_blocks_read_own on public.private_blocks for select to authenticated using(blocker_id=(select auth.uid()));
drop policy if exists private_blocks_insert_own on public.private_blocks;
create policy private_blocks_insert_own on public.private_blocks for insert to authenticated with check(blocker_id=(select auth.uid()));
drop policy if exists private_blocks_delete_own on public.private_blocks;
create policy private_blocks_delete_own on public.private_blocks for delete to authenticated using(blocker_id=(select auth.uid()));



-- Função privada verifica bloqueio nos dois sentidos sem expor a lista de bloqueios.
create or replace function private.private_users_blocked(user_a uuid,user_b uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.private_blocks b where (b.blocker_id=user_a and b.blocked_id=user_b) or (b.blocker_id=user_b and b.blocked_id=user_a)); $$;
revoke all on function private.private_users_blocked(uuid,uuid) from public;
revoke execute on function private.private_users_blocked(uuid,uuid) from anon;
grant execute on function private.private_users_blocked(uuid,uuid) to authenticated;
drop policy if exists private_conversations_request_public_user on public.private_conversations;
create policy private_conversations_request_public_user on public.private_conversations for insert to authenticated with check(
 initiated_by=(select auth.uid()) and (select auth.uid()) in(participant_one,participant_two)
 and exists(select 1 from public.profiles p where p.user_id=case when participant_one=(select auth.uid()) then participant_two else participant_one end and p.is_public=true)
 and not private.private_users_blocked((select auth.uid()),case when participant_one=(select auth.uid()) then participant_two else participant_one end)
);
drop policy if exists private_messages_read_accepted_participants on public.private_messages;
create policy private_messages_read_accepted_participants on public.private_messages for select to authenticated using(
 exists(select 1 from public.private_conversations c where c.id=conversation_id and c.status='accepted' and (select auth.uid()) in(c.participant_one,c.participant_two))
 and not exists(select 1 from public.private_conversations c where c.id=conversation_id and private.private_users_blocked((select auth.uid()),case when c.participant_one=(select auth.uid()) then c.participant_two else c.participant_one end))
);
drop policy if exists private_messages_insert_accepted_participants on public.private_messages;
create policy private_messages_insert_accepted_participants on public.private_messages for insert to authenticated with check(
 sender_id=(select auth.uid()) and exists(select 1 from public.private_conversations c where c.id=conversation_id and c.status='accepted'
 and (select auth.uid()) in(c.participant_one,c.participant_two)
 and not private.private_users_blocked((select auth.uid()),case when c.participant_one=(select auth.uid()) then c.participant_two else c.participant_one end))
);
drop policy if exists private_conversations_touch_accepted on public.private_conversations;
create policy private_conversations_touch_accepted on public.private_conversations for update to authenticated
 using(status='accepted' and (select auth.uid()) in(participant_one,participant_two))
 with check(status='accepted' and (select auth.uid()) in(participant_one,participant_two));



-- Restringe transições de convite e combina as regras de UPDATE em uma política.
create or replace function private.protect_private_conversation_update()
returns trigger language plpgsql security invoker set search_path=''
as $$
declare recipient uuid;
begin
 if new.participant_one is distinct from old.participant_one
    or new.participant_two is distinct from old.participant_two
    or new.initiated_by is distinct from old.initiated_by then
   raise exception 'Os participantes do convite não podem ser alterados.';
 end if;
 recipient:=case when old.initiated_by=old.participant_one then old.participant_two else old.participant_one end;
 if old.status='pending' then
   if (select auth.uid()) is distinct from recipient or new.status not in('accepted','declined') then
     raise exception 'Somente quem recebeu o convite pode aceitar ou recusar.';
   end if;
 elsif old.status='accepted' then
   if (select auth.uid()) not in(old.participant_one,old.participant_two) or new.status<>'accepted' then
     raise exception 'Atualização não permitida para esta conversa.';
   end if;
 else
   raise exception 'Este convite já foi encerrado.';
 end if;
 return new;
end;
$$;
revoke all on function private.protect_private_conversation_update() from public;
revoke execute on function private.protect_private_conversation_update() from anon;
grant execute on function private.protect_private_conversation_update() to authenticated;
drop trigger if exists private_conversation_update_guard on public.private_conversations;
create trigger private_conversation_update_guard before update on public.private_conversations for each row execute function private.protect_private_conversation_update();
drop policy if exists private_conversations_recipient_decision on public.private_conversations;
drop policy if exists private_conversations_touch_accepted on public.private_conversations;
drop policy if exists private_conversations_update_participants on public.private_conversations;
create policy private_conversations_update_participants on public.private_conversations for update to authenticated
using(
 (status='pending' and (select auth.uid())=case when initiated_by=participant_one then participant_two else participant_one end)
 or (status='accepted' and (select auth.uid()) in(participant_one,participant_two))
)
with check(
 (status in('accepted','declined') and (select auth.uid())=case when initiated_by=participant_one then participant_two else participant_one end)
 or (status='accepted' and (select auth.uid()) in(participant_one,participant_two))
);
