-- Capital do Trem — corrigir leitura dos próprios eventos pendentes.
-- Migração segura e repetível: não altera nem apaga registros.
drop policy if exists "events_read_published_or_admin" on public.events;
create policy "events_read_published_or_admin" on public.events
  for select to anon, authenticated
  using (
    status = 'published'
    or created_by = (select auth.uid())
    or (select public.is_admin())
  );
