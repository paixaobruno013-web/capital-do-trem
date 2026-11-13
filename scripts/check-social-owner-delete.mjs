import { readFile } from 'node:fs/promises';
const [profile, auth, migration] = await Promise.all([
  readFile(new URL('../perfil.html', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/auth.js', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/migrations/20261113170000_allow_owner_delete_social_posts.sql', import.meta.url), 'utf8')
]);
const checks = [
  ['perfil só mostra controle de exclusão ao próprio titular', profile.includes('if(!social.isOwner)return;') && profile.includes("remove.textContent='Excluir publicação'")],
  ['exclusão pede confirmação e atualiza grade e contador', profile.includes('Excluir esta publicação e suas fotos/vídeos?') && profile.includes('postsCount.splice') && profile.includes('renderPosts(grid,postsCount')],
  ['função exige sessão, valida UUID e restringe DELETE ao autor autenticado', auth.includes('export async function deleteMyPost(postId)') && auth.includes('Entre na sua conta para excluir uma publicação.') && auth.includes(".eq('id', cleanId).eq('author_id', user.id).select('id')")],
  ['função remove os objetos de mídia associados depois de excluir o post', auth.includes(".select('storage_path').eq('post_id', cleanId).eq('owner_id', user.id)") && auth.includes("storage.from('capital-do-trem-media').remove(paths)")],
  ['migração permite exclusão pelo autor ou administrador sem liberar edição', migration.includes('posts_delete_own_or_admin') && migration.includes('author_id = (select auth.uid())') && !migration.includes('for update')]
];
for (const [name, ok] of checks) console.log((ok ? 'OK  ' : 'ERRO') + ' ' + name);
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) process.exit(1);
console.log('Controles de exclusão de publicações verificados: ' + checks.length + ' testes.');
