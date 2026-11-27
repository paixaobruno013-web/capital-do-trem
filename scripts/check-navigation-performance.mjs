import {readFile} from 'node:fs/promises';
const index=await readFile(new URL('../index.html',import.meta.url),'utf8');
const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8');
const player=await readFile(new URL('../persistent-music-player.js',import.meta.url),'utf8');
const checks=[
 [index.includes('const pageScrollPositions=new Map()'),'Guarda posição de rolagem por área'],
 [index.includes('const current=pages.find(page=>page.classList.contains(\'active\'))')&&index.includes('if(current===target){activePageId=target.id;return;}'),'Ignora navegação repetida usando a tela ativa real como referência'],
 [index.includes('<div id="capital-music-player"')&&index.includes('persistent-music-player.js')&&player.includes('document.body.append(root)'), 'Mantém o player global montado fora das áreas internas'],
 [index.includes("current.querySelectorAll('audio,video')")&&index.includes('media.pause()'),'Interrompe mídia ao sair da área'],
 [index.includes('nav.scrollBy({left:')&&!index.includes('t.scrollIntoView({block:\'nearest\''),'Move somente a navegação horizontal sem deslocar a página'],
 [index.includes('window.scrollTo(0,restoreY)'),'Restaura a posição da área ao retornar'],
 [!index.includes('}'+String.fromCharCode(92)+'nnav#nav')&&!index.includes('}'+String.fromCharCode(92)+'n.intro-smoke'),'Não deixa escapes de quebra de linha inválidos nas regras CSS da navegação e abertura'],
 [index.includes('nav#nav{position:fixed;z-index:500;left:0;right:0;bottom:0'),'Mantém a barra principal fixa na parte inferior no celular'],
 [/const CACHE='capital-do-trem-v(\d+)'/.test(sw)&&Number(sw.match(/const CACHE='capital-do-trem-v(\d+)'/)?.[1]||0)>=297,'Atualiza a versão do cache para evitar arquivos antigos após a atualização']
];
for(const [ok,label] of checks){console.log((ok?'OK  ':'ERRO ')+label);if(!ok)process.exitCode=1;}
if(process.exitCode)process.exit(process.exitCode);
console.log(checks.length+' verificações de navegação fluida concluídas.');
