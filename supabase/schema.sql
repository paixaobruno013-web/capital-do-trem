-- Capital do Trem — snapshot completo do banco (Supabase/PostgreSQL)
-- Reconstruído a partir do último snapshot limpo e das migrations incrementais
-- registradas até 2026-11-10.
-- ATENÇÃO: execute somente em um projeto Supabase NOVO e vazio.
-- No projeto de produção já conectado, NÃO execute este arquivo.
-- Não contém chaves, senhas ou credenciais.

-- Capital do Trem — estrutura inicial do banco de dados (Supabase/PostgreSQL)
-- Execute este arquivo uma única vez no SQL Editor do projeto Supabase.
-- Não contém chaves, senhas ou credenciais.

create extension if not exists pgcrypto;

-- Perfil básico: cada usuário só pode consultar e editar o próprio perfil.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  account_type text not null default 'user' check (account_type in ('user', 'artist')),
  bio text not null default '' check (char_length(bio) <= 500),
  city text not null default '' check (char_length(city) <= 100),
  is_public boolean not null default false,
  avatar_type text not null default 'default' check (avatar_type in ('default', 'photo', 'character')),
  avatar_url text,
  avatar_path text,
  avatar_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Atualizações aditivas para projetos que já tenham a tabela profiles criada.
alter table public.profiles add column if not exists account_type text not null default 'user';
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists city text not null default '';
alter table public.profiles add column if not exists is_public boolean not null default false;
alter table public.profiles add column if not exists avatar_type text not null default 'default';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists avatar_data jsonb;
alter table public.profiles alter column account_type set default 'user';
alter table public.profiles drop constraint if exists profiles_avatar_type_check;
alter table public.profiles add constraint profiles_avatar_type_check check (avatar_type in ('default', 'photo', 'character'));
update public.profiles set account_type = 'user' where account_type = 'fan';
alter table public.profiles drop constraint if exists profiles_account_type_check;
alter table public.profiles add constraint profiles_account_type_check check (account_type in ('user', 'artist'));
alter table public.profiles drop constraint if exists profiles_bio_check;
alter table public.profiles add constraint profiles_bio_check check (char_length(bio) <= 500);
alter table public.profiles drop constraint if exists profiles_city_check;
alter table public.profiles add constraint profiles_city_check check (char_length(city) <= 100);

-- Lista privada de administradores. Cadastros nesta tabela são feitos
-- manualmente pelo responsável no painel SQL, nunca pelo aplicativo.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Eventos, shows e ações sociais enviados para análise.
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 120),
  event_date date not null,
  event_time time,
  address text not null check (char_length(address) between 3 and 240),
  category text not null default 'show'
    check (category in ('show', 'evento', 'acao-social', 'outro')),
  description text not null default '' check (char_length(description) <= 2000),
  contact text not null default '' check (char_length(contact) <= 120),
  poster_url text,
  status text not null default 'pending'
    check (status in ('pending', 'published', 'rejected')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Perfil público do artista. O próprio usuário administra seus dados.
create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  artist_name text not null check (char_length(artist_name) between 2 and 100),
  style text not null default '' check (char_length(style) <= 80),
  city text not null default '' check (char_length(city) <= 100),
  instagram text not null default '' check (char_length(instagram) <= 120),
  youtube text not null default '' check (char_length(youtube) <= 240),
  bio text not null default '' check (char_length(bio) <= 1500),
  photo_url text,
  status text not null default 'pending'
    check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default now()
);

-- Mural de divulgações da comunidade.
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1500),
  status text not null default 'pending'
    check (status in ('pending', 'published', 'rejected')),
  created_at timestamptz not null default now()
);

-- Helpers privilegiados fora do schema exposto pela API.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- Verificação administrativa interna usada pelas políticas RLS.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

-- Primeiro administrador: somente o e-mail proprietário pode inicializar a conta.
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

  -- Confirma o endereço diretamente na tabela protegida do Supabase Auth.
  -- Não confia em metadados editáveis enviados pelo navegador.
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
    return exists (
      select 1 from public.admin_users
      where user_id = current_user_id
    );
  end if;

  insert into public.admin_users(user_id)
  values (current_user_id)
  on conflict (user_id) do nothing;

  return exists (
    select 1 from public.admin_users
    where user_id = current_user_id
  );
end;
$func$;
revoke all on function private.bootstrap_first_admin() from public;
grant execute on function private.bootstrap_first_admin() to authenticated;

create or replace function public.bootstrap_first_admin()
returns boolean
language sql
security invoker
set search_path = ''
as $func$ select private.bootstrap_first_admin(); $func$;
revoke all on function public.bootstrap_first_admin() from public;
grant execute on function public.bootstrap_first_admin() to authenticated;


-- RPC pública sem privilégios elevados; a verificação real fica no schema privado.
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_admin();
$$;
revoke all on function public.is_admin() from public;
revoke execute on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

-- Criar automaticamente um perfil quando alguém se cadastrar.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name, account_type)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'name', ''), 80),
    case when new.raw_user_meta_data ->> 'account_type' = 'artist' then 'artist' else 'user' end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Permitir que o próprio usuário escolha entre Usuário Uai e Artista.
-- A administração continua exclusivamente na tabela admin_users.
create or replace function public.protect_profile_account_type()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $func$
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
$func$;

drop trigger if exists profiles_protect_account_type on public.profiles;
create trigger profiles_protect_account_type
  before insert or update of account_type on public.profiles
  for each row execute function public.protect_profile_account_type();

-- Configurações públicas do site; escrita exclusiva da equipe administrativa.
create table if not exists public.site_settings (
  setting_key text primary key,
  setting_value text not null default '',
  updated_at timestamptz not null default now()
);

-- Ativar proteção por linha em todas as tabelas.
alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.events enable row level security;
alter table public.artists enable row level security;
alter table public.posts enable row level security;
alter table public.site_settings enable row level security;

-- Permissões mínimas para a API; RLS continua controlando cada linha.
revoke all privileges on all tables in schema public from anon, authenticated;
grant select on public.artists, public.events, public.posts, public.profiles, public.site_settings, public.songs to anon;
grant select on public.admin_users to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.artists, public.events, public.posts to authenticated;
grant select, insert, delete on public.chat_messages, public.song_comments, public.song_likes to authenticated;
grant select, insert, update, delete on public.site_settings, public.songs to authenticated;

-- Perfis: público vê somente perfis públicos; cada usuário também vê o próprio.
drop policy if exists "profile_read_own" on public.profiles;
drop policy if exists "profiles_read_public" on public.profiles;
create policy "profiles_read_public" on public.profiles
  for select to anon, authenticated
  using (is_public = true or user_id = (select auth.uid()));

drop policy if exists "profile_insert_own" on public.profiles;
create policy "profile_insert_own" on public.profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "profile_update_own" on public.profiles;
create policy "profile_update_own" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Perfis públicos: somente campos de apresentação, sem e-mail ou dados privados.
drop policy if exists "profiles_read_public" on public.profiles;
create policy "profiles_read_public" on public.profiles
  for select to anon, authenticated
  using (is_public = true or user_id = (select auth.uid()));

-- Configurações podem ser lidas pelo app; somente administradores podem alterá-las.
drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read" on public.site_settings
  for select to anon, authenticated using (setting_key in ('official_profile_image_url', 'app_opening_image_url') or (select private.is_admin()));
drop policy if exists "site_settings_admin_insert" on public.site_settings;
create policy "site_settings_admin_insert" on public.site_settings
  for insert to authenticated with check ((select private.is_admin()));
drop policy if exists "site_settings_admin_update" on public.site_settings;
create policy "site_settings_admin_update" on public.site_settings
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
drop policy if exists "site_settings_admin_delete" on public.site_settings
  for delete to authenticated using ((select private.is_admin()));

-- A tabela admin_users não recebe políticas para usuários comuns:
-- somente operações administrativas pelo painel seguro/SQL podem alterá-la.

-- Eventos: público vê apenas aprovados; administrador vê todos.
drop policy if exists "events_read_published_or_admin" on public.events;
create policy "events_read_published_or_admin" on public.events
  for select to anon, authenticated
  using (
    status = 'published'
    or created_by = (select auth.uid())
    or (select private.is_admin())
  );

