-- Permite consultar bloqueios somente quando a conta autenticada participa do par.
create or replace function private.private_users_blocked(user_a uuid, user_b uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null
     or current_user_id not in (user_a, user_b) then
    raise exception 'Você só pode consultar bloqueios que envolvam sua própria conta.';
  end if;

  return exists (
    select 1 from public.private_blocks b
    where (b.blocker_id = user_a and b.blocked_id = user_b)
       or (b.blocker_id = user_b and b.blocked_id = user_a)
  );
end;
$function$;
revoke all on function private.private_users_blocked(uuid,uuid) from public;
revoke execute on function private.private_users_blocked(uuid,uuid) from anon;
grant execute on function private.private_users_blocked(uuid,uuid) to authenticated;
