#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const checks = [];
const pass = (message) => checks.push(message);
const fail = (message) => errors.push(message);
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function walk(dir) {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) return walk(relative);
    return [relative];
  });
}

const schema = read('supabase/schema.sql');
const auth = read('supabase/auth.js');
const installationPrivacyMigration = read('supabase/migrations/20261128120000_harden_installation_count_privacy.sql');
const androidSetup = read('scripts/configure-android-media.py');

for (const table of [
  'profiles', 'admin_users', 'events', 'artists', 'posts', 'songs',
  'song_likes', 'song_comments', 'chat_messages',
  'private_conversations', 'private_messages', 'private_blocks', 'site_settings'
]) {
  const pattern = new RegExp('alter\\s+table\\s+public\\.' + table + '\\s+enable\\s+row\\s+level\\s+security', 'i');
  if (!pattern.test(schema)) fail('RLS não habilitado explicitamente em public.' + table);
  else pass('RLS habilitado: public.' + table);
}

const mustContain = [
  ['schema privado sem acesso público', /revoke\s+all\s+on\s+schema\s+private\s+from\s+public/i, schema],
  ['função administrativa com search_path fixo', /function\s+private\.is_admin\s*\([\s\S]*?security\s+definer\s+set\s+search_path\s*=\s*''/i, schema],
  ['admin bootstrap verifica e-mail confirmado', /email_confirmed_at\s+is\s+not\s+null/i, schema],
  ['admin_users sem política de escrita para usuários', /tabela admin_users não recebe políticas para usuários comuns/i, schema],
  ['bucket de áudio privado', /values\s*\('capital-do-trem-audio',[\s\S]{0,160}?false/i, schema],
  ['upload de áudio limitado à pasta do usuário', /audio_upload_artist_own_folder_or_admin[\s\S]*?storage\.foldername\(name\)\)\[1\]\s*=\s*\(select auth\.uid\(\)\)::text/i, schema],
  ['mensagens privadas isoladas por participantes', /private_messages_read_accepted_participants[\s\S]*?participant_one[\s\S]*?participant_two/i, schema],
  ['mensagem privada exige remetente autenticado', /private_messages_insert_accepted_participants[\s\S]*?sender_id\s*=\s*auth\.uid\(\)/i, schema],
  ['chave publicável Supabase configurada', /sb_publishable_[A-Za-z0-9_-]+/, auth],
  ['contagem de instalações exposta somente como agregado por RPC', /get_app_installation_count[\s\S]*?security definer[\s\S]*?set search_path = ''/i, installationPrivacyMigration],
  ['cliente usa RPC e não consulta identificadores individuais de instalação', /rpc\('get_app_installation_count'\)/i, auth]
];
for (const [label, pattern, source] of mustContain) {
  if (pattern.test(source)) pass(label);
  else fail('Controle ausente: ' + label);
}

if (/(?:SUPABASE_SERVICE_ROLE_KEY\s*[:=]|service_role\s*[:=]\\s*['\"][^'\"]+|sb_secret_[A-Za-z0-9_-]{20,})/i.test(auth)) {
  fail('Credencial privilegiada encontrada em supabase/auth.js');
} else {
  pass('Nenhuma chave service_role/secret no cliente Supabase');
}

const publicFiles = walk('www').filter((file) => /\.(?:js|mjs|html|json|css)$/i.test(file));
for (const file of publicFiles) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  if (/(?:SUPABASE_SERVICE_ROLE_KEY\s*[:=]|service_role\s*[:=]\\s*['\"][^'\"]+|sb_secret_[A-Za-z0-9_-]{20,})/i.test(content)) {
    fail('Possível segredo privilegiado publicado em ' + file);
  }
}
if (publicFiles.length) pass('Arquivos web publicados verificados contra chaves privilegiadas');
else fail('Diretório www vazio: build web deve ocorrer antes da auditoria');

if (/setAllowFileAccess\(true\)|setAllowUniversalAccessFromFileURLs\(true\)|MIXED_CONTENT_ALWAYS_ALLOW|setWebContentsDebuggingEnabled\(true\)/i.test(androidSetup)) {
  fail('Configuração Android contém opção WebView insegura');
} else {
  pass('Script Android não habilita acesso irrestrito a arquivos, conteúdo misto ou depuração WebView');
}

if (errors.length) {
  console.error('AUDITORIA DE SEGURANÇA: FALHOU');
  for (const error of errors) console.error('✗ ' + error);
  process.exit(1);
}
console.log('AUDITORIA DE SEGURANÇA: ' + checks.length + ' verificações aprovadas.');
for (const check of checks) console.log('✓ ' + check);
