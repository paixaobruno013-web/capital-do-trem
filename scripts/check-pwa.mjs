import { access, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const root = process.cwd();
const serviceWorker = await readFile(join(root, 'sw.js'), 'utf8');
const matches = [...serviceWorker.matchAll(/const\s+(?:CORE_FILES|OPTIONAL_FILES)\s*=\s*\[([\s\S]*?)\]\s*;/g)];
if (matches.length === 0) throw new Error('Não foi possível localizar as listas CORE_FILES/OPTIONAL_FILES do service worker.');

const entries = matches.flatMap((match) => [...match[1].matchAll(/(['"])(.*?)\1/g)].map((item) => item[2]));
if (entries.length === 0) throw new Error('As listas de arquivos pré-armazenados estão vazias.');

for (const entry of entries) {
  if (/^(https?:)?\/\//i.test(entry)) continue;
  const pathname = decodeURIComponent(entry.split(/[?#]/, 1)[0]);
  const relative = pathname === './' || pathname === '.' ? 'index.html' : pathname.replace(/^\.\//, '');
  const target = resolve(root, 'www', relative);
  if (!target.startsWith(resolve(root, 'www') + '/') && target !== resolve(root, 'www')) {
    throw new Error('Caminho fora da pasta www no pré-cache: ' + entry);
  }
  try {
    await access(target);
  } catch {
    throw new Error('Arquivo do pré-cache não foi copiado para www/: ' + entry);
  }
}

const manifestPath = join(root, 'www', 'manifest.webmanifest');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
  throw new Error('O manifesto precisa declarar pelo menos um ícone.');
}
for (const icon of manifest.icons) {
  if (!icon.src) throw new Error('Ícone do manifesto sem caminho src.');
  if (/^https:\/\//i.test(icon.src)) {
    if (!['zmjxkfjzrbbxyvgkwirv.supabase.co'].includes(new URL(icon.src).hostname)) {
      throw new Error('Ícone remoto fora da origem aprovada: ' + icon.src);
    }
    continue;
  }
  if (/^(?:data:|\/\/)/i.test(icon.src)) throw new Error('Origem de ícone não permitida: ' + icon.src);
  const iconPath = resolve(dirname(manifestPath), decodeURIComponent(icon.src.split(/[?#]/, 1)[0]));
  try {
    await access(iconPath);
  } catch {
    throw new Error('Ícone do manifesto não encontrado no pacote: ' + icon.src);
  }
}

console.log('PWA aprovado: ' + entries.length + ' arquivos de pré-cache e ' + manifest.icons.length + ' ícone(s) do manifesto conferidos.');
