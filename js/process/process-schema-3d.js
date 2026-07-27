const esc=value=>String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);

const STAGES=[
  {id:"inlet",title:"Zulaufbauwerk",subtitle:"Abwasserzulauf",x:12,y:23,w:14,h:12},
  {id:"screen",title:"Rechen",subtitle:"Mechanische Reinigung",x:25,y:19,w:13,h:12},
  {id:"grit",title:"Sandfang",subtitle:"Sand- und Fettfang",x:40,y:18,w:15,h:13},
  {id:"primary",title:"Vorklärbecken",subtitle:"Primärschlammabzug",x:66,y:17,w:17,h:14},
  {id:"aeration",title:"Belebungsbecken",subtitle:"Biologische Reinigung",x:25,y:40,w:22,h:25},
  {id:"clarifier",title:"Nachklärbecken",subtitle:"Feststofftrennung",x:52,y:39,w:23,h:24},
  {id:"outlet",title:"Ablaufbauwerk",subtitle:"Gereinigtes Wasser",x:82,y:42,w:14,h:17},
  {id:"sludge",title:"Überschussschlamm",subtitle:"Schlammpumpwerk",x:8,y:69,w:18,h:20},
  {id:"storage",title:"Schlammspeicher",subtitle:"Zwischenspeicherung",x:28,y:68,w:23,h:24},
  {id:"dewatering",title:"Schlammentwässerung",subtitle:"Zentrifuge / Presse",x:54,y:69,w:20,h:20},
  {id:"polymer",title:"Polymerstation",subtitle:"Flockungsmittel",x:76,y:64,w:14,h:15},
  {id:"container",title:"Container / Lager",subtitle:"Entwässerter Schlamm",x:81,y:79,w:17,h:14}
];

function field(plant,paths,fallback=""){
  for(const path of paths){let value=plant;for(const key of path.split("."))value=value?.[key];if(value!==undefined&&value!==null&&String(value).trim())return value;}
  return fallback;
}
function stageDetails(stage,plant){
  const rows={
    inlet:[["Status","Aktiv"],["Volumenstrom",field(plant,["master.designFlow","master.flowRate"],"–")]],
    screen:[["Aggregat","Stufenrechen"],["Status","Betrieb"]],
    grit:[["Verfahren","Langsandfang"],["Status","Betrieb"]],
    primary:[["Bauwerk","Vorklärung"],["Räumer","Betrieb"]],
    aeration:[["Verfahren",field(plant,["master.mainProcess"],"Belebtschlamm")],["Belüftung","Betrieb"]],
    clarifier:[["Bauwerk","Nachklärung"],["Räumer","Betrieb"]],
    outlet:[["Status","Klarwasserablauf"],["Qualität","Prozessabhängig"]],
    sludge:[["Medium","Überschussschlamm"],["Pumpen","Anlagenakte"]],
    storage:[["Medium","Schlamm"],["Status","Verfügbar"]],
    dewatering:[["Verfahren",field(plant,["sludgeDewatering.process"],"Entwässerung")],["Hersteller",field(plant,["sludgeDewatering.manufacturer"],"–")]],
    polymer:[["Medium","Polymer"],["Dosierung","Zur Entwässerung"]],
    container:[["Bereich","Lager / Container"],["Status","Verfügbar"]]
  }[stage.id]||[];
  return rows.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");
}
function hotspots(plant){
  return STAGES.map((s,i)=>`<button type="button" class="photo-hotspot" data-photo-node="${s.id}" aria-label="${esc(s.title)} auswählen" style="--x:${s.x}%;--y:${s.y}%;--w:${s.w}%;--h:${s.h}%;--delay:${i*55}ms"><span class="photo-hotspot-dot"></span><span class="photo-hotspot-label"><strong>${esc(s.title)}</strong><small>${esc(s.subtitle)}</small></span></button>`).join("");
}
function templates(plant){
  return STAGES.map(s=>`<template data-photo-detail="${s.id}"><p class="eyebrow">Komponentenakte</p><h3>${esc(s.title)}</h3><p>${esc(s.subtitle)}</p><dl>${stageDetails(s,plant)}</dl></template>`).join("");
}
function svgOverlay(){
  return `<svg class="photo-flow-layer" viewBox="0 0 1271 827" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <filter id="flowGlow"><feGaussianBlur stdDeviation="2.2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <g class="flow water">
      <path d="M0 205 C160 200 250 210 350 215 S570 205 690 240 S845 260 990 250 S1120 290 1271 390"/>
      <path d="M390 250 C390 330 400 390 400 500 S520 545 650 520"/>
      <path d="M650 520 C760 520 830 500 910 485 S1050 470 1195 500"/>
    </g>
    <g class="flow sludge">
      <path d="M780 500 C750 570 640 610 540 630 S350 690 250 730"/>
      <path d="M250 730 C390 760 530 750 690 720 S860 690 990 730"/>
    </g>
    <g class="flow return">
      <path d="M890 520 C800 610 680 625 570 610 S430 590 405 520"/>
    </g>
    <g class="flow polymer">
      <path d="M1060 655 C980 670 930 690 875 720"/>
    </g>
    <g class="aeration-bubbles">
      ${[0,1,2,3,4,5,6,7,8].map(i=>`<circle cx="${360+i*24}" cy="${470-(i%3)*18}" r="4" style="--i:${i}"/>`).join("")}
    </g>
    <g class="clarifier-rotor" transform="translate(790 420)"><circle r="92"/><line x1="-80" y1="0" x2="80" y2="0"/><line x1="0" y1="-80" x2="0" y2="80"/></g>
  </svg>`;
}

