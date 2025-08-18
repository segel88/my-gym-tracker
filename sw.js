// sw.js — versione sicura
const IS_LOCAL = self.location.origin.startsWith('http://127.0.0.1') || self.location.origin.startsWith('http://localhost');

self.addEventListener('install', (event) => {
  // in dev aggiorna subito
  if (IS_LOCAL) self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // pulisci cache vecchie
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));

    // in dev: prendi controllo subito
    if (IS_LOCAL) await self.clients.claim();
  })());
});

// NON intercettare richieste cross-origin (es. script.google.com)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (!sameOrigin) {
    // lascia passare senza respondWith -> niente promesse rifiutate
    return;
  }

  // Strategia base per risorse locali (puoi adattare)
  event.respondWith(fetch(event.request));
});
