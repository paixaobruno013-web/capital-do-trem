revoke all privileges on table public.user_area_covers from anon, public;
grant select, insert, update, delete on table public.user_area_covers to authenticated;
