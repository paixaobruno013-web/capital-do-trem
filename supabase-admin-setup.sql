-- Capital do Trem: configuração do painel administrativo e troca de logo
create table if not exists public.site_settings (
  setting_key text primary key,
  setting_value text not null,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings" on public.site_settings
for select to anon, authenticated using (true);
drop policy if exists "Admin can manage site settings" on public.site_settings;
create policy "Admin can manage site settings" on public.site_settings
for all to authenticated
using ((auth.jwt() ->> 'email') = 'capitaldotrem07@gmail.com')
with check ((auth.jwt() ->> 'email') = 'capitaldotrem07@gmail.com');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-assets', 'brand-assets', true, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/png','image/jpeg','image/webp'];

drop policy if exists "Public can view brand assets" on storage.objects;
create policy "Public can view brand assets" on storage.objects
for select to anon, authenticated using (bucket_id = 'brand-assets');
drop policy if exists "Admin can upload brand assets" on storage.objects;
create policy "Admin can upload brand assets" on storage.objects
for insert to authenticated with check (
  bucket_id = 'brand-assets' and (auth.jwt() ->> 'email') = 'capitaldotrem07@gmail.com'
);
drop policy if exists "Admin can update brand assets" on storage.objects;
create policy "Admin can update brand assets" on storage.objects
for update to authenticated using (
  bucket_id = 'brand-assets' and (auth.jwt() ->> 'email') = 'capitaldotrem07@gmail.com'
) with check (
  bucket_id = 'brand-assets' and (auth.jwt() ->> 'email') = 'capitaldotrem07@gmail.com'
);
drop policy if exists "Admin can delete brand assets" on storage.objects;
create policy "Admin can delete brand assets" on storage.objects
for delete to authenticated using (
  bucket_id = 'brand-assets' and (auth.jwt() ->> 'email') = 'capitaldotrem07@gmail.com'
);
