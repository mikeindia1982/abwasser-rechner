import {$,number,money,metric,hint,numberField,selectField,fieldHtml,readFields} from "./utils.js";

const ATOMIC={P:30.973762,Fe:55.845,Al:26.9815385,Cl:35.45,S:32.065,O:15.999,Na:22.989769};
export const PRECIPITANTS={
  "Eisen(III)-chlorid":{formula:"FeCl₃",metal:"Fe",molarMass:162.204,metalAtoms:1,chlorideAtoms:3,sulfateGroups:0,sodiumAtoms:0,density:1.42,metalShare:13.7,ratio:1.8,note:"Molare Masse für wasserfreies FeCl₃. Handelslösungen werden über den tatsächlichen Fe-Gehalt und die Dichte berechnet."},
  "Eisen(II)-chlorid":{formula:"FeCl₂",metal:"Fe",molarMass:126.751,metalAtoms:1,chlorideAtoms:2,sulfateGroups:0,sodiumAtoms:0,density:1.30,metalShare:10.0,ratio:1.8,note:"Molare Masse für wasserfreies FeCl₂. Hydratstufe und Handelskonzentration laut Produktdatenblatt prüfen."},
  "Eisen(III)-sulfat":{formula:"Fe₂(SO₄)₃",metal:"Fe",molarMass:399.877,metalAtoms:2,chlorideAtoms:0,sulfateGroups:3,sodiumAtoms:0,density:1.50,metalShare:11.5,ratio:1.8,note:"Molare Masse für wasserfreies Fe₂(SO₄)₃. Flüssige Produkte können abweichende Zusammensetzungen aufweisen."},
  "Eisen(III)-chloridsulfat":{formula:"variabel",metal:"Fe",molarMass:null,metalAtoms:null,chlorideAtoms:null,sulfateGroups:null,sodiumAtoms:0,density:1.50,metalShare:11.5,ratio:1.8,note:"Gemischtes bzw. polymeres Handelsprodukt. Keine eindeutige Summenformel; Ioneneinträge nur mit Herstellerdaten belastbar."},
  "Aluminiumsulfat":{formula:"Al₂(SO₄)₃",metal:"Al",molarMass:342.151,metalAtoms:2,chlorideAtoms:0,sulfateGroups:3,sodiumAtoms:0,density:1.30,metalShare:4.2,ratio:1.5,note:"Molare Masse für wasserfreies Al₂(SO₄)₃. Bei Hydraten ist die molare Masse entsprechend höher."},
  "Natriumaluminat":{formula:"NaAlO₂",metal:"Al",molarMass:81.970,metalAtoms:1,chlorideAtoms:0,sulfateGroups:0,sodiumAtoms:1,density:1.45,metalShare:20.0,ratio:1.5,note:"Molare Masse für NaAlO₂. Handelslösungen können als Na₂O/Al₂O₃ deklariert sein; Produktdatenblatt beachten."},
  "Polyaluminiumchlorid (PAC)":{formula:"variabel",metal:"Al",molarMass:null,metalAtoms:null,chlorideAtoms:null,sulfateGroups:0,sodiumAtoms:0,density:1.25,metalShare:5.3,ratio:1.5,note:"Polymeres Produkt ohne eindeutige molare Masse. Berechnung des Handelsproduktes erfolgt über den Al-Gehalt."},
  "Benutzerdefiniert":{formula:"frei",metal:"Fe",molarMass:null,metalAtoms:null,chlorideAtoms:null,sulfateGroups:null,sodiumAtoms:null,density:1.00,metalShare:10.0,ratio:1.8,note:"Eigene Produktdaten eintragen. Molare Salzdetails sind nur mit definierter Summenformel möglich."}
};

export const precipitationCalculator={id:"precipitation",category:"Phosphor & Chemie",name:"Erweiterter Fällmittelrechner",short:"Molare Stoffmengen, reines Salz, Handelsprodukt und Ioneneintrag",formula:"P-Fracht → kmol P → kmol Metall → Salz → Handelsprodukt",render};

