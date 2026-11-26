#!/usr/bin/env node
import fs from 'node:fs';
const read = path => fs.readFileSync(path,'utf8');
const chat = read('bate-papo.html');
const messages = read('mensagens.html');
const auth = read('supabase/auth.js');
const sw = read('sw.js');
const migration = read('supabase/migrations/20261126193000_chat_official_images_public_read.sql');
const checks = [
  ['Imagens oficiais consultadas no servidor', /getPublicChatProfileImages/.test(chat) && /getPublicChatProfileImages/.test(auth)],
  ['Alteração das imagens validada no servidor como admin', /saveAdminChatProfileImages/.test(auth) && /isCurrentUserAdmin()/.test(auth)],
  ['Upload das imagens usa armazenamento remoto', /capital-do-trem-media/.test(auth) && /chat-group/.test(auth)],
  ['Configurações visuais do chat têm leitura pública limitada', /chat_brand_profile_image_url/.test(migration) && /chat_group_profile_image_url/.test(migration)],
  ['Interface das imagens não grava mais preferências locais', !/cdt_fala_(?:brand|group)_image_v1|localStorage\.setItem\(chatImageKeys/.test(chat)],
  ['Painel de participantes do grupo disponível', /group-participants-list/.test(chat) && /getChatGroupDirectory/.test(auth)],
  ['Diretório do grupo limita dados de perfil a perfis públicos', /eq\('is_public',true\)/.test(auth)],
  ['Galeria do grupo mantém filtragem de foto e vídeo', /getChatMessages\(100\)/.test(chat) && /attachment_type/.test(chat)],
  ['Galeria privada consulta somente a conversa selecionada', /getPrivateMessages\(active\.id\)/.test(messages) && /private-media-gallery/.test(messages)],
  ['Atualização invalida cache anterior do PWA', /capital-do-trem-v326/.test(sw)]
];
const failed = checks.filter(([,ok])=>!ok);
for (const [name,ok] of checks) console.log((ok?'✓ ':'✗ ')+name);
if(failed.length) process.exit(1);
console.log('Validação de perfil, galerias e cache aprovada: '+checks.length+' verificações.');
