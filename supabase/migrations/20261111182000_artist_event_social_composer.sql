-- Feed de eventos no início: GPS, música e publicação exclusiva de perfis artistas.
alter table public.events
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists music_song_id uuid references public.songs(id) on delete set null;

alter table public.events
  drop constraint if exists events_latitude_range,
  add constraint events_latitude_range check (latitude is null or latitude between -90 and 90),
  drop constraint if exists events_longitude_range,
  add constraint events_longitude_range check (longitude is null or longitude between -180 and 180);

create index if not exists events_published_date_idx on public.events(status,event_date,event_time);

drop policy if exists events_publish_immediately on public.events;
drop policy if exists events_submit_pending on public.events;
drop policy if exists events_publish_artist_or_admin on public.events;
create policy events_publish_artist_or_admin on public.events
  for insert to authenticated
  with check (
    created_by=(select auth.uid())
    and status='published'
    and (
      (select private.is_admin())
      or exists (
        select 1 from public.profiles p
        where p.user_id=(select auth.uid()) and p.account_type='artist'
      )
    )
    and (
      music_song_id is null
      or exists (select 1 from public.songs s where s.id=music_song_id and s.status='published')
    )
  );
