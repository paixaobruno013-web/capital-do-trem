-- Identificador público único para todos os participantes.
alter table public.profiles add column if not exists username text;

update public.profiles
set username = 'uai_' || substr(replace(user_id::text, '-', ''), 1, 12)
where username is null or btrim(username) = '';

alter table public.profiles alter column username set not null;
create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  chosen_username text;
begin
  chosen_username := lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'username', ''), '[^a-zA-Z0-9_]', '', 'g'));
  if chosen_username !~ '^[a-z0-9][a-z0-9_]{2,31}$' then
    chosen_username := 'uai_' || substr(replace(new.id::text, '-', ''), 1, 12);
  end if;

  insert into public.profiles (user_id, display_name, username, account_type)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'name', ''), 80),
    chosen_username,
    case when new.raw_user_meta_data ->> 'account_type' = 'artist' then 'artist' else 'user' end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$function$;
