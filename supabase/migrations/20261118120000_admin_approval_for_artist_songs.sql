-- MCs/DJs podem enviar músicas, mas a publicação pública exige decisão administrativa.
-- O administrador pode publicar diretamente os arquivos enviados pela própria conta.
-- O Storage continua aceitando upload somente do dono autenticado (ou admin).
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
