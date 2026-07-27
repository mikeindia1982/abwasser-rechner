const CACHE='abwasser-rechner-v0.11.0-alpha.9';
const FILES=[
  "./",
  "./index.html",
  "./styles.css?v=0.11.0-alpha.9",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./js/app.js?v=0.11.0-alpha.9",
  "./js/db/database.js",
  "./js/repositories/document-repository.js",
  "./js/services/audit-service.js",
  "./js/components/pdf-viewer.js",
  "./js/vendor/pdfjs/pdf.min.mjs",
  "./js/vendor/pdfjs/pdf.worker.min.mjs",
  "./js/vendor/pdfjs/LICENSE",
  "./js/qrcode-offline.js",
  "./js/utils.js",
  "./js/calculators.js",
  "./js/chemistry.js",
  "./js/dewatering.js",
  "./plant-hero-base.png",
  "./plant-schema-photorealistic.webp",
  "./js/process/process-schema-3d.js"
];

self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));
});

self.addEventListener("activate",event=>{
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then(keys=>Promise.all(
      keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))
    ))
  ]));
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET") return;

  const isNavigation=event.request.mode==="navigate";
  if(isNavigation){
    event.respondWith(
      fetch(event.request)
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put("./index.html",copy));
          return response;
        })
        .catch(()=>caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>{
      if(cached) return cached;
      return fetch(event.request).then(response=>{
        if(response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        }
        return response;
      });
    })
  );
});
