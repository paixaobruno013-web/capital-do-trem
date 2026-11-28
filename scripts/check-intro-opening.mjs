import { readFile } from 'node:fs/promises';
const [index, admin, auth] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../admin.html', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/auth.js', import.meta.url), 'utf8')
]);
const storyComposer = await readFile(new URL('../home-story-composer.js', import.meta.url), 'utf8');
const pickerGuard = await readFile(new URL('../file-picker-guard.js', import.meta.url), 'utf8');
const checks = [
  ['retorno do seletor restaura a rota antes da abertura', /const FILE_PICKER_RETURN_KEY/.test(index) && /FILE_PICKER_RETURN_URL_KEY/.test(index) && /intro-smoke-skip/.test(index) && /file-picker-guard\.js/.test(index)],
  ['Minha conta carrega a proteção do seletor', /file-picker-guard\.js/.test(await readFile(new URL('../conta.html', import.meta.url), 'utf8'))],
  ['proteção persiste somente campos não sensíveis e nunca tenta restaurar arquivos', /DRAFT_PREFIX/.test(await readFile(new URL('../file-picker-guard.js', import.meta.url), 'utf8')) && /'file','password','hidden'/.test(await readFile(new URL('../file-picker-guard.js', import.meta.url), 'utf8'))],
  ['branding remoto prioriza o cache e limita a espera inicial a 1,8 segundo', index.includes('const branding=cachedBranding||await Promise.race([brandingRequest,brandingTimeout])') && index.includes('new Promise(resolve=>window.setTimeout(()=>resolve(null),1800))')],
  ['vídeo de abertura usa o endereço único publicado sem duplicar parâmetros de cache', /video\.src=currentOpeningVideo/.test(index) && !/cdt_opening=/.test(index)],
  ['vídeo de abertura evita autoplay concorrente, carrega sob demanda e não fica em loop', /video\.autoplay=false/.test(index) && /video\.preload='metadata'/.test(index) && /video\.loop=false/.test(index) && !/video\.autoplay=true/.test(index)],
  ['camadas de vídeos antigos são removidas antes de inserir a abertura atual', /querySelectorAll\('video, \.opening-video-background, \.opening-video-fallback'\)/.test(index)],
  ['bloqueio da marca antiga é ativado no head antes da abertura', index.indexOf("classList.add('intro-brand-pending')") < index.indexOf('<body')],
  ['CSS mantém a marca padrão invisível enquanto carrega a arte oficial', /intro-brand-pending \.intro-smoke__brand\{opacity:0!important;visibility:hidden!important\}/.test(index)],
  ['imagem de abertura tem fallback temporizado e libera a tela', /settleOpeningImage=useFallback=>/.test(index) && /setTimeout\(\(\)=>settleOpeningImage\(true\),6000\)/.test(index) && /intro\.addEventListener\('load',[\s\S]*?settleOpeningImage\(false\)/.test(index) && /intro\.addEventListener\('error',[\s\S]*?settleOpeningImage\(true\)/.test(index)],
  ['vídeo de abertura não coloca imagem de segurança ou poster', /video\.removeAttribute\('poster'\)/.test(index) && /video\.src=currentOpeningVideo/.test(index) && !/const openingPoster=document\.createElement\('img'\)/.test(index)],
  ['vídeo toca sem sobreposição e a marca local aparece somente se a mídia falhar', !/const openingPoster=document\.createElement\('img'\)/.test(index) && !/const fallback=document\.createElement\('img'\)/.test(index) && /video\.style\.opacity='1'/.test(index) && /screen\.classList\.remove\('custom-opening-screen'\)/.test(index) && /video\.style\.display='none'/.test(index) && /fallbackImage\.src='\.\/marca\.svg'/.test(index) && /video\.removeAttribute\('src'\);video\.load\(\)/.test(index)],
  ['vídeo de abertura respeita pausa de 15 minutos após falha', /const OPENING_VIDEO_RETRY_KEY=/.test(index) && /openingVideo&&!openingVideoCoolingDown\(\)\?openingVideo:''/.test(index) && /Date\.now\(\)\+15\*60\*1000/.test(index)],
  ['pausa do vídeo usa imagem alternativa sem criar vídeo com endereço vazio', /if\(!skipOpeningAfterFilePicker&&opening&&!currentOpeningVideo\)/.test(index) && /if\(!skipOpeningAfterFilePicker&&currentOpeningVideo\)/.test(index) && /if\(!skipOpeningAfterFilePicker&&!opening&&!currentOpeningVideo\)/.test(index)],
  ['vídeo de abertura limpa a pausa depois de reproduzir com sucesso', /video\.addEventListener\('playing',[\s\S]*?localStorage\.removeItem\(OPENING_VIDEO_RETRY_KEY\)/.test(index)],
  ['abertura padrão e vídeo respeitam 10 segundos após o primeiro quadro reproduzível ou fallback', /video\.addEventListener\('playing',[\s\S]*?beginOpeningClock\(\)/.test(index) && /const showOpeningFallback=\(\)=>[\s\S]*?beginOpeningClock\(\)/.test(index) && (index.match(/window\.setTimeout\(finish,10000\)/g)||[]).length===2 && !/window\.setTimeout\(finish,7000\)/.test(index)],
  ['abertura interrompe o vídeo ao sair do app para poupar bateria', /document\.addEventListener\('visibilitychange',[\s\S]*?video\.pause\(\);finish\(\)/.test(index)],
  ['vídeo da abertura tem fallback visual se falhar ou não carregar em doze segundos', /const showOpeningFallback=\(\)=>/.test(index) && /fallbackTimer=window\.setTimeout\(showOpeningFallback,12000\)/.test(index) && /video\.addEventListener\('error',[\s\S]*?showOpeningFallback\(\)/.test(index)],
  ['listeners do vídeo são registrados antes de iniciar o carregamento', /video\.addEventListener\('canplay'[\s\S]*?video\.load\(\)/.test(index)],
  ['trem de três vagões mantém a travessia configurada em 9,8 segundos', /opening-train-cross-sky 9\.8s/.test(index) && /opening-train-travel 9\.8s/.test(index) && !/opening-train-(?:cross-sky|travel) 5s/.test(index) && /opening-wagon-rear/.test(index) && /opening-wagon-dancers/.test(index) && /opening-wagon-front/.test(index)],
  ['abertura padrão também respeita 10 segundos', /intro-screen-out 10s/.test(index) && /intro-brand-in 9\.8s/.test(index)],
  ['painel e backend aceitam vídeos de abertura até 50 MB, conforme o bucket', /const max=isVideo\?50:8/.test(admin) && /file\.size>50\*1024\*1024/.test(admin) && /file\.size > 50 \* 1024 \* 1024/.test(auth)],
  ['painel aceita somente vídeo MP4 ou WebM e informa formato inválido', /validVideo=isVideo&&\(\['mp4','webm'\]\.includes\(ext\)/.test(admin) && /Escolha um vídeo MP4 ou WebM/.test(admin)],
  ['vídeos maiores que 6 MB usam envio retomável TUS com progresso', /tus-js-client@4/.test(auth) && /storage\.supabase\.co\/storage\/v1\/upload\/resumable/.test(auth) && /chunkSize: 6 \* 1024 \* 1024/.test(auth) && /options\.onProgress/.test(auth)],
  ['painel salva a preferência de áudio com a opção correta', /muted:sound\.value==='off'/.test(admin)],
  ['painel mostra progresso no envio do vídeo da abertura', /Enviando vídeo da abertura… '\+p\+'%'/ .test(admin)],
  ['abertura por imagem encerra sem acessar variável de vídeo inexistente', /const finish=\(\)=>\{if\(finished\)return;finished=true;progress=100;paint\(\);screen\.querySelector\('video'\)\?\.pause\(\);/.test(index)],
  ['restauração localiza campos pelo id real ou pelo name, sem usar namedItem para id', pickerGuard.includes('Array.from(form.elements||[]).find') && !pickerGuard.includes('form.elements.namedItem(selector.slice(1))')],
  ['restauração também roda após DOMContentLoaded e em pageshow', pickerGuard.includes("if(document.readyState==='loading')") && pickerGuard.includes("window.addEventListener('pageshow',restoreForms)")],
  ['Stories deixa o navegador escolher a resolução inicial para abrir a câmera mais rápido', storyComposer.includes('video: { facingMode: { ideal: facingMode } }') && !storyComposer.includes('width: { ideal: 960 }')],
  ['Stories registra loadeddata e canplay antes de chamar play', /addEventListener\('loadeddata', markCameraReady[\s\S]*?addEventListener\('canplay', markCameraReady[\s\S]*?await live\.play\(\)/.test(await readFile(new URL('../home-story-composer.js', import.meta.url), 'utf8'))],
  ['Stories não solicita zoom do hardware durante a abertura inicial da câmera', !(await readFile(new URL('../home-story-composer.js', import.meta.url), 'utf8')).split('function openComposer()')[0].includes('hardwareZoomActive = await applyZoomToTrack()')],
  ['Stories mantém o quadro capturado visível durante a codificação da foto', /live\.pause\(\);\s*live\.hidden = false;\s*photoPreview\.hidden = true;/.test(await readFile(new URL('../home-story-composer.js', import.meta.url), 'utf8'))],
  ['Stories reduz o tamanho de codificação para prévia mais rápida sem eliminar a qualidade', storyComposer.includes('960 / Math.max(cropWidth, cropHeight)') && storyComposer.includes("}, 'image/jpeg', 0.78)")]
];
for (const [name, ok] of checks) console.log((ok ? 'OK  ' : 'ERRO ') + name);
if (checks.some(([, ok]) => !ok)) process.exit(1);
console.log('Abertura: ' + checks.length + ' verificações aprovadas.');
