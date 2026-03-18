const CACHE_NAME = 'moon-flow-v3';
const ASSETS = [
  '/moon-flow/',
  '/moon-flow/index.html',
  '/moon-flow/lunar-data.js',
  '/moon-flow/manifest.json',
  '/moon-flow/icons/pwa_192_192x192.png',
  '/moon-flow/icons/pwa_512_512x512.png',
  '/moon-flow/icons/apple_touch_icon_180x180.png'
];

// Verificar actualizaciones cada hora
setInterval(() => {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'CHECK_UPDATE'
      });
    });
  });
}, 3600000); // 1 hora

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => !k.includes('moon-flow')).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // APIs externas: network-first
  if (e.request.url.includes('open-meteo.com') || e.request.url.includes('fonts.googleapis.com')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Archivos locales: cache-first but verify updates
  if (e.request.url.includes('index.html') || e.request.url.includes('lunar-data.js')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          // Notificar cambios
          if (cached && cached.headers.get('content-length') !== resp.headers.get('content-length')) {
            self.clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({
                  type: 'UPDATE_AVAILABLE',
                  url: e.request.url
                });
              });
            });
          }
          return resp;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Otros archivos: cache-first
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      const clone = resp.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return resp;
    }))
  );
});
