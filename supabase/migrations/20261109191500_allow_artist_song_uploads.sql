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
create policy "songs_insert_artist_or_admin" on public.songs
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and ((select private.is_artist()) or (select private.is_admin()))
  );

drop policy if exists "audio_upload_admin_only" on storage.objects;
drop policy if exists "audio_upload_artist_or_admin" on storage.objects;
create policy "audio_upload_artist_or_admin" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'capital-do-trem-audio'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and ((select private.is_artist()) or (select private.is_admin()))
  );

drop policy if exists "audio_delete_admin_only" on storage.objects;
create policy "audio_delete_admin_only" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'capital-do-trem-audio'
    and (select private.is_admin())
  );
