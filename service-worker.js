const CACHE_NAME = 'orion-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/music.html',
  '/electronics.html',
  '/accessories.html',
  '/monitor.html',
  '/services.html',
  '/tool1.html',
  '/news.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/2 in 1.jpg',
  '/access.webp',
  '/btn.jpg',
  '/charger.jpg',
  '/electronics.webp',
  '/gadget.jpg',
  '/ledtv.avif',
  '/movies.jfif',
  '/music.jfif',
  '/oro.png',
  '/orog.png',
  '/orograph.png',
  '/photography.jfif',
  '/print.jfif',
  '/repair.jfif',
  '/wide.png',
  '/Teal Modern Letter O Creative Design Studio Logo (1).png',
  '/Teal Modern Letter O Creative Design Studio Logo.png'
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
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone the response
        const responseClone = response.clone();
        // Open cache and store the response
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request);
      })
  );
});