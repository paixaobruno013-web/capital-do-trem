import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
const [room, enhancements, emoji, privateChat, worker, stories, home, auth, adminMedia, packageJson, capacitorConfig, androidWorkflow, iosWorkflow, moderationMigration] = await Promise.all([
  read('bate-papo.html'),
  read('chat-enhancements.js'),
  read('emoji-picker.js'),
  read('mensagens.html'),
  read('sw.js'),
  read('stories-ui.js'),
  read('index.html'),
  read('supabase/auth.js'),
  read('admin-media.js'),
  read('package.json'),
  read('capacitor.config.ts'),
  read('.github/workflows/android-debug-apk.yml'),
  read('.github/workflows/ios-build.yml'),
  read('supabase/migrations/20261113080000_post_publication_song_restrictions.sql')
]);

const checks = [
  ['chat geral possui formulário e campo de mensagem', /id="composer"/.test(room) && /id="message"/.test(room)],
  ['moderação do chat exige perfil de artista aprovado e reserva bloqueio global ao administrador', moderationMigration.includes("a.status = 'published'") && moderationMigration.includes("if p_action in ('release', 'block_app') and not v_admin then") && moderationMigration.includes('private.is_admin()') && !moderationMigration.includes('moderator.group_id') && moderationMigration.includes('p_target_user_id = auth.uid()') && moderationMigration.includes('public.admin_users au')],
  ['chat geral possui área do seletor de emojis', /id="emoji-tray"[^>]*data-emoji-picker/.test(room)],
  ['botão de emojis é inserido no formulário', /emojiButton\.type\s*=\s*['"]button['"][\s\S]*?emojiButton\.id\s*=\s*['"]emoji-toggle['"]/.test(enhancements) && /form\.insertBefore\(tools,input\)/.test(enhancements)],
  ['botão de gravação de áudio é criado e inserido', /recordButton\.id\s*=\s*['"]record-audio['"]/.test(enhancements) && /tools\.append\(emojiButton,recordButton\)/.test(enhancements)],
  ['gravador solicita permissão de microfone e usa MediaRecorder', /getUserMedia\(\{audio:/.test(enhancements) && /new MediaRecorder\(/.test(enhancements)],
  ['gravador encerra faixas do microfone', /getTracks\(\)\.forEach\(track=>track\.stop\(\)\)/.test(enhancements)],
  ['gravador tem limite de 60 segundos', /60000/.test(enhancements)],
  ['seletor oferece categorias e recentes', /Mais usados/.test(emoji) && /emoji-category-tabs/.test(emoji) && /renderRecent\(\)/.test(emoji)],
  ['seletor renderiza emojis Unicode nativamente sem depender de imagens externas', /font-variant-emoji:emoji/.test(emoji) && /b\.textContent=e/.test(emoji) && !emoji.includes('twemojiUrl')],
  ['Fazer Amigos aparece abaixo do bate-papo e lista somente perfis públicos', /id=\"fazer-amigos\"/.test(room) && /chat-friends-directory/.test(room) && /getPublicProfiles\(\)/.test(room) && /is_public/.test(auth)],
  ['Fazer Amigos não cria ícone extra na navegação inicial e permanece abaixo do chat', !/data-page=\"amigos\"/.test(home) && /id=\"fazer-amigos\"/.test(room) && /chat-friends-directory/.test(room)],
  ['mensagens privadas possuem botão de emojis e seletor', /id="private-emoji-toggle"/.test(privateChat) && /id="emoji-tray"[^>]*data-emoji-picker/.test(privateChat)],
  ['mensagens do bate-papo geral preservam emojis Unicode completos sem dependência externa', /function appendEmojiText\(target,value\)/.test(room) && /Preserva a sequência Unicode completa/.test(room) && /appendEmojiText\(body,part\)/.test(room)],
  ['conversas privadas e grupo preservam emojis Unicode completos nas mensagens', /function appendEmojiText\(target,value\)/.test(privateChat) && /Preserva a sequência Unicode completa/.test(privateChat) && /appendEmojiText\(b,m\.content\|\|''\)/.test(privateChat) && /appendEmojiText\(box,m\.content\|\|''\)/.test(privateChat)],
  ['service worker inclui os módulos de chat e mensagens privadas', /chat-enhancements\.js/.test(worker) && /emoji-picker\.js/.test(worker) && /mensagens\.html/.test(worker)],

  ['seletor mantém campo de mensagem e envio visíveis enquanto aberto', !privateChat.includes('#compose.emoji-open #message,#compose.emoji-open #send,#compose.emoji-open #private-emoji-toggle{display:none}') && !room.includes('.composer.emoji-open #message,.composer.emoji-open #camera-open,.composer.emoji-open #record-audio,.composer.emoji-open #send,.composer.emoji-open .chat-tools{display:none!important}')],
  ['seletor insere emoji na posição do cursor e atualiza recentes', emoji.includes("setRangeText(e,start,end,'end')") && emoji.includes('remember(e)')],
  ['grupo mantém câmera, gravação de áudio e envio disponíveis com emojis abertos', !room.includes('.composer.emoji-open #message,.composer.emoji-open #camera-open,.composer.emoji-open #record-audio,.composer.emoji-open #send,.composer.emoji-open .chat-tools{display:none!important}') && room.includes('id="camera-open"') && room.includes('id="send"')],
  ['aplicativo usa Capacitor 8 em versões alinhadas para Android e iOS', packageJson.includes('"@capacitor/android": "8.6.0"') && packageJson.includes('"@capacitor/core": "8.6.0"') && packageJson.includes('"@capacitor/ios": "8.6.0"') && capacitorConfig.includes("appId: 'com.capitaldotrem.app'")],
  ['compilação Android valida SDK e alvo de API 36', /platforms;android-36/.test(androidWorkflow) && /targetSdkVersion/.test((await read(' .github/workflows/store-package-validation.yml'.trim())) )],
  ['compilação iOS usa Xcode em macOS e sincroniza Capacitor', /runs-on: macos-latest/.test(iosWorkflow) && /npx cap sync ios/.test(iosWorkflow) && /xcodebuild/.test(iosWorkflow)],
  ['Stories da comunidade não criam uma faixa de perfis duplicados', !/id="community-story-tray"/.test(home) && !/community-story-chip/.test(stories)],
  ['Stories são vinculados à foto do perfil existente pelo ID do usuário', /dataset\.profileUserId=profile\.user_id/.test(home) && /community-profile-avatar\[data-profile-user-id\]/.test(stories)],
  ['foto do perfil abre os Stories com suporte a teclado', /avatar\.addEventListener\('click', open\)/.test(stories) && /avatar\.addEventListener\('keydown'/.test(stories)],
  ['aro verde e aro de visto são aplicados na foto existente', /has-active-story/.test(stories) && /has-seen-story/.test(stories) && /\.community-profile-avatar\.has-active-story/.test(home)],

  ['configurações públicas da abertura ignoram cache HTTP antigo', auth.includes('/rest/v1/site_settings') && auth.includes("cache: 'no-store'") && auth.includes('Cache-Control')],
  ['vídeo de abertura usa URL estável para reaproveitar cache do arquivo enviado', home.includes('const currentOpeningImage=opening,currentOpeningVideo=openingVideo') && !home.includes('cdt_opening') && !home.includes('randomUUID')],
  ['arte padrão antiga fica oculta até confirmar a mídia atual', home.includes('<img src="marca.svg" alt="" style="visibility:hidden">') && home.includes("if(opening&&!openingVideo)")],
  ['vídeo de abertura aparece sem poster ou logo extra durante o carregamento', home.includes("video.removeAttribute('poster')") && !home.includes('video.poster=') && home.includes("video.style.opacity='1'")],
  ['vídeo usa pré-carregamento e velocidade normal', home.includes("video.preload='auto'") && home.includes('video.playbackRate=1')],
  ['relógio de 7 segundos começa quando o vídeo realmente reproduz', home.includes("video.addEventListener('playing',()=>{clearTimeout(fallbackTimer);beginOpeningClock();") && home.includes('finishTimer=window.setTimeout(finish,7000)')],
  ['abertura de vídeo mantém duração fixa de 7 segundos e mantém o áudio até o fim', home.includes('finishTimer=window.setTimeout(finish,7000)') && home.includes('video.pause();openingPoster.remove();screen.classList.add(\'is-finished\')') && !home.includes("video.addEventListener('ended',finish")],
  ['trem de 5 segundos começa junto do relógio de 7 segundos', home.includes('clockStarted=true;startOpeningTrain();finishTimer=window.setTimeout(finish,7000)') && home.includes("opening-train-cross-sky 5s linear 1 both") && home.includes("video.addEventListener('error',()=>{console.warn('Falha ao carregar o vídeo de abertura; usando a imagem de segurança.');showOpeningFallback();")],
  ['abertura com imagem sincroniza trem por 5 segundos e duração total de 7 segundos', home.includes('const begin=()=>{if(started)return;started=true;startOpeningTrain();window.setTimeout(finish,7000);}') && home.includes("animation:opening-train-cross-sky 5s linear 1 both!important") && home.includes('Abertura de 7 segundos com som ligado por padrão.')],
  ['autoplay com som bloqueado tenta iniciar mudo e oferece ativação', home.includes('video.muted=true;video.defaultMuted=true') && home.includes("audioButton.style.display='block'")],
  ['vídeo lento usa imagem de segurança após doze segundos e então exibe a abertura por 7 segundos', !home.includes("video.addEventListener('waiting'") && !home.includes("video.addEventListener('stalled'") && home.includes('finishTimer=window.setTimeout(finish,7000)') && home.includes('fallbackTimer=window.setTimeout(()=>{if(!openingFrameShown)showOpeningFallback();},12000)') && home.includes('const showOpeningFallback=()=>') && home.includes('beginOpeningClock();')],
  ['publicação do vídeo confirma URL gravada e resposta de vídeo', adminMedia.includes('saved.openingVideoUrl!==url') && adminMedia.includes("method:'HEAD',cache:'no-store'") && adminMedia.includes('content-type')],
  ['texto AQUI A MÚSICA NÃO PARA foi removido somente da abertura e o banner inicial foi restaurado', !home.includes('class="opening-slogan"') && !home.includes('.intro-smoke.custom-opening-screen .opening-slogan') && home.includes('class="hero reference-banner"')]


];

const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log((passed ? 'OK  ' : 'ERRO') + ' ' + name);
if (failed.length) process.exit(1);
console.log('Verificação de controles do chat aprovada: ' + checks.length + ' testes.');
