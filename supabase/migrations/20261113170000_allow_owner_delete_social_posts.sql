-- Permite que cada autor exclua qualquer publicação própria, inclusive já publicada.
-- A exclusão continua limitada pelo author_id autenticado; administradores mantêm acesso.
drop policy if exists posts_delete_own_pending_or_admin on public.posts;
drop policy if exists posts_delete_own_or_admin on public.posts;
create policy posts_delete_own_or_admin on public.posts
  for delete to authenticated
  using (
    author_id = (select auth.uid())
    or (select private.is_admin())
  );

create index if not exists posts_author_created_at_idx
  on public.posts (author_id, created_at desc);
