-- A área Pesquisa e suas interações de vídeo foram retiradas do aplicativo.
-- Preserve os registros para eventual auditoria, mas encerre leitura pública e novas gravações.
alter table public.video_likes enable row level security;
alter table public.video_comments enable row level security;

revoke all on table public.video_likes, public.video_comments from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.video_likes, public.video_comments
  from authenticated;
grant select on table public.video_likes, public.video_comments to authenticated;

drop policy if exists video_likes_read_all on public.video_likes;
drop policy if exists video_likes_insert_own on public.video_likes;
drop policy if exists video_likes_delete_own on public.video_likes;
drop policy if exists video_likes_require_registered_user on public.video_likes;
drop policy if exists video_comments_read_all on public.video_comments;
drop policy if exists video_comments_insert_own on public.video_comments;
drop policy if exists video_comments_delete_own on public.video_comments;
drop policy if exists video_comments_require_registered_user on public.video_comments;

create policy video_likes_read_own_or_admin
on public.video_likes
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy video_comments_read_own_or_admin
on public.video_comments
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));
