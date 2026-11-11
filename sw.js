const CACHE='capital-do-trem-v269';
const CORE_FILES=['./','./index.html','./offline.html','./marca.svg','./manifest.webmanifest','./update.js','./assets/favela-header.webp','./assets/banner-speakers.webp'];
const OPTIONAL_FILES=['./admin.html','./admin-media.js','./privacidade.html','./account-deletion.html','./conta.html','./supabase/auth.js','./diagnostico.html','./bate-papo.html','./chat-enhancements.js','./emoji-picker.js','./stories-ui.js','./admin-stories.js','./account-stories.js','./avatar.html','./mensagens.html','./youtube-feed.js','./admin-apoiadores.html','./apoiadores.html','./supporters-admin.js','./supporters-public.js'];

self.addEventListener('install',event=>{
  // O núcleo do app precisa estar disponível para preservar uma instalação offline íntegra.
  // Páginas e módulos complementares são armazenados individualmente: uma falha isolada não bloqueia o app.
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
  // Aguarda a limpeza dos caches antigos e a tomada de controle das páginas abertas.
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

  // Páginas HTML: tenta buscar a versão mais recente primeiro e usa o cache sem internet.
  const isPage=event.request.mode==='navigate'||url.pathname.endsWith('.html')||url.pathname.endsWith('/');
  if(isPage){
    event.respondWith(
      fetch(event.request,{cache:'no-store'}).then(response=>{
        if(response&&response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        }
        return response;
      }).catch(()=>caches.match(event.request,{ignoreSearch:true}).then(async cached=>cached||(await caches.match('./offline.html'))||new Response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sem conexão — Capital do Trem</title><body style="background:#000;color:#fff;font:16px system-ui;padding:24px"><h1>ALERTA — VOCÊ TÁ OFFLINE</h1><p>Conecte-se novamente e tente abrir o Capital do Trem.</p><a href="./">Voltar ao início</a></body></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})))
    );
    return;
  }

  // Arquivos estáticos: resposta rápida do cache e atualização em segundo plano.
  event.respondWith(
    caches.match(event.request).then(cached=>{
      const network=fetch(event.request).then(response=>{
        if(response&&response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        }
        return response;
      }).catch(()=>cached);
      return cached||network;
    })
  );
});
