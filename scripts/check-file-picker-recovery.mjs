import { readFile } from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [guard,index,chat,network,studio,admin,build]=await Promise.all(['file-picker-guard.js','index.html','bate-papo.html','rede.html','estudio.html','admin.html','scripts/prepare-web.mjs'].map(read));
const checks=[
 [guard.includes('capitaldotrem_file_picker_draft_v1:')&&guard.includes('restoreForms()'),'Rascunhos de campos são guardados e restaurados após retorno do seletor'],
 [guard.includes("input[type=\"file\"]")&&guard.includes('MAX_AGE=120000'),'Retorno do seletor é identificado sem tentar restaurar o arquivo por script'],
 [index.includes('file-picker-guard.js'),'Página principal carrega a proteção'],
 [chat.includes('file-picker-guard.js'),'FALA UAI carrega a proteção para anexos'],
 [network.includes('file-picker-guard.js'),'Rede social carrega a proteção para mídias'],
 [studio.includes('file-picker-guard.js'),'Estúdio carrega a proteção para arquivos'],
 [admin.includes('file-picker-guard.js'),'Painel administrativo carrega a proteção'],
 [build.includes("'file-picker-guard.js'"),'Proteção é incluída no pacote Android/PWA']
];
for(const [ok,label] of checks){console.log((ok?'OK  ':'FAIL ')+label);if(!ok)process.exitCode=1;}
if(process.exitCode)process.exit(process.exitCode);
console.log(checks.length+' verificações de recuperação de formulário concluídas.');
