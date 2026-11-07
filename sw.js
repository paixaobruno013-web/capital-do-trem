const CACHE='capital-do-trem-v119';
const FILES=['./','./index.html','./admin.html','./marca.svg','./manifest.webmanifest','./privacidade.html','./conta.html','./supabase/auth.js','./update.js','./diagnostico.html','./bate-papo.html'];

self.addEventListener('install',event=>{
  // Um arquivo opcional indisponível não deve impedir a instalação do app inteiro.
  event.waitUntil(caches.open(CACHE).then(cache=>Promise.all(
    FILES.map(file=>cache.add(file).catch(error=>{
      console.warn('Não foi possível armazenar no cache:',file,error);
      return null;
    }))
  )));
});

self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(key=>key.startsWith('capital-do-trem-')&&key!==CACHE).map(key=>caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;

  // Páginas HTML: tenta buscar a versão mais recente primeiro e usa o cache sem internet.
  const isPage=event.request.mode==='navigate'||url.pathname.endsWith('.html')||url.pathname.endsWith('/');
  if(isPage){
    event.respondWith(
      fetch(event.request).then(response=>{
        if(response&&response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        }
        return response;
      }).catch(()=>caches.match(event.request,{ignoreSearch:true}).then(cached=>cached||new Response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#000000"><title>Sem conexão — Capital do Trem</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#000;color:#fff;font:16px/1.5 system-ui,Arial,sans-serif"><main style="max-width:420px;padding:28px;text-align:center"><h1 style="color:#ed1c24">Você está sem conexão</h1><p>Esta página ainda não está disponível neste aparelho sem internet.</p><p>Conecte-se novamente e tente abrir o Capital do Trem.</p><a href="./" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#ed1c24;color:#fff;text-decoration:none;font-weight:700">Voltar ao início</a></main></body></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})))
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
