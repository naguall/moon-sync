const CACHE_NAME = 'astro-currents-v567';
const BASE = '/astro-currents';
const ASSETS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/lunar-data.js',
  BASE + '/custom-messages.js',
  BASE + '/manifest.json',
  BASE + '/knowledge-graph.js',
  BASE + '/knowledge-graph-part2.js',
  BASE + '/knowledge-graph-part3.js',
  BASE + '/ai-adapter.js',
  BASE + '/learner-profile.js',
  BASE + '/NEW_PERSONAS.js',
  BASE + '/PERSONA_6_UNIFICADA.js',
  'https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js',
];

function clearEverything() {
  return self.registration.getNotifications().then(notifications => {
    notifications.forEach(n => n.close());
    var p = Promise.resolve();
    if ('clearAppBadge' in self.navigator) p = p.then(() => self.navigator.clearAppBadge().catch(()=>{}));
    if ('setAppBadge' in self.navigator) p = p.then(() => self.navigator.setAppBadge(0).catch(()=>{}));
    return p;
  }).catch(err => console.log('[SW] clearEverything error:', err));
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => clearEverything())
  );
  self.clients.claim();
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clearEverything().then(() => {
      var url = BASE + '/';
      return clients.matchAll({type: 'window', includeUncontrolled: true}).then(cls => {
        if (cls.length > 0) { cls[0].focus(); return cls[0]; }
        return clients.openWindow(url);
      });
    })
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      if (resp.status === 200) {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      }
      return resp;
    })).catch(() => caches.match(BASE + '/index.html'))
  );
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'Astro Currents', body: '🌙 Nuevo evento lunar' };
  e.waitUntil(
    self.registration.showNotification(data.title || 'Astro Currents', {
      body: data.body || '',
      icon: BASE + '/icons/icon-192x192.png',
      badge: BASE + '/icons/icon-96x96.png',
      tag: data.tag || 'astro-notification',
      data: data.data || {}
    })
  );
});
