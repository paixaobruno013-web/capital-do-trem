-- Corrige o bootstrap do administrador proprietário e consolida as permissões
-- de envio de áudio em uma única política segura e compatível com o app.
create or replace function private.bootstrap_first_admin()
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null or not exists (
    select 1
    from auth.users u
    where u.id = current_user_id
      and lower(coalesce(u.email, '')) = 'capitaldotrem07@gmail.com'
      and u.email_confirmed_at is not null
  ) then
    raise exception 'Conta proprietária não autorizada para configurar a administração.';
  end if;

  -- A conta proprietária autorizada deve continuar sendo administradora
  -- mesmo que uma conta administrativa antiga já exista.
  insert into public.admin_users(user_id)
  values (current_user_id)
  on conflict (user_id) do nothing;

  return exists (
    select 1 from public.admin_users
    where user_id = current_user_id
  );
end;
$function$;

revoke all on function private.bootstrap_first_admin() from public;
grant execute on function private.bootstrap_first_admin() to authenticated;

-- Garante bucket privado, limite e formatos compatíveis com o seletor Android.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'capital-do-trem-audio',
  'capital-do-trem-audio',
  false,
  52428800,
  array['audio/mpeg','audio/mp4','audio/aac','audio/wav','audio/x-wav','audio/ogg','application/ogg']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Remove versões antigas/conflitantes das regras de inclusão de faixas.
drop policy if exists songs_insert_admin_only on public.songs;
drop policy if exists songs_insert_own_pending on public.songs;
drop policy if exists songs_insert_artist_or_admin on public.songs;
drop policy if exists songs_insert_artist_published_or_admin on public.songs;
drop policy if exists songs_insert_admin_or_artist on public.songs;
drop policy if exists songs_insert_artist_pending_or_admin on public.songs;

create policy songs_insert_artist_pending_or_admin
on public.songs
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (
    ((select private.is_admin()) and status = 'published')
    or (
      status = 'pending'
      and exists (
        select 1 from public.profiles p
        where p.user_id = (select auth.uid())
          and p.account_type = 'artist'
      )
    )
  )
);

-- A gravação do arquivo precisa aceitar exatamente os mesmos papéis:
-- administrador publica; MC/DJ envia para aprovação. Cada arquivo fica
-- dentro da pasta UUID do próprio usuário.
drop policy if exists audio_upload_admin_only on storage.objects;
drop policy if exists audio_upload_own_folder on storage.objects;
drop policy if exists audio_upload_artist_or_admin on storage.objects;
drop policy if exists audio_upload_artist_own_folder_or_admin on storage.objects;
drop policy if exists audio_upload_admin_or_artist on storage.objects;

create policy audio_upload_admin_or_artist
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'capital-do-trem-audio'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (
    (select private.is_admin())
    or exists (
      select 1 from public.profiles p
      where p.user_id = (select auth.uid())
        and p.account_type = 'artist'
    )
  )
);
