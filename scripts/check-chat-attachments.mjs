import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const [auth, group, privateChat, migration, prepare, worker] = await Promise.all([
  read('supabase/auth.js'),
  read('bate-papo.html'),
  read('mensagens.html'),
  read('supabase/migrations/20261111100000_secure_chat_file_attachments.sql'),
  read('scripts/prepare-web.mjs'),
  read('sw.js')
]);
const checks = [
  ['bucket novo é privado e limita arquivos a 20 MB', /'capital-do-trem-chat'[\s\S]*?false[\s\S]*?20971520/.test(migration)],
  ['bucket restringe MIME de imagens, vídeos, áudios e documentos', /application\/pdf/.test(migration) && /wordprocessingml/.test(migration) && /spreadsheetml/.test(migration) && /presentationml/.test(migration)],
  ['política de leitura verifica membro do grupo ou participante da conversa aceita', /chat_private_files_read_authorized[\s\S]*?is_current_chat_group_member[\s\S]*?private_conversations[\s\S]*?status = 'accepted'/.test(migration)],
  ['política de envio limita caminho ao usuário e conversa autorizada', /chat_private_files_upload_authorized[\s\S]*?auth\.uid\(\)::text[\s\S]*?status = 'accepted'/.test(migration)],
  ['mensagens privadas guardam caminho e metadados do anexo', /alter table public\.private_messages[\s\S]*?attachment_path[\s\S]*?attachment_type[\s\S]*?attachment_size/.test(migration)],
  ['URLs de anexos são assinadas por tempo limitado', /createSignedUrl\(path, 3600\)/.test(auth) && /createSignedUrls\(paths, 3600\)/.test(auth)],
  ['upload do grupo usa pasta group no bucket privado', /export async function uploadChatAttachment[\s\S]*?const path = 'group\/' \+ user\.id[\s\S]*?uploadChatFile\(file, path\)/.test(auth)],
  ['upload privado usa pasta private/conversa/usuário', /const path='private\/'\+conversationId\+'\/'\+user\.id/.test(auth)],
  ['mensagem privada aceita arquivo e preserva o controle de conversa', /export async function sendPrivateMessage\(conversationId,content,file=null\)[\s\S]*?uploadChatFile\(file,path\)[\s\S]*?private_messages/.test(auth)],
  ['grupo oferece galeria, câmera, áudio e documentos', /addAttachOption\('🖼️','Fotos e vídeos'/.test(group) && /addAttachOption\('📄','Documento'/.test(group) && /addAttachOption\('🎵','Áudio'/.test(group) && /addAttachOption\('📷','Câmera'/.test(group)],
  ['grupo exibe prévia e remoção do anexo antes do envio', /remove-chat-attachment/.test(group) && /clearSelectedAttachment/.test(group)],
  ['grupo renderiza documentos e mídia com URL temporária', /m\.attachment_type==='document'/.test(group) && /m\.attachment_url/.test(group)],
  ['conversa privada oferece menu de anexos e prévia', /id="private-attach"/.test(privateChat) && /id="private-attachment-preview"/.test(privateChat) && /private-attachment-menu/.test(privateChat)],
  ['conversa privada envia arquivo junto da legenda', /sendPrivateMessage\(active\.id,value,selectedPrivateFile\)/.test(privateChat)],
  ['conversa privada renderiza foto, vídeo, áudio e documento', /m\.attachment_type==='image'/.test(privateChat) && /m\.attachment_type==='video'/.test(privateChat) && /m\.attachment_type==='audio'/.test(privateChat) && /m\.attachment_type==='document'/.test(privateChat)],
  ['build Android/iOS inclui páginas e módulo Supabase atualizado', /'mensagens\.html'/.test(prepare) && /'bate-papo\.html'/.test(prepare) && /'supabase\/auth\.js'/.test(prepare)],
  ['service worker recebeu versão de cache nova e inclui as conversas', /capital-do-trem-v258/.test(worker) && /mensagens\.html/.test(worker) && /bate-papo\.html/.test(worker)]
];
const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log((ok ? 'OK  ' : 'ERRO') + ' ' + name);
if (failed.length) process.exit(1);
console.log('Anexos seguros do chat verificados: ' + checks.length + ' testes.');
