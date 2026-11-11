drop policy if exists saved_posts_require_registered_user on public.saved_posts;
create policy saved_posts_require_registered_user
on public.saved_posts as restrictive
for all to authenticated
using ((select private.is_registered_user()))
with check ((select private.is_registered_user()));