drop policy if exists "events_submit_pending" on public.events;
drop policy if exists "events_publish_immediately" on public.events;
drop policy if exists "events_publish_artist_or_admin" on public.events;

drop policy if exists "events_edit_own_pending_or_admin" on public.events;
create policy "events_edit_own_pending_or_admin" on public.events
  for update to authenticated
  using (
    (created_by = (select auth.uid()) and status = 'pending')
    or (select private.is_admin())
  )
  with check (
    (created_by = (select auth.uid()) and status = 'pending')
    or (select private.is_admin())
  );

drop policy if exists "events_delete_admin" on public.events;
create policy "events_delete_admin" on public.events
  for delete to authenticated
  using ((select private.is_admin()));

-- Artistas: artista gerencia o próprio perfil; público vê perfis aprovados.
drop policy if exists "artists_read_published_or_owner_or_admin" on public.artists;
create policy "artists_read_published_or_owner_or_admin" on public.artists
  for select to anon, authenticated
  using (
    status = 'published'
    or user_id = (select auth.uid())
    or (select private.is_admin())
  );

drop policy if exists "artists_insert_own_pending" on public.artists;
create policy "artists_insert_own_pending" on public.artists
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');

drop policy if exists "artists_update_own_or_admin" on public.artists;
create policy "artists_update_own_or_admin" on public.artists
  for update to authenticated
  using (
    (user_id = (select auth.uid()) and status in ('pending', 'rejected'))
    or (select private.is_admin())
  )
  with check (
    (user_id = (select auth.uid()) and status = 'pending')
    or (select private.is_admin())
  );

drop policy if exists "artists_delete_own_or_admin" on public.artists;
create policy "artists_delete_own_or_admin" on public.artists
  for delete to authenticated
  using (
    (user_id = (select auth.uid()) and status = 'pending')
    or (select private.is_admin())
  );

-- Mural: publicações aguardam aprovação; autor pode corrigir as próprias pendentes.
drop policy if exists "posts_read_published_or_owner_or_admin" on public.posts;
create policy "posts_read_published_or_owner_or_admin" on public.posts
  for select to anon, authenticated
  using (
    status = 'published'
    or author_id = (select auth.uid())
    or (select private.is_admin())
  );

drop policy if exists "posts_submit_pending" on public.posts;
create policy "posts_submit_pending" on public.posts
  for insert to authenticated
  with check (author_id = (select auth.uid()) and status = 'pending');

drop policy if exists "posts_edit_own_pending_or_admin" on public.posts;
create policy "posts_edit_own_pending_or_admin" on public.posts
  for update to authenticated
  using (
    (author_id = (select auth.uid()) and status = 'pending')
    or (select private.is_admin())
  )
  with check (
    (author_id = (select auth.uid()) and status = 'pending')
    or (select private.is_admin())
  );

drop policy if exists "posts_delete_own_pending_or_admin" on public.posts;
create policy "posts_delete_own_pending_or_admin" on public.posts
  for delete to authenticated
  using (
    (author_id = (select auth.uid()) and status = 'pending')
    or (select private.is_admin())
  );


-- Catálogo de músicas: arquivos privados até a aprovação da equipe.
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  artist_name text not null check (char_length(artist_name) between 1 and 100),
  producer_name text not null default '' check (char_length(producer_name) <= 100),
  description text not null default '' check (char_length(description) <= 1000),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('audio/mpeg','audio/mp4','audio/aac','audio/wav','audio/ogg','audio/x-wav')),
  file_size bigint not null check (file_size > 0 and file_size <= 52428800),
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  created_at timestamptz not null default now()
);
alter table public.events
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists music_song_id uuid references public.songs(id) on delete set null;
alter table public.events
  drop constraint if exists events_latitude_range,
  add constraint events_latitude_range check (latitude is null or latitude between -90 and 90),
  drop constraint if exists events_longitude_range,
  add constraint events_longitude_range check (longitude is null or longitude between -180 and 180);
create index if not exists events_published_date_idx on public.events(status,event_date,event_time);
create policy "events_publish_artist_or_admin" on public.events
  for insert to authenticated
  with check (
    created_by=(select auth.uid())
    and status='published'
    and (
      (select private.is_admin())
      or exists (
        select 1 from public.profiles p
        where p.user_id=(select auth.uid()) and p.account_type='artist'
      )
    )
    and (
      music_song_id is null
      or exists (select 1 from public.songs s where s.id=music_song_id and s.status='published')
    )
  );
alter table public.songs enable row level security;
grant select, insert, update, delete on public.songs to authenticated;
grant select on public.songs to anon;

drop policy if exists "songs_read_published_owner_admin" on public.songs;
create policy "songs_read_published_owner_admin" on public.songs
  for select to anon, authenticated
  using (status='published' or user_id=(select auth.uid()) or (select private.is_admin()));
drop policy if exists "songs_insert_own_pending" on public.songs;
drop policy if exists "songs_insert_admin_only" on public.songs;
drop policy if exists "songs_insert_artist_or_admin" on public.songs;
create policy "songs_insert_artist_pending_or_admin" on public.songs
  for insert to authenticated
  with check (
    user_id=(select auth.uid())
    and (
      (status='pending' and exists (
        select 1 from public.artists a where a.user_id=(select auth.uid())
      ))
      or (select private.is_admin())
    )
  );
drop policy if exists "songs_update_own_pending_admin" on public.songs;
create policy "songs_update_own_pending_admin" on public.songs
  for update to authenticated
  using ((user_id=(select auth.uid()) and status in ('pending','rejected')) or (select private.is_admin()))
  with check ((user_id=(select auth.uid()) and status='pending') or (select private.is_admin()));
drop policy if exists "songs_delete_own_pending_admin" on public.songs;
create policy "songs_delete_own_pending_admin" on public.songs
  for delete to authenticated
  using ((user_id=(select auth.uid()) and status='pending') or (select private.is_admin()));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('capital-do-trem-audio','capital-do-trem-audio',false,52428800,
  array['audio/mpeg','audio/mp4','audio/aac','audio/wav','audio/ogg','audio/x-wav'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "audio_upload_own_folder" on storage.objects;
drop policy if exists "audio_upload_admin_only" on storage.objects;
drop policy if exists "audio_upload_artist_or_admin" on storage.objects;
create policy "audio_upload_artist_own_folder_or_admin" on storage.objects
  for insert to authenticated
  with check (
    bucket_id='capital-do-trem-audio'
    and (storage.foldername(name))[1]=(select auth.uid())::text
    and (
      (select private.is_admin())
      or exists (select 1 from public.artists a where a.user_id=(select auth.uid()))
    )
  );
drop policy if exists "audio_read_published_owner_admin" on storage.objects;
create policy "audio_read_published_owner_admin" on storage.objects
  for select to anon,authenticated
  using (bucket_id='capital-do-trem-audio' and (
    exists (select 1 from public.songs s where s.storage_path=storage.objects.name and s.status='published')
    or (storage.foldername(name))[1]=(select auth.uid())::text
    or (select private.is_admin())
  ));
drop policy if exists "audio_delete_owner_admin" on storage.objects;
create policy "audio_delete_owner_admin" on storage.objects
  for delete to authenticated
  using (bucket_id='capital-do-trem-audio' and (
    (storage.foldername(name))[1]=(select auth.uid())::text or (select private.is_admin())
  ));

-- Armazenamento público de cartazes e fotos.
-- Os arquivos ficam em pastas com o UUID do usuário que fez o envio.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'capital-do-trem-media',
  'capital-do-trem-media',
  true,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Leitura pública dos arquivos do bucket (necessária para cartazes/fotos aprovados).
drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'capital-do-trem-media');

-- Cada usuário autenticado só pode enviar arquivos para a própria pasta.
drop policy if exists "media_upload_own_folder" on storage.objects;
create policy "media_upload_own_folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'capital-do-trem-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- O usuário só pode substituir ou apagar arquivos da própria pasta.
drop policy if exists "media_update_own_folder" on storage.objects;
create policy "media_update_own_folder" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'capital-do-trem-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'capital-do-trem-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "media_delete_own_or_admin" on storage.objects;
create policy "media_delete_own_or_admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'capital-do-trem-media'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.is_admin())
    )
  );

