/* Preserva a tela e os campos de formulários quando o Android recria o WebView após abrir o seletor de arquivos. */
(()=>{
 const FILE_PICKER_RETURN_KEY='capitaldotrem_file_picker_return_at_v1';
 const FILE_PICKER_RETURN_URL_KEY='capitaldotrem_file_picker_return_url_v1';
 const DRAFT_PREFIX='capitaldotrem_file_picker_draft_v1:';
 const MAX_AGE=120000;
 const recentReturn=()=>{
  try{
   const at=Number(localStorage.getItem(FILE_PICKER_RETURN_KEY)||0);
   return at>0&&Date.now()-at<MAX_AGE;
  }catch{return false;}
 };
 const forms=()=>Array.from(document.forms).filter(form=>form.querySelector('input[type="file"]'));
 const draftKey=form=>DRAFT_PREFIX+(location.pathname||'/')+':'+(form.id||form.getAttribute('name')||'upload-form');
 const saveForm=form=>{
  if(!form||!form.querySelector('input[type="file"]'))return;
  const values={};
  for(const field of Array.from(form.elements||[])){
   if(!field||!field.name&&!field.id)continue;
   const type=String(field.type||'').toLowerCase();
   if(['file','password','hidden','submit','button','reset'].includes(type))continue;
   if(type==='checkbox'||type==='radio')continue;
   if(!['INPUT','TEXTAREA','SELECT'].includes(field.tagName))continue;
   values[field.id?'#'+field.id:'name:'+field.name]=String(field.value??'');
  }
  try{localStorage.setItem(draftKey(form),JSON.stringify({savedAt:Date.now(),values}));}catch{}
 };
 const restoreForms=()=>{
  if(!recentReturn())return;
  for(const form of forms()){
   try{
    const raw=localStorage.getItem(draftKey(form));
    if(!raw)continue;
    const draft=JSON.parse(raw);
    if(!draft||Date.now()-Number(draft.savedAt||0)>30*60*1000)continue;
    for(const [selector,value] of Object.entries(draft.values||{})){
     const field=selector.startsWith('#')?form.querySelector('#'+CSS.escape(selector.slice(1))):form.elements.namedItem(selector.slice(5));
     if(field&&'value'in field&&String(field.value||'')==='')field.value=value;
    }
   }catch{}
  }
  try{
   localStorage.removeItem(FILE_PICKER_RETURN_KEY);
   localStorage.removeItem(FILE_PICKER_RETURN_URL_KEY);
  }catch{}
 };
 document.addEventListener('input',event=>{
  const form=event.target?.form;
  if(form)saveForm(form);
 },true);
 document.addEventListener('change',event=>{
  const target=event.target;
  if(target?.matches?.('input[type="file"]'))return;
  if(target?.form)saveForm(target.form);
 },true);
 document.addEventListener('click',event=>{
  const input=event.target?.closest?.('input[type="file"]');
  if(!input)return;
  try{
   for(const form of forms())saveForm(form);
   localStorage.setItem(FILE_PICKER_RETURN_KEY,String(Date.now()));
   localStorage.setItem(FILE_PICKER_RETURN_URL_KEY,location.href);
  }catch{}
 },true);
 document.addEventListener('DOMContentLoaded',restoreForms,{once:true});
 window.addEventListener('focus',()=>window.setTimeout(()=>{
  if(document.visibilityState==='visible'&&recentReturn()){
   try{
    localStorage.removeItem(FILE_PICKER_RETURN_KEY);
    localStorage.removeItem(FILE_PICKER_RETURN_URL_KEY);
   }catch{}
  }
 },1800));
})();