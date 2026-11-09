-- Prevent concurrent active calls by the same host and prevent a user
-- from joining two LiveKit rooms at once. These constraints close races
-- that application-level "check then insert" logic cannot safely prevent.
create unique index calls_one_active_per_initiator_idx
  on public.calls (initiator_id)
  where status in ('ringing', 'active');

create unique index call_participants_one_joined_call_per_user_idx
  on public.call_participants (user_id)
  where state = 'joined';
