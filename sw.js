const C='ecrewultra-v22';
const SHELL=['./','./index.html','./manifest.webmanifest','./icon.png','./apple-touch-icon.png'];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).catch(()=>{}));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x))))
      .then(()=>self.clients.claim())
  );
});

/* Luon uu tien ban moi tu mang; mat mang moi dung ban da luu. */
function networkFirst(req){
  return fetch(req).then(r=>{
    if(r&&r.ok){ const cl=r.clone(); caches.open(C).then(c=>c.put(req,cl)); }
    return r;
  }).catch(()=>caches.match(req).then(r=>r||caches.match('./index.html')));
}

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  const u=new URL(req.url);
  const isPage = req.mode==='navigate'
    || u.pathname.endsWith('/') || u.pathname.endsWith('index.html');
  if(isPage || u.pathname.endsWith('data.json') || u.pathname.endsWith('sw.js')){
    e.respondWith(networkFirst(req));
    return;
  }
  e.respondWith(caches.match(req).then(r=>r||networkFirst(req)));
});
