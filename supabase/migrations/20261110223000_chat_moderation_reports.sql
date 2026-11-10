-- Moderacao de participantes do grupo e denúncias independentes.
-- A migration de produção correspondente foi aplicada no Supabase.
create table if not exists public.chat_moderation_reports (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null references auth.users(id) on delete cascade,
 target_user_id uuid not null references auth.users(id) on delete cascade,
 reason text not null check(reason in('desentendimento','violacao_regras','importunacao','assedio','spam','outro')),
 details text, status text not null default 'open' check(status in('open','reviewing','dismissed','actioned')),
 created_at timestamptz not null default now(), reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz, unique(reporter_id,target_user_id),
 check(reporter_id<>target_user_id), check(details is null or char_length(details)<=1000)
);
create index if not exists chat_moderation_reports_target_status_idx on public.chat_moderation_reports(target_user_id,status,created_at desc);
create table if not exists public.chat_user_suspensions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 reason text not null, source text not null default 'reports', active boolean not null default true,
 created_at timestamptz not null default now(), created_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz, reviewed_by uuid references auth.users(id) on delete set null
);
alter table public.chat_moderation_reports enable row level security;
alter table public.chat_user_suspensions enable row level security;
revoke all on public.chat_moderation_reports,public.chat_user_suspensions from anon,authenticated;
grant select,insert on public.chat_moderation_reports to authenticated;
grant select on public.chat_user_suspensions to authenticated;
create policy chat_reports_submit_self on public.chat_moderation_reports for insert to authenticated with check(
 reporter_id=(select auth.uid()) and (select private.is_registered_user())
 and exists(select 1 from public.chat_group_members gm where gm.user_id=(select auth.uid()) and gm.left_at is null)
 and exists(select 1 from public.chat_group_members gm where gm.user_id=target_user_id and gm.left_at is null)
);
create policy chat_reports_read_reporter_or_admin on public.chat_moderation_reports for select to authenticated using(reporter_id=(select auth.uid()) or (select private.is_admin()));
create policy chat_suspensions_read_self_or_admin on public.chat_user_suspensions for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin()));
create or replace function public.report_chat_participant(p_target_user_id uuid,p_reason text,p_details text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_count integer; v_id uuid;
begin
 if auth.uid() is null then raise exception 'Entre na sua conta para denunciar.'; end if;
 if p_target_user_id=auth.uid() then raise exception 'Você não pode denunciar sua própria conta.'; end if;
 if p_reason not in('desentendimento','violacao_regras','importunacao','assedio','spam','outro') then raise exception 'Motivo inválido.'; end if;
 if not exists(select 1 from public.chat_group_members gm where gm.user_id=auth.uid() and gm.left_at is null) then raise exception 'Entre no grupo antes de denunciar.'; end if;
 if not exists(select 1 from public.chat_group_members gm where gm.user_id=p_target_user_id and gm.left_at is null) then raise exception 'Esse participante não está ativo no grupo.'; end if;
 insert into public.chat_moderation_reports(reporter_id,target_user_id,reason,details)
 values(auth.uid(),p_target_user_id,p_reason,nullif(left(trim(coalesce(p_details,'')),1000),''))
 on conflict(reporter_id,target_user_id) do update set reason=excluded.reason,details=excluded.details,status='open',created_at=now()
 returning id into v_id;
 select count(distinct reporter_id)::integer into v_count from public.chat_moderation_reports where target_user_id=p_target_user_id and status in('open','reviewing');
 if v_count>=4 then
  insert into public.chat_user_suspensions(user_id,reason,source,active)
  values(p_target_user_id,'Quatro ou mais denúncias independentes aguardando análise.','reports',true)
  on conflict(user_id) do update set active=true,reason=excluded.reason,source='reports',created_at=now();
  update public.chat_group_members set left_at=now() where user_id=p_target_user_id and left_at is null;
 end if;
 return jsonb_build_object('report_id',v_id,'reports_count',v_count,'preventive_suspension',v_count>=4);
end $$;
revoke all on function public.report_chat_participant(uuid,text,text) from public,anon;
grant execute on function public.report_chat_participant(uuid,text,text) to authenticated;
create or replace function public.moderate_chat_participant(p_target_user_id uuid,p_action text,p_reason text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_artist boolean;
begin
 if auth.uid() is null then raise exception 'Entre na sua conta.'; end if;
 select exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.account_type='artist') into v_artist;
 if not (select private.is_admin()) and not v_artist then raise exception 'Somente artista ou administrador pode moderar o grupo.'; end if;
 if p_action not in('remove_group','block_app','release') then raise exception 'Ação inválida.'; end if;
 if p_action='release' and not (select private.is_admin()) then raise exception 'Somente administrador pode liberar uma suspensão.'; end if;
 if p_action='block_app' and not (select private.is_admin()) then raise exception 'Somente administrador pode bloquear uma conta no aplicativo.'; end if;
 if p_action='remove_group' then
  update public.chat_group_members set left_at=now() where user_id=p_target_user_id and left_at is null;
 elsif p_action='block_app' then
  insert into public.chat_user_suspensions(user_id,reason,source,active,created_by)
  values(p_target_user_id,coalesce(nullif(trim(p_reason),''),'Bloqueio administrativo.'),'admin',true,auth.uid())
  on conflict(user_id) do update set reason=excluded.reason,source='admin',active=true,created_by=auth.uid(),created_at=now();
 else
  update public.chat_user_suspensions set active=false,reviewed_at=now(),reviewed_by=auth.uid() where user_id=p_target_user_id;
  update public.chat_moderation_reports set status='dismissed',reviewed_by=auth.uid(),reviewed_at=now() where target_user_id=p_target_user_id and status in('open','reviewing');
 end if;
 return jsonb_build_object('ok',true,'action',p_action,'target_user_id',p_target_user_id);
end $$;
revoke all on function public.moderate_chat_participant(uuid,text,text) from public,anon;
grant execute on function public.moderate_chat_participant(uuid,text,text) to authenticated;
drop policy if exists chat_group_members_join_self on public.chat_group_members;
create policy chat_group_members_join_self on public.chat_group_members for insert to authenticated with check(
 user_id=(select auth.uid()) and left_at is null and (select private.is_registered_user())
 and not exists(select 1 from public.chat_user_suspensions s where s.user_id=(select auth.uid()) and s.active)
);
