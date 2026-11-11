-- Artistas publicam suas próprias músicas diretamente no catálogo, sem fila de aprovação.
drop policy if exists "songs_insert_artist_pending_or_admin" on public.songs;
drop policy if exists "songs_insert_artist_published_or_admin" on public.songs;
create policy "songs_insert_artist_published_or_admin" on public.songs
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      (
        status = 'published'
        and exists (
          select 1 from public.artists a
          where a.user_id = (select auth.uid())
        )
      )
      or (select private.is_admin())
    )
  );
