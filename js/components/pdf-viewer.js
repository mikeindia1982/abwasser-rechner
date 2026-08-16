const PDFJS_MODULE_URL = new URL('../vendor/pdfjs/pdf.min.mjs', import.meta.url).href;
const PDFJS_WORKER_URL = new URL('../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
let pdfjsPromise;

async function loadPdfJs(){
  if(!pdfjsPromise){
    pdfjsPromise=import(PDFJS_MODULE_URL).then(pdfjs=>{
      pdfjs.GlobalWorkerOptions.workerSrc=PDFJS_WORKER_URL;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

function clamp(value,min,max){return Math.min(max,Math.max(min,value))}

export async function mountPdfViewer(container,blob,{fileName='Dokument.pdf'}={}){
  if(!container) throw new Error('PDF-Viewer-Container fehlt.');
  if(!(blob instanceof Blob)) throw new Error('Die PDF-Datei ist nicht verfügbar.');

  container.classList.add('pdf-viewer');
  container.innerHTML=`
    <div class="pdf-viewer-toolbar" role="toolbar" aria-label="PDF-Werkzeuge">
      <button type="button" data-pdf-prev aria-label="Vorherige Seite">‹</button>
      <label class="pdf-page-control"><span>Seite</span><input data-pdf-page type="number" min="1" value="1"><span data-pdf-pages>/ 1</span></label>
      <button type="button" data-pdf-next aria-label="Nächste Seite">›</button>
      <span class="pdf-toolbar-separator"></span>
      <button type="button" data-pdf-zoom-out aria-label="Verkleinern">−</button>
      <span data-pdf-zoom>100 %</span>
      <button type="button" data-pdf-zoom-in aria-label="Vergrößern">+</button>
      <button type="button" data-pdf-fit>An Breite</button>
      <button type="button" data-pdf-rotate>Drehen</button>
      <button type="button" data-pdf-fullscreen>Vollbild</button>
      <button type="button" data-pdf-download>Original</button>
    </div>
    <div class="pdf-viewer-stage" data-pdf-stage>
      <div class="pdf-viewer-message" data-pdf-message>PDF wird geladen …</div>
      <canvas data-pdf-canvas aria-label="PDF-Seite"></canvas>
    </div>`;

  const canvas=container.querySelector('[data-pdf-canvas]');
  const stage=container.querySelector('[data-pdf-stage]');
  const message=container.querySelector('[data-pdf-message]');
  const pageInput=container.querySelector('[data-pdf-page]');
  const pagesLabel=container.querySelector('[data-pdf-pages]');
  const zoomLabel=container.querySelector('[data-pdf-zoom]');
  const ctx=canvas.getContext('2d',{alpha:false});
  let pdf=null,pageNumber=1,scale=1,rotation=0,renderTask=null,destroyed=false;

  async function renderPage(){
    if(!pdf||destroyed)return;
    if(renderTask){try{renderTask.cancel()}catch{}}
    const page=await pdf.getPage(pageNumber);
    const baseViewport=page.getViewport({scale:1,rotation});
    const outputScale=Math.max(1,window.devicePixelRatio||1);
    const viewport=page.getViewport({scale,rotation});
    canvas.width=Math.floor(viewport.width*outputScale);
    canvas.height=Math.floor(viewport.height*outputScale);
    canvas.style.width=`${Math.floor(viewport.width)}px`;
    canvas.style.height=`${Math.floor(viewport.height)}px`;
    pageInput.value=String(pageNumber);
    pagesLabel.textContent=`/ ${pdf.numPages}`;
    zoomLabel.textContent=`${Math.round(scale*100)} %`;
    message.hidden=true;
    renderTask=page.render({canvasContext:ctx,viewport,transform:outputScale===1?null:[outputScale,0,0,outputScale,0,0]});
    try{await renderTask.promise}catch(error){if(error?.name!=='RenderingCancelledException')throw error}
    void baseViewport;
  }

  async function fitWidth(){
    if(!pdf)return;
    const page=await pdf.getPage(pageNumber);
    const viewport=page.getViewport({scale:1,rotation});
    const available=Math.max(280,stage.clientWidth-32);
    scale=clamp(available/viewport.width,.25,4);
    await renderPage();
  }

  try{
    const pdfjs=await loadPdfJs();
    const data=new Uint8Array(await blob.arrayBuffer());
    const loadingTask=pdfjs.getDocument({data});
    pdf=await loadingTask.promise;
    pageInput.max=String(pdf.numPages);
    await fitWidth();
  }catch(error){
    console.error('PDF.js-Viewer:',error);
    message.hidden=false;
    message.innerHTML=`<strong>PDF konnte nicht angezeigt werden.</strong><br><span>${String(error?.message||error)}</span>`;
    canvas.hidden=true;
    throw error;
  }

  container.querySelector('[data-pdf-prev]').onclick=()=>{if(pageNumber>1){pageNumber--;renderPage()}};
  container.querySelector('[data-pdf-next]').onclick=()=>{if(pdf&&pageNumber<pdf.numPages){pageNumber++;renderPage()}};
  pageInput.onchange=()=>{pageNumber=clamp(Number(pageInput.value)||1,1,pdf.numPages);renderPage()};
  container.querySelector('[data-pdf-zoom-out]').onclick=()=>{scale=clamp(scale-.15,.25,4);renderPage()};
  container.querySelector('[data-pdf-zoom-in]').onclick=()=>{scale=clamp(scale+.15,.25,4);renderPage()};
  container.querySelector('[data-pdf-fit]').onclick=fitWidth;
  container.querySelector('[data-pdf-rotate]').onclick=()=>{rotation=(rotation+90)%360;fitWidth()};
  container.querySelector('[data-pdf-fullscreen]').onclick=async()=>{if(document.fullscreenElement)await document.exitFullscreen();else await container.requestFullscreen?.()};
  container.querySelector('[data-pdf-download]').onclick=()=>{
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fileName;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  return {destroy(){destroyed=true;if(renderTask){try{renderTask.cancel()}catch{}}pdf?.destroy?.();container.innerHTML=''}};
}
