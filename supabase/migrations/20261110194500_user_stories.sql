-- Stories pessoais da comunidade. Depende da migration de admin_stories e do helper private.is_admin().

-- Stories pessoais públicos da comunidade, cada usuário controla os próprios.
create table if not exists public.user_stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'Usuário Uai' check (char_length(display_name) <= 80),
  username text not null default '' check (char_length(username) <= 32),
  avatar_url text,
  media_path text not null,
  media_url text not null check (media_url ~ '^https://'),
  media_type text not null check (media_type in ('image','video')),
  caption text not null default '' check (char_length(caption) <= 280),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  constraint user_stories_expiration_window check (expires_at > created_at and expires_at <= created_at + interval '24 hours'),
  constraint user_stories_own_storage_path check (media_path like author_id::text || '/stories/%')
);
create index if not exists user_stories_active_created_idx on public.user_stories (created_at) where expires_at > now();
alter table public.user_stories enable row level security;
revoke all privileges on public.user_stories from anon, authenticated;
grant select on public.user_stories to anon, authenticated;
grant insert, delete on public.user_stories to authenticated;
drop policy if exists "user_stories_read_active" on public.user_stories;
create policy "user_stories_read_active" on public.user_stories
  for select to anon, authenticated using (expires_at > now());
drop policy if exists "user_stories_insert_own" on public.user_stories;
create policy "user_stories_insert_own" on public.user_stories
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and media_path like (select auth.uid())::text || '/stories/%'
    and expires_at > now()
    and expires_at <= now() + interval '24 hours'
  );
drop policy if exists "user_stories_delete_own_or_admin" on public.user_stories;
create policy "user_stories_delete_own_or_admin" on public.user_stories
  for delete to authenticated
  using (author_id = (select auth.uid()) or (select private.is_admin()));
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_stories'
  ) then
    alter publication supabase_realtime add table public.user_stories;
  end if;
end $$;
-- Permitir Stories em imagem e vídeo no bucket compartilhado.
update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','video/mp4','video/webm']
where id = 'capital-do-trem-media';