function render(workspace){
  const products=Object.keys(PRECIPITANTS);
  workspace.innerHTML=`<p class="eyebrow">Phosphor &amp; Chemie</p><h2>Erweiterter Fällmittelrechner</h2><span class="formula">P-Fracht → Stoffmenge → Metall → Salz → Handelsprodukt</span><p class="description">Berechnet den elementaren Fe- oder Al-Bedarf und – soweit chemisch eindeutig – die theoretische Menge des reinen Fällsalzes einschließlich Chlorid-, Sulfat- oder Natriumeintrag.</p>
  <form id="calculatorForm">
    <p class="section-title">Anlagendaten</p><div class="fields">${[
      numberField("q","Volumenstrom","m³/d",0.000001),numberField("pCurrent","Aktueller P-Wert","mg P/l",0),numberField("pTarget","Zielwert","mg P/l",0),numberField("hours","Dosierzeit","h/d",0.000001,24,24)
    ].map(fieldHtml).join("")}</div>
    <p class="section-title">Fällmittel</p><div class="fields">
      ${fieldHtml(selectField("product","Produkt",products))}
      ${fieldHtml(selectField("metal","Metall",["Fe","Al"]))}
      ${fieldHtml(numberField("density","Produktdichte","kg/l",0.000001))}
      ${fieldHtml(numberField("metalShare","Metallgehalt","%",0.000001,100))}
      ${fieldHtml(numberField("ratio","Metall/P-Molverhältnis","mol/mol",0.000001))}
      ${fieldHtml(numberField("safety","Sicherheitszuschlag","%",0,300,10))}
      ${fieldHtml(numberField("price","Produktpreis","€/kg",0,Infinity,0))}
    </div>
    <div id="productInfo" class="info-box"></div>
    <div class="form-actions"><button class="button primary">Berechnen</button><button type="button" id="resetForm" class="button secondary">Zurücksetzen</button></div>
  </form><div id="result"></div>`;
  const fields=[numberField("q","","",.000001),numberField("pCurrent","","",0),numberField("pTarget","","",0),numberField("hours","","",.000001,24),selectField("product","",products),selectField("metal","",["Fe","Al"]),numberField("density","","",.000001),numberField("metalShare","","",.000001,100),numberField("ratio","","",.000001),numberField("safety","","",0,300),numberField("price","","",0)];
  const apply=name=>{
    const p=PRECIPITANTS[name];$("#field-metal").value=p.metal;$("#field-density").value=String(p.density).replace(".",",");$("#field-metalShare").value=String(p.metalShare).replace(".",",");$("#field-ratio").value=String(p.ratio).replace(".",",");
    $("#productInfo").innerHTML=`<strong>${name} · ${p.formula}</strong><br>${p.note}${p.molarMass?`<br>Molare Masse des reinen Salzes: <strong>${number(p.molarMass,3)} kg/kmol</strong>.`:""}`;
  };
  $("#field-product").addEventListener("change",event=>apply(event.target.value));apply(products[0]);
  $("#resetForm").onclick=()=>render(workspace);
  $("#calculatorForm").onsubmit=event=>{event.preventDefault();const v=readFields(fields);if(!v)return;calculate(v,$("#result"));};
}

