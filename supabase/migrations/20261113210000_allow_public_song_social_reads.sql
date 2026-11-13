-- Permite que visitantes vejam curtidas e comentários de faixas publicadas.
-- Criar curtidas e comentários continua exigindo conta autenticada.
drop policy if exists song_likes_read_public_published on public.song_likes;
create policy song_likes_read_public_published
on public.song_likes
for select
to anon, authenticated
using (exists (select 1 from public.songs s where s.id = song_likes.song_id and s.status = 'published'));

drop policy if exists song_comments_read_public_published on public.song_comments;
create policy song_comments_read_public_published
on public.song_comments
for select
to anon, authenticated
using (exists (select 1 from public.songs s where s.id = song_comments.song_id and s.status = 'published'));
