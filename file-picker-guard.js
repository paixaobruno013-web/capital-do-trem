/* Evita reiniciar a abertura quando o Android recria o WebView ao voltar do seletor de arquivos. */
(()=> {
 const KEY='capitaldotrem_file_picker_return_at_v1';
 const clear=()=>{try{localStorage.removeItem(KEY);}catch{}};
 document.addEventListener('click',event=>{
  const input=event.target?.closest?.('input[type="file"]');
  if(!input)return;
  try{localStorage.setItem(KEY,String(Date.now()));}catch{}
 },true);
 document.addEventListener('change',event=>{
  if(event.target?.matches?.('input[type="file"]'))clear();
 },true);
 window.addEventListener('focus',()=>window.setTimeout(()=>{
  if(document.visibilityState==='visible')clear();
 },1500));
})();