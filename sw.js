// sw.js — Bernio PWA Service Worker
// verzi zvyšuj při každém nasazení (stejně jako SW_VERSION v index.html)
const VERSION = '2025-09-65b';
const APP_CACHE = `bernio-app-${VERSION}`;
const RUNTIME_CACHE = `bernio-runtime-${VERSION}`;

// Seznam, který se pokusíme přednačíst (můžeš upravit podle projektu)
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/qr.png?v=2',
  './icons/icon-192.png',
  './icons/icon-512.png',
];


self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);

    // „Měkké“ precache: když něco chybí, instalace kvůli tomu neselže
    await Promise.all(PRECACHE_URLS.map(async (url) => {
      try {
        const req = new Request(url, { cache: 'reload' });
        const res = await fetch(req);
        if (res && res.ok) await cache.put(req, res.clone());
      } catch {}
    }));

    // dovolíme rychlé přepnutí, až si o to UI řekne
    // (necháváme tu i skipWaiting, aby první instalace byla svižná)
    self.skipWaiting();
  })());
});

// Převzetí řízení a úklid starých cache
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((k) => ![APP_CACHE, RUNTIME_CACHE].includes(k))
      .map((k) => caches.delete(k)));

    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }
    await self.clients.claim();
  })());
});

// Umožní UI přepnout na novou verzi bez reloady navíc
self.addEventListener('message', (e) => {
  if (e?.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Strategii volíme podle typu požadavku
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
// 🚧 STRÁŽCE: Bernio nikdy neobsluhuje nic pod /zpjevnicek/**
if (url.origin === self.location.origin && url.pathname.startsWith('/zpjevnicek/')) {
 return; // nevoláme respondWith → stránku vyřídí síť/SW Zpěvníčku
  }
  // 1) Navigace (HTML): network-first → cache → offline fallback
  if (req.mode === 'navigate') {
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
        return (await app.match('./')) || (await app.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // 2) Statická aktiva stejného původu: stale-while-revalidate
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

  // 3) Cizí původ (např. CDN ZXing): network-first s fallbackem z cache
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

  // 4) Ostatní: cache → network
  event.respondWith((async () => {
    const c = await caches.open(RUNTIME_CACHE);
    return (await c.match(req)) || fetch(req);
  })());
});








































