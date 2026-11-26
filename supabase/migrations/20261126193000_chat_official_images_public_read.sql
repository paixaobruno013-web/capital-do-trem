drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read
on public.site_settings
for select
to anon, authenticated
using (
  setting_key = any (array[
    'official_profile_image_url',
    'app_opening_image_url',
    'app_opening_video_url',
    'app_opening_x',
    'app_opening_y',
    'app_opening_fit',
    'app_home_background_image_url',
    'app_home_background_x',
    'app_home_background_y',
    'app_home_background_blur',
    'app_home_background_fit',
    'app_header_background_image_url',
    'app_header_background_x',
    'app_header_background_y',
    'app_header_background_blur',
    'app_header_background_fit',
    'chat_brand_profile_image_url',
    'chat_group_profile_image_url'
  ])
  or (select private.is_admin())
);
comment on policy site_settings_public_read on public.site_settings is
'Permite leitura pública apenas das configurações visuais públicas; escrita continua restrita ao administrador pelas políticas separadas.';
