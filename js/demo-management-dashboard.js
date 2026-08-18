(()=>{
'use strict';

const BUILD='0.11.0-alpha.59-demo-management1';
const MODE_KEY='vta-workspace-mode-v01';
const FILTER_KEY='vta-demo-management-filters-v01';
const PLANTS_KEY='abwasser-plants-v07';
const ACTIVE_PLANT_KEY='abwasser-active-plant-v07';
const PLANT_PAGE_KEY='abwasser-plant-page-v091a';
const ACTIVE_USER_KEY='vta-demo-active-user-v01';
const DEMO_YEAR=2026;
const AS_OF_LABEL='18.08.2026';
const MONTHS=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const ACTUAL_MONTHLY=[510,540,575,610,645,630,655,655,null,null,null,null];
const PLAN_MONTHLY=[525,540,560,580,600,610,620,635,650,670,690,720];
const PREV_MONTHLY=[470,500,515,555,580,590,610,625,650,675,700,730];
const FORECAST_MONTHLY=[510,540,575,610,645,630,655,655,610,620,625,635];

const PERIODS={
  month:{label:'Monat',scope:'August 2026',revenue:655,plan:635,previous:625,orderIntake:710,newCustomers:3,visits:86},
  quarter:{label:'Quartal',scope:'Q3 2026 bis 18.08.',revenue:1310,plan:1255,previous:1235,orderIntake:1430,newCustomers:6,visits:203},
  ytd:{label:'YTD',scope:'01.01.–18.08.2026',revenue:4820,plan:4670,previous:4445,orderIntake:5160,newCustomers:21,visits:684},
  rolling:{label:'12 Monate',scope:'rollierend 12 Monate',revenue:7575,plan:7400,previous:7200,orderIntake:7840,newCustomers:29,visits:1012}
};

const OVERALL={
  revenueYtd:4820,planYtd:4670,previousYtd:4445,orderIntakeYtd:5160,
  annualPlan:7600,forecast:7310,weightedPipeline:2140,pipelineCoverage:1.8,
  grossMargin:38.8,customers:186,newCustomers:21,riskCustomers:12,criticalCustomers:4,
  order30:236,riskRevenue30:218,criticalTasks:8,activeTrials:14,trialSuccess:61
};

const REGIONS={
  all:{label:'Alle Regionen',revenueYtd:4820,planYtd:4670,previousYtd:4445,orderIntakeYtd:5160,annualPlan:7600,forecast:7310,weightedPipeline:2140,pipelineCoverage:1.8,grossMargin:38.8,customers:186,newCustomers:21,riskCustomers:12,criticalCustomers:4,order30:236,riskRevenue30:218,criticalTasks:8,activeTrials:14,trialSuccess:61},
  south:{label:'Region Süd',revenueYtd:1780,planYtd:1650,previousYtd:1570,orderIntakeYtd:1950,annualPlan:2670,forecast:2790,weightedPipeline:760,pipelineCoverage:1.9,grossMargin:39.8,customers:58,newCustomers:7,riskCustomers:2,criticalCustomers:0,order30:89,riskRevenue30:54,criticalTasks:2,activeTrials:5,trialSuccess:67},
  west:{label:'Region West',revenueYtd:1430,planYtd:1380,previousYtd:1335,orderIntakeYtd:1520,annualPlan:2230,forecast:2180,weightedPipeline:590,pipelineCoverage:1.6,grossMargin:38.5,customers:51,newCustomers:5,riskCustomers:3,criticalCustomers:1,order30:63,riskRevenue30:48,criticalTasks:2,activeTrials:4,trialSuccess:63},
  north:{label:'Region Nord',revenueYtd:960,planYtd:1080,previousYtd:1008,orderIntakeYtd:1000,annualPlan:1760,forecast:1510,weightedPipeline:310,pipelineCoverage:0.7,grossMargin:35.7,customers:43,newCustomers:3,riskCustomers:5,criticalCustomers:3,order30:51,riskRevenue30:92,criticalTasks:3,activeTrials:2,trialSuccess:44},
  east:{label:'Region Ost',revenueYtd:650,planYtd:560,previousYtd:532,orderIntakeYtd:690,annualPlan:940,forecast:830,weightedPipeline:480,pipelineCoverage:2.1,grossMargin:41.2,customers:34,newCustomers:6,riskCustomers:2,criticalCustomers:0,order30:33,riskRevenue30:24,criticalTasks:1,activeTrials:3,trialSuccess:71}
};

const EMPLOYEES={
  all:{label:'Alle Mitarbeiter',region:'all',ratio:1},
  lukas:{label:'Lukas Beispiel',region:'south',ratio:.52,revenueYtd:925,planYtd:860,previousYtd:812,orderIntakeYtd:1010,annualPlan:1370,forecast:1450,weightedPipeline:420,pipelineCoverage:2.0,grossMargin:40.1,customers:29,newCustomers:4,riskCustomers:1,criticalCustomers:0,order30:47,riskRevenue30:24,criticalTasks:1,activeTrials:3,trialSuccess:69},
  anna:{label:'Anna Berger',region:'west',ratio:.60,revenueYtd:858,planYtd:820,previousYtd:790,orderIntakeYtd:930,annualPlan:1340,forecast:1325,weightedPipeline:355,pipelineCoverage:1.7,grossMargin:39.2,customers:27,newCustomers:3,riskCustomers:2,criticalCustomers:1,order30:39,riskRevenue30:31,criticalTasks:1,activeTrials:2,trialSuccess:64},
  thomas:{label:'Thomas Weber · Teamleitung',region:'south',ratio:1,revenueYtd:1780,planYtd:1650,previousYtd:1570,orderIntakeYtd:1950,annualPlan:2670,forecast:2790,weightedPipeline:760,pipelineCoverage:1.9,grossMargin:39.8,customers:58,newCustomers:7,riskCustomers:2,criticalCustomers:0,order30:89,riskRevenue30:54,criticalTasks:2,activeTrials:5,trialSuccess:67},
  peter:{label:'Peter Wagner · Nord',region:'north',ratio:.54,revenueYtd:520,planYtd:590,previousYtd:552,orderIntakeYtd:545,annualPlan:950,forecast:815,weightedPipeline:165,pipelineCoverage:.6,grossMargin:34.9,customers:23,newCustomers:1,riskCustomers:3,criticalCustomers:2,order30:27,riskRevenue30:51,criticalTasks:2,activeTrials:1,trialSuccess:40}
};

const SEGMENTS={
  all:{label:'Alle Kundengruppen',revenueShare:1,customerShare:1,pipelineShare:1,riskShare:1,newShare:1},
  a:{label:'A-Kunden',revenueShare:3100/4820,customerShare:32/186,pipelineShare:1100/2140,riskShare:4/12,newShare:5/21},
  b:{label:'B-Kunden',revenueShare:1200/4820,customerShare:71/186,pipelineShare:720/2140,riskShare:5/12,newShare:8/21},
  c:{label:'C-Kunden',revenueShare:520/4820,customerShare:83/186,pipelineShare:320/2140,riskShare:3/12,newShare:8/21}
};

const PIPELINE=[
  {id:'analysis',label:'Analyse',count:18,volume:940,probability:20,weighted:188},
  {id:'trial',label:'Versuch',count:11,volume:1150,probability:40,weighted:460},
  {id:'offer',label:'Angebot',count:14,volume:1760,probability:65,weighted:1144},
  {id:'order',label:'Auftrag',count:8,volume:350,probability:100,weighted:350}
];

const PRODUCTS=[
  {label:'Fällmittel',revenue:2050,growth:11.4,customers:92,share:42.5},
  {label:'Polymere',revenue:1230,growth:8.7,customers:64,share:25.5},
  {label:'Biologie',revenue:670,growth:19.2,customers:38,share:13.9},
  {label:'Schlamm',revenue:450,growth:3.4,customers:31,share:9.3},
  {label:'Spezialchemie',revenue:420,growth:7.8,customers:26,share:8.7}
];

const TOP_PRODUCTS=[
  {label:'Compiphos L',revenue:720,growth:16.0,customers:31},
  {label:'Speedfloc 50',revenue:490,growth:9.0,customers:24},
  {label:'Aquafix 50 Plus',revenue:360,growth:21.0,customers:18},
  {label:'TRIOXAN',revenue:315,growth:12.0,customers:17}
];

const CUSTOMER_SEGMENTS=[
  {id:'a',label:'A-Kunden',customers:32,revenue:3100,share:64,risk:4},
  {id:'b',label:'B-Kunden',customers:71,revenue:1200,share:25,risk:5},
  {id:'c',label:'C-Kunden',customers:83,revenue:520,share:11,risk:3}
];

const ORDER_FORECAST=[
  {days:'0–7 Tage',customers:6,value:74,secure:54},
  {days:'8–30 Tage',customers:21,value:236,secure:61},
  {days:'31–60 Tage',customers:38,value:411,secure:72},
  {days:'61–90 Tage',customers:51,value:586,secure:79}
];

const FIELD_KPIS=[
  {label:'Kundenbesuche YTD',value:'684',note:'86 in den letzten 30 Tagen'},
  {label:'A-Kunden ohne Besuch >90 Tage',value:'7',note:'davon 3 mit Umsatzrisiko',tone:'warning'},
  {label:'Offene Besuchsnachbereitung',value:'19',note:'6 davon >7 Tage',tone:'warning'},
  {label:'Aktive Versuche',value:'14',note:'39 abgeschlossen YTD'},
  {label:'Versuchserfolgsquote',value:'61 %',note:'+5 PP ggü. Vorjahr',tone:'positive'},
  {label:'Besuch → Auftrag',value:'28 %',note:'+3 PP ggü. Vorjahr',tone:'positive'}
];

const CROSS_SELL=[
  {title:'Fällmittel → Polymer',customers:28,potential:185,note:'Kunden mit Fällmittelumsatz, aber ohne Polymergeschäft'},
  {title:'Fällmittel → Biologie',customers:19,potential:82,note:'Geeignete Bestandskunden ohne Biologieprodukt'},
  {title:'Industrie → Spezialchemie',customers:11,potential:43,note:'Industriekunden mit zusätzlichem Anwendungspotenzial'}
];

const ATTENTION=[
  {severity:'critical',title:'Region Nord unter Ziel und zu dünne Pipeline',detail:'Umsatz −11 % ggü. YTD-Plan, Pipeline Coverage nur 0,7×. Drei kritische A-Kunden erfordern Management-Fokus.',value:'250 T€ Forecast-Lücke',region:'north'},
  {severity:'critical',title:'Erwartete Wiederbestellungen noch nicht abgesichert',detail:'Bei mehreren Kunden deutet der Verbrauch auf eine Bestellung innerhalb 30 Tagen hin, ohne bestätigten Auftrag.',value:'218 T€ Risiko',page:'sales'},
  {severity:'warning',title:'Industriekläranlage West · Versuch ohne Abschlussentscheidung',detail:'Der produktionsbegleitende Versuch läuft in die nächste Phase. Entscheidung zu Angebot und Zielpreis vorbereiten.',value:'75 T€ Potenzial',plantId:'vta-present-plant-004',page:'sales'},
  {severity:'warning',title:'KA Sonnenfeld · Kundenentwicklung beobachten',detail:'Polymerverbrauch über Zielkorridor und Entwässerungsleistung unter Benchmark. Technische Chance und Bindungsrisiko gleichzeitig.',value:'Cross-Selling',plantId:'vta-present-plant-005',page:'overview'},
  {severity:'info',title:'Cross-Selling-Pipeline systematisch heben',detail:'58 Bestandskunden erfüllen mindestens ein einfaches Cross-Selling-Muster. Schwerpunkt Fällmittel → Polymer.',value:'310 T€ Potenzial',page:'sales'}
];

let renderQueued=false;
let observer=null;

const isDemo=()=>localStorage.getItem(MODE_KEY)==='demo';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function readJson(key,fallback){try{const value=JSON.parse(localStorage.getItem(key)||'null');return value??fallback}catch{return fallback}}
function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
function clamp(value,min,max){return Math.min(max,Math.max(min,value))}
function number(value,digits=0){return new Intl.NumberFormat('de-DE',{maximumFractionDigits:digits,minimumFractionDigits:digits}).format(Number(value)||0)}
function moneyK(value){const n=Number(value)||0;if(Math.abs(n)>=1000)return `${number(n/1000,2)} Mio. €`;return `${number(n,0)} T€`}
function moneyCompact(value){const n=Number(value)||0;if(Math.abs(n)>=1000)return `${number(n/1000,n>=10000?1:2)} Mio. €`;return `${number(n,0)} T€`}
function pct(value,digits=1){const n=Number(value)||0;return `${n>0?'+':''}${number(n,digits)} %`}
function ratio(value){return `${number(value,1)}×`}
function diffPct(current,previous){return previous?((current-previous)/previous)*100:0}
function periodData(id){return PERIODS[id]||PERIODS.ytd}
function defaultFilters(){return {period:'ytd',region:'all',employee:'all',segment:'all'}}
function filters(){const stored=readJson(FILTER_KEY,defaultFilters());return {...defaultFilters(),...(stored||{})}}
function saveFilters(value){writeJson(FILTER_KEY,value)}
function plants(){const value=readJson(PLANTS_KEY,[]);return Array.isArray(value)?value:[]}
function offerList(){const value=readJson('vta-sales-offers-v01',[]);return Array.isArray(value)?value:[]}

function deriveScope(current){
  const period=periodData(current.period);
  const employee=EMPLOYEES[current.employee]||EMPLOYEES.all;
  let scope=employee.id==='all'?null:employee;
  if(current.employee!=='all')scope=employee;
  else scope=REGIONS[current.region]||REGIONS.all;
  const baseYtd=scope.revenueYtd||OVERALL.revenueYtd;
  const ytdRatio=baseYtd/OVERALL.revenueYtd;
  const periodRatio=period.revenue/PERIODS.ytd.revenue;
  const segment=SEGMENTS[current.segment]||SEGMENTS.all;
  const revenue=(scope.revenueYtd||OVERALL.revenueYtd)*periodRatio*segment.revenueShare;
  const plan=(scope.planYtd||OVERALL.planYtd)*(period.plan/PERIODS.ytd.plan)*segment.revenueShare;
  const previous=(scope.previousYtd||OVERALL.previousYtd)*(period.previous/PERIODS.ytd.previous)*segment.revenueShare;
  const orderIntake=(scope.orderIntakeYtd||OVERALL.orderIntakeYtd)*(period.orderIntake/PERIODS.ytd.orderIntake)*segment.revenueShare;
  const annualPlan=(scope.annualPlan||OVERALL.annualPlan)*segment.revenueShare;
  const forecast=(scope.forecast||OVERALL.forecast)*segment.revenueShare;
  const weightedPipeline=(scope.weightedPipeline||OVERALL.weightedPipeline)*segment.pipelineShare;
  const customers=Math.max(1,Math.round((scope.customers||OVERALL.customers)*segment.customerShare));
  const newCustomers=Math.max(0,Math.round((scope.newCustomers||OVERALL.newCustomers)*(period.newCustomers/PERIODS.ytd.newCustomers)*segment.newShare));
  const riskCustomers=Math.max(0,Math.round((scope.riskCustomers||OVERALL.riskCustomers)*segment.riskShare));
  const criticalCustomers=Math.max(0,Math.round((scope.criticalCustomers||OVERALL.criticalCustomers)*segment.riskShare));
  const order30=(scope.order30||OVERALL.order30)*segment.revenueShare;
  const riskRevenue30=(scope.riskRevenue30||OVERALL.riskRevenue30)*segment.revenueShare;
  const grossMargin=scope.grossMargin||OVERALL.grossMargin;
  const grossProfit=revenue*(grossMargin/100);
  const pipelineCoverage=scope.pipelineCoverage||OVERALL.pipelineCoverage;
  const scopeLabel=current.employee!=='all'?employee.label:(REGIONS[current.region]||REGIONS.all).label;
  return {
    period,current,scopeLabel,segmentLabel:segment.label,revenue,plan,previous,orderIntake,annualPlan,forecast,weightedPipeline,pipelineCoverage,grossMargin,grossProfit,
    customers,newCustomers,riskCustomers,criticalCustomers,order30,riskRevenue30,
    criticalTasks:Math.max(0,Math.round((scope.criticalTasks||OVERALL.criticalTasks)*segment.customerShare)),
    activeTrials:Math.max(0,Math.round((scope.activeTrials||OVERALL.activeTrials)*segment.customerShare)),
    trialSuccess:scope.trialSuccess||OVERALL.trialSuccess,
    revenueVsPlan:diffPct(revenue,plan),revenueVsPrevious:diffPct(revenue,previous),
    forecastAchievement:annualPlan?forecast/annualPlan*100:0,
    orderGrowth:diffPct(orderIntake,period.orderIntake*(scope.previousYtd||OVERALL.previousYtd)/(PERIODS.ytd.previous||1)*ytdRatio),
    periodRatio,ytdRatio
  };
}

function operationalSnapshot(){
  const allPlants=plants();
  const now=Date.now();
  const today=new Date();today.setHours(0,0,0,0);
  const tasks=allPlants.flatMap(plant=>(plant.actions||[]).map(action=>({plant,action})));
  const openTasks=tasks.filter(({action})=>action?.status!=='done');
  const overdueTasks=openTasks.filter(({action})=>{if(!action?.dueDate)return false;const d=new Date(`${String(action.dueDate).slice(0,10)}T00:00:00`);return !Number.isNaN(d.getTime())&&d<today}).length;
  const visits=allPlants.flatMap(plant=>(plant.visits||[]).map(visit=>({plant,visit})));
  const upcoming=visits.filter(({visit})=>visit?.status!=='done'&&visit?.status!=='cancelled'&&new Date(visit.start||0).getTime()>now).length;
  const completed=visits.filter(({visit})=>visit?.status==='done'||visit?.modeStatus==='completed').length;
  const unresolved=visits.reduce((sum,{visit})=>sum+(visit.findings||[]).filter(item=>!item?.resolved).length,0);
  return {detailPlants:allPlants.length,openTasks:openTasks.length,overdueTasks,upcoming,completed,unresolved,offers:offerList().length};
}

function sparkline(values){
  const clean=values.map(v=>Number(v)||0);const max=Math.max(...clean,1),min=Math.min(...clean,0);const w=112,h=32,p=2;const range=max-min||1;
  const pts=clean.map((v,i)=>`${p+(i*(w-p*2)/(clean.length-1||1))},${h-p-((v-min)/range)*(h-p*2)}`).join(' ');
  return `<svg class="demo-mgmt-spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts}"/></svg>`;
}
function kpiCard({label,value,delta,note,tone='neutral',spark=[]}){
  return `<article class="demo-mgmt-kpi tone-${tone}"><div class="demo-mgmt-kpi-top"><span>${esc(label)}</span>${delta?`<small class="demo-mgmt-delta">${esc(delta)}</small>`:''}</div><strong>${esc(value)}</strong><div class="demo-mgmt-kpi-foot"><small>${esc(note)}</small>${spark.length?sparkline(spark):''}</div></article>`;
}

function linePoints(values,w,h,pad,maxValue){
  const indexes=values.map((value,index)=>({value,index})).filter(item=>item.value!==null&&item.value!==undefined);
  return indexes.map(({value,index})=>`${pad+(index*(w-pad*2)/11)},${h-pad-(Number(value)/maxValue)*(h-pad*2)}`).join(' ');
}
function revenueChart(scope){
  const scale=(scope?.ytdRatio||1)*(SEGMENTS[scope?.current?.segment]?.revenueShare||1);
  const actual=ACTUAL_MONTHLY.map(value=>value==null?null:value*scale);
  const plan=PLAN_MONTHLY.map(value=>value*scale);
  const previous=PREV_MONTHLY.map(value=>value*scale);
  const forecast=FORECAST_MONTHLY.map(value=>value*scale);
  const w=760,h=260,pad=34,maxValue=Math.ceil(Math.max(...plan,...previous,...forecast.filter(Boolean))/100)*100||100;
  const actualPoints=linePoints(actual,w,h,pad,maxValue);
  const planPoints=linePoints(plan,w,h,pad,maxValue);
  const prevPoints=linePoints(previous,w,h,pad,maxValue);
  const forecastPoints=linePoints(forecast,w,h,pad,maxValue);
  const ySteps=[0,.25,.5,.75,1].map(part=>Math.round(maxValue*part));
  return `<div class="demo-mgmt-chart-wrap"><svg class="demo-mgmt-revenue-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Monatlicher Umsatz im Vergleich zu Plan und Vorjahr">
    ${ySteps.map(value=>{const y=h-pad-(value/maxValue)*(h-pad*2);return `<line class="grid" x1="${pad}" y1="${y}" x2="${w-pad}" y2="${y}"/><text class="y-label" x="${pad-7}" y="${y+4}" text-anchor="end">${value}</text>`}).join('')}
    ${MONTHS.map((month,index)=>{const x=pad+(index*(w-pad*2)/11);return `<text class="x-label" x="${x}" y="${h-8}" text-anchor="middle">${month}</text>`}).join('')}
    <polyline class="line previous" points="${prevPoints}"/>
    <polyline class="line plan" points="${planPoints}"/>
    <polyline class="line forecast" points="${forecastPoints}"/>
    <polyline class="line actual" points="${actualPoints}"/>
  </svg><div class="demo-mgmt-chart-legend"><span class="actual">Ist</span><span class="forecast">Forecast</span><span class="plan">Plan</span><span class="previous">Vorjahr</span><small>Monatsumsatz in T€</small></div></div>`;
}

function filterOptions(map,selected){return Object.entries(map).map(([id,item])=>`<option value="${esc(id)}" ${selected===id?'selected':''}>${esc(item.label)}</option>`).join('')}
function periodOptions(selected){return Object.entries(PERIODS).map(([id,item])=>`<option value="${id}" ${selected===id?'selected':''}>${esc(item.label)}</option>`).join('')}

function renderPipeline(scope){
  const max=Math.max(...PIPELINE.map(item=>item.volume));
  return `<div class="demo-mgmt-pipeline">${PIPELINE.map(item=>{
    const scale=scope.current.region==='all'&&scope.current.employee==='all'?1:scope.ytdRatio;
    const seg=SEGMENTS[scope.current.segment]||SEGMENTS.all;
    const volume=item.volume*scale*seg.pipelineShare;
    const weighted=item.weighted*scale*seg.pipelineShare;
    const count=Math.max(1,Math.round(item.count*scale*seg.customerShare));
    return `<div class="demo-mgmt-pipeline-row"><div><strong>${esc(item.label)}</strong><small>${count} Chancen · ${item.probability}% Gewichtung</small></div><div class="demo-mgmt-pipeline-bar"><span style="--bar:${clamp(volume/max*100,4,100)}%"></span></div><div class="demo-mgmt-pipeline-value"><strong>${moneyCompact(volume)}</strong><small>${moneyCompact(weighted)} gewichtet</small></div></div>`;
  }).join('')}</div>`;
}

function renderOrderForecast(scope){
  const scale=(scope.current.region==='all'&&scope.current.employee==='all'?1:scope.ytdRatio)*(SEGMENTS[scope.current.segment]?.revenueShare||1);
  return `<div class="demo-mgmt-order-grid">${ORDER_FORECAST.map(item=>`<article><span>${item.days}</span><strong>${moneyCompact(item.value*scale)}</strong><small>${Math.max(1,Math.round(item.customers*(scope.current.region==='all'?1:scope.ytdRatio)*(SEGMENTS[scope.current.segment]?.customerShare||1)))} Kunden</small><div class="demo-mgmt-secure"><i style="--secure:${item.secure}%"></i></div><em>${item.secure}% bereits abgesichert</em></article>`).join('')}</div>`;
}

function renderCustomerPortfolio(scope){
  const seg=scope.current.segment;
  const visible=seg==='all'?CUSTOMER_SEGMENTS:CUSTOMER_SEGMENTS.filter(item=>item.id===seg);
  const scopeScale=scope.current.region==='all'&&scope.current.employee==='all'?1:scope.ytdRatio;
  return `<div class="demo-mgmt-customer-stack" aria-label="Umsatzanteile Kundensegmente">${visible.map(item=>`<span class="segment-${item.id}" style="--share:${seg==='all'?item.share:100}%" title="${esc(item.label)} ${item.share}%"></span>`).join('')}</div><div class="demo-mgmt-customer-list">${visible.map(item=>`<button type="button" data-segment-jump="${item.id}"><span class="demo-mgmt-segment-dot segment-${item.id}"></span><span><strong>${esc(item.label)}</strong><small>${Math.max(1,Math.round(item.customers*scopeScale))} Kunden · ${Math.max(0,Math.round(item.risk*scopeScale))} mit Risiko</small></span><span><strong>${moneyCompact(item.revenue*scopeScale)}</strong><small>${item.share}% Umsatzanteil</small></span></button>`).join('')}</div>`;
}

function renderProducts(scope){
  const scale=scope.revenue/PERIODS.ytd.revenue;
  return `<div class="demo-mgmt-product-list">${PRODUCTS.map(item=>`<div class="demo-mgmt-product-row"><div><strong>${esc(item.label)}</strong><small>${item.customers} aktive Kunden</small></div><div class="demo-mgmt-product-bar"><span style="--bar:${item.share}%"></span></div><div><strong>${moneyCompact(item.revenue*scale)}</strong><small class="positive">${pct(item.growth)}</small></div></div>`).join('')}</div><div class="demo-mgmt-top-products"><span>Top-Produkte</span>${TOP_PRODUCTS.map(item=>`<article><strong>${esc(item.label)}</strong><small>${moneyCompact(item.revenue*scale)} · ${item.customers} Kunden · ${pct(item.growth)}</small></article>`).join('')}</div>`;
}

function renderRegions(current){
  return `<div class="demo-mgmt-region-table"><div class="head"><span>Region</span><span>Umsatz YTD</span><span>Plan</span><span>Pipeline</span><span>Risiko</span></div>${Object.entries(REGIONS).filter(([id])=>id!=='all').map(([id,item])=>{
    const vsPlan=diffPct(item.revenueYtd,item.planYtd);const tone=item.pipelineCoverage<1?'critical':vsPlan<0?'warning':'positive';
    return `<button type="button" class="${current.region===id?'active':''}" data-region-jump="${id}"><span><strong>${esc(item.label)}</strong><small>${item.customers} Kunden</small></span><span><strong>${moneyCompact(item.revenueYtd)}</strong><small class="${vsPlan>=0?'positive':'negative'}">${pct(vsPlan)} vs. Plan</small></span><span><strong>${moneyCompact(item.planYtd)}</strong><small>${pct(diffPct(item.revenueYtd,item.previousYtd))} vs. VJ</small></span><span><strong>${moneyCompact(item.weightedPipeline)}</strong><small class="${tone}">${ratio(item.pipelineCoverage)} Coverage</small></span><span><strong>${item.riskCustomers}</strong><small>${item.criticalCustomers} kritisch</small></span></button>`;
  }).join('')}</div>`;
}

function renderField(scope){
  const visitScale=scope.period.visits/PERIODS.ytd.visits*(scope.current.region==='all'?1:scope.ytdRatio)*(SEGMENTS[scope.current.segment]?.customerShare||1);
  const cards=FIELD_KPIS.map((item,index)=>{
    let value=item.value,note=item.note;
    if(index===0)value=number(Math.max(1,Math.round(684*visitScale)),0);
    if(index===3)value=String(scope.activeTrials);
    if(index===4)value=`${number(scope.trialSuccess,0)} %`;
    return `<article class="${item.tone||''}"><span>${esc(item.label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`;
  }).join('');
  const funnelScale=scope.period.visits/PERIODS.ytd.visits*(scope.current.region==='all'&&scope.current.employee==='all'?1:scope.ytdRatio)*(SEGMENTS[scope.current.segment]?.customerShare||1);
  const funnel=value=>Math.max(1,Math.round(value*funnelScale));
  return `<div class="demo-mgmt-field-grid">${cards}</div><div class="demo-mgmt-funnel"><div><span>Besuche</span><strong>${funnel(684)}</strong></div><i></i><div><span>Analysen</span><strong>${funnel(142)}</strong></div><i></i><div><span>Versuche</span><strong>${funnel(53)}</strong></div><i></i><div><span>Angebote</span><strong>${funnel(41)}</strong></div><i></i><div class="final"><span>Aufträge</span><strong>${funnel(19)}</strong></div></div>`;
}

function renderCrossSell(scope){
  const scale=scope.current.region==='all'?1:scope.ytdRatio;
  return `<div class="demo-mgmt-crosssell">${CROSS_SELL.map(item=>`<article><div><span>Cross-Selling</span><strong>${esc(item.title)}</strong></div><div class="demo-mgmt-crosssell-value"><strong>${moneyCompact(item.potential*scale)}</strong><small>${Math.max(1,Math.round(item.customers*scale))} Kunden</small></div><p>${esc(item.note)}</p></article>`).join('')}</div>`;
}

function relevantAttention(scope){
  if(scope.current.region==='all')return ATTENTION;
  const region=scope.current.region;
  return ATTENTION.filter(item=>!item.region||item.region===region).slice(0,5);
}
function renderAttention(scope){
  const items=relevantAttention(scope);
  return `<div class="demo-mgmt-attention-list">${items.map((item,index)=>`<article class="severity-${item.severity}"><div class="demo-mgmt-attention-rank">${index+1}</div><div class="demo-mgmt-attention-copy"><span>${item.severity==='critical'?'Kritisch':item.severity==='warning'?'Beobachten':'Chance'}</span><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p></div><div class="demo-mgmt-attention-value"><strong>${esc(item.value)}</strong>${item.plantId?`<button type="button" data-open-plant="${esc(item.plantId)}" data-open-page="${esc(item.page||'overview')}">Anlage öffnen</button>`:item.region?`<button type="button" data-region-jump="${esc(item.region)}">Region ansehen</button>`:''}</div></article>`).join('')}</div>`;
}

function executiveSummary(scope){
  const planText=scope.revenueVsPlan>=0?`${number(scope.revenueVsPlan,1)} % über Plan`:`${number(Math.abs(scope.revenueVsPlan),1)} % unter Plan`;
  const forecastGap=scope.annualPlan-scope.forecast;
  const coverageTone=scope.pipelineCoverage<1?'kritisch':scope.pipelineCoverage<1.5?'beobachten':'stabil';
  return [
    {tone:scope.revenueVsPlan>=0?'positive':'warning',title:`Umsatz ${planText}`,text:`${scope.period.scope}: ${moneyCompact(scope.revenue)} Umsatz, ${pct(scope.revenueVsPrevious)} gegenüber Vorjahr.`},
    {tone:scope.forecastAchievement>=100?'positive':'warning',title:`Jahresforecast ${number(scope.forecastAchievement,1)} % vom Ziel`,text:forecastGap>0?`${moneyCompact(forecastGap)} fehlen im aktuellen Forecast zum Jahresplan.`:'Der aktuelle Forecast liegt über dem Jahresplan.'},
    {tone:scope.pipelineCoverage<1?'critical':scope.pipelineCoverage<1.5?'warning':'positive',title:`Pipeline Coverage ${ratio(scope.pipelineCoverage)} · ${coverageTone}`,text:`Gewichtete Pipeline ${moneyCompact(scope.weightedPipeline)}. Besonders Region Nord benötigt zusätzliche qualifizierte Chancen.`},
    {tone:scope.riskRevenue30>100?'critical':'warning',title:`${moneyCompact(scope.riskRevenue30)} erwarteter Umsatz noch offen`,text:`Verbrauchs- und Wiederbestellindikatoren zeigen kurzfristiges Potenzial ohne abgesicherten Auftrag.`}
  ];
}

function renderHero(scope,ops){
  return `<section class="demo-mgmt-hero"><div><div class="demo-mgmt-hero-badges"><span>Demo · Geschäftsführung</span><span>Fiktive Präsentationsdaten</span></div><p class="eyebrow">Executive Intelligence</p><h1>Management Cockpit</h1><p>Umsatz, Auftragseingang, Forecast, Kundenrisiken, Wiederbestellungen, Pipeline, Produkte und Außendienstleistung in einer verdichteten Sicht.</p><div class="demo-mgmt-hero-meta"><span>Stand ${AS_OF_LABEL}</span><span>${esc(scope.scopeLabel)}</span><span>${esc(scope.segmentLabel)}</span><span>${ops.detailPlants} operative Demo-Anlagen verknüpft</span></div></div><div class="demo-mgmt-target"><span>Jahresziel</span><strong>${number(scope.forecastAchievement,1)} %</strong><small>${moneyCompact(scope.forecast)} Forecast / ${moneyCompact(scope.annualPlan)} Plan</small><div><i style="--progress:${clamp(scope.forecastAchievement,0,100)}%"></i></div></div></section>`;
}

function renderFilters(current){
  return `<section class="demo-mgmt-filterbar"><div><label>Zeitraum<select data-mgmt-filter="period">${periodOptions(current.period)}</select></label><label>Region<select data-mgmt-filter="region">${filterOptions(REGIONS,current.region)}</select></label><label>Mitarbeiter<select data-mgmt-filter="employee">${filterOptions(EMPLOYEES,current.employee)}</select></label><label>Kundengruppe<select data-mgmt-filter="segment">${filterOptions(SEGMENTS,current.segment)}</select></label></div><button type="button" data-mgmt-reset>Filter zurücksetzen</button></section>`;
}

function renderKpis(scope){
  const revenueSpark=[470,500,515,555,580,590,610,625];
  const actualSpark=[510,540,575,610,645,630,655,655];
  return `<section class="demo-mgmt-kpis">${[
    kpiCard({label:`Umsatz ${scope.period.label}`,value:moneyK(scope.revenue),delta:pct(scope.revenueVsPrevious),note:`${pct(scope.revenueVsPlan)} vs. Plan`,tone:scope.revenueVsPlan>=0?'positive':'warning',spark:actualSpark}),
    kpiCard({label:'Auftragseingang',value:moneyK(scope.orderIntake),delta:pct(11.2),note:'Auftragseingang im gewählten Zeitraum',tone:'positive',spark:[470,535,560,605,650,640,695,715]}),
    kpiCard({label:'Forecast Jahresende',value:moneyK(scope.forecast),delta:`${number(scope.forecastAchievement,1)} %`,note:`vom Jahresziel ${moneyK(scope.annualPlan)}`,tone:scope.forecastAchievement>=100?'positive':'warning',spark:[82,84,87,89,91,93,95,96]}),
    kpiCard({label:'Gewichtete Pipeline',value:moneyK(scope.weightedPipeline),delta:ratio(scope.pipelineCoverage),note:'Pipeline Coverage',tone:scope.pipelineCoverage<1?'critical':scope.pipelineCoverage<1.5?'warning':'positive',spark:[1.2,1.3,1.4,1.5,1.6,1.7,1.75,1.8]}),
    kpiCard({label:'Rohertrag / DB',value:moneyK(scope.grossProfit),delta:`${number(scope.grossMargin,1)} %`,note:'Deckungsbeitragsmarge',tone:'neutral',spark:[36.8,37.1,37.6,37.9,38.2,38.4,38.6,38.8]}),
    kpiCard({label:'Aktive Kunden',value:number(scope.customers),delta:`+${scope.newCustomers}`,note:'Neukunden im Zeitraum',tone:'neutral',spark:[168,171,173,176,178,181,184,186]}),
    kpiCard({label:'Kunden mit Risiko',value:number(scope.riskCustomers),delta:`${scope.criticalCustomers} kritisch`,note:'Bestellung, Besuch oder Aktivität auffällig',tone:scope.criticalCustomers?'critical':'warning',spark:[8,9,8,10,9,11,12,12]}),
    kpiCard({label:'Bestellungen ≤30 Tage',value:moneyK(scope.order30),delta:'Prognose',note:`${moneyK(scope.riskRevenue30)} noch nicht abgesichert`,tone:scope.riskRevenue30>100?'warning':'neutral',spark:[170,180,188,199,207,219,228,236]}),
    kpiCard({label:'Kritische Aufgaben',value:number(scope.criticalTasks),delta:'Management',note:'überfällige umsatzrelevante Aktionen',tone:scope.criticalTasks>4?'critical':'warning',spark:[5,6,5,7,6,7,8,8]}),
    kpiCard({label:'Aktive Versuche',value:number(scope.activeTrials),delta:`${number(scope.trialSuccess,0)} % Erfolg`,note:'Produkt- und Prozessversuche',tone:'positive',spark:[9,10,11,11,12,13,14,14]})
  ].join('')}</section>`;
}

function renderSummary(scope){
  return `<section class="demo-mgmt-summary"><div class="demo-mgmt-section-head"><div><span>Executive Summary</span><h2>Was die Geschäftsführung jetzt wissen sollte</h2></div><small>automatisch aus KPI-Sicht verdichtet</small></div><div class="demo-mgmt-summary-grid">${executiveSummary(scope).map(item=>`<article class="${item.tone}"><span></span><div><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p></div></article>`).join('')}</div></section>`;
}

function renderDashboard(scope,ops){
  return `${renderHero(scope,ops)}${renderFilters(scope.current)}${renderKpis(scope)}${renderSummary(scope)}
  <section class="demo-mgmt-grid two-up">
    <article class="demo-mgmt-panel demo-mgmt-revenue"><div class="demo-mgmt-section-head"><div><span>Finanzperformance</span><h2>Umsatz · Plan · Vorjahr · Forecast</h2></div><small>Monatswerte in T€</small></div>${revenueChart(scope)}</article>
    <article class="demo-mgmt-panel"><div class="demo-mgmt-section-head"><div><span>Vertrieb</span><h2>Pipeline nach Phase</h2></div><strong>${moneyCompact(scope.weightedPipeline)} gewichtet</strong></div>${renderPipeline(scope)}</article>
  </section>
  <section class="demo-mgmt-panel demo-mgmt-attention"><div class="demo-mgmt-section-head"><div><span>Management Attention</span><h2>Risiken, Chancen und Entscheidungen</h2></div><small>${relevantAttention(scope).length} priorisierte Hinweise</small></div>${renderAttention(scope)}</section>
  <section class="demo-mgmt-grid two-up">
    <article class="demo-mgmt-panel"><div class="demo-mgmt-section-head"><div><span>Wiederbestellung</span><h2>Erwartete Aufträge</h2></div><strong>${moneyCompact(scope.order30)} ≤30 Tage</strong></div>${renderOrderForecast(scope)}<div class="demo-mgmt-risk-strip"><strong>${moneyCompact(scope.riskRevenue30)}</strong><span>erwarteter Umsatz ≤30 Tage noch nicht abgesichert</span></div></article>
    <article class="demo-mgmt-panel"><div class="demo-mgmt-section-head"><div><span>Kundenportfolio</span><h2>ABC-Struktur & Risiko</h2></div><strong>${scope.customers} aktive Kunden</strong></div>${renderCustomerPortfolio(scope)}</article>
  </section>
  <section class="demo-mgmt-grid two-up">
    <article class="demo-mgmt-panel"><div class="demo-mgmt-section-head"><div><span>Portfolio</span><h2>Produktgruppen & Wachstum</h2></div><small>Umsatzmix</small></div>${renderProducts(scope)}</article>
    <article class="demo-mgmt-panel"><div class="demo-mgmt-section-head"><div><span>Regionen</span><h2>Performance & Zielabdeckung</h2></div><small>zum Drill-down anklicken</small></div>${renderRegions(scope.current)}</article>
  </section>
  <section class="demo-mgmt-grid two-up">
    <article class="demo-mgmt-panel"><div class="demo-mgmt-section-head"><div><span>Außendienst</span><h2>Marktabdeckung & Conversion</h2></div><small>${scope.period.scope}</small></div>${renderField(scope)}</article>
    <article class="demo-mgmt-panel"><div class="demo-mgmt-section-head"><div><span>Wachstum</span><h2>Cross-Selling-Potenzial</h2></div><strong>${moneyCompact(310*(scope.current.region==='all'?1:scope.ytdRatio))}</strong></div>${renderCrossSell(scope)}</article>
  </section>
  <section class="demo-mgmt-panel demo-mgmt-detail-status"><div class="demo-mgmt-section-head"><div><span>Demo-Datenraum</span><h2>Operative Detaildaten im Cockpit</h2></div><small>lokal aus der Demo-Organisation gelesen</small></div><div class="demo-mgmt-detail-kpis"><article><strong>${ops.detailPlants}</strong><span>Detailanlagen</span></article><article><strong>${ops.upcoming}</strong><span>kommende Termine</span></article><article><strong>${ops.openTasks}</strong><span>offene Aufgaben</span></article><article><strong>${ops.overdueTasks}</strong><span>davon überfällig</span></article><article><strong>${ops.completed}</strong><span>dokumentierte Besuche</span></article><article><strong>${ops.unresolved}</strong><span>offene Findings</span></article></div><p>Finanz-, Markt- und Portfolio-KPIs sind bewusst fiktive, aggregierte Präsentationsdaten. Anlagen-, Termin-, Aufgaben- und Besuchszahlen werden zusätzlich aus dem aktuellen Demo-Arbeitsbereich gelesen.</p></section>`;
}

function ensureLauncher(){
  const nav=document.querySelector('.global-navigation');if(!nav)return null;
  let button=document.querySelector('#demoManagementLauncher');
  if(!button){
    button=document.createElement('button');
    button.id='demoManagementLauncher';
    button.className='global-nav-item hidden';
    button.type='button';
    button.innerHTML='<span>▥</span><strong>Geschäftsführung</strong><small>KPI</small>';
    const demoOrg=document.querySelector('#demoOrganizationLauncher');
    if(demoOrg?.parentElement===nav)demoOrg.after(button);else nav.appendChild(button);
    button.addEventListener('click',openManagement);
  }
  button.classList.toggle('hidden',!isDemo());
  return button;
}

function ensureView(){
  let view=document.querySelector('#demoManagementView');
  if(view)return view;
  view=document.createElement('section');
  view.id='demoManagementView';
  view.className='application-view demo-management-view hidden';
  view.dataset.build=BUILD;
  document.querySelector('#mainContent')?.appendChild(view);
  return view;
}

function hideManagement(){
  document.querySelector('#demoManagementView')?.classList.add('hidden');
  document.querySelector('#demoManagementLauncher')?.classList.remove('active');
}
function setBreadcrumb(){
  const current=document.querySelector('#breadcrumbCurrent');
  const separator=document.querySelector('#breadcrumbSeparator');
  if(current)current.textContent='Geschäftsführung · Management Cockpit';
  if(separator)separator.classList.remove('hidden');
}
function openManagement(){
  if(!isDemo())return;
  document.querySelectorAll('#mainContent > section').forEach(section=>section.classList.add('hidden'));
  const view=ensureView();view.classList.remove('hidden');
  document.querySelectorAll('.global-nav-item.active').forEach(item=>item.classList.remove('active'));
  document.querySelector('#demoManagementLauncher')?.classList.add('active');
  setBreadcrumb();
  render();
  document.querySelector('#sidebarClose')?.click();
  window.scrollTo({top:0,behavior:'smooth'});
}

function openPlant(plantId,page='overview'){
  if(!plantId)return;
  localStorage.setItem(ACTIVE_PLANT_KEY,plantId);
  localStorage.setItem(PLANT_PAGE_KEY,page);
  hideManagement();
  const select=document.querySelector('#activePlantSelect');
  if(select&&[...select.options].some(option=>option.value===plantId)){
    select.value=plantId;
    select.dispatchEvent(new Event('change',{bubbles:true}));
  }else{
    document.querySelector('[data-primary-view="plants"]')?.click();
  }
}

function bindView(view){
  if(view.dataset.bound==='1')return;view.dataset.bound='1';
  view.addEventListener('change',event=>{
    const control=event.target.closest('[data-mgmt-filter]');if(!control)return;
    const current=filters();const key=control.dataset.mgmtFilter;current[key]=control.value;
    if(key==='employee'&&current.employee!=='all')current.region=EMPLOYEES[current.employee]?.region||'all';
    if(key==='region'&&current.employee!=='all'&&EMPLOYEES[current.employee]?.region!==current.region)current.employee='all';
    saveFilters(current);render(true);
  });
  view.addEventListener('click',event=>{
    const reset=event.target.closest('[data-mgmt-reset]');if(reset){saveFilters(defaultFilters());render(true);return}
    const region=event.target.closest('[data-region-jump]');if(region){const current=filters();current.region=region.dataset.regionJump;current.employee='all';saveFilters(current);render(true);view.scrollIntoView({block:'start',behavior:'smooth'});return}
    const segment=event.target.closest('[data-segment-jump]');if(segment){const current=filters();current.segment=segment.dataset.segmentJump;saveFilters(current);render(true);return}
    const plant=event.target.closest('[data-open-plant]');if(plant){openPlant(plant.dataset.openPlant,plant.dataset.openPage||'overview');return}
  });
}

function render(force=false){
  if(!isDemo())return;
  const view=ensureView();bindView(view);
  const current=filters();
  const scope=deriveScope(current);const ops=operationalSnapshot();
  const fingerprint=JSON.stringify([BUILD,current,ops,localStorage.getItem(ACTIVE_USER_KEY)||'']);
  if(!force&&view.dataset.fingerprint===fingerprint)return;
  view.dataset.fingerprint=fingerprint;
  view.innerHTML=renderDashboard(scope,ops);
}

function queueRender(){
  if(renderQueued)return;renderQueued=true;
  requestAnimationFrame(()=>{renderQueued=false;sync()});
}
function sync(){
  const button=ensureLauncher();
  if(!isDemo()){
    button?.classList.add('hidden');
    hideManagement();
    return;
  }
  if(!document.querySelector('#demoManagementView'))ensureView();
  if(!document.querySelector('#demoManagementView')?.classList.contains('hidden'))render();
}

function bindGlobalNavigation(){
  document.addEventListener('click',event=>{
    const target=event.target.closest('button,a');if(!target)return;
    if(target.id==='demoManagementLauncher')return;
    if(target.matches('.global-nav-item,#homeButton,#breadcrumbHome,#managePlantsButton,#newPlantButton,#profileButton,#profileMenuButton'))hideManagement();
  },true);
}

function init(){
  ensureLauncher();ensureView();bindGlobalNavigation();sync();
  observer=new MutationObserver(queueRender);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
  window.addEventListener('storage',event=>{if([MODE_KEY,PLANTS_KEY,FILTER_KEY].includes(event.key))queueRender()});
  window.addEventListener('pageshow',queueRender);
  console.info('[VTA demo management] ready',{build:BUILD,demo:isDemo()});
}

window.VTADemoManagement={open:openManagement,render:()=>render(true),build:BUILD};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
