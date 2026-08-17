(()=>{
'use strict';

const BUILD='0.11.0-alpha.53';
const MODE_KEY='vta-workspace-mode-v01';
const PLANTS_KEY='abwasser-plants-v07';
const OFFERS_KEY='vta-sales-offers-v01';
const ACTIVE_PLANT_KEY='abwasser-active-plant-v07';
const PLANT_PAGE_KEY='abwasser-plant-page-v091a';
const PERIOD_KEY='vta-field-sales-period-v01';
const SALES_DUE_KEY='vta-sales-next-step-due-v01';
const PERIODS=['week','month','year'];
let scheduled=false;

const isDemo=()=>localStorage.getItem(MODE_KEY)==='demo';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readJson=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback}catch{return fallback}};
const plants=()=>{const value=readJson(PLANTS_KEY,[]);return Array.isArray(value)?value:[]};
const offers=()=>{const value=readJson(OFFERS_KEY,[]);return Array.isArray(value)?value:[]};
const session=()=>window.VTAFirebaseSession||null;
const uid=()=>session()?.user?.uid||session()?.profile?.uid||'';
const firstName=()=>String(session()?.profile?.firstName||'').trim();
const todayKey=()=>dateKey(new Date());
const pad=n=>String(n).padStart(2,'0');
function dateKey(date){return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`}
function parseDate(value){if(!value)return null;const raw=String(value);const date=new Date(raw.length<=10?`${raw.slice(0,10)}T00:00:00`:raw);return Number.isNaN(date.getTime())?null:date}
function daysBetween(from,to){const a=parseDate(from),b=parseDate(to);if(!a||!b)return null;return Math.floor((b.setHours(0,0,0,0)-a.setHours(0,0,0,0))/86400000)}
function money(value){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(value)||0)}
function kg(value){const n=Number(value)||0;if(n>=1000)return `${new Intl.NumberFormat('de-DE',{maximumFractionDigits:n>=10000?0:1}).format(n/1000)} t`;return `${new Intl.NumberFormat('de-DE',{maximumFractionDigits:0}).format(n)} kg`}
function countLabel(n,singular,plural){return `${n} ${n===1?singular:plural}`}
function packageType(label=''){const s=String(label).toLowerCase();if(/tank(last)?zug|tankwagen|tanker/.test(s))return 'tanker';if(/\bibc\b/.test(s))return 'ibc';if(/kanister|jerry/.test(s))return 'jerrycan';if(/sack|bag/.test(s))return 'bag';if(/fass|drum|barrel/.test(s))return 'drum';return 'other'}
function totalKg(offer){return Math.max(0,(Number(offer?.packageCount)||0)*(Number(offer?.packageSizeKg)||0))}
function deliveredKg(offer){return offer?.status==='delivered'?(Number(offer.actualDeliveredKg)||totalKg(offer)):0}
function offerValue(offer){return totalKg(offer)*(Number(offer?.pricePerKg)||0)}
function plantName(id){const plant=plants().find(item=>item?.id===id);return plant?.master?.name||'Kläranlage'}
function currentPeriod(){const p=localStorage.getItem(PERIOD_KEY)||'month';return PERIODS.includes(p)?p:'month'}
function periodStart(period,now=new Date()){
  const d=new Date(now);d.setHours(0,0,0,0);
  if(period==='week'){const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day)}
  else if(period==='month')d.setDate(1);
  else {d.setMonth(0,1)}
  return d;
}
function inPeriod(value,period){const d=parseDate(value);if(!d)return false;const start=periodStart(period),end=new Date();end.setHours(23,59,59,999);return d>=start&&d<=end}
function periodLabel(period){return period==='week'?'Woche':period==='year'?'Jahr':'Monat'}
function localTasks(allPlants){
  const myUid=uid();
  return allPlants.flatMap(plant=>(Array.isArray(plant?.actions)?plant.actions:[]).map(action=>({plant,action}))).filter(({action})=>{
    if(!action||action.status==='done')return false;
    if(action.cloudTaskId&&action.assignedToUserId&&myUid)return action.assignedToUserId===myUid;
    return true;
  });
}
function visitItems(allPlants){
  return allPlants.flatMap(plant=>(Array.isArray(plant?.visits)?plant.visits:[]).map(visit=>({plant,visit})));
}
function activeSalesState(plant){
  const pipeline=plant?.salesPipeline&&typeof plant.salesPipeline==='object'?plant.salesPipeline:{};
  const list=Array.isArray(pipeline.opportunities)&&pipeline.opportunities.length?pipeline.opportunities:[{id:'sales-main',...(plant?.salesFunnel||{})}];
  const wanted=String(pipeline.activeOpportunityId||list[0]?.id||'sales-main');
  return list.find(item=>String(item?.id)===wanted)||list[0]||{};
}
function salesDue(plant,opportunity){const map=readJson(SALES_DUE_KEY,{});return String(map?.[`${plant.id}::${opportunity?.id||'sales-main'}`]||opportunity?.nextStepDueDate||'')}
function openPlant(plantId,page='overview'){
  if(!plantId)return;
  localStorage.setItem(PLANT_PAGE_KEY,page);
  const select=document.querySelector('#activePlantSelect');
  if(select&&[...select.options].some(option=>option.value===plantId)){
    select.value=plantId;select.dispatchEvent(new Event('change',{bubbles:true}));return;
  }
  localStorage.setItem(ACTIVE_PLANT_KEY,plantId);
  document.querySelector('[data-primary-view="plants"]')?.click();
}
function openGlobal(view){document.querySelector(`[data-global-view="${view}"]`)?.click()}
function volumeSummary(list){
  const groups={tanker:{label:'Tankwagen',count:0,kg:0},ibc:{label:'IBC',count:0,kg:0},jerrycan:{label:'Kanister',count:0,kg:0},bag:{label:'Sack',count:0,kg:0},drum:{label:'Fass',count:0,kg:0},other:{label:'Sonstige',count:0,kg:0}};
  list.forEach(offer=>{const key=groups[offer.packageType]?offer.packageType:packageType(offer.packageLabel);const group=groups[key]||groups.other;group.count+=Number(offer.packageCount)||0;group.kg+=deliveredKg(offer)});
  return Object.entries(groups).filter(([,group])=>group.count||group.kg).map(([key,group])=>({key,...group}));
}
function salesVolumes(allOffers,period){const list=allOffers.filter(offer=>offer?.status==='delivered'&&inPeriod(offer.deliveredAt||offer.updatedAt,period));return {list,totalKg:list.reduce((sum,offer)=>sum+deliveredKg(offer),0),groups:volumeSummary(list)}}
function monthlyVisits(allVisits){return allVisits.filter(({visit})=>visit?.appointmentType==='visit'&&visit.status!=='cancelled'&&inPeriod(visit.start,'month')).length}
function weeklyVisits(allVisits){return allVisits.filter(({visit})=>visit?.appointmentType==='visit'&&visit.status!=='cancelled'&&inPeriod(visit.start,'week')).length}
function dailyActivities(allPlants,allOffers){
  const today=todayKey(),items=[];
  localTasks(allPlants).forEach(({plant,action})=>{
    const due=String(action.dueDate||'');if(!due||due>today)return;
    items.push({type:'task',rank:due<today?0:1,time:'',title:action.title||'Aufgabe',meta:`${plant.master?.name||'Kläranlage'} · ${due<today?'überfällig':'heute fällig'}`,plantId:plant.id,page:'tasks'});
  });
  visitItems(allPlants).forEach(({plant,visit})=>{
    if(visit?.status==='cancelled'||String(visit?.start||'').slice(0,10)!==today)return;
    const d=parseDate(visit.start);const time=d?d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}):'';
    items.push({type:'visit',rank:2,time,title:visit.title||'Termin',meta:`${plant.master?.name||'Kläranlage'} · ${visit.appointmentType==='visit'?'Besuch':'Termin'}`,plantId:plant.id,page:'visits'});
  });
  allOffers.filter(offer=>offer?.status==='open').forEach(offer=>{
    const age=daysBetween(offer.offerDate||offer.createdAt,today);const valid=offer.validUntil?daysBetween(today,offer.validUntil):null;
    let reason='';let rank=5;
    if(valid!==null&&valid<0){reason='Gültigkeit abgelaufen';rank=1}
    else if(valid!==null&&valid<=7){reason=`Gültigkeit endet in ${valid} Tagen`;rank=3}
    else if(age!==null&&age>=7){reason=`seit ${age} Tagen offen`;rank=4}
    if(reason)items.push({type:'offer',rank,time:'',title:`${offer.productName||'Angebot'} · ${plantName(offer.plantId)}`,meta:reason,plantId:offer.plantId,page:'sales'});
  });
  allPlants.forEach(plant=>{
    const sales=activeSalesState(plant),due=salesDue(plant,sales);if(!sales?.nextStep||!due||due>today)return;
    items.push({type:'sales',rank:due<today?0:1,time:'',title:sales.nextStep,meta:`${plant.master?.name||'Kläranlage'} · ${due<today?'Vertrieb überfällig':'Vertrieb heute'}`,plantId:plant.id,page:'sales'});
  });
  return items.sort((a,b)=>a.rank-b.rank||String(a.time).localeCompare(String(b.time))||a.title.localeCompare(b.title)).slice(0,8);
}
function actionNeedCount(allPlants,allOffers){
  const today=todayKey();let count=0;
  count+=localTasks(allPlants).filter(({action})=>action.dueDate&&String(action.dueDate)<=today).length;
  count+=allOffers.filter(offer=>{if(offer?.status!=='open')return false;const age=daysBetween(offer.offerDate||offer.createdAt,today),valid=offer.validUntil?daysBetween(today,offer.validUntil):null;return (age!==null&&age>=7)||(valid!==null&&valid<=7)}).length;
  count+=allPlants.filter(plant=>{const s=activeSalesState(plant),due=salesDue(plant,s);return Boolean(s?.nextStep&&due&&due<=today)}).length;
  return count;
}
function fingerprint(allPlants,allOffers,period){
  const profile=session()?.profile||{};
  return JSON.stringify([BUILD,uid(),profile.firstName,period,
    ...allPlants.map(plant=>[plant.id,plant.updatedAt,(plant.actions||[]).length,(plant.visits||[]).length]),
    ...allOffers.map(offer=>[offer.id,offer.status,offer.updatedAt,offer.deliveredAt,offer.packageCount,offer.packageSizeKg])]);
}
function render(){
  if(isDemo())return;
  const dashboard=document.querySelector('#dashboard:not(.hidden)');
  if(!dashboard||!dashboard.querySelector('.today-dashboard-hero'))return;
  const allPlants=plants(),allOffers=offers(),allVisits=visitItems(allPlants),period=currentPeriod();
  let host=dashboard.querySelector('.field-sales-dashboard');
  if(!host){host=document.createElement('section');host.className='field-sales-dashboard';dashboard.querySelector('.today-dashboard-hero')?.after(host)}
  const fp=fingerprint(allPlants,allOffers,period);if(host.dataset.fingerprint===fp)return;host.dataset.fingerprint=fp;
  const openOffers=allOffers.filter(offer=>offer?.status==='open');
  const openValue=openOffers.reduce((sum,offer)=>sum+offerValue(offer),0);
  const activities=dailyActivities(allPlants,allOffers);
  const todayAppointments=allVisits.filter(({visit})=>visit?.status!=='cancelled'&&String(visit?.start||'').slice(0,10)===todayKey()).length;
  const dueTasks=localTasks(allPlants).filter(({action})=>action.dueDate&&String(action.dueDate)<=todayKey()).length;
  const volumes=salesVolumes(allOffers,period);
  const groups=volumes.groups;
  const need=actionNeedCount(allPlants,allOffers);
  const name=firstName();
  host.innerHTML=`
    <div class="field-sales-head"><div><p class="eyebrow">Außendienst</p><h2>${name?`Dein Vertriebs-Cockpit, ${esc(name)}`:'Dein Vertriebs-Cockpit'}</h2><p>Aktivitäten, Angebote, Besuche und tatsächlich gelieferte Mengen.</p></div><span class="field-sales-scope">Meine Übersicht</span></div>
    <div class="field-sales-kpis">
      <button type="button" data-field-open="tasks-global"><span>Heute fällig</span><strong>${dueTasks}</strong><small>${countLabel(todayAppointments,'Termin','Termine')} heute</small></button>
      <article><span>Offene Angebote</span><strong>${openOffers.length}</strong><small>${money(openValue)} Angebotswert</small></article>
      <button type="button" data-field-open="appointments"><span>Besuche Monat</span><strong>${monthlyVisits(allVisits)}</strong><small>${weeklyVisits(allVisits)} diese Woche</small></button>
      <article class="${need?'needs-attention':''}"><span>Handlungsbedarf</span><strong>${need}</strong><small>Aufgaben, Angebote & Vertrieb</small></article>
    </div>
    <div class="field-sales-grid">
      <section class="field-sales-panel field-sales-activities"><div class="field-sales-panel-head"><div><span>Heute</span><h3>Tägliche Aktivitäten</h3></div><small>${activities.length?`${activities.length} relevant`:'Alles im Plan'}</small></div>
        <div class="field-sales-activity-list">${activities.length?activities.map(item=>`<button type="button" data-activity-plant="${esc(item.plantId)}" data-activity-page="${esc(item.page)}"><span class="field-sales-activity-type ${esc(item.type)}">${item.type==='task'?'✓':item.type==='visit'?'○':item.type==='offer'?'€':'→'}</span><span><strong>${item.time?`${esc(item.time)} · `:''}${esc(item.title)}</strong><small>${esc(item.meta)}</small></span></button>`).join(''):'<div class="field-sales-empty"><strong>Keine dringenden Aktivitäten</strong><span>Heute sind keine fälligen Aufgaben, Termine oder Angebots-Wiedervorlagen vorhanden.</span></div>'}</div>
      </section>
      <section class="field-sales-panel field-sales-volume"><div class="field-sales-panel-head"><div><span>Geliefert</span><h3>Verkaufte Mengen</h3></div><div class="field-sales-period">${PERIODS.map(p=>`<button type="button" data-sales-period="${p}" class="${period===p?'active':''}">${periodLabel(p)}</button>`).join('')}</div></div>
        <div class="field-sales-volume-total"><span>Gesamt ${periodLabel(period).toLowerCase()}</span><strong>${kg(volumes.totalKg)}</strong><small>${countLabel(volumes.list.length,'Lieferung','Lieferungen')}</small></div>
        <div class="field-sales-volume-groups">${groups.length?groups.map(group=>`<article><span>${esc(group.label)}</span><strong>${group.key==='tanker'?kg(group.kg):`${new Intl.NumberFormat('de-DE',{maximumFractionDigits:1}).format(group.count)} Stück`}</strong><small>${group.key==='tanker'?countLabel(group.count,'Lieferung','Lieferungen'):kg(group.kg)}</small></article>`).join(''):'<div class="field-sales-empty compact"><span>In diesem Zeitraum sind noch keine Liefermengen erfasst.</span></div>'}</div>
      </section>
    </div>`;
  host.querySelectorAll('[data-sales-period]').forEach(button=>button.addEventListener('click',()=>{localStorage.setItem(PERIOD_KEY,button.dataset.salesPeriod);host.dataset.fingerprint='';queue()}));
  host.querySelectorAll('[data-field-open]').forEach(button=>button.addEventListener('click',()=>openGlobal(button.dataset.fieldOpen)));
  host.querySelectorAll('[data-activity-plant]').forEach(button=>button.addEventListener('click',()=>openPlant(button.dataset.activityPlant,button.dataset.activityPage||'overview')));
}
function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;render()})}
function start(){queue();new MutationObserver(queue).observe(document.querySelector('#mainContent')||document.body,{childList:true,subtree:true});window.addEventListener('pageshow',queue);window.addEventListener('storage',queue);window.addEventListener('vta:cloud-tasks-updated',queue);window.addEventListener('vta:sales-offers-updated',queue);window.addEventListener('vta:firebase-session',queue)}
window.VTAFieldSalesDashboard={build:BUILD,refresh:queue};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
