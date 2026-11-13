-- PROPOSTA (não aplicada): feed público com fotos e vídeos.
-- Revisar antes de executar no Supabase. A bucket capital-do-trem-media
-- permanece pública como está; nenhum bucket/objeto é alterado por este SQL.

begin;

-- 1) Não alterar as políticas existentes de posts e profiles.
-- Elas já concedem SELECT a anon para posts publicados e perfis públicos.
-- As regras atuais de autenticação e escrita permanecem intactas.

-- 2) Metadados das mídias do feed. Arquivos ficam no bucket existente,
-- mas só os caminhos vinculados a posts publicados são apresentados no feed.
create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  bucket_id text not null default 'capital-do-trem-media'
    check (bucket_id = 'capital-do-trem-media'),
  storage_path text not null unique,
  media_type text not null check (media_type in ('image','video')),
  mime_type text not null check (
    mime_type in ('image/jpeg','image/png','image/webp',
                  'video/mp4','video/webm','video/quicktime')
  ),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 52428800),
  sort_order smallint not null default 0 check (sort_order between 0 and 9),
  alt_text text not null default '' check (char_length(alt_text) <= 200),
  created_at timestamptz not null default now(),
  constraint post_media_path_owner check (
    storage_path like owner_id::text || '/posts/%'
  ),
  constraint post_media_post_order_unique unique (post_id, sort_order),
  constraint post_media_type_matches_mime check (
    (media_type = 'image' and mime_type like 'image/%')
    or (media_type = 'video' and mime_type like 'video/%')
  )
);

create index if not exists post_media_post_order_idx
  on public.post_media(post_id, sort_order, created_at);

alter table public.post_media enable row level security;

-- Expor a tabela à Data API; RLS abaixo controla as linhas.
revoke all on table public.post_media from anon, authenticated;
grant select on table public.post_media to anon, authenticated;
grant insert, update, delete on table public.post_media to authenticated;

drop policy if exists post_media_read_published_or_owner_admin on public.post_media;
create policy post_media_read_published_or_owner_admin
  on public.post_media for select to anon, authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_media.post_id
        and (
          p.status = 'published'
          or p.author_id = (select auth.uid())
          or (select private.is_admin())
        )
    )
  );

drop policy if exists post_media_insert_own on public.post_media;
create policy post_media_insert_own
  on public.post_media for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and storage_path like (select auth.uid())::text || '/posts/%'
    and exists (
      select 1 from public.posts p
      where p.id = post_media.post_id
        and p.author_id = (select auth.uid())
        and p.status = 'published'
    )
    and (select private.is_registered_user())
  );

drop policy if exists post_media_update_own_or_admin on public.post_media;
create policy post_media_update_own_or_admin
  on public.post_media for update to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.posts p
      where p.id = post_media.post_id
        and p.author_id = (select auth.uid())
    )
    or (select private.is_admin())
  )
  with check (
    (
      owner_id = (select auth.uid())
      and storage_path like (select auth.uid())::text || '/posts/%'
      and exists (
        select 1 from public.posts p
        where p.id = post_media.post_id
          and p.author_id = (select auth.uid())
      )
    )
    or (select private.is_admin())
  );

drop policy if exists post_media_delete_own_or_admin on public.post_media;
create policy post_media_delete_own_or_admin
  on public.post_media for delete to authenticated
  using (
    (
      owner_id = (select auth.uid())
      and exists (
        select 1 from public.posts p
        where p.id = post_media.post_id
          and p.author_id = (select auth.uid())
      )
    )
    or (select private.is_admin())
  );

commit;

-- Após revisão/aplicação, testar anon, usuário comum, artista e admin.
-- Também validar upload/delete em storage.objects: a política existente
-- media_upload_own_folder exige a pasta inicial igual ao UID do usuário.
