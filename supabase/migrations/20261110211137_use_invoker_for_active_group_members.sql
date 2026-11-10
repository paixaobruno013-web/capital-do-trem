drop policy if exists chat_group_members_read_self_or_admin on public.chat_group_members;
create policy chat_group_members_read_self_or_admin on public.chat_group_members for select to authenticated
using ((select private.is_registered_user()) and (left_at is null or user_id=(select auth.uid()) or (select private.is_admin())));
create or replace function public.active_chat_group_member_ids()
returns table(user_id uuid) language sql stable security invoker set search_path = ''
as $function$
 select gm.user_id from public.chat_group_members gm
 where gm.left_at is null and exists(select 1 from public.chat_messages cm where cm.author_id=gm.user_id);
$function$;
revoke all on function public.active_chat_group_member_ids() from public, anon;
grant execute on function public.active_chat_group_member_ids() to authenticated;