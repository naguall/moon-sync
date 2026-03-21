const CACHE_NAME = 'moon-sync-v126';
const ASSETS = [
  '/moon-sync/',
  '/moon-sync/index.html',
  '/moon-sync/lunar-data.js',
  '/moon-sync/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// When user clicks a notification, open app and clear badge
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if ('clearAppBadge' in self.navigator) { self.navigator.clearAppBadge().catch(()=>{}); }
  e.waitUntil(
    clients.matchAll({type: 'window', includeUncontrolled: true}).then(cls => {
      if (cls.length > 0) { return cls[0].focus(); }
      return clients.openWindow('/moon-sync/');
    })
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // External images (Wikimedia): pass through directly without modifying request mode
  // IMPORTANT: <img> tags use no-cors mode; creating new Request() switches to cors and breaks it
  if (url.includes('upload.wikimedia.org')) {
    return; // Let browser handle natively — no SW interception
  }
  // External APIs: network only
  if (url.includes('open-meteo.com') || url.includes('fonts.googleapis.com') || url.includes('earthquake.usgs.gov')) {
    e.respondWith(
      fetch(new Request(url, {method: 'GET', headers: e.request.headers}))
        .catch(() => new Response('{"error":"offline"}', {status: 503, headers: {'Content-Type':'application/json'}}))
    );
    return;
  }
  // All app files: NETWORK FIRST, fallback to cache (ensures updates arrive)
  e.respondWith(
    fetch(e.request).then(resp => {
      const clone = resp.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return resp;
    }).catch(() => caches.match(e.request))
  );
});
