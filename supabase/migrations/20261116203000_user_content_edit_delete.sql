-- Permite que cada usuário edite ou exclua somente o próprio conteúdo.
-- Administradores mantêm a capacidade de moderação já prevista nas políticas existentes.

-- Publicações.
grant update, delete on public.posts to authenticated;
drop policy if exists posts_update_own_content on public.posts;
create policy posts_update_own_content on public.posts
for update to authenticated
using (author_id = (select auth.uid()) or (select private.is_admin()))
with check (author_id = (select auth.uid()) or (select private.is_admin()));
drop policy if exists posts_delete_own_content on public.posts;
create policy posts_delete_own_content on public.posts
for delete to authenticated
using (author_id = (select auth.uid()) or (select private.is_admin()));

-- Comentários: a exclusão própria já existe; acrescenta edição própria.
grant update on public.post_comments to authenticated;
drop policy if exists post_comments_update_own on public.post_comments;
create policy post_comments_update_own on public.post_comments
for update to authenticated
using (author_id = (select auth.uid()))
with check (author_id = (select auth.uid()));

-- Músicas: o dono pode editar metadados e excluir a própria faixa.
-- Mantém status, proprietário e caminho do arquivo protegidos contra autopublicação/troca.
grant update, delete on public.songs to authenticated;
drop policy if exists songs_update_own_pending_admin on public.songs;
drop policy if exists songs_delete_own_pending_admin on public.songs;
create or replace function private.protect_song_owner_metadata_update()
returns trigger language plpgsql security invoker set search_path = ''
as $
begin
  if (select auth.uid()) = old.user_id and not (select private.is_admin()) then
    if new.id is distinct from old.id
       or new.user_id is distinct from old.user_id
       or new.status is distinct from old.status
       or new.storage_path is distinct from old.storage_path
       or new.mime_type is distinct from old.mime_type
       or new.file_size is distinct from old.file_size
       or new.created_at is distinct from old.created_at then
      raise exception 'Somente a equipe pode alterar o status ou os dados do arquivo.';
    end if;
  end if;
  return new;
end;
$;
revoke all on function private.protect_song_owner_metadata_update() from public, anon, authenticated;
drop trigger if exists songs_protect_owner_metadata_update on public.songs;
create trigger songs_protect_owner_metadata_update
before update on public.songs
for each row execute function private.protect_song_owner_metadata_update();

drop policy if exists songs_update_own_or_admin on public.songs;
create policy songs_update_own_or_admin on public.songs
for update to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()))
with check (user_id = (select auth.uid()) or (select private.is_admin()));
drop policy if exists songs_delete_own_or_admin on public.songs;
create policy songs_delete_own_or_admin on public.songs
for delete to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

-- Mensagens do grupo: edição e exclusão pelo autor; administrador pode moderar.
grant update, delete on public.chat_messages to authenticated;
drop policy if exists chat_messages_update_own_or_admin on public.chat_messages;
create policy chat_messages_update_own_or_admin on public.chat_messages
for update to authenticated
using (author_id = (select auth.uid()) or (select private.is_admin()))
with check (author_id = (select auth.uid()) or (select private.is_admin()));
drop policy if exists chat_messages_delete_own_or_admin on public.chat_messages;
create policy chat_messages_delete_own_or_admin on public.chat_messages
for delete to authenticated
using (author_id = (select auth.uid()) or (select private.is_admin()));

-- Mensagens privadas: somente o remetente pode editar ou excluir.
grant update, delete on public.private_messages to authenticated;
drop policy if exists private_messages_update_sender on public.private_messages;
create policy private_messages_update_sender on public.private_messages
for update to authenticated
using (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.private_conversations c
    where c.id = private_messages.conversation_id
      and c.status = 'accepted'
      and (select auth.uid()) in (c.participant_one, c.participant_two)
  )
)
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.private_conversations c
    where c.id = private_messages.conversation_id
      and c.status = 'accepted'
      and (select auth.uid()) in (c.participant_one, c.participant_two)
  )
);
drop policy if exists private_messages_delete_sender on public.private_messages;
create policy private_messages_delete_sender on public.private_messages
for delete to authenticated
using (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.private_conversations c
    where c.id = private_messages.conversation_id
      and c.status = 'accepted'
      and (select auth.uid()) in (c.participant_one, c.participant_two)
  )
);
