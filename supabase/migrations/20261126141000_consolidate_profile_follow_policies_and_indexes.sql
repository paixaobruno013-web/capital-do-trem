-- Consolidate redundant profile-follow policies and the duplicate lookup index.
-- Keep the restrictive policies that require a registered user and a public target profile.
drop policy if exists profile_follows_delete_self on public.profile_follows;
drop policy if exists profile_follows_insert_self on public.profile_follows;
drop policy if exists profile_follows_read_authenticated on public.profile_follows;
drop index if exists public.profile_follows_followed_idx;
