import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
const [room, enhancements, emoji, privateChat, worker, stories, home, auth, adminMedia] = await Promise.all([
  read('bate-papo.html'),
  read('chat-enhancements.js'),
  read('emoji-picker.js'),
  read('mensagens.html'),
  read('sw.js'),
  read('stories-ui.js'),
  read('index.html'),
  read('supabase/auth.js'),
  read('admin-media.js')
]);

const checks = [
  ['chat geral possui formulário e campo de mensagem', /id="composer"/.test(room) && /id="message"/.test(room)],
  ['chat geral possui área do seletor de emojis', /id="emoji-tray"[^>]*data-emoji-picker/.test(room)],
  ['botão de emojis é inserido no formulário', /emojiButton\.type\s*=\s*['"]button['"][\s\S]*?emojiButton\.id\s*=\s*['"]emoji-toggle['"]/.test(enhancements) && /form\.insertBefore\(tools,input\)/.test(enhancements)],
  ['botão de gravação de áudio é criado e inserido', /recordButton\.id\s*=\s*['"]record-audio['"]/.test(enhancements) && /tools\.append\(emojiButton,recordButton\)/.test(enhancements)],
  ['gravador solicita permissão de microfone e usa MediaRecorder', /getUserMedia\(\{audio:/.test(enhancements) && /new MediaRecorder\(/.test(enhancements)],
  ['gravador encerra faixas do microfone', /getTracks\(\)\.forEach\(track=>track\.stop\(\)\)/.test(enhancements)],
  ['gravador tem limite de 60 segundos', /60000/.test(enhancements)],
  ['seletor oferece categorias e recentes', /Mais usados/.test(emoji) && /emoji-category-tabs/.test(emoji) && /renderRecent\(\)/.test(emoji)],
  ['mensagens privadas possuem botão de emojis e seletor', /id="private-emoji-toggle"/.test(privateChat) && /id="emoji-tray"[^>]*data-emoji-picker/.test(privateChat)],
  ['service worker inclui os módulos de chat e mensagens privadas', /chat-enhancements\.js/.test(worker) && /emoji-picker\.js/.test(worker) && /mensagens\.html/.test(worker)],

  ['Stories da comunidade não criam uma faixa de perfis duplicados', !/id="community-story-tray"/.test(home) && !/community-story-chip/.test(stories)],
  ['Stories são vinculados à foto do perfil existente pelo ID do usuário', /dataset\.profileUserId=profile\.user_id/.test(home) && /community-profile-avatar\[data-profile-user-id\]/.test(stories)],
  ['foto do perfil abre os Stories com suporte a teclado', /avatar\.addEventListener\('click', open\)/.test(stories) && /avatar\.addEventListener\('keydown'/.test(stories)],
  ['aro verde e aro de visto são aplicados na foto existente', /has-active-story/.test(stories) && /has-seen-story/.test(stories) && /\.community-profile-avatar\.has-active-story/.test(home)],

  ['configurações públicas da abertura ignoram cache HTTP antigo', auth.includes('/rest/v1/site_settings') && auth.includes("cache: 'no-store'") && auth.includes('Cache-Control')],
  ['vídeo de abertura usa URL estável para reaproveitar cache do arquivo enviado', home.includes('const currentOpeningImage=opening,currentOpeningVideo=openingVideo') && !home.includes('cdt_opening') && !home.includes('randomUUID')],
  ['arte padrão antiga fica oculta até confirmar a mídia atual', home.includes('<img src="marca.svg" alt="" style="visibility:hidden">') && home.includes("if(opening&&!openingVideo)")],
  ['poster atual aparece imediatamente durante o carregamento do vídeo', home.includes("video.poster=currentOpeningImage||profile||'./marca.svg'") && home.includes("video.style.opacity='1'")],
  ['vídeo usa pré-carregamento e velocidade normal', home.includes("video.preload='auto'") && home.includes('video.playbackRate=1')],
  ['cronômetro só começa quando o vídeo realmente reproduz', home.includes("video.addEventListener('playing',beginOpeningClock") && !home.includes('const startedAt=performance.now();let progress=3,finished=false')],
  ['abertura de vídeo mantém 10 segundos após iniciar a reprodução', home.includes("video.addEventListener('playing',beginOpeningClock") && home.includes('finishTimer=window.setTimeout(finish,10000)') && home.includes("video.addEventListener('ended',finish")],
  ['trem de 9,8 segundos começa junto com a reprodução real do vídeo', home.includes("video.addEventListener('playing',beginOpeningClock") && home.includes('clockStarted=true;startOpeningTrain();finishTimer=window.setTimeout(finish,10000)') && home.includes("opening-train-cross-sky 9.8s linear 1 both") && home.includes("video.addEventListener('error',()=>{console.warn('Vídeo de abertura indisponível; mantendo a imagem de poster.');beginOpeningClock();")],
  ['abertura com imagem também sincroniza trem e duração de 10 segundos após carregar', home.includes('const begin=()=>{if(started)return;started=true;startOpeningTrain();window.setTimeout(finish,10000);}') && home.includes("animation:intro-screen-out 10s ease-in-out forwards") && home.includes('Abertura de 10 segundos com som ligado por padrão.')],
  ['autoplay com som bloqueado tenta iniciar mudo e oferece ativação', home.includes('video.muted=true;video.defaultMuted=true') && home.includes("audioButton.style.display='block'")],
  ['vídeo lento possui fallback para não travar a abertura', home.includes("if(!clockStarted){video.pause();video.style.opacity='0';beginOpeningClock();}")],
  ['publicação do vídeo confirma URL gravada e resposta de vídeo', adminMedia.includes('saved.openingVideoUrl!==url') && adminMedia.includes("method:'HEAD',cache:'no-store'") && adminMedia.includes('content-type') ]


];

const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log((passed ? 'OK  ' : 'ERRO') + ' ' + name);
if (failed.length) process.exit(1);
console.log('Verificação de controles do chat aprovada: ' + checks.length + ' testes.');
