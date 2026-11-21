-- Campos de ciclo de vida do Egress/gravador LiveKit.
alter table public.live_broadcasts
  add column if not exists recording_egress_id text,
  add column if not exists recording_started_at timestamptz,
  add column if not exists recording_ready_at timestamptz,
  add column if not exists recording_error text;

create index if not exists live_broadcasts_egress_id_idx
  on public.live_broadcasts (recording_egress_id)
  where recording_egress_id is not null;
