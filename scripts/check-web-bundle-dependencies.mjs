import { readFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';

const prepare = await readFile(new URL('../scripts/prepare-web.mjs', import.meta.url), 'utf8');
const match = prepare.match(/const files = \[([\s\S]*?)\];/);
if (!match) throw new Error('Não foi possível ler a lista de arquivos do pacote web.');
const bundled = new Set([...match[1].matchAll(/'([^']+)'/g)].map(item => normalize(item[1])));
const errors = [];
let checked = 0;

for (const file of bundled) {
  if (!file.endsWith('.js')) continue;
  let source;
  try { source = await readFile(new URL('../' + file, import.meta.url), 'utf8'); }
  catch { errors.push('Arquivo listado no pacote não existe: ' + file); continue; }
  checked++;
  const imports = /(?:\bfrom\s*|\bimport\s*)['"]((?:\.\/|\.\.\/)[^'"]+)['"]/g;
  for (const item of source.matchAll(imports)) {
    const target = normalize(join(dirname(file), item[1]));
    if (!bundled.has(target)) errors.push(file + ' importa ' + target + ', mas esse módulo não é copiado para www/.');
  }
}

if (errors.length) {
  for (const error of errors) console.error('ERRO: ' + error);
  process.exit(1);
}
console.log('OK: ' + checked + ' módulos JavaScript incluídos no pacote; todas as importações relativas estão presentes.');