-- IMPORTANTE: não coloque a chave service_role no site ou no aplicativo.
-- Cadastre o primeiro administrador manualmente em admin_users, usando o UUID
-- do usuário já cadastrado no Supabase. Nunca permita que o cliente altere essa tabela.


-- Recursos sociais e bate-papo (também disponíveis na migration separada).
-- Capital do Trem: curtidas, comentários e bate-papo comunitário.
-- Execute depois da migration 2026-11-06-music-catalog.sql.
-- Todas as interações exigem conta autenticada; mensagens usam nome público do perfil.

-- As políticas administrativas de envio já são definidas na seção do catálogo acima.

create table if not exists public.song_likes (
  song_id uuid not null references public.songs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (song_id, user_id)
);

create table if not exists public.song_comments (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Usuário Uai',
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default 'Usuário Uai',
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now(),
  author_avatar_type text not null default 'default' check (author_avatar_type in ('default', 'photo', 'character')),
  author_avatar_url text,
  author_avatar_data jsonb
);
alter table public.chat_messages add column if not exists author_avatar_type text not null default 'default';
alter table public.chat_messages add column if not exists author_avatar_url text;
alter table public.chat_messages add column if not exists author_avatar_data jsonb;
alter table public.chat_messages drop constraint if exists chat_messages_author_avatar_type_check;
alter table public.chat_messages add constraint chat_messages_author_avatar_type_check check (author_avatar_type in ('default', 'photo', 'character'));

create index if not exists song_comments_song_created_idx on public.song_comments(song_id, created_at);
create index if not exists chat_messages_created_idx on public.chat_messages(created_at desc);

alter table public.song_likes enable row level security;
alter table public.song_comments enable row level security;
alter table public.chat_messages enable row level security;

grant select, insert, delete on public.song_likes to authenticated;
grant select, insert, delete on public.song_comments to authenticated;
grant select, insert on public.chat_messages to authenticated;

drop policy if exists "song_likes_read_signed_in" on public.song_likes;
create policy "song_likes_read_signed_in" on public.song_likes
  for select to authenticated using (true);
drop policy if exists "song_likes_insert_self" on public.song_likes;
create policy "song_likes_insert_self" on public.song_likes
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "song_likes_delete_self_or_admin" on public.song_likes;
create policy "song_likes_delete_self_or_admin" on public.song_likes
  for delete to authenticated using (user_id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists "song_comments_read_signed_in" on public.song_comments;
create policy "song_comments_read_signed_in" on public.song_comments
  for select to authenticated using (true);
drop policy if exists "song_comments_insert_self" on public.song_comments;
create policy "song_comments_insert_self" on public.song_comments
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (select 1 from public.songs s where s.id = song_id and s.status = 'published')
  );
drop policy if exists "song_comments_delete_self_or_admin" on public.song_comments;
create policy "song_comments_delete_self_or_admin" on public.song_comments
  for delete to authenticated using (author_id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists "chat_messages_read_authenticated" on public.chat_messages;
create policy "chat_messages_read_authenticated" on public.chat_messages
  for select to authenticated using (true);
drop policy if exists "chat_messages_insert_self" on public.chat_messages;
create policy "chat_messages_insert_self" on public.chat_messages
  for insert to authenticated
  with check (author_id = (select auth.uid()));

-- Nome e avatar são obtidos do perfil salvo, nunca confiados ao navegador.
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
  select nullif(trim(p.display_name), ''), p.avatar_type, p.avatar_url, p.avatar_data
  into profile_name, profile_avatar_type, profile_avatar_url, profile_avatar_data
  from public.profiles p where p.user_id = new.author_id;
  new.author_name := coalesce(profile_name, 'Usuário Uai');
  new.author_avatar_type := coalesce(profile_avatar_type, 'default');
  new.author_avatar_url := profile_avatar_url;
  new.author_avatar_data := profile_avatar_data;
  return new;
end;
$func$;

drop trigger if exists song_comments_set_author_name on public.song_comments;
create trigger song_comments_set_author_name before insert on public.song_comments
  for each row execute procedure public.set_community_author_name();
drop trigger if exists chat_messages_set_author_name on public.chat_messages;
create trigger chat_messages_set_author_name before insert on public.chat_messages
  for each row execute procedure public.set_community_author_name();

-- Habilita atualização em tempo real para o chat, sem duplicar a publicação.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;


-- Moderação do bate-papo: somente administradores podem remover mensagens.
grant delete on public.chat_messages to authenticated;
drop policy if exists "chat_messages_delete_admin" on public.chat_messages;
create policy "chat_messages_delete_admin" on public.chat_messages
  for delete to authenticated using ((select private.is_admin()));

-- Curtidas somente em músicas já publicadas.
drop policy if exists "song_likes_insert_self" on public.song_likes;
create policy "song_likes_insert_self" on public.song_likes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.songs s where s.id = song_id and s.status = 'published')
  );



-- Mensagens privadas com convite/aceite, isolamento por participante e bloqueio.
create table if not exists public.private_conversations (
  id uuid primary key default gen_random_uuid(),
  participant_one uuid not null references auth.users(id) on delete cascade,
  participant_two uuid not null references auth.users(id) on delete cascade,
  initiated_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint private_conversations_distinct_participants check (participant_one <> participant_two),
  constraint private_conversations_ordered_participants check (participant_one < participant_two),
  constraint private_conversations_initiator check (initiated_by in (participant_one,participant_two)),
  unique (participant_one, participant_two)
);
create table if not exists public.private_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.private_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);
create table if not exists public.private_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint private_blocks_distinct check (blocker_id <> blocked_id)
);
create index if not exists private_conversations_one_idx on public.private_conversations(participant_one,status,updated_at desc);
create index if not exists private_conversations_two_idx on public.private_conversations(participant_two,status,updated_at desc);
create index if not exists private_messages_conversation_created_idx on public.private_messages(conversation_id,created_at);
alter table public.private_conversations enable row level security;
alter table public.private_messages enable row level security;
alter table public.private_blocks enable row level security;
revoke all on public.private_conversations, public.private_messages, public.private_blocks from anon, authenticated;
grant select,insert,update on public.private_conversations to authenticated;
grant select,insert on public.private_messages to authenticated;
grant select,insert,delete on public.private_blocks to authenticated;
drop policy if exists private_conversations_read_participants on public.private_conversations;
create policy private_conversations_read_participants on public.private_conversations
 for select to authenticated using (auth.uid() in (participant_one,participant_two));
drop policy if exists private_conversations_request_public_user on public.private_conversations;
create policy private_conversations_request_public_user on public.private_conversations
 for insert to authenticated with check (
   initiated_by=auth.uid()
   and auth.uid() in (participant_one,participant_two)
   and exists (select 1 from public.profiles p where p.user_id = case when participant_one=auth.uid() then participant_two else participant_one end and p.is_public=true)
   and not exists (select 1 from public.private_blocks b where
     (b.blocker_id=case when participant_one=auth.uid() then participant_two else participant_one end and b.blocked_id=auth.uid())
     or (b.blocker_id=auth.uid() and b.blocked_id=case when participant_one=auth.uid() then participant_two else participant_one end))
 );
drop policy if exists private_conversations_recipient_decision on public.private_conversations;
create policy private_conversations_recipient_decision on public.private_conversations
 for update to authenticated
 using (auth.uid() = case when initiated_by=participant_one then participant_two else participant_one end and status='pending')
 with check (auth.uid() = case when initiated_by=participant_one then participant_two else participant_one end and status in ('accepted','declined'));
drop policy if exists private_messages_read_accepted_participants on public.private_messages;
create policy private_messages_read_accepted_participants on public.private_messages
 for select to authenticated using (
   exists (select 1 from public.private_conversations c where c.id=conversation_id and c.status='accepted' and auth.uid() in (c.participant_one,c.participant_two))
   and not exists (
     select 1 from public.private_blocks b
     join public.private_conversations c on c.id=conversation_id
     where (b.blocker_id=auth.uid() and b.blocked_id=case when c.participant_one=auth.uid() then c.participant_two else c.participant_one end)
        or (b.blocker_id=case when c.participant_one=auth.uid() then c.participant_two else c.participant_one end and b.blocked_id=auth.uid())
   )
 );
