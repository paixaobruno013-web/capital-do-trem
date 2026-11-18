const CACHE='capital-do-trem-v305';
const CORE_FILES=['./','./index.html','./rede.html','./offline.html','./marca.svg',
  './assets/capital-do-trem-logo.jpg','./assets/apple-touch-icon.png','./assets/pwa-icon-192.png','./assets/pwa-icon-512.png','./manifest.webmanifest','./update.js','./diagnostico.html','./assets/favela-header.webp','./assets/banner-speakers.webp'];
const OPTIONAL_FILES=['./admin.html','./file-picker-guard.js','./estudio.html','./admin-media.js','./privacidade.html','./account-deletion.html','./conta.html','./rede.js','./capital-music-player.js','./persistent-music-player.js','./home-feed.js','./post-music.js','./music-upload.js','./music-playlists.js','./chat-topics.js','./capital-futurista.css','./supabase/auth.js','./diagnostico.html','./bate-papo.html','./chat-enhancements.js','./emoji-picker.js','./stories-ui.js','./home-story-composer.js','./event-social-composer.js','./admin-stories.js','./account-stories.js','./avatar.html','./mensagens.html','./youtube-feed.js','./admin-apoiadores.html','./apoiadores.html','./supporters-admin.js','./supporters-public.js'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(async cache=>{
    await cache.addAll(CORE_FILES);
    await Promise.all(OPTIONAL_FILES.map(file=>cache.add(file).catch(error=>{
      console.warn('Não foi possível armazenar no cache (arquivo complementar):',file,error);
      return null;
    })));
  }));
});

self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(
      keys.filter(key=>key.startsWith('capital-do-trem-')&&key!==CACHE).map(key=>caches.delete(key))
    )),
    self.clients.claim()
  ]));
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;
  // Nunca armazenar respostas autenticadas ou URLs com parâmetros/tokens.
  if(event.request.headers.has('Authorization')||url.search) return;
  const mayCache=response=>{
    if(!response||!response.ok) return false;
    const control=(response.headers.get('Cache-Control')||'').toLowerCase();
    return !/(?:private|no-store|no-cache)/.test(control)&&!response.headers.has('Set-Cookie')&&response.headers.get('Vary')!=='*';
  };

  const isPage=event.request.mode==='navigate'||url.pathname.endsWith('.html')||url.pathname.endsWith('/');
  if(isPage){
    event.respondWith(
      fetch(event.request,{cache:'no-store'}).then(response=>{
        if(mayCache(response)){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        }
        return response;
      }).catch(()=>caches.match(event.request,{ignoreSearch:true}).then(async cached=>cached||(await caches.match('./offline.html'))||new Response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem conexão — Capital do Trem</title><body style="background:#000;color:#fff;font:16px system-ui;padding:24px"><h1>ALERTA — VOCÊ TÁ OFFLINE</h1><p>Conecte-se novamente e tente abrir o Capital do Trem.</p><a href="./">Voltar ao início</a></body></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})))
    );
    return;
  }

  // Código executável e estilos precisam ser atualizados pela rede.
  // Cache só é fallback offline; não servir JS/CSS antigo indefinidamente.
  const isExecutableOrStyle=/\.(?:js|mjs|css|webmanifest)$/i.test(url.pathname);
  if(isExecutableOrStyle){
    event.respondWith(
      fetch(event.request,{cache:'no-store'}).then(response=>{
        if(mayCache(response)){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        }
        return response;
      }).catch(()=>caches.match(event.request).then(cached=>cached||new Response('Recurso indisponível sem conexão.',{
        status:503,
        headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}
      })))
    );
    return;
  }

  // Imagens, fontes e demais arquivos estáticos continuam rápidos no cache.
  event.respondWith(
    caches.match(event.request).then(cached=>{
      const network=fetch(event.request).then(response=>{
        if(mayCache(response)){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        }
        return response;
      }).catch(()=>cached);
      return cached||network;
    })
  );
});
