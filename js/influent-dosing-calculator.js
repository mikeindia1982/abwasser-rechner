import {activePlantContext,chemicalProducts,dosingDataForProduct,formatGerman,sourceLabel} from './product-dosing-profiles.js';

const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({
  '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
})[char]);
const numberValue=value=>{
  const normalized=String(value??'').trim().replace(',','.');
  if(!normalized)return null;
  const parsed=Number(normalized);
  return Number.isFinite(parsed)?parsed:null;
};

function resultCard(label,value,unit,emphasis=''){
  return `<article class="influent-dose-metric ${emphasis}"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(unit)}</small></article>`;
}

export function calculateInfluentDose(values){
  const q=numberValue(values.q);
  const ppm=numberValue(values.ppm);
  const density=numberValue(values.density);
  const activeContent=numberValue(values.activeContent);
  const hours=numberValue(values.hours);
  const basis=values.basis==='active'?'active':'product';
  if(q===null||q<=0)return {error:'Bitte eine Zulaufmenge größer 0 m³/d eingeben.'};
  if(ppm===null||ppm<0)return {error:'Bitte eine gültige Dosierung in ppm eingeben.'};
  if(hours===null||hours<=0||hours>24)return {error:'Die Dosierzeit muss zwischen 0 und 24 h/d liegen.'};
  if(density!==null&&density<=0)return {error:'Die Dichte muss größer 0 kg/L sein.'};
  if(activeContent!==null&&(activeContent<=0||activeContent>100))return {error:'Der Wirkstoffgehalt muss zwischen 0 und 100 % liegen.'};

  const basisKgDay=q*ppm/1000;
  if(basis==='active'&&(activeContent===null||activeContent<=0)){
    return {error:'Bei „ppm Wirkstoff“ wird der Wirkstoffgehalt des Handelsprodukts benötigt.'};
  }

  const productKgDay=basis==='active'?basisKgDay/(activeContent/100):basisKgDay;
  const activeKgDay=activeContent!==null?productKgDay*(activeContent/100):(basis==='active'?basisKgDay:null);
  const productLDay=density!==null&&density>0?productKgDay/density:null;
  const productKgHour=productKgDay/hours;
  const productLHour=productLDay!==null?productLDay/hours:null;

  return {
    q,ppm,basis,basisKgDay,productKgDay,activeKgDay,productLDay,productKgHour,productLHour,hours,density,activeContent,
    monthKg:productKgDay*30,
    yearKg:productKgDay*365,
    monthL:productLDay!==null?productLDay*30:null,
    yearL:productLDay!==null?productLDay*365:null
  };
}

