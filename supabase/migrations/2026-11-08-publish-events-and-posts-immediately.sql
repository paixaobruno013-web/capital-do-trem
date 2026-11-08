-- Permite que participantes registrados publiquem eventos e divulgações diretamente.
-- A propriedade do registro continua vinculada à conta autenticada.
drop policy if exists events_submit_pending on public.events;
create policy events_publish_immediately
on public.events
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and status = 'published'
);

drop policy if exists posts_submit_pending on public.posts;
create policy posts_publish_immediately
on public.posts
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and status = 'published'
);