drop policy if exists private_messages_insert_accepted_participants on public.private_messages;
create policy private_messages_insert_accepted_participants on public.private_messages
 for insert to authenticated with check (
   sender_id=auth.uid()
   and exists (
     select 1 from public.private_conversations c
     where c.id=conversation_id and c.status='accepted' and auth.uid() in (c.participant_one,c.participant_two)
       and not exists (select 1 from public.private_blocks b where
         (b.blocker_id=auth.uid() and b.blocked_id=case when c.participant_one=auth.uid() then c.participant_two else c.participant_one end)
         or (b.blocker_id=case when c.participant_one=auth.uid() then c.participant_two else c.participant_one end and b.blocked_id=auth.uid()))
   )
 );
drop policy if exists private_blocks_read_own on public.private_blocks;
create policy private_blocks_read_own on public.private_blocks
 for select to authenticated using (blocker_id=auth.uid());
drop policy if exists private_blocks_insert_own on public.private_blocks;
create policy private_blocks_insert_own on public.private_blocks
 for insert to authenticated with check (blocker_id=auth.uid());
drop policy if exists private_blocks_delete_own on public.private_blocks;
create policy private_blocks_delete_own on public.private_blocks
 for delete to authenticated using (blocker_id=auth.uid());
do $$
begin
 if exists (select 1 from pg_publication where pubname='supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='private_messages') then
   alter publication supabase_realtime add table public.private_messages;
 end if;
end $$;



-- Índices e chamadas auth.uid() preparadas para desempenho em RLS.
create index if not exists private_blocks_blocked_idx on public.private_blocks(blocked_id);
create index if not exists private_conversations_initiated_idx on public.private_conversations(initiated_by);
create index if not exists private_messages_sender_idx on public.private_messages(sender_id);
drop policy if exists private_conversations_read_participants on public.private_conversations;
create policy private_conversations_read_participants on public.private_conversations for select to authenticated using ((select auth.uid()) in(participant_one,participant_two));
drop policy if exists private_conversations_request_public_user on public.private_conversations;
create policy private_conversations_request_public_user on public.private_conversations for insert to authenticated with check(
 initiated_by=(select auth.uid()) and (select auth.uid()) in(participant_one,participant_two)
 and exists(select 1 from public.profiles p where p.user_id=case when participant_one=(select auth.uid()) then participant_two else participant_one end and p.is_public=true)
 and not exists(select 1 from public.private_blocks b where
 (b.blocker_id=case when participant_one=(select auth.uid()) then participant_two else participant_one end and b.blocked_id=(select auth.uid()))
 or (b.blocker_id=(select auth.uid()) and b.blocked_id=case when participant_one=(select auth.uid()) then participant_two else participant_one end))
);
drop policy if exists private_conversations_recipient_decision on public.private_conversations;
create policy private_conversations_recipient_decision on public.private_conversations for update to authenticated
 using((select auth.uid())=case when initiated_by=participant_one then participant_two else participant_one end and status='pending')
 with check((select auth.uid())=case when initiated_by=participant_one then participant_two else participant_one end and status in('accepted','declined'));
drop policy if exists private_messages_read_accepted_participants on public.private_messages;
create policy private_messages_read_accepted_participants on public.private_messages for select to authenticated using(
 exists(select 1 from public.private_conversations c where c.id=conversation_id and c.status='accepted' and (select auth.uid()) in(c.participant_one,c.participant_two))
 and not exists(select 1 from public.private_blocks b join public.private_conversations c on c.id=conversation_id
 where (b.blocker_id=(select auth.uid()) and b.blocked_id=case when c.participant_one=(select auth.uid()) then c.participant_two else c.participant_one end)
 or (b.blocker_id=case when c.participant_one=(select auth.uid()) then c.participant_two else c.participant_one end and b.blocked_id=(select auth.uid())))
);
drop policy if exists private_messages_insert_accepted_participants on public.private_messages;
create policy private_messages_insert_accepted_participants on public.private_messages for insert to authenticated with check(
 sender_id=(select auth.uid()) and exists(select 1 from public.private_conversations c where c.id=conversation_id and c.status='accepted'
 and (select auth.uid()) in(c.participant_one,c.participant_two)
 and not exists(select 1 from public.private_blocks b where
 (b.blocker_id=(select auth.uid()) and b.blocked_id=case when c.participant_one=(select auth.uid()) then c.participant_two else c.participant_one end)
 or (b.blocker_id=case when c.participant_one=(select auth.uid()) then c.participant_two else c.participant_one end and b.blocked_id=(select auth.uid()))))
);
drop policy if exists private_blocks_read_own on public.private_blocks;
create policy private_blocks_read_own on public.private_blocks for select to authenticated using(blocker_id=(select auth.uid()));
drop policy if exists private_blocks_insert_own on public.private_blocks;
create policy private_blocks_insert_own on public.private_blocks for insert to authenticated with check(blocker_id=(select auth.uid()));
drop policy if exists private_blocks_delete_own on public.private_blocks;
create policy private_blocks_delete_own on public.private_blocks for delete to authenticated using(blocker_id=(select auth.uid()));



-- Função privada verifica bloqueio nos dois sentidos sem expor a lista de bloqueios.
create or replace function private.private_users_blocked(user_a uuid,user_b uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.private_blocks b where (b.blocker_id=user_a and b.blocked_id=user_b) or (b.blocker_id=user_b and b.blocked_id=user_a)); $$;
revoke all on function private.private_users_blocked(uuid,uuid) from public;
revoke execute on function private.private_users_blocked(uuid,uuid) from anon;
grant execute on function private.private_users_blocked(uuid,uuid) to authenticated;
drop policy if exists private_conversations_request_public_user on public.private_conversations;
create policy private_conversations_request_public_user on public.private_conversations for insert to authenticated with check(
 initiated_by=(select auth.uid()) and (select auth.uid()) in(participant_one,participant_two)
 and exists(select 1 from public.profiles p where p.user_id=case when participant_one=(select auth.uid()) then participant_two else participant_one end and p.is_public=true)
 and not private.private_users_blocked((select auth.uid()),case when participant_one=(select auth.uid()) then participant_two else participant_one end)
);
drop policy if exists private_messages_read_accepted_participants on public.private_messages;
create policy private_messages_read_accepted_participants on public.private_messages for select to authenticated using(
 exists(select 1 from public.private_conversations c where c.id=conversation_id and c.status='accepted' and (select auth.uid()) in(c.participant_one,c.participant_two))
 and not exists(select 1 from public.private_conversations c where c.id=conversation_id and private.private_users_blocked((select auth.uid()),case when c.participant_one=(select auth.uid()) then c.participant_two else c.participant_one end))
);
drop policy if exists private_messages_insert_accepted_participants on public.private_messages;
create policy private_messages_insert_accepted_participants on public.private_messages for insert to authenticated with check(
 sender_id=(select auth.uid()) and exists(select 1 from public.private_conversations c where c.id=conversation_id and c.status='accepted'
 and (select auth.uid()) in(c.participant_one,c.participant_two)
 and not private.private_users_blocked((select auth.uid()),case when c.participant_one=(select auth.uid()) then c.participant_two else c.participant_one end))
);
drop policy if exists private_conversations_touch_accepted on public.private_conversations;
create policy private_conversations_touch_accepted on public.private_conversations for update to authenticated
 using(status='accepted' and (select auth.uid()) in(participant_one,participant_two))
 with check(status='accepted' and (select auth.uid()) in(participant_one,participant_two));



-- Restringe transições de convite e combina as regras de UPDATE em uma política.
create or replace function private.protect_private_conversation_update()
returns trigger language plpgsql security invoker set search_path=''
as $$
declare recipient uuid;
begin
 if new.participant_one is distinct from old.participant_one
    or new.participant_two is distinct from old.participant_two
    or new.initiated_by is distinct from old.initiated_by then
   raise exception 'Os participantes do convite não podem ser alterados.';
 end if;
 recipient:=case when old.initiated_by=old.participant_one then old.participant_two else old.participant_one end;
 if old.status='pending' then
   if (select auth.uid()) is distinct from recipient or new.status not in('accepted','declined') then
     raise exception 'Somente quem recebeu o convite pode aceitar ou recusar.';
   end if;
 elsif old.status='accepted' then
   if (select auth.uid()) not in(old.participant_one,old.participant_two) or new.status<>'accepted' then
     raise exception 'Atualização não permitida para esta conversa.';
   end if;
 else
   raise exception 'Este convite já foi encerrado.';
 end if;
 return new;
end;
$$;
revoke all on function private.protect_private_conversation_update() from public;
revoke execute on function private.protect_private_conversation_update() from anon;
grant execute on function private.protect_private_conversation_update() to authenticated;
drop trigger if exists private_conversation_update_guard on public.private_conversations;
create trigger private_conversation_update_guard before update on public.private_conversations for each row execute function private.protect_private_conversation_update();
drop policy if exists private_conversations_recipient_decision on public.private_conversations;
drop policy if exists private_conversations_touch_accepted on public.private_conversations;
drop policy if exists private_conversations_update_participants on public.private_conversations;
create policy private_conversations_update_participants on public.private_conversations for update to authenticated
using(
 (status='pending' and (select auth.uid())=case when initiated_by=participant_one then participant_two else participant_one end)
 or (status='accepted' and (select auth.uid()) in(participant_one,participant_two))
)
with check(
 (status in('accepted','declined') and (select auth.uid())=case when initiated_by=participant_one then participant_two else participant_one end)
 or (status='accepted' and (select auth.uid()) in(participant_one,participant_two))
);



-- Também impede alterações dos identificadores e da data original do convite.
create or replace function private.protect_private_conversation_update()
returns trigger language plpgsql security invoker set search_path=''
as $$
declare recipient uuid;
begin
 if new.id is distinct from old.id or new.created_at is distinct from old.created_at
    or new.participant_one is distinct from old.participant_one
    or new.participant_two is distinct from old.participant_two
    or new.initiated_by is distinct from old.initiated_by then
   raise exception 'Os dados originais do convite não podem ser alterados.';
 end if;
 recipient:=case when old.initiated_by=old.participant_one then old.participant_two else old.participant_one end;
 if old.status='pending' then
   if (select auth.uid()) is distinct from recipient or new.status not in('accepted','declined') then
     raise exception 'Somente quem recebeu o convite pode aceitar ou recusar.';
   end if;
 elsif old.status='accepted' then
   if (select auth.uid()) not in(old.participant_one,old.participant_two) or new.status<>'accepted' then
     raise exception 'Atualização não permitida para esta conversa.';
   end if;
 else
   raise exception 'Este convite já foi encerrado.';
 end if;
 return new;
end;
$$;


-- Defesa adicional: sessões anônimas não podem usar permissões destinadas a contas cadastradas.
create or replace function private.is_registered_user()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $function$
  select (select auth.uid()) is not null
    and (select auth.jwt() ->> 'is_anonymous') is distinct from 'true';
$function$;
revoke all on function private.is_registered_user() from public;
revoke all on function private.is_registered_user() from anon;
grant execute on function private.is_registered_user() to authenticated;

-- Políticas restritivas são combinadas com AND às políticas permissivas existentes.
-- Visitantes sem sessão continuam vendo somente o conteúdo público já permitido.
drop policy if exists require_registered_user on public.profiles;
create policy require_registered_user on public.profiles
  as restrictive for all to authenticated
  using ((select private.is_registered_user()))
  with check ((select private.is_registered_user()));

drop policy if exists require_registered_user on public.admin_users;
create policy require_registered_user on public.admin_users
  as restrictive for all to authenticated
  using ((select private.is_registered_user()))
  with check ((select private.is_registered_user()));

drop policy if exists require_registered_user on public.events;
create policy require_registered_user on public.events
  as restrictive for all to authenticated
  using ((select private.is_registered_user()))
  with check ((select private.is_registered_user()));

drop policy if exists require_registered_user on public.artists;
create policy require_registered_user on public.artists
  as restrictive for all to authenticated
  using ((select private.is_registered_user()))
  with check ((select private.is_registered_user()));

drop policy if exists require_registered_user on public.posts;
create policy require_registered_user on public.posts
  as restrictive for all to authenticated
  using ((select private.is_registered_user()))
  with check ((select private.is_registered_user()));

drop policy if exists require_registered_user on public.songs;
create policy require_registered_user on public.songs
  as restrictive for all to authenticated
  using ((select private.is_registered_user()))
  with check ((select private.is_registered_user()));

drop policy if exists require_registered_user on public.song_likes;
create policy require_registered_user on public.song_likes
  as restrictive for all to authenticated
  using ((select private.is_registered_user()))
  with check ((select private.is_registered_user()));

drop policy if exists require_registered_user on public.song_comments;
create policy require_registered_user on public.song_comments
  as restrictive for all to authenticated
  using ((select private.is_registered_user()))
  with check ((select private.is_registered_user()));

drop policy if exists require_registered_user on public.chat_messages;
create policy require_registered_user on public.chat_messages
  as restrictive for all to authenticated
  using ((select private.is_registered_user()))
  with check ((select private.is_registered_user()));

drop policy if exists require_registered_user on public.site_settings;
create policy require_registered_user on public.site_settings
  as restrictive for all to authenticated
  using ((select private.is_registered_user()))
  with check ((select private.is_registered_user()));

drop policy if exists require_registered_user on public.private_conversations;
create policy require_registered_user on public.private_conversations
  as restrictive for all to authenticated
  using ((select private.is_registered_user()))
  with check ((select private.is_registered_user()));

drop policy if exists require_registered_user on public.private_messages;
create policy require_registered_user on public.private_messages
  as restrictive for all to authenticated
  using ((select private.is_registered_user()))
  with check ((select private.is_registered_user()));

drop policy if exists require_registered_user on public.private_blocks;
create policy require_registered_user on public.private_blocks
  as restrictive for all to authenticated
  using ((select private.is_registered_user()))
  with check ((select private.is_registered_user()));
drop policy if exists require_registered_user on storage.objects;
create policy require_registered_user on storage.objects
  as restrictive for all to authenticated
  using ((select private.is_registered_user()))
  with check ((select private.is_registered_user()));

-- ============================================================
-- Incremental migration: 2026-11-08-restrict-private-block-checks-to-participants.sql
-- ============================================================
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

-- ============================================================
-- Incremental migration: 2026-11-08-publish-events-and-posts-immediately.sql
-- ============================================================
-- Permite que participantes registrados publiquem eventos e divulgações diretamente.
-- A propriedade do registro continua vinculada à conta autenticada.
drop policy if exists events_submit_pending on public.events;
create policy events_publish_immediately
on public.events
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and status = 'published'
);

