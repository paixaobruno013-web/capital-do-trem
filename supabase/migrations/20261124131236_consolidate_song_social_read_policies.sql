-- Evita políticas permissivas duplicadas para leitura de comentários e curtidas.
-- Visitantes veem somente interações de músicas publicadas; usuários autenticados
-- também veem suas próprias interações e a equipe administrativa pode moderar.
drop policy if exists song_comments_read_public_published on public.song_comments;
drop policy if exists song_comments_read_signed_in on public.song_comments;
create policy song_comments_read_public_published on public.song_comments
for select to anon
using (exists (select 1 from public.songs s where s.id = song_comments.song_id and s.status = 'published'));
create policy song_comments_read_signed_in on public.song_comments
for select to authenticated
using (
  exists (select 1 from public.songs s where s.id = song_comments.song_id and s.status = 'published')
  or author_id = (select auth.uid())
  or (select private.is_admin())
);

drop policy if exists song_likes_read_public_published on public.song_likes;
drop policy if exists song_likes_read_signed_in on public.song_likes;
create policy song_likes_read_public_published on public.song_likes
for select to anon
using (exists (select 1 from public.songs s where s.id = song_likes.song_id and s.status = 'published'));
create policy song_likes_read_signed_in on public.song_likes
for select to authenticated
using (
  exists (select 1 from public.songs s where s.id = song_likes.song_id and s.status = 'published')
  or user_id = (select auth.uid())
  or (select private.is_admin())
);
