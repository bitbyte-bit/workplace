const CACHE_NAME = 'orion-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/oro.png',
  '/orog-512.png',
  '/orograph.png'
];

self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
})
);
});

self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(name => {
          if (name!== CACHE_NAME) {
            return caches.delete(name);
}
})
)
)
);
  return self.clients.claim(); 
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return (
        response ||
        fetch(event.request).catch(() => caches.match('/offline.html'))
);
})
);
});