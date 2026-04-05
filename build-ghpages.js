#!/usr/bin/env node
/**
 * Astro Currents — Build script for GitHub Pages deployment
 * Creates docs/ directory with all web assets, adjusted paths for /moon-sync/ base
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DOCS = path.join(ROOT, 'docs');
const BASE_PATH = '/astro-currents'; // GitHub repo name = URL base

// Files to copy
const FILES = [
    'index.html',
    'lunar-data.js',
    'ai-adapter.js',
    'custom-messages.js',
    'knowledge-graph.js',
    'knowledge-graph-part2.js',
    'knowledge-graph-part3.js',
    'learner-profile.js',
    'NEW_PERSONAS.js',
    'PERSONA_6_UNIFICADA.js',
    'capacitor-bridge.js'
];

const DIRS = ['icons'];

// Clean and create docs/
if (fs.existsSync(DOCS)) {
    fs.rmSync(DOCS, { recursive: true });
}
fs.mkdirSync(DOCS, { recursive: true });

// Copy files
let copied = 0;
FILES.forEach(file => {
    const src = path.join(ROOT, file);
    const dst = path.join(DOCS, file);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
        console.log('  ✓ ' + file);
        copied++;
    }
});

// Copy directories
function copyDir(src, dst) {
    if (!fs.existsSync(src)) return 0;
    if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
    let count = 0;
    fs.readdirSync(src).forEach(item => {
        const s = path.join(src, item);
        const d = path.join(dst, item);
        if (fs.statSync(s).isDirectory()) {
            count += copyDir(s, d);
        } else {
            fs.copyFileSync(s, d);
            count++;
        }
    });
    return count;
}

DIRS.forEach(dir => {
    const n = copyDir(path.join(ROOT, dir), path.join(DOCS, dir));
    console.log('  ✓ ' + dir + '/ (' + n + ' files)');
    copied += n;
});

// === Create manifest.json with GitHub Pages paths ===
const manifest = {
    name: "Astro Currents - Calendario Lunar",
    short_name: "Astro Currents",
    description: "Calendario Lunar con fases, aspectos planetarios, mareas y más",
    start_url: BASE_PATH + "/",
    scope: BASE_PATH + "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#02020F",
    theme_color: "#c9a840",
    categories: ["lifestyle", "education"],
    icons: [
        { src: "icons/icon-48x48.png", sizes: "48x48", type: "image/png" },
        { src: "icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
        { src: "icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
        { src: "icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
        { src: "icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
        { src: "icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
        { src: "icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable any" }
    ],
    screenshots: [
        { src: "icons/icon-512x512.png", sizes: "512x512", type: "image/png", form_factor: "narrow", label: "Astro Currents" }
    ]
};
fs.writeFileSync(path.join(DOCS, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('  ✓ manifest.json (GitHub Pages paths)');
copied++;

// === Create sw.js with GitHub Pages paths ===
const swContent = `const CACHE_NAME = 'astro-currents-v558';
const BASE = '${BASE_PATH}';
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
`;
fs.writeFileSync(path.join(DOCS, 'sw.js'), swContent);
console.log('  ✓ sw.js (GitHub Pages paths)');
copied++;

// === Patch index.html SW registration path ===
let indexContent = fs.readFileSync(path.join(DOCS, 'index.html'), 'utf8');
// Replace the hardcoded /astro-currents/ SW path with /moon-sync/
indexContent = indexContent.replace(
    /navigator\.serviceWorker\.register\('\/astro-currents\/sw\.js'/g,
    `navigator.serviceWorker.register('${BASE_PATH}/sw.js'`
);
// Also update any /astro-currents/ references in notification URLs
indexContent = indexContent.replace(/\/astro-currents\//g, BASE_PATH + '/');
fs.writeFileSync(path.join(DOCS, 'index.html'), indexContent);
console.log('  ✓ index.html (patched paths)');

// === Create install landing page ===
const installPage = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Instalar Astro Currents</title>
<link rel="manifest" href="manifest.json">
<link rel="icon" href="icons/favicon-32x32.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="theme-color" content="#02020F">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #02020F;
  color: #e0e0e0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
}
.container { max-width: 420px; width: 100%; }
.icon {
  width: 140px; height: 140px;
  border-radius: 28px;
  margin: 0 auto 24px;
  box-shadow: 0 8px 32px rgba(78, 205, 196, 0.3);
}
h1 {
  font-size: 2em;
  background: linear-gradient(135deg, #4ecdc4, #b388ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
}
.subtitle { color: #7ec8ff; font-size: 1.1em; margin-bottom: 32px; }
.btn-install {
  display: inline-block;
  background: linear-gradient(135deg, #4ecdc4, #b388ff);
  color: #02020F;
  font-size: 1.2em;
  font-weight: 700;
  padding: 16px 48px;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
  margin-bottom: 24px;
}
.btn-install:hover { transform: scale(1.05); box-shadow: 0 4px 20px rgba(78, 205, 196, 0.4); }
.btn-install:active { transform: scale(0.98); }
.hidden { display: none; }
.instructions {
  background: rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 24px;
  margin-top: 16px;
  text-align: left;
  line-height: 1.8;
}
.instructions h3 { color: #4ecdc4; margin-bottom: 12px; font-size: 1em; }
.instructions ol { padding-left: 20px; }
.instructions li { margin-bottom: 8px; color: #ccc; }
.instructions .icon-text { font-size: 1.3em; }
.features {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 24px 0;
}
.feature {
  background: rgba(255,255,255,0.04);
  border-radius: 12px;
  padding: 16px 12px;
}
.feature .emoji { font-size: 1.5em; margin-bottom: 6px; }
.feature .label { font-size: 0.85em; color: #aaa; }
.open-app {
  display: inline-block;
  color: #4ecdc4;
  font-size: 1.1em;
  margin-top: 16px;
  text-decoration: underline;
}
</style>
</head>
<body>
<div class="container">
  <img src="icons/icon-512x512.png" alt="Astro Currents" class="icon">
  <h1>Astro Currents</h1>
  <p class="subtitle">Calendario Lunar & Astrologia</p>

  <div class="features">
    <div class="feature"><div class="emoji">🌙</div><div class="label">Fases Lunares</div></div>
    <div class="feature"><div class="emoji">🪐</div><div class="label">Planetas</div></div>
    <div class="feature"><div class="emoji">🌊</div><div class="label">Mareas</div></div>
    <div class="feature"><div class="emoji">⭐</div><div class="label">Carta Natal</div></div>
  </div>

  <button class="btn-install" id="installBtn" onclick="installApp()">Instalar App</button>

  <div id="iosInstructions" class="instructions hidden">
    <h3>Para instalar en iPhone/iPad:</h3>
    <ol>
      <li>Toca el boton <span class="icon-text">⬆️</span> Compartir (abajo)</li>
      <li>Busca <strong>"Agregar a pantalla de inicio"</strong></li>
      <li>Toca <strong>"Agregar"</strong></li>
    </ol>
    <p style="color:#7ec8ff; margin-top:12px;">La app se instala como icono en tu pantalla.</p>
  </div>

  <div id="androidInstructions" class="instructions hidden">
    <h3>Para instalar en Android:</h3>
    <ol>
      <li>Toca el menu <strong>⋮</strong> (tres puntos arriba)</li>
      <li>Selecciona <strong>"Instalar app"</strong> o <strong>"Agregar a pantalla de inicio"</strong></li>
      <li>Confirma <strong>"Instalar"</strong></li>
    </ol>
  </div>

  <div id="installed" class="hidden" style="margin-top:20px;">
    <p style="color:#4ecdc4; font-size:1.2em;">✅ App instalada!</p>
  </div>

  <a href="index.html" class="open-app">Abrir Astro Currents →</a>
</div>

<script>
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('installBtn').classList.remove('hidden');
});

window.addEventListener('appinstalled', () => {
  document.getElementById('installBtn').classList.add('hidden');
  document.getElementById('installed').classList.remove('hidden');
  deferredPrompt = null;
});

function installApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(result => {
      if (result.outcome === 'accepted') {
        document.getElementById('installBtn').classList.add('hidden');
        document.getElementById('installed').classList.remove('hidden');
      }
      deferredPrompt = null;
    });
  } else {
    // Show manual instructions
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      document.getElementById('iosInstructions').classList.remove('hidden');
      document.getElementById('androidInstructions').classList.add('hidden');
    } else {
      document.getElementById('androidInstructions').classList.remove('hidden');
      document.getElementById('iosInstructions').classList.add('hidden');
    }
  }
}

// Auto-show instructions on iOS (no beforeinstallprompt)
if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.navigator.standalone) {
  document.getElementById('installBtn').textContent = 'Como Instalar';
}

// Register SW for PWA support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(console.error);
}
</script>
</body>
</html>`;
fs.writeFileSync(path.join(DOCS, 'install.html'), installPage);
console.log('  ✓ install.html (landing page)');
copied++;

console.log('\n🚀 GitHub Pages build complete: ' + copied + ' files → docs/\n');
console.log('URL: https://naguall.github.io/astro-currents/install.html');
console.log('App: https://naguall.github.io/astro-currents/index.html\n');
