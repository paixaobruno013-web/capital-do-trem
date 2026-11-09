create or replace function public.enforce_call_participant_limit()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  call_status text;
  active_count integer;
begin
  select status
    into call_status
    from public.calls
   where id = new.call_id
   for update;

  if call_status is null then
    raise exception 'Chamada não encontrada' using errcode = '23503';
  end if;

  if call_status not in ('ringing', 'active') then
    raise exception 'Esta chamada não aceita novos participantes' using errcode = '23514';
  end if;

  select count(*)
    into active_count
    from public.call_participants
   where call_id = new.call_id
     and state in ('invited', 'ringing', 'joined');

  if active_count >= 4 then
    raise exception 'Limite de quatro participantes atingido' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger call_participants_enforce_limit
before insert on public.call_participants
for each row execute function public.enforce_call_participant_limit();

revoke all on function public.enforce_call_participant_limit() from public, anon, authenticated;
