-- Curtidas e comentários nas divulgações públicas da comunidade.
create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Usuário Uai',
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post_created_idx on public.post_comments(post_id, created_at);
create index if not exists post_likes_post_id_idx on public.post_likes(post_id);
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
grant select on public.post_likes, public.post_comments to anon, authenticated;
grant insert, delete on public.post_likes to authenticated;
grant insert, delete on public.post_comments to authenticated;
drop policy if exists post_likes_read_public on public.post_likes;
create policy post_likes_read_public on public.post_likes for select to anon, authenticated using (
  exists (select 1 from public.posts p where p.id = post_id and p.status = 'published')
);
drop policy if exists post_likes_insert_self on public.post_likes;
create policy post_likes_insert_self on public.post_likes for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published')
);
drop policy if exists post_likes_delete_self on public.post_likes;
create policy post_likes_delete_self on public.post_likes for delete to authenticated using (user_id = (select auth.uid()));
drop policy if exists post_comments_read_public on public.post_comments;
create policy post_comments_read_public on public.post_comments for select to anon, authenticated using (
  exists (select 1 from public.posts p where p.id = post_id and p.status = 'published')
);
drop policy if exists post_comments_insert_self on public.post_comments;
create policy post_comments_insert_self on public.post_comments for insert to authenticated with check (
  author_id = (select auth.uid())
  and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published')
);
drop policy if exists post_comments_delete_self_or_admin on public.post_comments;
create policy post_comments_delete_self_or_admin on public.post_comments for delete to authenticated using (
  author_id = (select auth.uid()) or (select private.is_admin())
);
create or replace function public.set_post_comment_author_name()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare profile_name text;
begin
  select nullif(trim(p.display_name), '') into profile_name
  from public.profiles p where p.user_id = new.author_id;
  new.author_name := coalesce(profile_name, 'Usuário Uai');
  return new;
end;
$$;
drop trigger if exists post_comments_set_author_name on public.post_comments;
create trigger post_comments_set_author_name before insert on public.post_comments
for each row execute procedure public.set_post_comment_author_name();
