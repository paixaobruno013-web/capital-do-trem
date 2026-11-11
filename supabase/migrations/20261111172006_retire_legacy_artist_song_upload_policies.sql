-- Remove permissive legacy upload policies; artist submissions must stay pending.
drop policy if exists "songs_insert_artist_or_admin" on public.songs;
drop policy if exists "audio_upload_artist_or_admin" on storage.objects;
