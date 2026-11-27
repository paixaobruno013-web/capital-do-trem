import { readFile } from 'node:fs/promises';
const [home, profile, profileScript, chat] = await Promise.all([
 readFile(new URL('../index.html', import.meta.url), 'utf8'),
 readFile(new URL('../rede.html', import.meta.url), 'utf8'),
 readFile(new URL('../rede.js', import.meta.url), 'utf8'),
 readFile(new URL('../bate-papo.html', import.meta.url), 'utf8')
]);
const discovery = home.match(/<section class="page" id="pesquisa">[\s\S]*?<section class="page" id="eventos">/)?.[0] || '';
const musicArea = home.match(/<section class="page" id="musicas">[\s\S]*?<section class="page" id="pesquisa">/)?.[0] || '';
const musicBanner = musicArea.match(/<section class="music-section-banner"[^>]*>[\s\S]*?<\/section>/)?.[0] || '';
const musicCover = musicArea.match(/<section id="music-cover-area"[^>]*>[\s\S]*?<\/section>/)?.[0] || '';
const checks = [
 ['Feed social é a página inicial e aparece na navegação', /data-page="inicio"[^>]*>⌂ Feed/.test(home) && /id="home-community-feed"/.test(home)],
 ['banner oficial de alto-falantes fica no topo de Músicas', musicArea.indexOf('class="music-section-banner"') > musicArea.indexOf('id="musicas"') && musicBanner.includes('src="./assets/banner-speakers.webp?v=374"') && musicBanner.includes('AQUI A MÚSICA NÃO PARA!')],
 ['capa personalizada continua disponível sem controles administrativos na tela pública', musicCover.includes('id="music-cover-preview"') && musicCover.includes('id="music-cover-area"') && !musicArea.includes('id="music-cover-upload"') && !musicArea.includes('music-cover-controls')],
 ['vídeos de descoberta ficam na Pesquisa, não misturados ao Feed', /home-youtube/.test(discovery) && !/<section class="card home-youtube"/.test(home.slice(home.indexOf('<section class="page active" id="inicio">'),home.indexOf('<section class="page" id="musicas">')))],
 ['grupo oficial e perfis para contatos privados ficam no Chat, sem descoberta por localização', /id="open-group-card"/.test(chat) && /id="chat-profile-rail"/.test(chat) && !/id="fazer-amigos"|id="open-friends-profile"/.test(chat) && !/class="card home-friends"/.test(home)],
 ['perfil oferece abas separadas para fotos e vídeos', /data-profile-view="photos"[^>]*aria-label="Fotos"/.test(profile) && /data-profile-view="videos"[^>]*aria-label="Vídeos"/.test(profile)],
 ['aba Fotos não mistura vídeos e aba Vídeos filtra apenas vídeos', profileScript.includes("const visibleMedia=media.filter(m=>view==='videos'?m.media_type==='video':view==='photos'?m.media_type!=='video':true)")],
];
for (const [name, ok] of checks) console.log((ok ? 'OK  ' : 'ERRO ') + name);
if (checks.some(([, ok]) => !ok)) process.exit(1);
console.log(checks.length + ' verificações de organização das telas aprovadas.');
