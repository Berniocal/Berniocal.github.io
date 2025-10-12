// sw.js — Bernio PWA Service Worker
// Zvy̌š verzi pokaždé, když nasadíš novou verzi aplikace.
const VERSION = '2025-09-76c';
const APP_CACHE = `bernio-app-${VERSION}`;
const RUNTIME_CACHE = `bernio-runtime-${VERSION}`;

// Měkký (nepovinný) precache – když něco selže, instalace stejně proběhne.
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './?app=bernio',            // odpovídá start_url
  './icons/qr.png?v=2',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    await Promise.all(PRECACHE_URLS.map(async (url) => {
      try {
        const req = new Request(url, { cache: 'reload' });
        const res = await fetch(req);
        if (res && res.ok) await cache.put(req, res.clone());
      } catch { /* tiché selhání = měkký precache */ }
    }));
    // první instalace / řízené přepnutí
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // úklid starých cache
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((k) => ![APP_CACHE, RUNTIME_CACHE].includes(k))
      .map((k) => caches.delete(k)));

    // navigation preload (rychlejší navigace)
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }
    await self.clients.claim();
  })());
});

// dovolí UI okamžitě přepnout na novou verzi (postMessage z aplikace)
self.addEventListener('message', (e) => {
  if (e?.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 🛡️ STRÁŽ: Bernio NIKDY neobsluhuje nic pod /zpjevnicek/**
  // (tím si SW Zpěvníčku a Bernia nepolezou do zelí)
  if (url.origin === self.location.origin && url.pathname.startsWith('/zpjevnicek/')) {
    return; // žádné respondWith → vyřídí síť / SW Zpěvníčku
  }

  // 1) Navigace (HTML) – network-first → cache → offline fallback
  if (req.mode === 'navigate') {
    // (redundantní stráž i tady, kdybys časem handler rozděloval)
    if (url.origin === self.location.origin && url.pathname.startsWith('/zpjevnicek/')) return;

    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) return preload;

        const fresh = await fetch(req);
        const c = await caches.open(RUNTIME_CACHE);
        c.put(req, fresh.clone()).catch(()=>{});
        return fresh;
      } catch {
        const app = await caches.open(APP_CACHE);
        return (await app.match('./?app=bernio')) ||
               (await app.match('./')) ||
               (await app.match('./index.html')) ||
               Response.error();
      }
    })());
    return;
  }

  // 2) Statická aktiva stejného původu – stale-while-revalidate
  if (url.origin === self.location.origin &&
      /\.(?:js|css|png|jpg|jpeg|svg|ico|webmanifest|woff2?)($|\?)/i.test(url.pathname + url.search)) {
    event.respondWith((async () => {
      const c = await caches.open(RUNTIME_CACHE);
      const cached = await c.match(req);
      const fetching = fetch(req).then((res) => {
        c.put(req, res.clone()).catch(()=>{});
        return res;
      }).catch(()=>undefined);
      return cached || fetching || fetch(req);
    })());
    return;
  }

  // 3) Cizí původ (např. CDN) – network-first s fallbackem z cache
  if (url.origin !== self.location.origin) {
    event.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: 'no-store' });
        const c = await caches.open(RUNTIME_CACHE);
        c.put(req, res.clone()).catch(()=>{});
        return res;
      } catch {
        const c = await caches.open(RUNTIME_CACHE);
        return (await c.match(req)) || Response.error();
      }
    })());
    return;
  }

  // 4) Ostatní – cache-first → network
  event.respondWith((async () => {
    const c = await caches.open(RUNTIME_CACHE);
    return (await c.match(req)) || fetch(req);
  })());
});