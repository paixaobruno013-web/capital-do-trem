-- Remove excess direct table privileges from API roles.
revoke all privileges on all tables in schema public from anon, authenticated;

-- Anonymous visitors may only read public catalog data; RLS filters each row.
grant select on public.artists, public.events, public.posts, public.profiles, public.site_settings, public.songs to anon;

-- Signed-in users receive only the operations used by the app. RLS remains the row-level boundary.
grant select on public.admin_users to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.artists, public.events, public.posts to authenticated;
grant select, insert, delete on public.chat_messages, public.song_comments, public.song_likes to authenticated;
grant select, insert, update, delete on public.site_settings, public.songs to authenticated;
