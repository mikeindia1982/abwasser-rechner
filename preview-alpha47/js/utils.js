export const $ = (selector, root=document) => root.querySelector(selector);
export const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];

export function parseNumber(value){
  let s=String(value ?? "").trim().replace(/\s+/g,"");
  if(!s)return null;
  const comma=s.lastIndexOf(","), point=s.lastIndexOf(".");
  if(comma>=0&&point>=0){
    const decimal=Math.max(comma,point);
    s=s.slice(0,decimal).replace(/[.,]/g,"")+"."+s.slice(decimal+1).replace(/[.,]/g,"");
  }else s=s.replace(",",".");
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;
  const result=Number(s);
  return Number.isFinite(result)?result:null;
}
export const number=(value,digits=3)=>new Intl.NumberFormat("de-DE",{maximumFractionDigits:digits}).format(value);
export const money=value=>new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(value);
export const metric=(label,value)=>`<div class="metric"><small>${label}</small><strong>${value}</strong></div>`;
export const hint=(title,text,kind="")=>`<div class="hint ${kind}"><h4>${title}</h4><p>${text}</p></div>`;

export function numberField(id,label,unit,min=0,max=Infinity,value=""){
  return {type:"number",id,label,unit,min,max,value};
}
export function selectField(id,label,options,value=null){
  return {type:"select",id,label,options,value:value??options[0]};
}
export function fieldHtml(field){
  if(field.type==="select"){
    return `<label class="field-label">${field.label}<div class="input-row"><select id="field-${field.id}">${field.options.map(option=>`<option ${option===field.value?"selected":""}>${option}</option>`).join("")}</select><span class="unit">Auswahl</span></div><span class="error" id="error-${field.id}"></span></label>`;
  }
  return `<label class="field-label">${field.label}<div class="input-row"><input id="field-${field.id}" inputmode="decimal" value="${field.value}"><span class="unit">${field.unit}</span></div><span class="error" id="error-${field.id}"></span></label>`;
}
export function readFields(fields){
  const values={};let valid=true;
  for(const field of fields){
    const input=$(`#field-${field.id}`), error=$(`#error-${field.id}`);if(error)error.textContent="";
    if(field.type==="select"){values[field.id]=input.value;continue;}
    const value=parseNumber(input.value);
    if(value===null||value<field.min||value>field.max){if(error)error.textContent="Bitte gültigen Wert eingeben.";valid=false;}else values[field.id]=value;
  }
  return valid?values:null;
}
export function formShell({category,title,formula,description,fields,sections=[],info=""}){
  const body=sections.length?sections.map(section=>`<p class="section-title">${section.title}</p><div class="fields">${section.fields.map(fieldHtml).join("")}</div>`).join(""):`<div class="fields">${fields.map(fieldHtml).join("")}</div>`;
  return `<p class="eyebrow">${category}</p><h2>${title}</h2><span class="formula">${formula}</span><p class="description">${description}</p><form id="calculatorForm">${body}${info?`<div class="info-box">${info}</div>`:""}<div class="form-actions"><button class="button primary">Berechnen</button><button type="button" id="resetForm" class="button secondary">Zurücksetzen</button></div></form><div id="result"></div>`;
}
