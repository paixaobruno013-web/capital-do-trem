-- Corrige permissões e configuração do envio de fotos/vídeos do Feed e músicas.
-- Mantém os arquivos privados e limita cada upload ao dono autenticado.

-- Bucket dedicado às mídias das publicações do Feed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'capital-do-trem-social',
  'capital-do-trem-social',
  false,
  52428800,
  array['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Metadados de mídia vinculados a uma publicação.
create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  bucket_id text not null default 'capital-do-trem-social',
  storage_path text not null unique,
  media_type text not null check (media_type in ('image','video')),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime')),
  byte_size bigint not null check (byte_size > 0 and byte_size <= 52428800),
  alt_text text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint post_media_owner_path check (storage_path like owner_id::text || '/posts/%'),
  constraint post_media_bucket check (bucket_id = 'capital-do-trem-social')
);

create index if not exists post_media_post_sort_idx
  on public.post_media(post_id, sort_order, created_at);

alter table public.post_media enable row level security;
revoke all on public.post_media from anon, authenticated;
grant select on public.post_media to anon, authenticated;
grant insert, delete on public.post_media to authenticated;

drop policy if exists post_media_read_published_or_owner on public.post_media;
create policy post_media_read_published_or_owner
on public.post_media for select to anon, authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_media.post_id and p.status = 'published'
  )
  or owner_id = (select auth.uid())
  or (select private.is_admin())
);

drop policy if exists post_media_insert_own_published_post on public.post_media;
create policy post_media_insert_own_published_post
on public.post_media for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and bucket_id = 'capital-do-trem-social'
  and storage_path like (select auth.uid())::text || '/posts/%'
  and exists (
    select 1 from public.posts p
    where p.id = post_media.post_id
      and p.author_id = (select auth.uid())
  )
);

drop policy if exists post_media_delete_own_or_admin on public.post_media;
create policy post_media_delete_own_or_admin
on public.post_media for delete to authenticated
using (owner_id = (select auth.uid()) or (select private.is_admin()));

-- Storage do Feed: upload apenas na pasta do próprio usuário.
drop policy if exists social_media_upload_own_folder on storage.objects;
create policy social_media_upload_own_folder
on storage.objects for insert to authenticated
with check (
  bucket_id = 'capital-do-trem-social'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists social_media_read_published_or_owner on storage.objects;
create policy social_media_read_published_or_owner
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'capital-do-trem-social'
  and (
    exists (
      select 1
      from public.post_media pm
      join public.posts p on p.id = pm.post_id
      where pm.bucket_id = storage.objects.bucket_id
        and pm.storage_path = storage.objects.name
        and p.status = 'published'
    )
    or (storage.foldername(name))[1] = (select auth.uid())::text
    or (select private.is_admin())
  )
);

drop policy if exists social_media_delete_own_or_admin on storage.objects;
create policy social_media_delete_own_or_admin
on storage.objects for delete to authenticated
using (
  bucket_id = 'capital-do-trem-social'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select private.is_admin())
  )
);

-- Alinha o bucket de áudio com os formatos e limite aceitos pelo aplicativo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'capital-do-trem-audio',
  'capital-do-trem-audio',
  false,
  52428800,
  array['audio/mpeg','audio/mp4','audio/aac','audio/wav','audio/x-wav','audio/ogg','application/ogg']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Remove políticas antigas que podiam se sobrepor e bloqueavam artistas ou o admin.
drop policy if exists songs_insert_admin_only on public.songs;
drop policy if exists songs_insert_own_pending on public.songs;
drop policy if exists songs_insert_artist_or_admin on public.songs;
drop policy if exists songs_insert_artist_pending_or_admin on public.songs;
drop policy if exists songs_insert_artist_published_or_admin on public.songs;
drop policy if exists audio_upload_admin_only on storage.objects;
drop policy if exists audio_upload_own_folder on storage.objects;
drop policy if exists audio_upload_artist_or_admin on storage.objects;
drop policy if exists audio_upload_artist_own_folder_or_admin on storage.objects;

-- Admin pode publicar diretamente; MC/DJ precisa ter conta Artista e ficha artística.
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
      and exists (
        select 1 from public.artists a
        where a.user_id = (select auth.uid())
      )
    )
  )
);

create policy audio_upload_admin_or_artist
on storage.objects for insert to authenticated
with check (
  bucket_id = 'capital-do-trem-audio'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (
    (select private.is_admin())
    or (
      exists (
        select 1 from public.profiles p
        where p.user_id = (select auth.uid())
          and p.account_type = 'artist'
      )
      and exists (
        select 1 from public.artists a
        where a.user_id = (select auth.uid())
      )
    )
  )
);
