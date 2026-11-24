-- Remove a confirmação de direitos a cada envio. A plataforma não executa verificação automática de direitos autorais.
-- A permissão e a responsabilidade pelo conteúdo são tratadas nos termos gerais da conta, fora do fluxo de upload.
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
