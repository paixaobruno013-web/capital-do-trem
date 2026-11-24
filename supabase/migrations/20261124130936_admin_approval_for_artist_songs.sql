-- Fila de revisão de músicas: MCs/DJs enviam como pendentes; admin pode publicar diretamente.
-- Guarda a declaração de direitos e o resultado da análise administrativa.
alter table public.songs
  add column if not exists rights_confirmed_at timestamptz,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references auth.users(id) on delete set null,
  add column if not exists moderation_note text not null default '';

-- Proprietários podem corrigir metadados, mas nunca alterar estado, arquivo ou auditoria.
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
       or new.created_at is distinct from old.created_at
       or new.rights_confirmed_at is distinct from old.rights_confirmed_at
       or new.moderated_at is distinct from old.moderated_at
       or new.moderated_by is distinct from old.moderated_by
       or new.moderation_note is distinct from old.moderation_note then
      raise exception 'Somente a equipe pode alterar o status, o arquivo e os dados de auditoria.';
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

drop policy if exists "songs_insert_own_pending" on public.songs;
drop policy if exists "songs_insert_admin_only" on public.songs;
drop policy if exists "songs_insert_artist_or_admin" on public.songs;
drop policy if exists "songs_insert_admin_or_artist" on public.songs;
drop policy if exists "songs_insert_artist_published_or_admin" on public.songs;
drop policy if exists "songs_insert_artist_pending_or_admin" on public.songs;
create policy "songs_insert_artist_pending_or_admin" on public.songs
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and rights_confirmed_at is not null
  and (
    ((select private.is_admin()) and status = 'published')
    or (
      status = 'pending'
      and exists (
        select 1 from public.profiles p
        where p.user_id = (select auth.uid())
          and p.account_type = 'artist'
      )
    )
  )
);

-- Uma única política final de upload: admin ou perfil Artista, sempre na própria pasta.
drop policy if exists "audio_upload_admin_or_artist" on storage.objects;
drop policy if exists "audio_upload_artist_or_admin" on storage.objects;
drop policy if exists "audio_upload_artist_own_folder_or_admin" on storage.objects;
drop policy if exists "audio_upload_admin_only" on storage.objects;
create policy "audio_upload_artist_own_folder_or_admin" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'capital-do-trem-audio'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (
    (select private.is_admin())
    or exists (
      select 1 from public.profiles p
      where p.user_id = (select auth.uid())
        and p.account_type = 'artist'
    )
  )
);
