import { readFile } from 'node:fs/promises';
const [index, admin, auth] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../admin.html', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/auth.js', import.meta.url), 'utf8')
]);
const checks = [
  ['retorno do seletor de arquivos não repete o vídeo de abertura', /FILE_PICKER_RETURN_KEY/.test(index) && /file-picker-guard\.js/.test(index)],
  ['abertura consulta branding atual antes de usar o cache local', /const branding=await brandingRequest\.catch\(\(\)=>cachedBranding\|\|\{\}\)/.test(index)],
  ['vídeo de abertura usa o endereço único publicado sem duplicar parâmetros de cache', /video\.src=currentOpeningVideo/.test(index) && !/cdt_opening=/.test(index)],
  ['camadas de vídeos antigos são removidas antes de inserir a abertura atual', /querySelectorAll\('video, \.opening-video-background, \.opening-video-fallback'\)/.test(index)],
  ['bloqueio da marca antiga é ativado no head antes da abertura', index.indexOf("classList.add('intro-brand-pending')") < index.indexOf('<body')],
  ['CSS mantém a marca padrão invisível enquanto carrega a arte oficial', /intro-brand-pending \.intro-smoke__brand\{opacity:0!important;visibility:hidden!important\}/.test(index)],
  ['imagem de abertura só aparece depois de carregar ou cair no fallback', /intro\.addEventListener\('load',[\s\S]*?intro-brand-pending/.test(index) && /intro\.addEventListener\('error',[\s\S]*?marca\.svg[\s\S]*?intro-brand-pending/.test(index)],
  ['vídeo de abertura aparece sem poster estático ou logo extra', /video\.removeAttribute\('poster'\)/.test(index) && !/posterLayer/.test(index) && !/video\.poster=/.test(index)],
  ['vídeo permanece visível sem poster em espera ou travamento', !/video\.addEventListener\('waiting'/.test(index) && !/video\.addEventListener\('stalled'/.test(index) && /video\.style\.opacity='1'/.test(index)],
  ['abertura inicia o relógio junto do poster e permanece em 10 segundos mesmo com vídeo lento', /beginOpeningClock\(\);[\s\S]*?video\.addEventListener\('loadeddata'/.test(index) && /finishTimer=window\.setTimeout\(finish,10000\)/.test(index) && !/12000/.test(index)],
  ['vídeo da abertura tem fallback visual se falhar ou não carregar em cinco segundos', /const showOpeningFallback=\(\)=>/.test(index) && /fallbackTimer=window\.setTimeout\(showOpeningFallback,5000\)/.test(index) && /video\.addEventListener\('error',[\s\S]*?showOpeningFallback\(\)/.test(index)],
  ['listeners do vídeo são registrados antes de iniciar o carregamento', /video\.addEventListener\('loadeddata'[\s\S]*?video\.load\(\)/.test(index)],
  ['trem de três vagões mantém a travessia configurada em 9,8 segundos', /opening-train-cross-sky 9\.8s/.test(index) && /opening-train-travel 9\.8s/.test(index) && /opening-wagon-rear/.test(index) && /opening-wagon-dancers/.test(index) && /opening-wagon-front/.test(index)],
  ['painel e backend aceitam vídeos de abertura até 50 MB, conforme o bucket', /const max=isVideo\?50:8/.test(admin) && /file\.size>50\*1024\*1024/.test(admin) && /file\.size > 50 \* 1024 \* 1024/.test(auth)],
  ['painel aceita somente vídeo MP4 ou WebM e informa formato inválido', /validVideo=isVideo&&\(\['mp4','webm'\]\.includes\(ext\)/.test(admin) && /Escolha um vídeo MP4 ou WebM/.test(admin)],
  ['vídeos maiores que 6 MB usam envio retomável TUS com progresso', /tus-js-client@4/.test(auth) && /storage\.supabase\.co\/storage\/v1\/upload\/resumable/.test(auth) && /chunkSize: 6 \* 1024 \* 1024/.test(auth) && /options\.onProgress/.test(auth)],
  ['painel salva a preferência de áudio com a opção correta', /muted:sound\.value==='off'/.test(admin)],
  ['painel mostra progresso no envio do vídeo da abertura', /Enviando vídeo da abertura… '\+p\+'%'/ .test(admin)],
  ['abertura por imagem encerra sem acessar variável de vídeo inexistente', /const finish=\(\)=>\{if\(finished\)return;finished=true;progress=100;paint\(\);screen\.querySelector\('video'\)\?\.pause\(\);/.test(index)]
];
for (const [name, ok] of checks) console.log((ok ? 'OK  ' : 'ERRO ') + name);
if (checks.some(([, ok]) => !ok)) process.exit(1);
console.log('Abertura: ' + checks.length + ' verificações aprovadas.');
