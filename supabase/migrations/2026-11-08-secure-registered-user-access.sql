

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


-- Impede que uma conta consulte bloqueios entre duas outras pessoas.
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
