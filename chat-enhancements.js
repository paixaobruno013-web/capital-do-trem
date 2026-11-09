const form=document.getElementById('composer');
const input=document.getElementById('message');
const list=document.getElementById('messages');
const status=document.getElementById('status');
const attachmentInput=document.getElementById('chat-attachment');
const attachmentName=document.getElementById('attachment-name');
if(!form||!input||!list||!attachmentInput) throw new Error('Área do chat não encontrada.');

const style=document.createElement('style');
style.textContent=`
.chat-tools{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
.chat-tools button{background:var(--panel);border:1px solid var(--line);color:var(--fg);padding:8px 12px;min-height:42px}
.emoji-panel{display:none;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;padding:10px;margin:8px 0;border:1px solid var(--line);border-radius:12px;background:var(--panel)}
.emoji-panel.open{display:grid}
.emoji-choice{font-size:23px!important;padding:7px!important;min-height:44px!important;background:var(--bg)!important;border:1px solid var(--line)!important}
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
`;
document.head.append(style);

const tools=document.createElement('div');
tools.className='chat-tools';
const emojiButton=document.createElement('button');
emojiButton.type='button';emojiButton.textContent='😊 Emojis';
const recordButton=document.createElement('button');
recordButton.type='button';recordButton.textContent='🎙️ Gravar áudio';
tools.append(emojiButton,recordButton);
const emojiPanel=document.createElement('div');
emojiPanel.className='emoji-panel';
form.before(tools,emojiPanel);

const emojis=['🎤','🚂','🔥','😂','🤣','👍','❤️','👏','💯','😍','🙌','😎','🎶','🚀','💥','🤝','💪','🥳','😢','🙏','👑','💃','🕺','🎧'];
const animated={'🎤':'cdt-sing','🚂':'cdt-train','🔥':'cdt-fire','😂':'cdt-laugh','🤣':'cdt-laugh'};
for(const symbol of emojis){
 const button=document.createElement('button');
 button.type='button';button.className='emoji-choice';button.textContent=symbol;
 button.setAttribute('aria-label','Inserir '+symbol);
 if(animated[symbol])button.classList.add(animated[symbol]);
 button.addEventListener('click',()=>{
  const start=input.selectionStart??input.value.length;
  const end=input.selectionEnd??input.value.length;
  input.value=input.value.slice(0,start)+symbol+input.value.slice(end);
  input.setSelectionRange(start+symbol.length,start+symbol.length);
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.focus();
 });
 emojiPanel.append(button);
}
emojiButton.addEventListener('click',()=>{
 const open=emojiPanel.classList.toggle('open');
 emojiButton.setAttribute('aria-expanded',String(open));
});

let recorder=null,recordedChunks=[],recordingStream=null,recordingLimit=null;
recordButton.addEventListener('click',async()=>{
 if(recorder?.state==='recording'){recorder.stop();return;}
 if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){
  status.textContent='Seu navegador não oferece gravação de áudio. Use o botão Foto/áudio para anexar um arquivo.';
  return;
 }
 try{
  recordingStream=await navigator.mediaDevices.getUserMedia({audio:true});
  const mime=MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':'audio/webm';
  recorder=new MediaRecorder(recordingStream,MediaRecorder.isTypeSupported(mime)?{mimeType:mime}:{});
  recordedChunks=[];
  recorder.ondataavailable=event=>{if(event.data?.size)recordedChunks.push(event.data);};
  recorder.onerror=()=>{status.textContent='Não foi possível gravar o áudio. Tente novamente.';};
  recorder.onstop=()=>{
   window.clearTimeout(recordingLimit);
   const type=recorder.mimeType||'audio/webm';
   const blob=new Blob(recordedChunks,{type});
   const file=new File([blob],'audio-da-conversa.webm',{type:'audio/webm'});
   try{
    const transfer=new DataTransfer();transfer.items.add(file);attachmentInput.files=transfer.files;
    attachmentInput.dispatchEvent(new Event('change',{bubbles:true}));
    status.textContent='Áudio gravado. Confira o anexo e toque em Enviar.';
   }catch(error){status.textContent='Não foi possível preparar o áudio gravado. Use o anexo de áudio do celular.';}
   recordingStream?.getTracks().forEach(track=>track.stop());
   recordingStream=null;recordedChunks=[];
   recordButton.textContent='🎙️ Gravar áudio';recordButton.disabled=false;
  };
  recorder.start();
  recordButton.textContent='⏹️ Parar gravação';
  status.textContent='Gravando… limite de 60 segundos.';
  recordingLimit=window.setTimeout(()=>{if(recorder?.state==='recording')recorder.stop();},60000);
 }catch(error){
  recordingStream?.getTracks().forEach(track=>track.stop());recordingStream=null;
  status.textContent='Libere o acesso ao microfone nas permissões do celular e tente novamente.';
 }
});

window.addEventListener('pagehide',()=>{
 window.clearTimeout(recordingLimit);
 if(recorder?.state==='recording')recorder.stop();
 else recordingStream?.getTracks().forEach(track=>track.stop());
});
