// 缓存版本号：每次发布新版本时递增，可自动清理旧缓存并强制更新页面
const CACHE = 'suki-reading-v41';
const ASSETS = [
  './',
  './index.html',
  './bg-liquid-glass.jpg',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './assets/stickers/shin_head_0_0.png','./assets/stickers/shin_head_0_1.png','./assets/stickers/shin_head_0_2.png','./assets/stickers/shin_head_0_3.png',
  './assets/stickers/shin_head_1_0.png','./assets/stickers/shin_head_1_1.png','./assets/stickers/shin_head_1_2.png','./assets/stickers/shin_head_1_3.png',
  './assets/stickers/shin_head_2_0.png','./assets/stickers/shin_head_2_1.png','./assets/stickers/shin_head_2_2.png','./assets/stickers/shin_head_2_3.png',
  './assets/stickers/shin_head_3_0.png','./assets/stickers/shin_head_3_1.png','./assets/stickers/shin_head_3_2.png','./assets/stickers/shin_head_3_3.png',
  './assets/stickers/shin_life_0_0.png','./assets/stickers/shin_life_0_1.png','./assets/stickers/shin_life_1_0.png','./assets/stickers/shin_life_1_1.png',
  './assets/stickers/shin_life_2_0.png','./assets/stickers/shin_life_2_1.png','./assets/stickers/shin_life_3_0.png','./assets/stickers/shin_life_3_1.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(ASSETS);
    }).catch(function () {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  // 只处理同源 GET 请求；OpenLibrary / Open-Meteo 等外部请求直接走网络
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  var isHTML = e.request.mode === 'navigate' ||
               url.pathname === '/' ||
               url.pathname.endsWith('/') ||
               url.pathname.endsWith('.html');

  if (isHTML) {
    // 页面本体：网络优先（Network First）——保证每次打开都拿到最新版本，
    // 断网时才回退到缓存，这样离线依然可用。
    e.respondWith(
      fetch(e.request).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(e.request).then(function (hit) {
          return hit || caches.match('./index.html') || caches.match('./');
        });
      })
    );
    return;
  }

  // 图片、图标等静态资源：缓存优先，速度快（更新靠文件名上的 ?v= 版本号）
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return caches.match('./'); });
    })
  );
});
