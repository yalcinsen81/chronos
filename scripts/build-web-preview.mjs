// Tarayıcı önizlemesi üretir: expo export (web) + mutlak yolları göreli yapar.
// Böylece çıktı herhangi bir alt dizinde (statik barındırma, artifact) açılabilir.
// Kullanım: node scripts/build-web-preview.mjs [çıktı-klasörü]
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const out = path.resolve(process.argv[2] ?? 'dist-web');
fs.rmSync(out, { recursive: true, force: true });
execSync(`npx expo export --platform web --output-dir "${out}"`, { stdio: 'inherit', env: { ...process.env, CI: '1' } });

const html = path.join(out, 'index.html');
fs.writeFileSync(html, fs.readFileSync(html, 'utf8').replace(/(src|href)="\/(?!\/)/g, '$1="./'));

const jsDir = path.join(out, '_expo/static/js/web');
for (const f of fs.readdirSync(jsDir)) {
  const p = path.join(jsDir, f);
  // Font ve görsel varlık yolları: "/assets/..." → "./assets/..." (sayfaya göreli)
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/"\/assets\//g, '"./assets/'));
}
// --- PWA: manifest, çevrimdışı önbellek (service worker) ve kurulum etiketleri ---
const manifest = {
  name: 'Chronos',
  short_name: 'Chronos',
  description: 'Haftalık planlayıcı: günlük notlar, alarmlar, tekrarlar.',
  lang: 'tr',
  start_url: './',
  scope: './',
  id: './',
  display: 'standalone',
  orientation: 'any',
  background_color: '#FCFBF9',
  theme_color: '#E4572B',
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
fs.writeFileSync(path.join(out, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

// Önbelleğe alınacak tüm dosyalar (sürüm adı içeriğe göre değişir; yeni yayında eski önbellek silinir)
const files = [];
const walk = (d) => {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else files.push(path.relative(out, p).split(path.sep).join('/'));
  }
};
walk(out);
const version = String(Date.now());
const sw = `// Chronos servis çalışanı: uygulama dosyalarını önbelleğe alır, internetsiz de açılır.
const CACHE = 'chronos-${version}';
const FILES = ${JSON.stringify(['./', ...files.filter((f) => f !== 'index.html')], null, 1)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).catch(() => caches.match('./'))),
  );
});
`;
fs.writeFileSync(path.join(out, 'sw.js'), sw);

let page = fs.readFileSync(html, 'utf8');
const tags = `
<link rel="manifest" href="./manifest.webmanifest">
<meta name="theme-color" content="#E4572B">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Chronos">
<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">
<script>
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').catch(function () {});
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
  });
}
</script>`;
fs.writeFileSync(html, page.replace('</head>', tags + '\n</head>'));

console.log(`Önizleme hazır: ${out}`);
