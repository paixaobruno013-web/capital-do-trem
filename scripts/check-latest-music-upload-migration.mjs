import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const [migration, schema, uploader, auth] = await Promise.all([
  read('supabase/migrations/20261118213000_repair_admin_music_upload_permissions.sql'),
  read('supabase/schema.sql'),
  read('music-upload.js'),
  read('supabase/auth.js')
]);

const checks = [
  ['migration is present in the repository', migration.length > 0],
  ['owner bootstrap only accepts the confirmed owner email', migration.includes("lower(coalesce(u.email, '')) = 'capitaldotrem07@gmail.com'") && migration.includes('u.email_confirmed_at is not null')],
  ['bootstrap inserts the owner into admin_users idempotently', migration.includes('insert into public.admin_users(user_id)') && migration.includes('on conflict (user_id) do nothing')],
  ['bootstrap function is not public and is executable by authenticated users', migration.includes('revoke all on function private.bootstrap_first_admin() from public') && migration.includes('grant execute on function private.bootstrap_first_admin() to authenticated')],
  ['audio bucket remains private with a 50 MiB limit', migration.includes("'capital-do-trem-audio'") && migration.includes('false,') && migration.includes('52428800')],
  ['song insert policy lets admins publish and artists submit pending tracks', migration.includes('create policy songs_insert_artist_pending_or_admin') && migration.includes("(select private.is_admin()) and status = 'published'") && migration.includes("status = 'pending'") && migration.includes("p.account_type = 'artist'") && migration.includes('user_id = (select auth.uid())')],
  ['storage upload policy restricts the audio bucket and the user folder', migration.includes('create policy audio_upload_admin_or_artist') && migration.includes("bucket_id = 'capital-do-trem-audio'") && migration.includes('(storage.foldername(name))[1] = (select auth.uid())::text')],
  ['storage upload is limited to admin or artist accounts', migration.includes('(select private.is_admin())') && migration.includes("p.account_type = 'artist'")],
  ['migration does not require per-upload rights confirmation', !migration.includes('rights_confirmed_at')],
  ['base schema contains all migration dependencies', schema.includes('create table if not exists public.admin_users') && schema.includes('create table if not exists public.profiles') && schema.includes('create table if not exists public.songs') && schema.includes('create or replace function private.is_admin()') && schema.includes('account_type text')],
  ['music uploader bootstraps owner and checks admin/artist access', uploader.includes('bootstrapFirstAdmin(') && uploader.includes('isCurrentUserArtistOrAdmin') && uploader.includes('uploadMySong(')],
  ['backend exposes the owner bootstrap and music upload functions', auth.includes('bootstrapFirstAdmin') && auth.includes('uploadMySong')]
];

for (const [name, ok] of checks) console.log((ok ? 'OK  ' : 'ERRO') + ' ' + name);
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) process.exit(1);
console.log('Migração de permissões musicais validada: ' + checks.length + ' verificações.');
