-- Exige uma conta registrada para interagir com comentários e curtidas de vídeos.
-- Sessões anônimas do Supabase também usam o papel authenticated; a política
-- restritiva impede que essas sessões gravem ou consultem dados dessas tabelas.
-- Contas registradas continuam usando as políticas de propriedade existentes.
create policy video_comments_require_registered_user
on public.video_comments
as restrictive
for all
to authenticated
using ((select private.is_registered_user()))
with check ((select private.is_registered_user()));

create policy video_likes_require_registered_user
on public.video_likes
as restrictive
for all
to authenticated
using ((select private.is_registered_user()))
with check ((select private.is_registered_user()));
