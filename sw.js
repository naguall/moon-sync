const CACHE_NAME = 'moon-sync-v524';
const ASSETS = [
  '/moon-sync/',
  '/moon-sync/index.html',
  '/moon-sync/lunar-data.js',
  '/moon-sync/custom-messages.js',
  '/moon-sync/manifest.json',
  '/moon-sync/knowledge-graph.js',
  '/moon-sync/knowledge-graph-part2.js',
  '/moon-sync/knowledge-graph-part3.js',
  '/moon-sync/ai-adapter.js',
  '/moon-sync/learner-profile.js',
  'https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Blue_Marble_2002.png/1280px-Blue_Marble_2002.png'
];

// Helper: close ALL notifications and clear badge
function clearEverything() {
  return self.registration.getNotifications().then(notifications => {
    console.log('[SW] Found ' + notifications.length + ' notifications to close');
    notifications.forEach(n => n.close());
    var p = Promise.resolve();
    if ('clearAppBadge' in self.navigator) {
      p = p.then(() => self.navigator.clearAppBadge().catch(()=>{}));
    }
    if ('setAppBadge' in self.navigator) {
      p = p.then(() => self.navigator.setAppBadge(0).catch(()=>{}));
    }
    return p;
  }).catch(err => console.log('[SW] clearEverything error:', err));
}

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  // Don't skipWaiting here — let the page control when to activate
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => {
      // On activate (new SW takes control), clear all old notifications
      return clearEverything();
    })
  );
  self.clients.claim();
});

// When user clicks a notification, open app and clear everything
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clearEverything().then(() => {
      var url = '/moon-sync/';
      if (e.notification.data && e.notification.data.dreamAlarm) {
        url = '/moon-sync/?dreamAlarm=1';
      }
      return clients.matchAll({type: 'window', includeUncontrolled: true}).then(cls => {
        if (cls.length > 0) {
          cls[0].navigate(url);
          return cls[0].focus();
        }
        return clients.openWindow(url);
      });
    })
  );
});

// When user swipes away a notification
self.addEventListener('notificationclose', e => {
  // Small delay to let Android process the close
  e.waitUntil(
    new Promise(r => setTimeout(r, 300)).then(() => {
      return self.registration.getNotifications();
    }).then(notifications => {
      if (notifications.length === 0) { return clearEverything(); }
    })
  );
});

// Listen for messages from the page
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'CLEAR_BADGES') {
    e.waitUntil(clearEverything());
  }
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (e.data && e.data.type === 'DREAM_ALARM') {
    e.waitUntil(
      self.registration.showNotification(e.data.title, {
        body: e.data.body,
        icon: '/moon-sync/icons/icon-192.png',
        badge: '/moon-sync/icons/icon-192.png',
        tag: 'dream-alarm',
        requireInteraction: true,
        vibrate: [300, 200, 300, 200, 300],
        data: { dreamAlarm: true }
      })
    );
  }
});

self.addEventListener('fetch', e => {
  const url = e.request.url;
  // External images (NASA, Wikimedia): pass through directly without modifying request mode
  if (url.includes('upload.wikimedia.org') || url.includes('science.nasa.gov')) {
    return;
  }
  // Google Identity Services & Calendar API: pass through
  if (url.includes('accounts.google.com') || url.includes('googleapis.com/calendar') || url.includes('googleapis.com/oauth2')) {
    return;
  }
  // External APIs: network only
  if (url.includes('open-meteo.com') || url.includes('fonts.googleapis.com') || url.includes('earthquake.usgs.gov')) {
    e.respondWith(
      fetch(new Request(url, {method: 'GET', headers: e.request.headers}))
        .catch(() => new Response('{"error":"offline"}', {status: 503, headers: {'Content-Type':'application/json'}}))
    );
    return;
  }
  // All app files: NETWORK FIRST, fallback to cache
  e.respondWith(
    fetch(e.request).then(resp => {
      const clone = resp.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return resp;
    }).catch(() => caches.match(e.request))
  );
});
