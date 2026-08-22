const CACHE_PREFIX='abwasser-rechner-';
const CACHE=`${CACHE_PREFIX}v0.11.0-alpha.78-knowledge-content4`;
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
  "./sales-simplified-ui.css?v=0.11.0-alpha.52",
  "./sales-offers-ui.css?v=0.11.0-alpha.52",
  "./field-sales-dashboard.css?v=0.11.0-alpha.53",
  "./plant-location-imagery.css?v=0.11.0-alpha.69",
  "./plant-gps-summary.css?v=0.11.0-alpha.73-gps-summary1",
  "./newsletter-consent.css?v=0.11.0-alpha.74-newsletter-consent1",
  "./page-transitions.css?v=0.11.0-alpha.75-page-transitions2",
  "./influent-dosing-calculator.css?v=0.11.0-alpha.76-influent-dosing1",
  "./vta-theme.css?v=0.11.0-alpha.71-nano1",
  "./knowledge.css?v=0.11.0-alpha.77-knowledge1",
  "./demo-organization.css?v=0.11.0-alpha.33",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./js/demo-organization-loader.js?v=0.11.0-alpha.33",
  "./js/demo-organization.js?v=0.11.0-alpha.33",
  "./js/demo-workspace.js?v=0.11.0-alpha.29",
  "./js/navigation-enhancements.js?v=0.11.0-alpha.38",
  "./js/page-transitions.js?v=0.11.0-alpha.75-page-transitions2",
  "./js/app.js?v=0.11.0-alpha.19",
  "./js/knowledge-entry.js?v=0.11.0-alpha.77-knowledge1",
  "./js/components/knowledge-base.js",
  "./js/repositories/knowledge-repository.js",
  "./js/services/knowledge-seed-service.js",
  "./js/knowledge/knowledge-seed-data.js",
  "./js/product-dosing-profile-ui.js?v=0.11.0-alpha.76-influent-dosing1",
  "./js/open-map-provider.js?v=0.11.0-alpha.55",
  "./js/plant-location-imagery.js?v=0.11.0-alpha.69",
  "./js/plant-gps-summary.js?v=0.11.0-alpha.73-gps-summary1",
  "./js/firebase-config.js?v=0.11.0-alpha.42",
  "./js/firebase-auth.js?v=0.11.0-alpha.42",
  "./js/firebase-plant-migration.js?v=0.11.0-alpha.43",
  "./js/firebase-task-sync.js?v=0.11.0-alpha.45",
  "./js/firebase-task-global-view.js?v=0.11.0-alpha.54",
  "./js/firebase-task-assignment-ui.js?v=0.11.0-alpha.47",
  "./js/sales-workspace-ui.js?v=0.11.0-alpha.52",
  "./js/sales-offers-ui.js?v=0.11.0-alpha.52",
  "./js/field-sales-dashboard.js?v=0.11.0-alpha.53",
  "./js/customer-supply-intelligence.js?v=0.11.0-alpha.56",
  "./js/customer-supply-ui-guard.js?v=0.11.0-alpha.56",
  "./js/startup-dashboard-guard.js?v=0.11.0-alpha.37",
  "./js/sidebar-tasks.js?v=0.11.0-alpha.39",
  "./js/document-review-enhancements.js?v=0.11.0-alpha.23",
  "./js/visit-guide-enhancements.js?v=0.11.0-alpha.24",
  "./js/newsletter-consent.js?v=0.11.0-alpha.74-newsletter-consent1",
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
  "./js/influent-dosing-calculator.js",
  "./js/product-dosing-profiles.js",
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
  event.waitUntil((async()=>{
    await self.clients.claim();
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));

    const clients=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    await Promise.all(clients.map(async client=>{
      try{await client.navigate(client.url)}catch(error){console.warn("PWA-Client konnte nach Update nicht neu geladen werden",error)}
    }));
  })());
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET") return;

  const requestUrl=new URL(event.request.url);
  const previewPath=new URL("./preview-alpha47/",self.registration.scope).pathname;
  if(requestUrl.pathname.startsWith(previewPath)) return;

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
