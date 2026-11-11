import { readFile } from 'node:fs/promises';

const account = await readFile(new URL('../conta.html', import.meta.url), 'utf8');
const auth = await readFile(new URL('../supabase/auth.js', import.meta.url), 'utf8');
const fn = await readFile(new URL('../supabase/functions/delete-account/index.ts', import.meta.url), 'utf8');
const page = await readFile(new URL('../account-deletion.html', import.meta.url), 'utf8');
const prepare = await readFile(new URL('./prepare-web.mjs', import.meta.url), 'utf8');

const checks = [
  [account.includes('id="delete-account-panel"'), 'Painel de exclusão ausente na área da conta.'],
  [account.includes('EXCLUIR MINHA CONTA'), 'Confirmação explícita ausente na interface.'],
  [auth.includes("functions.invoke('delete-account'"), 'Cliente não chama a função segura de exclusão.'],
  [fn.includes('auth.getUser()') && fn.includes('admin.auth.admin.deleteUser(user.id, false)'), 'Função não valida a sessão ou não exclui a conta Auth.'],
  [fn.includes('storage.from(bucket).remove'), 'Função não remove os arquivos pessoais antes da conta.'],
  [fn.includes('"capital-do-trem-chat"') && fn.includes('collectChatAttachmentFiles') && fn.includes('"group/" + userId') && fn.includes('"private/" + entry.name + "/" + userId'), 'Função não inclui anexos de grupo e conversas privadas na exclusão.'],
  [!fn.includes('body.user_id') && !fn.includes('body.userId'), 'Função aceita identificador de usuário fornecido pelo cliente.'],
  [page.includes('./conta.html#delete-account-panel'), 'Página externa não direciona para o fluxo de exclusão.'],
  [prepare.includes("'account-deletion.html'"), 'Página externa não é incluída no pacote web.'],
];

for (const [ok, message] of checks) {
  if (!ok) throw new Error(message);
}
console.log('Exclusão de conta: interface, chamada autenticada, remoção de arquivos e página externa conferidas.');
