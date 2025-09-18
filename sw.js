// --- verze cache
const CACHE_STATIC  = 'calc-static-v9';
const CACHE_RUNTIME = 'calc-runtime-v9';

// --- scope & cesty relativně k Pages podcestě
const SCOPE  = self.registration.scope;
const INDEX  = new URL('./index.html', SCOPE);
const OFFLINE= new URL('./offline.html', SCOPE);

const PRECACHE = [
  INDEX,
  OFFLINE,
  new URL('./manifest.webmanifest', SCOPE),
  new URL('./icons/icon-192.png', SCOPE),
  new URL('./icons/icon-512.png', SCOPE),
  new URL('./icons/qr.png', SCOPE),
];

// INSTALL – pre-cache
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_STATIC).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

// ACTIVATE – smaž staré cache
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => ![CACHE_STATIC, CACHE_RUNTIME].includes(k))
                         .map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

// FETCH
self.addEventListener('fetch', (e) => {
  const req = e.request;

  // Navigace (HTML) – cache-first + tichá obnova
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cached = await caches.match(INDEX);
      fetch(req).then(async (res) => {
        try {
          const runtime = await caches.open(CACHE_RUNTIME);
          await runtime.put(INDEX, res.clone());
        } catch {}
      }).catch(()=>{});
      try {
        return cached || await fetch(req);
      } catch {
        return cached || await caches.match(OFFLINE);
      }
    })());
    return;
  }

  // Ostatní GET – stale-while-revalidate
  if (req.method === 'GET') {
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
