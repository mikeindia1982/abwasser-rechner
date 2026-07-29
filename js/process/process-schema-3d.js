const esc=value=>String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"})[char]);

const FLOW_NODE_TYPE_LABELS={water:"Wasser",sludge:"Schlamm",chemical:"Chemikalien",general:"Allgemein"};
const FLOW_FILTERS=["all","water","sludge","chemical"];
const PORT_DIRECTIONS=["in","out"];
const VIEWBOX={width:1080,height:620,marginX:72,marginY:52};
const PHOTO_PIPE_PATHS={
  "conn-inlet-screen":"M 7.8 24 L 15.8 24 Q 17.2 24 18 24.8 L 22.2 24.8 Q 23.4 24.8 24 24",
  "conn-screen-grit":"M 24 24 L 32.1 24 Q 33.2 24 34 24.6 L 38.8 24.6 Q 39.6 24.6 40 24",
  "conn-grit-primary":"M 40 24 L 47 24 Q 49.5 24 52 24.8 L 56.8 25.8 Q 57.6 26 58 26",
  "conn-primary-aeration":"M 58 26 L 53 26 Q 50.5 26 48.4 27.3 L 37.8 34.2 Q 33.6 37 30.6 40.6 L 25.2 47",
  "conn-aeration-clarifier":"M 24 44 L 30 44 Q 35 44 40 43.9 L 48 43.8 Q 51.4 43.8 54 44",
  "conn-clarifier-outlet":"M 54 44 L 63.5 44 Q 70.5 44 77.5 44 L 84 44",
  "conn-primary-sludge":"M 58 26 L 53.8 26 Q 50.8 26 47.9 27.8 L 36.2 35.6 Q 27.6 41.5 21.2 49.4 L 12.8 61.2 Q 10.8 64 10 66.4 L 10 72",
  "conn-sludge-storage":"M 10 72 L 18.2 72 Q 24.2 72 30 72",
  "conn-storage-dewatering":"M 30 72 L 39.5 72 Q 46.2 72 54 72",
  "conn-polymer-dewatering":"M 74 62 L 69.8 62 Q 66 62 63.2 64.2 L 58 68.2 Q 55.8 69.9 54 72",
  "conn-dewatering-container":"M 54 72 L 62.8 73.4 Q 68.6 74.4 73.3 77.2 L 79.2 80.4 Q 80.8 81.2 82 82"
};
const PHOTO_HOTSPOT_POSITIONS={
  inlet:{x:7.6,y:23.8},
  screen:{x:23.8,y:24.2},
  grit:{x:39.6,y:24.1},
  primary:{x:57.7,y:25.8},
  aeration:{x:24.4,y:43.8},
  clarifier:{x:53.8,y:43.7},
  outlet:{x:84.1,y:44.1},
  sludge:{x:9.8,y:72.1},
  storage:{x:30.2,y:72.2},
  dewatering:{x:54.1,y:72.1},
  polymer:{x:74.2,y:62.1},
  container:{x:82.3,y:82.2}
};

