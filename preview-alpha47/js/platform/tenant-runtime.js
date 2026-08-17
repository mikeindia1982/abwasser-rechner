import { getTenantConfig, listTenantConfigs } from './tenant-config.js';

const requestedId=globalThis.__ABWASSER_PREVIEW_TENANT__||new URLSearchParams(location.search).get('tenant')||'vta';
const activeTenant=getTenantConfig(requestedId);

function ensureRuntimeStyles(){
  if(document.querySelector('#tenant-runtime-styles'))return;
  const style=document.createElement('style');
  style.id='tenant-runtime-styles';
  style.textContent=`
    .tenant-edition-switcher{margin:6px 12px 10px;padding:10px 11px;border:1px solid rgba(255,255,255,.13);border-radius:12px;background:rgba(255,255,255,.07)}
    .tenant-edition-switcher label{display:grid;gap:5px;color:rgba(255,255,255,.72);font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
    .tenant-edition-switcher select{width:100%;padding:.6rem .7rem;border:1px solid rgba(255,255,255,.16);border-radius:9px;background:rgba(255,255,255,.11);color:#fff;font-weight:800}
    .tenant-edition-switcher option{color:#17353c;background:#fff}
    .tenant-edition-switcher small{display:block;margin-top:6px;color:rgba(255,255,255,.55);line-height:1.35}
    html[data-tenant="platform"] .firebase-auth-gate{display:none!important}
  `;
  document.head.appendChild(style);
}

function setText(selector,value){
  document.querySelectorAll(selector).forEach(element=>{element.textContent=value||''});
}

export function applyTenantBranding(config=activeTenant){
  document.documentElement.dataset.tenant=config.id;
  document.title=`${config.appName} · ${config.editionName}`;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',config.colors.primary);
  document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content',config.appName);
  document.querySelector('#appManifest')?.setAttribute('href',config.id==='platform'?'manifest-platform.webmanifest':'manifest-vta.webmanifest');
  document.documentElement.style.setProperty('--primary',config.colors.primary);
  document.documentElement.style.setProperty('--primary-dark',config.colors.primaryDark);
  document.documentElement.style.setProperty('--accent',config.colors.accent);
  document.documentElement.style.setProperty('--bg',config.colors.background);
  setText('.brand-row .brand-mark',config.brandMark);
  setText('.brand-row .brand-copy strong',config.appName);
  setText('[data-brand-app-name]',config.appName);
  setText('[data-brand-mark]',config.brandMark);
  setText('[data-brand-edition]',config.editionName);
  setText('[data-brand-company]',config.companyName);
  setText('[data-brand-slogan]',config.slogan);
  setText('[data-brand-footer]',config.footer);
  if(config.features.firebaseAuth===false){
    const gate=document.querySelector('#firebaseAuthGate');
    if(gate)gate.hidden=true;
    document.querySelector('.app-layout')?.removeAttribute('inert');
    document.body.classList.remove('firebase-auth-locked');
  }else{
    setText('.firebase-auth-brand-mark',config.brandMark);
    setText('.firebase-auth-brand strong',config.appName);
    setText('#firebaseAuthTitle',config.appName);
  }
}

function mountEditionSwitcher(){
  const sidebarBottom=document.querySelector('.sidebar-bottom');
  if(!sidebarBottom||document.querySelector('#tenantEditionSwitcher'))return;
  const wrapper=document.createElement('div');
  wrapper.id='tenantEditionSwitcher';
  wrapper.className='tenant-edition-switcher';
  wrapper.innerHTML=`<label>Edition<select id="tenantEditionSelect" aria-label="Software-Edition auswählen">${listTenantConfigs().map(tenant=>`<option value="${tenant.id}" ${tenant.id===activeTenant.id?'selected':''}>${tenant.editionName}</option>`).join('')}</select></label><small>${activeTenant.id==='vta'?'VTA-konfigurierte Preview':'Herstellerneutrale Preview'}</small>`;
  sidebarBottom.prepend(wrapper);
  wrapper.querySelector('select')?.addEventListener('change',event=>switchTenant(event.currentTarget.value));
}

export function switchTenant(tenantId){
  const target=getTenantConfig(tenantId);
  if(!target||target.id===activeTenant.id)return;
  const url=new URL(window.location.href);
  url.searchParams.set('tenant',target.id);
  window.location.assign(url.toString());
}

export function getActiveTenant(){return activeTenant}
export function tenantDatabaseName(baseName){return `${baseName}-preview-alpha47-${activeTenant.id}`}

window.AbwasserPlatform=Object.freeze({
  preview:true,
  tenant:activeTenant,
  tenants:listTenantConfigs(),
  getActiveTenant,
  switchTenant,
  tenantDatabaseName,
  applyTenantBranding
});
window.AbwasserPlatformReady=Promise.resolve(activeTenant);

ensureRuntimeStyles();
applyTenantBranding(activeTenant);
mountEditionSwitcher();
