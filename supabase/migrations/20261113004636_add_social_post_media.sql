-- Applied to the connected Supabase project as add_social_post_media.
begin;

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

revoke all on table public.post_media from anon, authenticated;
grant select on table public.post_media to anon, authenticated;
grant insert, update, delete on table public.post_media to authenticated;

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

create policy post_media_update_own_or_admin
  on public.post_media for update to authenticated
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
