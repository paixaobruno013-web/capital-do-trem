create or replace function private.can_start_private_chat(target_user_id uuid)
returns boolean language plpgsql stable security definer set search_path = ''
as $function$
declare current_user_id uuid := (select auth.uid());
begin
 if current_user_id is null or target_user_id is null or target_user_id=current_user_id then return false; end if;
 return exists(select 1 from public.chat_group_members gm where gm.user_id=current_user_id and gm.left_at is null)
 and exists(select 1 from public.chat_messages cm where cm.author_id=current_user_id)
 and exists(select 1 from public.chat_group_members gm where gm.user_id=target_user_id and gm.left_at is null)
 and exists(select 1 from public.chat_messages cm where cm.author_id=target_user_id);
end;
$function$;
create or replace function public.active_chat_group_member_ids()
returns table(user_id uuid) language sql stable security definer set search_path = ''
as $function$
 select gm.user_id from public.chat_group_members gm where gm.left_at is null
 and (select auth.uid()) is not null and (select private.is_registered_user())
 and exists(select 1 from public.chat_messages cm where cm.author_id=gm.user_id);
$function$;