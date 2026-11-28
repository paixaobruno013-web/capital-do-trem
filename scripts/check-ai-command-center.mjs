import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const [ai, camera, index, sw, edge, built, profile, groupChat, privateChat, privacy, update, account, authModule] = await Promise.all([
  read('capital-ai.js'), read('home-story-composer.js'), read('index.html'),
  read('sw.js'), read('supabase/functions/capital-ai-assistant/index.ts'),
  read('www/capital-ai.js'), read('rede.html'), read('bate-papo.html'), read('mensagens.html'), read('privacidade.html'), read('update.js'),
  read('conta.html'), read('supabase/auth.js')
]);
const checks = [
  [ai.includes("functions.invoke('capital-ai-assistant'") && ai.includes("getSession()"), 'Assistente chama IA somente com sessão autenticada'],
  [!ai.includes('data-cdt-go') && !ai.includes('data-cdt-href') && !ai.includes('cdt-command-center'), 'IA permanece interna, sem botão ou central visível'],
  [camera.includes('runCapitalAI') && camera.includes('createAIImageDataUrl') && camera.includes("mode: 'caption'"), 'Câmera permite análise explícita de foto e sugestão de legenda'],
    [index.includes('capital-ai.js') && !index.includes('home-story-ai-button') && !index.includes('home-story-ai-tools'), 'IA carregada internamente sem controles visíveis nos Stories'],
  [!index.includes('Analisar foto e criar legenda') && !index.includes('A foto será enviada ao serviço de IA'), 'Nenhuma aba, botão ou chamada visual de IA exposta ao público'],
  [edge.includes("Deno.env.get('OPENAI_API_KEY')") && edge.includes('/auth/v1/user') && edge.includes('store: false'), 'Chave IA somente no servidor e sessão validada'],
  [edge.includes('allowedOrigins') && edge.includes('const reply =') && !edge.includes('return json('), 'CORS limitado a origens autorizadas em todas as respostas'],
  [edge.includes('instructions,') && edge.includes('role: \'user\'') && edge.includes('dados não confiáveis'), 'Instruções internas da IA ficam separadas do conteúdo não confiável do usuário'],
  [!edge.includes('errorBody') && edge.includes("console.error('OpenAI request failed with status:'"), 'Logs não armazenam corpo de erro potencialmente sensível do provedor'],
  [edge.includes('MAX_REQUESTS_PER_WINDOW = 12') && edge.includes('readLimitedBody') && edge.includes('AbortSignal.timeout') && edge.includes('allowedModes') && edge.includes('inFlightUsers'), 'Limite básico de uso, payload e ações permitidas'],
  [!/(sk-[A-Za-z0-9]{20,}|OPENAI_API_KEY\s*[:=]\s*['"][^'"]+)/.test(ai + edge), 'Nenhuma chave de IA gravada no código'],
  [/const CACHE='capital-do-trem-v(\d+)'/.test(sw) && Number(sw.match(/const CACHE='capital-do-trem-v(\d+)'/)?.[1] || 0) >= 306, 'Cache atualizado para a nova experiência'],
  [built.includes('functions.invoke') && !built.includes('cdt-command-center'), 'Serviço interno de IA incluído no pacote web/Android, sem interface flutuante'],
  [profile.includes('src="./capital-ai.js"') && groupChat.includes('src="./capital-ai.js"') && privateChat.includes('src="./capital-ai.js"'), 'Assistente e atalhos disponíveis também no perfil e conversas'],
  [privacy.includes('Assistente de inteligência artificial e câmera') && privacy.includes('custos de API'), 'Política de privacidade informa envio opcional de imagens e custos da IA'],
  [update.includes('connectionDebounceTimer=window.setTimeout(()=>{') && update.includes('},13000);') && update.includes('13 segundos contínuos sem resposta válida'), 'Alerta offline após 13 segundos contínuos sem resposta válida'],
  [update.includes('Ao detectar o retorno real da internet, avisa imediatamente') && update.includes('reconnectTimer=window.setTimeout(()=>{alertBox.style.display=\'none\';},13000);'), 'Alerta de retorno dispara imediatamente e permanece 13 segundos'],
  [update.includes('backendRestricted?900000:(connectionDebounceTimer||confirmedOffline)?5000:(lowPowerMode()?45000:60000)') && update.includes('scheduleConnectionProbe') && update.includes("window.addEventListener('offline',showOffline)"), 'Monitoramento adaptativo de conexão sem toque na tela'],
  [account.includes('id="google-sign-in"') && authModule.includes("provider: 'google'") && account.includes('signInWithGoogleAccount'), 'Acesso Google disponível na tela de conta'],
  [account.includes('id="google-link-account"') && account.includes('linkGoogleIdentityToCurrentAccount') && authModule.includes('supabase.auth.linkIdentity') && authModule.includes('auth.getUser()'), 'Vinculação Google manual à conta autenticada existente, sem criar outro perfil'],
  [!account.includes('phone-login-number') && !account.includes('phone-login-code') && !authModule.includes('sendPhoneLoginCode') && !authModule.includes('verifyPhoneLoginCode'), 'Acesso por SMS removido; autenticação simplificada para Google e e-mail/senha']
];
for (const [ok, label] of checks) { console.log((ok ? 'OK  ' : 'ERRO ') + label); if (!ok) process.exitCode = 1; }
for (const [name, source] of [['capital-ai.js', ai], ['home-story-composer.js', camera]]) {
  const result = spawnSync(process.execPath, ['--check', '--input-type=module'], { input: source, encoding: 'utf8' });
  if (result.status !== 0) { console.error('Sintaxe ' + name + ':\n' + (result.stderr || result.stdout)); process.exitCode = 1; }
  else console.log('OK  Sintaxe ' + name);
}
if (process.exitCode) process.exit(process.exitCode);
console.log(checks.length + ' verificações da IA, câmera e atalhos concluídas.');
