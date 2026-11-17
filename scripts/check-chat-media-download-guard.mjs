import { readFile } from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [privateChat,groupChat]=await Promise.all([read('mensagens.html'),read('bate-papo.html')]);
const checks=[
 [privateChat.includes("controlsList','nodownload")&&privateChat.includes("addEventListener('contextmenu',event=>event.preventDefault())"),'Conversa privada oculta o download nativo e bloqueia menu de contexto da mídia'],
 [groupChat.includes("controlsList','nodownload")&&groupChat.includes("addEventListener('contextmenu',event=>event.preventDefault())"),'Bate-papo geral oculta o download nativo e bloqueia menu de contexto da mídia'],
 [privateChat.includes('protectChatMediaElement(img)')&&privateChat.includes('protectChatMediaElement(video)'),'Imagens e vídeos privados usam proteção de interface'],
 [groupChat.includes('protectChatMediaElement(img)')&&groupChat.includes('protectChatMediaElement(video)'),'Imagens e vídeos do grupo usam proteção de interface']
];
for(const [ok,label] of checks){console.log((ok?'OK  ':'ERRO ')+label);if(!ok)process.exitCode=1;}
if(process.exitCode)process.exit(process.exitCode);
console.log(checks.length+' verificações de proteção de downloads concluídas.');
