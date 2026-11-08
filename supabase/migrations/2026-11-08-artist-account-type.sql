-- Permite que cada pessoa escolha entre Usuário Uai e Artista.
-- A função de administrador continua sendo controlada exclusivamente por admin_users.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (user_id, display_name, account_type)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'name', ''), 80),
    case
      when new.raw_user_meta_data ->> 'account_type' = 'artist' then 'artist'
      else 'user'
    end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$function$;

create or replace function public.protect_profile_account_type()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if new.account_type is null or new.account_type not in ('user', 'artist') then
    if tg_op = 'UPDATE' then
      new.account_type := old.account_type;
    else
      new.account_type := 'user';
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists profiles_protect_account_type on public.profiles;
create trigger profiles_protect_account_type
before insert or update of account_type on public.profiles
for each row execute function public.protect_profile_account_type();
