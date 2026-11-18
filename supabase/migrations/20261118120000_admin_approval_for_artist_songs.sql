-- Fila de revisão de músicas: MCs/DJs enviam como pendentes; admin pode publicar diretamente.
-- Guarda a declaração de direitos e o resultado da análise administrativa.
alter table public.songs
  add column if not exists rights_confirmed_at timestamptz,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references auth.users(id) on delete set null,
  add column if not exists moderation_note text not null default '';

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
