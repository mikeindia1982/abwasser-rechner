export const VTA_EDITION_DATA=Object.freeze({
  storageKeys:Object.freeze({
    googleMapsApiKey:'vta-google-maps-api-key-v01',
    googleMapsMapId:'vta-google-maps-map-id-v01'
  }),
  demoPlant:Object.freeze({
    enabled:true,
    id:'vta-demo-plant-001',
    name:'VTA Testanlage Musterstadt',
    dewateringManufacturer:'VTA Demo'
  }),
  defaultProfile:Object.freeze({
    schemaVersion:1,firstName:'',lastName:'',jobTitle:'Vertriebsingenieur',company:'VTA',department:'Außendienst',
    employeeNumber:'',region:'',branch:'',email:'',mobile:'',phone:'',website:'',street:'',postalCode:'',city:'',country:'Deutschland',notes:''
  }),
  seedProducts:Object.freeze([
    Object.freeze({
      id:'product-aquafix-70-plus',name:'VTA Aquafix® 70 plus',materialNumber:'33',productType:'chemical',category:'Fällungs- und Flockungsmittel',status:'active',isActive:true,
      packageSizes:['25 kg Sack','60 kg Fass','1.000 kg IBC','Tanklastzug'],
      notes:'Flüssiges Fällungs- und Flockungsmittel in wässriger Lösung.',applications:['Fällung','Flockung'],problems:[],benefits:[],
      technical:{state:'flüssig',color:'gelb, grün',ph:'< 2',density:'ca. 1,3 g/cm³',solubility:'vollständig mischbar',storageStability:'12 Monate'},
      safety:{signalWord:'Gefahr',hazardStatements:['H290','H318'],unNumber:'UN1760',transportClass:'8',waterHazardClass:'1'},
      documents:[],createdAt:'2026-07-26T00:00:00.000Z',updatedAt:'2026-07-26T00:00:00.000Z',reviewStatus:'seeded'
    }),
    Object.freeze({
      id:'product-biokat',name:'VTA Biokat®',materialNumber:'',productType:'chemical',category:'Biologische Prozessunterstützung',status:'active',isActive:true,
      packageSizes:['25 kg Sack','60 kg Fass','1.000 kg IBC','Tanklastzug'],
      notes:'Maßgeschneiderte Bio-Kost zur Stabilisierung und Aktivierung der biologischen Reinigungsleistung.',
      applications:['Biologische Abwasserreinigung','Belebungsanlage'],
      problems:['Blähschlamm','Schwimmschlamm','starke Fädigkeit','lockere und instabile Flocken','gestörte Reinigungsleistung'],
      benefits:['Verbessert Reinigungsleistung und Schlammeigenschaften','Kompakte und stabile Flocken','Reduziert Energie- und Produktverbrauch','Biologisch verträglich'],
      technical:{state:'',color:'',ph:'',density:'',solubility:'',storageStability:''},
      safety:{signalWord:'',hazardStatements:[],unNumber:'',transportClass:'',waterHazardClass:''},
      documents:[],createdAt:'2026-07-26T00:00:00.000Z',updatedAt:'2026-07-26T00:00:00.000Z',reviewStatus:'seeded'
    })
  ]),
  productImport:Object.freeze({
    namePatterns:Object.freeze([/VTA\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß0-9®+\- ]{2,45}/])
  })
});
