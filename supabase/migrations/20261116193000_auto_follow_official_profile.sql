-- Todo novo perfil passa a seguir automaticamente o perfil oficial do Capital do Trem.
-- O vínculo é criado no banco, sem depender do navegador ou do aparelho do usuário.

create table if not exists public.profile_follows (
  follower_id uuid not null references public.profiles(user_id) on delete cascade,
  following_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint profile_follows_no_self_follow check (follower_id <> following_id)
);

create index if not exists profile_follows_following_created_idx
  on public.profile_follows (following_id, created_at desc);
create index if not exists profile_follows_follower_created_idx
  on public.profile_follows (follower_id, created_at desc);

alter table public.profile_follows enable row level security;
revoke all on public.profile_follows from anon, authenticated;
grant select, insert, delete on public.profile_follows to authenticated;

drop policy if exists profile_follows_read_authenticated on public.profile_follows;
create policy profile_follows_read_authenticated
  on public.profile_follows for select to authenticated using (true);

drop policy if exists profile_follows_insert_self on public.profile_follows;
create policy profile_follows_insert_self
  on public.profile_follows for insert to authenticated
  with check (follower_id = (select auth.uid()) and follower_id <> following_id);

drop policy if exists profile_follows_delete_self on public.profile_follows;
create policy profile_follows_delete_self
  on public.profile_follows for delete to authenticated
  using (follower_id = (select auth.uid()));

create or replace function private.ensure_official_profile_follow(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  official_user_id uuid;
begin
  select p.user_id into official_user_id
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where lower(u.email) = 'capitaldotrem07@gmail.com'
  limit 1;

  if official_user_id is null then
    return;
  end if;

  if p_user_id is not null and p_user_id <> official_user_id then
    insert into public.profile_follows (follower_id, following_id)
    values (p_user_id, official_user_id)
    on conflict do nothing;
  elsif p_user_id is null or p_user_id = official_user_id then
    insert into public.profile_follows (follower_id, following_id)
    select p.user_id, official_user_id
    from public.profiles p
    where p.user_id <> official_user_id
    on conflict do nothing;
  end if;
end;
$$;

revoke all on function private.ensure_official_profile_follow(uuid) from public, anon, authenticated;

create or replace function private.auto_follow_official_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.ensure_official_profile_follow(new.user_id);
  return new;
end;
$$;

revoke all on function private.auto_follow_official_profile() from public, anon, authenticated;

drop trigger if exists profiles_auto_follow_official on public.profiles;
create trigger profiles_auto_follow_official
after insert on public.profiles
for each row execute function private.auto_follow_official_profile();

-- Também inclui quem já tinha conta, assim ninguém fica de fora.
select private.ensure_official_profile_follow(null);

-- Se o perfil oficial for criado depois desta migration, o trigger acima
-- também adicionará automaticamente todos os perfis existentes como seguidores.
