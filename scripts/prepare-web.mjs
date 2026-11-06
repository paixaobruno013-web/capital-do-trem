import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const root = process.cwd();
const webDir = join(root, 'www');
const files = [
  'index.html',
  'conta.html',
  'admin.html',
  'privacidade.html',
  'bate-papo.html',
  'diagnostico.html',
  'marca.svg',
  'manifest.webmanifest',
  'sw.js',
  'supabase/auth.js'
];

await rm(webDir, { recursive: true, force: true });
await mkdir(webDir, { recursive: true });

for (const file of files) {
  const destination = join(webDir, file);
  await mkdir(dirname(destination), { recursive: true });
  await cp(join(root, file), destination);
}

console.log(`Arquivos web preparados em ${webDir} (${files.length} arquivos).`);
