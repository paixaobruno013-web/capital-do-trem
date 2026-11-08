-- Otimiza políticas de leitura sem ampliar o acesso efetivo.
drop policy if exists "profile_read_own" on public.profiles;
drop policy if exists "profiles_read_public" on public.profiles;
create policy "profiles_read_public" on public.profiles
  for select to anon, authenticated
  using (is_public = true or user_id = (select auth.uid()));

-- A leitura já é coberta pela política pública; separa escrita administrativa.
drop policy if exists "site_settings_admin_manage" on public.site_settings;
create policy "site_settings_admin_insert" on public.site_settings
  for insert to authenticated
  with check ((select private.is_admin()));
create policy "site_settings_admin_update" on public.site_settings
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy "site_settings_admin_delete" on public.site_settings
  for delete to authenticated
  using ((select private.is_admin()));
