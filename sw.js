// ===== Service Worker for Bernio (GitHub Pages) =====

// verze cache – při každé změně zvýš čísla
const CACHE_STATIC  = 'calc-static-v26';
const CACHE_RUNTIME = 'calc-runtime-v26';

// Cesty vztažené ke scope SW (funguje správně v podcestě /<repo>/)
const SCOPE   = self.registration.scope;
const URLS = {
  INDEX:   new URL('./index.html', SCOPE),
  OFFLINE: new URL('./offline.html', SCOPE),
  MANIFEST: new URL('./manifest.webmanifest', SCOPE),
  ICON192:  new URL('./icons/icon-192.png', SCOPE),
  ICON512:  new URL('./icons/icon-512.png', SCOPE),
  QR:       new URL('./icons/qr.png', SCOPE),
};

// Co přednačteme vždy
const PRECACHE = [
  URLS.INDEX,
  URLS.OFFLINE,
  URLS.MANIFEST,
  URLS.ICON192,
  URLS.ICON512,
  URLS.QR,
];

// INSTALL – ulož statické soubory
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

// ACTIVATE – smaž staré cache a převezmi řízení
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => ![CACHE_STATIC, CACHE_RUNTIME].includes(k))
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});
// Okamžitá aktivace na požádání z UI
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// FETCH – navigace cache-first + tichá obnova; ostatní SWR
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Pouze GET požadavky má smysl cachovat
  if (req.method !== 'GET') return;

  // Navigační požadavky (HTML)
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      // Vezmi z cache index, zároveň se na pozadí pokus o fresh verzi
      const cached = await caches.match(URLS.INDEX);
      // tichá obnova indexu (neblokuje odpověď)
      fetch(req, { cache: 'no-store' }).then(async (res) => {
        try {
          const runtime = await caches.open(CACHE_RUNTIME);
          await runtime.put(URLS.INDEX, res.clone());
        } catch { /* ignore */ }
      }).catch(() => { /* offline */ });

      try {
        // Když cache není, zkus síť; při chybě spadni na offline.html
        return cached || await fetch(req);
      } catch {
        return cached || await caches.match(URLS.OFFLINE);
      }
    })());
    return;
  }

  // Ostatní GET (statická aktiva, obrázky, skripty, …)
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_RUNTIME);
    const cached = await cache.match(req);

    // Stale-While-Revalidate: vrať cache (když je), síť načti na pozadí
    const network = fetch(req).then(res => {
      if (res && res.status === 200) cache.put(req, res.clone());
      return res;
    }).catch(() => null);

    return cached || network || Response.error();
  })());
});


















