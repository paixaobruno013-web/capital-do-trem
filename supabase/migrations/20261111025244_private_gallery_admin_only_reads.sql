drop policy if exists private_gallery_read_owner_or_admin on public.private_gallery_items;
create policy private_gallery_admin_only_read
on public.private_gallery_items
for select
to authenticated
using ((select private.is_admin()));
