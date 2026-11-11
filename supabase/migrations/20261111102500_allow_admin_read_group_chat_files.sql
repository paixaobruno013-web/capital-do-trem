-- Administradores já podem moderar mensagens do grupo; permita também abrir seus anexos privados do grupo.
drop policy if exists chat_private_files_read_authorized on storage.objects;
create policy chat_private_files_read_authorized
on storage.objects for select to authenticated
using (
  bucket_id = 'capital-do-trem-chat'
  and private.is_registered_user()
  and (
    (
      (storage.foldername(name))[1] = 'group'
      and (private.is_current_chat_group_member() or private.is_admin())
    )
    or
    (
      (storage.foldername(name))[1] = 'private'
      and exists (
        select 1
        from public.private_conversations c
        where c.id::text = (storage.foldername(name))[2]
          and c.status = 'accepted'
          and (auth.uid() = c.participant_one or auth.uid() = c.participant_two)
          and not private.private_users_blocked(
            auth.uid(),
            case when c.participant_one = auth.uid() then c.participant_two else c.participant_one end
          )
      )
    )
  )
);
