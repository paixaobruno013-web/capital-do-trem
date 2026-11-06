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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Atualizações aditivas para projetos que já tenham a tabela profiles criada.
alter table public.profiles add column if not exists account_type text not null default 'user';
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists city text not null default '';
alter table public.profiles add column if not exists is_public boolean not null default false;
alter table public.profiles alter column account_type set default 'user';
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

-- Função segura para verificar administradores sem expor a lista.
create or replace function public.is_admin()
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

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

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

-- Ativar proteção por linha em todas as tabelas.
alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.events enable row level security;
alter table public.artists enable row level security;
alter table public.posts enable row level security;

-- Permissões de tabela: o RLS continua controlando cada linha.
grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;
grant select on public.events, public.artists, public.posts to anon, authenticated;
grant insert, update, delete on public.events, public.artists, public.posts to authenticated;

-- Perfis: cada usuário vê e altera apenas o próprio registro.
drop policy if exists "profile_read_own" on public.profiles;
create policy "profile_read_own" on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()));

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
  using (is_public = true);

-- A tabela admin_users não recebe políticas para usuários comuns:
-- somente operações administrativas pelo painel seguro/SQL podem alterá-la.

-- Eventos: público vê apenas aprovados; administrador vê todos.
drop policy if exists "events_read_published_or_admin" on public.events;
create policy "events_read_published_or_admin" on public.events
  for select to anon, authenticated
  using (
    status = 'published'
    or created_by = (select auth.uid())
    or (select public.is_admin())
  );

drop policy if exists "events_submit_pending" on public.events;
create policy "events_submit_pending" on public.events
  for insert to authenticated
  with check (created_by = (select auth.uid()) and status = 'pending');

drop policy if exists "events_edit_own_pending_or_admin" on public.events;
create policy "events_edit_own_pending_or_admin" on public.events
  for update to authenticated
  using (
    (created_by = (select auth.uid()) and status = 'pending')
    or (select public.is_admin())
  )
  with check (
    (created_by = (select auth.uid()) and status = 'pending')
    or (select public.is_admin())
  );

drop policy if exists "events_delete_admin" on public.events;
create policy "events_delete_admin" on public.events
  for delete to authenticated
  using ((select public.is_admin()));

-- Artistas: artista gerencia o próprio perfil; público vê perfis aprovados.
drop policy if exists "artists_read_published_or_owner_or_admin" on public.artists;
create policy "artists_read_published_or_owner_or_admin" on public.artists
  for select to anon, authenticated
  using (
    status = 'published'
    or user_id = (select auth.uid())
    or (select public.is_admin())
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
    or (select public.is_admin())
  )
  with check (
    (user_id = (select auth.uid()) and status = 'pending')
    or (select public.is_admin())
  );

drop policy if exists "artists_delete_own_or_admin" on public.artists;
create policy "artists_delete_own_or_admin" on public.artists
  for delete to authenticated
  using (
    (user_id = (select auth.uid()) and status = 'pending')
    or (select public.is_admin())
  );

-- Mural: publicações aguardam aprovação; autor pode corrigir as próprias pendentes.
drop policy if exists "posts_read_published_or_owner_or_admin" on public.posts;
create policy "posts_read_published_or_owner_or_admin" on public.posts
  for select to anon, authenticated
  using (
    status = 'published'
    or author_id = (select auth.uid())
    or (select public.is_admin())
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
    or (select public.is_admin())
  )
  with check (
    (author_id = (select auth.uid()) and status = 'pending')
    or (select public.is_admin())
  );

drop policy if exists "posts_delete_own_pending_or_admin" on public.posts;
create policy "posts_delete_own_pending_or_admin" on public.posts
  for delete to authenticated
  using (
    (author_id = (select auth.uid()) and status = 'pending')
    or (select public.is_admin())
  );

-- Armazenamento público de cartazes e fotos.
-- Os arquivos ficam em pastas com o UUID do usuário que fez o envio.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'capital-do-trem-media',
  'capital-do-trem-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
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
      or (select public.is_admin())
    )
  );

-- IMPORTANTE: não coloque a chave service_role no site ou no aplicativo.
-- Cadastre o primeiro administrador manualmente em admin_users, usando o UUID
-- do usuário já cadastrado no Supabase. Nunca permita que o cliente altere essa tabela.
