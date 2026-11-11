-- Restringe a moderação feita por artistas aos grupos dos quais participam.
-- Administradores continuam podendo executar ações administrativas globais.
create or replace function public.moderate_chat_participant(
  p_target_user_id uuid,
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_artist boolean;
  v_admin boolean;
  v_removed integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta.';
  end if;

  select exists(
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.account_type = 'artist'
  ) into v_artist;

  select private.is_admin() into v_admin;

  if not v_admin and not v_artist then
    raise exception 'Somente artista ou administrador pode moderar o grupo.';
  end if;

  if p_action not in ('remove_group', 'block_app', 'release') then
    raise exception 'Ação inválida.';
  end if;

  if p_action in ('release', 'block_app') and not v_admin then
    raise exception 'Somente administrador pode executar essa ação.';
  end if;

  if p_action = 'remove_group' then
    if v_admin then
      update public.chat_group_members
      set left_at = now()
      where user_id = p_target_user_id and left_at is null;
    else
      update public.chat_group_members target
      set left_at = now()
      where target.user_id = p_target_user_id
        and target.left_at is null
        and exists (
          select 1
          from public.chat_group_members moderator
          where moderator.user_id = auth.uid()
            and moderator.left_at is null
            and moderator.group_id = target.group_id
        );
    end if;
    get diagnostics v_removed = row_count;
    if v_removed = 0 then
      raise exception 'Esse participante não está em um grupo que você pode moderar.';
    end if;
  elsif p_action = 'block_app' then
    insert into public.chat_user_suspensions(user_id, reason, source, active, created_by)
    values (
      p_target_user_id,
      coalesce(nullif(trim(p_reason), ''), 'Bloqueio administrativo.'),
      'admin',
      true,
      auth.uid()
    )
    on conflict(user_id) do update
      set reason = excluded.reason,
          source = 'admin',
          active = true,
          created_by = auth.uid(),
          created_at = now();
  else
    update public.chat_user_suspensions
    set active = false, reviewed_at = now(), reviewed_by = auth.uid()
    where user_id = p_target_user_id;

    update public.chat_moderation_reports
    set status = 'dismissed', reviewed_by = auth.uid(), reviewed_at = now()
    where target_user_id = p_target_user_id and status in ('open', 'reviewing');
  end if;

  return jsonb_build_object('ok', true, 'action', p_action, 'target_user_id', p_target_user_id);
end
$function$;
