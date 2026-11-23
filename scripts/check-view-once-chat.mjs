import { readFile } from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [auth,privateChat,groupChat,sql,edge]=await Promise.all([
 read('supabase/auth.js'),read('mensagens.html'),read('bate-papo.html'),
 read('supabase/migrations/20261117150000_chat_view_once_media.sql'),
 read('supabase/functions/open-view-once-chat-media/index.ts')
]);
const checks=[
 [auth.includes('openViewOnceChatMedia')&&auth.includes('/functions/v1/open-view-once-chat-media')&&auth.includes('URL.createObjectURL(blob)'),'Cliente recebe bytes da função protegida, sem URL assinada reutilizável'],
 [auth.includes('viewed_by_me: viewedIds.has(message.id)'),'Consulta se a conta já consumiu sua visualização'],
 [auth.includes("view_once:Boolean(viewOnce&&attachment&&['image','video','audio'].includes(attachment.type))"),'Só foto, vídeo e áudio podem ser enviados como visualização única'],
 [privateChat.includes('private-view-once')&&privateChat.includes("openViewOnceChatMedia(message.id,isGroup?'group':'private')"),'Conversa privada oferece envio e abertura única'],
 [groupChat.includes('chat-view-once')&&groupChat.includes("openViewOnceChatMedia(message.id,'group')"),'Bate-papo geral oferece envio e abertura única'],
 [sql.includes('primary key (message_id, viewer_id)')&&sql.includes('private_message_views'),'Cada destinatário tem um registro independente de visualização'],
 [sql.includes('viewer_id = (select auth.uid())')&&sql.includes('m.sender_id <> (select auth.uid())'),'RLS impede o remetente de abrir a própria mídia'],
 [sql.includes('private.is_current_chat_group_member()')&&sql.includes("c.status = 'accepted'"),'RLS exige participação válida no grupo ou conversa privada aceita'],
 [edge.includes('auth.getUser(token)')&&edge.includes('userClient.from(table)'),'Função valida a sessão e consulta mensagem com RLS do usuário'],
 [edge.includes('.storage')&&edge.includes('.download(message.attachment_path)'),'Arquivo é entregue pelo servidor, sem expor caminho ou URL assinada'],
 [edge.indexOf('.insert({ message_id: messageId, viewer_id: user.id })')>edge.indexOf('.download(message.attachment_path)'),'Registro único é consumido após confirmar que o arquivo existe'],
 [edge.includes('consumeError.code === "23505"')&&edge.includes('409'),'Requisições repetidas são bloqueadas pela chave única'],
 [edge.includes('Cache-Control')&&edge.includes('no-store')&&edge.includes('X-Content-Type-Options'),'Resposta de mídia impede cache HTTP e sniffing']
];
for(const [ok,label] of checks){console.log((ok?'OK  ':'ERRO ')+label);if(!ok)process.exitCode=1;}
if(process.exitCode)process.exit(process.exitCode);
console.log(checks.length+' verificações de visualização única concluídas.');