function generateId(){return globalThis.crypto?.randomUUID?.()||`flow-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;}
function defaultPorts(type){return [{id:`${type}-in`,label:"Eingang",type,direction:"in"},{id:`${type}-out`,label:"Ausgang",type,direction:"out"}];}
export function defaultFlowSchema(){return {
  nodes:[
    {id:"inlet",label:"Zulaufbauwerk",type:"water",x:8,y:24,z:8,ports:defaultPorts("water")},
    {id:"screen",label:"Rechen",type:"water",x:24,y:24,z:4,ports:defaultPorts("water")},
    {id:"grit",label:"Sandfang",type:"water",x:40,y:24,z:4,ports:defaultPorts("water")},
    {id:"primary",label:"Vorklärbecken",type:"water",x:58,y:26,z:2,ports:defaultPorts("water")},
    {id:"aeration",label:"Belebungsbecken",type:"water",x:24,y:44,z:10,ports:defaultPorts("water")},
    {id:"clarifier",label:"Nachklärung",type:"water",x:54,y:44,z:6,ports:defaultPorts("water")},
    {id:"outlet",label:"Ablaufbauwerk",type:"water",x:84,y:44,z:2,ports:defaultPorts("water")},
    {id:"sludge",label:"Schlammpumpwerk",type:"sludge",x:10,y:72,z:6,ports:defaultPorts("sludge")},
    {id:"storage",label:"Schlamspeicher",type:"sludge",x:30,y:72,z:2,ports:defaultPorts("sludge")},
    {id:"dewatering",label:"Schlammentwässerung",type:"sludge",x:54,y:72,z:12,ports:defaultPorts("sludge")},
    {id:"polymer",label:"Polymerstation",type:"chemical",x:74,y:62,z:8,ports:defaultPorts("chemical")},
    {id:"container",label:"Container / Lager",type:"sludge",x:82,y:82,z:4,ports:defaultPorts("sludge")}
  ],
  connections:[
    {id:"conn-inlet-screen",sourceNodeId:"inlet",sourcePortId:"inlet-out",targetNodeId:"screen",targetPortId:"screen-in",type:"water"},
    {id:"conn-screen-grit",sourceNodeId:"screen",sourcePortId:"screen-out",targetNodeId:"grit",targetPortId:"grit-in",type:"water"},
    {id:"conn-grit-primary",sourceNodeId:"grit",sourcePortId:"grit-out",targetNodeId:"primary",targetPortId:"primary-in",type:"water"},
    {id:"conn-primary-aeration",sourceNodeId:"primary",sourcePortId:"primary-out",targetNodeId:"aeration",targetPortId:"aeration-in",type:"water"},
    {id:"conn-aeration-clarifier",sourceNodeId:"aeration",sourcePortId:"aeration-out",targetNodeId:"clarifier",targetPortId:"clarifier-in",type:"water"},
    {id:"conn-clarifier-outlet",sourceNodeId:"clarifier",sourcePortId:"clarifier-out",targetNodeId:"outlet",targetPortId:"outlet-in",type:"water"},
    {id:"conn-primary-sludge",sourceNodeId:"primary",sourcePortId:"primary-out",targetNodeId:"sludge",targetPortId:"sludge-in",type:"sludge"},
    {id:"conn-sludge-storage",sourceNodeId:"sludge",sourcePortId:"sludge-out",targetNodeId:"storage",targetPortId:"storage-in",type:"sludge"},
    {id:"conn-storage-dewatering",sourceNodeId:"storage",sourcePortId:"storage-out",targetNodeId:"dewatering",targetPortId:"dewatering-in",type:"sludge"},
    {id:"conn-polymer-dewatering",sourceNodeId:"polymer",sourcePortId:"polymer-out",targetNodeId:"dewatering",targetPortId:"dewatering-in",type:"chemical"},
    {id:"conn-dewatering-container",sourceNodeId:"dewatering",sourcePortId:"dewatering-out",targetNodeId:"container",targetPortId:"container-in",type:"sludge"}
  ],
  filters:{selectedType:"all"},
  ui:{showLabels:true,motionPaused:false,editMode:false,selectedNodeId:null}
};}

export function normalizeFlowSchema(value={}){
  const source=value&&typeof value==="object"?value:{};
  const nodes=Array.isArray(source.nodes)?source.nodes.map(node=>({
    id:node.id||generateId(),
    label:node.label||"Unbenannte Komponente",
    type:FLOW_NODE_TYPE_LABELS[node.type]?node.type:"general",
    x:Number(node.x)||0,
    y:Number(node.y)||0,
    z:Number(node.z)||0,
    ports:Array.isArray(node.ports)?node.ports.map(port=>({
      id:port.id||generateId(),
      label:port.label||"Anschluss",
      type:FLOW_NODE_TYPE_LABELS[port.type]?port.type:node.type||"general",
      direction:PORT_DIRECTIONS.includes(port.direction)?port.direction:"out"
    })):defaultPorts(node.type||"general")
  })):[
  ];
  const nodeIds=new Set(nodes.map(n=>n.id));
  const connections=Array.isArray(source.connections)?source.connections.map(conn=>({
    id:conn.id||generateId(),
    sourceNodeId:conn.sourceNodeId,
    sourcePortId:conn.sourcePortId,
    targetNodeId:conn.targetNodeId,
    targetPortId:conn.targetPortId,
    type:FLOW_NODE_TYPE_LABELS[conn.type]?conn.type:"water"
  })).filter(conn=>nodeIds.has(conn.sourceNodeId)&&nodeIds.has(conn.targetNodeId)):[
  ];
  return {
    nodes,
    connections,
    filters:{selectedType:FLOW_FILTERS.includes(source.filters?.selectedType)?source.filters.selectedType:"all"},
    ui:{
      showLabels:source.ui?.showLabels!==false,
      motionPaused:Boolean(source.ui?.motionPaused),
      editMode:Boolean(source.ui?.editMode),
      selectedNodeId:source.ui?.selectedNodeId||null
    }
  };
}

function labelForType(type){return FLOW_NODE_TYPE_LABELS[type]||type||"Unbekannt";}
function getNode(schema,id){return schema.nodes.find(node=>node.id===id)||null;}
function getPort(node,id){return node?.ports?.find(port=>port.id===id)||null;}
function centerPosition(node){
  return {
    x:Math.round(VIEWBOX.marginX + (node.x/100)*(VIEWBOX.width-2*VIEWBOX.marginX)),
    y:Math.round(VIEWBOX.marginY + (node.y/100)*(VIEWBOX.height-2*VIEWBOX.marginY))
  };
}
function connectionPosition(node,portId){
  const center=centerPosition(node);
  const port=getPort(node,portId);
  if(!port) return center;
  return {x:center.x + (port.direction==="out"?78:-78),y:center.y};
}
function getVisibleNodes(schema){
  return schema.nodes.filter(node=>schema.filters.selectedType==="all"||node.type===schema.filters.selectedType);
}
function getVisibleConnections(schema){
  const visibleIds=new Set(getVisibleNodes(schema).map(node=>node.id));
  return schema.connections.filter(conn=>visibleIds.has(conn.sourceNodeId)&&visibleIds.has(conn.targetNodeId));
}
function renderConnection(conn,schema){
  const source=getNode(schema,conn.sourceNodeId);
  const target=getNode(schema,conn.targetNodeId);
  if(!source||!target) return "";
  const from=connectionPosition(source,conn.sourcePortId);
  const to=connectionPosition(target,conn.targetPortId);
  const dx=Math.max(120,Math.abs(to.x-from.x)*0.35);
  const path=`M ${from.x} ${from.y} C ${from.x+dx} ${from.y} ${to.x-dx} ${to.y} ${to.x} ${to.y}`;
  return `<path d="${path}" class="schema-flow ${esc(conn.type)}" data-schema-connection="${esc(conn.id)}" aria-hidden="true"/>`;
}
function renderConnections(schema){
  return `<svg class="schema-connections" viewBox="0 0 ${VIEWBOX.width} ${VIEWBOX.height}" preserveAspectRatio="none" aria-hidden="true">${getVisibleConnections(schema).map(conn=>renderConnection(conn,schema)).join("")}</svg>`;
}
function flowTypeClass(type){
  if(type==="sludge") return "sludge";
  if(type==="chemical") return "polymer";
  return "water";
}
function pipeProfileClass(type){
  if(type==="sludge") return "pipe-sludge";
  if(type==="chemical") return "pipe-polymer";
  return "pipe-water";
}
function flowPathPercent(conn,schema){
  if(PHOTO_PIPE_PATHS[conn.id]) return PHOTO_PIPE_PATHS[conn.id];
  const source=getNode(schema,conn.sourceNodeId);
  const target=getNode(schema,conn.targetNodeId);
  if(!source||!target) return "";
  const fromX=Math.max(2,Math.min(98,source.x));
  const fromY=Math.max(2,Math.min(98,source.y));
  const toX=Math.max(2,Math.min(98,target.x));
  const toY=Math.max(2,Math.min(98,target.y));
  const midX=Math.round((fromX+toX)/2*10)/10;
  const bend=2.4;
  return `M ${fromX} ${fromY} L ${midX-bend} ${fromY} Q ${midX} ${fromY} ${midX} ${fromY+bend} L ${midX} ${toY-bend} Q ${midX} ${toY} ${midX+bend} ${toY} L ${toX} ${toY}`;
}
function flowPathEndpoints(path,fallbackSource,fallbackTarget){
  const values=[...String(path).matchAll(/-?\d*\.?\d+/g)].map(match=>Number(match[0])).filter(Number.isFinite);
  if(values.length<4){
    return {
      start:{x:fallbackSource.x,y:fallbackSource.y},
      end:{x:fallbackTarget.x,y:fallbackTarget.y}
    };
  }
  return {
    start:{x:values[0],y:values[1]},
    end:{x:values[values.length-2],y:values[values.length-1]}
  };
}
function renderPhotoFlowLayer(schema){
  const visible=getVisibleConnections(schema);
  const pipes=visible.map(conn=>{
    const path=flowPathPercent(conn,schema);
    const tone=flowTypeClass(conn.type);
    const profile=pipeProfileClass(conn.type);
    return `<g class="photo-process-pipe ${profile}"><path d="${path}" class="pipe-shell"/><path d="${path}" class="pipe-core ${tone}"/></g>`;
  }).join("");
  const joints=visible.map(conn=>{
    const source=getNode(schema,conn.sourceNodeId);
    const target=getNode(schema,conn.targetNodeId);
    if(!source||!target) return "";
    const points=flowPathEndpoints(flowPathPercent(conn,schema),source,target);
    return `<g class="photo-process-joints"><circle cx="${points.start.x}" cy="${points.start.y}" r="0.8"/><circle cx="${points.end.x}" cy="${points.end.y}" r="0.8"/></g>`;
  }).join("");
  return `<svg class="photo-process-flow-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${pipes}${joints}</svg>`;
}
function hotspotPosition(node){
  const override=PHOTO_HOTSPOT_POSITIONS[node.id];
  if(override) return override;
  return {x:node.x,y:node.y};
}
function renderPhotoHotspot(node,index,schema){
  const selected=schema.ui.selectedNodeId===node.id;
  const pos=hotspotPosition(node);
  return `<button type="button" class="photo-process-hotspot${selected?" active":""}" data-schema-node="${esc(node.id)}" data-schema-type="${esc(node.type)}" style="--x:${pos.x}%;--y:${pos.y}%;--delay:${index*24}ms" aria-label="${esc(node.label)} auswählen">
    <span class="photo-process-dot"></span>
    <span class="photo-process-label">${esc(node.label)}</span>
  </button>`;
}
function renderPhotoHotspots(schema){
  return `<div class="photo-process-hotspots">${getVisibleNodes(schema).map((node,index)=>renderPhotoHotspot(node,index,schema)).join("")}</div>`;
}
function renderPhotoStage(schema){
  return `<img src="plant-hero-base.png" alt="Fotorealistisches Prozessschema der Kläranlage">
    ${renderPhotoHotspots(schema)}`;
}
function renderNode(node,index){
  return `<button type="button" class="schema-node schema-node-${esc(node.type)}" data-schema-node="${esc(node.id)}" data-schema-type="${esc(node.type)}" style="--schema-x:${node.x}%;--schema-y:${node.y}%;--schema-z:${node.z}px;--schema-delay:${index*24}ms">
    <span class="schema-node-icon"></span>
    <strong>${esc(node.label)}</strong>
    <small>${esc(labelForType(node.type))}</small>
    <div class="schema-node-ports">${node.ports.map(port=>`<span class="schema-port ${esc(port.direction)}" title="${esc(port.label)}">${esc(port.direction)}</span>`).join("")}</div>
  </button>`;
}
function renderNodeList(schema){
  return getVisibleNodes(schema).map(renderNode).join("");
}
function renderValidation(schema){
  const issues=[];
  schema.nodes.forEach(node=>{
    const connected=schema.connections.some(conn=>conn.sourceNodeId===node.id||conn.targetNodeId===node.id);
    if(!connected) issues.push(`Komponente ${node.label} ist nicht verbunden.`);
  });
  if(!issues.length) return `<div class="schema-validation"><strong>Schema validiert</strong><p>Alle Komponenten sind mit mindestens einem Strom verbunden.</p></div>`;
  return `<div class="schema-validation schema-validation-warning"><strong>Validierungswarnungen</strong><ul>${issues.map(issue=>`<li>${esc(issue)}</li>`).join("")}</ul></div>`;
}
function renderDetail(schema,plant){
  const selected=getNode(schema,schema.ui.selectedNodeId);
  if(!selected){
    return `<p class="eyebrow">Anlagenschema</p><h3>Komponente auswählen</h3><p>Wähle eine Komponente, um Details anzuzeigen oder das Schema zu bearbeiten.</p><div>${renderValidation(schema)}</div>`;
  }
  const connectedFrom=schema.connections.filter(conn=>conn.sourceNodeId===selected.id);
  const connectedTo=schema.connections.filter(conn=>conn.targetNodeId===selected.id);
  const otherNodes=schema.nodes.filter(node=>node.id!==selected.id);
  return `<p class="eyebrow">Komponenteninformation</p><h3>${esc(selected.label)}</h3><p>${esc(labelForType(selected.type))}</p>
    <dl>
      <div><dt>Position</dt><dd>${selected.x} % × ${selected.y} %</dd></div>
      <div><dt>Höhe</dt><dd>${selected.z}px</dd></div>
      <div><dt>Anschlüsse</dt><dd>${selected.ports.length}</dd></div>
      <div><dt>Node-ID</dt><dd>${esc(selected.id)}</dd></div>
    </dl>
    <div class="schema-detail-connections"><strong>Verbindungen</strong><ul>${[...connectedTo,...connectedFrom].map(conn=>{
      const source=getNode(schema,conn.sourceNodeId);
      const target=getNode(schema,conn.targetNodeId);
      return `<li>${esc(source?.label||"?")} → ${esc(target?.label||"?")} (${esc(labelForType(conn.type))})</li>`;
    }).join("")||"<li>Keine Verbindungen</li>"}</ul></div>
    ${schema.ui.editMode?`<form id="schemaNodeEditForm" class="schema-detail-form"><div class="field"><label for="schemaNodeLabel">Name</label><input id="schemaNodeLabel" name="schemaNodeLabel" type="text" value="${esc(selected.label)}"></div><div class="field"><label for="schemaNodeType">Typ</label><select id="schemaNodeType" name="schemaNodeType">${Object.entries(FLOW_NODE_TYPE_LABELS).map(([value,label])=>`<option value="${esc(value)}"${value===selected.type?" selected":""}>${esc(label)}</option>`).join("")}</select></div></form>
      <form id="schemaConnectionForm" class="schema-detail-form"><fieldset><legend>Neue Verbindung</legend><div class="field"><label for="schemaConnectionTarget">Ziel</label><select id="schemaConnectionTarget" name="schemaConnectionTarget">${otherNodes.map(node=>`<option value="${esc(node.id)}">${esc(node.label)} (${esc(labelForType(node.type))})</option>`).join("")}</select></div><div class="field"><label for="schemaConnectionType">Flusstyp</label><select id="schemaConnectionType" name="schemaConnectionType">${Object.entries(FLOW_NODE_TYPE_LABELS).map(([value,label])=>`<option value="${esc(value)}"${value===selected.type?" selected":""}>${esc(label)}</option>`).join("")}</select></div><button type="submit" class="button primary compact">Verbindung hinzufügen</button></fieldset></form>`:""}`;
}

