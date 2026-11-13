-- Public follow graph for community profiles.
begin;
create table if not exists public.profile_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint profile_follows_pk primary key (follower_id, followed_id),
  constraint profile_follows_no_self check (follower_id <> followed_id)
);
create index if not exists profile_follows_followed_idx on public.profile_follows(followed_id, created_at desc);
alter table public.profile_follows enable row level security;
revoke all on table public.profile_follows from anon, authenticated;
grant select on table public.profile_follows to anon, authenticated;
grant insert, delete on table public.profile_follows to authenticated;
drop policy if exists profile_follows_public_read on public.profile_follows;
create policy profile_follows_public_read on public.profile_follows
  for select to anon, authenticated using (true);
drop policy if exists profile_follows_insert_own on public.profile_follows;
create policy profile_follows_insert_own on public.profile_follows
  for insert to authenticated with check (
    follower_id = (select auth.uid())
    and followed_id <> (select auth.uid())
    and exists (select 1 from public.profiles p where p.user_id = followed_id and p.is_public = true)
  );
drop policy if exists profile_follows_delete_own on public.profile_follows;
create policy profile_follows_delete_own on public.profile_follows
  for delete to authenticated using (follower_id = (select auth.uid()));
commit;
