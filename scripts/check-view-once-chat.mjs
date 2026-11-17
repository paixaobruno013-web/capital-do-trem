import { readFile } from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [auth,privateChat,groupChat,sql]=await Promise.all([
 read('supabase/auth.js'),read('mensagens.html'),read('bate-papo.html'),
 read('supabase/migrations/20261117150000_chat_view_once_media.sql')
]);
const checks=[
 [auth.includes('openViewOnceChatMedia')&&auth.includes('signChatAttachment(message.attachment_path, 300)'),'Abertura exige reivindicar o acesso antes de assinar a mídia'],
 [auth.includes('viewed_by_me: viewedIds.has(message.id)'),'Consulta se a conta já consumiu sua visualização'],
 [auth.includes("view_once:Boolean(viewOnce&&attachment&&['image','video','audio'].includes(attachment.type))"),'Só foto, vídeo e áudio podem ser enviados como visualização única'],
 [privateChat.includes('private-view-once')&&privateChat.includes("openViewOnceChatMedia(message.id,isGroup?'group':'private')"),'Conversa privada oferece envio e abertura única'],
 [groupChat.includes('chat-view-once')&&groupChat.includes("openViewOnceChatMedia(message.id,'group')"),'Bate-papo geral oferece envio e abertura única'],
 [sql.includes('primary key (message_id, viewer_id)')&&sql.includes('private_message_views'),'Cada destinatário tem um registro independente de visualização'],
 [sql.includes('viewer_id = (select auth.uid())')&&sql.includes('m.sender_id <> (select auth.uid())'),'RLS impede o remetente de abrir a própria mídia'],
 [sql.includes('private.is_current_chat_group_member()')&&sql.includes("c.status = 'accepted'"),'RLS exige participação válida no grupo ou conversa privada aceita']
];
for(const [ok,label] of checks){console.log((ok?'OK  ':'ERRO ')+label);if(!ok)process.exitCode=1;}
if(process.exitCode)process.exit(process.exitCode);
console.log(checks.length+' verificações de visualização única concluídas.');
