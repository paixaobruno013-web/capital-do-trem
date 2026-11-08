-- Move SECURITY DEFINER helpers out of the exposed public API schema.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

create or replace function private.bootstrap_first_admin()
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
begin
  if current_user_id is null or current_email <> 'capitaldotrem07@gmail.com' then
    raise exception 'Conta não autorizada para configurar o primeiro administrador.';
  end if;

  if exists (select 1 from public.admin_users) then
    return exists (
      select 1 from public.admin_users where user_id = current_user_id
    );
  end if;

  insert into public.admin_users(user_id) values (current_user_id)
  on conflict (user_id) do nothing;
  return exists (
    select 1 from public.admin_users where user_id = current_user_id
  );
end;
$$;
revoke all on function private.bootstrap_first_admin() from public;
grant execute on function private.bootstrap_first_admin() to authenticated;

-- Preserve existing RLS policy behavior while moving admin checks to private.
do $$
declare
  p record;
  v_sql text;
  v_qual text;
  v_check text;
begin
  for p in
    select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    from pg_policies
    where (qual is not null and qual like '%is_admin()%')
       or (with_check is not null and with_check like '%is_admin()%')
  loop
    v_qual := case when p.qual is null then null
      else replace(p.qual, 'is_admin()', 'private.is_admin()') end;
    v_check := case when p.with_check is null then null
      else replace(p.with_check, 'is_admin()', 'private.is_admin()') end;

    v_sql := format(
      'create policy %I on %I.%I as %s for %s to %s',
      p.policyname, p.schemaname, p.tablename, p.permissive, p.cmd,
      array_to_string(p.roles, ', ')
    );
    if v_qual is not null then
      v_sql := v_sql || format(' using (%s)', v_qual);
    end if;
    if v_check is not null then
      v_sql := v_sql || format(' with check (%s)', v_check);
    end if;

    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    execute v_sql;
  end loop;
end;
$$;

drop function if exists public.is_admin();

create or replace function public.is_admin()
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.is_admin(); $$;
revoke all on function public.is_admin() from public;
revoke execute on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.bootstrap_first_admin()
returns boolean language sql security invoker set search_path = ''
as $$ select private.bootstrap_first_admin(); $$;
revoke all on function public.bootstrap_first_admin() from public;
grant execute on function public.bootstrap_first_admin() to authenticated;
