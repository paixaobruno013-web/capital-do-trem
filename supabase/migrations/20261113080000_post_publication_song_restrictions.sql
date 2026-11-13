-- Moderação posterior por faixa: publicação imediata, com opção de restrição privada pelo administrador.
update public.songs set status = 'published' where status = 'pending';

alter table public.songs drop constraint if exists songs_status_check;
alter table public.songs add constraint songs_status_check
  check (status in ('pending','published','rejected','private'));

drop policy if exists "songs_read_public_catalog_pending_published_owner_admin" on public.songs;
drop policy if exists "songs_read_published_owner_admin" on public.songs;
create policy "songs_read_public_catalog_or_owner_admin" on public.songs
  for select to anon, authenticated
  using (
    status = 'published'
    or user_id = (select auth.uid())
    or (select private.is_admin())
  );

drop policy if exists "songs_update_own_pending_admin" on public.songs;
create policy "songs_update_own_song_or_admin" on public.songs
  for update to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()))
  with check (
    (user_id = (select auth.uid()) and status = 'published')
    or (select private.is_admin())
  );

drop policy if exists "audio_read_pending_and_published_owner_admin" on storage.objects;
drop policy if exists "audio_read_published_owner_admin" on storage.objects;
create policy "audio_read_public_catalog_or_owner_admin" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'capital-do-trem-audio'
    and (
      exists (
        select 1 from public.songs s
        where s.storage_path = objects.name and s.status = 'published'
      )
      or (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.is_admin())
    )
  );


-- Somente artistas aprovados pela equipe podem moderar participantes do chat.
-- O tipo de conta escolhido no cadastro, sozinho, não concede poder de moderação.
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
    select 1 from public.artists a
    where a.user_id = auth.uid() and a.status = 'published'
  ) into v_artist;

  select private.is_admin() into v_admin;

  if not v_admin and not v_artist then
    raise exception 'Somente artista aprovado ou administrador pode moderar o grupo.';
  end if;

  if p_action not in ('remove_group', 'block_app', 'release') then
    raise exception 'Ação inválida.';
  end if;

  if p_target_user_id is null or p_target_user_id = auth.uid() then
    raise exception 'Participante inválido.';
  end if;

  if v_artist and not v_admin and exists (
    select 1 from public.admin_users au where au.user_id = p_target_user_id
  ) then
    raise exception 'Artistas não podem remover administradores.';
  end if;

  if p_action in ('release', 'block_app') and not v_admin then
    raise exception 'Somente administrador pode executar essa ação.';
  end if;

  if p_action = 'remove_group' then
    update public.chat_group_members
    set left_at = now()
    where user_id = p_target_user_id and left_at is null;
    get diagnostics v_removed = row_count;
    if v_removed = 0 then
      raise exception 'Esse participante não está ativo no grupo.';
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
