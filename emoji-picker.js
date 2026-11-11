(()=> {
const DEFAULT=['😂','❤️','🔥','🚂','🎤','🙏','😍','👏','💯','🤣','🥳','😎','😭','😘','👍','✨','🤝','💪'];
const GROUPS=[
{name:'Rostos',items:'😀 😃 😄 😁 😆 😅 😂 🤣 🥲 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😜 🤪 😝 🤗 🤭 🫢 🫣 🤫 🤔 🫡 🤐 🤨 😐 😑 😶 🫥 😏 😒 🙄 😬 😮‍💨 🤥 😔 😪 🤤 😴 🥱 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🤠 🥳 🥸 😎 🤓 🧐'},
{name:'Gestos',items:'👋 🤚 🖐️ ✋ 🖖 🫱 🫲 🫳 🫴 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 💪 🦾'},
{name:'Corações',items:'❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❤️‍🔥 ❤️‍🩹 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟'},
{name:'Animais',items:'🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🦋 🐌 🐞 🐢 🐍 🦖 🐙 🦀 🐠 🐬 🐳'},
{name:'Comidas',items:'🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🍆 🥦 🥕 🌽 🌶️ 🥔 🍞 🥐 🧀 🥚 🍳 🥞 🧇 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🍝 🍜 🍣 🍰 🎂 🍩 🍪 🍫 🍿 ☕ 🧃'},
{name:'Festa',items:'⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓 🏸 🥊 🥋 🛹 🏆 🥇 🥈 🥉 🎯 🎮 🎲 🎸 🎹 🎤 🎧 🎵 🎶 🎉 🎊 🎈 🎁 🪅 🪩 💃 🕺'},
{name:'Viagem',items:'🚗 🚕 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🚚 🚛 🚜 🏍️ 🚲 🛴 🚂 🚆 🚄 🚇 🚉 ✈️ 🚀 🛸 🚁 ⛵ 🚤 🚢 ⚓ 🏖️ 🏝️ 🏙️ 🌃 🌆 🌇 🌈 ☀️ 🌤️ ⛈️ 🌧️ ❄️'},
{name:'Natureza',items:'🌱 🌿 ☘️ 🍀 🌵 🌴 🌳 🌲 🌾 🌻 🌼 🌷 🌹 🥀 🌺 🌸 🌞 🌝 🌚 🌙 ⭐ 🌟 🌠 🌌 ☁️ 🌤️ ⛈️ 🌧️ ❄️ ☃️ 🌊 💧 🔥'},
{name:'Esportes',items:'🏃 🏃‍♀️ 🏃‍♂️ 🚶 🚴 🏊 🧗 🏋️ 🤸 🤾 🏄 🚣 🏇 🥇 🥈 🥉 🏆 ⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🎱 🏓 🏸 🥊 🥋 🛹 🎿 ⛷️ 🏂'},
{name:'Símbolos',items:'❤️‍🔥 💯 ♻️ ⚜️ 🔰 🔱 ☮️ ✝️ ☯️ ☢️ ☣️ ⚛️ 🆘 🆗 🆙 🆒 🆕 🆓 🆚 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟥 🟧 🟨 🟩 🟦 🟪 ⬛ ⬜ ➕ ➖ ➗ ✖️ ✔️ ❎ ❓ ❗ ‼️ ⁉️ ⬆️ ⬇️ ⬅️ ➡️'},
{name:'Bandeiras',items:'🇧🇷 🇺🇸 🇵🇹 🇦🇷 🇺🇾 🇨🇱 🇨🇴 🇵🇪 🇻🇪 🇧🇴 🇵🇾 🇲🇽 🇫🇷 🇩🇪 🇮🇹 🇪🇸 🇬🇧 🇯🇵 🇨🇳 🇰🇷 🇨🇦 🇦🇺 🇿🇦'},
{name:'Objetos',items:'📱 💻 ⌚ 📷 📹 📺 📻 🔋 💡 🔦 💰 💳 💎 🔑 🔒 🛠️ 🔧 ⚙️ 📌 📍 ✂️ 📝 📚 📦 📫 📣 🔔 🚨 ✅ ❌ ⚠️ ⭐ 🌟 ✨ 💯 🔥'}
];
const STORE='capitaldotrem_emoji_recent_v1';
const emojiFontStyle=document.createElement('style');emojiFontStyle.textContent='.emoji-choice{font-family:"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif}.emoji-choice .cdt-emoji-image{width:1.35em;height:1.35em;object-fit:contain;vertical-align:middle}.emoji-fallback[hidden]{display:none}';document.head.append(emojiFontStyle);
function recent(){try{const a=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(a)?a.filter(x=>typeof x==='string'&&x.length<=12):[]}catch{return[]}}
function remember(e){const a=[e,...recent().filter(x=>x!==e)].slice(0,24);try{localStorage.setItem(STORE,JSON.stringify(a))}catch{}}
function twemojiUrl(e){const code=Array.from(e).map(ch=>ch.codePointAt(0).toString(16)).filter(code=>code!=='fe0f').join('-');return 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@16.0.1/assets/svg/'+code+'.svg'}
function makeButton(e){const b=document.createElement('button');b.type='button';b.className='emoji-choice';b.dataset.emoji=e;b.setAttribute('aria-label','Inserir emoji '+e);const fallback=document.createElement('span');fallback.textContent=e;fallback.className='emoji-fallback';const img=document.createElement('img');img.className='cdt-emoji-image';img.src=twemojiUrl(e);img.alt='';img.setAttribute('aria-hidden','true');img.loading='lazy';img.addEventListener('load',()=>fallback.hidden=true,{once:true});img.addEventListener('error',()=>img.remove(),{once:true});b.append(img,fallback);return b}
function build(root){
 const input=document.querySelector(root.dataset.input||'#message');if(!input)return;
 root.classList.add('emoji-picker');
 root.classList.remove('is-open');
 const quick=document.createElement('div');quick.className='emoji-quick';
 const heading=document.createElement('div');heading.className='emoji-picker-heading';
 const label=document.createElement('span');label.textContent='Mais usados';
 const toggle=document.createElement('button');toggle.type='button';toggle.className='emoji-all-toggle';toggle.textContent='Todos os emojis ▾';toggle.setAttribute('aria-expanded','false');
 const close=document.createElement('button');close.type='button';close.className='emoji-close';close.textContent='Fechar ✕';close.setAttribute('aria-label','Fechar emojis');
 heading.append(label,toggle,close);
 const strip=document.createElement('div');strip.className='emoji-recent-strip';strip.setAttribute('aria-label','Emojis mais usados. Deslize para o lado para ver mais');
 quick.append(heading,strip);
 const panel=document.createElement('section');panel.className='emoji-full-panel';panel.hidden=true;
 const tabs=document.createElement('div');tabs.className='emoji-category-tabs';const grid=document.createElement('div');grid.className='emoji-category-grid';panel.append(tabs,grid);root.replaceChildren(quick,panel);
 function renderRecent(){strip.replaceChildren();const saved=recent();[...saved,...DEFAULT.filter(e=>!saved.includes(e))].slice(0,24).forEach(e=>strip.append(makeButton(e)))}
 function renderGroup(index){tabs.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));grid.replaceChildren();GROUPS[index].items.split(' ').forEach(e=>grid.append(makeButton(e)))}
 GROUPS.forEach((g,i)=>{const b=document.createElement('button');b.type='button';b.textContent=g.name;b.setAttribute('aria-pressed',String(i===0));b.addEventListener('click',()=>renderGroup(i));tabs.append(b)});
 renderRecent();renderGroup(0);
 close.addEventListener('click',()=>{root.classList.remove('is-open');root.closest('form')?.classList.remove('emoji-open');const trigger=document.getElementById('emoji-toggle')||document.getElementById('private-emoji-toggle');if(trigger){trigger.setAttribute('aria-expanded','false');trigger.textContent='😊';}input.focus();});
 toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));toggle.textContent=panel.hidden?'Todos os emojis ▾':'Fechar ✕';if(!panel.hidden)panel.scrollIntoView({block:'nearest',behavior:'smooth'})});
 root.addEventListener('click',event=>{const b=event.target.closest('button[data-emoji]');if(!b)return;const e=b.dataset.emoji,start=input.selectionStart??input.value.length,end=input.selectionEnd??input.value.length;if(typeof input.setRangeText==='function')input.setRangeText(e,start,end,'end');else input.value=input.value.slice(0,start)+e+input.value.slice(end);input.dispatchEvent(new Event('input',{bubbles:true}));remember(e);renderRecent();root.classList.remove('is-open');root.closest('form')?.classList.remove('emoji-open');const trigger=document.getElementById('emoji-toggle')||document.getElementById('private-emoji-toggle');if(trigger){trigger.setAttribute('aria-expanded','false');trigger.textContent='😊';}input.focus()});
}
document.querySelectorAll('[data-emoji-picker]').forEach(build);
})();