function calculate(v,out){
  if(v.pTarget>=v.pCurrent){out.innerHTML=hint("Eingaben prüfen","Der Zielwert muss kleiner als der aktuelle P-Wert sein.","warning");return;}
  const product=PRECIPITANTS[v.product],deltaP=v.pCurrent-v.pTarget,pLoad=v.q*deltaP/1000,pKmol=pLoad/ATOMIC.P;
  const metalKmol=pKmol*v.ratio*(1+v.safety/100),metalMass=metalKmol*ATOMIC[v.metal];
  const productKg=metalMass/(v.metalShare/100),productL=productKg/v.density,productLh=productL/v.hours,specific=productL*1000/v.q,costDay=productKg*v.price;
  let pureSaltMass=null,saltKmol=null,chloride=null,sulfate=null,sodium=null;
  if(product.molarMass&&product.metalAtoms&&product.metal===v.metal){
    saltKmol=metalKmol/product.metalAtoms;pureSaltMass=saltKmol*product.molarMass;
    if(product.chlorideAtoms!==null)chloride=saltKmol*product.chlorideAtoms*ATOMIC.Cl;
    if(product.sulfateGroups!==null)sulfate=saltKmol*product.sulfateGroups*(ATOMIC.S+4*ATOMIC.O);
    if(product.sodiumAtoms!==null)sodium=saltKmol*product.sodiumAtoms*ATOMIC.Na;
  }
  const ratioKind=v.ratio<1.2||v.ratio>3?"warning":"ok";
  const ratioText=v.ratio<1.2?"Niedriger Ansatz. Erreichbarkeit des Zielwerts und Konkurrenzreaktionen prüfen.":v.ratio>3?"Hoher Ansatz. Dosierstelle, Messpunkt, Phosphorrücklösung und Nebenreaktionen prüfen.":"Orientierender Arbeitsbereich; die tatsächliche optimale Dosierung ist anlagenbezogen zu validieren.";
  const details=[
    ["Zu entfernende P-Fracht",`${number(pLoad,4)} kg P/d`],["Stoffmenge P",`${number(pKmol,6)} kmol P/d`],["Stoffmenge ${v.metal}",`${number(metalKmol,6)} kmol ${v.metal}/d`],[`Elementarer ${v.metal}-Bedarf`,`${number(metalMass,4)} kg/d`]
  ];
  if(pureSaltMass!==null){details.push(["Stoffmenge reines Salz",`${number(saltKmol,6)} kmol/d`],["Theoretisches reines Salz",`${number(pureSaltMass,3)} kg/d`]);}
  out.innerHTML=`<section class="result-hero"><small>Erforderlicher Bedarf des Handelsproduktes</small><strong>${number(productL,2)} l/d</strong><p>${number(productKg,2)} kg/d · ${number(productLh,2)} l/h bei ${number(v.hours,1)} h/d</p></section>
  <div class="metrics">${metric("ΔP",number(deltaP,3)+" mg P/l")}${metric("P-Fracht",number(pLoad,3)+" kg P/d")}${metric("Metallbedarf",number(metalMass,3)+" kg "+v.metal+"/d")}${metric("Theoretisches Salz",pureSaltMass===null?"nicht eindeutig":number(pureSaltMass,2)+" kg/d")}${metric("Spezifische Dosierung",number(specific,2)+" ml/m³")}${metric("Kosten pro Tag",money(costDay))}${metric("Kosten pro Monat",money(costDay*30))}${metric("Kosten pro Jahr",money(costDay*365))}</div>
  ${hint("Molverhältnis",ratioText,ratioKind)}
  <p class="section-title">Molare Berechnungsdetails</p><table class="detail-table"><thead><tr><th>Berechnungsschritt</th><th>Ergebnis</th></tr></thead><tbody>${details.map(row=>`<tr><td>${row[0]}</td><td>${row[1]}</td></tr>`).join("")}</tbody></table>
  ${pureSaltMass===null?hint("Produktchemie","Für dieses Produkt ist keine eindeutige Summenformel hinterlegt. Der Handelsproduktbedarf über den tatsächlichen Metallgehalt bleibt dennoch berechenbar."):hint("Theoretischer Ioneneintrag",`${chloride!==null?`Chlorid: ${number(chloride,3)} kg Cl⁻/d. `:""}${sulfate!==null?`Sulfat: ${number(sulfate,3)} kg SO₄²⁻/d. `:""}${sodium!==null?`Natrium: ${number(sodium,3)} kg Na/d.`:""} Die Werte gelten für die angenommene reine Summenformel; reale Handelsprodukte und Nebenbestandteile können abweichen.`)}
  ${hint("Rechenweg",`ΔP = ${number(v.pCurrent,3)} − ${number(v.pTarget,3)} = ${number(deltaP,3)} mg/l. Stoffmenge P = ${number(pLoad,4)} kg/d ÷ ${number(ATOMIC.P,6)} kg/kmol. Metallbedarf berücksichtigt ${number(v.ratio,2)} mol ${v.metal}/mol P und ${number(v.safety,1)} % Zuschlag.`)}`;
}
