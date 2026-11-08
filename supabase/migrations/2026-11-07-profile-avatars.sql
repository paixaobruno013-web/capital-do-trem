-- Capital do Trem: avatar sincronizado com a conta e exibido no bate-papo.
-- Aplicar depois de supabase/schema.sql. Usa o bucket público já existente
-- capital-do-trem-media; fotos de avatar são públicas para os participantes.
-- Garante perfil para contas criadas antes do trigger de perfil estar ativo.
insert into public.profiles (user_id, display_name, account_type)
select
  u.id,
  left(coalesce(u.raw_user_meta_data ->> 'name', ''), 80),
  case when u.raw_user_meta_data ->> 'account_type' = 'artist' then 'artist' else 'user' end
from auth.users u
on conflict (user_id) do nothing;

alter table public.profiles
  add column if not exists avatar_type text not null default 'default'
    check (avatar_type in ('default','photo','character')),
  add column if not exists avatar_url text,
  add column if not exists avatar_path text,
  add column if not exists avatar_data jsonb;

alter table public.chat_messages
  add column if not exists author_avatar_type text not null default 'default',
  add column if not exists author_avatar_url text,
  add column if not exists author_avatar_data jsonb;

create or replace function public.set_chat_author_identity()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  profile_name text;
  profile_avatar_type text;
  profile_avatar_url text;
  profile_avatar_data jsonb;
begin
  select
    nullif(trim(p.display_name), ''),
    coalesce(p.avatar_type, 'default'),
    p.avatar_url,
    p.avatar_data
  into profile_name, profile_avatar_type, profile_avatar_url, profile_avatar_data
  from public.profiles p where p.user_id = new.author_id;

  new.author_name := coalesce(profile_name, 'Usuário Uai');
  new.author_avatar_type := coalesce(profile_avatar_type, 'default');
  new.author_avatar_url := profile_avatar_url;
  new.author_avatar_data := profile_avatar_data;
  return new;
end;
$$;

drop trigger if exists chat_messages_set_author_name on public.chat_messages;
drop trigger if exists chat_messages_set_avatar on public.chat_messages;
create trigger chat_messages_set_avatar
  before insert on public.chat_messages
  for each row execute procedure public.set_chat_author_identity();

-- Atualiza também mensagens antigas com a identidade atual do perfil.
update public.chat_messages m
set author_avatar_type = coalesce(p.avatar_type, 'default'),
    author_avatar_url = p.avatar_url,
    author_avatar_data = p.avatar_data
from public.profiles p
where p.user_id = m.author_id;
