(() => {
  const BUILD='0.11.0-alpha.55-openmaps1';
  const PLANTS_KEY='abwasser-plants-v07';
  const ACTIVE_PLANT_KEY='abwasser-active-plant-v07';
  const OPENFREE_STYLE='https://tiles.openfreemap.org/styles/liberty';
  const MAPLIBRE_JS='https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.js';
  const MAPLIBRE_CSS='https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css';
  const LEGACY_GOOGLE_KEYS=[
    'vta-google-maps-api-key-v01','vta-google-maps-map-id-v01',
    'abwasser-google-maps-api-key-v01','abwasser-google-maps-map-id-v01'
  ];

  let mapLibrePromise=null;
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

  async function renderOverviewMap(){
    const status=document.querySelector('#plantsMapStatus');
    const mapElement=document.querySelector('#plantsMap');
    const mapButton=document.querySelector('#plantsMapViewButton');
    if(!status||!mapElement)return;
    if(navigator.onLine===false){
      showState(status,'Die Kartenansicht benötigt eine Internetverbindung. Die Anlagenliste steht weiterhin offline zur Verfügung.','Zur Listenansicht',()=>document.querySelector('#plantsListViewButton')?.click());return;
    }
    const plants=readPlants();
    const validPlants=plants.map(plant=>({plant,position:plantPosition(plant)})).filter(item=>item.position);
    if(!validPlants.length){
      showState(status,'Für die Kartenansicht sind noch keine Anlagen mit Geokoordinaten vorhanden. Koordinaten können in den Stammdaten der jeweiligen Anlage erfasst werden.','Zur Listenansicht',()=>document.querySelector('#plantsListViewButton')?.click());return;
    }
    status.textContent='OpenStreetMap-Kartenansicht wird geladen …';if(mapButton)mapButton.disabled=true;mapElement.replaceChildren();
    try{
      const maplibregl=await ensureMapLibre();
      overviewMap?.remove?.();
      const map=new maplibregl.Map({container:mapElement,style:OPENFREE_STYLE,center:[10.4515,51.1657],zoom:5.4,attributionControl:true});
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
        if(validPlants.length===1)map.easeTo({center:[validPlants[0].position.lng,validPlants[0].position.lat],zoom:13});
        else map.fitBounds(bounds,{padding:48,maxZoom:13});
        const withoutCoordinates=plants.length-validPlants.length;
        status.innerHTML=`<span>${validPlants.length} von ${plants.length} Anlagen auf der Karte${withoutCoordinates?` · ${withoutCoordinates} ohne Geokoordinaten`:''}</span><span class="open-source-map-note"><strong>Open-Source-Karte</strong> MapLibre · OpenFreeMap · OpenStreetMap</span>`;
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
