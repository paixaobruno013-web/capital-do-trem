import {readFile} from 'node:fs/promises';
const index=await readFile(new URL('../index.html',import.meta.url),'utf8');
const sw=await readFile(new URL('../sw.js',import.meta.url),'utf8');
const checks=[
 [index.includes('const pageScrollPositions=new Map()'),'Guarda posição de rolagem por área'],
 [index.includes('if(!target||target.id===activePageId)return;'),'Ignora navegação repetida para a mesma área'],
 [index.includes("current.querySelectorAll('audio,video')")&&index.includes('media.pause()'),'Interrompe mídia ao sair da área'],
 [index.includes('nav.scrollBy({left:')&&!index.includes('t.scrollIntoView({block:\'nearest\''),'Move somente a navegação horizontal sem deslocar a página'],
 [index.includes('window.scrollTo(0,restoreY)'),'Restaura a posição da área ao retornar'],
 [sw.includes("const CACHE='capital-do-trem-v296';"),'Atualiza a versão do cache para evitar arquivos antigos após a atualização']
];
for(const [ok,label] of checks){console.log((ok?'OK  ':'ERRO ')+label);if(!ok)process.exitCode=1;}
if(process.exitCode)process.exit(process.exitCode);
console.log(checks.length+' verificações de navegação fluida concluídas.');
