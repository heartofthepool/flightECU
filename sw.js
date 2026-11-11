const C='ecrewultra-v45';
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

/* Uu tien ban moi tu mang, NHUNG chi doi toi da 3,5 giay.
   Tren may bay / wifi chua dang nhap, ket noi thuong treo chu khong bao loi ngay:
   qua 3,5s thi dung ban da luu. Phan hoi loi / bi chuyen huong thi bo, khong luu de.
   Luu theo duong dan KHONG kem ?t=... de cache khong phinh ra. */
const keyOf=req=>{const u=new URL(req.url); return u.origin+u.pathname;};
async function fromCache(req,isPage){
  const c=await caches.open(C);
  const r=(await c.match(keyOf(req)))
      || (isPage ? (await c.match(new URL('./index.html',self.registration.scope).href))
                   || (await c.match(self.registration.scope)) : undefined);
  if(!r) return undefined;
  const h=new Headers(r.headers); h.set('x-from-cache','1');   /* app biet day la ban luu */
  return new Response(await r.blob(),{status:r.status,statusText:r.statusText,headers:h});
}
function networkFirst(req,isPage){
  const net=fetch(new Request(req.url,{cache:'no-store',credentials:'same-origin'})).then(r=>{
    if(!r||!r.ok||r.redirected) throw new Error('bad');
    const cl=r.clone(); caches.open(C).then(c=>c.put(keyOf(req),cl));
    return r;
  });
  net.catch(()=>{});
  const timeout=new Promise(res=>setTimeout(res,3500,'TIMEOUT'));
  return Promise.race([net,timeout]).then(async r=>{
    if(r!=='TIMEOUT') return r;
    return (await fromCache(req,isPage)) || net;     /* chua co ban luu thi doi tiep mang */
  }).catch(async()=>(await fromCache(req,isPage)) || Response.error());
}

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  if(req.url.indexOf('ntfy.sh')>=0) return;   /* de trinh duyet tu xu ly */
  const u=new URL(req.url);
  const isPage = req.mode==='navigate'
    || u.pathname.endsWith('/') || u.pathname.endsWith('index.html');
  if(isPage || u.pathname.endsWith('data.json') || u.pathname.endsWith('version.json') || u.pathname.endsWith('sw.js')){
    e.respondWith(networkFirst(req,isPage));
    return;
  }
  e.respondWith(caches.match(req).then(r=>r||networkFirst(req,false)));
});
