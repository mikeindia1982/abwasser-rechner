const CACHE='abwasser-rechner-v08-anlagenakte';
const FILES=["./","./index.html","./styles.css","./manifest.webmanifest","./icon-192.png","./icon-512.png","./js/app.js","./js/utils.js","./js/calculators.js","./js/chemistry.js","./js/dewatering.js"];
self.addEventListener("install",event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)))});
self.addEventListener("activate",event=>event.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))])));
self.addEventListener("fetch",event=>event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request))));
