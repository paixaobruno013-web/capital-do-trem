import {getCurrentSession,getDiscussionTopics,createDiscussionTopic,joinDiscussionTopic,getDiscussionMessages,sendDiscussionMessage,subscribeDiscussionMessages} from './supabase/auth.js';
const $=id=>document.getElementById(id);
const list=$('topic-list'),createForm=$('topic-create-form'),room=$('topic-room'),messages=$('topic-messages');
let activeTopic=null,unsubscribe=null,seen=new Set();
function appendMessage(message){
 if(!message?.id||seen.has(message.id))return;seen.add(message.id);
 const row=document.createElement('article');row.className='topic-message';
 const head=document.createElement('div');head.className='topic-message-head';
 const author=document.createElement('strong');author.textContent=message.author?.display_name||'Maquinista';
 const time=document.createElement('small');time.textContent=new Date(message.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
 const body=document.createElement('p');body.textContent=message.content||'';
 head.append(author,time);row.append(head,body);messages.append(row);messages.scrollTop=messages.scrollHeight;
}
async function loadTopics(){
 list.innerHTML='<p class="muted">Atualizando assuntos…</p>';
 try{
  const topics=await getDiscussionTopics();list.replaceChildren();
  if(!topics.length){list.innerHTML='<p class="muted">Ainda não há assuntos. Crie o primeiro bate-papo!</p>';return}
  for(const topic of topics){
   const card=document.createElement('article');card.className='topic-card';
   const copy=document.createElement('div');copy.className='topic-card-copy';
   const title=document.createElement('strong');title.textContent=topic.title;
   const description=document.createElement('p');description.textContent=topic.description||'Conversa aberta para a comunidade.';
   const count=document.createElement('small');count.textContent=topic.member_count+' participante(s)';
   copy.append(title,description,count);
   const button=document.createElement('button');button.type='button';button.className='btn '+(topic.is_member?'alt':'primary');button.textContent=topic.is_member?'Abrir conversa':'Participar';
   button.addEventListener('click',()=>openTopic(topic));card.append(copy,button);list.append(card);
  }
 }catch(error){list.textContent=error.message||'Não foi possível carregar os assuntos.'}
}
async function openTopic(topic){
 try{
  await joinDiscussionTopic(topic.id);activeTopic=topic;seen.clear();messages.replaceChildren();
  $('topic-room-title').textContent=topic.title;$('topic-room-description').textContent=topic.description||'Conversa da comunidade';
  list.hidden=true;room.hidden=false;
  const rows=await getDiscussionMessages(topic.id);rows.forEach(appendMessage);
  unsubscribe?.();unsubscribe=subscribeDiscussionMessages(topic.id,appendMessage);
  $('topic-message-input').focus();
 }catch(error){$('topic-create-status').textContent=error.message||'Não foi possível abrir a conversa.'}
}
createForm?.addEventListener('submit',async event=>{
 event.preventDefault();const button=createForm.querySelector('button[type=submit]');button.disabled=true;
 try{const topic=await createDiscussionTopic($('topic-title').value,$('topic-description').value);$('topic-title').value='';$('topic-description').value='';$('topic-create-status').textContent='Assunto criado! Você já entrou na conversa.';await loadTopics();await openTopic(topic)}
 catch(error){$('topic-create-status').textContent=error.message||'Não foi possível criar o assunto.'}
 finally{button.disabled=false}
});
$('topic-room-back')?.addEventListener('click',()=>{unsubscribe?.();unsubscribe=null;activeTopic=null;room.hidden=true;list.hidden=false;loadTopics()});
$('topic-message-form')?.addEventListener('submit',async event=>{
 event.preventDefault();if(!activeTopic)return;const input=$('topic-message-input'),button=$('topic-message-form').querySelector('button');const value=input.value.trim();if(!value)return;
 button.disabled=true;
 try{const message=await sendDiscussionMessage(activeTopic.id,value);input.value='';appendMessage({...message,author:{display_name:'Você'}});$('topic-message-status').textContent='Mensagem enviada.'}
 catch(error){$('topic-message-status').textContent=error.message||'Não foi possível enviar.'}
 finally{button.disabled=false}
});
(async()=>{try{const session=await getCurrentSession();if(!session?.user){list.textContent='Entre na sua conta para criar e participar de bate-papos.';createForm.querySelector('button').disabled=true;return}await loadTopics()}catch(error){list.textContent=error.message||'Conecte-se para conversar.'}})();
window.addEventListener('pagehide',()=>unsubscribe?.());
