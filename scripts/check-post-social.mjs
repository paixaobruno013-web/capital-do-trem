import { readFile } from 'node:fs/promises';
const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const [auth, home, chat, migration] = await Promise.all([
  read('supabase/auth.js'),
  read('index.html'),
  read('bate-papo.html'),
  read('supabase/migrations/20261111143000_post_likes_comments.sql')
]);
const checks = [
  ['curtidas únicas por usuário e publicação', /primary key \(post_id, user_id\)/.test(migration)],
  ['curtidas só em publicações publicadas', /post_likes_insert_self[\s\S]*?status = 'published'/.test(migration)],
  ['comentários vinculados à conta e à publicação', /post_id uuid not null references public\.posts[\s\S]*?author_id uuid not null references auth\.users/.test(migration)],
  ['nome do comentarista definido pelo perfil no banco', /set_post_comment_author_name[\s\S]*?profiles p[\s\S]*?new\.author_name/.test(migration)],
  ['leitura pública de comentários e curtidas com RLS', /post_comments_read_public[\s\S]*?to anon, authenticated/.test(migration) && /post_likes_read_public[\s\S]*?to anon, authenticated/.test(migration)],
  ['envio de comentários exige usuário autenticado e post publicado', /post_comments_insert_self[\s\S]*?auth\.uid\(\)[\s\S]*?status = 'published'/.test(migration)],
  ['API de leitura e contagem das interações', /export async function getPostSocial[\s\S]*?likeCount:likes\.count/.test(auth)],
  ['API de curtir e descurtir', /export async function togglePostLike[\s\S]*?post_likes/.test(auth)],
  ['API de comentários com limite de 1.000 caracteres', /export async function addPostComment[\s\S]*?clean\.length>1000/.test(auth)],
  ['mural mostra botão de curtir e contagem', /getPostSocial\(item\.id\)[\s\S]*?Curtido[\s\S]*?likeCount/.test(home)],
  ['mural mostra lista e formulário de comentários', /Comentários[\s\S]*?post-comment-form[\s\S]*?addPostComment\(item\.id/.test(home)],
  ['compartilhamento privado continua disponível', /Koe Fala Tu[\s\S]*?share_text/.test(home)],
  ['área Fazer amigos permanece no menu e na navegação', /data-page="amigos"/.test(home) && /id="amigos"/.test(home)],
  ['busca e filtro por cidade ficam abaixo do bate-papo', /id="chat-friends-search"/.test(chat) && /id="chat-friends-distance"/.test(chat) && /id="fazer-amigos"/.test(chat)],
  ['diretório consulta somente perfis públicos', /getPublicProfiles\(\)/.test(chat) && /\.eq\('is_public', true\)/.test(auth)],
  ['filtro do próprio perfil usa a sessão autenticada sem variável global inexistente', /profile\.user_id!==session\?\.user\?\.id/.test(chat) && !/profile\.user_id!==user\?\.id/.test(chat)],
  ['atalho para Koe Fala Tu permanece na área de amizades', /id="fazer-amigos"[\s\S]*?mensagens\.html/.test(chat) && /bate-papo\.html#fazer-amigos/.test(home)],
  ['vídeo de abertura não recebe poster com logo ou imagem extra', /video\.removeAttribute\('poster'\)/.test(home) && !/const posterLayer\s*=/.test(home)],
  ['marca sobreposta fica oculta quando há vídeo de abertura', /if\(brand\)brand\.style\.display='none'/.test(home)],
  ['locomotiva e três vagões permanecem na abertura', /opening-wagon-rear/.test(home) && /opening-wagon-dancers/.test(home) && /opening-wagon-front/.test(home) && /opening-locomotive/.test(home)]
];
for (const [name, ok] of checks) console.log((ok ? 'OK  ' : 'ERRO') + ' ' + name);
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) process.exit(1);
console.log('Interações do mural verificadas: ' + checks.length + ' testes.');
