-- Remove permissive RLS overlaps that made narrower rules ineffective.
-- Preserve the stricter owner/admin policies for pending posts and published songs.

drop policy if exists chat_messages_delete_admin on public.chat_messages;

-- Keep posts_delete_own_pending_or_admin and posts_edit_own_pending_or_admin.
-- Remove broader owner policies that bypassed the pending-status restriction.
drop policy if exists posts_delete_own_content on public.posts;
drop policy if exists posts_update_own_content on public.posts;

-- Keep songs_update_own_song_or_admin: its WITH CHECK requires owner edits
-- to remain published; administrators retain moderation access.
-- Remove the broader policy that allowed owner edits regardless of status.
drop policy if exists songs_update_own_or_admin on public.songs;
