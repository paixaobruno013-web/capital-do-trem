import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const [index, profileHtml, profileJs, auth, migration, accessMigration, sw, prepare] = await Promise.all([
  read('index.html'), read('rede.html'), read('rede.js'), read('supabase/auth.js'),
  read('supabase/migrations/20261127114152_private_user_area_covers.sql'),
  read('supabase/migrations/20261127114606_restrict_user_area_covers_anon.sql'), read('sw.js'), read('scripts/prepare-web.mjs')
]);

const checks = [
  ['tela inicial mantém a capa original instalada por padrão', index.includes("var(--cdt-personal-home-cover,url('./assets/favela-header.webp'))")],
  ['tela inicial oferece menu de três pontos e seletor de imagem', index.includes('id="home-area-cover-menu"') && index.includes('id="home-area-cover-file"')],
  ['área Músicas não carrega mais banner e mantém o catálogo de áudio', !index.includes('music-section-banner') && index.includes('id="published-song-catalog"') && index.includes('id="music-playlists-list"')],
  ['área Músicas preserva a arte oficial fixa sem seletor pessoal independente', !index.includes('id="music-area-cover-menu"') && !index.includes('id="music-area-cover-file"')],
  ['restauração independente da capa pessoal fica restrita à tela inicial', index.includes('home-area-cover-reset') && !index.includes('music-area-cover-reset')],
  ['preferências de capa pessoal continuam restritas ao cabeçalho inicial', index.includes('getMyAreaCovers()') && index.includes('saveMyAreaCover(\'home\',file)') && index.includes('resetMyAreaCover(\'home\')') && !index.includes('musicImage') && !index.includes('musicInput')],
  ['perfil permite tocar na foto e na capa para escolher nova imagem', profileHtml.includes('id="profile-avatar"') && profileHtml.includes('id="profile-cover"') && profileJs.includes("own?()=>{const input=$('edit-avatar')") && profileJs.includes("own?()=>{const input=$('edit-cover')")],
  ['foto e capa do perfil são enviadas e salvas automaticamente', profileJs.includes('saveDirectProfileImage(avatarPicker,\'avatar\')') && profileJs.includes('saveDirectProfileImage(coverPicker,\'cover\')') && profileJs.includes('api.uploadMyCover(file)') && profileJs.includes('api.saveMyAvatar({type:\'photo\',path:uploaded.path})')],
  ['API guarda preferências em tabela separada e não em perfis públicos', auth.includes("from('user_area_covers')") && !auth.includes('home_cover_url, home_cover_path, music_cover_url, music_cover_path')],
  ['tabela de capas tem RLS e políticas de propriedade', migration.includes('enable row level security') && migration.includes('user_area_covers_select_own') && migration.includes('user_area_covers_insert_own') && migration.includes('user_area_covers_update_own') && migration.includes('user_area_covers_delete_own')],
  ['preferências de capas não ficam disponíveis para visitantes anônimos', accessMigration.includes('revoke all privileges on table public.user_area_covers from anon, public') && accessMigration.includes('grant select, insert, update, delete on table public.user_area_covers to authenticated')],
  ['uploads usam o caminho individual do usuário e formatos permitidos', auth.includes("user.id+'/cover/'+kind+'-'") && auth.includes("'image/webp':'webp'") && auth.includes('8*1024*1024')],
  ['service worker atualiza o cache para carregar a nova interface', Number(sw.match(/capital-do-trem-v(\d+)/)?.[1]||0)>=348],
  ['módulos necessários entram no pacote web/Android', prepare.includes("'rede.js'") && prepare.includes("'supabase/auth.js'") && prepare.includes("'index.html'")]
];

for (const [name, ok] of checks) console.log((ok ? 'OK  ' : 'FAIL') + ' ' + name);
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error(failed.length + ' personal cover check(s) failed.');
  process.exit(1);
}
console.log('Personal area cover checks passed: ' + checks.length + '/' + checks.length + '.');
