-- Área de apoiadores: leitura pública apenas de itens ativos; gestão exclusiva de administradores.
create table if not exists public.supporter_media (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  description text not null default '',
  media_type text not null check (media_type in ('image','video')),
  media_url text not null,
  storage_path text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.supporter_media enable row level security;
grant select on public.supporter_media to anon, authenticated;
grant insert, update, delete on public.supporter_media to authenticated;
drop policy if exists "supporter media public read active" on public.supporter_media;
create policy "supporter media public read active"
on public.supporter_media for select
to anon, authenticated
using (is_active = true or private.is_admin());
drop policy if exists "supporter media admin insert" on public.supporter_media;
create policy "supporter media admin insert"
on public.supporter_media for insert
to authenticated
with check (private.is_admin() and created_by = (select auth.uid()));
drop policy if exists "supporter media admin update" on public.supporter_media;
create policy "supporter media admin update"
on public.supporter_media for update
to authenticated
using (private.is_admin())
with check (private.is_admin() and created_by = (select auth.uid()));
drop policy if exists "supporter media admin delete" on public.supporter_media;
create policy "supporter media admin delete"
on public.supporter_media for delete
to authenticated
using (private.is_admin());
