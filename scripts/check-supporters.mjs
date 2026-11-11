import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const [adminPage, publicPage, adminJs, publicJs, serviceWorker, prepare] = await Promise.all([
  readFile('admin-apoiadores.html','utf8'),
  readFile('apoiadores.html','utf8'),
  readFile('supporters-admin.js','utf8'),
  readFile('supporters-public.js','utf8'),
  readFile('sw.js','utf8'),
  readFile('scripts/prepare-web.mjs','utf8')
]);

for (const id of ['supporter-form','supporter-file','supporter-preview','supporter-publish','supporter-list','supporter-refresh','supporter-denied-status']) {
  assert.ok(adminPage.includes(id), 'Painel de apoiadores sem elemento: '+id);
}
for (const id of ['data-supporter-grid','data-supporter-empty','data-supporter-retry']) {
  assert.ok(publicPage.includes(id), 'Página pública de apoiadores sem elemento: '+id);
}
assert.ok(adminJs.includes('20 * 1024 * 1024'), 'Limite do painel precisa corresponder ao bucket de 20 MB.');
assert.ok(adminJs.includes("isCurrentUserAdmin"), 'Envio precisa confirmar a função administrativa.');
assert.ok(adminJs.includes(".select('id').single()"), 'Publicação precisa confirmar o registro no banco.');
assert.ok(adminJs.includes('recordCreated = true'), 'Falha ao atualizar a lista não pode apagar mídia já publicada.');
assert.ok(adminJs.includes('Etapa 1/2') && adminJs.includes('Etapa 2/2'), 'Envio precisa informar suas etapas.');
assert.ok(publicJs.includes('data-supporter-retry'), 'Página pública precisa permitir nova tentativa.');
assert.ok(serviceWorker.includes('capital-do-trem-v266'), 'Cache do PWA precisa ser renovado.');
for (const file of ['admin-apoiadores.html','apoiadores.html','supporters-admin.js','supporters-public.js']) {
  assert.ok(serviceWorker.includes(file), 'Arquivo de apoiadores ausente do pré-cache: '+file);
  assert.ok(prepare.includes(file), 'Arquivo de apoiadores ausente da preparação web: '+file);
}
assert.ok(!/50\s*\*\s*1024\s*\*\s*1024/.test(adminJs+publicJs), 'Não usar limite de 50 MB no módulo de apoiadores.');
console.log('Área de apoiadores: acesso, publicação, prévia, atualização e cache verificados.');
