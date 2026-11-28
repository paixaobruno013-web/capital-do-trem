-- Add indexes for foreign-key columns flagged by the Supabase performance advisor.
-- These are additive only; no rows, policies, or existing indexes are removed.
create index if not exists chat_message_views_viewer_id_idx
  on public.chat_message_views (viewer_id);

create index if not exists discussion_topic_messages_author_id_idx
  on public.discussion_topic_messages (author_id);

create index if not exists discussion_topics_creator_id_idx
  on public.discussion_topics (creator_id);

create index if not exists playlist_songs_song_id_idx
  on public.playlist_songs (song_id);

create index if not exists post_mentions_mentioned_by_idx
  on public.post_mentions (mentioned_by);

create index if not exists private_message_views_viewer_id_idx
  on public.private_message_views (viewer_id);
