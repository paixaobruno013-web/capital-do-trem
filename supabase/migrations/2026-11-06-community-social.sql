-- Capital do Trem: curtidas, comentários e bate-papo comunitário.
-- Execute depois da migration 2026-11-06-music-catalog.sql.
-- Todas as interações exigem conta autenticada; mensagens usam nome público do perfil.

-- Corrige o envio de músicas: somente administradores autorizados podem enviar.
drop policy if exists "songs_insert_own_pending" on public.songs;
create policy "songs_insert_own_pending" on public.songs
  for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending' and (select public.is_admin()));

drop policy if exists "audio_upload_own_folder" on storage.objects;
create policy "audio_upload_own_folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'capital-do-trem-audio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_admin())
  );

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
  created_at timestamptz not null default now()
);

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
  for delete to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

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
  for delete to authenticated using (author_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "chat_messages_read_authenticated" on public.chat_messages;
create policy "chat_messages_read_authenticated" on public.chat_messages
  for select to authenticated using (true);
drop policy if exists "chat_messages_insert_self" on public.chat_messages;
create policy "chat_messages_insert_self" on public.chat_messages
  for insert to authenticated
  with check (author_id = (select auth.uid()));

-- O nome é obtido do perfil salvo, não do texto enviado pelo navegador.
create or replace function public.set_community_author_name()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare profile_name text;
begin
  select nullif(trim(p.display_name), '') into profile_name
  from public.profiles p where p.user_id = new.author_id;
  new.author_name := coalesce(profile_name, 'Usuário Uai');
  return new;
end;
$$;

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
  for delete to authenticated using ((select public.is_admin()));

-- Curtidas somente em músicas já publicadas.
drop policy if exists "song_likes_insert_self" on public.song_likes;
create policy "song_likes_insert_self" on public.song_likes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.songs s where s.id = song_id and s.status = 'published')
  );
