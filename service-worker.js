const CACHE='abwasser-rechner-v0.11.0-alpha.9-tenant5';
const FILES=[
  "./",
  "./index.html",
  "./vta.html",
  "./platform.html",
  "./styles.css?v=0.11.0-alpha.9",
  "./manifest.webmanifest",
  "./manifest-vta.webmanifest",
  "./manifest-platform.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./js/platform/tenant-runtime.js?v=tenant-1",
  "./js/platform/tenant-config.js",
  "./js/platform/organization-bootstrap.js?v=tenant-1",
  "./js/app.js?v=0.11.0-alpha.9",
  "./js/db/database.js",
  "./js/repositories/document-repository.js",
  "./js/repositories/organization-repository.js",
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
          const requestUrl=new URL(event.request.url);
          const isAppShell=requestUrl.pathname.endsWith("/")||requestUrl.pathname.endsWith("/index.html");
          if(response.ok&&isAppShell){
            const copy=response.clone();
            caches.open(CACHE).then(cache=>cache.put("./index.html",copy));
          }
          return response;
        })
        .catch(async()=>{
          const cachedNavigation=await caches.match(event.request,{ignoreSearch:true});
          return cachedNavigation||caches.match("./index.html");
        })
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
