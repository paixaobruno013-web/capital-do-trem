-- Exige conta registrada nas interações sociais e dados pessoais.
-- A função também bloqueia sessões anônimas e contas suspensas; as regras
-- permissivas existentes continuam definindo propriedade e participantes.
drop policy if exists post_comments_require_registered_user on public.post_comments;
create policy post_comments_require_registered_user
on public.post_comments as restrictive for all to authenticated
using ((select private.is_registered_user()))
with check ((select private.is_registered_user()));

drop policy if exists post_likes_require_registered_user on public.post_likes;
create policy post_likes_require_registered_user
on public.post_likes as restrictive for all to authenticated
using ((select private.is_registered_user()))
with check ((select private.is_registered_user()));

drop policy if exists profile_follows_require_registered_user on public.profile_follows;
create policy profile_follows_require_registered_user
on public.profile_follows as restrictive for all to authenticated
using ((select private.is_registered_user()))
with check ((select private.is_registered_user()));

drop policy if exists private_gallery_items_require_registered_user on public.private_gallery_items;
create policy private_gallery_items_require_registered_user
on public.private_gallery_items as restrictive for all to authenticated
using ((select private.is_registered_user()))
with check ((select private.is_registered_user()));

drop policy if exists user_stories_require_registered_user on public.user_stories;
create policy user_stories_require_registered_user
on public.user_stories as restrictive for all to authenticated
using ((select private.is_registered_user()))
with check ((select private.is_registered_user()));

drop policy if exists song_play_history_require_registered_user on public.song_play_history;
create policy song_play_history_require_registered_user
on public.song_play_history as restrictive for all to authenticated
using ((select private.is_registered_user()))
with check ((select private.is_registered_user()));

drop policy if exists user_presence_require_registered_user on public.user_presence;
create policy user_presence_require_registered_user
on public.user_presence as restrictive for all to authenticated
using ((select private.is_registered_user()))
with check ((select private.is_registered_user()));

drop policy if exists private_conversations_require_registered_user on public.private_conversations;
create policy private_conversations_require_registered_user
on public.private_conversations as restrictive for all to authenticated
using ((select private.is_registered_user()))
with check ((select private.is_registered_user()));
