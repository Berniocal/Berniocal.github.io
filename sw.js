const CACHE_STATIC  = 'calc-static-v7';
const CACHE_RUNTIME = 'calc-runtime-v7';

const SCOPE = self.registration.scope;
const PRECACHE = [
  new URL('./index.html', SCOPE),
  new URL('./offline.html', SCOPE),
  new URL('./manifest.webmanifest', SCOPE),
  new URL('./icons/icon-192.png', SCOPE),
  new URL('./icons/icon-512.png', SCOPE),
  new URL('./icons/qr.png', SCOPE), // ← přidáno
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_STATIC).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => ![CACHE_STATIC, CACHE_RUNTIME].includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  // Navigace – cache-first
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cached = await caches.match('/index.html');
      fetch(req).then(async (res) => {
        const runtime = await caches.open(CACHE_RUNTIME);
        runtime.put('/index.html', res.clone());
      }).catch(()=>{});
      try {
        return cached || await fetch(req);
      } catch {
        return cached || await caches.match('/offline.html');
      }
    })());
    return;
  }

  // Ostatní GET požadavky
  const url = new URL(req.url);
  if (url.origin === self.location.origin && req.method === 'GET') {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE_RUNTIME);
      const cached = await cache.match(req);
      const network = fetch(req).then(res => {
        if (res && res.status === 200) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      return cached || network || Response.error();
    })());
  }
});

