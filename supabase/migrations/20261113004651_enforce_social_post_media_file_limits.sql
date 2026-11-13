-- Applied to the connected Supabase project as enforce_social_post_media_file_limits.
alter table public.post_media
  add constraint post_media_size_by_type check (
    (media_type = 'image' and byte_size <= 10485760)
    or (media_type = 'video' and byte_size <= 52428800)
  );
