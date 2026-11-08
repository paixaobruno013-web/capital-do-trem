create or replace function private.bootstrap_first_admin()
returns boolean
language plpgsql
security definer
set search_path = ''
as $func$
declare
  current_user_id uuid := (select auth.uid());
  confirmed_owner boolean := false;
begin
  if current_user_id is null then
    raise exception 'Entre na conta do proprietário para configurar a administração.';
  end if;
  select
    lower(coalesce(u.email, '')) = 'capitaldotrem07@gmail.com'
    and u.email_confirmed_at is not null
  into confirmed_owner
  from auth.users u
  where u.id = current_user_id;
  if coalesce(confirmed_owner, false) is not true then
    raise exception 'Somente a conta proprietária com e-mail confirmado pode configurar a administração.';
  end if;
  if exists (select 1 from public.admin_users) then
    return exists (select 1 from public.admin_users where user_id = current_user_id);
  end if;
  insert into public.admin_users(user_id) values (current_user_id)
  on conflict (user_id) do nothing;
  return exists (select 1 from public.admin_users where user_id = current_user_id);
end;
$func$;
revoke all on function private.bootstrap_first_admin() from public;
grant execute on function private.bootstrap_first_admin() to authenticated;
