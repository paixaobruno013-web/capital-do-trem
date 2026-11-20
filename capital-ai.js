import * as auth from './supabase/auth.js';

export async function runCapitalAI({ prompt, imageDataUrl = '', mode = 'assistant' } = {}) {
  const cleanPrompt = String(prompt || '').trim().slice(0, 1800);
  if (!cleanPrompt && !imageDataUrl) throw new Error('Escreva uma pergunta ou escolha uma foto.');
  const supabase = auth.initSupabase();
  const { data: { session } = {}, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session?.access_token) throw new Error('Entre na sua conta para usar a IA do Capital do Trem.');
  const { data, error: invokeError } = await supabase.functions.invoke('capital-ai-assistant', {
    body: { prompt: cleanPrompt, image: imageDataUrl, mode }
  });
  if (invokeError) throw new Error(invokeError.message || 'A IA não respondeu. Tente novamente.');
  const answer = String(data?.answer || '').trim();
  if (!answer) throw new Error('A IA não retornou uma resposta.');
  return answer.slice(0, 5000);
}

function installCommandCenter() {
  if (document.getElementById('cdt-command-center')) return;
  const style = document.createElement('style');
  style.textContent = `
    #cdt-command-launch{position:fixed;z-index:9994;right:14px;bottom:calc(88px + env(safe-area-inset-bottom,0px));width:54px;height:54px;border:1px solid #ff5b63;border-radius:50%;background:linear-gradient(145deg,#ed1c24,#680b12);color:#fff;font-size:21px;font-weight:900;box-shadow:0 0 18px #ed1c2470;cursor:pointer}
    #cdt-command-center{position:fixed;z-index:10050;inset:0;display:none;align-items:flex-end;justify-content:center;background:#0009;padding:12px}
    #cdt-command-center.is-open{display:flex}
    #cdt-command-card{width:min(100%,520px);max-height:min(82dvh,760px);overflow:auto;padding:16px;border:1px solid #ed1c24;border-radius:20px;background:#090909;color:#fff;box-shadow:0 0 28px #ed1c2440}
    #cdt-command-card h2{margin:0;font-size:19px}#cdt-command-card p{color:#bbb;font-size:12px}
    #cdt-command-close{float:right;width:38px;height:38px;border:1px solid #555;border-radius:50%;background:#171717;color:#fff;font-size:22px}
    .cdt-command-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:14px 0}
    .cdt-command-grid button{min-height:58px;border:1px solid #383838;border-radius:12px;background:#151515;color:#fff;font-weight:800}
    .cdt-command-grid button:active{border-color:#ed1c24;background:#391015}
    #cdt-ai-prompt{width:100%;min-height:76px;resize:vertical;border:1px solid #444;border-radius:12px;background:#111;color:#fff;padding:11px;font:inherit}
    #cdt-ai-send{width:100%;min-height:44px;margin-top:8px;border:0;border-radius:12px;background:#ed1c24;color:#fff;font-weight:900}
    #cdt-ai-answer{white-space:pre-wrap;overflow-wrap:anywhere;margin-top:10px;padding:12px;border:1px solid #333;border-radius:12px;background:#111;min-height:24px}
    @media(min-width:700px){#cdt-command-center{align-items:center}#cdt-command-card{max-height:80vh}}
  `;
  document.head.append(style);
  const launch = document.createElement('button');
  launch.id = 'cdt-command-launch'; launch.type = 'button'; launch.textContent = '✦';
  launch.setAttribute('aria-label', 'Abrir comandos rápidos e assistente IA');
  const panel = document.createElement('div');
  panel.id = 'cdt-command-center'; panel.innerHTML = `
    <section id="cdt-command-card" role="dialog" aria-modal="true" aria-labelledby="cdt-command-title">
      <button id="cdt-command-close" type="button" aria-label="Fechar">×</button>
      <h2 id="cdt-command-title">✦ Central rápida Capital do Trem</h2>
      <p>Troque de área com um toque ou peça ajuda ao assistente.</p>
      <div class="cdt-command-grid" aria-label="Atalhos de navegação">
        <button type="button" data-cdt-go="inicio">⌂ Feed</button><button type="button" data-cdt-go="musicas">♫ Músicas</button><button type="button" data-cdt-go="pesquisa">⌕ Pesquisa</button>
        <button type="button" data-cdt-href="./bate-papo.html">💬 Chat</button><button type="button" data-cdt-href="./rede.html">👤 Perfil</button><button type="button" data-cdt-go="eventos">▦ Eventos</button>
      </div>
      <label for="cdt-ai-prompt"><strong>Assistente IA</strong></label>
      <textarea id="cdt-ai-prompt" maxlength="1800" placeholder="Ex.: Me ajude a criar uma legenda para divulgar meu lançamento…"></textarea>
      <button id="cdt-ai-send" type="button">Perguntar à IA</button>
      <div id="cdt-ai-answer" role="status" aria-live="polite">A IA será ativada quando o serviço seguro estiver configurado.</div>
      <p>As perguntas são enviadas ao serviço de IA somente quando você toca em Perguntar. Não envie senhas, documentos ou dados privados.</p>
    </section>`;
  document.body.append(launch, panel);
  const close = () => panel.classList.remove('is-open');
  launch.addEventListener('click', () => panel.classList.add('is-open'));
  panel.addEventListener('click', event => { if (event.target === panel) close(); });
  panel.querySelector('#cdt-command-close').addEventListener('click', close);
  panel.querySelectorAll('[data-cdt-go]').forEach(button => button.addEventListener('click', () => {
    const page = button.dataset.cdtGo;
    const target = document.querySelector('#nav button[data-page="' + page + '"]');
    if (target) target.click();
    else if (page === 'inicio') location.href = './index.html#inicio';
    else location.href = './index.html#' + page;
    close();
  }));
  panel.querySelectorAll('[data-cdt-href]').forEach(button => button.addEventListener('click', () => { location.href = button.dataset.cdtHref; }));
  panel.querySelector('#cdt-ai-send').addEventListener('click', async event => {
    const button = event.currentTarget, input = panel.querySelector('#cdt-ai-prompt'), output = panel.querySelector('#cdt-ai-answer');
    if (!input.value.trim()) { output.textContent = 'Escreva sua pergunta primeiro.'; return; }
    button.disabled = true; output.textContent = 'A IA está preparando uma resposta…';
    try { output.textContent = await runCapitalAI({ prompt: input.value, mode: 'assistant' }); }
    catch (error) { output.textContent = error?.message || 'Serviço de IA ainda não configurado.'; }
    finally { button.disabled = false; }
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installCommandCenter, { once: true });
else installCommandCenter();
