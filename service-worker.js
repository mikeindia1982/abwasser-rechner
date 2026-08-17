const CACHE='abwasser-rechner-v0.11.0-alpha.39';
const FILES=[
  "./",
  "./index.html",
  "./styles.css?v=0.11.0-alpha.19",
  "./document-fixes.css?v=0.11.0-alpha.23",
  "./visit-guide.css?v=0.11.0-alpha.24",
  "./visit-report.css?v=0.11.0-alpha.25",
  "./visits-ui.css?v=0.11.0-alpha.28",
  "./demo-workspace.css?v=0.11.0-alpha.29",
  "./navigation-enhancements.css?v=0.11.0-alpha.37",
  "./demo-organization.css?v=0.11.0-alpha.33",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./js/demo-organization-loader.js?v=0.11.0-alpha.33",
  "./js/demo-organization.js?v=0.11.0-alpha.33",
  "./js/demo-workspace.js?v=0.11.0-alpha.29",
  "./js/navigation-enhancements.js?v=0.11.0-alpha.38",
  "./js/app.js?v=0.11.0-alpha.19",
  "./js/startup-dashboard-guard.js?v=0.11.0-alpha.37",
  "./js/sidebar-tasks.js?v=0.11.0-alpha.39",
  "./js/document-review-enhancements.js?v=0.11.0-alpha.23",
  "./js/visit-guide-enhancements.js?v=0.11.0-alpha.24",
  "./js/visit-report-enhancements.js?v=0.11.0-alpha.25",
  "./js/visits-ui-enhancements.js?v=0.11.0-alpha.28",
  "./js/components/product-image.js",
  "./js/db/database.js",
  "./js/repositories/document-repository.js",
  "./js/repositories/operator-repository.js",
  "./js/services/audit-service.js",
  "./js/services/operator-lookup-service.js",
  "./js/components/pdf-viewer.js",
  "./js/qrcode-offline.js",
  "./js/utils.js",
  "./js/calculators.js",
  "./js/chemistry.js",
  "./js/dewatering.js",
  "./js/product-requests.js",
  "./js/tenders/config.js",
  "./js/tenders/tender-radar-ui.js",
  "./js/tenders/repositories/tender-repository.js",
  "./js/tenders/services/tender-cron-interface.js",
  "./js/tenders/services/tender-relevance-service.js",
  "./js/tenders/services/tender-scan-service.js",
  "./js/tenders/sources/tender-data-source.js",
  "./js/tenders/sources/german-public-procurement-data-source.js",
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