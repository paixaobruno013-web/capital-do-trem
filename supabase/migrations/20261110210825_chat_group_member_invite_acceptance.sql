drop policy if exists private_conversations_update_participants on public.private_conversations;
create policy private_conversations_update_participants on public.private_conversations for update to authenticated
using (
 (status='pending' and (select auth.uid())=case when initiated_by=participant_one then participant_two else participant_one end
  and (select private.can_start_private_chat(case when participant_one=(select auth.uid()) then participant_two else participant_one end)))
 or (status='accepted' and (select auth.uid()) in(participant_one,participant_two))
)
with check (
 (status in('accepted','declined') and (select auth.uid())=case when initiated_by=participant_one then participant_two else participant_one end
  and (select private.can_start_private_chat(case when participant_one=(select auth.uid()) then participant_two else participant_one end)))
 or (status='accepted' and (select auth.uid()) in(participant_one,participant_two))
);