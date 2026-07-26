const CACHE='abwasser-rechner-v0.11.0-alpha';
const FILES=["./","./index.html","./styles.css?v=0.11.0-alpha","./manifest.webmanifest","./icon-192.png","./icon-512.png","./js/app.js?v=0.11.0-alpha","./js/db/database.js","./js/repositories/document-repository.js","./js/services/audit-service.js","./js/qrcode-offline.js","./js/utils.js","./js/calculators.js","./js/chemistry.js","./js/dewatering.js","./plant-hero-base.png"];
self.addEventListener("install",event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)))});
self.addEventListener("activate",event=>event.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))])));
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const isNavigation=event.request.mode==="navigate";
  if(isNavigation){
    event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put("./index.html",copy));return response}).catch(()=>caches.match("./index.html")));
    return;
  }
  event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request)));
});