drop policy if exists posts_submit_pending on public.posts;
create policy posts_publish_immediately
on public.posts
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and status = 'published'
);

-- ============================================================
-- Incremental migration: 2026-11-09-unique-public-usernames.sql
-- ============================================================
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

-- ============================================================
-- Incremental migration: 2026-11-09-show-usernames-in-chat-and-comments.sql
-- ============================================================
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

-- ============================================================
-- Incremental migration: 2026-11-09-app-install-count-and-user-presence.sql
-- ============================================================
-- Presença online e registro de instalações do Capital do Trem.
create table if not exists public.app_installations (
  installation_id uuid primary key,
  first_seen_at timestamptz not null default now()
);
alter table public.app_installations enable row level security;
revoke all on public.app_installations from public;
grant select, insert on public.app_installations to anon, authenticated;
drop policy if exists app_installations_read_count on public.app_installations;
create policy app_installations_read_count on public.app_installations
  for select to anon, authenticated using (true);
drop policy if exists app_installations_register on public.app_installations;
create policy app_installations_register on public.app_installations
  for insert to anon, authenticated with check (true);

create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);
alter table public.user_presence enable row level security;
revoke all on public.user_presence from public;
grant select on public.user_presence to anon, authenticated;
grant insert, update on public.user_presence to authenticated;
drop policy if exists user_presence_public_read on public.user_presence;
create policy user_presence_public_read on public.user_presence
  for select to anon, authenticated using (true);
