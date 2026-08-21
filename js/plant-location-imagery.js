(() => {
  const BUILD='0.11.0-alpha.69-plant-imagery1';
  const PLANTS_KEY='abwasser-plants-v07';
  const ACTIVE_PLANT_KEY='abwasser-active-plant-v07';
  const MODE_KEY='abwasser-plant-imagery-mode-v01';
  const OPENFREE_STYLE='https://tiles.openfreemap.org/styles/liberty';
  const MAPLIBRE_JS='https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.js';
  const MAPLIBRE_CSS='https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css';
  const SATELLITE_TILES='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const SATELLITE_ATTRIBUTION='Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community';

  let mapLibrePromise=null;
  let hybridStylePromise=null;
  let scheduled=false;
  let renderSerial=0;
  let mounted={map:null,container:null,plantId:null,mode:null};

  const parseCoordinate=value=>{
    const normalized=String(value??'').trim().replace(',','.');
    if(!normalized)return null;
    const number=Number(normalized);
    return Number.isFinite(number)?number:null;
  };

  function readPlants(){
    try{
      const value=JSON.parse(localStorage.getItem(PLANTS_KEY)||'[]');
      return Array.isArray(value)?value:[];
    }catch{return []}
  }

  function activePlant(){
    const id=localStorage.getItem(ACTIVE_PLANT_KEY)||'';
    return readPlants().find(plant=>String(plant?.id||'')===String(id))||null;
  }

  function gpsPosition(value){
    const raw=String(value||'').trim();
    if(!raw)return null;
    const separator=raw.includes(';')?';':',';
    const parts=raw.split(separator).map(part=>part.trim()).filter(Boolean);
    if(parts.length!==2)return null;
    const lat=parseCoordinate(parts[0]);
    const lng=parseCoordinate(parts[1]);
    if(lat===null||lng===null)return null;
    return {lat,lng};
  }

  function plantPosition(plant){
    let lat=parseCoordinate(plant?.address?.latitude);
    let lng=parseCoordinate(plant?.address?.longitude);
    if(lat===null||lng===null){
      const gps=gpsPosition(plant?.address?.gps);
      lat=gps?.lat??null;lng=gps?.lng??null;
    }
    if(lat===null||lng===null||lat < -90||lat > 90||lng < -180||lng > 180)return null;
    return {lat,lng};
  }

  const osmUrl=(position,zoom=18)=>`https://www.openstreetmap.org/?mlat=${encodeURIComponent(position.lat)}&mlon=${encodeURIComponent(position.lng)}#map=${zoom}/${encodeURIComponent(position.lat)}/${encodeURIComponent(position.lng)}`;
  const routeUrl=position=>`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${position.lat},${position.lng}`)}`;

  function ensureMapLibre(){
    if(globalThis.maplibregl?.Map)return Promise.resolve(globalThis.maplibregl);
    if(mapLibrePromise)return mapLibrePromise;
    if(!document.querySelector('link[data-maplibre-css]')){
      const link=document.createElement('link');
      link.rel='stylesheet';link.href=MAPLIBRE_CSS;link.dataset.maplibreCss=BUILD;document.head.appendChild(link);
    }
    mapLibrePromise=new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-maplibre-js]');
      if(existing){
        if(globalThis.maplibregl?.Map){resolve(globalThis.maplibregl);return}
        existing.addEventListener('load',()=>globalThis.maplibregl?.Map?resolve(globalThis.maplibregl):reject(new Error('MapLibre ist nicht verfügbar.')),{once:true});
        existing.addEventListener('error',()=>reject(new Error('MapLibre konnte nicht geladen werden.')),{once:true});
        return;
      }
      const script=document.createElement('script');
      script.src=MAPLIBRE_JS;script.async=true;script.dataset.maplibreJs=BUILD;
      script.onload=()=>globalThis.maplibregl?.Map?resolve(globalThis.maplibregl):reject(new Error('MapLibre ist nach dem Laden nicht verfügbar.'));
      script.onerror=()=>reject(new Error('MapLibre konnte nicht geladen werden.'));
      document.head.appendChild(script);
    }).catch(error=>{mapLibrePromise=null;throw error});
    return mapLibrePromise;
  }

  function satelliteSource(){
    return {type:'raster',tiles:[SATELLITE_TILES],tileSize:256,maxzoom:19,attribution:SATELLITE_ATTRIBUTION};
  }

  function satelliteStyle(){
    return {
      version:8,
      sources:{'plant-satellite':satelliteSource()},
      layers:[{id:'plant-satellite-base',type:'raster',source:'plant-satellite',minzoom:0,maxzoom:22}]
    };
  }

  async function hybridStyle(){
    if(hybridStylePromise)return hybridStylePromise;
    hybridStylePromise=(async()=>{
      const response=await fetch(OPENFREE_STYLE,{cache:'force-cache'});
      if(!response.ok)throw new Error(`OpenFreeMap-Stil konnte nicht geladen werden (${response.status}).`);
      const base=await response.json();
      const hiddenTypes=new Set(['background','fill','fill-extrusion','hillshade','raster']);
      const referenceLayers=(Array.isArray(base.layers)?base.layers:[]).filter(layer=>!hiddenTypes.has(layer.type));
      return {
        ...base,
        sources:{'plant-satellite':satelliteSource(),...(base.sources||{})},
        layers:[{id:'plant-satellite-base',type:'raster',source:'plant-satellite',minzoom:0,maxzoom:22},...referenceLayers]
      };
    })().catch(error=>{hybridStylePromise=null;throw error});
    return hybridStylePromise;
  }

  async function styleForMode(mode){
    if(mode==='map')return OPENFREE_STYLE;
    if(mode==='hybrid')return hybridStyle();
    return satelliteStyle();
  }

  function modeLabel(mode){
    if(mode==='map')return 'OpenStreetMap-Karte';
    if(mode==='hybrid')return 'Hybrid: Luftbild mit Karteninformationen';
    return 'Satelliten-/Luftbild';
  }

  function preferredMode(){
    const stored=localStorage.getItem(MODE_KEY);
    return ['satellite','map','hybrid'].includes(stored)?stored:'satellite';
  }

  function markerElement(){
    const marker=document.createElement('div');
    marker.className='plant-location-imagery-marker';
    marker.setAttribute('aria-hidden','true');
    marker.innerHTML='<span>KA</span>';
    return marker;
  }

  function setButtonState(card,mode){
    card.querySelectorAll('[data-plant-imagery-mode]').forEach(button=>{
      const active=button.dataset.plantImageryMode===mode;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
  }

  function cleanupDetachedMap(){
    if(mounted.container?.isConnected)return;
    mounted.map?.remove?.();
    mounted={map:null,container:null,plantId:null,mode:null};
    if(!document.querySelector('.plant-location-imagery.is-expanded'))document.documentElement.classList.remove('plant-imagery-expanded');
  }

  async function renderMap(card,plant,position,mode){
    const serial=++renderSerial;
    const mapElement=card.querySelector('[data-plant-imagery-map]');
    const status=card.querySelector('[data-plant-imagery-status]');
    if(!mapElement||!status)return;
    setButtonState(card,mode);
    localStorage.setItem(MODE_KEY,mode);
    status.textContent=`${modeLabel(mode)} wird geladen …`;
    mapElement.replaceChildren();
    const loading=document.createElement('div');loading.className='plant-location-imagery-loading';loading.textContent='Standortansicht wird geladen …';mapElement.appendChild(loading);

    if(navigator.onLine===false){
      loading.className='plant-location-imagery-error';
      loading.innerHTML='<div><strong>Offline</strong><span>Satelliten- und Kartendaten benötigen eine Internetverbindung.</span></div>';
      status.textContent=`Koordinaten: ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`;
      return;
    }

    try{
      const [maplibregl,style]=await Promise.all([ensureMapLibre(),styleForMode(mode)]);
      if(serial!==renderSerial||!card.isConnected)return;
      mounted.map?.remove?.();
      mapElement.replaceChildren();
      const map=new maplibregl.Map({
        container:mapElement,
        style,
        center:[position.lng,position.lat],
        zoom:17.2,
        minZoom:2,
        maxZoom:20,
        attributionControl:true
      });
      mounted={map,container:mapElement,plantId:String(plant.id||''),mode};
      map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
      new maplibregl.Marker({element:markerElement(),anchor:'bottom'}).setLngLat([position.lng,position.lat]).addTo(map);
      map.once('load',()=>{
        if(serial!==renderSerial||!card.isConnected)return;
        status.textContent=`${modeLabel(mode)} · ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`;
        requestAnimationFrame(()=>map.resize());
      });
      map.on('error',event=>console.warn('Standortkarte: Karten-/Tile-Fehler',event?.error||event));
    }catch(error){
      console.warn('Standortansicht konnte nicht geladen werden',error);
      mapElement.replaceChildren();
      const failure=document.createElement('div');failure.className='plant-location-imagery-error';
      failure.innerHTML='<div><strong>Standortansicht nicht verfügbar</strong><span>Bitte Internetverbindung prüfen oder auf „Karte“ wechseln.</span></div>';
      mapElement.appendChild(failure);
      status.textContent='Kartenanbieter konnte nicht geladen werden.';
    }
  }

  function toggleExpanded(card){
    const expanded=!card.classList.contains('is-expanded');
    document.querySelectorAll('.plant-location-imagery.is-expanded').forEach(other=>other.classList.remove('is-expanded'));
    card.classList.toggle('is-expanded',expanded);
    document.documentElement.classList.toggle('plant-imagery-expanded',expanded);
    const button=card.querySelector('[data-plant-imagery-fullscreen]');
    if(button)button.textContent=expanded?'Vollbild schließen':'Vollbild';
    setTimeout(()=>mounted.map?.resize?.(),60);
  }

  function createEmptyCard(plant){
    const card=document.createElement('section');
    card.className='plant-location-imagery';
    card.dataset.plantImageryCard=String(plant.id||'');
    card.innerHTML=`<div class="plant-location-imagery-empty"><div><p class="eyebrow">Standort</p><h2>Satellitenbild</h2><p>Für die Standortansicht fehlen noch Geokoordinaten. Bitte Breitengrad und Längengrad in den Stammdaten ergänzen.</p></div><button type="button" class="button primary" data-plant-imagery-edit>Stammdaten bearbeiten</button></div>`;
    card.querySelector('[data-plant-imagery-edit]')?.addEventListener('click',()=>document.querySelector('#editPlant')?.click());
    return card;
  }

  function createMapCard(plant,position){
    const name=plant?.master?.name||'Kläranlage';
    const card=document.createElement('section');
    card.className='plant-location-imagery';
    card.dataset.plantImageryCard=String(plant.id||'');
    card.innerHTML=`
      <div class="plant-location-imagery-head">
        <div class="plant-location-imagery-title">
          <p class="eyebrow">Standort</p>
          <h2>Satellitenbild · ${escapeHtml(name)}</h2>
          <p>Interaktive Standortansicht auf Basis der hinterlegten Anlagenkoordinaten.</p>
        </div>
        <div class="plant-location-imagery-modes" role="group" aria-label="Kartendarstellung">
          <button type="button" data-plant-imagery-mode="satellite" aria-pressed="false">Satellit</button>
          <button type="button" data-plant-imagery-mode="map" aria-pressed="false">Karte</button>
          <button type="button" data-plant-imagery-mode="hybrid" aria-pressed="false">Hybrid</button>
        </div>
      </div>
      <div class="plant-location-imagery-map" data-plant-imagery-map role="region" aria-label="Standortkarte der Kläranlage"></div>
      <div class="plant-location-imagery-footer">
        <span class="plant-location-imagery-status" data-plant-imagery-status></span>
        <div class="plant-location-imagery-actions">
          <a class="button secondary" href="${osmUrl(position)}" target="_blank" rel="noopener">OpenStreetMap</a>
          <a class="button primary" href="${routeUrl(position)}" target="_blank" rel="noopener">Route starten</a>
          <button type="button" class="button secondary" data-plant-imagery-fullscreen>Vollbild</button>
        </div>
      </div>
      <p class="plant-location-imagery-source"><strong>Kartendaten:</strong> OpenStreetMap/OpenFreeMap · <strong>Luftbild:</strong> Esri World Imagery (externer Bilddienst). OpenStreetMap selbst stellt keine Satellitenbilder bereit.</p>`;

    card.querySelectorAll('[data-plant-imagery-mode]').forEach(button=>button.addEventListener('click',()=>renderMap(card,plant,position,button.dataset.plantImageryMode)));
    card.querySelector('[data-plant-imagery-fullscreen]')?.addEventListener('click',()=>toggleExpanded(card));
    const mode=preferredMode();
    renderMap(card,plant,position,mode);
    return card;
  }

  function escapeHtml(value){
    return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }

  function insertCard(page,card){
    const first=page.firstElementChild;
    if(first)first.insertAdjacentElement('afterend',card);
    else page.appendChild(card);
  }

  function reconcile(){
    cleanupDetachedMap();
    const page=document.querySelector('.plant-page[data-current-page="overview"]');
    if(!page)return;
    const plant=activePlant();
    if(!plant)return;
    const plantId=String(plant.id||'');
    const existing=page.querySelector(':scope > [data-plant-imagery-card]');
    if(existing?.dataset.plantImageryCard===plantId)return;
    existing?.remove();
    const position=plantPosition(plant);
    insertCard(page,position?createMapCard(plant,position):createEmptyCard(plant));
  }

  function queue(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;reconcile()});
  }

  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    const expanded=document.querySelector('.plant-location-imagery.is-expanded');
    if(expanded)toggleExpanded(expanded);
  });
  window.addEventListener('online',queue);
  window.addEventListener('offline',queue);
  window.addEventListener('pageshow',queue);
  window.addEventListener('storage',queue);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()});
  const root=document.querySelector('#mainContent')||document.body;
  new MutationObserver(queue).observe(root,{childList:true,subtree:true});
  queue();

  globalThis.AbwasserPlantLocationImagery=Object.freeze({build:BUILD,refresh:queue,provider:'OpenStreetMap/OpenFreeMap + Esri World Imagery'});
})();