function render(workspace){
  const products=chemicalProducts();
  const plant=activePlantContext();
  const initialFlow=plant?.influentM3Day??'';
  workspace.innerHTML=`<section class="influent-dose-calculator">
    <div class="influent-dose-heading">
      <div><p class="eyebrow">Chemikalien · ppm</p><h2>Dosierung nach Zulaufmenge</h2><p>Zulaufmenge pro Tag und ppm in Produktbedarf und Dosierleistung umrechnen.</p></div>
      ${plant?`<span class="influent-dose-source">${esc(plant.name||'Aktive Anlage')}${plant.influentM3Day?' · Zulauf vorbelegt':' · kein Zulaufwert'}</span>`:''}
    </div>

    <form id="influentDosingForm" class="influent-dose-form">
      <section class="influent-dose-section">
        <div class="influent-dose-section-head"><span>01</span><div><strong>Hydraulische Basis</strong><small>Bezugsgröße ist der Tageszulauf der Kläranlage.</small></div></div>
        <div class="influent-dose-fields two">
          <label>Zulaufmenge pro Tag<div class="influent-dose-input"><input name="q" type="number" min="0" step="any" inputmode="decimal" value="${esc(initialFlow)}" required><span>m³/d</span></div></label>
          <label>Dosierung<div class="influent-dose-input"><input name="ppm" type="number" min="0" step="any" inputmode="decimal" placeholder="z. B. 15" required><span>ppm</span></div></label>
        </div>
        <p class="influent-dose-note">Für Wasser gilt näherungsweise: 1 ppm = 1 mg/L = 1 g/m³.</p>
      </section>

      <section class="influent-dose-section">
        <div class="influent-dose-section-head"><span>02</span><div><strong>Dosierbezug</strong><small>Verhindert Verwechslungen zwischen Handelsprodukt und Wirkstoff.</small></div></div>
        <div class="influent-dose-basis" role="radiogroup" aria-label="Dosierbezug">
          <label><input type="radio" name="basis" value="product" checked><span><strong>Handelsprodukt</strong><small>ppm beziehen sich direkt auf das Produkt.</small></span></label>
          <label><input type="radio" name="basis" value="active"><span><strong>Wirkstoff</strong><small>ppm beziehen sich auf den Wirkstoff.</small></span></label>
        </div>
      </section>

      <section class="influent-dose-section">
        <div class="influent-dose-section-head"><span>03</span><div><strong>Produktdaten</strong><small>Optional manuell oder aus der Produktakte übernehmen.</small></div></div>
        <label class="influent-dose-product-select">Produkt auswählen
          <select name="productId">
            <option value="">Manuell / kein Produkt</option>
            ${products.map(product=>`<option value="${esc(product.id)}">${esc(product.name||'Unbenanntes Produkt')}</option>`).join('')}
          </select>
        </label>
        <div id="influentDoseProductStatus" class="influent-dose-product-status">Noch kein Produkt ausgewählt. Dichte und Wirkstoffgehalt können manuell eingetragen werden.</div>
        <div class="influent-dose-fields three">
          <label>Dichte<div class="influent-dose-input"><input name="density" type="number" min="0" step="any" inputmode="decimal" placeholder="z. B. 1,25"><span>kg/L</span></div></label>
          <label>Wirkstoffgehalt<div class="influent-dose-input"><input name="activeContent" type="number" min="0" max="100" step="any" inputmode="decimal" placeholder="optional"><span>%</span></div></label>
          <label>Dosierzeit<div class="influent-dose-input"><input name="hours" type="number" min="0.01" max="24" step="any" inputmode="decimal" value="24" required><span>h/d</span></div></label>
        </div>
      </section>

      <div class="influent-dose-actions"><button type="reset" class="button secondary">Zurücksetzen</button><button type="submit" class="button primary">Dosierung berechnen</button></div>
    </form>
    <div id="influentDoseResult" class="influent-dose-result" aria-live="polite"><div class="influent-dose-result-empty"><strong>Bereit zur Berechnung</strong><span>Zulaufmenge und ppm eingeben.</span></div></div>
  </section>`;

  const form=workspace.querySelector('#influentDosingForm');
  const result=workspace.querySelector('#influentDoseResult');
  const productSelect=form.elements.productId;
  const densityInput=form.elements.density;
  const activeInput=form.elements.activeContent;
  const status=workspace.querySelector('#influentDoseProductStatus');

  const applyProduct=()=>{
    const product=products.find(item=>String(item.id)===String(productSelect.value));
    if(!product){
      status.textContent='Noch kein Produkt ausgewählt. Dichte und Wirkstoffgehalt können manuell eingetragen werden.';
      return;
    }
    const data=dosingDataForProduct(product);
    densityInput.value=data?.densityKgL?String(data.densityKgL):'';
    activeInput.value=data?.activeContentPercent?String(data.activeContentPercent):'';
    if(data?.defaultBasis){
      const radio=form.querySelector(`input[name="basis"][value="${data.defaultBasis}"]`);
      if(radio)radio.checked=true;
    }
    const parts=[product.name];
    if(data?.densityKgL)parts.push(`Dichte ${formatGerman(data.densityKgL,3)} kg/L`);
    if(data?.activeContentPercent)parts.push(`${formatGerman(data.activeContentPercent,1)} % ${data.activeComponent||'Wirkstoff'}`);
    parts.push(`Quelle: ${sourceLabel(data?.source)}`);
    status.textContent=parts.join(' · ');
  };

  productSelect.addEventListener('change',applyProduct);
  form.addEventListener('reset',()=>setTimeout(()=>{
    form.elements.q.value=initialFlow;
    status.textContent='Noch kein Produkt ausgewählt. Dichte und Wirkstoffgehalt können manuell eingetragen werden.';
    result.innerHTML='<div class="influent-dose-result-empty"><strong>Bereit zur Berechnung</strong><span>Zulaufmenge und ppm eingeben.</span></div>';
  },0));

  form.addEventListener('submit',event=>{
    event.preventDefault();
    const fd=new FormData(form);
    const values=Object.fromEntries(fd.entries());
    const calculated=calculateInfluentDose(values);
    if(calculated.error){
      result.innerHTML=`<div class="influent-dose-error"><strong>Berechnung nicht möglich</strong><span>${esc(calculated.error)}</span></div>`;
      return;
    }
    const product=products.find(item=>String(item.id)===String(values.productId));
    const basisLabel=calculated.basis==='active'?'Wirkstoff':'Handelsprodukt';
    result.innerHTML=`<div class="influent-dose-result-head"><div><span>Ergebnis</span><strong>${product?esc(product.name):'Dosierung'}</strong></div><span>${formatGerman(calculated.ppm,2)} ppm ${basisLabel}</span></div>
      <div class="influent-dose-result-grid">
        ${resultCard('Produktbedarf',formatGerman(calculated.productKgDay,2),'kg/d','primary')}
        ${resultCard('Produktvolumen',calculated.productLDay!==null?formatGerman(calculated.productLDay,2):'–','L/d')}
        ${resultCard('Dosierleistung',calculated.productLHour!==null?formatGerman(calculated.productLHour,3):'–','L/h','accent')}
        ${resultCard('Massenstrom',formatGerman(calculated.productKgHour,3),'kg/h')}
      </div>
      ${calculated.activeKgDay!==null?`<div class="influent-dose-active-line"><span>Wirkstoffmenge</span><strong>${formatGerman(calculated.activeKgDay,2)} kg/d</strong></div>`:''}
      <div class="influent-dose-periods"><div><span>30 Tage</span><strong>${formatGerman(calculated.monthKg,1)} kg${calculated.monthL!==null?` · ${formatGerman(calculated.monthL,1)} L`:''}</strong></div><div><span>365 Tage</span><strong>${formatGerman(calculated.yearKg,1)} kg${calculated.yearL!==null?` · ${formatGerman(calculated.yearL,1)} L`:''}</strong></div></div>
      <p class="influent-dose-formula">Q<sub>d</sub> × ppm ÷ 1.000 = ${formatGerman(calculated.basisKgDay,3)} kg/d ${basisLabel}. ${calculated.basis==='active'?'Der Handelsproduktbedarf wird anschließend über den Wirkstoffgehalt korrigiert.':''}</p>`;
  });

  try{
    const prefill=JSON.parse(sessionStorage.getItem('vta-influent-dosing-prefill-v1')||'null');
    if(prefill?.productId&&products.some(item=>String(item.id)===String(prefill.productId))){
      productSelect.value=String(prefill.productId);
      applyProduct();
      sessionStorage.removeItem('vta-influent-dosing-prefill-v1');
    }
  }catch{}
}

export const influentDosingCalculator={
  id:'influent-dosing',
  category:'Chemikalien',
  name:'Dosierung nach Zulaufmenge',
  short:'Produktbedarf aus Tageszulauf und ppm berechnen – vorbereitet für Produktdaten.',
  formula:'m = Qd × ppm ÷ 1.000',
  render
};