drop policy if exists user_presence_write_own on public.user_presence;
create policy user_presence_write_own on public.user_presence
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists user_presence_update_own on public.user_presence;
create policy user_presence_update_own on public.user_presence
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================
-- Incremental migration: 2026-11-09-restrict-install-registration.sql
-- ============================================================
-- O registro de instalação é feito após o login, sem escrita anônima.
revoke insert on public.app_installations from anon;
drop policy if exists app_installations_register on public.app_installations;
create policy app_installations_register on public.app_installations
  for insert to authenticated with check (true);

-- ============================================================
-- Incremental migration: 20261109181952_add_chat_message_media_attachments.sql
-- ============================================================
-- Suporte a anexos de imagem e áudio no Koe Fala Tu.
alter table public.chat_messages
  add column if not exists attachment_url text,
  add column if not exists attachment_type text,
  add column if not exists attachment_name text,
  add column if not exists attachment_mime text,
  add column if not exists attachment_size bigint;

alter table public.chat_messages
  drop constraint if exists chat_messages_attachment_type_check;
alter table public.chat_messages
  add constraint chat_messages_attachment_type_check
  check (attachment_type is null or attachment_type in ('image','video','audio'));

alter table public.chat_messages
  drop constraint if exists chat_messages_attachment_size_check;
alter table public.chat_messages
  add constraint chat_messages_attachment_size_check
  check (attachment_size is null or attachment_size between 1 and 20971520);

alter table public.chat_messages
  drop constraint if exists chat_messages_attachment_metadata_check;
alter table public.chat_messages
  add constraint chat_messages_attachment_metadata_check
  check (
    (attachment_url is null and attachment_type is null and attachment_name is null and attachment_mime is null and attachment_size is null)
    or
    (attachment_url is not null and attachment_type is not null and attachment_name is not null and attachment_mime is not null and attachment_size is not null)
  );

-- O bucket permite os mesmos formatos validados pelo cliente e limite de até 20 MB.
update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp',
      'video/mp4','video/webm',
      'audio/mpeg','audio/mp4','audio/aac','audio/ogg',
      'audio/wav','audio/x-wav','audio/webm'
    ]::text[]
where id = 'capital-do-trem-media';

-- ============================================================
-- Incremental migration: 20261109184837_restrict_music_upload_to_team_only.sql
-- ============================================================
-- Capital do Trem: somente a administração e equipe autorizada enviam arquivos musicais.
-- Remove as políticas permissivas anteriores, que continuavam liberando usuários comuns.
drop policy if exists "songs_insert_registered_users" on public.songs;
drop policy if exists "songs_insert_own_pending" on public.songs;
drop policy if exists "songs_insert_admin_only" on public.songs;
create policy "songs_insert_admin_only" on public.songs
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select private.is_admin())
  );

drop policy if exists "audio_upload_registered_users" on storage.objects;
drop policy if exists "audio_upload_own_folder" on storage.objects;
drop policy if exists "audio_upload_admin_only" on storage.objects;
create policy "audio_upload_admin_only" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'capital-do-trem-audio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select private.is_admin())
  );

-- Impede que o proprietário de um arquivo musical antigo apague o áudio de uma música publicada.
drop policy if exists "audio_delete_owner_admin" on storage.objects;
drop policy if exists "audio_delete_admin_only" on storage.objects;
create policy "audio_delete_admin_only" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'capital-do-trem-audio'
    and (select private.is_admin())
  );

-- ============================================================
-- Incremental migration: 20261109191500_allow_artist_song_uploads.sql
-- ============================================================
-- Capital do Trem: qualquer perfil Artista/DJ pode enviar suas músicas.
-- Usuários Uai continuam podendo ouvir, curtir, comentar e baixar.
create or replace function private.is_artist()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles
    where user_id = (select auth.uid())
      and account_type = 'artist'
  );
$function$;

revoke all on function private.is_artist() from public, anon;
grant execute on function private.is_artist() to authenticated;

drop policy if exists "songs_insert_admin_only" on public.songs;
drop policy if exists "songs_insert_artist_or_admin" on public.songs;

drop policy if exists "audio_upload_admin_only" on storage.objects;
drop policy if exists "audio_upload_artist_or_admin" on storage.objects;

drop policy if exists "audio_delete_admin_only" on storage.objects;
create policy "audio_delete_admin_only" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'capital-do-trem-audio'
    and (select private.is_admin())
  );

-- ============================================================
-- Incremental migration: 20261109193255_create_voice_video_calls_core.sql
-- ============================================================
-- Core metadata for voice/video calls. Media is handled by LiveKit; never store media tokens here.
create table public.calls (
  id uuid primary key default gen_random_uuid(),
  room_name text not null unique default ('ct-' || replace(gen_random_uuid()::text, '-', '')),
  conversation_id uuid null references public.private_conversations(id) on delete set null,
  initiator_id uuid not null references auth.users(id) on delete cascade,
  call_type text not null check (call_type in ('audio','video')),
  status text not null default 'ringing'
    check (status in ('ringing','active','ended','cancelled','failed')),
  max_participants smallint not null default 4 check (max_participants = 4),
  created_at timestamptz not null default now(),
  started_at timestamptz null,
  ended_at timestamptz null,
  ended_reason text null check (ended_reason is null or length(ended_reason) <= 120)
);

create table public.call_participants (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'participant' check (role in ('host','participant')),
  state text not null default 'invited'
    check (state in ('invited','ringing','joined','declined','left','missed','failed')),
  invited_at timestamptz not null default now(),
  joined_at timestamptz null,
  left_at timestamptz null,
  outcome text null check (outcome is null or length(outcome) <= 80),
  created_at timestamptz not null default now(),
  unique (call_id, user_id)
);

create table public.call_invites (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls(id) on delete cascade,
  invited_user_id uuid null references auth.users(id) on delete cascade,
  token_hash text null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  approved_at timestamptz null,
  revoked_at timestamptz null,
  used_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint call_invites_target_required check (
    invited_user_id is not null or token_hash is not null
  )
);

create index calls_initiator_created_idx on public.calls (initiator_id, created_at desc);
create index calls_conversation_created_idx on public.calls (conversation_id, created_at desc)
  where conversation_id is not null;
create index calls_status_created_idx on public.calls (status, created_at desc);
create index call_participants_user_state_idx on public.call_participants (user_id, state);
create index call_participants_call_state_idx on public.call_participants (call_id, state);
create index call_invites_call_expiry_idx on public.call_invites (call_id, expires_at);

alter table public.calls enable row level security;
alter table public.call_participants enable row level security;
alter table public.call_invites enable row level security;

revoke all on table public.calls, public.call_participants, public.call_invites from anon, authenticated;
grant all on table public.calls, public.call_participants, public.call_invites to service_role;

comment on table public.calls is 'Metadados de chamadas Capital do Trem; acesso somente pelo backend privilegiado.';
comment on table public.call_participants is 'Participantes e estados de chamadas; acesso somente pelo backend privilegiado.';
comment on table public.call_invites is 'Convites de chamadas; guardar somente hash de token, nunca token em texto puro.';

-- ============================================================
-- Incremental migration: 20261109193412_enforce_four_call_participants.sql
-- ============================================================
create or replace function public.enforce_call_participant_limit()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  call_status text;
  active_count integer;
begin
  select status
    into call_status
    from public.calls
   where id = new.call_id
   for update;

  if call_status is null then
    raise exception 'Chamada não encontrada' using errcode = '23503';
  end if;

  if call_status not in ('ringing', 'active') then
    raise exception 'Esta chamada não aceita novos participantes' using errcode = '23514';
  end if;

  select count(*)
    into active_count
    from public.call_participants
   where call_id = new.call_id
     and state in ('invited', 'ringing', 'joined');

  if active_count >= 4 then
    raise exception 'Limite de quatro participantes atingido' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger call_participants_enforce_limit
