(()=>{
  'use strict';

  const runtime=globalThis.VTANativeRuntime;
  if(!runtime?.enabled)return;

  const BUILD='0.11.0-alpha.58-native-integration1';
  const CAP=globalThis.Capacitor;
  const PLANTS_KEY='abwasser-plants-v07';
  const ACTIVE_PLANT_KEY='abwasser-active-plant-v07';
  const PLANT_PAGE_KEY='abwasser-plant-page-v091a';
  const CALENDAR_LINKS_KEY='vta-native-calendar-links-v1';
  const NOTIFICATION_IDS_KEY='vta-native-notification-ids-v1';
  const PHOTO_ARCHIVE_KEY='vta-native-photo-archive-v1';
  const MAX_VISIT_PHOTOS=6;
  const PHOTO_MAX_EDGE=1600;
  const PHOTO_QUALITY=0.78;
  const PHOTO_MAX_BYTES=1450000;

  const registerPlugin=name=>{
    try{
      if(CAP?.registerPlugin)return CAP.registerPlugin(name);
      return CAP?.Plugins?.[name]||null;
    }catch(error){
      console.warn(`[VTA native] ${name} plugin unavailable`,error);
      return null;
    }
  };

  const NativeIntegration=registerPlugin('VTANativeIntegration');
  const Camera=registerPlugin('Camera');
  const Filesystem=registerPlugin('Filesystem');
  const LocalNotifications=registerPlugin('LocalNotifications');
  const Share=registerPlugin('Share');

  let decorateQueued=false;
  let reconcileTimer=null;
  let photoBusy=false;

  function readJson(key,fallback){
    try{return JSON.parse(localStorage.getItem(key)||'')??fallback}catch{return fallback}
  }
  function writeJson(key,value){
    try{localStorage.setItem(key,JSON.stringify(value));return true}catch(error){console.warn(`[VTA native] cannot write ${key}`,error);return false}
  }
  function plants(){
    const value=readJson(PLANTS_KEY,[]);
    return Array.isArray(value)?value:[];
  }
  function activePlantId(){return localStorage.getItem(ACTIVE_PLANT_KEY)||''}
  function plantById(id){return plants().find(plant=>plant?.id===id)||null}
  function visitById(plant,visitId){return (plant?.visits||[]).find(visit=>visit?.id===visitId)||null}
  function activePlant(){return plantById(activePlantId())}
  function calendarLinks(){return readJson(CALENDAR_LINKS_KEY,{})||{}}
  function calendarKey(plantId,visitId){return `${plantId}:${visitId}`}
  function photoArchive(){return readJson(PHOTO_ARCHIVE_KEY,{})||{}}
  function safeText(value=''){return String(value??'').trim()}
  function localDate(value){
    const date=value?new Date(value):null;
    return date&&!Number.isNaN(date.getTime())?date:null;
  }
  function addressForPlant(plant){
    return [plant?.address?.street,plant?.address?.postalCode,plant?.address?.city,plant?.address?.country].filter(Boolean).join(', ');
  }
  function locationQuery(plant){
    const lat=safeText(plant?.address?.latitude);
    const lon=safeText(plant?.address?.longitude);
    if(lat&&lon)return `${lat},${lon}`;
    return addressForPlant(plant);
  }
  function nextFrame(){return new Promise(resolve=>requestAnimationFrame(resolve))}
  function toast(message,tone='info'){
    let host=document.querySelector('#vtaNativeToast');
    if(!host){
      host=document.createElement('div');
      host.id='vtaNativeToast';
      host.className='vta-native-toast';
      host.setAttribute('role','status');
      host.setAttribute('aria-live','polite');
      document.body.appendChild(host);
    }
    host.className=`vta-native-toast ${tone}`;
    host.textContent=message;
    host.classList.add('show');
    clearTimeout(host._hideTimer);
    host._hideTimer=setTimeout(()=>host.classList.remove('show'),3200);
  }

  function showActionSheet({title,subtitle='',actions=[]}){
    document.querySelector('#vtaNativeActionSheet')?.remove();
    const backdrop=document.createElement('div');
    backdrop.id='vtaNativeActionSheet';
    backdrop.className='vta-native-action-sheet-backdrop';
    backdrop.innerHTML=`<section class="vta-native-action-sheet" role="dialog" aria-modal="true">
      <div class="vta-native-action-sheet-copy"><strong>${escapeHtml(title)}</strong>${subtitle?`<span>${escapeHtml(subtitle)}</span>`:''}</div>
      <div class="vta-native-action-sheet-actions"></div>
      <button type="button" class="vta-native-action-cancel">Abbrechen</button>
    </section>`;
    document.body.appendChild(backdrop);
    const close=()=>backdrop.remove();
    backdrop.addEventListener('click',event=>{if(event.target===backdrop)close()});
    backdrop.querySelector('.vta-native-action-cancel').onclick=close;
    const host=backdrop.querySelector('.vta-native-action-sheet-actions');
    for(const action of actions){
      const button=document.createElement('button');
      button.type='button';
      button.className=action.destructive?'destructive':'';
      button.innerHTML=`<strong>${escapeHtml(action.label)}</strong>${action.detail?`<span>${escapeHtml(action.detail)}</span>`:''}`;
      button.onclick=async()=>{close();await action.run?.()};
      host.appendChild(button);
    }
  }
  function escapeHtml(value=''){
    return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function patchLocalStorage(){
    if(Storage.prototype.__vtaNativePatched)return;
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){
      original.call(this,key,value);
      if(this===localStorage&&[PLANTS_KEY,ACTIVE_PLANT_KEY,PLANT_PAGE_KEY].includes(String(key))){
        window.dispatchEvent(new CustomEvent('vta:native-data-changed',{detail:{key:String(key)}}));
      }
    };
    Object.defineProperty(Storage.prototype,'__vtaNativePatched',{value:true,configurable:true});
  }

  function calendarPermissionLabel(status){
    return ({full:'Vollzugriff','write-only':'Nur schreiben',authorized:'Erlaubt',denied:'Abgelehnt',restricted:'Eingeschränkt','not-determined':'Noch nicht gefragt'})[status]||status||'Unbekannt';
  }
  async function calendarPermissionStatus(){
    if(!NativeIntegration?.calendarPermissionStatus)return {status:'unavailable'};
    try{return await NativeIntegration.calendarPermissionStatus()}catch(error){return {status:'error',message:error?.message||String(error)}}
  }
  async function ensureCalendarAccess(){
    if(!NativeIntegration?.requestCalendarAccess)throw new Error('Die native Kalenderintegration ist nicht verfügbar.');
    const current=await calendarPermissionStatus();
    if(['full','authorized'].includes(current.status))return current;
    const result=await NativeIntegration.requestCalendarAccess();
    if(!['full','authorized'].includes(result.status))throw new Error('Kalenderzugriff wurde nicht freigegeben.');
    return result;
  }
  function calendarPayload(plant,visit,eventIdentifier=''){
    const start=localDate(visit?.start);
    const end=localDate(visit?.end);
    if(!start||!end||end<=start)throw new Error('Der Termin benötigt eine gültige Start- und Endzeit.');
    const contact=safeText(visit?.contact);
    const purpose=safeText(visit?.purpose||visit?.objective);
    const notes=[purpose,contact?`Ansprechpartner: ${contact}`:'',safeText(visit?.notes),safeText(visit?.summary)].filter(Boolean).join('\n\n');
    return {
      eventIdentifier,
      title:safeText(visit?.title)||`Besuch ${safeText(plant?.master?.name)||'Kläranlage'}`,
      start:start.toISOString(),
      end:end.toISOString(),
      location:addressForPlant(plant),
      notes,
      alarms:[30]
    };
  }
  async function syncCalendarEvent(plantId,visitId,{silent=false}={}){
    const plant=plantById(plantId);
    const visit=visitById(plant,visitId);
    if(!plant||!visit)throw new Error('Termin konnte in der Anlagenakte nicht gefunden werden.');
    await ensureCalendarAccess();
    const links=calendarLinks();
    const key=calendarKey(plantId,visitId);
    const linked=links[key]||{};
    const result=await NativeIntegration.upsertCalendarEvent(calendarPayload(plant,visit,linked.eventIdentifier||''));
    links[key]={eventIdentifier:result.eventIdentifier,updatedAt:new Date().toISOString()};
    writeJson(CALENDAR_LINKS_KEY,links);
    if(!silent)toast(linked.eventIdentifier?'iOS-Kalender wurde aktualisiert.':'Termin wurde im iOS-Kalender angelegt.','success');
    queueDecorate();
    return result;
  }
  async function removeCalendarEvent(plantId,visitId,{silent=false}={}){
    const links=calendarLinks();
    const key=calendarKey(plantId,visitId);
    const linked=links[key];
    if(!linked?.eventIdentifier)return;
    await ensureCalendarAccess();
    await NativeIntegration.deleteCalendarEvent({eventIdentifier:linked.eventIdentifier});
    delete links[key];
    writeJson(CALENDAR_LINKS_KEY,links);
    if(!silent)toast('Termin wurde aus dem iOS-Kalender entfernt.','success');
    queueDecorate();
  }
  async function reconcileCalendarLinks(){
    if(!NativeIntegration?.upsertCalendarEvent)return;
    const links=calendarLinks();
    const entries=Object.entries(links);
    if(!entries.length)return;
    const permission=await calendarPermissionStatus();
    if(!['full','authorized'].includes(permission.status))return;
    let changed=false;
    for(const [key,link] of entries){
      const separator=key.indexOf(':');
      if(separator<0)continue;
      const plantId=key.slice(0,separator),visitId=key.slice(separator+1);
      const plant=plantById(plantId),visit=visitById(plant,visitId);
      try{
        if(!plant||!visit){
          if(link?.eventIdentifier)await NativeIntegration.deleteCalendarEvent({eventIdentifier:link.eventIdentifier});
          delete links[key];changed=true;continue;
        }
        const result=await NativeIntegration.upsertCalendarEvent(calendarPayload(plant,visit,link?.eventIdentifier||''));
        if(result?.eventIdentifier&&result.eventIdentifier!==link?.eventIdentifier){
          links[key]={eventIdentifier:result.eventIdentifier,updatedAt:new Date().toISOString()};changed=true;
        }
      }catch(error){console.warn('[VTA native] calendar reconcile failed',key,error)}
    }
    if(changed)writeJson(CALENDAR_LINKS_KEY,links);
  }

  function stableIntId(value,prefix=1){
    let hash=2166136261;
    const text=`${prefix}:${value}`;
    for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619)}
    return (Math.abs(hash>>>0)%2000000000)+1;
  }
  async function notificationPermission({request=false}={}){
    if(!LocalNotifications)return {display:'unavailable'};
    try{
      let status=await LocalNotifications.checkPermissions();
      if(request&&status.display!=='granted')status=await LocalNotifications.requestPermissions();
      return status;
    }catch(error){return {display:'error',message:error?.message||String(error)}}
  }
  function nextNine(dateLike){
    const date=new Date(dateLike);
    if(Number.isNaN(date.getTime()))return null;
    date.setHours(9,0,0,0);
    return date;
  }
  function notificationDescriptors(){
    const now=Date.now();
    const links=calendarLinks();
    const result=[];
    for(const plant of plants()){
      for(const visit of plant.visits||[]){
        if(visit.status==='done'||visit.status==='cancelled')continue;
        const start=localDate(visit.start);if(!start)continue;
        const linked=Boolean(links[calendarKey(plant.id,visit.id)]?.eventIdentifier);
        const at=new Date(start.getTime()-30*60000);
        if(!linked&&at.getTime()>now+5000){
          result.push({
            id:stableIntId(visit.id,11),title:`Termin · ${safeText(plant.master?.name)||'Kläranlage'}`,
            body:safeText(visit.title||visit.purpose)||'Kundentermin in 30 Minuten',schedule:{at},
            extra:{vtaManaged:true,type:'visit',plantId:plant.id,visitId:visit.id,page:'visits'}
          });
        }
      }
      for(const action of plant.actions||[]){
        if(action.status==='done'||!action.dueDate)continue;
        const at=nextNine(`${action.dueDate}T09:00:00`);if(!at||at.getTime()<=now+5000)continue;
        result.push({
          id:stableIntId(action.id,22),title:`Aufgabe fällig · ${safeText(plant.master?.name)||'Kläranlage'}`,
          body:safeText(action.title)||'Offene Aufgabe',schedule:{at},
          extra:{vtaManaged:true,type:'task',plantId:plant.id,actionId:action.id,page:'tasks'}
        });
      }
      const pipeline=plant.salesPipeline?.opportunities||[];
      for(const opportunity of pipeline){
        const reference=localDate(opportunity.lastDeliveryDate)||localDate(opportunity.lastOrderDate);
        if(!reference)continue;
        const at=new Date(reference);at.setDate(at.getDate()+45);at.setHours(9,0,0,0);
        if(at.getTime()<=now+5000)continue;
        result.push({
          id:stableIntId(opportunity.id,33),title:`Wiederbestellung prüfen · ${safeText(plant.master?.name)||'Kläranlage'}`,
          body:`${safeText(opportunity.title)||'Vertriebschance'} erreicht den 45-Tage-Reminder.`,schedule:{at},
          extra:{vtaManaged:true,type:'sales',plantId:plant.id,page:'sales'}
        });
      }
    }
    return result.slice(0,60);
  }
  async function syncNotifications({requestPermission=false,silent=true}={}){
    if(!LocalNotifications)return {scheduled:0,status:'unavailable'};
    const permission=await notificationPermission({request:requestPermission});
    if(permission.display!=='granted')return {scheduled:0,status:permission.display};
    const previous=readJson(NOTIFICATION_IDS_KEY,[]);
    if(Array.isArray(previous)&&previous.length){
      try{await LocalNotifications.cancel({notifications:previous.map(id=>({id:Number(id)})).filter(item=>item.id)})}catch(error){console.warn('[VTA native] notification cancel failed',error)}
    }
    const descriptors=notificationDescriptors();
    if(descriptors.length)await LocalNotifications.schedule({notifications:descriptors});
    writeJson(NOTIFICATION_IDS_KEY,descriptors.map(item=>item.id));
    if(!silent)toast(`${descriptors.length} iPhone-Erinnerungen wurden geplant.`,'success');
    return {scheduled:descriptors.length,status:'granted'};
  }
  function setupNotificationNavigation(){
    LocalNotifications?.addListener?.('localNotificationActionPerformed',event=>{
      const extra=event?.notification?.extra||event?.notification?.data||{};
      if(!extra?.vtaManaged||!extra.plantId)return;
      localStorage.setItem(ACTIVE_PLANT_KEY,extra.plantId);
      if(extra.page)localStorage.setItem(PLANT_PAGE_KEY,extra.page);
      setTimeout(()=>location.reload(),80);
    }).catch?.(error=>console.warn('[VTA native] notification listener failed',error));
  }

  function navigationChooser(plant){
    const destination=locationQuery(plant);
    if(!destination){toast('Für diese Anlage ist keine Adresse oder GPS-Position hinterlegt.','warning');return}
    const apple=`https://maps.apple.com/?daddr=${encodeURIComponent(destination)}&dirflg=d`;
    const google=`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
    showActionSheet({
      title:'Navigation starten',subtitle:safeText(plant.master?.name),actions:[
        {label:'Apple Karten',detail:'Route in der Karten-App öffnen',run:()=>{location.href=apple}},
        {label:'Google Maps',detail:'Route in Google Maps öffnen',run:()=>{location.href=google}}
      ]
    });
  }

  function visitContext(){
    const plant=activePlant();if(!plant)return {plant:null,visit:null};
    const candidates=(plant.visits||[]).filter(visit=>visit.modeStatus==='active'||visit.modeStatus==='completed'||visit.startedAt);
    candidates.sort((a,b)=>String(b.startedAt||b.start||'').localeCompare(String(a.startedAt||a.start||'')));
    return {plant,visit:candidates[0]||null};
  }
  function base64FromBlob(blob){
    return blob.arrayBuffer().then(buffer=>{
      const bytes=new Uint8Array(buffer);let binary='';const step=0x8000;
      for(let i=0;i<bytes.length;i+=step)binary+=String.fromCharCode(...bytes.subarray(i,i+step));
      return btoa(binary);
    });
  }
  async function archivePhotoFile(file,plant,visit){
    if(!Filesystem||!plant?.id||!visit?.id)return null;
    const dir=`visit-photos/${plant.id}/${visit.id}`;
    const safeName=`${Date.now()}-${Math.random().toString(36).slice(2,8)}.jpg`;
    const path=`${dir}/${safeName}`;
    try{
      await Filesystem.mkdir({path:dir,directory:'DATA',recursive:true}).catch(()=>{});
      const data=await base64FromBlob(file);
      await Filesystem.writeFile({path,directory:'DATA',data,recursive:true});
      const state=photoArchive();
      const key=calendarKey(plant.id,visit.id);
      state[key]=Array.isArray(state[key])?state[key]:[];
      state[key].push({path,name:file.name,size:file.size,createdAt:new Date().toISOString()});
      writeJson(PHOTO_ARCHIVE_KEY,state);
      return path;
    }catch(error){console.warn('[VTA native] photo archive failed',error);return null}
  }
  async function compressBlob(blob,name='besuchsfoto.jpg'){
    if(blob.size<=PHOTO_MAX_BYTES&&/^image\/jpe?g$/i.test(blob.type))return new File([blob],name,{type:'image/jpeg',lastModified:Date.now()});
    const url=URL.createObjectURL(blob);
    try{
      const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=url});
      const scale=Math.min(1,PHOTO_MAX_EDGE/Math.max(image.naturalWidth||image.width,image.naturalHeight||image.height));
      const width=Math.max(1,Math.round((image.naturalWidth||image.width)*scale));
      const height=Math.max(1,Math.round((image.naturalHeight||image.height)*scale));
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      canvas.getContext('2d',{alpha:false}).drawImage(image,0,0,width,height);
      let quality=PHOTO_QUALITY;
      let out=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
      while(out&&out.size>PHOTO_MAX_BYTES&&quality>0.52){quality-=0.08;out=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality))}
      if(!out)throw new Error('Foto konnte nicht komprimiert werden.');
      return new File([out],name.replace(/\.[^.]+$/,'.jpg'),{type:'image/jpeg',lastModified:Date.now()});
    }finally{URL.revokeObjectURL(url)}
  }
  async function photoFromWebPath(webPath,index=0){
    const response=await fetch(webPath);if(!response.ok)throw new Error('Foto konnte nicht gelesen werden.');
    return compressBlob(await response.blob(),`besuch-${Date.now()}-${index+1}.jpg`);
  }
  async function prepareNativePhotoFiles(source,remaining){
    if(!Camera)throw new Error('Die native Kamera ist nicht verfügbar.');
    if(source==='PHOTOS'){
      const result=await Camera.pickImages({quality:78,width:PHOTO_MAX_EDGE,height:PHOTO_MAX_EDGE,correctOrientation:true,presentationStyle:'fullscreen',limit:remaining});
      const output=[];
      for(const [index,photo] of (result.photos||[]).slice(0,remaining).entries()){
        if(photo.webPath)output.push(await photoFromWebPath(photo.webPath,index));
      }
      return output;
    }
    const photo=await Camera.getPhoto({quality:78,width:PHOTO_MAX_EDGE,height:PHOTO_MAX_EDGE,correctOrientation:true,resultType:'uri',source:'CAMERA',direction:'REAR',saveToGallery:false,presentationStyle:'fullscreen'});
    return photo.webPath?[await photoFromWebPath(photo.webPath,0)]:[];
  }
  async function deliverPhotoFiles(input,files){
    if(!files.length)return;
    const {plant,visit}=visitContext();
    for(const file of files)await archivePhotoFile(file,plant,visit);
    const transfer=new DataTransfer();for(const file of files)transfer.items.add(file);
    input.files=transfer.files;
    input.dataset.nativePrepared='1';
    input.dispatchEvent(new Event('change',{bubbles:true}));
    setTimeout(()=>delete input.dataset.nativePrepared,0);
  }
  async function chooseVisitPhotos(input){
    if(photoBusy)return;
    const current=document.querySelectorAll('.visit-photo-grid figure').length;
    const remaining=Math.max(0,MAX_VISIT_PHOTOS-current);
    if(!remaining){toast(`Maximal ${MAX_VISIT_PHOTOS} Fotos pro Besuch in dieser Datenmodell-Version.`,'warning');return}
    showActionSheet({
      title:'Fotodokumentation',subtitle:`Automatisch max. ${PHOTO_MAX_EDGE}px · JPEG 78 %`,actions:[
        {label:'Foto aufnehmen',detail:`Noch ${remaining} Foto${remaining===1?'':'s'} möglich`,run:async()=>{
          photoBusy=true;try{const files=await prepareNativePhotoFiles('CAMERA',1);await deliverPhotoFiles(input,files)}catch(error){if(!/cancel/i.test(error?.message||''))toast(error?.message||'Kamera konnte nicht geöffnet werden.','error')}finally{photoBusy=false}
        }},
        {label:'Aus Mediathek wählen',detail:`Bis zu ${remaining} Bilder`,run:async()=>{
          photoBusy=true;try{const files=await prepareNativePhotoFiles('PHOTOS',remaining);await deliverPhotoFiles(input,files)}catch(error){if(!/cancel/i.test(error?.message||''))toast(error?.message||'Fotos konnten nicht gewählt werden.','error')}finally{photoBusy=false}
        }}
      ]
    });
  }
  async function optimizeFallbackPhotoInput(input,event){
    if(input.dataset.nativePrepared==='1'||!input.files?.length)return;
    event.stopImmediatePropagation();
    event.preventDefault();
    photoBusy=true;
    try{
      const current=document.querySelectorAll('.visit-photo-grid figure').length;
      const remaining=Math.max(0,MAX_VISIT_PHOTOS-current);
      const source=[...input.files].slice(0,remaining);
      const optimized=[];
      for(const file of source)optimized.push(await compressBlob(file,file.name));
      await deliverPhotoFiles(input,optimized);
    }catch(error){toast(error?.message||'Fotos konnten nicht optimiert werden.','error')}
    finally{photoBusy=false}
  }

  async function shareCurrentVisit(){
    const {plant,visit}=visitContext();
    if(!plant||!visit){toast('Aktiver Besuch konnte nicht gefunden werden.','warning');return}
    const text=[
      safeText(plant.master?.name),
      safeText(visit.title),
      visit.start?`Termin: ${new Date(visit.start).toLocaleString('de-DE')}`:'',
      addressForPlant(plant),
      visit.contact?`Ansprechpartner: ${visit.contact}`:'',
      safeText(visit.summary||visit.result||visit.notes)
    ].filter(Boolean).join('\n');
    try{
      if(Share?.share)await Share.share({title:`VTA Copilot · ${safeText(plant.master?.name)}`,text,dialogTitle:'Besuch teilen'});
      else if(navigator.share)await navigator.share({title:`VTA Copilot · ${safeText(plant.master?.name)}`,text});
      else await navigator.clipboard.writeText(text);
    }catch(error){if(!/cancel/i.test(error?.message||''))toast('Teilen konnte nicht geöffnet werden.','error')}
  }

  async function permissionSnapshot(){
    const [calendar,notifications,camera]=await Promise.all([
      calendarPermissionStatus(),notificationPermission(),Camera?.checkPermissions?.().catch(()=>({camera:'error',photos:'error'}))||Promise.resolve({camera:'unavailable',photos:'unavailable'})
    ]);
    return {calendar,notifications,camera};
  }
  async function updateNativeSettingsStatus(){
    const host=document.querySelector('#nativeIntegrationStatus');if(!host)return;
    const state=await permissionSnapshot();
    host.innerHTML=`<div><span>Kalender</span><strong>${escapeHtml(calendarPermissionLabel(state.calendar.status))}</strong></div><div><span>Benachrichtigungen</span><strong>${escapeHtml(state.notifications.display||'Unbekannt')}</strong></div><div><span>Kamera</span><strong>${escapeHtml(state.camera.camera||'Unbekannt')}</strong></div><div><span>Fotos</span><strong>${escapeHtml(state.camera.photos||'Unbekannt')}</strong></div>`;
  }
  function injectNativeSettings(){
    if(document.querySelector('.native-integration-settings'))return;
    if(!document.querySelector('#googleMapsApiKey'))return;
    const section=document.createElement('section');
    section.className='form-section native-integration-settings';
    section.innerHTML=`<div class="section-heading"><div><p class="eyebrow">iPhone</p><h2>Native Integration</h2><p class="form-note">Kalender, Kamera, Teilen und lokale Erinnerungen werden ausschließlich auf diesem iPhone ausgeführt.</p></div></div>
      <div id="nativeIntegrationStatus" class="native-integration-status"></div>
      <div class="form-actions native-integration-actions"><button class="button primary" type="button" id="nativeEnableFeatures">Berechtigungen aktivieren</button><button class="button secondary" type="button" id="nativeSyncFeatures">Termine & Erinnerungen synchronisieren</button></div>
      <p class="form-note">Kalender-Sync ist einseitig: VTA Copilot ist führend und aktualisiert verknüpfte iOS-Kalendereinträge automatisch.</p>`;
    document.querySelector('#googleMapsApiKey')?.closest('.form-section')?.insertAdjacentElement('afterend',section);
    section.querySelector('#nativeEnableFeatures').onclick=async()=>{
      try{await ensureCalendarAccess();await notificationPermission({request:true});await Camera?.requestPermissions?.({permissions:['camera','photos']});await updateNativeSettingsStatus();await syncNotifications({silent:false})}
      catch(error){toast(error?.message||'Berechtigungen konnten nicht vollständig aktiviert werden.','warning');await updateNativeSettingsStatus()}
    };
    section.querySelector('#nativeSyncFeatures').onclick=async()=>{
      await reconcileCalendarLinks();await syncNotifications({requestPermission:true,silent:false});await updateNativeSettingsStatus();
    };
    updateNativeSettingsStatus();
  }

  function decorateCalendarButtons(){
    const links=calendarLinks();
    document.querySelectorAll('[data-ics-visit]').forEach(button=>{
      const plantId=activePlantId(),visitId=button.dataset.icsVisit;
      if(!plantId||!visitId)return;
      const linked=Boolean(links[calendarKey(plantId,visitId)]?.eventIdentifier);
      button.dataset.nativeCalendarSync=visitId;
      button.dataset.nativePlantId=plantId;
      button.textContent=linked?'iOS-Kalender aktualisieren':'iOS-Kalender';
      button.classList.toggle('native-calendar-linked',linked);
      const parent=button.parentElement;
      if(linked&&parent&&!parent.querySelector(`[data-native-calendar-remove="${CSS.escape(visitId)}"]`)){
        const remove=document.createElement('button');remove.type='button';remove.className='native-calendar-remove';remove.dataset.nativeCalendarRemove=visitId;remove.dataset.nativePlantId=plantId;remove.textContent='Kalender entfernen';parent.insertBefore(remove,button.nextSibling);
      }
      if(!linked)parent?.querySelector(`[data-native-calendar-remove="${CSS.escape(visitId)}"]`)?.remove();
    });
    document.querySelectorAll('.appointment-calendar-card[data-plant-id][data-visit-id]').forEach(card=>{
      const plantId=card.dataset.plantId,visitId=card.dataset.visitId;
      const actions=card.querySelector('.appointment-calendar-actions');if(!actions)return;
      const linked=Boolean(links[calendarKey(plantId,visitId)]?.eventIdentifier);
      let button=actions.querySelector('[data-native-calendar-sync]');
      if(!button){button=document.createElement('button');button.type='button';button.dataset.nativeCalendarSync=visitId;button.dataset.nativePlantId=plantId;actions.appendChild(button)}
      button.textContent=linked?'Kalender aktualisieren':'In Kalender';button.classList.toggle('native-calendar-linked',linked);
    });
  }
  function decorateVisitMode(){
    const header=document.querySelector('.visit-mode-header .visit-header-actions');
    if(header&&!header.querySelector('#nativeShareVisit')){
      const button=document.createElement('button');button.id='nativeShareVisit';button.type='button';button.className='button secondary';button.textContent='Teilen';button.onclick=shareCurrentVisit;header.appendChild(button);
    }
    const input=document.querySelector('#visitPhotoInput');
    if(input){
      const label=input.closest('label');
      if(label&&!label.dataset.nativePhotoReady){
        label.dataset.nativePhotoReady='1';
        const text=[...label.childNodes].find(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim());
        if(text)text.textContent=' Foto aufnehmen / auswählen';
      }
      const note=input.closest('.visit-panel')?.querySelector('.muted-small');
      if(note&&!note.dataset.nativePhotoNote){note.dataset.nativePhotoNote='1';note.textContent=`Fotos werden auf dem iPhone automatisch auf max. ${PHOTO_MAX_EDGE}px / JPEG 78 % optimiert und zusätzlich im App-Dateisystem archiviert. Maximal ${MAX_VISIT_PHOTOS} Fotos pro Besuch.`}
    }
  }
  function decorateNativeUi(){
    decorateCalendarButtons();decorateVisitMode();injectNativeSettings();
    document.documentElement.dataset.nativeIntegrationBuild=BUILD;
  }
  function queueDecorate(){
    if(decorateQueued)return;decorateQueued=true;
    requestAnimationFrame(()=>{decorateQueued=false;decorateNativeUi()});
  }
  function queueReconcile(){
    clearTimeout(reconcileTimer);
    reconcileTimer=setTimeout(async()=>{
      try{await reconcileCalendarLinks();await syncNotifications({silent:true})}catch(error){console.warn('[VTA native] background reconcile failed',error)}
      queueDecorate();
    },700);
  }

  function bindGlobalCapture(){
    document.addEventListener('click',event=>{
      const calendarButton=event.target.closest('[data-native-calendar-sync]');
      if(calendarButton){
        event.preventDefault();event.stopImmediatePropagation();
        const plantId=calendarButton.dataset.nativePlantId||activePlantId();
        const visitId=calendarButton.dataset.nativeCalendarSync||calendarButton.dataset.icsVisit;
        syncCalendarEvent(plantId,visitId).catch(error=>toast(error?.message||'Kalender konnte nicht synchronisiert werden.','error'));
        return;
      }
      const removeButton=event.target.closest('[data-native-calendar-remove]');
      if(removeButton){
        event.preventDefault();event.stopImmediatePropagation();
        const plantId=removeButton.dataset.nativePlantId||activePlantId(),visitId=removeButton.dataset.nativeCalendarRemove;
        showActionSheet({title:'Kalendereintrag entfernen?',subtitle:'Der Termin bleibt in VTA Copilot erhalten.',actions:[{label:'Aus iOS-Kalender entfernen',destructive:true,run:()=>removeCalendarEvent(plantId,visitId).catch(error=>toast(error?.message||'Kalendereintrag konnte nicht entfernt werden.','error'))}]});
        return;
      }
      const legacyIcs=event.target.closest('[data-ics-visit]');
      if(legacyIcs){
        event.preventDefault();event.stopImmediatePropagation();
        syncCalendarEvent(activePlantId(),legacyIcs.dataset.icsVisit).catch(error=>toast(error?.message||'Kalender konnte nicht synchronisiert werden.','error'));
        return;
      }
      const nav=event.target.closest('#openNavigation,[data-appt-action="navigate"]');
      if(nav){
        event.preventDefault();event.stopImmediatePropagation();
        const plantId=nav.closest('[data-plant-id]')?.dataset.plantId||activePlantId();const plant=plantById(plantId);
        if(plant)navigationChooser(plant);else toast('Anlage konnte nicht gefunden werden.','warning');
        return;
      }
      const input=event.target.closest('#visitPhotoInput');
      if(input&&Camera){
        event.preventDefault();event.stopImmediatePropagation();chooseVisitPhotos(input);return;
      }
      const label=event.target.closest('label');
      const photoInput=label?.querySelector?.('#visitPhotoInput');
      if(photoInput&&Camera){event.preventDefault();event.stopImmediatePropagation();chooseVisitPhotos(photoInput)}
    },true);

    document.addEventListener('change',event=>{
      const input=event.target;
      if(!(input instanceof HTMLInputElement)||input.id!=='visitPhotoInput')return;
      if(input.dataset.nativePrepared==='1')return;
      optimizeFallbackPhotoInput(input,event);
    },true);
  }

  function initialize(){
    patchLocalStorage();bindGlobalCapture();setupNotificationNavigation();decorateNativeUi();
    const observer=new MutationObserver(queueDecorate);observer.observe(document.body,{subtree:true,childList:true});
    window.addEventListener('vta:native-data-changed',queueReconcile);
    window.addEventListener('pageshow',()=>{queueDecorate();queueReconcile()});
    setTimeout(()=>syncNotifications({silent:true}).catch(error=>console.warn('[VTA native] initial notification sync failed',error)),1500);
    console.info('[VTA native] iPhone integration active',{build:BUILD,calendar:Boolean(NativeIntegration),camera:Boolean(Camera),filesystem:Boolean(Filesystem),notifications:Boolean(LocalNotifications),share:Boolean(Share)});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