export function renderProcessSchema3D(plant){
  const plantName=field(plant,["master.name","name"],"Anlage");
  return `<section class="dashboard-section photo-schema-section">
    <div class="section-heading photo-schema-heading"><div><p class="eyebrow">Anlagenübersicht</p><h2>Fotorealistisches, animiertes Anlagenschema</h2><p class="form-note">Medienströme und Aggregate sind animiert. Komponenten antippen, um technische Informationen zu öffnen.</p></div><div class="schema-toolbar"><button type="button" class="button secondary compact" id="schemaResetView">Ansicht zurücksetzen</button><button type="button" class="button secondary compact" id="schemaToggleLabels">Beschriftung ausblenden</button><button type="button" class="button secondary compact" id="schemaToggleMotion">Animation pausieren</button></div></div>
    <div class="photo-schema-layout"><div class="photo-schema-shell"><div class="photo-schema-canvas" id="schema3dStage" role="img" aria-label="Fotorealistisches Anlagenschema ${esc(plantName)}"><img src="plant-schema-photorealistic.webp" alt="Luftaufnahme einer kommunalen Kläranlage">${svgOverlay()}<div class="photo-hotspots">${hotspots(plant)}</div><div class="photo-schema-status"><span class="status-live"><i></i> Animation läuft</span><span>Antippen oder klicken zum Öffnen</span></div></div><div class="schema-legend photo-schema-legend"><span><i class="water"></i>Abwasser</span><span><i class="sludge"></i>Schlamm</span><span><i class="return"></i>Rücklaufschlamm</span><span><i class="chemical"></i>Polymer</span></div></div><aside class="schema-detail photo-schema-detail" id="schemaDetail"><p class="eyebrow">Anlagenschema</p><h3>Komponente auswählen</h3><p>Tippe auf ein Bauwerk oder Aggregat. Die zugehörigen Daten werden hier angezeigt.</p></aside></div>${templates(plant)}
  </section>`;
}

export function bindProcessSchema3D(root=document){
  const stage=root.querySelector("#schema3dStage"),detail=root.querySelector("#schemaDetail");if(!stage||!detail)return;
  const nodes=[...root.querySelectorAll("[data-photo-node]")];
  nodes.forEach(button=>button.addEventListener("click",()=>{nodes.forEach(n=>n.classList.toggle("active",n===button));stage.classList.add("has-selection");const t=root.querySelector(`template[data-photo-detail="${CSS.escape(button.dataset.photoNode)}"]`);if(t)detail.innerHTML=t.innerHTML;}));
  root.querySelector("#schemaToggleMotion")?.addEventListener("click",event=>{const paused=stage.classList.toggle("motion-paused");event.currentTarget.textContent=paused?"Animation starten":"Animation pausieren";const live=stage.querySelector(".status-live");if(live)live.innerHTML=paused?"<i></i> Animation pausiert":"<i></i> Animation läuft";});
  root.querySelector("#schemaToggleLabels")?.addEventListener("click",event=>{const hidden=stage.classList.toggle("labels-hidden");event.currentTarget.textContent=hidden?"Beschriftung einblenden":"Beschriftung ausblenden";});
  root.querySelector("#schemaResetView")?.addEventListener("click",()=>{stage.classList.remove("motion-paused","labels-hidden","has-selection");nodes.forEach(n=>n.classList.remove("active"));detail.innerHTML='<p class="eyebrow">Anlagenschema</p><h3>Komponente auswählen</h3><p>Tippe auf ein Bauwerk oder Aggregat. Die zugehörigen Daten werden hier angezeigt.</p>';const motion=root.querySelector("#schemaToggleMotion");if(motion)motion.textContent="Animation pausieren";const labels=root.querySelector("#schemaToggleLabels");if(labels)labels.textContent="Beschriftung ausblenden";});
}
