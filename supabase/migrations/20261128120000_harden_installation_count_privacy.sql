-- Protege identificadores de instalação: clientes recebem somente a contagem agregada.
-- Mantém o registro autenticado existente e não altera nem apaga registros.
drop policy if exists app_installations_read_count on public.app_installations;
revoke select on public.app_installations from anon, authenticated;

create or replace function public.get_app_installation_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::bigint from public.app_installations;
$$;

revoke all on function public.get_app_installation_count() from public;
grant execute on function public.get_app_installation_count() to anon, authenticated;
