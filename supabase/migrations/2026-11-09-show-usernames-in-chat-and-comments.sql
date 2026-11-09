-- Identifica o autor pelo nome público e pelo @ em mensagens do chat e comentários.
create or replace function public.set_chat_author_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  profile_name text;
  profile_username text;
  profile_avatar_type text;
  profile_avatar_url text;
  profile_avatar_data jsonb;
begin
  select
    nullif(trim(p.display_name), ''),
    nullif(trim(p.username), ''),
    coalesce(p.avatar_type, 'default'),
    p.avatar_url,
    p.avatar_data
  into profile_name, profile_username, profile_avatar_type, profile_avatar_url, profile_avatar_data
  from public.profiles p
  where p.user_id = new.author_id;

  new.author_name := coalesce(profile_name, 'Usuário Uai')
    || case when profile_username is not null then ' · @' || profile_username else '' end;
  new.author_avatar_type := coalesce(profile_avatar_type, 'default');
  new.author_avatar_url := profile_avatar_url;
  new.author_avatar_data := profile_avatar_data;
  return new;
end;
$function$;

create or replace function public.set_community_author_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  profile_name text;
  profile_username text;
  profile_avatar_type text;
  profile_avatar_url text;
  profile_avatar_data jsonb;
begin
  select
    nullif(trim(p.display_name), ''),
    nullif(trim(p.username), ''),
    p.avatar_type,
    p.avatar_url,
    p.avatar_data
  into profile_name, profile_username, profile_avatar_type, profile_avatar_url, profile_avatar_data
  from public.profiles p
  where p.user_id = new.author_id;

  new.author_name := coalesce(profile_name, 'Usuário Uai')
    || case when profile_username is not null then ' · @' || profile_username else '' end;
  new.author_avatar_type := coalesce(profile_avatar_type, 'default');
  new.author_avatar_url := profile_avatar_url;
  new.author_avatar_data := profile_avatar_data;
  return new;
end;
$function$;

revoke all on function public.set_chat_author_identity() from public, anon, authenticated;
revoke all on function public.set_community_author_name() from public, anon, authenticated;
