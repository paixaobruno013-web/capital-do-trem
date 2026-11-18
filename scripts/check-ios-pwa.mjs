import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('manifest.webmanifest', 'utf8'));
const html = await readFile('index.html', 'utf8');
const sw = await readFile('sw.js', 'utf8');
const info = await readFile('scripts/prepare-ios-info.py', 'utf8');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(manifest.name === 'Capital do Trem', 'Nome do PWA incorreto.');
assert(manifest.display === 'standalone', 'PWA precisa abrir em modo standalone.');
assert(manifest.start_url && manifest.scope, 'Manifesto sem start_url/scope.');
assert(html.includes('apple-mobile-web-app-capable') && html.includes('apple-mobile-web-app-title'), 'Metadados Apple ausentes.');
assert(html.includes('apple-touch-icon') && html.includes('./assets/capital-do-trem-logo.jpg'), 'Ícone Apple touch precisa apontar para a marca publicada.');
assert(sw.includes("event.request.headers.has('Authorization')"), 'Service worker precisa ignorar requisições autenticadas.');
assert(/url\.search\)\s*return;/.test(sw), 'Service worker precisa ignorar URLs com query string.');
assert(sw.includes('private|no-store|no-cache'), 'Service worker precisa respeitar Cache-Control privado.');
assert(sw.includes("response.headers.has('Set-Cookie')"), 'Service worker precisa evitar cache de respostas com cookie.');
assert(info.includes('NSCameraUsageDescription') && info.includes('NSMicrophoneUsageDescription'), 'Descrições de câmera/microfone ausentes.');
assert(info.includes('somente quando você toca'), 'Permissão de localização precisa explicar ação explícita do usuário.');

console.log('iOS/PWA: manifesto, metadados Apple, consentimento e proteções básicas de cache verificados.');
