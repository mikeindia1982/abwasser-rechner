const PRODUCTS_KEY='abwasser-products-v092';
const PLANTS_KEY='abwasser-plants-v07';
const ACTIVE_PLANT_KEY='abwasser-active-plant-v07';
const WORKSPACE_MODE_KEY='vta-workspace-mode-v01';
const PROFILE_KEY_PREFIX='vta-product-dosing-profiles';

const num=value=>{
  if(typeof value==='number')return Number.isFinite(value)?value:null;
  const normalized=String(value??'').trim().replace(/\s/g,'').replace(',','.');
  const match=normalized.match(/-?\d+(?:\.\d+)?/);
  if(!match)return null;
  const parsed=Number(match[0]);
  return Number.isFinite(parsed)?parsed:null;
};

function readJson(key,fallback){
  try{
    const parsed=JSON.parse(localStorage.getItem(key)||'null');
    return parsed??fallback;
  }catch{return fallback}
}

export function workspaceMode(){
  return localStorage.getItem(WORKSPACE_MODE_KEY)==='demo'?'demo':'production';
}

export function dosingProfileStorageKey(){
  return `${PROFILE_KEY_PREFIX}-${workspaceMode()}-v1`;
}

export function parseDensityKgL(value){
  const parsed=num(value);
  if(parsed===null||parsed<=0)return null;
  const text=String(value??'').toLowerCase().replace(/\s/g,'');
  if(/kg\/m(?:3|³)/.test(text))return parsed/1000;
  if(/g\/l/.test(text))return parsed/1000;
  // g/cm³, kg/l and kg/dm³ are numerically identical to kg/L.
  return parsed;
}

export function readProducts(){
  const products=readJson(PRODUCTS_KEY,[]);
  return Array.isArray(products)?products:[];
}

export function isChemicalDosingProduct(product){
  if(!product||product?.isActive===false||product?.status==='inactive')return false;
  if(product?.productType==='chemical')return true;
  const category=String(product?.category||'').toLowerCase();
  return /chem|fäll|faell|flock|polymer|biolog|prozessunterstützung/.test(category);
}

export function chemicalProducts(){
  return readProducts().filter(isChemicalDosingProduct);
}

function normalizeProfile(profile={}){
  const density=num(profile.densityKgL);
  const active=num(profile.activeContentPercent);
  return {
    schemaVersion:1,
    productId:String(profile.productId||''),
    densityKgL:density!==null&&density>0?density:null,
    activeContentPercent:active!==null&&active>0&&active<=100?active:null,
    activeComponent:String(profile.activeComponent||'').trim(),
    defaultBasis:profile.defaultBasis==='active'?'active':'product',
    applicableProcesses:Array.isArray(profile.applicableProcesses)?profile.applicableProcesses.map(value=>String(value).trim()).filter(Boolean):[],
    source:['product-record','technical-datasheet','safety-data-sheet','manufacturer','manual'].includes(profile.source)?profile.source:'manual',
    verifiedAt:String(profile.verifiedAt||''),
    updatedAt:String(profile.updatedAt||'')
  };
}

export function loadDosingRegistry(){
  const raw=readJson(dosingProfileStorageKey(),{});
  const profiles=raw?.profiles&&typeof raw.profiles==='object'?raw.profiles:{};
  return {schemaVersion:1,profiles};
}

export function storedDosingProfile(productId){
  if(!productId)return null;
  const profile=loadDosingRegistry().profiles[String(productId)];
  return profile?normalizeProfile(profile):null;
}

export function dosingDataForProduct(product){
  if(!product)return null;
  const stored=storedDosingProfile(product.id);
  const inferredDensity=parseDensityKgL(product?.technical?.density);
  return normalizeProfile({
    ...(stored||{}),
    productId:product.id,
    densityKgL:stored?.densityKgL??inferredDensity,
    source:stored?.source||(inferredDensity?'product-record':'manual')
  });
}

export function saveDosingProfile(productId,data={}){
  if(!productId)throw new Error('Produkt-ID fehlt.');
  const registry=loadDosingRegistry();
  const profile=normalizeProfile({...data,productId,updatedAt:new Date().toISOString()});
  registry.profiles[String(productId)]=profile;
  localStorage.setItem(dosingProfileStorageKey(),JSON.stringify(registry));
  window.dispatchEvent(new CustomEvent('vta:product-dosing-profile-updated',{detail:{productId:String(productId)}}));
  return profile;
}

export function activePlantContext(){
  const plantId=localStorage.getItem(ACTIVE_PLANT_KEY)||'';
  const plants=readJson(PLANTS_KEY,[]);
  const plant=Array.isArray(plants)?plants.find(item=>String(item?.id||'')===String(plantId)):null;
  if(!plant)return null;
  const flow=num(plant?.parameters?.flow);
  return {
    id:String(plant.id||''),
    name:String(plant?.master?.name||'').trim(),
    influentM3Day:flow!==null&&flow>0?flow:null
  };
}

export function sourceLabel(source){
  return ({
    'product-record':'Produktakte',
    'technical-datasheet':'Technisches Datenblatt',
    'safety-data-sheet':'Sicherheitsdatenblatt',
    manufacturer:'Herstellerangabe',
    manual:'Manuell gepflegt'
  })[source]||'Manuell gepflegt';
}

export function formatGerman(value,digits=2){
  const parsed=num(value);
  if(parsed===null)return '–';
  return parsed.toLocaleString('de-DE',{minimumFractionDigits:digits,maximumFractionDigits:digits});
}
