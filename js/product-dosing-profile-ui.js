import {dosingDataForProduct,formatGerman,isChemicalDosingProduct,readProducts,saveDosingProfile,sourceLabel} from './product-dosing-profiles.js';

const BUILD='0.11.0-alpha.76-influent-dosing1';
let queued=false;

const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
})[char]);
const split=value=>String(value||'').split(/\n|;/).map(item=>item.trim()).filter(Boolean);

function findProductByForm(form){
  const name=String(form.elements.name?.value||'').trim();
  const material=String(form.elements.materialNumber?.value||'').trim();
  const products=readProducts();
  return products.find(product=>material&&String(product.materialNumber||'')===material&&String(product.name||'')===name)
    ||products.find(product=>String(product.name||'')===name)
    ||null;
}

function saveFormProfile(snapshot){
  const products=readProducts();
  const candidates=products.filter(product=>{
    if(snapshot.material&&String(product.materialNumber||'')===snapshot.material)return true;
    return String(product.name||'').trim()===snapshot.name;
  }).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
  const product=snapshot.productId?products.find(item=>String(item.id)===String(snapshot.productId)):candidates[0];
  if(!product||!isChemicalDosingProduct(product))return;
  saveDosingProfile(product.id,{
    densityKgL:snapshot.density,
    activeContentPercent:snapshot.activeContent,
    activeComponent:snapshot.activeComponent,
    defaultBasis:snapshot.defaultBasis,
    applicableProcesses:split(snapshot.processes),
    source:snapshot.source,
    verifiedAt:snapshot.verifiedAt
  });
}

function enhanceEditor(form){
  if(form.dataset.dosingProfileBound===BUILD)return;
  const product=findProductByForm(form);
  if(product&&!isChemicalDosingProduct(product))return;
  form.dataset.dosingProfileBound=BUILD;
  const data=dosingDataForProduct(product)||{};
  const actions=form.querySelector('.sticky-form-actions');
  if(!actions)return;
  const section=document.createElement('section');
  section.className='form-section product-dosing-profile-editor';
  section.dataset.productDosingProfileEditor=BUILD;
  section.innerHTML=`<div class="section-heading"><div><p class="eyebrow">Dosierrechner · vorbereitet</p><h2>Dosierdaten</h2><p class="form-note">Optionale strukturierte Produktwerte für die automatische Übernahme in den Rechner „Dosierung nach Zulaufmenge“.</p></div></div>
    <div class="form-grid">
      <label class="field-label">Dichte für Dosierung [kg/L]<input name="dosing.densityKgL" type="number" min="0" step="any" inputmode="decimal" value="${esc(data.densityKgL??'')}" placeholder="z. B. 1,25"></label>
      <label class="field-label">Wirkstoffgehalt [%]<input name="dosing.activeContentPercent" type="number" min="0" max="100" step="any" inputmode="decimal" value="${esc(data.activeContentPercent??'')}" placeholder="optional"></label>
      <label class="field-label">Wirkstoff / Bezugsgröße<input name="dosing.activeComponent" value="${esc(data.activeComponent||'')}" placeholder="z. B. Fe, Al oder Polymer-Wirkstoff"></label>
      <label class="field-label">Standardbezug<select name="dosing.defaultBasis"><option value="product" ${data.defaultBasis!=='active'?'selected':''}>Handelsprodukt</option><option value="active" ${data.defaultBasis==='active'?'selected':''}>Wirkstoff</option></select></label>
      <label class="field-label span-2">Geeignete Prozesse / Einsatzbereiche<textarea name="dosing.applicableProcesses" placeholder="z. B. Fällung; Flockung">${esc((data.applicableProcesses||[]).join('\n'))}</textarea></label>
      <label class="field-label">Datenquelle<select name="dosing.source"><option value="product-record" ${data.source==='product-record'?'selected':''}>Produktakte</option><option value="technical-datasheet" ${data.source==='technical-datasheet'?'selected':''}>Technisches Datenblatt</option><option value="safety-data-sheet" ${data.source==='safety-data-sheet'?'selected':''}>Sicherheitsdatenblatt</option><option value="manufacturer" ${data.source==='manufacturer'?'selected':''}>Herstellerangabe</option><option value="manual" ${!data.source||data.source==='manual'?'selected':''}>Manuell gepflegt</option></select></label>
      <label class="field-label">Geprüft am<input name="dosing.verifiedAt" type="date" value="${esc(data.verifiedAt||'')}"></label>
    </div>
    <div class="product-dosing-profile-note"><strong>Keine Pflichtfelder.</strong><span>Fehlende Werte können im Rechner weiterhin manuell eingegeben werden. Eine vorhandene technische Dichte aus der Produktakte wird bereits als Startwert erkannt.</span></div>`;
  actions.insertAdjacentElement('beforebegin',section);

  form.addEventListener('submit',()=>{
    const snapshot={
      productId:product?.id||'',
      name:String(form.elements.name?.value||'').trim(),
      material:String(form.elements.materialNumber?.value||'').trim(),
      density:String(form.elements.namedItem('dosing.densityKgL')?.value||''),
      activeContent:String(form.elements.namedItem('dosing.activeContentPercent')?.value||''),
      activeComponent:String(form.elements.namedItem('dosing.activeComponent')?.value||''),
      defaultBasis:String(form.elements.namedItem('dosing.defaultBasis')?.value||'product'),
      processes:String(form.elements.namedItem('dosing.applicableProcesses')?.value||''),
      source:String(form.elements.namedItem('dosing.source')?.value||'manual'),
      verifiedAt:String(form.elements.namedItem('dosing.verifiedAt')?.value||'')
    };
    setTimeout(()=>saveFormProfile(snapshot),0);
  },true);
}

