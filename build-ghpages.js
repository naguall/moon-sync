#!/usr/bin/env node
/**
 * FieldWeaver — Build script for GitHub Pages deployment
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
    name: "FieldWeaver - Lunar Calendar",
    short_name: "FieldWeaver",
    description: "Lunar Calendar with phases, planetary aspects, tides and more",
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
        { src: "icons/icon-512x512.png", sizes: "512x512", type: "image/png", form_factor: "narrow", label: "FieldWeaver" }
    ]
};
fs.writeFileSync(path.join(DOCS, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('  ✓ manifest.json (GitHub Pages paths)');
copied++;

// === Create sw.js from source sw.js, adjusting paths for GitHub Pages ===
// Read APP_VERSION from index.html to keep sw.js version in sync
let srcIndex = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
// v635: APP_VERSION is now declared as `window.APP_VERSION = 'vXXX'` at the
// top of the file. Match that first, then fall back to the legacy `var` form.
let versionMatch = srcIndex.match(/window\.APP_VERSION\s*=\s*'([^']+)'/);
if (!versionMatch) versionMatch = srcIndex.match(/var APP_VERSION\s*=\s*'([^']+)'/);
let appVersion = versionMatch ? versionMatch[1] : 'v559';

// Read source sw.js and adjust paths
let swSource = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
// Update CACHE_NAME to match APP_VERSION (rebranded from fieldweaver- → astroatlas-)
swSource = swSource.replace(/const CACHE_NAME = '[^']+';/, `const CACHE_NAME = 'astroatlas-${appVersion}';`);
// Fix asset paths: add BASE_PATH prefix to relative paths
swSource = swSource.replace(
  /const ASSETS = \[[\s\S]*?\];/,
  `const ASSETS = [
  '${BASE_PATH}/',
  '${BASE_PATH}/index.html',
  '${BASE_PATH}/lunar-data.js',
  '${BASE_PATH}/custom-messages.js',
  '${BASE_PATH}/manifest.json',
  '${BASE_PATH}/knowledge-graph.js',
  '${BASE_PATH}/knowledge-graph-part2.js',
  '${BASE_PATH}/knowledge-graph-part3.js',
  '${BASE_PATH}/ai-adapter.js',
  '${BASE_PATH}/learner-profile.js',
  'https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Blue_Marble_2002.png/1280px-Blue_Marble_2002.png'
];`
);
fs.writeFileSync(path.join(DOCS, 'sw.js'), swSource);
console.log(`  ✓ sw.js (from source, version ${appVersion}, GitHub Pages paths)`);
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
<title>Install FieldWeaver</title>
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
  <img src="icons/icon-512x512.png" alt="FieldWeaver" class="icon">
  <h1>FieldWeaver</h1>
  <p class="subtitle">Lunar Calendar & Astrology</p>

  <div class="features">
    <div class="feature"><div class="emoji">🌙</div><div class="label">Lunar Phases</div></div>
    <div class="feature"><div class="emoji">🪐</div><div class="label">Planets</div></div>
    <div class="feature"><div class="emoji">🌊</div><div class="label">Tides</div></div>
    <div class="feature"><div class="emoji">⭐</div><div class="label">Natal Chart</div></div>
  </div>

  <button class="btn-install" id="installBtn" onclick="installApp()">Install App</button>

  <div id="iosInstructions" class="instructions hidden">
    <h3>To install on iPhone/iPad:</h3>
    <ol>
      <li>Tap the <span class="icon-text">⬆️</span> Share button (bottom)</li>
      <li>Find <strong>"Add to Home Screen"</strong></li>
      <li>Tap <strong>"Add"</strong></li>
    </ol>
    <p style="color:#7ec8ff; margin-top:12px;">The app installs as an icon on your screen.</p>
  </div>

  <div id="androidInstructions" class="instructions hidden">
    <h3>To install on Android:</h3>
    <ol>
      <li>Tap the menu <strong>⋮</strong> (three dots top-right)</li>
      <li>Select <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong></li>
      <li>Confirm <strong>"Install"</strong></li>
    </ol>
  </div>

  <div id="installed" class="hidden" style="margin-top:20px;">
    <p style="color:#4ecdc4; font-size:1.2em;">✅ App installed!</p>
  </div>

  <a href="index.html" class="open-app">Open FieldWeaver →</a>
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
  document.getElementById('installBtn').textContent = 'How to Install';
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
