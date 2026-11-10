import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const root = process.cwd();
const webDir = join(root, 'www');
const files = [
  'index.html',
  'offline.html',
  'conta.html',
  'admin.html',
  'admin-media.js',
  'privacidade.html',
  'bate-papo.html',
  'chat-enhancements.js',
  'emoji-picker.js',
  'stories-ui.js',
  'admin-stories.js',
  'avatar.html',
  'mensagens.html',
  'diagnostico.html',
  'marca.svg',
  'manifest.webmanifest',
  'sw.js',
  'update.js',
  'supabase/auth.js'
];

await rm(webDir, { recursive: true, force: true });
await mkdir(webDir, { recursive: true });

for (const file of files) {
  const destination = join(webDir, file);
  await mkdir(dirname(destination), { recursive: true });
  await cp(join(root, file), destination);
}

const assetsSource = join(root, 'assets');
const assetsDestination = join(webDir, 'assets');
await cp(assetsSource, assetsDestination, { recursive: true });

console.log(`Arquivos web preparados em ${webDir} (${files.length} arquivos + pasta assets).`);
