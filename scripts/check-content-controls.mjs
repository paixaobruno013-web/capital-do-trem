import fs from 'node:fs';
import assert from 'node:assert/strict';

const auth = fs.readFileSync('supabase/auth.js', 'utf8');
const sql = fs.readFileSync('supabase/migrations/20261116203000_user_content_edit_delete.sql', 'utf8');
const rede = fs.readFileSync('rede.js', 'utf8');

for (const fn of [
  'updateMyPost', 'deleteMyPost', 'updateMyPostComment', 'deleteMyPostComment',
  'updateMySong', 'deleteMySong', 'updateMyGroupMessage', 'deleteMyGroupMessage',
  'updateMyPrivateMessage', 'deleteMyPrivateMessage'
]) assert.match(auth, new RegExp('export async function ' + fn + '\\('), fn + ' deve existir');

for (const [table, owner] of [
  ['posts', 'author_id'], ['post_comments', 'author_id'], ['songs', 'user_id'],
  ['chat_messages', 'author_id'], ['private_messages', 'sender_id']
]) {
  assert.match(sql, new RegExp('on public\\.' + table + '[\\s\\S]*?using \\('), table + ' deve ter política RLS');
  assert.match(sql, new RegExp(owner + ' = \\(select auth\\.uid\\(\\)\\)'), table + ' deve validar o proprietário');
}
assert.match(sql, /private_messages_update_sender[\s\S]*?status = 'accepted'/);
assert.match(sql, /private_messages_delete_sender[\s\S]*?status = 'accepted'/);
assert.match(auth, /\.eq\('author_id', user\.id\)/);
assert.match(auth, /\.eq\('user_id', user\.id\)/);
assert.match(auth, /\.eq\('sender_id', user\.id\)/);
assert.match(rede, /Editar publicação/);
assert.match(rede, /Excluir publicação/);
assert.match(rede, /api\.updateMySong/);
assert.match(rede, /api\.deleteMySong/);\nassert.match(rede, /api\.updateMyPostComment/);\nassert.match(rede, /api\.deleteMyPostComment/);\nassert.match(rede, /Editar comentário/);\nassert.match(rede, /Excluir comentário/);
console.log('Controle de edição e exclusão: 10 APIs, isolamento por proprietário e conversas privadas aceitas verificados.');
