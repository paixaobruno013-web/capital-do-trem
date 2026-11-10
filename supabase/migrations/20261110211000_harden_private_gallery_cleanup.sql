
-- Move o comparador secreto para o schema privado; o RPC público é SECURITY INVOKER.
create or replace function private.verify_private_gallery_cleanup_secret(p_secret text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from vault.decrypted_secrets
    where name='capital_trem_private_gallery_cleanup_token' and decrypted_secret=p_secret);
$$;
revoke all on function private.verify_private_gallery_cleanup_secret(text) from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.verify_private_gallery_cleanup_secret(text) to anon, authenticated;

create or replace function public.verify_private_gallery_cleanup_secret(p_secret text)
returns boolean language sql stable security invoker set search_path = '' as $$
  select private.verify_private_gallery_cleanup_secret(p_secret);
$$;
revoke all on function public.verify_private_gallery_cleanup_secret(text) from public;
grant execute on function public.verify_private_gallery_cleanup_secret(text) to anon, authenticated;
