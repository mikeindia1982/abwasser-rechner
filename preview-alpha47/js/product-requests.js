const INTERNAL_REQUEST_EMAIL = "einkauf@firma.local";
const REQUEST_TYPES = {
  offer: { key: "offer", label: "Angebot anfordern", intro: "bitte bearbeitet folgende interne Angebotsanfrage." },
  order: { key: "order", label: "Bestellung anfordern", intro: "bitte bearbeitet folgende interne Bestellanforderung." }
};
const URGENCIES = ["Standard", "Dringend", "Sofort"];

function makeId(){
  return typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
}

function normalizeRequestPosition(position={}){
  return {
    id: position.id||makeId(),
    productId: String(position.productId||"").trim(),
    productName: String(position.productName||"").trim(),
    productType: position.productType==="technical"?"technical":"chemical",
    packageSize: position.productType==="technical"?"":String(position.packageSize||"").trim(),
    productImageUrl: String(position.productImageUrl||"").trim(),
    quantity: Number(position.quantity)||0
  };
}

function validateRequestPosition(position={}){
  const errors=[];
  if(!position.productId)errors.push("Produkt fehlt.");
  if(!position.productName)errors.push("Produktname fehlt.");
  if(Number(position.quantity)<1)errors.push("Die Anzahl muss mindestens 1 sein.");
  if(position.productType==="chemical"&&!String(position.packageSize).trim())errors.push("Gebindegröße ist bei chemischen Produkten erforderlich.");
  if(position.productType==="technical"&&String(position.packageSize).trim())errors.push("Gebindegröße darf bei technischen Produkten nicht angegeben werden.");
  return {valid:errors.length===0,errors};
}

function formatRequestSubject(type, plantName="Kläranlage"){
  const request = REQUEST_TYPES[type]||REQUEST_TYPES.order;
  return `${request.label} – ${plantName}`;
}

function formatRequestBody({type,plant={},urgency="Standard",desiredDate="",remark="",positions=[]}={}){
  const request = REQUEST_TYPES[type]||REQUEST_TYPES.order;
  const plantName = plant.master?.name||"Kläranlage";
  const operator = plant.operator?.name||"nicht hinterlegt";
  const location = [plant.address?.postalCode, plant.address?.city].filter(Boolean).join(" ")||"nicht hinterlegt";
  const plantId = plant.master?.internalNumber||"nicht hinterlegt";
  const lines = [];
  lines.push("Hallo,");
  lines.push("");
  lines.push(`Bitte ${request.intro}`);
  lines.push("");
  lines.push("Anlage: " + plantName);
  lines.push("Betreiber: " + operator);
  lines.push("Standort: " + location);
  lines.push("Anlagen-ID: " + plantId);
  lines.push("Dringlichkeit: " + (urgency||"Standard"));
  if(desiredDate) lines.push("Gewünschter Termin: " + desiredDate);
  lines.push("");
  lines.push("Positionen:");
  lines.push("");
  positions.forEach((position,index)=>{
    lines.push(`${index+1}. ${position.productName}`);
    if(position.productType==="chemical"){
      lines.push(`Gebindegröße: ${position.packageSize}`);
    }
    lines.push(`Anzahl: ${position.quantity}${position.productType==="technical"?" Stück":""}`);
    if(position.productType==="technical"){
      lines.push(" ");
    }
    if(position.productType==="chemical"){
      lines.push(" ");
    }
  });
  if(remark) {
    lines.push("Bemerkung:");
    lines.push(remark);
    lines.push("");
  }
  lines.push("Viele Grüße");
  return lines.join("\r\n");
}

function buildRequestMail({type,plant={},urgency="Standard",desiredDate="",remark="",positions=[]}={}){
  return {
    to: INTERNAL_REQUEST_EMAIL,
    subject: formatRequestSubject(type, plant.master?.name||"Kläranlage"),
    body: formatRequestBody({type,plant,urgency,desiredDate,remark,positions})
  };
}

export {INTERNAL_REQUEST_EMAIL, REQUEST_TYPES, URGENCIES, normalizeRequestPosition, validateRequestPosition, formatRequestSubject, formatRequestBody, buildRequestMail};
