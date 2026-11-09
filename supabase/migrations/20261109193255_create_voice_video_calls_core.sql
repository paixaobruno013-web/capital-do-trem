-- Core metadata for voice/video calls. Media is handled by LiveKit; never store media tokens here.
create table public.calls (
  id uuid primary key default gen_random_uuid(),
  room_name text not null unique default ('ct-' || replace(gen_random_uuid()::text, '-', '')),
  conversation_id uuid null references public.private_conversations(id) on delete set null,
  initiator_id uuid not null references auth.users(id) on delete cascade,
  call_type text not null check (call_type in ('audio','video')),
  status text not null default 'ringing'
    check (status in ('ringing','active','ended','cancelled','failed')),
  max_participants smallint not null default 4 check (max_participants = 4),
  created_at timestamptz not null default now(),
  started_at timestamptz null,
  ended_at timestamptz null,
  ended_reason text null check (ended_reason is null or length(ended_reason) <= 120)
);

create table public.call_participants (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'participant' check (role in ('host','participant')),
  state text not null default 'invited'
    check (state in ('invited','ringing','joined','declined','left','missed','failed')),
  invited_at timestamptz not null default now(),
  joined_at timestamptz null,
  left_at timestamptz null,
  outcome text null check (outcome is null or length(outcome) <= 80),
  created_at timestamptz not null default now(),
  unique (call_id, user_id)
);

create table public.call_invites (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls(id) on delete cascade,
  invited_user_id uuid null references auth.users(id) on delete cascade,
  token_hash text null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  approved_at timestamptz null,
  revoked_at timestamptz null,
  used_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint call_invites_target_required check (
    invited_user_id is not null or token_hash is not null
  )
);

create index calls_initiator_created_idx on public.calls (initiator_id, created_at desc);
create index calls_conversation_created_idx on public.calls (conversation_id, created_at desc)
  where conversation_id is not null;
create index calls_status_created_idx on public.calls (status, created_at desc);
create index call_participants_user_state_idx on public.call_participants (user_id, state);
create index call_participants_call_state_idx on public.call_participants (call_id, state);
create index call_invites_call_expiry_idx on public.call_invites (call_id, expires_at);

alter table public.calls enable row level security;
alter table public.call_participants enable row level security;
alter table public.call_invites enable row level security;

revoke all on table public.calls, public.call_participants, public.call_invites from anon, authenticated;
grant all on table public.calls, public.call_participants, public.call_invites to service_role;

comment on table public.calls is 'Metadados de chamadas Capital do Trem; acesso somente pelo backend privilegiado.';
comment on table public.call_participants is 'Participantes e estados de chamadas; acesso somente pelo backend privilegiado.';
comment on table public.call_invites is 'Convites de chamadas; guardar somente hash de token, nunca token em texto puro.';
