const CACHE_NAME = 'calc-pwa-v1';
const urlsToCache = [
  './index.html',
  './style.css',
  './app.js',
  './calculator.js',
  './manifest.json'
];

// インストール時にファイルをキャッシュする
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// オフライン時にキャッシュから読み込む
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});