import { readFile } from 'node:fs/promises';

const pages = [
  'index.html',
  'bate-papo.html',
  'mensagens.html',
  'conta.html',
  'rede.html',
  'admin.html',
  'admin-apoiadores.html',
  'apoiadores.html',
  'avatar.html',
  'estudio.html',
  'diagnostico.html',
  'offline.html',
  'privacidade.html',
  'account-deletion.html'
];

const failures = [];
for (const page of pages) {
  const html = await readFile(new URL('../' + page, import.meta.url), 'utf8');
  if (!/<html\\b[^>]*\\blang=["']pt-BR["']/i.test(html)) failures.push(page + ': idioma do documento diferente de pt-BR');
  if (!/<meta\\s+charset=["']?utf-8/i.test(html)) failures.push(page + ': charset UTF-8 ausente');
  if (!/<meta\\s+name=["']viewport["']/i.test(html)) failures.push(page + ': configuração de viewport ausente');
}

const home = await readFile(new URL('../index.html', import.meta.url), 'utf8');
if (!/<meta\\s+property=["']og:locale["']\\s+content=["']pt_BR["']/i.test(home)) {
  failures.push('index.html: metadado de idioma pt_BR para compartilhamento ausente');
}

if (failures.length) {
  console.error('Falha na padronização Português (Brasil):\\n- ' + failures.join('\\n- '));
  process.exit(1);
}
console.log('Idioma verificado: ' + pages.length + ' páginas em Português (Brasil), UTF-8 e viewport móvel.');
