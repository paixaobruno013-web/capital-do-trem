create index call_invites_invited_user_idx on public.call_invites (invited_user_id)
  where invited_user_id is not null;
create index call_invites_created_by_idx on public.call_invites (created_by);

create policy call_invites_backend_only
on public.call_invites
for all
to service_role
using (true)
with check (true);

create policy call_participants_backend_only
on public.call_participants
for all
to service_role
using (true)
with check (true);

create policy calls_backend_only
on public.calls
for all
to service_role
using (true)
with check (true);
