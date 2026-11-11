-- Interações próprias do Capital do Trem para vídeos incorporados.
-- O conteúdo audiovisual permanece hospedado no YouTube; somente interações são armazenadas aqui.
create table if not exists public.video_likes (
  id uuid primary key default gen_random_uuid(),
  youtube_video_id text not null check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (youtube_video_id, user_id)
);

create table if not exists public.video_comments (
  id uuid primary key default gen_random_uuid(),
  youtube_video_id text not null check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists video_likes_video_idx on public.video_likes(youtube_video_id);
create index if not exists video_likes_user_idx on public.video_likes(user_id);
create index if not exists video_comments_video_created_idx on public.video_comments(youtube_video_id, created_at desc);
create index if not exists video_comments_user_idx on public.video_comments(user_id);

alter table public.video_likes enable row level security;
alter table public.video_comments enable row level security;

revoke all on table public.video_likes, public.video_comments from anon, authenticated;
grant select on table public.video_likes, public.video_comments to anon, authenticated;
grant insert, delete on table public.video_likes to authenticated;
grant insert, delete on table public.video_comments to authenticated;

drop policy if exists video_likes_read_all on public.video_likes;
create policy video_likes_read_all on public.video_likes for select to anon, authenticated using (true);
drop policy if exists video_likes_insert_own on public.video_likes;
create policy video_likes_insert_own on public.video_likes for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists video_likes_delete_own on public.video_likes;
create policy video_likes_delete_own on public.video_likes for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists video_comments_read_all on public.video_comments;
create policy video_comments_read_all on public.video_comments for select to anon, authenticated using (true);
drop policy if exists video_comments_insert_own on public.video_comments;
create policy video_comments_insert_own on public.video_comments for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists video_comments_delete_own on public.video_comments;
create policy video_comments_delete_own on public.video_comments for delete to authenticated using (user_id = (select auth.uid()));
