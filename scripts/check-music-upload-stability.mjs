import { readFile } from 'node:fs/promises';
const upload = await readFile(new URL('../music-upload.js', import.meta.url), 'utf8');
const auth = await readFile(new URL('../supabase/auth.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20261118190000_remove_per_upload_rights_confirmation.sql', import.meta.url), 'utf8');
const checks = [
  [upload.includes("event.preventDefault()"), 'O envio ainda pode provocar navegação/recarregamento do formulário.'],
  [html.includes('onsubmit="event.preventDefault(); return false"') && html.includes('id="music-upload-form"'), 'O formulário não bloqueia submissão nativa mesmo se o módulo de upload falhar ao carregar.'],
  [!upload.includes('form.reset()') && upload.includes("fileInput.value='';titleInput.value='';"), 'O sucesso ainda usa reset global do formulário em vez de limpar somente os campos do envio.'],
  [upload.includes("form.setAttribute('aria-busy','true')") && upload.includes("form.removeAttribute('aria-busy')"), 'O estado de envio não é sinalizado e restaurado no formulário.'],
  [upload.includes("if (submit.disabled) return;"), 'Falta proteção contra envio duplicado.'],
  [upload.includes("fileInput.files?.[0]") && upload.includes("catch (error)"), 'O arquivo selecionado não é mantido no fluxo de erro para nova tentativa.'],
  [!upload.includes('music-upload-rights') && !upload.includes('rightsConfirmed'), 'O formulário ainda exige confirmação de direitos por envio.'],
  [!auth.includes('rightsConfirmed !== true') && !auth.includes('rights_confirmed_at:new Date()'), 'A função de upload ainda exige/gera confirmação individual de direitos.'],
  [auth.includes("if (!cleanTitle) throw new Error('Informe o título da música antes de enviar.');"), 'O envio não diferencia título vazio de título acima do limite.'],
  [auth.includes("if (cleanTitle.length > 120) throw new Error('O título da música deve ter no máximo 120 caracteres.');"), 'O limite de 120 caracteres do título não está validado com mensagem específica.'],
  [upload.includes("if (titleInput && !titleInput.value.trim()) { status.textContent = 'Informe o título da música antes de enviar.';"), 'A interface não informa claramente quando o título está vazio.'],
  [upload.includes('O título da música deve ter no máximo 120 caracteres. Você digitou'), 'A interface não informa claramente quando o título ultrapassa 120 caracteres.'],
  [!html.includes('id="music-upload-rights"') && !html.includes('music-rights-confirmation'), 'A caixa de confirmação ainda aparece no formulário.'],
  [migration.includes('create policy "songs_insert_artist_pending_or_admin"') && !migration.includes('rights_confirmed_at is not null'), 'A política do banco ainda exige confirmação individual.']
];
for (const [ok, message] of checks) if (!ok) throw new Error(message);
console.log('Upload musical: sem confirmação repetida, sem navegação do formulário e com proteção contra envio duplicado.');
