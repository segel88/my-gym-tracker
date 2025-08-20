// Service Worker per PWA su GitHub Pages
const CACHE_NAME = 'gym-tracker-v1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/config.js',
  './js/utils.js',
  './asset/icon-gym.svg',
  './asset/Cyber.png'
];

// Installa il Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aperta');
        return cache.addAll(urlsToCache);
      })
  );
});

// Attiva il Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercetta le richieste
self.addEventListener('fetch', event => {
  // Ignora richieste non-GET
  if (event.request.method !== 'GET') return;
  
  // Ignora richieste a domini esterni (Google Apps Script, etc)
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - ritorna la risposta
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});