export function renderProcessSchema3D(plant){
  const plantName=plant?.master?.name||plant?.name||"Anlage";
  const schema=plant?.flowSchema||defaultFlowSchema();
  return `<section class="dashboard-section schema3d-section">
    <div class="section-heading"><div><p class="eyebrow">Anlagenübersicht</p><h2>Interaktives Prozessschema</h2><p class="form-note">Fotorealistische Ansicht mit klickbaren Anlagenteilen. Filtere Komponenten und bearbeite Verbindungen wie gewohnt.</p></div><div class="schema-toolbar"><div class="schema-filter-group">${FLOW_FILTERS.map(type=>`<button type="button" class="button secondary compact${schema.filters.selectedType===type?" active":""}" data-schema-filter="${esc(type)}">${esc(type==="all"?"Alle":labelForType(type))}</button>`).join("")}</div><button type="button" class="button secondary compact" id="schemaToggleMotion">${schema.ui.motionPaused?"Animation starten":"Animation pausieren"}</button><button type="button" class="button secondary compact" id="schemaToggleLabels">${schema.ui.showLabels?"Beschriftung ausblenden":"Beschriftung einblenden"}</button><button type="button" class="button secondary compact" id="schemaEditMode">${schema.ui.editMode?"Bearbeitung verlassen":"Bearbeitungsmodus"}</button><button type="button" class="button secondary compact" id="schemaResetView">Zurücksetzen</button></div></div>
    <div class="schema3d-layout photo-process-layout"><div class="schema-stage-shell photo-process-shell"><div id="schemaStageWrapper" class="photo-process-stage${schema.ui.motionPaused?" motion-paused":""}${schema.ui.showLabels?"":" labels-hidden"}">${renderPhotoStage(schema)}</div></div><aside class="schema-detail" id="schemaDetail">${renderDetail(schema,plant)}</aside></div>
  </section>`;
}

