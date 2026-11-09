import {uploadChatAttachment,sendChatMessage} from './supabase/auth.js';

const form=document.getElementById('composer');
const input=document.getElementById('message');
const list=document.getElementById('messages');
const status=document.getElementById('status');
if(!form||!input||!list) throw new Error('Área do chat não encontrada.');

const style=document.createElement('style');
style.textContent=`
.chat-tools{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0}
.chat-tools button{background:var(--panel);border:1px solid var(--line);color:var(--fg);padding:8px 11px;min-height:40px}
.emoji-panel{display:none;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;padding:10px;margin:8px 0;border:1px solid var(--line);border-radius:12px;background:var(--panel)}
.emoji-panel.open{display:grid}
.emoji-choice{font-size:25px!important;padding:7px!important;min-height:44px!important;background:var(--bg)!important;border:1px solid var(--line)!important}
@keyframes cdt-fire{0%,100%{transform:translateY(2px) scale(.96)}50%{transform:translateY(-6px) scale(1.1)}}
@keyframes cdt-train{0%{transform:translateX(-4px)}50%{transform:translateX(4px)}100%{transform:translateX(-4px)}}
@keyframes cdt-sing{0%,100%{transform:rotate(-6deg) translateY(0)}50%{transform:rotate(6deg) translateY(-4px)}}
@keyframes cdt-laugh{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg) translateY(-3px)}}
.cdt-fire{display:inline-block;animation:cdt-fire .65s ease-in-out infinite}
.cdt-train{display:inline-block;animation:cdt-train .55s ease-in-out infinite}
.cdt-sing{display:inline-block;animation:cdt-sing .8s ease-in-out infinite}
.cdt-laugh{display:inline-block;animation:cdt-laugh .45s ease-in-out infinite}
.message-attachment{display:block;margin-top:8px;max-width:min(100%,340px)}
.message-attachment img{display:block;width:100%;height:auto;max-height:360px;object-fit:contain;border-radius:12px}
.message-attachment audio{width:100%;min-width:220px}
.media-preview{padding:8px;margin:8px 0;border:1px solid var(--line);border-radius:10px;color:var(--muted);font-size:13px}
`;
document.head.append(style);
const tools=document.createElement('div');tools.className='chat-tools';
tools.innerHTML='<button type="button" id="cdt-emojis">😊 Emojis</button><button type="button" id="cdt-photo">🖼️ Foto</button><button type="button" id="cdt-audio">🎵 Áudio</button><button type="button" id="cdt-record">🎙️ Gravar voz</button>';
const emojiPanel=document.createElement('div');emojiPanel.className='emoji-panel';
const preview=document.createElement('div');preview.className='media-preview';preview.hidden=true;
const imageInput=document.createElement('input');imageInput.type='file';imageInput.accept='image/jpeg,image/png,image/webp';imageInput.hidden=true;
const audioInput=document.createElement('input');audioInput.type='file';audioInput.accept='audio/*';audioInput.hidden=true;
form.before(tools,emojiPanel,preview,imageInput,audioInput);
const emojis=[['🎤','cdt-sing','Cantor de microfone'],['🚂','cdt-train','Trem andando'],['🔥','cdt-fire','Fogo subindo'],['😂','cdt-laugh','Gargalhada'],['🤣','cdt-laugh','Rindo muito'],['👍','','Joia'],['❤️','','Coração'],['👏','','Aplausos'],['💯','','É isso'],['😍','','Apaixonado'],['🙌','','Comemoração'],['😎','','Estiloso'],['🎶','cdt-sing','Música'],['🚀','','Pra cima'],['💥','','Explosão'],['🤝','','Parceria'],['💪','','Força'],['🥳','','Festa'],['😢','','Choro'],['🙏','','Gratidão'],['👑','','Rei'],['💃','','Dança'],['🕺','','Dança'],['🎧','','Som']];
for(const [symbol,animation,label] of emojis){const button=document.createElement('button');button.type='button';button.className='emoji-choice';button.title=label;button.setAttribute('aria-label',label);const span=document.createElement('span');span.textContent=symbol;if(animation)span.className=animation;button.append(span);button.addEventListener('click',()=>{input.value+=(input.value?' ':'')+symbol;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();});emojiPanel.append(button);}
tools.querySelector('#cdt-emojis').addEventListener('click',()=>{emojiPanel.classList.toggle('open');});
tools.querySelector('#cdt-photo').addEventListener('click',()=>imageInput.click());
tools.querySelector('#cdt-audio').addEventListener('click',()=>audioInput.click());
let attachmentFile=null,recorder=null,chunks=[];
function choose(file){attachmentFile=file||null;preview.hidden=!file;preview.textContent=file?'Anexo: '+file.name+' • '+(file.size/1048576).toFixed(1)+' MB':'';input.required=!file;}
imageInput.addEventListener('change',()=>choose(imageInput.files?.[0]));
audioInput.addEventListener('change',()=>choose(audioInput.files?.[0]));
tools.querySelector('#cdt-record').addEventListener('click',async event=>{
 const button=event.currentTarget;
 if(recorder?.state==='recording'){recorder.stop();return;}
 try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});recorder=new MediaRecorder(stream);chunks=[];
 recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
 recorder.onstop=()=>{const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});choose(new File([blob],'audio-da-conversa.webm',{type:blob.type}));stream.getTracks().forEach(track=>track.stop());button.textContent='🎙️ Gravar voz';};
 recorder.start();button.textContent='⏹️ Parar gravação';
 }catch(error){status.textContent='Libere o acesso ao microfone nas permissões do celular.';}
});
form.addEventListener('submit',async event=>{
 if(!attachmentFile)return;
 event.preventDefault();event.stopImmediatePropagation();
 const send=form.querySelector('button[type="submit"]');if(send?.disabled)return;
 if(send)send.disabled=true;
 try{
  status.textContent='Enviando anexo…';
  const uploaded=await uploadChatAttachment(attachmentFile);
  const sent=await sendChatMessage(input.value.trim(),uploaded);
  window.dispatchEvent(new CustomEvent('capital-chat-message',{detail:sent}));
  input.value='';attachmentFile=null;input.required=true;preview.hidden=true;preview.textContent='';imageInput.value='';audioInput.value='';status.textContent='Mensagem enviada.';
 }catch(error){status.textContent=error.message||'Não foi possível enviar o anexo.';}
 finally{if(send)send.disabled=false;}
},true);
const existingObserver=new MutationObserver(()=>{
 for(const node of list.children){
  const url=node.querySelector('img[data-chat-attachment],audio[data-chat-attachment]');
  if(url)continue;
  const id=node.dataset.messageId;
  if(!id)continue;
 }
});
existingObserver.observe(list,{childList:true,subtree:true});
window.addEventListener('pagehide',()=>{if(recorder?.state==='recording')recorder.stop();});
