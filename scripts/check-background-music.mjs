import { readFile } from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [index,player,persistent,prepare,sw]=await Promise.all(['index.html','capital-music-player.js','persistent-music-player.js','scripts/prepare-web.mjs','sw.js'].map(read));
const checks=[
 [index.includes('persistent-music-player.js'),'Carrega o gerenciador do player persistente'],
 [persistent.includes("document.body.append(root)")&&persistent.includes("ROOT_ID='capital-music-player'"),'Move o player musical para fora das páginas que alternam'],
 [persistent.includes('position:fixed')&&persistent.includes('ct-player-ready'),'Mantém controles compactos visíveis nas outras áreas'],
 [persistent.includes("audio.addEventListener('play',reveal)"),'Mantém o dock disponível durante a reprodução e após pausar'],
 [player.includes('function configureMediaSession()')&&player.includes("['play',()=>audio.play()]")&&player.includes("['nexttrack',()=>step(1)]"),'Expõe comandos de mídia do sistema'],
 [player.includes("['seekto',details=>")&&player.includes("['seekbackward',details=>"),'Suporta busca pela tela de bloqueio quando disponível'],
 [prepare.includes("'persistent-music-player.js'"),'Inclui o módulo no pacote Android/PWA'],
 [sw.includes("'./persistent-music-player.js'"),'Inclui o módulo no cache offline']
];
for(const [ok,label] of checks){console.log((ok?'OK  ':'ERRO ')+label);if(!ok)process.exitCode=1;}
if(process.exitCode)process.exit(process.exitCode);
console.log(checks.length+' verificações de música em segundo plano concluídas.');
