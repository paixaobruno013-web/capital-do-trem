import { readFile } from 'node:fs/promises';
const [index, admin, auth] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../admin.html', import.meta.url), 'utf8'),
  readFile(new URL('../supabase/auth.js', import.meta.url), 'utf8')
]);
const update = await readFile(new URL('../update.js', import.meta.url), 'utf8');
const pickerGuard = await readFile(new URL('../file-picker-guard.js', import.meta.url), 'utf8');
const checks = [
  ['retorno do seletor restaura a rota antes da abertura', /const FILE_PICKER_RETURN_KEY/.test(index) && /FILE_PICKER_RETURN_URL_KEY/.test(index) && /intro-smoke-skip/.test(index) && /file-picker-guard\.js/.test(index)],
  ['Minha conta carrega a proteção do seletor', /file-picker-guard\.js/.test(await readFile(new URL('../conta.html', import.meta.url), 'utf8'))],
  ['proteção persiste somente campos não sensíveis e nunca tenta restaurar arquivos', /DRAFT_PREFIX/.test(await readFile(new URL('../file-picker-guard.js', import.meta.url), 'utf8')) && /'file','password','hidden'/.test(await readFile(new URL('../file-picker-guard.js', import.meta.url), 'utf8'))],
  ['abertura consulta branding atual antes de usar o cache local', /const branding=await brandingRequest\.catch\(\(\)=>cachedBranding\|\|\{\}\)/.test(index)],
  ['vídeo de abertura usa o endereço único publicado sem duplicar parâmetros de cache', /video\.src=currentOpeningVideo/.test(index) && !/cdt_opening=/.test(index)],
  ['camadas de vídeos antigos são removidas antes de inserir a abertura atual', /querySelectorAll\('video, \.opening-video-background, \.opening-video-fallback'\)/.test(index)],
  ['bloqueio da marca antiga é ativado no head antes da abertura', index.indexOf("classList.add('intro-brand-pending')") < index.indexOf('<body')],
  ['CSS mantém a marca padrão invisível enquanto carrega a arte oficial', /intro-brand-pending \.intro-smoke__brand\{opacity:0!important;visibility:hidden!important\}/.test(index)],
  ['imagem de abertura só aparece depois de carregar ou cair no fallback', /intro\.addEventListener\('load',[\s\S]*?intro-brand-pending/.test(index) && /intro\.addEventListener\('error',[\s\S]*?marca\.svg[\s\S]*?intro-brand-pending/.test(index)],
  ['vídeo de abertura aparece sem poster estático ou logo extra', /video\.removeAttribute\('poster'\)/.test(index) && !/posterLayer/.test(index) && !/video\.poster=/.test(index)],
  ['vídeo permanece visível sem poster em espera ou travamento', !/video\.addEventListener\('waiting'/.test(index) && !/video\.addEventListener\('stalled'/.test(index) && /video\.style\.opacity='1'/.test(index)],
  ['abertura inicia o relógio junto do poster e permanece em 7 segundos mesmo com vídeo lento', /beginOpeningClock\(\);[\s\S]*?video\.addEventListener\('loadeddata'/.test(index) && /finishTimer=window\.setTimeout\(finish,7000\)/.test(index)],
  ['vídeo da abertura tem fallback visual se falhar ou não carregar em cinco segundos', /const showOpeningFallback=\(\)=>/.test(index) && /fallbackTimer=window\.setTimeout\(\(\)=>\{if\(!openingFrameShown\)showOpeningFallback\(\);\},5000\)/.test(index) && /video\.addEventListener\('error',[\s\S]*?showOpeningFallback\(\)/.test(index)],
  ['listeners do vídeo são registrados antes de iniciar o carregamento', /video\.addEventListener\('loadeddata'[\s\S]*?video\.load\(\)/.test(index)],
  ['trem de três vagões atravessa a abertura em 5 segundos', /opening-train-cross-sky 5s/.test(index) && /opening-train-travel 5s/.test(index) && /opening-wagon-rear/.test(index) && /opening-wagon-dancers/.test(index) && /opening-wagon-front/.test(index)],
  ['frase foi removida da abertura e o banner continua no painel inicial', !/class="opening-slogan"/.test(index) && !index.includes('.intro-smoke.custom-opening-screen .opening-slogan') && /class="hero reference-banner"/.test(index) && /AQUI A MÚSICA/.test(index)],
  ['painel e backend aceitam vídeos de abertura até 50 MB, conforme o bucket', /const max=isVideo\?50:8/.test(admin) && /file\.size>50\*1024\*1024/.test(admin) && /file\.size > 50 \* 1024 \* 1024/.test(auth)],
  ['painel aceita somente vídeo MP4 ou WebM e informa formato inválido', /validVideo=isVideo&&\(\['mp4','webm'\]\.includes\(ext\)/.test(admin) && /Escolha um vídeo MP4 ou WebM/.test(admin)],
  ['vídeos maiores que 6 MB usam envio retomável TUS com progresso', /tus-js-client@4/.test(auth) && /storage\.supabase\.co\/storage\/v1\/upload\/resumable/.test(auth) && /chunkSize: 6 \* 1024 \* 1024/.test(auth) && /options\.onProgress/.test(auth)],
  ['painel salva a preferência de áudio com a opção correta', /muted:sound\.value==='off'/.test(admin)],
  ['painel mostra progresso no envio do vídeo da abertura', /Enviando vídeo da abertura… '\+p\+'%'/ .test(admin)],
  ['abertura por imagem encerra sem acessar variável de vídeo inexistente', /const finish=\(\)=>\{if\(finished\)return;finished=true;progress=100;paint\(\);screen\.querySelector\('video'\)\?\.pause\(\);/.test(index)],
  ['restauração localiza campos pelo id real ou pelo name, sem usar namedItem para id', pickerGuard.includes('Array.from(form.elements||[]).find') && !pickerGuard.includes('form.elements.namedItem(selector.slice(1))')],
  ['restauração também roda após DOMContentLoaded e em pageshow', pickerGuard.includes("if(document.readyState==='loading')") && pickerGuard.includes("window.addEventListener('pageshow',restoreForms)")]
];
for (const [name, ok] of checks) console.log((ok ? 'OK  ' : 'ERRO ') + name);
if (checks.some(([, ok]) => !ok)) process.exit(1);
console.log('Abertura: ' + checks.length + ' verificações aprovadas.');

// Social profile and full-screen music player regression checks.
const profileHtml = await readFile(new URL('../perfil.html', import.meta.url), 'utf8');
const profileChecks = [
  ['capa personalizável e seletor de imagem', profileHtml.includes('id="profile-cover"') && profileHtml.includes('id="cover-file"') && auth.includes('uploadMyProfileCover')],
  ['atalho para trocar a foto de perfil', profileHtml.includes('avatar-add')],
  ['abas com áreas independentes de publicações, vídeos e curtidas', ['id="profile-posts"','id="profile-videos"','id="profile-likes"'].every(value => profileHtml.includes(value)) && profileHtml.includes('profile-content-panel')],
  ['contadores de publicações, seguidores e seguindo', profileHtml.includes("'publicações'") && profileHtml.includes("'seguidores'") && profileHtml.includes("'seguindo'")],
  ['JavaScript do perfil sem sequências de quebra de linha inválidas', !profileHtml.includes(';\\n  if')],
  ['Stories exibem a história do perfil visitado', profileHtml.includes('story.author_id===profile.user_id')],
  ['aba Curtidas também mostra publicações somente de texto', profileHtml.includes("(mode==='posts'||mode==='likes')&&!mediaItems.length")]
];
const musicChecks = [
  ['player imersivo com capa ampliada', index.includes('player-cover') && index.includes('94vw')],
  ['player com anterior, próximo, voltar, avançar e repetir', ['player-previous','player-next','player-rewind','player-forward','player-repeat'].every(value => index.includes(value))],
  ['catálogo mantém faixas válidas mesmo se um link individual falhar', auth.includes('const available = items.filter(song => signedByPath.has(song.storage_path))') && auth.includes('createSignedUrl(song.storage_path, 60 * 60)')]
];
for (const [name, ok] of [...profileChecks, ...musicChecks]) console.log((ok ? 'OK  ' : 'ERRO ') + name);
if ([...profileChecks, ...musicChecks].some(([, ok]) => !ok)) process.exit(1);
console.log('Perfil e player: ' + (profileChecks.length + musicChecks.length) + ' verificações.');

const connectionChecks = [
  ['alerta de sinal restabelecido permanece por 13 segundos', /reconnectTimer=window\.setTimeout\(\(\)=>\{alertBox\.style\.display='none';\},13000\)/.test(update)],
  ['alerta offline permanece por 13 segundos', /offlineAlertTimer=window\.setTimeout[\s\S]*?13000/.test(update)],
  ['checagem de internet ocorre a cada 10 segundos', /setInterval\(verifyRealConnection,10\*1000\)/.test(update)]
];
for (const [name, ok] of connectionChecks) console.log((ok ? 'OK  ' : 'ERRO ') + name);
if (connectionChecks.some(([, ok]) => !ok)) process.exit(1);
