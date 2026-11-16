-- Salas de conversa por assunto criadas pela comunidade.
create table if not exists public.discussion_topics (
 id uuid primary key default gen_random_uuid(),
 creator_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(char_length(trim(title)) between 3 and 80),
 description text not null default '' check(char_length(description)<=400),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.discussion_topic_members (
 topic_id uuid not null references public.discussion_topics(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 joined_at timestamptz not null default now(),
 primary key(topic_id,user_id)
);
create table if not exists public.discussion_topic_messages (
 id uuid primary key default gen_random_uuid(),
 topic_id uuid not null references public.discussion_topics(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 content text not null check(char_length(trim(content)) between 1 and 1000),
 created_at timestamptz not null default now()
);
create index if not exists discussion_topics_created_idx on public.discussion_topics(created_at desc);
create index if not exists discussion_topic_members_user_idx on public.discussion_topic_members(user_id,joined_at desc);
create index if not exists discussion_topic_messages_topic_created_idx on public.discussion_topic_messages(topic_id,created_at);
alter table public.discussion_topics enable row level security;
alter table public.discussion_topic_members enable row level security;
alter table public.discussion_topic_messages enable row level security;
revoke all on public.discussion_topics,public.discussion_topic_members,public.discussion_topic_messages from anon,authenticated;
grant select,insert,update,delete on public.discussion_topics to authenticated;
grant select,insert,delete on public.discussion_topic_members to authenticated;
grant select,insert on public.discussion_topic_messages to authenticated;
drop policy if exists discussion_topics_read_signed_in on public.discussion_topics;
create policy discussion_topics_read_signed_in on public.discussion_topics for select to authenticated using(true);
drop policy if exists discussion_topics_create_self on public.discussion_topics;
create policy discussion_topics_create_self on public.discussion_topics for insert to authenticated with check(creator_id=(select auth.uid()));
drop policy if exists discussion_topics_update_owner on public.discussion_topics;
create policy discussion_topics_update_owner on public.discussion_topics for update to authenticated using(creator_id=(select auth.uid()) or (select private.is_admin())) with check(creator_id=(select auth.uid()) or (select private.is_admin()));
drop policy if exists discussion_topics_delete_owner on public.discussion_topics;
create policy discussion_topics_delete_owner on public.discussion_topics for delete to authenticated using(creator_id=(select auth.uid()) or (select private.is_admin()));
drop policy if exists discussion_topic_members_read_signed_in on public.discussion_topic_members;
create policy discussion_topic_members_read_signed_in on public.discussion_topic_members for select to authenticated using(true);
drop policy if exists discussion_topic_members_join_self on public.discussion_topic_members;
create policy discussion_topic_members_join_self on public.discussion_topic_members for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.discussion_topics t where t.id=topic_id));
drop policy if exists discussion_topic_members_leave_self on public.discussion_topic_members;
create policy discussion_topic_members_leave_self on public.discussion_topic_members for delete to authenticated using(user_id=(select auth.uid()));
drop policy if exists discussion_topic_messages_read_members on public.discussion_topic_messages;
create policy discussion_topic_messages_read_members on public.discussion_topic_messages for select to authenticated using(exists(select 1 from public.discussion_topic_members m where m.topic_id=discussion_topic_messages.topic_id and m.user_id=(select auth.uid())));
drop policy if exists discussion_topic_messages_insert_members on public.discussion_topic_messages;
create policy discussion_topic_messages_insert_members on public.discussion_topic_messages for insert to authenticated with check(author_id=(select auth.uid()) and exists(select 1 from public.discussion_topic_members m where m.topic_id=discussion_topic_messages.topic_id and m.user_id=(select auth.uid())));
create or replace function private.add_discussion_topic_creator()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.discussion_topic_members(topic_id,user_id) values(new.id,new.creator_id) on conflict do nothing;
 return new;
end $$;
revoke all on function private.add_discussion_topic_creator() from public,anon,authenticated;
drop trigger if exists discussion_topic_creator_membership on public.discussion_topics;
create trigger discussion_topic_creator_membership after insert on public.discussion_topics for each row execute procedure private.add_discussion_topic_creator();
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='discussion_topic_messages') then
   alter publication supabase_realtime add table public.discussion_topic_messages;
  end if;
 end if;
end $$;
