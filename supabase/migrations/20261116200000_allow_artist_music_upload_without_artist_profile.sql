-- Permite que contas Artista/MC/DJ enviem músicas pela Central de Músicas,
-- sem exigir o preenchimento prévio da ficha artística.
-- O caminho do arquivo continua exclusivo por usuário e UUID; faixas com o
-- mesmo título ou conteúdo não substituem nem bloqueiam outras publicações.

drop policy if exists songs_insert_admin_or_artist on public.songs;
create policy songs_insert_admin_or_artist
on public.songs for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (
    (select private.is_admin())
    or (
      status = 'published'
      and exists (
        select 1 from public.profiles p
        where p.user_id = (select auth.uid())
          and p.account_type = 'artist'
      )
    )
  )
);

drop policy if exists audio_upload_admin_or_artist on storage.objects;
create policy audio_upload_admin_or_artist
on storage.objects for insert to authenticated
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
