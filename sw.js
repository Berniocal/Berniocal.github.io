const CACHE_STATIC  = 'calc-static-v8';
const CACHE_RUNTIME = 'calc-runtime-v8';

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

// 1) konstanta cache
const CACHE_NAME = 'app-v3'; // zvýš číslo oproti předchozí verzi

// 2) install (precache)
self.addEventListener('install', event => { /* ... */ });

// 3) activate (SEM vlož tvůj blok pro mazání starých cache)
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

// 4) fetch (runtime cache / fallback)
self.addEventListener('fetch', event => { /* ... */ });


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



