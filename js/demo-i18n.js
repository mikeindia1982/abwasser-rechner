(() => {
  'use strict';

  const MODE_KEY='vta-workspace-mode-v01';
  const LANGUAGE_KEY='vta-demo-language-v01';
  const SUPPORTED=['de','en','fr'];
  const TEXT={
    en:{
      'Sicherer Mitarbeiterzugang':'Secure employee access','Anmeldung':'Sign in','Melde dich mit deinem freigeschalteten Mitarbeiterkonto an.':'Sign in with your approved employee account.','E-Mail-Adresse':'Email address','Passwort':'Password','Anmelden':'Sign in','Präsentation':'Presentation','Demo-Modus öffnen':'Open demo mode','Produktiv- und Demo-Daten bleiben weiterhin getrennte Datenräume.':'Production and demo data remain in separate workspaces.','Heute':'Today','Anlagen':'Plants','Termine':'Appointments','Aufgaben':'Tasks','Dokumente':'Documents','Produkte':'Products','Wissen':'Knowledge','Ausschreibungsradar':'Tender radar','Rechner':'Calculators','Demo-Organisation':'Demo organisation','Aktive Anlage':'Active plant','Anlagen verwalten':'Manage plants','Rechner suchen':'Search calculators','Mehr & Einstellungen':'More & settings','Optimierungsprojekte':'Optimisation projects','Berichte':'Reports','Mitarbeiterprofil':'Employee profile','Rechner-Favoriten':'Calculator favourites','Anlage exportieren':'Export plant','Anlage importieren':'Import plant','Einstellungen':'Settings','Info & System':'Info & system','App installieren':'Install app','Startseite':'Home','Profil':'Profile','Drucken':'Print','Werkzeuge':'Tools','Wähle einen Rechner aus.':'Choose a calculator.','Rechner auswählen':'Choose a calculator','Wähle links ein Werkzeug. Eingaben und Ergebnisse bleiben lokal auf deinem Gerät.':'Choose a tool on the left. Inputs and results remain locally on your device.','DEMO-MODUS':'DEMO MODE','Demo zurücksetzen':'Reset demo','Zu meinem Profil':'Back to my profile','Karte':'Map','Satellit':'Satellite','Hybrid':'Hybrid','Vertriebsgebiete anzeigen':'Show sales territories','Zuständigkeiten:':'Responsibilities:','Zuständigkeit:':'Responsibility:','Nicht zugeordnet':'Unassigned','Anlage öffnen':'Open plant','Navigation':'Directions','Ort':'Location','Betreiber':'Operator','Offene Aufgaben':'Open tasks','Erneut versuchen':'Try again','Zur Listenansicht':'Back to list','Grenzen:':'Boundaries:','Luftbild:':'Imagery:','Region Nord':'Northern region','Region West':'Western region','Region Ost':'Eastern region','Region Süd':'Southern region','Österreich':'Austria','Schweiz':'Switzerland','Frankreich':'France','Tschechien':'Czechia','Polen':'Poland'
    },
    fr:{
      'Sicherer Mitarbeiterzugang':'Accès sécurisé des employés','Anmeldung':'Connexion','Melde dich mit deinem freigeschalteten Mitarbeiterkonto an.':'Connectez-vous avec votre compte employé autorisé.','E-Mail-Adresse':'Adresse e-mail','Passwort':'Mot de passe','Anmelden':'Se connecter','Präsentation':'Présentation','Demo-Modus öffnen':'Ouvrir le mode démo','Produktiv- und Demo-Daten bleiben weiterhin getrennte Datenräume.':'Les données de production et de démonstration restent dans des espaces séparés.','Heute':"Aujourd’hui",'Anlagen':'Installations','Termine':'Rendez-vous','Aufgaben':'Tâches','Dokumente':'Documents','Produkte':'Produits','Wissen':'Connaissances','Ausschreibungsradar':"Veille d’appels d’offres",'Rechner':'Calculateurs','Demo-Organisation':'Organisation démo','Aktive Anlage':'Installation active','Anlagen verwalten':'Gérer les installations','Rechner suchen':'Rechercher un calculateur','Mehr & Einstellungen':'Plus et paramètres','Optimierungsprojekte':"Projets d’optimisation",'Berichte':'Rapports','Mitarbeiterprofil':'Profil employé','Rechner-Favoriten':'Calculateurs favoris','Anlage exportieren':"Exporter l’installation",'Anlage importieren':"Importer l’installation",'Einstellungen':'Paramètres','Info & System':'Informations et système','App installieren':"Installer l’application",'Startseite':'Accueil','Profil':'Profil','Drucken':'Imprimer','Werkzeuge':'Outils','Wähle einen Rechner aus.':'Choisissez un calculateur.','Rechner auswählen':'Choisir un calculateur','Wähle links ein Werkzeug. Eingaben und Ergebnisse bleiben lokal auf deinem Gerät.':'Choisissez un outil à gauche. Les saisies et résultats restent sur votre appareil.','DEMO-MODUS':'MODE DÉMO','Demo zurücksetzen':'Réinitialiser la démo','Zu meinem Profil':'Retour à mon profil','Karte':'Carte','Satellit':'Satellite','Hybrid':'Hybride','Vertriebsgebiete anzeigen':'Afficher les secteurs commerciaux','Zuständigkeiten:':'Responsabilités :','Zuständigkeit:':'Responsabilité :','Nicht zugeordnet':'Non attribué','Anlage öffnen':"Ouvrir l’installation",'Navigation':'Itinéraire','Ort':'Lieu','Betreiber':'Exploitant','Offene Aufgaben':'Tâches ouvertes','Erneut versuchen':'Réessayer','Zur Listenansicht':'Retour à la liste','Grenzen:':'Limites :','Luftbild:':'Vue aérienne :','Region Nord':'Région Nord','Region West':'Région Ouest','Region Ost':'Région Est','Region Süd':'Région Sud','Österreich':'Autriche','Schweiz':'Suisse','Frankreich':'France','Tschechien':'Tchéquie','Polen':'Pologne'
    }
  };
  Object.assign(TEXT.en,{
    'Demo-Vertrieb Österreich':'Demo sales Austria','Demo-Vertrieb Schweiz':'Demo sales Switzerland','Demo-Vertrieb Frankreich':'Demo sales France','Demo-Vertrieb Tschechien':'Demo sales Czechia','Demo-Vertrieb Polen':'Demo sales Poland'
  });
  Object.assign(TEXT.fr,{
    'Demo-Vertrieb Österreich':'Ventes démo Autriche','Demo-Vertrieb Schweiz':'Ventes démo Suisse','Demo-Vertrieb Frankreich':'Ventes démo France','Demo-Vertrieb Tschechien':'Ventes démo Tchéquie','Demo-Vertrieb Polen':'Ventes démo Pologne'
  });

  const originals=new WeakMap();
  let applying=false;
  const isDemo=()=>localStorage.getItem(MODE_KEY)==='demo';
  const language=()=>SUPPORTED.includes(localStorage.getItem(LANGUAGE_KEY))?localStorage.getItem(LANGUAGE_KEY):'de';
  const translate=(value,lang=language())=>lang==='de'?value:(TEXT[lang]?.[value]||value);

  function translateTextNode(node,lang){
    const current=node.nodeValue||'';
    const trimmed=current.trim();
    if(!trimmed)return;
    let original=originals.get(node);
    if(!original){original={value:trimmed,prefix:current.slice(0,current.indexOf(trimmed)),suffix:current.slice(current.indexOf(trimmed)+trimmed.length)};originals.set(node,original)}
    node.nodeValue=`${original.prefix}${translate(original.value,lang)}${original.suffix}`;
  }

  function translateElement(element,lang){
    for(const attribute of ['placeholder','aria-label','title']){
      if(!element.hasAttribute?.(attribute))continue;
      const key=`attribute:${attribute}`;
      let record=originals.get(element)||{};
      if(!record[key]){record[key]=element.getAttribute(attribute);originals.set(element,record)}
      element.setAttribute(attribute,translate(record[key],lang));
    }
  }

  function apply(root=document){
    if(!isDemo())return;
    applying=true;
    const lang=language();
    document.documentElement.lang=lang;
    if(root.nodeType===Node.TEXT_NODE)translateTextNode(root,lang);
    else{
      translateElement(root,lang);
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
      let node;while((node=walker.nextNode()))node.nodeType===Node.TEXT_NODE?translateTextNode(node,lang):translateElement(node,lang);
    }
    document.querySelectorAll('[data-demo-language]').forEach(button=>button.classList.toggle('active',button.dataset.demoLanguage===lang));
    applying=false;
  }

  function ensureSwitcher(){
    if(!isDemo()||document.querySelector('[data-demo-language-switcher]'))return;
    const host=document.querySelector('.topbar-actions');if(!host)return;
    const switcher=document.createElement('div');switcher.className='demo-language-switcher';switcher.dataset.demoLanguageSwitcher='';switcher.setAttribute('aria-label','Sprache');
    switcher.innerHTML='<button type="button" data-demo-language="de">DE</button><button type="button" data-demo-language="en">EN</button><button type="button" data-demo-language="fr">FR</button>';
    switcher.addEventListener('click',event=>{const button=event.target.closest('[data-demo-language]');if(!button)return;localStorage.setItem(LANGUAGE_KEY,button.dataset.demoLanguage);apply(document);window.dispatchEvent(new CustomEvent('vta:language-change',{detail:{language:button.dataset.demoLanguage}}))});
    host.prepend(switcher);
    if(!document.querySelector('style[data-demo-i18n]')){
      const style=document.createElement('style');style.dataset.demoI18n='';style.textContent='.demo-language-switcher{display:inline-flex;gap:2px;padding:3px;border-radius:999px;background:var(--surface-soft,#eaf2f5);border:1px solid var(--line,#cbdde4)}.demo-language-switcher button{border:0;border-radius:999px;background:transparent;color:var(--muted,#58717d);padding:6px 8px;font:800 .72rem/1 system-ui;cursor:pointer}.demo-language-switcher button.active{background:var(--primary,#006f9f);color:#fff}@media(max-width:640px){.demo-language-switcher button{padding:6px}.active-plant-badge{display:none}}';document.head.append(style);
    }
  }

  const observer=new MutationObserver(records=>{if(applying||!isDemo())return;for(const record of records)for(const node of record.addedNodes)apply(node);ensureSwitcher()});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.vtaI18n={language,translate,t:translate,apply};
  window.addEventListener('DOMContentLoaded',()=>{ensureSwitcher();apply(document)});
  window.addEventListener('pageshow',()=>{ensureSwitcher();apply(document)});
})();
