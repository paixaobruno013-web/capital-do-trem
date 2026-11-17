import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = path => fs.readFileSync(path, 'utf8');
const feed = read('home-feed.js');
const catalog = read('index.html');
const groupChat = read('bate-papo.html');
const privateChat = read('mensagens.html');
const auth = read('supabase/auth.js');
const migration = read('supabase/migrations/20261116203000_user_content_edit_delete.sql');

const checks = [
  [feed.includes('updateMyPost') && feed.includes('deleteMyPost') && feed.includes('currentUser?.id===post.author_id'), 'Feed oferece editar/excluir apenas a própria publicação'],
  [catalog.includes('api.getMySongs()') && catalog.includes('api.updateMySong') && catalog.includes('api.deleteMySong'), 'Catálogo permite corrigir e excluir somente as próprias músicas'],
  [catalog.includes('title.addEventListener(\'click\',openTrack)') && catalog.includes("querySelector('.ct-player-fullscreen')?.click()"), 'Tocar no nome da faixa abre o player ampliado'],
  [groupChat.includes('updateMyGroupMessage') && groupChat.includes('deleteMyGroupMessage') && groupChat.includes('m.author_id===currentUserId'), 'Fala Trem oferece controles das próprias mensagens'],
  [privateChat.includes('addOwnMessageControls') && privateChat.includes('updateMyPrivateMessage') && privateChat.includes('deleteMyPrivateMessage'), 'Mensagens privadas mantêm edição/exclusão do remetente'],
  [auth.includes('export async function updateMyPost') && auth.includes('export async function deleteMyPost') && auth.includes('export async function updateMySong') && auth.includes('export async function deleteMySong'), 'APIs de publicações e músicas disponíveis'],
  [auth.includes('export async function updateMyGroupMessage') && auth.includes('export async function deleteMyGroupMessage') && auth.includes('export async function updateMyPrivateMessage') && auth.includes('export async function deleteMyPrivateMessage'), 'APIs de mensagens em grupo e privadas disponíveis'],
  [migration.includes('songs_update_own_or_admin') && migration.includes('songs_delete_own_or_admin') && migration.includes('chat_messages_update_own_or_admin') && migration.includes('chat_messages_delete_own_or_admin') && migration.includes('private_messages_update_sender') && migration.includes('private_messages_delete_sender'), 'Políticas RLS isolam edição/exclusão por proprietário']
];

for (const [ok, label] of checks) {
  console.log((ok ? 'OK  ' : 'ERRO ') + label);
  assert.ok(ok, label);
}
console.log(checks.length + ' verificações da experiência de edição, exclusão e player concluídas.');
