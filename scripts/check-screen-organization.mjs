import { readFile } from 'node:fs/promises';
const [home, profile, profileScript, chat] = await Promise.all([
 readFile(new URL('../index.html', import.meta.url), 'utf8'),
 readFile(new URL('../rede.html', import.meta.url), 'utf8'),
 readFile(new URL('../rede.js', import.meta.url), 'utf8'),
 readFile(new URL('../bate-papo.html', import.meta.url), 'utf8')
]);
const discovery = home.match(/<section class="page" id="pesquisa">[\s\S]*?<section class="page" id="eventos">/)?.[0] || '';
const checks = [
 ['Feed social é a página inicial e aparece na navegação', /data-page="inicio"[^>]*>⌂ Feed/.test(home) && /id="home-community-feed"/.test(home)],
 ['mensagem de boas-vindas aparece na entrada', /SEJA BEM-VINDO, MAQUINISTA DESSE TREM!/.test(home)],
 ['vídeos de descoberta ficam na Pesquisa, não misturados ao Feed', /home-youtube/.test(discovery) && !/<section class="card home-youtube"/.test(home.slice(home.indexOf('<section class="page active" id="inicio">'),home.indexOf('<section class="page" id="musicas">')))],
 ['atalho de amizades fica no Chat, sem duplicação na tela inicial', /id="fazer-amigos"/.test(chat) && !/class="card home-friends"/.test(home)],
 ['perfil oferece abas separadas para fotos e vídeos', /data-profile-view="photos"[^>]*aria-label="Fotos"/.test(profile) && /data-profile-view="videos"[^>]*aria-label="Vídeos"/.test(profile)],
 ['aba Fotos não mistura vídeos e aba Vídeos filtra apenas vídeos', profileScript.includes("const visibleMedia=media.filter(m=>view==='videos'?m.media_type==='video':view==='photos'?m.media_type!=='video':true)")],
];
for (const [name, ok] of checks) console.log((ok ? 'OK  ' : 'ERRO ') + name);
if (checks.some(([, ok]) => !ok)) process.exit(1);
console.log(checks.length + ' verificações de organização das telas aprovadas.');
