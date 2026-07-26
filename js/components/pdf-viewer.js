const PDFJS_MODULE_URL = new URL('../vendor/pdfjs/pdf.min.mjs', import.meta.url).href;
const PDFJS_WORKER_URL = new URL('../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;

let pdfjsPromise;

async function loadPdfJs(){
  if(!pdfjsPromise){
    pdfjsPromise=import(PDFJS_MODULE_URL).then(pdfjs=>{
      pdfjs.GlobalWorkerOptions.workerSrc=PDFJS_WORKER_URL;
      return pdfjs;
    }).catch(error=>{
      pdfjsPromise=undefined;
      throw error;
    });
  }
  return pdfjsPromise;
}

function clamp(value,min,max){
  return Math.min(max,Math.max(min,value));
}

function safeFileName(value){
  return String(value||'Dokument.pdf')
    .replace(/[\\/:*?"<>|]+/g,'_')
    .trim()||'Dokument.pdf';
}

export async function mountPdfViewer(container,blob,{fileName='Dokument.pdf'}={}){
  if(!container) throw new Error('PDF-Viewer-Container fehlt.');
  if(!(blob instanceof Blob)) throw new Error('Die PDF-Datei ist nicht verfügbar.');

  container.classList.add('pdf-viewer');
  container.innerHTML=`
    <div class="pdf-viewer-toolbar" role="toolbar" aria-label="PDF-Werkzeuge">
      <button type="button" data-pdf-prev aria-label="Vorherige Seite">‹</button>
      <label class="pdf-page-control">
        <span>Seite</span>
        <input data-pdf-page type="number" min="1" value="1" inputmode="numeric">
        <span data-pdf-pages>/ 1</span>
      </label>
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
      <div class="pdf-viewer-message" data-pdf-message role="status">PDF wird geladen …</div>
      <canvas data-pdf-canvas aria-label="PDF-Seite"></canvas>
    </div>`;

  const canvas=container.querySelector('[data-pdf-canvas]');
  const stage=container.querySelector('[data-pdf-stage]');
  const message=container.querySelector('[data-pdf-message]');
  const pageInput=container.querySelector('[data-pdf-page]');
  const pagesLabel=container.querySelector('[data-pdf-pages]');
  const zoomLabel=container.querySelector('[data-pdf-zoom]');
  const previousButton=container.querySelector('[data-pdf-prev]');
  const nextButton=container.querySelector('[data-pdf-next]');
  const ctx=canvas.getContext('2d',{alpha:false});

  if(!ctx) throw new Error('Canvas-Kontext konnte nicht erstellt werden.');

  let pdf=null;
  let loadingTask=null;
  let pageNumber=1;
  let scale=1;
  let rotation=0;
  let renderTask=null;
  let destroyed=false;
  let resizeTimer=null;

  function updateControls(){
    const pageCount=pdf?.numPages||1;
    pageInput.value=String(pageNumber);
    pageInput.max=String(pageCount);
    pagesLabel.textContent=`/ ${pageCount}`;
    zoomLabel.textContent=`${Math.round(scale*100)} %`;
    previousButton.disabled=pageNumber<=1;
    nextButton.disabled=!pdf||pageNumber>=pageCount;
  }

  async function renderPage(){
    if(!pdf||destroyed) return;

    if(renderTask){
      try{renderTask.cancel()}catch{}
    }

    const page=await pdf.getPage(pageNumber);
    if(destroyed) return;

    const outputScale=Math.max(1,window.devicePixelRatio||1);
    const viewport=page.getViewport({scale,rotation});

    canvas.hidden=false;
    canvas.width=Math.max(1,Math.floor(viewport.width*outputScale));
    canvas.height=Math.max(1,Math.floor(viewport.height*outputScale));
    canvas.style.width=`${Math.floor(viewport.width)}px`;
    canvas.style.height=`${Math.floor(viewport.height)}px`;

    updateControls();
    message.hidden=true;

    renderTask=page.render({
      canvasContext:ctx,
      viewport,
      transform:outputScale===1?null:[outputScale,0,0,outputScale,0,0]
    });

    try{
      await renderTask.promise;
    }catch(error){
      if(error?.name!=='RenderingCancelledException') throw error;
    }finally{
      renderTask=null;
      page.cleanup?.();
    }
  }

  async function fitWidth(){
    if(!pdf||destroyed) return;
    const page=await pdf.getPage(pageNumber);
    const viewport=page.getViewport({scale:1,rotation});
    const available=Math.max(280,stage.clientWidth-32);
    scale=clamp(available/viewport.width,.25,4);
    await renderPage();
  }

  function scheduleFitWidth(){
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{void fitWidth()},150);
  }

  try{
    const pdfjs=await loadPdfJs();
    const data=new Uint8Array(await blob.arrayBuffer());
    loadingTask=pdfjs.getDocument({data});
    pdf=await loadingTask.promise;
    updateControls();
    await fitWidth();
  }catch(error){
    console.error('PDF.js-Viewer:',error);
    message.hidden=false;
    message.innerHTML='<strong>PDF konnte nicht angezeigt werden.</strong><br><span>Die lokale PDF.js-Bibliothek fehlt oder die Datei ist beschädigt.</span>';
    canvas.hidden=true;
    throw error;
  }

  previousButton.onclick=()=>{
    if(pageNumber>1){
      pageNumber--;
      void renderPage();
    }
  };

  nextButton.onclick=()=>{
    if(pdf&&pageNumber<pdf.numPages){
      pageNumber++;
      void renderPage();
    }
  };

  pageInput.onchange=()=>{
    pageNumber=clamp(Number(pageInput.value)||1,1,pdf.numPages);
    void renderPage();
  };

  container.querySelector('[data-pdf-zoom-out]').onclick=()=>{
    scale=clamp(scale-.15,.25,4);
    void renderPage();
  };

  container.querySelector('[data-pdf-zoom-in]').onclick=()=>{
    scale=clamp(scale+.15,.25,4);
    void renderPage();
  };

  container.querySelector('[data-pdf-fit]').onclick=()=>{void fitWidth()};

  container.querySelector('[data-pdf-rotate]').onclick=()=>{
    rotation=(rotation+90)%360;
    void fitWidth();
  };

  container.querySelector('[data-pdf-fullscreen]').onclick=async()=>{
    if(document.fullscreenElement){
      await document.exitFullscreen();
    }else{
      await container.requestFullscreen?.();
    }
  };

  container.querySelector('[data-pdf-download]').onclick=()=>{
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement('a');
    anchor.href=url;
    anchor.download=safeFileName(fileName);
    anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  window.addEventListener('resize',scheduleFitWidth);

  return {
    destroy(){
      destroyed=true;
      clearTimeout(resizeTimer);
      window.removeEventListener('resize',scheduleFitWidth);
      if(renderTask){
        try{renderTask.cancel()}catch{}
      }
      try{loadingTask?.destroy?.()}catch{}
      try{pdf?.destroy?.()}catch{}
      container.innerHTML='';
      container.classList.remove('pdf-viewer');
    }
  };
}
