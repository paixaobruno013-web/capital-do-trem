-- Eventos são publicações comunitárias: qualquer conta autenticada pode publicar.
-- Música continua restrita ao fluxo de envio de artistas; eventos podem usar apenas faixas já publicadas.
drop policy if exists events_publish_artist_or_admin on public.events;
drop policy if exists events_publish_immediately on public.events;
drop policy if exists events_submit_pending on public.events;
drop policy if exists events_insert_authenticated on public.events;
create policy events_insert_authenticated on public.events
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and status = 'published'
    and (
      music_song_id is null
      or exists (
        select 1 from public.songs s
        where s.id = music_song_id and s.status = 'published'
      )
    )
  );
