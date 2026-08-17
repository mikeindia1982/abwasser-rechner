const CACHE_PREFIX='abwasser-preview-alpha47-';
const CACHE=`${CACHE_PREFIX}v7`;
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
  "./firebase-auth.css?v=0.11.0-alpha.40",
  "./firebase-plant-migration.css?v=0.11.0-alpha.43",
  "./firebase-task-sync.css?v=0.11.0-alpha.45",
  "./firebase-task-assignment-ui.css?v=0.11.0-alpha.47",
  "./demo-organization.css?v=0.11.0-alpha.33",
  "./manifest-vta.webmanifest",
  "./manifest-platform.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./js/platform/tenant-preboot.js?v=preview-alpha47-fix2",
  "./js/platform/tenant-config.js",
  "./js/editions/vta/edition-data.js",
  "./js/editions/platform/edition-data.js",
  "./js/platform/tenant-runtime.js?v=preview-alpha47",
  "./js/platform/organization-bootstrap.js?v=preview-alpha47",
  "./js/repositories/organization-repository.js",
  "./js/demo-organization-loader.js?v=0.11.0-alpha.33",
  "./js/demo-organization.js?v=0.11.0-alpha.33",
  "./js/demo-workspace.js?v=0.11.0-alpha.29",
  "./js/navigation-enhancements.js?v=0.11.0-alpha.38",
  "./js/app.js?v=0.11.0-alpha.19",
  "../js/open-map-provider.js?v=0.11.0-alpha.55",
  "../js/customer-supply-intelligence.js?v=0.11.0-alpha.56",
  "../js/customer-supply-ui-guard.js?v=0.11.0-alpha.56",
  "./js/preview-task-mirror.js?v=preview-alpha47-taskfix1",
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

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then(keys=>Promise.all(
      keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key))
    ))
  ]));
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const isNavigation=event.request.mode==='navigate';
  if(isNavigation){
    event.respondWith(
      fetch(event.request)
        .then(response=>{
          if(response.ok){
            const copy=response.clone();
            caches.open(CACHE).then(cache=>cache.put(event.request,copy));
          }
          return response;
        })
        .catch(async()=>await caches.match(event.request)||caches.match('./index.html'))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
      if(response.ok){
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      }
      return response;
    }))
  );
});