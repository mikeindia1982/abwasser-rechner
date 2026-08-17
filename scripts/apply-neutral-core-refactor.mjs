import {readFile,writeFile} from 'node:fs/promises';

async function edit(path,transform){
  const before=await readFile(path,'utf8');
  const after=transform(before);
  if(after===before)throw new Error(`${path}: no changes produced`);
  await writeFile(path,after);
}

function replaceRequired(text,search,replacement,label){
  if(search instanceof RegExp){
    if(!search.test(text))throw new Error(`Missing pattern: ${label}`);
    search.lastIndex=0;
    return text.replace(search,replacement);
  }
  if(!text.includes(search))throw new Error(`Missing text: ${label}`);
  return text.replace(search,replacement);
}

await edit('js/app.js',source=>{
  let text=source;

  text=replaceRequired(
    text,
    'import {tenderScanService} from "./tenders/services/tender-scan-service.js";\n\n',
    `import {tenderScanService} from "./tenders/services/tender-scan-service.js";\n\nconst ACTIVE_TENANT=globalThis.AbwasserPlatform?.tenant||{id:"platform",appName:"Abwasser Plattform",defaultProfile:null,app:{}};\nconst EDITION_APP=ACTIVE_TENANT.app||{};\n\n`,
    'tenant context insertion'
  );

  text=replaceRequired(
    text,
    'const STORAGE_GOOGLE_MAPS_KEY="vta-google-maps-api-key-v01";\nconst STORAGE_GOOGLE_MAPS_MAP_ID="vta-google-maps-map-id-v01";\nconst BUILT_IN_DEMO_PLANT_ID="vta-demo-plant-001";',
    'const STORAGE_GOOGLE_MAPS_KEY=EDITION_APP.storageKeys?.googleMapsApiKey||"abwasser-google-maps-api-key-v01";\nconst STORAGE_GOOGLE_MAPS_MAP_ID=EDITION_APP.storageKeys?.googleMapsMapId||"abwasser-google-maps-map-id-v01";\nconst BUILT_IN_DEMO_PLANT_ID=EDITION_APP.demoPlant?.id||"demo-plant-001";\nconst PRODUCT_FILE_DB_NAME=globalThis.AbwasserPlatform?.tenantDatabaseName?.("abwasser-product-documents-v1")||"abwasser-product-documents-v1";',
    'tenant storage keys'
  );

  text=replaceRequired(text,'name:"VTA Testanlage Musterstadt"','name:EDITION_APP.demoPlant?.name||"Testanlage Musterstadt"','demo plant name');
  text=replaceRequired(text,'manufacturer:"VTA Demo"','manufacturer:EDITION_APP.demoPlant?.dewateringManufacturer||"Demo Maschinenbau"','demo manufacturer');
  text=replaceRequired(
    text,
    'function ensureBuiltInDemoPlant(){\n  const existing=plants.some(plant=>plant.id===BUILT_IN_DEMO_PLANT_ID);',
    'function ensureBuiltInDemoPlant(){\n  if(EDITION_APP.demoPlant?.enabled!==true)return;\n  const existing=plants.some(plant=>plant.id===BUILT_IN_DEMO_PLANT_ID);',
    'demo plant feature gate'
  );

  text=replaceRequired(
    text,
    /const defaultEmployeeProfile=\(\)=>\(\{[\s\S]*?\n\}\);\nfunction normalizeEmployeeProfile/,
    `const defaultEmployeeProfile=()=>structuredClone(ACTIVE_TENANT.defaultProfile||{\n  schemaVersion:1,firstName:"",lastName:"",jobTitle:"Vertriebsingenieur",company:"",department:"Außendienst",\n  employeeNumber:"",region:"",branch:"",email:"",mobile:"",phone:"",website:"",street:"",postalCode:"",city:"",country:"Deutschland",notes:""\n});\nfunction normalizeEmployeeProfile`,
    'employee profile default'
  );

  text=replaceRequired(
    text,
    /const seededProducts=\[[\s\S]*?\n\];\nfunction normalizeProduct/,
    'const seededProducts=structuredClone(EDITION_APP.seedProducts||[]);\nfunction normalizeProduct',
    'product seed extraction'
  );

  text=replaceRequired(
    text,
    /  const vta=hay\.match\([^\n]+\);\n  if\(vta\)name=vta\[0\][^\n]+;\n/,
    `  for(const matcher of EDITION_APP.productImport?.namePatterns||[]){\n    const match=hay.match(matcher);\n    if(match){\n      name=match[0].replace(/(?:_D-de|Sicherheitsdatenblatt|Factsheet).*$/i,"").trim();\n      break;\n    }\n  }\n`,
    'tenant product PDF matcher'
  );

  text=replaceRequired(text,'indexedDB.open("abwasser-product-documents-v1",1)','indexedDB.open(PRODUCT_FILE_DB_NAME,1)','product document database isolation');
  text=replaceRequired(text,'const callbackName="__vtaGoogleMapsReady";','const callbackName="__abwasserGoogleMapsReady";','neutral maps callback');
  text=replaceRequired(text,'"Lokale Einstellungen für VTA Copilot."','"Lokale Einstellungen für "+(ACTIVE_TENANT.appName||"Abwasser Plattform")+"."','neutral settings copy');
  text=replaceRequired(text,'alert("Die VTA Testanlage ist fest im Code hinterlegt und kann nicht gelöscht werden.");','alert("Die vorkonfigurierte Testanlage ist fest in dieser Edition hinterlegt und kann nicht gelöscht werden.");','neutral demo delete message');

  return text;
});

for(const path of ['js/demo-workspace.js','js/demo-organization-loader.js','js/demo-organization.js']){
  await edit(path,source=>replaceRequired(
    source,
    "(()=>{\n  'use strict';\n",
    "(()=>{\n  'use strict';\n  if(globalThis.__ABWASSER_PREVIEW_TENANT__==='platform')return;\n",
    `${path} platform guard`
  ));
}

console.log('Neutral core refactor applied.');
