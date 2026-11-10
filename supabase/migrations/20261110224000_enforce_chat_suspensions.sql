-- Suspensões administrativas e preventivas passam a bloquear acesso a áreas autenticadas do app.
create or replace function private.is_registered_user()
returns boolean language sql stable set search_path='' as $$
 select (select auth.uid()) is not null
 and (select auth.jwt()->>'is_anonymous') is distinct from 'true'
 and (
   not exists(select 1 from public.chat_user_suspensions s where s.user_id=(select auth.uid()) and s.active)
   or (select private.is_admin())
 );
$$;