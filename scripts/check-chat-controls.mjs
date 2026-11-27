import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
const [room, enhancements, emoji, privateChat, worker, stories, home, auth, adminMedia, packageJson, capacitorConfig, androidWorkflow, iosWorkflow] = await Promise.all([
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
  read('.github/workflows/android-debug.yml'),
  read('.github/workflows/ios-build.yml')
]);

const checks = [

  ['FALA UAI sem slogan antigo nem frase complementar', !room.includes('FALA UAI da quebrada') && !room.includes('Artistas e Usuários Uai, juntos na mesma conversa.')],
  ['perfil individual superior abre a sala do grupo', /id="open-group-profile"/.test(room) && /aria-controls="capital-do-trem-room"/.test(room) && /toggleProfilePanel\(groupRoom,groupProfileButton,groupRoom.hidden\)/.test(room)],
  ['FALA UAI mantém o grupo como único espaço coletivo e remove a descoberta por localização', /id="open-group-card"/.test(room) && /GRUPO • CAPITAL DO TREM/.test(room) && !/id="fazer-amigos"/.test(room) && !/id="open-friends-profile"/.test(room)],
  ['sala oficial do grupo começa recolhida', /id="capital-do-trem-room" class="panel chat-panel" hidden/.test(room) && !/id="fazer-amigos"/.test(room)],
  ['cache PWA usa versão identificada e atualizável', /const CACHE='capital-do-trem-v[0-9]+'/.test(worker)],
  ['configurações permitem escolher foto dos dois perfis oficiais do chat', /id="chat-brand-image-file"/.test(room) && /id="chat-group-image-file"/.test(room) && !/chat-friends-image-file|friends-profile-image/.test(room)],
  ['salvar publica as duas imagens oficiais no servidor e restringe a alteração ao administrador', /saveAdminChatProfileImages/.test(room) && /getPublicChatProfileImages/.test(room) && /adminCanEdit/.test(room) && /Imagens oficiais salvas e publicadas para todos os usuários/.test(room)],


  ['grupo usa marca branca e é o único grupo coletivo exibido', /id="open-group-card"/.test(room) && /src="\.\/marca\.svg" alt="Logo branco do grupo Capital do Trem"/.test(room) && !/id="fazer-amigos"|id="open-friends-profile"/.test(room)],
  ['ícone pequeno do GRUPO • CAPITAL DO TREM fica à esquerda e usuários online aparecem ao lado em tamanho menor', /id="open-group-profile"[\s\S]*?chat-profile-chip-avatar[\s\S]*?capital-do-trem-logo\.jpg/.test(room) && /id="chat-online-profiles"/.test(room) && /chat-online-profile-avatar\{width:36px/.test(styles) && /online.has\(profile.user_id\)/.test(room)],
  ['faixa superior mostra somente perfis online e abre seus perfis', /id="chat-profile-rail"/.test(room) && /id="chat-online-profiles"/.test(room) && /online.has\(profile.user_id\)/.test(room) && /rede\.html\?perfil=/.test(room)],
  ['atalhos superiores e seletor de tema foram retirados da tela do chat', !/Pular para o conteúdo principal/.test(room) && !/<header class="fala-uai-clean-header"/.test(room) && !/id="theme"/.test(room)],
  ['presença do grupo exibe quem está online e indicador de digitação em tempo real', /id="group-live-presence"/.test(room) && /startUserPresence/.test(room) && /subscribeUserPresence/.test(room) && /capital-fala-uai-group-typing/.test(room) && /announceGroupTyping/.test(room)],
  ['perfis online continuam acessíveis para iniciar contatos individuais', /id="chat-profile-rail"/.test(room) && /rede\.html\?perfil=/.test(room) && /getPublicProfiles\(\)/.test(room)],
  ['botão CONVERSAR abre a conversa privada aceita ou informa que o convite aguarda aceite', /shareParams\.get\('user'\)/.test(privateChat) && /openConversation\(target\)/.test(privateChat) && /Seu convite foi enviado/.test(privateChat)],
  ['FALA UAI não mantém diretório por localização nem solicita GPS', !/id="fazer-amigos"/.test(room) && !/chat-friends-directory|chat-friends-distance|chat-friends-search/.test(room) && !/getPublicProfiles\(\)[\s\S]{0,500}não usamos GPS/.test(room)],


  ['botão Chat da página inicial abre o FALA UAI', /class=\"nav-chat\" href=\"\.\/bate-papo\.html\"/.test(home)],
  ['navegação móvel abre o FALA UAI', /label: 'Chat', icon: '💬', href: '\.\/bate-papo\.html'/.test(await read('mobile-bottom-nav.js'))],

  ['atalho PRIVADO não aparece como cartão ou ícone separado', !/data-open-view="private-conversations-shortcut"/.test(room) && !/id="private-conversations-shortcut"/.test(room) && !/<strong>PRIVADO<\/strong>/.test(room)],
  ['bate-papo por assuntos foi retirado e não chama tabela inexistente', !/id="chat-topics"/.test(room) && !/topic-create-form/.test(room) && !/chat-topics\.js/.test(room) && !/discussion_topics/.test(room)],


  ['navegação simplificada não injeta cartões de retorno nem caixa de entrada antiga', !room.includes('cdt-inbox-navigation') && !room.includes('id="cdt-chat-inbox"') && !room.includes('Todas as conversas')],
  ['chat preserva rolagem vertical e impede arrasto lateral em celulares', /overflow-x:hidden!important/.test(room) && /touch-action:pan-y/.test(room) && /overflow-wrap:anywhere/.test(room)],

  ['chat geral possui formulário e campo de mensagem', /id="composer"/.test(room) && /id="message"/.test(room)],
  ['mensagens próprias são diferenciadas visualmente e alinhadas à direita', /if\(m\.author_id===currentUserId\)box\.classList\.add\('message-own'\)/.test(room) && /#messages \.message\.message-own\{align-self:flex-end/.test(room)],
  ['chat geral possui área do seletor de emojis', /id="emoji-tray"[^>]*data-emoji-picker/.test(room)],
  ['botão de emojis é inserido no formulário', /emojiButton\.type\s*=\s*['"]button['"][\s\S]*?emojiButton\.id\s*=\s*['"]emoji-toggle['"]/.test(enhancements) && /form\.insertBefore\(tools,input\)/.test(enhancements)],
  ['botão de gravação de áudio é criado e inserido', /recordButton\.id\s*=\s*['"]record-audio['"]/.test(enhancements) && /tools\.append\(emojiButton,recordButton\)/.test(enhancements)],
  ['gravador solicita permissão de microfone e usa MediaRecorder', /getUserMedia\(\{audio:/.test(enhancements) && /new MediaRecorder\(/.test(enhancements)],
  ['gravador encerra faixas do microfone', /getTracks\(\)\.forEach\(track=>track\.stop\(\)\)/.test(enhancements)],
  ['gravador tem limite de 60 segundos', /60000/.test(enhancements)],
  ['seletor oferece categorias e recentes', /Mais usados/.test(emoji) && /emoji-category-tabs/.test(emoji) && /renderRecent\(\)/.test(emoji)],
  ['seletor usa imagens Twemoji com fallback para ampliar compatibilidade de emojis', emoji.includes('cdn.jsdelivr.net/gh/jdecked/twemoji') && /emoji-fallback/.test(emoji)],
  ['nenhuma área de descoberta de amizades aparece no FALA UAI', !/id="fazer-amigos"/.test(room) && !/id="open-friends-profile"/.test(room) && !/Fazer amizades pela localização/i.test(room)],
  ['conversas privadas continuam individuais e só abrem após aceite do convite', /requestPrivateConversation/.test(auth) && /requestedUserId=shareParams\.get\('user'\)/.test(privateChat) && /if\(target\)await openConversation\(target\)/.test(privateChat)],
  ['presença online usa canal Realtime compartilhado e acompanha entrada e saída em tempo real', /capital-do-trem-user-presence/.test(auth) && /presenceChannel\.track/.test(auth) && /subscribeUserPresence/.test(auth) && /presenceState\(\)/.test(auth)],
  ['conversa privada transmite eventos de digitação sem gravar mensagens falsas', /subscribePrivateTyping/.test(auth) && /event: 'typing'/.test(auth) && /channel\.send/.test(auth)],
  ['FALA UAI mostra o indicador “está digitando” e atualiza status online ao vivo', /id="typing-indicator"/.test(privateChat) && / está digitando…/.test(privateChat) && /addEventListener\('input',announceTyping\)/.test(privateChat) && /subscribeUserPresence\(next=>/.test(privateChat)],
  ['mensagens privadas possuem botão de emojis e seletor', /id="private-emoji-toggle"/.test(privateChat) && /id="emoji-tray"[^>]*data-emoji-picker/.test(privateChat)],
  ['mensagens do bate-papo geral usam imagens emoji com fallback', /function appendEmojiText\(/.test(room) && /appendEmojiText\(body,part\)/.test(room)],
  ['conversas privadas e grupo renderizam emojis com suporte visual ampliado', /function appendEmojiText\(/.test(privateChat) && /appendEmojiText\(body,m\.content\|\|''\)/.test(privateChat) && /appendEmojiText\(body,m\.content\|\|''\)/.test(privateChat)],
  ['service worker inclui os módulos de chat e mensagens privadas', /chat-enhancements\.js/.test(worker) && /emoji-picker\.js/.test(worker) && /mensagens\.html/.test(worker)],
  ['aviso compacto de atualização exibe identidade 🚂 e botão vermelho', /🚂 NOVA ATUALIZAÇÃO DISPONÍVEL/.test(await read('update.js')) && /button.textContent='ATUALIZAR'/.test(await read('update.js')) && /background:#ed1c24/.test(await read('update.js'))],

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
  ['arte padrão antiga fica oculta até confirmar a mídia atual', home.includes('<img src="marca.svg" alt="" style="visibility:hidden">') && home.includes("if(!skipOpeningAfterFilePicker&&opening&&!openingVideo)") && home.includes("if(!skipOpeningAfterFilePicker&&openingVideo)")],
  ['vídeo de abertura não exibe poster ou imagem de segurança durante o carregamento', home.includes("video.removeAttribute('poster')") && home.includes("video.style.opacity='1'") && !home.includes('const openingPoster=document.createElement(\'img\')') && !home.includes('const fallback=document.createElement(\'img\')')],
  ['vídeo usa pré-carregamento leve, velocidade normal e não repete em loop', home.includes("video.preload='metadata'") && home.includes('video.playbackRate=1') && home.includes('video.loop=false') && home.includes("video.removeAttribute('poster')")],
  ['relógio de 10 segundos só começa quando o vídeo toca ou quando entra o fallback', home.includes("video.addEventListener('playing',()=>{video.style.opacity='1'") && home.includes('beginOpeningClock();') && home.includes("video.addEventListener('canplay'") && home.includes('showOpeningFallback();')],
  ['vídeo de abertura pausa e encerra ao sair do app', home.includes("document.addEventListener('visibilitychange',()=>{if(document.hidden&&!finished){video.pause();finish();}")],
  ['abertura de vídeo mantém duração fixa de 10 segundos e interrompe o áudio ao fechar', home.includes('finishTimer=window.setTimeout(finish,10000)') && home.includes("video.pause();screen.classList.add('is-finished')") && home.includes("video.addEventListener('ended',finish")],
  ['trem de 9,8 segundos começa junto do relógio de 10 segundos', home.includes('clockStarted=true;startOpeningTrain();finishTimer=window.setTimeout(finish,10000)') && home.includes("opening-train-cross-sky 9.8s linear 1 both") && home.includes("video.addEventListener('error',()=>{console.warn('Falha ao carregar o vídeo de abertura; usando a imagem de segurança.');showOpeningFallback();")],
  ['abertura com imagem sincroniza trem por 9,8 segundos e duração total de 10 segundos', home.includes('const begin=()=>{if(started)return;started=true;startOpeningTrain();window.setTimeout(finish,10000);}') && home.includes("animation:opening-train-cross-sky 9.8s linear 1 both!important") && home.includes('intro-screen-out 10s')],
  ['autoplay com som bloqueado tenta iniciar mudo e oferece ativação', home.includes('video.muted=true;video.defaultMuted=true') && home.includes("audioButton.style.display='block'")],
  ['vídeo lento aguarda até 12 segundos pela reprodução antes da imagem de segurança e mantém o relógio de 10 segundos após o início', !home.includes("video.addEventListener('waiting'") && !home.includes("video.addEventListener('stalled'") && home.includes('finishTimer=window.setTimeout(finish,10000)') && home.includes('fallbackTimer=window.setTimeout(showOpeningFallback,12000)') && home.includes("video.addEventListener('playing'") && home.includes('beginOpeningClock();')],
  ['publicação do vídeo confirma URL gravada e resposta de vídeo', adminMedia.includes('saved.openingVideoUrl!==url') && adminMedia.includes("method:'HEAD',cache:'no-store'") && adminMedia.includes('content-type') ]


];

const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log((passed ? 'OK  ' : 'ERRO') + ' ' + name);
if (failed.length) process.exit(1);
console.log('Verificação de controles do chat aprovada: ' + checks.length + ' testes.');
