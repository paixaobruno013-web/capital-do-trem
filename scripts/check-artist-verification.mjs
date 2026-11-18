import { readFile } from 'node:fs/promises';
const [home, profile, auth, schema, chat, admin] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../rede.js', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/auth.js', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/schema.sql', import.meta.url), 'utf8'),
  readFile(new URL('../bate-papo.html', import.meta.url), 'utf8'),
  readFile(new URL('../admin.html', import.meta.url), 'utf8')
]);
const checks = [
  [auth.includes("export async function getPublishedArtists()") && auth.includes(".eq('status', 'published')"), 'A vitrine precisa consultar somente artistas aprovados.'],
  [home.includes("verified.setAttribute('aria-label','Artista verificado')"), 'O selo público precisa ter rótulo acessível.'],
  [profile.includes(".eq('user_id',p.user_id).eq('status','published')") && profile.includes('verifiedSeal.hidden=!!error||!data'), 'O perfil só pode exibir selo quando o artista estiver publicado.'],
  [auth.includes('export async function getModerationQueue()') && auth.includes('export async function moderateItem(') && auth.includes("if (!(await isCurrentUserAdmin())) throw new Error('Acesso administrativo não autorizado.')"), 'A moderação de artistas deve exigir administrador.'],
  [schema.includes('create policy "artists_insert_own_pending"') && schema.includes('with check (user_id = (select auth.uid()) and status = \'pending\')'), 'O artista só pode criar a própria ficha como pendente.'],
  [schema.includes('create policy "artists_update_own_or_admin"') && schema.includes("(user_id = (select auth.uid()) and status = 'pending')\n    or (select private.is_admin())"), 'O artista não pode aprovar a própria ficha; somente administrador pode publicar.'],
  [admin.includes('auth.getModerationQueue()') && (admin.includes('auth.moderateItem(kind,item.id,next,reason)') || admin.includes('auth.moderateItem(kind,item.id,next)')), 'O painel administrativo precisa usar a fila e a ação protegida de moderação.'],
  [auth.includes("export async function getPublicProfiles()") && auth.includes(".eq('is_public', true)"), 'A descoberta de amizades deve listar somente perfis públicos.'],
  [chat.includes('não usamos GPS nem mostramos endereço ou distância exata') && chat.includes('Na minha cidade'), 'A área de amizades deve explicar que usa cidade informada e não GPS.']
];
for (const [ok, message] of checks) if (!ok) throw new Error(message);
console.log('Verificação de artistas, selo administrativo, RLS e privacidade da descoberta de amizades conferidos.');
