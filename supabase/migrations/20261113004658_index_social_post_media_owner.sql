-- Applied to the connected Supabase project as index_social_post_media_owner.
create index if not exists post_media_owner_id_idx
  on public.post_media(owner_id);
