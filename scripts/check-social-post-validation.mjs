import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../rede.js', import.meta.url), 'utf8');
const publish = source.slice(source.indexOf("$('publish-post').addEventListener"), source.indexOf("async function loadSongs"));
const checks = [
  ['usuário é autenticado antes de publicar', publish.indexOf("supabase.auth.getUser()") < publish.indexOf('api.submitMyPost(')],
  ['tipo de arquivo é validado antes de criar o post', publish.indexOf("!allowed.includes(file.type)") < publish.indexOf('api.submitMyPost(')],
  ['tamanho e arquivo vazio são validados antes de criar o post', publish.indexOf('file.size<1||file.size>maxBytes') < publish.indexOf('api.submitMyPost(')],
  ['upload usa o bucket social privado', publish.includes("from('capital-do-trem-social').upload")],
  ['registro de mídia aponta para o bucket privado', publish.includes("bucket_id:'capital-do-trem-social'")]
];
for (const [name, ok] of checks) console.log((ok ? 'OK  ' : 'ERRO') + ' ' + name);
if (checks.some(([, ok]) => !ok)) process.exit(1);
console.log('Validação preventiva de publicações aprovada: ' + checks.length + ' testes.');
