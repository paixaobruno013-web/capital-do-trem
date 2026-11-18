-- Marcações de usuários em publicações com foto, vídeo ou texto.
-- Aplicar no Supabase SQL Editor antes de habilitar a funcionalidade no app.

create table if not exists public.post_mentions (
  post_id uuid not null references public.posts(id) on delete cascade,
  mentioned_user_id uuid not null references auth.users(id) on delete cascade,
  mentioned_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, mentioned_user_id),
  constraint post_mentions_no_self_tag check (mentioned_user_id <> mentioned_by)
);

create index if not exists post_mentions_user_created_idx
  on public.post_mentions(mentioned_user_id, created_at desc);
create index if not exists post_mentions_post_idx
  on public.post_mentions(post_id);

alter table public.post_mentions enable row level security;
revoke all on public.post_mentions from anon, public;
grant select, insert on public.post_mentions to authenticated;

drop policy if exists "post_mentions_read_published_posts" on public.post_mentions;
create policy "post_mentions_read_published_posts" on public.post_mentions
  for select to authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_mentions.post_id
        and p.status = 'published'
    )
  );

drop policy if exists "post_mentions_insert_post_owner_public_profiles" on public.post_mentions;
create policy "post_mentions_insert_post_owner_public_profiles" on public.post_mentions
  for insert to authenticated
  with check (
    mentioned_by = (select auth.uid())
    and mentioned_user_id <> (select auth.uid())
    and exists (
      select 1 from public.posts p
      where p.id = post_mentions.post_id
        and p.author_id = (select auth.uid())
        and p.status = 'published'
    )
    and exists (
      select 1 from public.profiles profile
      where profile.user_id = post_mentions.mentioned_user_id
        and profile.is_public = true
    )
  );