function applyUpdate(root,schema,onChange){
  const stage=root.querySelector("#schemaStageWrapper");
  const detail=root.querySelector("#schemaDetail");
  if(stage){
    stage.innerHTML=renderPhotoStage(schema);
    stage.classList.toggle("motion-paused",Boolean(schema.ui.motionPaused));
    stage.classList.toggle("labels-hidden",!schema.ui.showLabels);
  }
  if(detail) detail.innerHTML = renderDetail(schema);
  root.querySelectorAll("[data-schema-filter]").forEach(button=>button.classList.toggle("active",button.dataset.schemaFilter===schema.filters.selectedType));
  const editButton=root.querySelector("#schemaEditMode"); if(editButton) editButton.textContent = schema.ui.editMode?"Bearbeitung verlassen":"Bearbeitungsmodus";
  const motionButton=root.querySelector("#schemaToggleMotion"); if(motionButton) motionButton.textContent = schema.ui.motionPaused?"Animation starten":"Animation pausieren";
  const labelsButton=root.querySelector("#schemaToggleLabels"); if(labelsButton) labelsButton.textContent = schema.ui.showLabels?"Beschriftung ausblenden":"Beschriftung einblenden";
  if(typeof onChange==="function") onChange(schema);
}

export function bindProcessSchema3D(root=document,plant,onChange){
  if(!plant) return;
  plant.flowSchema = normalizeFlowSchema(plant.flowSchema||defaultFlowSchema());
  const schema=plant.flowSchema;
  const container=root.querySelector(".schema3d-section");
  if(!container) return;
  function getSelectedNode(){return getNode(schema,schema.ui.selectedNodeId);}  
  function update(){
    if(container){
      applyUpdate(container,schema,onChange);
    }
  }
  container.addEventListener("click",event=>{
    const nodeButton=event.target.closest("[data-schema-node]");
    if(nodeButton){
      schema.ui.selectedNodeId=nodeButton.dataset.schemaNode||null;
      update();
      return;
    }
    const filterButton=event.target.closest("[data-schema-filter]");
    if(filterButton){
      schema.filters.selectedType=filterButton.dataset.schemaFilter||"all";
      if(!getVisibleNodes(schema).some(n=>n.id===schema.ui.selectedNodeId)) schema.ui.selectedNodeId=null;
      update();
      return;
    }
    if(event.target.closest("#schemaToggleMotion")){
      schema.ui.motionPaused=!schema.ui.motionPaused;
      update();
      return;
    }
    if(event.target.closest("#schemaToggleLabels")){
      schema.ui.showLabels=!schema.ui.showLabels;
      update();
      return;
    }
    if(event.target.closest("#schemaEditMode")){
      schema.ui.editMode=!schema.ui.editMode;
      update();
      return;
    }
    if(event.target.closest("#schemaResetView")){
      schema.filters.selectedType="all";
      schema.ui.showLabels=true;
      schema.ui.motionPaused=false;
      schema.ui.editMode=false;
      schema.ui.selectedNodeId=null;
      update();
      return;
    }
  });
  container.addEventListener("input",event=>{
    const node=getSelectedNode();
    if(!node) return;
    if(event.target.id==="schemaNodeLabel"){
      node.label=String(event.target.value||"").trim()||node.label;
      update();
      return;
    }
    if(event.target.id==="schemaNodeType"){
      const selected=String(event.target.value||"general");
      node.type=FLOW_NODE_TYPE_LABELS[selected]?selected:"general";
      update();
      return;
    }
  });
  container.addEventListener("submit",event=>{
    if(event.target.id!=="schemaConnectionForm") return;
    event.preventDefault();
    const node=getSelectedNode();
    if(!node) return;
    const targetId=String(container.querySelector("#schemaConnectionTarget")?.value||"");
    const type=String(container.querySelector("#schemaConnectionType")?.value||node.type);
    if(!targetId) return;
    if(targetId===node.id){alert("Quelle und Ziel dürfen nicht identisch sein.");return;}
    const target=getNode(schema,targetId);
    if(!target){alert("Zielknoten nicht gefunden.");return;}
    const sourcePort=node.ports.find(p=>p.direction==="out")?.id;
    const targetPort=target.ports.find(p=>p.direction==="in")?.id;
    if(!sourcePort||!targetPort){alert("Keine passenden Anschlüsse verfügbar.");return;}
    const exists=schema.connections.some(conn=>conn.sourceNodeId===node.id&&conn.targetNodeId===targetId&&conn.type===type);
    if(exists){alert("Diese Verbindung existiert bereits.");return;}
    schema.connections.push({id:generateId(),sourceNodeId:node.id,sourcePortId:sourcePort,targetNodeId:targetId,targetPortId:targetPort,type:type});
    update();
  });
  update();
}
