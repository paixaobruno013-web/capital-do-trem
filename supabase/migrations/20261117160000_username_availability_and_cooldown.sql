-- Validação pública de disponibilidade e limite de troca de username.
alter table public.profiles
  add column if not exists username_changed_at timestamptz;

create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select
    (select auth.uid()) is not null
    and lower(btrim(coalesce(p_username,''))) ~ '^[a-z0-9][a-z0-9_]{2,31}$'
    and not exists (
      select 1 from public.profiles p
      where lower(p.username)=lower(btrim(p_username))
        and p.user_id <> (select auth.uid())
    );
$$;
revoke all on function public.is_username_available(text) from public,anon;
grant execute on function public.is_username_available(text) to authenticated;

create or replace function private.guard_profile_username_change()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if new.username is distinct from old.username then
    if (select auth.uid()) is null or (select auth.uid()) <> old.user_id then
      raise exception 'Somente o titular da conta pode alterar o nome de usuário.';
    end if;
    if lower(new.username) !~ '^[a-z0-9][a-z0-9_]{2,31}$' then
      raise exception 'Nome de usuário inválido. Use de 3 a 32 caracteres: letras minúsculas, números e sublinhado.';
    end if;
    if old.username_changed_at is not null
       and old.username_changed_at > now() - interval '30 days' then
      raise exception 'Por segurança, o nome de usuário só pode ser alterado uma vez a cada 30 dias.';
    end if;
    new.username := lower(new.username);
    new.username_changed_at := now();
  end if;
  return new;
end;
$$;
revoke all on function private.guard_profile_username_change() from public,anon,authenticated;
drop trigger if exists profiles_guard_username_change on public.profiles;
create trigger profiles_guard_username_change
before update of username on public.profiles
for each row execute function private.guard_profile_username_change();
