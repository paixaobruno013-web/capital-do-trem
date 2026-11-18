import { readFile } from 'node:fs/promises';
const upload = await readFile(new URL('../music-upload.js', import.meta.url), 'utf8');
const auth = await readFile(new URL('../supabase/auth.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20261118190000_remove_per_upload_rights_confirmation.sql', import.meta.url), 'utf8');
const checks = [
  [upload.includes("event.preventDefault()"), 'O envio ainda pode provocar navegação/recarregamento do formulário.'],
  [upload.includes("if (submit.disabled) return;"), 'Falta proteção contra envio duplicado.'],
  [upload.includes("fileInput.files?.[0]") && upload.includes("catch (error)"), 'O arquivo selecionado não é mantido no fluxo de erro para nova tentativa.'],
  [!upload.includes('music-upload-rights') && !upload.includes('rightsConfirmed'), 'O formulário ainda exige confirmação de direitos por envio.'],
  [!auth.includes('rightsConfirmed !== true') && !auth.includes('rights_confirmed_at:new Date()'), 'A função de upload ainda exige/gera confirmação individual de direitos.'],
  [!html.includes('id="music-upload-rights"') && !html.includes('music-rights-confirmation'), 'A caixa de confirmação ainda aparece no formulário.'],
  [migration.includes('create policy "songs_insert_artist_pending_or_admin"') && !migration.includes('rights_confirmed_at is not null'), 'A política do banco ainda exige confirmação individual.']
];
for (const [ok, message] of checks) if (!ok) throw new Error(message);
console.log('Upload musical: sem confirmação repetida, sem navegação do formulário e com proteção contra envio duplicado.');
