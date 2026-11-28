import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const files=['index.html','rede.html','bate-papo.html','mensagens.html','conta.html','admin.html','estudio.html','apoiadores.html','avatar.html','diagnostico.html','admin-apoiadores.html','mobile-bottom-nav.js','home-feed.js','music-playlists.js','bate-papo.html','chat-topics.js','rede.html','rede.js','conta.html','supabase/auth.js','supabase/migrations/20261116170000_discussion_topics.sql','scripts/prepare-web.mjs','sw.js','capital-futurista.css'];
const v=Object.fromEntries(await Promise.all(files.map(async p=>[p,await read(p)])));
const checks=[
 [['index.html','rede.html','bate-papo.html','mensagens.html','conta.html','admin.html','estudio.html','apoiadores.html','avatar.html','diagnostico.html','admin-apoiadores.html'].every(p=>v[p].includes('./mobile-bottom-nav.js'))&&v['mobile-bottom-nav.js'].includes('position:fixed!important')&&v['mobile-bottom-nav.js'].includes("href: './rede.html'"),'Barra inferior fixa permanece presente nas áreas principais do aplicativo'],
 [v['index.html'].includes('home-community-feed')&&v['index.html'].includes('home-feed-composer')&&v['index.html'].includes('home-feed.js'),'Feed com publicação fica na tela inicial'],
 [!v['index.html'].includes('id="eventos"')&&!v['index.html'].includes('data-go="eventos"')&&!v['index.html'].includes('getPublishedEvents()')&&!v['index.html'].includes('event-social-composer.js'),'Área Eventos removida da interface sem consultas automáticas ao banco'],
 [v['mobile-bottom-nav.js'].includes('capital-nav-size-standard')&&v['mobile-bottom-nav.js'].includes('.nav-icon')&&v['mobile-bottom-nav.js'].includes('.nav-label')&&!v['mobile-bottom-nav.js'].includes('a span,nav#nav button span'),'Ícone e legenda da navegação usam tamanhos separados e padronizados em todas as telas'],
 [v['bate-papo.html'].includes("pendingChatImages[key]||fileInput?.files?.[0]")&&v['bate-papo.html'].includes("brand:pendingChatImages.brand||brandFile?.files?.[0]||null,group:pendingChatImages.group||groupFile?.files?.[0]||null"),'Foto do grupo pode ser salva diretamente do arquivo selecionado, sem depender de estado intermediário'],
 [!v['index.html'].includes('data-page="pesquisa"')&&!v['index.html'].includes('id="pesquisa"')&&!v['index.html'].includes('random-video-results')&&!v['home-feed.js'].includes('shuffle-videos'),'Pesquisa e seu carregamento de vídeos foram removidos'],
 [v['index.html'].includes('capital-music-player')&&v['rede.html'].includes('class="playlist-manager card"')&&v['rede.js'].includes('api.createMyPlaylist'),'Central de Músicas tem player e o perfil tem criação de playlists'],
 [v['supabase/auth.js'].includes('export async function getPublishedSongs')&&v['supabase/auth.js'].includes('storage.createSignedUrls(paths, 60 * 60)'),'Músicas publicadas ficam disponíveis automaticamente com links temporários'],
 [/GRUPO • CAPITAL DO TREM/i.test(v['bate-papo.html'])&&!v['bate-papo.html'].includes('id="chat-topics"')&&!v['bate-papo.html'].includes('id="fazer-amigos"')&&!v['bate-papo.html'].includes('id="open-friends-profile"')&&v['supabase/auth.js'].includes('export async function requestPrivateConversation')&&v['mensagens.html'].includes('getPrivateConversationData'),'Chat mantém somente o grupo oficial e preserva conversas privadas individuais'],
 [!v['bate-papo.html'].includes('fala-uai-player')&&!v['bate-papo.html'].includes('createCapitalMusicPlayer'),'Chat não mistura player musical'],
 [!v['bate-papo.html'].includes('chat-topics.js')&&!v['sw.js'].includes('chat-topics.js'),'Página do chat não carrega o módulo de assuntos nem o coloca no cache'],
 [v['rede.html'].includes('profile-hidden-data')&&v['rede.html'].includes('profile-verified-seal')&&v['rede.html'].includes('stat-followers')&&v['rede.html'].includes('stat-following'),'Perfil fica focado em dados pessoais, seguidores e selo'],
 [v['rede.js'].includes("eq('status','published')")&&v['rede.js'].includes('profile-verified-seal'),'Selo aparece apenas para artistas publicados/aprovados'],
 [v['conta.html'].includes('SEJA BEM-VINDO')&&v['conta.html'].includes('MAQUINISTA DESSE TREM'),'Cadastro recebe mensagem de boas-vindas do projeto'],
 [v['conta.html'].includes('nome, foto, nome de usuário e descrição são opcionais')&&!/<input id="basic-display-name"[^>]*required/.test(v['conta.html']),'Nome do perfil pode ficar em branco; o perfil continua automático'],
 [v['scripts/prepare-web.mjs'].includes('home-feed.js')&&v['scripts/prepare-web.mjs'].includes('music-playlists.js')&&v['scripts/prepare-web.mjs'].includes('chat-topics.js'),'Todos os módulos entram nos pacotes nativos'],
 [v['sw.js'].includes('home-feed.js')&&v['sw.js'].includes('music-playlists.js')&&!v['sw.js'].includes('chat-topics.js'),'Módulos essenciais entram no cache PWA sem o módulo de assuntos']
];
for(const [ok,label] of checks){console.log((ok?'OK  ':'ERRO ')+label);if(!ok)process.exitCode=1;}
for(const [name,source] of [['home-feed.js',v['home-feed.js']],['music-playlists.js',v['music-playlists.js']],['chat-topics.js',v['chat-topics.js']],['rede.js',v['rede.js']],['supabase/auth.js',v['supabase/auth.js']]]){
 const result=spawnSync(process.execPath,['--check','--input-type=module'],{input:source,encoding:'utf8'});
 if(result.status!==0){console.error('Sintaxe '+name+':\n'+(result.stderr||result.stdout));process.exitCode=1}else console.log('OK  Sintaxe '+name);
}
if(process.exitCode)process.exit(process.exitCode);
console.log(checks.length+' verificações de navegação e organização concluídas.');
