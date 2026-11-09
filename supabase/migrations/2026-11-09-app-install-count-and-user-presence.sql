-- Presença online e registro de instalações do Capital do Trem.
create table if not exists public.app_installations (
  installation_id uuid primary key,
  first_seen_at timestamptz not null default now()
);
alter table public.app_installations enable row level security;
revoke all on public.app_installations from public;
grant select, insert on public.app_installations to anon, authenticated;
drop policy if exists app_installations_read_count on public.app_installations;
create policy app_installations_read_count on public.app_installations
  for select to anon, authenticated using (true);
drop policy if exists app_installations_register on public.app_installations;
create policy app_installations_register on public.app_installations
  for insert to anon, authenticated with check (true);

create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);
alter table public.user_presence enable row level security;
revoke all on public.user_presence from public;
grant select on public.user_presence to anon, authenticated;
grant insert, update on public.user_presence to authenticated;
drop policy if exists user_presence_public_read on public.user_presence;
create policy user_presence_public_read on public.user_presence
  for select to anon, authenticated using (true);
drop policy if exists user_presence_write_own on public.user_presence;
create policy user_presence_write_own on public.user_presence
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists user_presence_update_own on public.user_presence;
create policy user_presence_update_own on public.user_presence
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
