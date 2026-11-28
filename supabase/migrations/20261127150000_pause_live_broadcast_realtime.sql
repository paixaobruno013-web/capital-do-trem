-- Pausa o feed realtime de metadados de lives enquanto transmissões estão adiadas.
-- Preserva tabela, registros e bucket para futura retomada sem perda de dados.
do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'live_broadcasts'
  ) then
    alter publication supabase_realtime drop table public.live_broadcasts;
  end if;
end
$$;
