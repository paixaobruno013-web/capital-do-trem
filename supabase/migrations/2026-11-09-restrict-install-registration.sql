-- O registro de instalação é feito após o login, sem escrita anônima.
revoke insert on public.app_installations from anon;
drop policy if exists app_installations_register on public.app_installations;
create policy app_installations_register on public.app_installations
  for insert to authenticated with check (true);