before insert on public.call_participants
for each row execute function public.enforce_call_participant_limit();

revoke all on function public.enforce_call_participant_limit() from public, anon, authenticated;

-- ============================================================
-- Incremental migration: 20261109193510_index_call_invites_and_document_backend_rls.sql
-- ============================================================
create index call_invites_invited_user_idx on public.call_invites (invited_user_id)
  where invited_user_id is not null;
create index call_invites_created_by_idx on public.call_invites (created_by);

create policy call_invites_backend_only
on public.call_invites
for all
to service_role
using (true)
with check (true);

create policy call_participants_backend_only
on public.call_participants
for all
to service_role
using (true)
with check (true);

create policy calls_backend_only
on public.calls
for all
to service_role
using (true)
with check (true);

-- ============================================================
-- Incremental migration: 20261109200000_enforce_single_active_call_per_user.sql
-- ============================================================
-- Prevent concurrent active calls by the same host and prevent a user
-- from joining two LiveKit rooms at once. These constraints close races
-- that application-level "check then insert" logic cannot safely prevent.
create unique index calls_one_active_per_initiator_idx
  on public.calls (initiator_id)
  where status in ('ringing', 'active');

create unique index call_participants_one_joined_call_per_user_idx
  on public.call_participants (user_id)
  where state = 'joined';

-- ============================================================
-- Incremental migration: 20261110130000_allow_chat_audio_media_uploads.sql
-- ============================================================
-- Permitir anexos de áudio no chat usando o bucket público de mídia.
-- Mantém os limites de tamanho e as políticas RLS existentes.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/webm'
]
where id = 'capital-do-trem-media';


-- Stories oficiais do administrador

-- Stories oficiais do administrador: visíveis por 24 horas.
create table if not exists public.admin_stories (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  media_path text not null,
  media_url text not null,
  media_type text not null check (media_type in ('image','video')),
  caption text not null default '' check (char_length(caption) <= 280),
  published boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  constraint admin_stories_expiration_after_creation check (expires_at > created_at)
);
alter table public.admin_stories enable row level security;
revoke all privileges on public.admin_stories from anon, authenticated;
grant select on public.admin_stories to anon, authenticated;
grant insert, delete on public.admin_stories to authenticated;
drop policy if exists "admin_stories_read_active_or_admin" on public.admin_stories;
create policy "admin_stories_read_active_or_admin" on public.admin_stories
  for select to anon, authenticated
  using ((published = true and expires_at > now()) or (select private.is_admin()));
drop policy if exists "admin_stories_insert_admin" on public.admin_stories;
create policy "admin_stories_insert_admin" on public.admin_stories
  for insert to authenticated
  with check (created_by = (select auth.uid()) and (select private.is_admin()));
drop policy if exists "admin_stories_delete_admin" on public.admin_stories;
create policy "admin_stories_delete_admin" on public.admin_stories
  for delete to authenticated
  using ((select private.is_admin()));
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'admin_stories'
  ) then
    alter publication supabase_realtime add table public.admin_stories;
  end if;
end $$;


-- Stories pessoais da comunidade

-- Stories pessoais públicos da comunidade, cada usuário controla os próprios.
create table if not exists public.user_stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default 'Usuário Uai' check (char_length(display_name) <= 80),
  username text not null default '' check (char_length(username) <= 32),
  avatar_url text,
  media_path text not null,
  media_url text not null check (media_url ~ '^https://'),
  media_type text not null check (media_type in ('image','video')),
  caption text not null default '' check (char_length(caption) <= 280),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  constraint user_stories_expiration_window check (expires_at > created_at and expires_at <= created_at + interval '24 hours'),
  constraint user_stories_own_storage_path check (media_path like author_id::text || '/stories/%')
);
create index if not exists user_stories_expiration_created_idx on public.user_stories (expires_at, created_at);
alter table public.user_stories enable row level security;
revoke all privileges on public.user_stories from anon, authenticated;
grant select on public.user_stories to anon, authenticated;
grant insert, delete on public.user_stories to authenticated;
drop policy if exists "user_stories_read_active" on public.user_stories;
create policy "user_stories_read_active" on public.user_stories
  for select to anon, authenticated using (expires_at > now());
drop policy if exists "user_stories_insert_own" on public.user_stories;
create policy "user_stories_insert_own" on public.user_stories
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and media_path like (select auth.uid())::text || '/stories/%'
    and expires_at > now()
    and expires_at <= now() + interval '24 hours'
  );
drop policy if exists "user_stories_delete_own_or_admin" on public.user_stories;
create policy "user_stories_delete_own_or_admin" on public.user_stories
  for delete to authenticated
  using (author_id = (select auth.uid()) or (select private.is_admin()));
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_stories'
  ) then
    alter publication supabase_realtime add table public.user_stories;
  end if;
end $$;
-- Permitir Stories em imagem e vídeo no bucket compartilhado.
update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','video/mp4','video/webm']
where id = 'capital-do-trem-media';


-- ============================================================
-- Galeria Privada central do administrador (envio voluntário, 48h)
-- A rotina agendada de exclusão e o segredo ficam na migration incremental.
-- ============================================================
create table if not exists public.private_gallery_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','video/mp4','video/webm')),
  file_size bigint not null check (file_size > 0 and file_size <= 20971520),
  consent_confirmed boolean not null default false check (consent_confirmed is true),
  sender_display_name text not null default 'Participante',
  sender_username text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '48 hours')
);
create index if not exists private_gallery_items_expiry_idx on public.private_gallery_items (expires_at);
create index if not exists private_gallery_items_user_idx on public.private_gallery_items (user_id, created_at desc);
alter table public.private_gallery_items enable row level security;
grant select, insert, delete on public.private_gallery_items to authenticated;

drop policy if exists private_gallery_read_owner_or_admin on public.private_gallery_items;
create policy private_gallery_read_owner_or_admin on public.private_gallery_items for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
drop policy if exists private_gallery_insert_with_consent on public.private_gallery_items;
create policy private_gallery_insert_with_consent on public.private_gallery_items for insert to authenticated
  with check (user_id = (select auth.uid()) and consent_confirmed is true);
drop policy if exists private_gallery_delete_owner_or_admin on public.private_gallery_items;
create policy private_gallery_delete_owner_or_admin on public.private_gallery_items for delete to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create or replace function private.capture_private_gallery_sender()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select coalesce(nullif(btrim(p.display_name), ''), 'Participante'), nullif(btrim(p.username), '')
    into new.sender_display_name, new.sender_username
    from public.profiles p where p.user_id = new.user_id;
  if new.sender_display_name is null then new.sender_display_name := 'Participante'; end if;
  new.expires_at := new.created_at + interval '48 hours';
  return new;
end;
$$;
drop trigger if exists private_gallery_capture_sender on public.private_gallery_items;
create trigger private_gallery_capture_sender before insert on public.private_gallery_items
for each row execute function private.capture_private_gallery_sender();

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('capital-do-trem-private-gallery','capital-do-trem-private-gallery',false,20971520,
  array['image/jpeg','image/png','image/webp','video/mp4','video/webm']::text[])
on conflict (id) do update set name=excluded.name, public=false,
  file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists private_gallery_upload_own_folder on storage.objects;
create policy private_gallery_upload_own_folder on storage.objects for insert to authenticated
  with check (bucket_id='capital-do-trem-private-gallery' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists private_gallery_admin_read_only on storage.objects;
create policy private_gallery_admin_read_only on storage.objects for select to authenticated
  using (bucket_id='capital-do-trem-private-gallery' and (select private.is_admin()));
drop policy if exists private_gallery_delete_owner_or_admin on storage.objects;
create policy private_gallery_delete_owner_or_admin on storage.objects for delete to authenticated
  using (bucket_id='capital-do-trem-private-gallery' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select private.is_admin())));


-- Regras atuais de participação voluntária no grupo geral e acesso às conversas privadas.
-- Participação voluntária no grupo geral e elegibilidade para conversas privadas.
create table if not exists public.chat_group_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz
);
create index if not exists chat_group_members_active_idx
  on public.chat_group_members(user_id) where left_at is null;
