import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const files = ['index.html', 'conta.html', 'admin.html', 'bate-papo.html', 'diagnostico.html', 'avatar.html', 'mensagens.html', 'privacidade.html', 'offline.html'];
let checked = 0;
let failed = false;

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  for (let index = 0; index < scripts.length; index += 1) {
    const [, attributes, source] = scripts[index];
    if (/\bsrc\s*=/.test(attributes) || !source.trim()) continue;
    const result = spawnSync(process.execPath, ['--check', '--input-type=module'], {
      input: source,
      encoding: 'utf8'
    });
    checked += 1;
    if (result.status !== 0) {
      failed = true;
      process.stderr.write('Erro de sintaxe em ' + file + ', script inline ' + (index + 1) + ':\n');
      process.stderr.write(result.stderr || result.stdout || 'Falha desconhecida\n');
    }
  }
}
if (failed) process.exit(1);
console.log('Sintaxe aprovada em ' + checked + ' scripts inline.');
