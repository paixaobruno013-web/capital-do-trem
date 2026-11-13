import { readFile } from 'node:fs/promises';

const [auth, migration] = await Promise.all([
  readFile(new URL('../supabase/auth.js', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20261113183000_private_social_media_bucket.sql', import.meta.url), 'utf8')
]);
const functionBody = (name) => {
  const start = auth.indexOf('export async function ' + name + '(');
  if (start < 0) return '';
  const candidates = [
    auth.indexOf('\nexport async function ', start + 1),
    auth.indexOf('\nexport function ', start + 1),
    auth.indexOf('\nexport const ', start + 1)
  ].filter(index => index >= 0);
  const end = candidates.length ? Math.min(...candidates) : auth.length;
  return auth.slice(start, end);
};
const checks = [
  ['bucket social dedicado é privado e mantém limite/tipos de arquivo', migration.includes("'capital-do-trem-social'") && migration.includes('false,') && migration.includes('52428800') && migration.includes("'video/quicktime'")],
  ['bucket público geral não é alterado', !migration.includes("set public = excluded.public")],
  ['mídia social privada usa URLs assinadas e preserva fallback legado', auth.includes("createSignedUrls([...pathSet], 60 * 60)") && auth.includes("getPublicUrl(item.storage_path)") && auth.includes("bucketId === 'capital-do-trem-social'")],
  ['novos uploads usam o bucket privado e registram bucket_id correto', functionBody('uploadMyPostMedia').includes("from(bucketId)") && functionBody('uploadMyPostMedia').includes("const bucketId = 'capital-do-trem-social'") && functionBody('uploadMyPostMedia').includes('bucket_id: bucketId')],
  ['feed, vídeos, perfil, curtidas e salvos renovam URLs com helper', ['getPublishedPosts','getPublicProfileVideos','getMySavedPosts','getPublicProfilePosts','getPublicProfileLikedPosts'].every(name => functionBody(name).includes('withPostMediaUrls(supabase'))],
  ['exclusão limpa mídias do bucket correspondente', functionBody('deleteMyPost').includes('for (const [bucketId, paths] of grouped)') && functionBody('deleteMyPost').includes('storage.from(bucketId).remove(paths)')],
  ['política de leitura só assina mídias associadas a publicações publicadas ou do titular/admin', migration.includes('social_media_read_published_owner_admin') && migration.includes("p.status = 'published'") && migration.includes('private.is_admin()')],
  ['upload, substituição e remoção têm políticas próprias', migration.includes('social_media_upload_own_post') && migration.includes('social_media_update_own_post') && migration.includes('social_media_delete_own_post_or_admin')],
  ['metadados aceitam os dois buckets durante a transição', migration.includes("check (bucket_id in ('capital-do-trem-media', 'capital-do-trem-social'))")]
];
for (const [name, ok] of checks) console.log((ok ? 'OK  ' : 'ERRO') + ' ' + name);
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) process.exit(1);
console.log('Proteção das mídias sociais verificada: ' + checks.length + ' testes.');
