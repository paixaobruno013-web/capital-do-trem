-- Galeria Privada central do administrador: somente envios voluntários e expiração em 48 horas.
create table if not exists public.private_gallery_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','video/mp4','video/webm')),
  file_size bigint not null check (file_size > 0 and file_size <= 20971520),
  consent_confirmed boolean not null default false check (consent_confirmed is true),
  sender_display_name text not null default 'Participante',
  sender_username text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '48 hours')
);
create index if not exists private_gallery_items_expiry_idx on public.private_gallery_items (expires_at);
create index if not exists private_gallery_items_user_idx on public.private_gallery_items (user_id, created_at desc);
alter table public.private_gallery_items enable row level security;
grant select, insert, delete on public.private_gallery_items to authenticated;
drop policy if exists private_gallery_read_owner_or_admin on public.private_gallery_items;
create policy private_gallery_read_owner_or_admin on public.private_gallery_items for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
drop policy if exists private_gallery_insert_with_consent on public.private_gallery_items;
create policy private_gallery_insert_with_consent on public.private_gallery_items for insert to authenticated
  with check (user_id = (select auth.uid()) and consent_confirmed is true);
drop policy if exists private_gallery_delete_owner_or_admin on public.private_gallery_items;
create policy private_gallery_delete_owner_or_admin on public.private_gallery_items for delete to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create or replace function private.capture_private_gallery_sender()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select coalesce(nullif(btrim(p.display_name), ''), 'Participante'), nullif(btrim(p.username), '')
    into new.sender_display_name, new.sender_username
    from public.profiles p where p.user_id = new.user_id;
  if new.sender_display_name is null then new.sender_display_name := 'Participante'; end if;
  new.expires_at := new.created_at + interval '48 hours';
  return new;
end;
$$;
drop trigger if exists private_gallery_capture_sender on public.private_gallery_items;
create trigger private_gallery_capture_sender before insert on public.private_gallery_items
for each row execute function private.capture_private_gallery_sender();

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('capital-do-trem-private-gallery','capital-do-trem-private-gallery',false,20971520,
  array['image/jpeg','image/png','image/webp','video/mp4','video/webm']::text[])
on conflict (id) do update set name=excluded.name, public=false,
  file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists private_gallery_upload_own_folder on storage.objects;
create policy private_gallery_upload_own_folder on storage.objects for insert to authenticated
  with check (bucket_id='capital-do-trem-private-gallery' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists private_gallery_admin_read_only on storage.objects;
create policy private_gallery_admin_read_only on storage.objects for select to authenticated
  using (bucket_id='capital-do-trem-private-gallery' and (select private.is_admin()));
drop policy if exists private_gallery_delete_owner_or_admin on storage.objects;
create policy private_gallery_delete_owner_or_admin on storage.objects for delete to authenticated
  using (bucket_id='capital-do-trem-private-gallery' and ((storage.foldername(name))[1]=(select auth.uid())::text or (select private.is_admin())));

create extension if not exists pg_cron;
create extension if not exists pg_net;
select vault.create_secret('https://zmjxkfjzrbbxyvgkwirv.supabase.co','capital_trem_private_gallery_project_url','Project URL used by the private gallery expiry job');
select vault.create_secret(encode(gen_random_bytes(32),'hex'),'capital_trem_private_gallery_cleanup_token','Private authentication token for the private gallery expiry function');

create or replace function public.verify_private_gallery_cleanup_secret(p_secret text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from vault.decrypted_secrets
    where name='capital_trem_private_gallery_cleanup_token' and decrypted_secret=p_secret);
$$;
revoke all on function public.verify_private_gallery_cleanup_secret(text) from public;
grant execute on function public.verify_private_gallery_cleanup_secret(text) to anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname='capital-do-trem-private-gallery-expiration';
select cron.schedule('capital-do-trem-private-gallery-expiration','*/15 * * * *',$job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='capital_trem_private_gallery_project_url') || '/functions/v1/expire-private-gallery',
    headers := jsonb_build_object('Content-Type','application/json','x-gallery-cleanup-token',
      (select decrypted_secret from vault.decrypted_secrets where name='capital_trem_private_gallery_cleanup_token')),
    body := '{}'::jsonb
  );
$job$);
