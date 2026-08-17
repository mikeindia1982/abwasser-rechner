(()=>{
  'use strict';
  if(globalThis.__ABWASSER_PREVIEW_TENANT__==='platform')return;

  const MODE_KEY='vta-workspace-mode-v01';
  const PROFILE_KEY='abwasser-employee-profile-v087';
  const PLANTS_KEY='abwasser-plants-v07';
  const ACTIVE_PLANT_KEY='abwasser-active-plant-v07';
  const REPORTS_KEY='vta-visit-reports-v01';
  const ORG_STATE_KEY='vta-demo-organization-state-v01';
  const ORG_VERSION_KEY='vta-demo-organization-version-v01';
  const ACTIVE_USER_KEY='vta-demo-active-user-v01';
  const OPEN_AFTER_RELOAD='vta-demo-open-cockpit-v01';
  const ORG_VERSION='1';

  const PERMISSION_LABELS={
    viewPlants:'Anlagen ansehen',
    editPlants:'Anlagen bearbeiten',
    runVisits:'Besuche durchführen',
    approveReports:'Berichte freigeben',
    manageTasks:'Aufgaben bearbeiten',
    viewTeam:'Teamdaten ansehen',
    manageUsers:'Mitarbeiter verwalten',
    manageRoles:'Rollen vergeben',
    viewAllRegions:'Alle Regionen ansehen',
    administration:'Administration'
  };

  const ROLES={
    admin:{id:'admin',label:'Administrator',short:'Admin',description:'Vollzugriff auf Organisation, Rollen, Mitarbeiter und alle Anlagen.',permissions:['viewPlants','editPlants','runVisits','approveReports','manageTasks','viewTeam','manageUsers','manageRoles','viewAllRegions','administration']},
    teamlead:{id:'teamlead',label:'Teamleitung',short:'Teamleitung',description:'Steuert ein Außendienstteam und sieht die zugehörigen Regionen.',permissions:['viewPlants','editPlants','runVisits','approveReports','manageTasks','viewTeam']},
    sales:{id:'sales',label:'Vertriebsingenieur',short:'Vertrieb',description:'Betreut zugewiesene Anlagen, Termine, Besuche und Berichte.',permissions:['viewPlants','editPlants','runVisits','approveReports','manageTasks']},
    service:{id:'service',label:'Servicetechniker',short:'Service',description:'Bearbeitet technische Einsätze und Aufgaben an zugewiesenen Anlagen.',permissions:['viewPlants','editPlants','runVisits','manageTasks']},
    backoffice:{id:'backoffice',label:'Innendienst',short:'Innendienst',description:'Unterstützt Terminierung, Dokumentation und Vertriebsprozesse.',permissions:['viewPlants','manageTasks','viewTeam']},
    reader:{id:'reader',label:'Lesender Benutzer',short:'Leser',description:'Reiner Lesezugriff für Controlling, Management oder Review.',permissions:['viewPlants','viewTeam']}
  };

  const USERS=[
    {id:'julia',firstName:'Julia',lastName:'Schneider',roleId:'admin',jobTitle:'Leitung Digitale Prozesse',department:'Administration',employeeNumber:'DEMO-1001',region:'Alle Regionen',branch:'Deutschland',email:'julia.schneider@example.com',mobile:'+49 170 5551001',phone:'+49 89 5551000',status:'active',lastSeen:'Heute · 10:48'},
    {id:'thomas',firstName:'Thomas',lastName:'Weber',roleId:'teamlead',jobTitle:'Teamleiter Außendienst',department:'Außendienst',employeeNumber:'DEMO-1101',region:'Region Süd',branch:'München',email:'thomas.weber@example.com',mobile:'+49 170 5551101',phone:'+49 89 5551100',status:'active',lastSeen:'Heute · 09:56'},
    {id:'lukas',firstName:'Lukas',lastName:'Beispiel',roleId:'sales',jobTitle:'Vertriebsingenieur',department:'Außendienst',employeeNumber:'DEMO-4711',region:'Region Süd',branch:'München',email:'lukas.beispiel@example.com',mobile:'+49 170 5550101',phone:'+49 89 5550100',status:'active',lastSeen:'Heute · 10:42'},
    {id:'anna',firstName:'Anna',lastName:'Berger',roleId:'sales',jobTitle:'Vertriebsingenieurin',department:'Außendienst',employeeNumber:'DEMO-1202',region:'Region West',branch:'Köln',email:'anna.berger@example.com',mobile:'+49 170 5551202',phone:'+49 221 5551200',status:'active',lastSeen:'Heute · 08:31'},
    {id:'max',firstName:'Max',lastName:'König',roleId:'service',jobTitle:'Servicetechniker',department:'Technischer Service',employeeNumber:'DEMO-1301',region:'Region Süd',branch:'München',email:'max.koenig@example.com',mobile:'+49 170 5551301',phone:'+49 89 5551300',status:'active',lastSeen:'Gestern · 16:18'},
    {id:'marie',firstName:'Marie',lastName:'Hoffmann',roleId:'backoffice',jobTitle:'Vertriebsinnendienst',department:'Innendienst',employeeNumber:'DEMO-1401',region:'Deutschland',branch:'Zentrale',email:'marie.hoffmann@example.com',mobile:'+49 170 5551401',phone:'+49 89 5551400',status:'active',lastSeen:'Heute · 09:14'},
    {id:'daniel',firstName:'Daniel',lastName:'Fischer',roleId:'reader',jobTitle:'Controller',department:'Controlling',employeeNumber:'DEMO-1501',region:'Deutschland',branch:'Zentrale',email:'daniel.fischer@example.com',mobile:'+49 170 5551501',phone:'+49 89 5551500',status:'active',lastSeen:'Freitag · 14:20'},
    {id:'peter',firstName:'Peter',lastName:'Wagner',roleId:'sales',jobTitle:'Vertriebsingenieur',department:'Außendienst',employeeNumber:'DEMO-1601',region:'Region Nord',branch:'Hamburg',email:'peter.wagner@example.com',mobile:'+49 170 5551601',phone:'+49 40 5551600',status:'disabled',lastSeen:'Deaktiviert seit 31.07.2026'}
  ];

  const DEFAULT_ASSIGNMENTS={
    'vta-present-plant-001':'lukas',
    'vta-present-plant-002':'anna',
    'vta-present-plant-003':'max',
    'vta-present-plant-004':'lukas',
    'vta-present-plant-005':'anna',
    'vta-demo-plant-001':'thomas'
  };

  const ACTIVITY_SEED=[
    {minutes:33,userId:'lukas',type:'visit',text:'Besuch „Optimierung Schlammentwässerung“ abgeschlossen',plantId:'vta-present-plant-001'},
    {minutes:71,userId:'anna',type:'task',text:'Aufgabe „Dosierkennlinie prüfen“ abgeschlossen',plantId:'vta-present-plant-002'},
    {minutes:109,userId:'max',type:'report',text:'Technischen Servicebericht freigegeben',plantId:'vta-present-plant-003'},
    {minutes:186,userId:'marie',type:'appointment',text:'Nachfass-Termin für Region Süd koordiniert',plantId:'vta-present-plant-004'},
    {minutes:320,userId:'thomas',type:'assignment',text:'Anlagenverantwortung im Team angepasst',plantId:'vta-present-plant-005'},
    {minutes:1440,userId:'julia',type:'role',text:'Rollenmatrix für die Demo-Organisation geprüft',plantId:''}
  ];

  function isDemo(){return localStorage.getItem(MODE_KEY)==='demo'}
  function esc(value=''){return String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]))}
  function readJson(key,fallback=null){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}}
  function writeJson(key,value){localStorage.setItem(key,JSON.stringify(value))}
  function userById(id){return USERS.find(user=>user.id===id)||USERS[0]}
  function fullName(user){return `${user.firstName} ${user.lastName}`}
  function defaultState(){return {schema:'vta-demo-organization-v01',version:ORG_VERSION,roleOverrides:{},statusOverrides:{},assignments:{...DEFAULT_ASSIGNMENTS}}}
  function orgState(){
    const stored=readJson(ORG_STATE_KEY,null);
    const version=localStorage.getItem(ORG_VERSION_KEY);
    if(version===ORG_VERSION&&stored?.schema==='vta-demo-organization-v01'){
      return {...defaultState(),...stored,roleOverrides:{...(stored.roleOverrides||{})},statusOverrides:{...(stored.statusOverrides||{})},assignments:{...DEFAULT_ASSIGNMENTS,...(stored.assignments||{})}};
    }
    const next=defaultState();
    writeJson(ORG_STATE_KEY,next);
    localStorage.setItem(ORG_VERSION_KEY,ORG_VERSION);
    return next;
  }
  function saveState(state){writeJson(ORG_STATE_KEY,state);localStorage.setItem(ORG_VERSION_KEY,ORG_VERSION)}
  function effectiveRoleId(user,state=orgState()){return state.roleOverrides?.[user.id]||user.roleId}
  function effectiveStatus(user,state=orgState()){return state.statusOverrides?.[user.id]||user.status}
  function roleFor(user,state=orgState()){return ROLES[effectiveRoleId(user,state)]||ROLES.reader}
  function profileFor(user,state=orgState()){
    const role=roleFor(user,state);
    return {schemaVersion:1,firstName:user.firstName,lastName:user.lastName,jobTitle:user.jobTitle,company:'VTA',department:user.department,employeeNumber:user.employeeNumber,region:user.region,branch:user.branch,email:user.email,mobile:user.mobile,phone:user.phone,website:'https://www.vta.cc',street:'Musterweg 10',postalCode:'80000',city:user.branch==='Zentrale'?'Musterstadt':user.branch,country:'Deutschland',notes:`Fiktiver Demo-Benutzer · Rolle: ${role.label}.`};
  }
  function activeUser(state=orgState()){
    const requested=localStorage.getItem(ACTIVE_USER_KEY)||'julia';
    const user=userById(requested);
    if(effectiveStatus(user,state)==='disabled')return userById('julia');
    return user;
  }
  function ensureActiveProfileBeforeApp(){
    if(!isDemo())return;
    const state=orgState();
    let user=activeUser(state);
    if(!localStorage.getItem(ACTIVE_USER_KEY)){
      user=userById('julia');
      localStorage.setItem(ACTIVE_USER_KEY,user.id);
      try{sessionStorage.setItem(OPEN_AFTER_RELOAD,'1')}catch{}
    }
    localStorage.setItem(PROFILE_KEY,JSON.stringify(profileFor(user,state)));
  }

  ensureActiveProfileBeforeApp();

  function plants(){const value=readJson(PLANTS_KEY,[]);return Array.isArray(value)?value:[]}
  function reports(){const value=readJson(REPORTS_KEY,{});return value&&typeof value==='object'?value:{}}
  function visitTime(visit){const time=new Date(visit?.start||0).getTime();return Number.isFinite(time)?time:0}
  function plantName(id){return plants().find(plant=>plant.id===id)?.master?.name||'Anlage'}
  function assignedUserId(plantId,state=orgState()){return state.assignments?.[plantId]||'lukas'}
  function assignedPlants(user,state=orgState()){
    const role=roleFor(user,state);
    const all=plants();
    if(role.id==='admin'||role.id==='reader'||role.id==='backoffice')return all;
    if(role.id==='teamlead'){
      const teamIds=USERS.filter(member=>member.region===user.region&&effectiveStatus(member,state)==='active').map(member=>member.id);
      return all.filter(plant=>teamIds.includes(assignedUserId(plant.id,state)));
    }
    return all.filter(plant=>assignedUserId(plant.id,state)===user.id);
  }
  function orgMetrics(){
    const allPlants=plants();
    const allReports=reports();
    const allVisits=allPlants.flatMap(plant=>(plant.visits||[]).map(visit=>({plant,visit})));
    const now=Date.now();
    const appointments=allVisits.filter(({visit})=>visit.status!=='done'&&visit.status!=='cancelled'&&visitTime(visit)>=now).length;
    const tasks=allPlants.reduce((sum,plant)=>sum+(plant.actions||[]).filter(action=>action.status!=='done').length,0);
    const findings=allVisits.reduce((sum,{visit})=>sum+(visit.findings||[]).filter(finding=>!finding.resolved).length,0);
    return {employees:USERS.length,activeEmployees:USERS.filter(user=>effectiveStatus(user)==='active').length,plants:allPlants.length,appointments,tasks,reports:Object.keys(allReports).length,findings};
  }
  function userMetrics(user,state=orgState()){
    const scoped=assignedPlants(user,state);
    const scopedIds=new Set(scoped.map(plant=>plant.id));
    const now=Date.now();
    const allVisits=scoped.flatMap(plant=>(plant.visits||[]).map(visit=>({plant,visit})));
    const upcoming=allVisits.filter(({visit})=>visit.status!=='done'&&visit.status!=='cancelled'&&visitTime(visit)>=now).sort((a,b)=>visitTime(a.visit)-visitTime(b.visit));
    const completed=allVisits.filter(({visit})=>visit.status==='done'||visit.modeStatus==='completed');
    const tasks=scoped.flatMap(plant=>(plant.actions||[]).filter(action=>action.status!=='done').map(action=>({plant,action})));
    const reportCount=Object.values(reports()).filter(report=>scopedIds.has(report?.plantId)).length;
    return {plants:scoped,upcoming,completed,tasks,reports:reportCount};
  }
  function relativeActivity(minutes){
    const d=new Date(Date.now()-minutes*60000);
    return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d);
  }
  function activityRows(limit=8){
    return ACTIVITY_SEED.slice(0,limit).map(item=>({...item,user:userById(item.userId),when:relativeActivity(item.minutes)}));
  }
  function roleBadge(role){return `<span class="demo-org-role role-${esc(role.id)}">${esc(role.label)}</span>`}
  function statusBadge(status){return `<span class="demo-org-status ${status}">${status==='active'?'● Aktiv':'○ Deaktiviert'}</span>`}

  function ensureOrgView(){
    let view=document.querySelector('#demoOrganizationView');
    if(view)return view;
    view=document.createElement('section');
    view.id='demoOrganizationView';
    view.className='application-view demo-organization-view hidden';
    document.querySelector('#mainContent')?.appendChild(view);
    return view;
  }
  function hideOrgView(){document.querySelector('#demoOrganizationView')?.classList.add('hidden')}
  function activateOrgView(){
    document.querySelector('#dashboard')?.classList.add('hidden');
    document.querySelector('#applicationView')?.classList.add('hidden');
    document.querySelector('#calculatorView')?.classList.add('hidden');
    ensureOrgView().classList.remove('hidden');
  }
  function setOrgBreadcrumb(label){
    const current=document.querySelector('#breadcrumbCurrent');
    const separator=document.querySelector('#breadcrumbSeparator');
    if(current)current.textContent=label;
    if(separator)separator.classList.remove('hidden');
  }

  function adminTabs(active){
    const tabs=[['dashboard','Dashboard'],['employees','Mitarbeiter'],['roles','Rollen & Rechte'],['assignments','Anlagenzuordnung'],['activity','Aktivitäten']];
    return `<nav class="demo-org-tabs" aria-label="Administration">${tabs.map(([id,label])=>`<button type="button" class="${active===id?'active':''}" data-demo-org-tab="${id}">${esc(label)}</button>`).join('')}</nav>`;
  }
  function metricCard(label,value,note=''){return `<article class="demo-org-metric"><span>${esc(label)}</span><strong>${esc(value)}</strong>${note?`<small>${esc(note)}</small>`:''}</article>`}

  function renderAdminDashboard(user,state){
    const m=orgMetrics();
    const regional={};
    plants().forEach(plant=>{
      const owner=userById(assignedUserId(plant.id,state));
      const region=owner.region||'Nicht zugeordnet';
      regional[region]=(regional[region]||0)+1;
    });
    return `<div class="demo-org-grid-metrics">
      ${metricCard('Mitarbeiter',m.employees,`${m.activeEmployees} aktiv`)}
      ${metricCard('Anlagen',m.plants,'Demo-Bestand')}
      ${metricCard('Termine',m.appointments,'kommend')}
      ${metricCard('Offene Aufgaben',m.tasks,'organisationweit')}
      ${metricCard('Besuchsberichte',m.reports,'freigegeben')}
      ${metricCard('Auffälligkeiten',m.findings,'offen dokumentiert')}
    </div>
    <div class="demo-org-dashboard-columns">
      <article class="demo-org-panel"><div class="demo-org-panel-head"><div><p class="eyebrow">Teamstatus</p><h2>Mitarbeiter</h2></div><button type="button" class="button secondary" data-demo-org-tab="employees">Verwalten</button></div>
        <div class="demo-org-team-list">${USERS.slice(0,6).map(member=>{const role=roleFor(member,state);const status=effectiveStatus(member,state);return `<button type="button" data-demo-employee="${member.id}" class="demo-org-team-row"><span class="demo-org-avatar">${member.firstName[0]}${member.lastName[0]}</span><span><strong>${esc(fullName(member))}</strong><small>${esc(role.label)} · ${esc(member.region)}</small></span>${statusBadge(status)}</button>`}).join('')}</div>
      </article>
      <article class="demo-org-panel"><div class="demo-org-panel-head"><div><p class="eyebrow">Organisation</p><h2>Regionen & Zuständigkeit</h2></div></div>
        <div class="demo-org-region-list">${Object.entries(regional).map(([region,count])=>`<div><span>${esc(region)}</span><strong>${count} ${count===1?'Anlage':'Anlagen'}</strong></div>`).join('')}</div>
        <div class="demo-org-security-note"><strong>Demo-Simulation</strong><p>Rollen und Zuständigkeiten sind lokal simuliert. Die spätere Produktivversion erzwingt Berechtigungen serverseitig.</p></div>
      </article>
    </div>
    <article class="demo-org-panel"><div class="demo-org-panel-head"><div><p class="eyebrow">Audit Trail</p><h2>Letzte Aktivitäten</h2></div><button type="button" class="button secondary" data-demo-org-tab="activity">Alle anzeigen</button></div>${renderActivityList(5)}</article>`;
  }

  function renderEmployees(state){
    return `<article class="demo-org-panel"><div class="demo-org-panel-head"><div><p class="eyebrow">Benutzerverwaltung</p><h2>${USERS.length} Demo-Mitarbeiter</h2><p>Rollen, Status und Regionen der fiktiven Demo-Organisation.</p></div><button type="button" class="button primary" disabled title="In der Demo nur als Vorschau">＋ Mitarbeiter</button></div>
      <div class="demo-org-employee-grid">${USERS.map(member=>{const role=roleFor(member,state);const status=effectiveStatus(member,state);return `<article class="demo-org-employee-card ${status==='disabled'?'disabled':''}"><div class="demo-org-employee-main"><span class="demo-org-avatar large">${member.firstName[0]}${member.lastName[0]}</span><div><h3>${esc(fullName(member))}</h3><p>${esc(member.jobTitle)}</p></div></div><div class="demo-org-employee-meta">${roleBadge(role)}${statusBadge(status)}<span>${esc(member.region)}</span><span>${esc(member.lastSeen)}</span></div><button type="button" class="button secondary" data-demo-employee="${member.id}">Profil & Rechte</button></article>`}).join('')}</div>
    </article>`;
  }

  function renderRoles(state){
    const roleList=Object.values(ROLES);
    const permissionKeys=Object.keys(PERMISSION_LABELS);
    return `<article class="demo-org-panel demo-org-role-panel"><div class="demo-org-panel-head"><div><p class="eyebrow">Berechtigungskonzept</p><h2>Rollen & Rechte</h2><p>Diese Matrix bildet die spätere serverseitige Rollenprüfung im Pitch ab.</p></div></div>
      <div class="demo-org-role-cards">${roleList.map(role=>`<article><div>${roleBadge(role)}<strong>${USERS.filter(user=>effectiveRoleId(user,state)===role.id&&effectiveStatus(user,state)==='active').length}</strong></div><p>${esc(role.description)}</p></article>`).join('')}</div>
      <div class="demo-org-matrix-wrap"><table class="demo-org-matrix"><thead><tr><th>Funktion</th>${roleList.map(role=>`<th>${esc(role.short)}</th>`).join('')}</tr></thead><tbody>${permissionKeys.map(permission=>`<tr><td>${esc(PERMISSION_LABELS[permission])}</td>${roleList.map(role=>`<td>${role.permissions.includes(permission)?'<span class="matrix-yes">✓</span>':'<span class="matrix-no">–</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    </article>`;
  }

  function renderAssignments(state){
    const activeUsers=USERS.filter(user=>effectiveStatus(user,state)==='active'&&['sales','service','teamlead'].includes(effectiveRoleId(user,state)));
    return `<article class="demo-org-panel"><div class="demo-org-panel-head"><div><p class="eyebrow">Zuständigkeiten</p><h2>Anlagenzuordnung</h2><p>Änderungen gelten ausschließlich in der lokalen Demo-Organisation.</p></div></div>
      <div class="demo-org-assignment-list">${plants().map(plant=>{const current=assignedUserId(plant.id,state);return `<div class="demo-org-assignment-row"><div><strong>${esc(plant.master?.name||'Unbenannte Anlage')}</strong><small>${esc(plant.operator?.name||'Kein Betreiber')} · ${esc(plant.address?.city||'')}</small></div><label>Verantwortlich<select data-demo-assignment="${esc(plant.id)}">${activeUsers.map(member=>`<option value="${member.id}" ${current===member.id?'selected':''}>${esc(fullName(member))} · ${esc(roleFor(member,state).short)}</option>`).join('')}</select></label><button type="button" class="button secondary" data-demo-open-plant="${esc(plant.id)}">Anlage öffnen</button></div>`}).join('')}</div>
    </article>`;
  }

  function renderActivityList(limit=12){
    return `<div class="demo-org-activity-list">${activityRows(limit).map(item=>`<div class="demo-org-activity"><span class="demo-org-activity-icon">${({visit:'↗',task:'✓',report:'▥',appointment:'□',assignment:'⇄',role:'⚙'})[item.type]||'•'}</span><div><strong>${esc(fullName(item.user))}</strong><p>${esc(item.text)}</p>${item.plantId?`<small>${esc(plantName(item.plantId))}</small>`:''}</div><time>${esc(item.when)}</time></div>`).join('')}</div>`;
  }

  function renderActivity(){return `<article class="demo-org-panel"><div class="demo-org-panel-head"><div><p class="eyebrow">Nachvollziehbarkeit</p><h2>Aktivitätsprotokoll</h2><p>Fiktive Audit-Ereignisse zur Darstellung der späteren Mehrbenutzer-Nachvollziehbarkeit.</p></div></div>${renderActivityList(12)}</article>`}

  function renderUserDashboard(user,state){
    const role=roleFor(user,state);
    const m=userMetrics(user,state);
    const next=m.upcoming[0];
    const roleText=role.id==='teamlead'?'Team-Cockpit':role.id==='reader'?'Management-Übersicht':'Mein Cockpit';
    const teamMembers=role.id==='teamlead'?USERS.filter(member=>member.region===user.region&&effectiveStatus(member,state)==='active'):[];
    return `<div class="demo-org-grid-metrics">
      ${metricCard(role.id==='teamlead'?'Teamanlagen':'Meine Anlagen',m.plants.length,role.id==='reader'?'Lesezugriff':'zugeordnet')}
      ${metricCard('Kommende Termine',m.upcoming.length,'im sichtbaren Bereich')}
      ${metricCard('Offene Aufgaben',m.tasks.length,'noch zu bearbeiten')}
      ${metricCard('Besuchsberichte',m.reports,'freigegeben')}
    </div>
    ${next?`<article class="demo-org-hero-card"><div><p class="eyebrow">Nächster Einsatz</p><h2>${esc(next.visit.title||'Termin')}</h2><p>${esc(next.plant.master?.name||'')} · ${new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(next.visit.start))}</p></div><button type="button" class="button primary" data-demo-open-plant="${esc(next.plant.id)}">Anlage öffnen</button></article>`:''}
    ${teamMembers.length?`<article class="demo-org-panel"><div class="demo-org-panel-head"><div><p class="eyebrow">${esc(user.region)}</p><h2>Mein Team</h2></div></div><div class="demo-org-team-list">${teamMembers.map(member=>`<button type="button" class="demo-org-team-row" data-demo-employee="${member.id}"><span class="demo-org-avatar">${member.firstName[0]}${member.lastName[0]}</span><span><strong>${esc(fullName(member))}</strong><small>${esc(roleFor(member,state).label)}</small></span><strong>${assignedPlants(member,state).length} Anlagen</strong></button>`).join('')}</div></article>`:''}
    <div class="demo-org-dashboard-columns"><article class="demo-org-panel"><div class="demo-org-panel-head"><div><p class="eyebrow">Zuständigkeit</p><h2>${esc(roleText)}</h2></div></div><div class="demo-org-plant-list">${m.plants.slice(0,6).map(plant=>`<button type="button" data-demo-open-plant="${esc(plant.id)}"><span><strong>${esc(plant.master?.name||'Anlage')}</strong><small>${esc(plant.operator?.name||'')} · ${esc(plant.address?.city||'')}</small></span><b>›</b></button>`).join('')||'<p class="muted-small">Keine Anlagen zugeordnet.</p>'}</div></article><article class="demo-org-panel"><div class="demo-org-panel-head"><div><p class="eyebrow">Aufgaben</p><h2>Offene Punkte</h2></div></div><div class="demo-org-task-list">${m.tasks.slice(0,5).map(({plant,action})=>`<div><span class="priority ${esc(action.priority||'normal')}">${esc(action.priority==='high'?'Hoch':'Offen')}</span><div><strong>${esc(action.title)}</strong><small>${esc(plant.master?.name||'')}</small></div></div>`).join('')||'<p class="muted-small">Keine offenen Aufgaben.</p>'}</div></article></div>`;
  }

  function pageHeader(user,state,tab){
    const role=roleFor(user,state);
    return `<section class="page-header demo-org-page-header"><div><p class="eyebrow">Demo-Organisation</p><h1>${role.id==='admin'?'Administration':role.id==='teamlead'?'Team-Dashboard':'Mitarbeiter-Dashboard'}</h1><p class="subtitle">${esc(fullName(user))} · ${esc(role.label)} · ${esc(user.region)}</p></div><div class="demo-org-header-actions"><button type="button" class="button secondary" data-demo-user-switch>Benutzer wechseln</button><button type="button" class="button secondary" data-demo-back-app>Zur App</button></div></section>${role.id==='admin'?adminTabs(tab):''}`;
  }

  function renderOrgView(tab='dashboard'){
    if(!isDemo())return;
    const state=orgState();
    const user=activeUser(state);
    const role=roleFor(user,state);
    if(role.id!=='admin')tab='dashboard';
    const view=ensureOrgView();
    let body='';
    if(role.id==='admin'){
      if(tab==='employees')body=renderEmployees(state);
      else if(tab==='roles')body=renderRoles(state);
      else if(tab==='assignments')body=renderAssignments(state);
      else if(tab==='activity')body=renderActivity();
      else body=renderAdminDashboard(user,state);
    }else body=renderUserDashboard(user,state);
    view.innerHTML=`${pageHeader(user,state,tab)}<div class="demo-org-content">${body}</div>`;
    activateOrgView();
    setOrgBreadcrumb(role.id==='admin'?`Administration › ${tab==='dashboard'?'Dashboard':tab==='employees'?'Mitarbeiter':tab==='roles'?'Rollen & Rechte':tab==='assignments'?'Anlagenzuordnung':'Aktivitäten'}`:'Demo-Cockpit');
    bindOrgView(view);
  }

  function employeeDialog(){
    let dialog=document.querySelector('#demoEmployeeDialog');
    if(dialog)return dialog;
    dialog=document.createElement('dialog');
    dialog.id='demoEmployeeDialog';
    dialog.className='demo-employee-dialog';
    document.body.appendChild(dialog);
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
    return dialog;
  }
  function showEmployee(userId){
    const state=orgState();
    const member=userById(userId);
    const role=roleFor(member,state);
    const status=effectiveStatus(member,state);
    const assigned=assignedPlants(member,state);
    const dialog=employeeDialog();
    const canEdit=roleFor(activeUser(state),state).id==='admin';
    dialog.innerHTML=`<div class="demo-employee-dialog-card"><div class="demo-org-panel-head"><div class="demo-org-employee-main"><span class="demo-org-avatar large">${member.firstName[0]}${member.lastName[0]}</span><div><p class="eyebrow">Demo-Mitarbeiter</p><h2>${esc(fullName(member))}</h2><p>${esc(member.jobTitle)} · ${esc(member.region)}</p></div></div><button type="button" class="demo-org-close" data-demo-dialog-close aria-label="Schließen">×</button></div><div class="demo-employee-detail-grid"><div><span>Rolle</span>${roleBadge(role)}</div><div><span>Status</span>${statusBadge(status)}</div><div><span>E-Mail</span><strong>${esc(member.email)}</strong></div><div><span>Personalnummer</span><strong>${esc(member.employeeNumber)}</strong></div><div><span>Zugewiesene Anlagen</span><strong>${assigned.length}</strong></div><div><span>Letzte Aktivität</span><strong>${esc(member.lastSeen)}</strong></div></div>${canEdit?`<div class="demo-employee-admin-controls"><label>Rolle<select data-demo-role-change>${Object.values(ROLES).map(item=>`<option value="${item.id}" ${item.id===role.id?'selected':''}>${esc(item.label)}</option>`).join('')}</select></label><label>Status<select data-demo-status-change><option value="active" ${status==='active'?'selected':''}>Aktiv</option><option value="disabled" ${status==='disabled'?'selected':''}>Deaktiviert</option></select></label><button type="button" class="button primary" data-demo-save-user>Demo-Änderung speichern</button></div>`:''}<div class="demo-employee-dialog-actions"><button type="button" class="button secondary" data-demo-switch-person ${status==='disabled'?'disabled':''}>Als diesen Benutzer anzeigen</button><button type="button" class="button secondary" data-demo-dialog-close>Schließen</button></div></div>`;
    dialog.querySelectorAll('[data-demo-dialog-close]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
    dialog.querySelector('[data-demo-switch-person]')?.addEventListener('click',()=>switchUser(member.id));
    dialog.querySelector('[data-demo-save-user]')?.addEventListener('click',()=>{
      const next=orgState();
      next.roleOverrides[member.id]=dialog.querySelector('[data-demo-role-change]').value;
      next.statusOverrides[member.id]=dialog.querySelector('[data-demo-status-change]').value;
      if(member.id==='julia'&&next.statusOverrides[member.id]==='disabled'){
        alert('Der Demo-Admin Julia Schneider bleibt für den Pitch aktiv.');
        next.statusOverrides[member.id]='active';
      }
      saveState(next);
      dialog.close();
      renderOrgView('employees');
      decorateDemoChrome();
    });
    if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
  }

  function switcherDialog(){
    let dialog=document.querySelector('#demoOrganizationSwitcher');
    if(dialog)return dialog;
    dialog=document.createElement('dialog');
    dialog.id='demoOrganizationSwitcher';
    dialog.className='demo-organization-switcher';
    document.body.appendChild(dialog);
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
    return dialog;
  }
  function showUserSwitcher(){
    const state=orgState();
    const current=activeUser(state);
    const dialog=switcherDialog();
    dialog.innerHTML=`<div class="demo-organization-switcher-card"><div class="demo-org-panel-head"><div><p class="eyebrow">Demo-Organisation</p><h2>Benutzer wechseln</h2><p>Wechsle die Rolle und Perspektive für den Pitch.</p></div><button type="button" class="demo-org-close" data-demo-switch-close aria-label="Schließen">×</button></div><div class="demo-user-switch-grid">${USERS.map(member=>{const role=roleFor(member,state);const status=effectiveStatus(member,state);const active=member.id===current.id;return `<button type="button" class="demo-user-switch-card ${active?'active':''} ${status==='disabled'?'disabled':''}" data-demo-switch-user="${member.id}" ${status==='disabled'?'disabled':''}><span class="demo-org-avatar large">${member.firstName[0]}${member.lastName[0]}</span><span><strong>${esc(fullName(member))}</strong><small>${esc(role.label)} · ${esc(member.region)}</small></span><b>${status==='disabled'?'Gesperrt':active?'Aktiv':'Wechseln'}</b></button>`}).join('')}</div><div class="demo-switch-footer"><button type="button" class="button secondary" data-demo-reset-org>Demo-Organisation zurücksetzen</button><button type="button" class="button secondary" data-demo-switch-close>Schließen</button></div></div>`;
    dialog.querySelectorAll('[data-demo-switch-close]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
    dialog.querySelectorAll('[data-demo-switch-user]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.demoSwitchUser!==current.id)switchUser(button.dataset.demoSwitchUser)}));
    dialog.querySelector('[data-demo-reset-org]')?.addEventListener('click',()=>{
      if(!confirm('Demo-Organisation inklusive Rollen und Anlagenzuordnungen zurücksetzen?'))return;
      resetOrganizationState();
      const reset=document.querySelector('[data-demo-reset]');
      if(reset)reset.click();else location.reload();
    });
    if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
  }

  function switchUser(userId){
    const state=orgState();
    const member=userById(userId);
    if(effectiveStatus(member,state)==='disabled')return;
    localStorage.setItem(ACTIVE_USER_KEY,member.id);
    localStorage.setItem(PROFILE_KEY,JSON.stringify(profileFor(member,state)));
    const firstPlant=assignedPlants(member,state)[0]||plants()[0];
    if(firstPlant)localStorage.setItem(ACTIVE_PLANT_KEY,firstPlant.id);
    try{sessionStorage.setItem(OPEN_AFTER_RELOAD,'1')}catch{}
    location.reload();
  }
  function resetOrganizationState(){
    localStorage.removeItem(ORG_STATE_KEY);
    localStorage.removeItem(ORG_VERSION_KEY);
    localStorage.removeItem(ACTIVE_USER_KEY);
    orgState();
  }

  function openPlant(plantId){
    hideOrgView();
    const select=document.querySelector('#activePlantSelect');
    if(select){
      select.value=plantId;
      select.dispatchEvent(new Event('change',{bubbles:true}));
      return;
    }
    localStorage.setItem(ACTIVE_PLANT_KEY,plantId);
    location.reload();
  }

  function bindOrgView(root){
    root.querySelectorAll('[data-demo-org-tab]').forEach(button=>button.addEventListener('click',()=>renderOrgView(button.dataset.demoOrgTab)));
    root.querySelectorAll('[data-demo-employee]').forEach(button=>button.addEventListener('click',()=>showEmployee(button.dataset.demoEmployee)));
    root.querySelectorAll('[data-demo-open-plant]').forEach(button=>button.addEventListener('click',()=>openPlant(button.dataset.demoOpenPlant)));
    root.querySelector('[data-demo-user-switch]')?.addEventListener('click',showUserSwitcher);
    root.querySelector('[data-demo-back-app]')?.addEventListener('click',()=>{hideOrgView();document.querySelector('#homeButton')?.click()});
    root.querySelectorAll('[data-demo-assignment]').forEach(select=>select.addEventListener('change',()=>{
      const state=orgState();
      state.assignments[select.dataset.demoAssignment]=select.value;
      saveState(state);
      renderOrgView('assignments');
    }));
  }

  function navLabel(role){return role.id==='admin'?'Administration':role.id==='teamlead'?'Team-Dashboard':'Mein Dashboard'}
  function ensureOrgNav(){
    if(!isDemo())return;
    const state=orgState();
    const role=roleFor(activeUser(state),state);
    let button=document.querySelector('[data-demo-org-nav]');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='global-nav-item demo-org-nav';
      button.dataset.demoOrgNav='true';
      const nav=document.querySelector('.global-navigation');
      if(nav)nav.appendChild(button);
      button.addEventListener('click',()=>renderOrgView('dashboard'));
    }
    button.innerHTML=`<span>▦</span><strong>${esc(navLabel(role))}</strong><small>Demo</small>`;
  }

  function decorateDemoChrome(){
    if(!isDemo())return;
    const state=orgState();
    const user=activeUser(state);
    const role=roleFor(user,state);
    document.documentElement.dataset.demoRole=role.id;
    ensureOrgNav();
    const banner=document.querySelector('#demoWorkspaceBanner');
    if(banner){
      const label=banner.querySelector('div:first-child span');
      if(label)label.textContent=`${fullName(user)} · ${role.label} · fiktive Präsentationsdaten`;
      const actions=banner.querySelector('div:last-child');
      if(actions&&!actions.querySelector('[data-demo-user-switch]')){
        const switchButton=document.createElement('button');
        switchButton.type='button';
        switchButton.dataset.demoUserSwitch='true';
        switchButton.textContent='Benutzer wechseln';
        switchButton.addEventListener('click',showUserSwitcher);
        actions.insertBefore(switchButton,actions.firstChild);
      }
      if(actions&&!actions.querySelector('[data-demo-open-cockpit]')){
        const cockpit=document.createElement('button');
        cockpit.type='button';
        cockpit.dataset.demoOpenCockpit='true';
        cockpit.textContent=role.id==='admin'?'Admin-Cockpit':'Cockpit';
        cockpit.addEventListener('click',()=>renderOrgView('dashboard'));
        actions.insertBefore(cockpit,actions.firstChild);
      }else if(actions?.querySelector('[data-demo-open-cockpit]'))actions.querySelector('[data-demo-open-cockpit]').textContent=role.id==='admin'?'Admin-Cockpit':'Cockpit';
    }
  }

  function maybeOpenCockpit(){
    if(!isDemo())return;
    let should=false;
    try{should=sessionStorage.getItem(OPEN_AFTER_RELOAD)==='1';sessionStorage.removeItem(OPEN_AFTER_RELOAD)}catch{}
    if(should)setTimeout(()=>renderOrgView('dashboard'),80);
  }

  document.addEventListener('click',event=>{
    if(!isDemo())return;
    const profile=event.target.closest?.('#profileButton');
    if(profile){
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      showUserSwitcher();
      return;
    }
    if(event.target.closest?.('[data-demo-reset]'))resetOrganizationState();
  },true);

  document.addEventListener('click',event=>{
    if(!isDemo())return;
    const nativeNav=event.target.closest?.('.global-nav-item,#homeButton,#breadcrumbHome,#managePlantsButton,#newPlantButton');
    if(nativeNav&&!nativeNav.matches?.('[data-demo-org-nav]'))hideOrgView();
  });

  const observer=new MutationObserver(()=>decorateDemoChrome());
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>{decorateDemoChrome();maybeOpenCockpit()},{once:true});
  window.addEventListener('pageshow',decorateDemoChrome);
  decorateDemoChrome();
})();