function productFromDetail(){
  const heading=document.querySelector('#applicationView .page-header h1')?.textContent.trim()||'';
  if(!heading)return null;
  return readProducts().find(product=>String(product.name||'').trim()===heading)||null;
}

function openInCalculator(product){
  try{sessionStorage.setItem('vta-influent-dosing-prefill-v1',JSON.stringify({productId:product.id}))}catch{}
  const nav=document.querySelector('[data-primary-view="calculators"]');
  nav?.click();
  let attempts=0;
  const find=()=>{
    const card=document.querySelector('.calculator-card[data-id="influent-dosing"]');
    if(card){card.click();return}
    attempts+=1;
    if(attempts<30)setTimeout(find,60);
  };
  setTimeout(find,60);
}

function enhanceDetail(){
  const grid=document.querySelector('#applicationView .product-detail-grid');
  if(!grid||grid.querySelector('[data-product-dosing-profile-detail]'))return;
  const product=productFromDetail();
  if(!product||!isChemicalDosingProduct(product))return;
  const data=dosingDataForProduct(product);
  const card=document.createElement('article');
  card.className='record-card product-dosing-profile-card';
  card.dataset.productDosingProfileDetail=BUILD;
  card.innerHTML=`<div class="product-dosing-profile-head"><div><p class="eyebrow">Dosierrechner</p><h2>Dosierdaten</h2></div><span>${esc(sourceLabel(data?.source))}</span></div>
    <dl class="product-data-list">
      <div><dt>Dichte</dt><dd>${data?.densityKgL?`${formatGerman(data.densityKgL,3)} kg/L`:'–'}</dd></div>
      <div><dt>Wirkstoffgehalt</dt><dd>${data?.activeContentPercent?`${formatGerman(data.activeContentPercent,1)} %`:'–'}</dd></div>
      <div><dt>Wirkstoff / Bezug</dt><dd>${esc(data?.activeComponent||'–')}</dd></div>
      <div><dt>Standardbezug</dt><dd>${data?.defaultBasis==='active'?'Wirkstoff':'Handelsprodukt'}</dd></div>
      <div><dt>Geprüft am</dt><dd>${esc(data?.verifiedAt||'–')}</dd></div>
    </dl>
    <button type="button" class="button secondary product-dosing-open-calculator">Im Dosierrechner verwenden</button>`;
  card.querySelector('button').addEventListener('click',()=>openInCalculator(product));
  grid.appendChild(card);
}

function reconcile(){
  const form=document.querySelector('#productEditor');
  if(form)enhanceEditor(form);
  enhanceDetail();
}
function queue(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;reconcile()});
}

const root=document.querySelector('#applicationView')||document.body;
new MutationObserver(queue).observe(root,{childList:true,subtree:true});
window.addEventListener('vta:product-dosing-profile-updated',queue);
window.addEventListener('pageshow',queue);
queue();

globalThis.VTAProductDosingProfiles=Object.freeze({build:BUILD,refresh:queue});