alter table public.chat_group_members enable row level security;
revoke all on public.chat_group_members from anon, authenticated;
grant select, insert, update on public.chat_group_members to authenticated;
drop policy if exists chat_group_members_read_self_or_admin on public.chat_group_members;
create policy chat_group_members_read_self_or_admin
  on public.chat_group_members for select to authenticated
  using ((select private.is_registered_user()) and (left_at is null or user_id=(select auth.uid()) or (select private.is_admin())));
drop policy if exists chat_group_members_join_self on public.chat_group_members;
create policy chat_group_members_join_self
  on public.chat_group_members for insert to authenticated
  with check (user_id=(select auth.uid()) and left_at is null and (select private.is_registered_user()));
drop policy if exists chat_group_members_update_self on public.chat_group_members;
create policy chat_group_members_update_self
  on public.chat_group_members for update to authenticated
  using (user_id=(select auth.uid()) and (select private.is_registered_user()))
  with check (user_id=(select auth.uid()) and (select private.is_registered_user()));

create or replace function private.is_current_chat_group_member()
returns boolean language sql stable security definer set search_path = ''
as $function$
  select exists (select 1 from public.chat_group_members gm
    where gm.user_id=(select auth.uid()) and gm.left_at is null);
$function$;
revoke all on function private.is_current_chat_group_member() from public, anon;
grant execute on function private.is_current_chat_group_member() to authenticated;

create or replace function private.can_start_private_chat(target_user_id uuid)
returns boolean language plpgsql stable security definer set search_path = ''
as $function$
declare current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null or target_user_id is null or target_user_id=current_user_id then return false; end if;
  return exists (select 1 from public.chat_group_members gm
    where gm.user_id=current_user_id and gm.left_at is null)
    and exists (select 1 from public.chat_messages cm where cm.author_id=current_user_id)
    and exists (select 1 from public.chat_group_members gm
    where gm.user_id=target_user_id and gm.left_at is null)
    and exists (select 1 from public.chat_messages cm where cm.author_id=target_user_id);
end;
$function$;
revoke all on function private.can_start_private_chat(uuid) from public, anon;
grant execute on function private.can_start_private_chat(uuid) to authenticated;

create or replace function public.active_chat_group_member_ids()
returns table(user_id uuid) language sql stable security invoker set search_path = ''
as $function$
  select gm.user_id from public.chat_group_members gm
  where gm.left_at is null and (select auth.uid()) is not null
    and (select private.is_registered_user())
    and exists (select 1 from public.chat_messages cm where cm.author_id=gm.user_id);
$function$;
revoke all on function public.active_chat_group_member_ids() from public, anon;
grant execute on function public.active_chat_group_member_ids() to authenticated;

-- Mensagens gerais: apenas membros ativos (e administração) podem ler; somente membros ativos enviam.
drop policy if exists "chat_messages_read_authenticated" on public.chat_messages;
drop policy if exists require_registered_user on public.chat_messages;
create policy chat_messages_read_group_members on public.chat_messages
  for select to authenticated
  using ((select private.is_current_chat_group_member()) or (select private.is_admin()));
drop policy if exists chat_messages_insert_self on public.chat_messages;
create policy chat_messages_insert_self on public.chat_messages
  for insert to authenticated
  with check (author_id=(select auth.uid())
    and (select private.is_registered_user())
    and (select private.is_current_chat_group_member()));

-- Remover políticas permissivas ALL antigas que permitiam contornar as regras por participante.
drop policy if exists require_registered_user on public.private_conversations;
drop policy if exists require_registered_user on public.private_messages;
drop policy if exists require_registered_user on public.private_blocks;

drop policy if exists private_conversations_request_public_user on public.private_conversations;
create policy private_conversations_request_public_user on public.private_conversations
  for insert to authenticated with check (
    initiated_by=(select auth.uid())
    and (select auth.uid()) in(participant_one,participant_two)
    and (select private.is_registered_user())
    and (select private.can_start_private_chat(
      case when participant_one=(select auth.uid()) then participant_two else participant_one end))
    and exists (select 1 from public.profiles p
      where p.user_id=case when participant_one=(select auth.uid()) then participant_two else participant_one end
        and p.is_public=true)
    and not (select private.private_users_blocked((select auth.uid()),
      case when participant_one=(select auth.uid()) then participant_two else participant_one end))
  );

drop policy if exists private_conversations_update_participants on public.private_conversations;
create policy private_conversations_update_participants on public.private_conversations
  for update to authenticated
  using (
    (status='pending'
      and (select auth.uid())=case when initiated_by=participant_one then participant_two else participant_one end
      and (select private.can_start_private_chat(
        case when participant_one=(select auth.uid()) then participant_two else participant_one end)))
    or (status='accepted' and (select auth.uid()) in(participant_one,participant_two))
  )
  with check (
    (status in('accepted','declined')
      and (select auth.uid())=case when initiated_by=participant_one then participant_two else participant_one end
      and (select private.can_start_private_chat(
        case when participant_one=(select auth.uid()) then participant_two else participant_one end)))
    or (status='accepted' and (select auth.uid()) in(participant_one,participant_two))
  );

drop policy if exists private_messages_read_accepted_participants on public.private_messages;
create policy private_messages_read_accepted_participants on public.private_messages
  for select to authenticated using (
    (select private.is_registered_user())
    and exists (select 1 from public.private_conversations c
      where c.id=conversation_id and c.status='accepted'
        and (select auth.uid()) in(c.participant_one,c.participant_two))
    and not exists (select 1 from public.private_conversations c
      where c.id=conversation_id and (select private.private_users_blocked((select auth.uid()),
        case when c.participant_one=(select auth.uid()) then c.participant_two else c.participant_one end)))
  );

drop policy if exists private_messages_insert_accepted_participants on public.private_messages;
create policy private_messages_insert_accepted_participants on public.private_messages
  for insert to authenticated with check (
    sender_id=(select auth.uid()) and (select private.is_registered_user())
    and exists (select 1 from public.private_conversations c
      where c.id=conversation_id and c.status='accepted'
        and (select auth.uid()) in(c.participant_one,c.participant_two)
        and not (select private.private_users_blocked((select auth.uid()),
          case when c.participant_one=(select auth.uid()) then c.participant_two else c.participant_one end)))
  );

-- Bloqueios continuam privados para a conta que os criou.
drop policy if exists private_blocks_read_own on public.private_blocks;
create policy private_blocks_read_own on public.private_blocks
  for select to authenticated using (blocker_id=(select auth.uid()) and (select private.is_registered_user()));
drop policy if exists private_blocks_insert_own on public.private_blocks;
create policy private_blocks_insert_own on public.private_blocks
  for insert to authenticated with check (blocker_id=(select auth.uid()) and (select private.is_registered_user()));
drop policy if exists private_blocks_delete_own on public.private_blocks;
create policy private_blocks_delete_own on public.private_blocks
  for delete to authenticated using (blocker_id=(select auth.uid()) and (select private.is_registered_user()));

-- Área pública de apoiadores do Capital do Trem.
create table if not exists public.supporter_media (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  description text not null default '',
  media_type text not null check (media_type in ('image','video')),
  media_url text not null,
  storage_path text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
alter table public.supporter_media enable row level security;
grant select on public.supporter_media to anon, authenticated;
grant insert, update, delete on public.supporter_media to authenticated;
drop policy if exists "supporter media public read active" on public.supporter_media;
create policy "supporter media public read active"
on public.supporter_media for select
to anon, authenticated
using (is_active = true or private.is_admin());
drop policy if exists "supporter media admin insert" on public.supporter_media;
create policy "supporter media admin insert"
on public.supporter_media for insert
to authenticated
with check (private.is_admin() and created_by = (select auth.uid()));
drop policy if exists "supporter media admin update" on public.supporter_media;
create policy "supporter media admin update"
on public.supporter_media for update
to authenticated
using (private.is_admin())
with check (private.is_admin() and created_by = (select auth.uid()));
drop policy if exists "supporter media admin delete" on public.supporter_media;
create policy "supporter media admin delete"
on public.supporter_media for delete
to authenticated
using (private.is_admin());
create index if not exists supporter_media_created_by_idx
on public.supporter_media(created_by);
