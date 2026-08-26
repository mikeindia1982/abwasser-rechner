import {
  DEMO_INTERNATIONAL_TERRITORIES,
  SALES_TERRITORIES,
  internationalTerritoryColorExpression,
  internationalTerritoryForFeature,
  territoryColorExpression,
  territoryForStateCode,
} from './sales-territory-config.js';

(() => {
  const BUILD='0.11.0-alpha.82-demo-international1';
  const MODE_KEY='vta-workspace-mode-v01';
  const PLANTS_KEY='abwasser-plants-v07';
  const ACTIVE_PLANT_KEY='abwasser-active-plant-v07';
  const OPENFREE_STYLE='https://tiles.openfreemap.org/styles/liberty';
  const SATELLITE_TILES='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const SATELLITE_ATTRIBUTION='Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community';
  const TERRITORY_DATA='./assets/data/bundeslaender-vg250.geojson';
  const DEMO_TERRITORY_DATA='./assets/data/demo-sales-regions.geojson';
  const OVERVIEW_MODE_KEY='abwasser-overview-map-mode-v01';
  const TERRITORY_VISIBILITY_KEY='abwasser-sales-territories-visible-v01';
  const MAPLIBRE_JS='https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.js';
  const MAPLIBRE_CSS='https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css';
  const LEGACY_GOOGLE_KEYS=[
    'vta-google-maps-api-key-v01','vta-google-maps-map-id-v01',
    'abwasser-google-maps-api-key-v01','abwasser-google-maps-map-id-v01'
  ];

  let mapLibrePromise=null;
  let hybridStylePromise=null;
  let overviewMap=null;
  let scheduled=false;
  const embeddedMaps=new WeakMap();

  const parseCoordinate=value=>{
    const normalized=String(value??'').trim().replace(',','.');
    if(!normalized)return null;
    const number=Number(normalized);
    return Number.isFinite(number)?number:null;
  };
  const plantPosition=plant=>{
    const lat=parseCoordinate(plant?.address?.latitude);
    const lng=parseCoordinate(plant?.address?.longitude);
    if(lat===null||lng===null||lat < -90||lat > 90||lng < -180||lng > 180)return null;
    return {lat,lng};
  };
  const readPlants=()=>{
    try{
      const value=JSON.parse(localStorage.getItem(PLANTS_KEY)||'[]');
      return Array.isArray(value)?value:[];
    }catch{return []}
  };
  const activePlant=()=>{
    const id=localStorage.getItem(ACTIVE_PLANT_KEY)||'';
    return readPlants().find(plant=>String(plant?.id||'')===String(id))||null;
  };
  const openTasks=plant=>(Array.isArray(plant?.actions)?plant.actions:[]).filter(action=>action?.status!=='done').length;
  const googleNavigationUrl=position=>`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${position.lat},${position.lng}`)}`;
  const osmUrl=(position,zoom=16)=>`https://www.openstreetmap.org/?mlat=${encodeURIComponent(position.lat)}&mlon=${encodeURIComponent(position.lng)}#map=${zoom}/${encodeURIComponent(position.lat)}/${encodeURIComponent(position.lng)}`;

  const satelliteSource=()=>({type:'raster',tiles:[SATELLITE_TILES],tileSize:256,maxzoom:19,attribution:SATELLITE_ATTRIBUTION});
  const satelliteStyle=()=>({version:8,sources:{'overview-satellite':satelliteSource()},layers:[{id:'overview-satellite-base',type:'raster',source:'overview-satellite',minzoom:0,maxzoom:22}]});
  async function hybridStyle(){
    if(hybridStylePromise)return hybridStylePromise;
    hybridStylePromise=(async()=>{
      const response=await fetch(OPENFREE_STYLE,{cache:'force-cache'});
      if(!response.ok)throw new Error(`OpenFreeMap-Stil konnte nicht geladen werden (${response.status}).`);
      const base=await response.json();
      const hiddenTypes=new Set(['background','fill','fill-extrusion','hillshade','raster']);
      const referenceLayers=(Array.isArray(base.layers)?base.layers:[]).filter(layer=>!hiddenTypes.has(layer.type));
      return {...base,sources:{'overview-satellite':satelliteSource(),...(base.sources||{})},layers:[{id:'overview-satellite-base',type:'raster',source:'overview-satellite',minzoom:0,maxzoom:22},...referenceLayers]};
    })().catch(error=>{hybridStylePromise=null;throw error});
    return hybridStylePromise;
  }
  const overviewMode=()=>['map','satellite','hybrid'].includes(localStorage.getItem(OVERVIEW_MODE_KEY))?localStorage.getItem(OVERVIEW_MODE_KEY):'satellite';
  const territoriesVisible=()=>localStorage.getItem(TERRITORY_VISIBILITY_KEY)!=='false';
  const styleForOverview=mode=>mode==='map'?OPENFREE_STYLE:mode==='hybrid'?hybridStyle():satelliteStyle();
  const modeLabel=mode=>mode==='map'?'Karte':mode==='hybrid'?'Hybrid':'Satellit';
  const isDemoWorkspace=()=>localStorage.getItem(MODE_KEY)==='demo';
  const activeTerritories=()=>isDemoWorkspace()?DEMO_INTERNATIONAL_TERRITORIES:SALES_TERRITORIES;

  function installStyles(){
    if(!document.querySelector('link[data-maplibre-css]')){
      const link=document.createElement('link');
      link.rel='stylesheet';link.href=MAPLIBRE_CSS;link.dataset.maplibreCss=BUILD;
      document.head.appendChild(link);
    }
    if(document.querySelector('style[data-open-map-provider]'))return;
    const style=document.createElement('style');
    style.dataset.openMapProvider=BUILD;
    style.textContent=`
      .open-map-marker{width:34px;height:34px;border:3px solid #fff;border-radius:50% 50% 50% 10%;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,.28);background:#0f4c5c;color:#fff;display:grid;place-items:center;cursor:pointer;font:700 9px/1 system-ui,sans-serif}
      .open-map-marker>span{transform:rotate(45deg)}
      .open-map-marker.active{width:42px;height:42px;box-shadow:0 3px 12px rgba(0,0,0,.38)}
      .open-map-popup{min-width:220px;max-width:300px;color:#172126;font:14px/1.35 system-ui,sans-serif}
      .open-map-popup h3{margin:0 0 7px;font-size:16px}.open-map-popup p{margin:0 0 10px;color:#4b5960}
      .open-map-popup-actions{display:flex;gap:7px;flex-wrap:wrap}.open-map-popup-actions button,.open-map-popup-actions a{font:inherit;text-decoration:none}
      .open-source-map-note{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px;color:#5a676d;font-size:.85rem}.open-source-map-note strong{color:#243238}
      .open-source-embedded-map{min-height:260px;width:100%;border:0;overflow:hidden}.location-preview-map.open-source-embedded-map{min-height:240px}
      .open-map-settings-badge{display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border-radius:999px;background:rgba(15,76,92,.09);font-weight:700}
      .sales-territory-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px 12px;border:1px solid var(--line,#d4e4ea);border-radius:14px;background:var(--surface,#fff)}
      .sales-territory-modes{display:inline-flex;gap:3px;padding:3px;border-radius:999px;background:var(--surface-soft,#eef5f7)}
      .sales-territory-modes button{min-height:34px;padding:6px 11px;border:0;border-radius:999px;background:transparent;color:var(--muted,#617784);font:700 .8rem/1 system-ui,sans-serif;cursor:pointer}
      .sales-territory-modes button.active{background:var(--primary,#006f9f);color:#fff}
      .sales-territory-toggle{display:flex;align-items:center;gap:8px;color:var(--text,#172a34);font-size:.84rem;font-weight:750;cursor:pointer}.sales-territory-toggle input{width:18px;height:18px;accent-color:var(--primary,#006f9f)}
      .sales-territory-legend{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:2px 2px 0;color:var(--muted,#617784);font-size:.78rem}
      .sales-territory-legend[hidden]{display:none}.sales-territory-legend strong{color:var(--text,#172a34)}
      .sales-territory-legend-item{display:inline-flex;align-items:center;gap:5px;padding:4px 7px;border-radius:999px;background:var(--surface,#fff);border:1px solid var(--line,#d4e4ea)}
      .sales-territory-legend-swatch{width:11px;height:11px;border-radius:3px;background:var(--territory-color)}
      .sales-territory-popup{min-width:190px;color:#172126;font:14px/1.4 system-ui,sans-serif}.sales-territory-popup h3{margin:0 0 6px;font-size:16px}.sales-territory-popup p{margin:0}.sales-territory-popup strong{color:#0f4c5c}
      @media(max-width:640px){.sales-territory-toolbar{align-items:stretch;flex-direction:column}.sales-territory-modes{display:grid;grid-template-columns:repeat(3,1fr)}.sales-territory-modes button{padding:8px 5px}.sales-territory-toggle{min-height:38px}}
    `;
    document.head.appendChild(style);
  }

  function ensureMapLibre(){
    installStyles();
    if(globalThis.maplibregl?.Map)return Promise.resolve(globalThis.maplibregl);
    if(mapLibrePromise)return mapLibrePromise;
    mapLibrePromise=new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-maplibre-js]');
      if(existing){
        existing.addEventListener('load',()=>resolve(globalThis.maplibregl),{once:true});
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

  function showState(status,message,buttonLabel,action){
    status.replaceChildren();
    const text=document.createElement('span');text.textContent=message;status.append(text);
    if(buttonLabel){
      const button=document.createElement('button');button.type='button';button.className='button secondary';button.textContent=buttonLabel;
      button.addEventListener('click',action);status.append(button);
    }
  }

  function openPlantFromOverview(plantId){
    const button=[...document.querySelectorAll('[data-open-plant]')].find(node=>String(node.dataset.openPlant||'')===String(plantId));
    if(button){button.click();return}
    localStorage.setItem(ACTIVE_PLANT_KEY,String(plantId));
    const select=document.querySelector('#activePlantSelect');
    if(select&&[...select.options].some(option=>option.value===String(plantId))){
      select.value=String(plantId);select.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }

  function popupContent(plant,position){
    const root=document.createElement('div');root.className='open-map-popup';
    const heading=document.createElement('h3');heading.textContent=plant?.master?.name||'Unbenannte Anlage';root.append(heading);
    const details=[
      ['Ort',[plant?.address?.postalCode,plant?.address?.city].filter(Boolean).join(' ')],
      ['Betreiber',plant?.operator?.name],['Offene Aufgaben',String(openTasks(plant))]
    ].filter(([,value])=>value);
    if(details.length){
      const paragraph=document.createElement('p');paragraph.textContent=details.map(([label,value])=>`${label}: ${value}`).join(' · ');root.append(paragraph);
    }
    const actions=document.createElement('div');actions.className='open-map-popup-actions';
    const open=document.createElement('button');open.type='button';open.className='button primary';open.textContent='Anlage öffnen';open.addEventListener('click',()=>openPlantFromOverview(plant.id));
    const osm=document.createElement('a');osm.className='button secondary';osm.textContent='OpenStreetMap';osm.href=osmUrl(position);osm.target='_blank';osm.rel='noopener';
    const navigation=document.createElement('a');navigation.className='button secondary';navigation.textContent='Navigation';navigation.href=googleNavigationUrl(position);navigation.target='_blank';navigation.rel='noopener';
    actions.append(open,osm,navigation);root.append(actions);
    return root;
  }

  function territoryLegendMarkup(){
    return `<strong>Zuständigkeiten:</strong>${activeTerritories().map(territory=>`<span class="sales-territory-legend-item"><span class="sales-territory-legend-swatch" style="--territory-color:${territory.color}"></span>${territory.label}</span>`).join('')}`;
  }

  function ensureOverviewControls(){
    const panel=document.querySelector('#plantsMapPanel');
    const status=document.querySelector('#plantsMapStatus');
    if(!panel||!status)return;
    let toolbar=panel.querySelector('[data-sales-territory-toolbar]');
    if(!toolbar){
      toolbar=document.createElement('div');toolbar.className='sales-territory-toolbar';toolbar.dataset.salesTerritoryToolbar=BUILD;
      toolbar.innerHTML=`<div class="sales-territory-modes" role="group" aria-label="Kartendarstellung"><button type="button" data-overview-map-mode="map">Karte</button><button type="button" data-overview-map-mode="satellite">Satellit</button><button type="button" data-overview-map-mode="hybrid">Hybrid</button></div><label class="sales-territory-toggle"><input type="checkbox" data-sales-territories-visible> Vertriebsgebiete anzeigen</label>`;
      const legend=document.createElement('div');legend.className='sales-territory-legend';legend.dataset.salesTerritoryLegend='';legend.innerHTML=territoryLegendMarkup();
      status.before(toolbar);status.after(legend);
      toolbar.querySelectorAll('[data-overview-map-mode]').forEach(button=>button.addEventListener('click',()=>{
        localStorage.setItem(OVERVIEW_MODE_KEY,button.dataset.overviewMapMode);renderOverviewMap();
      }));
      toolbar.querySelector('[data-sales-territories-visible]')?.addEventListener('change',event=>{
        localStorage.setItem(TERRITORY_VISIBILITY_KEY,String(event.target.checked));renderOverviewMap();
      });
    }
    const mode=overviewMode();
    toolbar.querySelectorAll('[data-overview-map-mode]').forEach(button=>button.classList.toggle('active',button.dataset.overviewMapMode===mode));
    const checkbox=toolbar.querySelector('[data-sales-territories-visible]');if(checkbox)checkbox.checked=territoriesVisible();
    const legend=panel.querySelector('[data-sales-territory-legend]');if(legend)legend.hidden=!territoriesVisible();
  }

  function territoryPopup(feature){
    const properties=feature?.properties||{};
    const territory=isDemoWorkspace()?internationalTerritoryForFeature(properties):territoryForStateCode(properties.ags);
    const root=document.createElement('div');root.className='sales-territory-popup';
    const heading=document.createElement('h3');heading.textContent=properties.name||properties.gen||'Region';root.append(heading);
    const text=document.createElement('p');text.append('Zuständigkeit: ');
    const owner=document.createElement('strong');owner.textContent=territory?.ownerLabel||'Nicht zugeordnet';text.append(owner);root.append(text);
    return root;
  }

  function addTerritoryLayers(map,maplibregl){
    if(!territoriesVisible())return;
    const demo=isDemoWorkspace();
    map.addSource('sales-territories',{type:'geojson',data:demo?DEMO_TERRITORY_DATA:TERRITORY_DATA,attribution:demo?'© BKG (2025); geoBoundaries CC BY 4.0':'© BKG (2025) dl-de/by-2-0'});
    const color=demo?internationalTerritoryColorExpression():territoryColorExpression();
    map.addLayer({id:'sales-territories-fill',type:'fill',source:'sales-territories',paint:{'fill-color':color,'fill-opacity':0.16}});
    map.addLayer({id:'sales-territories-outline',type:'line',source:'sales-territories',paint:{'line-color':color,'line-width':['interpolate',['linear'],['zoom'],4,2,8,3.5],'line-opacity':0.95}});
    map.on('mouseenter','sales-territories-fill',()=>{map.getCanvas().style.cursor='pointer'});
    map.on('mouseleave','sales-territories-fill',()=>{map.getCanvas().style.cursor=''});
    map.on('click','sales-territories-fill',event=>{
      const feature=event.features?.[0];if(!feature)return;
      new maplibregl.Popup({maxWidth:'280px'}).setLngLat(event.lngLat).setDOMContent(territoryPopup(feature)).addTo(map);
    });
  }

  async function renderOverviewMap(){
    const status=document.querySelector('#plantsMapStatus');
    const mapElement=document.querySelector('#plantsMap');
    const mapButton=document.querySelector('#plantsMapViewButton');
    if(!status||!mapElement)return;
    if(navigator.onLine===false){
      showState(status,'Die Kartenansicht benötigt eine Internetverbindung. Die Anlagenliste steht weiterhin offline zur Verfügung.','Zur Listenansicht',()=>document.querySelector('#plantsListViewButton')?.click());return;
    }
    ensureOverviewControls();
    const mode=overviewMode();
    const plants=readPlants();
    const validPlants=plants.map(plant=>({plant,position:plantPosition(plant)})).filter(item=>item.position);
    status.textContent=`${modeLabel(mode)} mit Anlagen und Vertriebsgebieten wird geladen …`;if(mapButton)mapButton.disabled=true;mapElement.replaceChildren();
    try{
      const [maplibregl,style]=await Promise.all([ensureMapLibre(),styleForOverview(mode)]);
      overviewMap?.remove?.();
      const map=new maplibregl.Map({container:mapElement,style,center:[10.4515,51.1657],zoom:5.4,attributionControl:true});
      overviewMap=map;map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
      const activeId=localStorage.getItem(ACTIVE_PLANT_KEY)||'';
      const bounds=new maplibregl.LngLatBounds();
      validPlants.forEach(({plant,position})=>{
        const markerElement=document.createElement('button');markerElement.type='button';
        markerElement.className=`open-map-marker${String(plant.id)===String(activeId)?' active':''}`;
        markerElement.title=plant?.master?.name||'Kläranlage';markerElement.setAttribute('aria-label',`${markerElement.title} auf Karte öffnen`);markerElement.innerHTML='<span>KA</span>';
        const popup=new maplibregl.Popup({offset:24,maxWidth:'320px'}).setDOMContent(popupContent(plant,position));
        new maplibregl.Marker({element:markerElement,anchor:'bottom'}).setLngLat([position.lng,position.lat]).setPopup(popup).addTo(map);
        bounds.extend([position.lng,position.lat]);
      });
      map.once('load',()=>{
        addTerritoryLayers(map,maplibregl);
        if(validPlants.length===1)map.easeTo({center:[validPlants[0].position.lng,validPlants[0].position.lat],zoom:13});
        else if(validPlants.length>1)map.fitBounds(bounds,{padding:48,maxZoom:13});
        else if(isDemoWorkspace())map.fitBounds([[-5.5,42.0],[24.5,55.2]],{padding:28});
        else map.fitBounds([[5.5,47.1],[15.7,55.2]],{padding:28});
        const withoutCoordinates=plants.length-validPlants.length;
        const territorySummary=isDemoWorkspace()?'94 Regionen in 6 Ländern':'16 Bundesländer';
        const sourceSummary=isDemoWorkspace()?'© BKG (2025) · geoBoundaries CC BY 4.0':'© BKG (2025) dl-de/by-2-0';
        status.innerHTML=`<span>${validPlants.length} von ${plants.length} Anlagen · ${modeLabel(mode)}${territoriesVisible()?` · ${territorySummary} nach Zuständigkeit`:''}${withoutCoordinates?` · ${withoutCoordinates} ohne Geokoordinaten`:''}</span><span class="open-source-map-note"><strong>Grenzen:</strong> ${sourceSummary} · <strong>Karte:</strong> MapLibre/OpenFreeMap · <strong>Luftbild:</strong> Esri</span>`;
      });
      map.on('error',event=>console.warn('OpenStreetMap-Kartenfehler',event?.error||event));
    }catch(error){
      console.error(error);showState(status,'Die OpenStreetMap-Karte konnte nicht geladen werden. Bitte Internetverbindung prüfen.','Erneut versuchen',renderOverviewMap);
    }finally{if(mapButton)mapButton.disabled=false}
  }

  function activateOverview(){
    document.querySelector('.plant-grid')?.classList.add('hidden');document.querySelector('#plantsMapPanel')?.classList.remove('hidden');
    document.querySelector('#plantsMapViewButton')?.classList.add('active');document.querySelector('#plantsListViewButton')?.classList.remove('active');renderOverviewMap();
  }

  function settingsUpgrade(){
    const keyInput=document.querySelector('#googleMapsApiKey');
    if(!keyInput)return;
    const section=keyInput.closest('.form-section');
    if(!section||section.dataset.openMapSettings===BUILD)return;
    const hasLegacy=LEGACY_GOOGLE_KEYS.some(key=>Boolean(localStorage.getItem(key)));
    section.dataset.openMapSettings=BUILD;
    section.innerHTML=`<h2>Karten</h2><div class="info-box"><span class="open-map-settings-badge">Open-Source-Karten aktiv</span><p>Die Anlagenkarte verwendet MapLibre mit OpenFreeMap und OpenStreetMap-Daten. Es ist kein API-Key, keine Map-ID und kein Google-Billing erforderlich.</p></div><p class="form-note">Google Maps wird nur noch über einen normalen externen Link für die Navigation geöffnet. Dafür wird kein API-Key verwendet.</p>${hasLegacy?'<div class="form-actions"><button type="button" class="button secondary" id="removeLegacyGoogleMapsConfig">Alte Google-Maps-Konfiguration entfernen</button></div>':''}`;
    document.querySelector('#removeLegacyGoogleMapsConfig')?.addEventListener('click',()=>{
      LEGACY_GOOGLE_KEYS.forEach(key=>localStorage.removeItem(key));section.querySelector('.form-actions')?.remove();
    });
  }

  function miniMapPosition(kind){
    if(kind==='form'){
      const lat=parseCoordinate(document.querySelector('[name="address.latitude"]')?.value);
      const lng=parseCoordinate(document.querySelector('[name="address.longitude"]')?.value);
      return lat!==null&&lng!==null?{lat,lng}:null;
    }
    return plantPosition(activePlant());
  }

  async function mountMiniMap(container,position){
    if(!container||!position||embeddedMaps.has(container))return;
    try{
      const maplibregl=await ensureMapLibre();if(!container.isConnected)return;
      const map=new maplibregl.Map({container,style:OPENFREE_STYLE,center:[position.lng,position.lat],zoom:14,interactive:true,attributionControl:true});
      embeddedMaps.set(container,map);map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');new maplibregl.Marker().setLngLat([position.lng,position.lat]).addTo(map);
    }catch(error){console.warn('Eingebettete OpenStreetMap-Karte konnte nicht geladen werden',error);container.textContent='OpenStreetMap-Karte konnte nicht geladen werden.'}
  }

  function replaceEmbeddedMap(iframe,position){
    if(!iframe?.isConnected||!position)return;
    const container=document.createElement('div');container.className=`${iframe.className} open-source-embedded-map`;container.setAttribute('role','region');container.setAttribute('aria-label','OpenStreetMap-Standortkarte');
    iframe.replaceWith(container);mountMiniMap(container,position);
  }

  function upgradeEmbeddedMaps(){
    document.querySelectorAll('iframe.map-frame').forEach(iframe=>replaceEmbeddedMap(iframe,miniMapPosition('active')));
    document.querySelectorAll('iframe.location-preview-map').forEach(iframe=>replaceEmbeddedMap(iframe,miniMapPosition('form')));
  }

  function upgradeLocationLinks(){
    const position=plantPosition(activePlant());
    if(position){
      document.querySelectorAll('.map-actions').forEach(actions=>{
        [...actions.querySelectorAll('a')].forEach(link=>{
          const label=link.textContent.trim();
          if(label==='Standort in Google Maps'){link.textContent='Standort in OpenStreetMap';link.href=osmUrl(position)}
          else if(label==='Street View prüfen')link.remove();
        });
      });
    }
    const formPosition=miniMapPosition('form');
    if(formPosition){
      document.querySelectorAll('.location-preview-head a').forEach(link=>{link.textContent='In OpenStreetMap öffnen';link.href=osmUrl(formPosition)});
    }
  }

  function reconcile(){settingsUpgrade();upgradeEmbeddedMaps();upgradeLocationLinks()}
  function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;reconcile()})}

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('#plantsMapViewButton');if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();activateOverview();
  },true);

  const root=document.querySelector('#mainContent')||document.body;
  new MutationObserver(queue).observe(root,{childList:true,subtree:true});
  window.addEventListener('pageshow',queue);window.addEventListener('storage',queue);document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()});
  installStyles();queue();

  globalThis.AbwasserOpenMapProvider=Object.freeze({build:BUILD,provider:'MapLibre + OpenFreeMap + OpenStreetMap',style:OPENFREE_STYLE,refresh:queue,renderOverview:renderOverviewMap});
})();
