// /sw.js — MIGRÁTOR ze staré adresy na /Bernio/
const NEW_URL = self.registration.scope + 'Bernio/'; // např. https://berniocal.github.io/Bernio/

self.addEventListener('install', () => {
  // nainstaluj hned
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 1) smaž všechny SW cache v tomhle scope
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch {}

    // 2) převezmi klienty (okna/taby)
    await self.clients.claim();

    // 3) přesměruj všechna otevřená okna na novou adresu
    try {
      const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      cs.forEach((c) => c.navigate(NEW_URL).catch(()=>{}));
    } catch {}

    // 4) odregistruj sám sebe (po přesměrování)
    try { await self.registration.unregister(); } catch {}
  })());
});

// 5) Každý navigační request přesměruj (funguje i bez otevřeného okna)
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(Response.redirect(NEW_URL, 308));
  }
});
