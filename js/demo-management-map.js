import {
  internationalTerritoryColorExpression,
  internationalTerritoryForFeature,
} from './sales-territory-config.js';

(() => {
  'use strict';

  const BUILD='0.11.0-alpha.83-carbon-nano1';
  const MODE_KEY='vta-workspace-mode-v01';
  const PLANTS_KEY='abwasser-plants-v07';
  const MAPLIBRE_JS='https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.js';
  const MAPLIBRE_CSS='https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css';
  const TERRITORY_DATA='./assets/data/demo-sales-regions.geojson';
  const SATELLITE_TILES='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const COUNTRY_META={
    ALL:{name:'Europa Pilot',detail:'6 Länder · 94 Verwaltungsregionen',people:36,pipeline:'4,82 M€',risks:11,coverage:82,bounds:[[-5.8,42],[24.5,55.3]]},
    DE:{name:'Deutschland',detail:'16 Bundesländer · 4 Vertriebsregionen',people:13,pipeline:'1,96 M€',risks:4,coverage:88,bounds:[[5.5,47.1],[15.7,55.2]]},
    AT:{name:'Österreich',detail:'9 Bundesländer',people:5,pipeline:'0,71 M€',risks:1,coverage:79,bounds:[[9.3,46.3],[17.2,49.2]]},
    CH:{name:'Schweiz',detail:'26 Kantone',people:4,pipeline:'0,63 M€',risks:1,coverage:84,bounds:[[5.8,45.7],[10.7,47.9]]},
    FR:{name:'Frankreich',detail:'13 europäische Regionen',people:6,pipeline:'0,82 M€',risks:2,coverage:72,bounds:[[-5.4,41.2],[9.8,51.4]]},
    CZ:{name:'Tschechien',detail:'14 Verwaltungsregionen',people:4,pipeline:'0,34 M€',risks:1,coverage:76,bounds:[[12,48.4],[19,51.2]]},
    PL:{name:'Polen',detail:'16 Woiwodschaften',people:4,pipeline:'0,36 M€',risks:2,coverage:68,bounds:[[13.8,48.8],[24.5,55.2]]},
  };

  let mapLibrePromise=null;
  let currentHost=null;
  let currentMap=null;
  let queued=false;

  const isDemo=()=>localStorage.getItem(MODE_KEY)==='demo';
  const readPlants=()=>{try{const value=JSON.parse(localStorage.getItem(PLANTS_KEY)||'[]');return Array.isArray(value)?value:[]}catch{return []}};
  const coordinate=value=>{const number=Number(String(value??'').replace(',','.'));return Number.isFinite(number)?number:null};
  const countryForPlant=plant=>({Deutschland:'DE',Österreich:'AT',Schweiz:'CH',Frankreich:'FR',Tschechien:'CZ',Polen:'PL'}[plant?.address?.country]||'DE');
  const satelliteStyle=()=>({version:8,sources:{satellite:{type:'raster',tiles:[SATELLITE_TILES],tileSize:256,maxzoom:19,attribution:'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community'}},layers:[{id:'satellite',type:'raster',source:'satellite'}]});

  function ensureMapLibre(){
    if(globalThis.maplibregl?.Map)return Promise.resolve(globalThis.maplibregl);
    if(mapLibrePromise)return mapLibrePromise;
    if(!document.querySelector('link[data-maplibre-css]')){
      const link=document.createElement('link');link.rel='stylesheet';link.href=MAPLIBRE_CSS;link.dataset.maplibreCss=BUILD;document.head.append(link);
    }
    mapLibrePromise=new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-maplibre-js]');
      if(existing){existing.addEventListener('load',()=>resolve(globalThis.maplibregl),{once:true});existing.addEventListener('error',()=>reject(new Error('MapLibre konnte nicht geladen werden.')),{once:true});return}
      const script=document.createElement('script');script.src=MAPLIBRE_JS;script.async=true;script.dataset.maplibreJs=BUILD;
      script.onload=()=>globalThis.maplibregl?.Map?resolve(globalThis.maplibregl):reject(new Error('MapLibre ist nicht verfügbar.'));
      script.onerror=()=>reject(new Error('MapLibre konnte nicht geladen werden.'));document.head.append(script);
    }).catch(error=>{mapLibrePromise=null;throw error});
    return mapLibrePromise;
  }

  function updateDetail(panel,country='ALL',feature=null){
    const meta=COUNTRY_META[country]||COUNTRY_META.ALL;
    const territory=feature?internationalTerritoryForFeature(feature.properties):null;
    const plants=readPlants().filter(plant=>country==='ALL'||countryForPlant(plant)===country);
    panel.querySelector('[data-demo-map-region-name]').textContent=feature?.properties?.name||meta.name;
    panel.querySelector('[data-demo-map-region-detail]').textContent=feature?meta.name:meta.detail;
    panel.querySelector('[data-demo-map-plant-count]').textContent=String(plants.length);
    panel.querySelector('[data-demo-map-people-count]').textContent=String(meta.people);
    panel.querySelector('[data-demo-map-pipeline]').textContent=meta.pipeline;
    panel.querySelector('[data-demo-map-risks]').textContent=String(meta.risks);
    panel.querySelector('[data-demo-map-coverage-label]').textContent=`${meta.coverage} %`;
    panel.querySelector('[data-demo-map-coverage]').style.width=`${meta.coverage}%`;
    panel.querySelector('[data-demo-map-owner]').textContent=territory?`Zuständigkeit: ${territory.ownerLabel}`:'Gebiet anklicken, um die Demo-Zuständigkeit anzuzeigen.';
  }

  function selectCountry(map,panel,country){
    panel.querySelectorAll('[data-demo-map-country]').forEach(button=>button.classList.toggle('active',button.dataset.demoMapCountry===country));
    const filter=country==='ALL'?null:['==',['get','countryCode'],country];
    for(const layer of ['demo-territories-fill','demo-territories-outline'])if(map.getLayer(layer))map.setFilter(layer,filter);
    panel.querySelectorAll('[data-demo-map-marker-country]').forEach(marker=>marker.hidden=country!=='ALL'&&marker.dataset.demoMapMarkerCountry!==country);
    map.fitBounds((COUNTRY_META[country]||COUNTRY_META.ALL).bounds,{padding:30,duration:550,maxZoom:7.5});
    updateDetail(panel,country);
  }

  async function mount(host){
    if(!host||!isDemo()||host===currentHost)return;
    if(currentMap){try{currentMap.remove()}catch{}}
    currentMap=null;currentHost=host;
    const panel=host.closest('.demo-mgmt-map-panel');
    try{
      const maplibregl=await ensureMapLibre();if(!host.isConnected||host!==currentHost)return;
      const map=new maplibregl.Map({container:host,style:satelliteStyle(),center:[10.5,50],zoom:4.2,attributionControl:true});
      currentMap=map;map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
      map.once('load',()=>{
        if(!host.isConnected)return;
        map.addSource('demo-territories',{type:'geojson',data:TERRITORY_DATA,attribution:'© BKG (2025); geoBoundaries CC BY 4.0'});
        const colors=internationalTerritoryColorExpression();
        map.addLayer({id:'demo-territories-fill',type:'fill',source:'demo-territories',paint:{'fill-color':colors,'fill-opacity':0.20}});
        map.addLayer({id:'demo-territories-outline',type:'line',source:'demo-territories',paint:{'line-color':colors,'line-width':['interpolate',['linear'],['zoom'],4,1.8,7,3],'line-opacity':0.95}});
        for(const plant of readPlants()){
          const lat=coordinate(plant?.address?.latitude),lng=coordinate(plant?.address?.longitude);if(lat===null||lng===null)continue;
          const marker=document.createElement('button');marker.type='button';marker.className='demo-mgmt-map-marker';marker.dataset.demoMapMarkerCountry=countryForPlant(plant);marker.setAttribute('aria-label',`${plant?.master?.name||'Demo-Anlage'} auf Karte`);marker.innerHTML='<span>KA</span>';
          const popup=document.createElement('div');popup.className='demo-mgmt-map-popup';
          const heading=document.createElement('strong');heading.textContent=plant?.master?.name||'Demo-Anlage';
          const detail=document.createElement('span');detail.textContent=[plant?.address?.city,plant?.address?.country].filter(Boolean).join(' · ');popup.append(heading,detail);
          new maplibregl.Marker({element:marker,anchor:'bottom'}).setLngLat([lng,lat]).setPopup(new maplibregl.Popup({offset:22}).setDOMContent(popup)).addTo(map);
        }
        map.on('mouseenter','demo-territories-fill',()=>{map.getCanvas().style.cursor='pointer'});
        map.on('mouseleave','demo-territories-fill',()=>{map.getCanvas().style.cursor=''});
        map.on('click','demo-territories-fill',event=>{const feature=event.features?.[0];if(feature)updateDetail(panel,feature.properties.countryCode,feature)});
        panel.querySelectorAll('[data-demo-map-country]').forEach(button=>button.addEventListener('click',()=>selectCountry(map,panel,button.dataset.demoMapCountry)));
        selectCountry(map,panel,'ALL');
      });
      map.on('error',event=>console.warn('Demo-Managementkarte',event?.error||event));
    }catch(error){console.error(error);host.innerHTML='<div class="demo-mgmt-map-error">Karte konnte nicht geladen werden. Internetverbindung prüfen.</div>'}
  }

  function sync(){
    if(!isDemo()){if(currentMap){try{currentMap.remove()}catch{}}currentMap=null;currentHost=null;return}
    const host=document.querySelector('#demoManagementTerritoryMap');
    if(currentHost&&!currentHost.isConnected){if(currentMap){try{currentMap.remove()}catch{}}currentMap=null;currentHost=null}
    if(host)mount(host);
  }
  function queue(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync()})}

  new MutationObserver(queue).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('pageshow',queue);window.addEventListener('storage',queue);queue();
})();
