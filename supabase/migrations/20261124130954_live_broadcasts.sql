-- Infraestrutura inicial para transmissões públicas ao vivo da Capital do Trem.
-- Tokens e controle de salas são emitidos exclusivamente pela Edge Function lives-api.

create table if not exists public.live_broadcasts (
  id uuid primary key default gen_random_uuid(),
  room_name text not null unique,
  host_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  description text not null default '' check (char_length(description) <= 500),
  status text not null default 'live' check (status in ('live','ended','failed')),
  recording_status text not null default 'not_configured'
    check (recording_status in ('not_configured','queued','recording','processing','ready','failed')),
  recording_asset_path text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_broadcast_end_after_start check (ended_at is null or ended_at >= started_at)
);

create index if not exists live_broadcasts_status_started_idx
  on public.live_broadcasts (status, started_at desc);
create index if not exists live_broadcasts_host_created_idx
  on public.live_broadcasts (host_user_id, created_at desc);
create unique index if not exists live_broadcasts_one_active_per_host
  on public.live_broadcasts (host_user_id) where status = 'live';

alter table public.live_broadcasts enable row level security;
revoke all privileges on public.live_broadcasts from anon, authenticated;
grant all privileges on public.live_broadcasts to service_role;

drop policy if exists live_broadcasts_backend_only on public.live_broadcasts;
create policy live_broadcasts_backend_only on public.live_broadcasts
  for all to service_role using (true) with check (true);

do $$
begin
  if exists (select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'live_broadcasts') then
    null;
  else
    alter publication supabase_realtime add table public.live_broadcasts;
  end if;
end $$;

comment on table public.live_broadcasts is
  'Metadados de lives. Tokens, controle de sala e permissões são exclusivos da Edge Function lives-api. Gravação automática será habilitada após configurar armazenamento e Egress.';
