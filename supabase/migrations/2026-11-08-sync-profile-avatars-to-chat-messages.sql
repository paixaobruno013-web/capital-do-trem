create or replace function public.set_community_author_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $func$
declare
  profile_name text;
  profile_avatar_type text;
  profile_avatar_url text;
  profile_avatar_data jsonb;
begin
  select
    nullif(trim(p.display_name), ''),
    p.avatar_type,
    p.avatar_url,
    p.avatar_data
  into
    profile_name,
    profile_avatar_type,
    profile_avatar_url,
    profile_avatar_data
  from public.profiles p
  where p.user_id = new.author_id;

  new.author_name := coalesce(profile_name, 'Usuário Uai');
  new.author_avatar_type := coalesce(profile_avatar_type, 'default');
  new.author_avatar_url := profile_avatar_url;
  new.author_avatar_data := profile_avatar_data;
  return new;
end;
$func$;
