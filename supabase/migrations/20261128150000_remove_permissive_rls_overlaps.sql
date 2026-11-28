-- Remove permissive RLS overlaps that made narrower rules ineffective.
-- All remaining policies preserve ownership/admin access while enforcing intended status checks.

drop policy if exists chat_messages_delete_admin on public.chat_messages;
drop policy if exists posts_delete_own_pending_or_admin on public.posts;
drop policy if exists posts_edit_own_pending_or_admin on public.posts;

-- This broader policy allowed owners to update songs regardless of status.
-- Keep songs_update_own_song_or_admin, whose WITH CHECK requires owner edits
-- to remain published; administrators retain moderation access.
drop policy if exists songs_update_own_or_admin on public.songs;
