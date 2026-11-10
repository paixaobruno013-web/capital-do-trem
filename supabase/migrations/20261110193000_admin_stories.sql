-- Stories oficiais do administrador — 24 horas, publicação protegida por RLS.

-- Stories oficiais do administrador: visíveis por 24 horas.
create table if not exists public.admin_stories (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  media_path text not null,
  media_url text not null,
  media_type text not null check (media_type in ('image','video')),
  caption text not null default '' check (char_length(caption) <= 280),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  constraint admin_stories_expiration_after_creation check (expires_at > created_at)
);
alter table public.admin_stories enable row level security;
revoke all privileges on public.admin_stories from anon, authenticated;
grant select on public.admin_stories to anon, authenticated;
grant insert, delete on public.admin_stories to authenticated;
drop policy if exists "admin_stories_read_active_or_admin" on public.admin_stories;
create policy "admin_stories_read_active_or_admin" on public.admin_stories
  for select to anon, authenticated
  using ((published = true and expires_at > now()) or (select private.is_admin()));
drop policy if exists "admin_stories_insert_admin" on public.admin_stories;
create policy "admin_stories_insert_admin" on public.admin_stories
  for insert to authenticated
  with check (created_by = (select auth.uid()) and (select private.is_admin()));
drop policy if exists "admin_stories_delete_admin" on public.admin_stories;
create policy "admin_stories_delete_admin" on public.admin_stories
  for delete to authenticated
  using ((select private.is_admin()));
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'admin_stories'
  ) then
    alter publication supabase_realtime add table public.admin_stories;
  end if;
end $$;
