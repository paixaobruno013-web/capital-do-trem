drop policy if exists chat_group_members_update_self on public.chat_group_members;
create policy chat_group_members_update_self on public.chat_group_members for update to authenticated
using (user_id=(select auth.uid()) and (select private.is_registered_user()))
with check (user_id=(select auth.uid()) and (select private.is_registered_user()));