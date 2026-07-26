const PDFJS_VERSION = "5.7.284";
const PDFJS_MODULE_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.mjs`;
const PDFJS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.mjs`;

let pdfjsPromise;

async function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import(PDFJS_MODULE_URL).then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      return pdfjsLib;
    });
  }
  return pdfjsPromise;
}

export class PdfViewer {
  constructor(host, options = {}) {
    if (!host) throw new Error("PDF-Viewer: Zielcontainer fehlt.");
    this.host = host;
    this.options = options;
    this.pdf = null;
    this.pageNumber = 1;
    this.scale = 1.2;
    this.rotation = 0;
    this.renderTask = null;
    this.resizeObserver = null;
    this.blob = null;
    this.fileName = options.fileName || "dokument.pdf";
    this.fitMode = "width";
    this.renderShell();
  }

  renderShell() {
    this.host.classList.add("pdfjs-viewer");
    this.host.innerHTML = `
      <div class="pdfjs-toolbar" role="toolbar" aria-label="PDF-Werkzeuge">
        <button type="button" data-pdf-action="prev" title="Vorherige Seite">‹</button>
        <label class="pdfjs-page-control"><span>Seite</span><input data-pdf-page type="number" min="1" value="1"><span data-pdf-pages>/ –</span></label>
        <button type="button" data-pdf-action="next" title="Nächste Seite">›</button>
        <span class="pdfjs-separator"></span>
        <button type="button" data-pdf-action="zoom-out" title="Verkleinern">−</button>
        <span data-pdf-zoom>100 %</span>
        <button type="button" data-pdf-action="zoom-in" title="Vergrößern">+</button>
        <button type="button" data-pdf-action="fit" title="An Breite anpassen">Breite</button>
        <button type="button" data-pdf-action="rotate" title="Drehen">↻</button>
        <span class="pdfjs-toolbar-spacer"></span>
        <button type="button" data-pdf-action="download" title="Original exportieren">Export</button>
        <button type="button" data-pdf-action="fullscreen" title="Vollbild">Vollbild</button>
      </div>
      <div class="pdfjs-stage" tabindex="0">
        <div class="pdfjs-status" data-pdf-status>PDF wird geladen …</div>
        <canvas data-pdf-canvas aria-label="PDF-Seite"></canvas>
      </div>`;

    this.canvas = this.host.querySelector("[data-pdf-canvas]");
    this.stage = this.host.querySelector(".pdfjs-stage");
    this.status = this.host.querySelector("[data-pdf-status]");
    this.pageInput = this.host.querySelector("[data-pdf-page]");
    this.pagesLabel = this.host.querySelector("[data-pdf-pages]");
    this.zoomLabel = this.host.querySelector("[data-pdf-zoom]");

    this.host.querySelectorAll("[data-pdf-action]").forEach((button) => {
      button.addEventListener("click", () => this.handleAction(button.dataset.pdfAction));
    });
    this.pageInput.addEventListener("change", () => this.goToPage(Number(this.pageInput.value)));
    this.stage.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "PageUp") this.goToPage(this.pageNumber - 1);
      if (event.key === "ArrowRight" || event.key === "PageDown") this.goToPage(this.pageNumber + 1);
    });
    this.resizeObserver = new ResizeObserver(() => {
      if (this.pdf && this.fitMode === "width") this.renderPage();
    });
    this.resizeObserver.observe(this.stage);
  }

  async load(blob, fileName = this.fileName) {
    if (!(blob instanceof Blob)) throw new TypeError("PDF-Viewer: Kein gültiger PDF-Blob.");
    this.blob = blob;
    this.fileName = fileName || this.fileName;
    this.setStatus("PDF.js wird geladen …");
    try {
      const pdfjsLib = await loadPdfJs();
      const data = new Uint8Array(await blob.arrayBuffer());
      const loadingTask = pdfjsLib.getDocument({ data });
      loadingTask.onProgress = ({ loaded, total }) => {
        if (total) this.setStatus(`PDF wird geladen … ${Math.round((loaded / total) * 100)} %`);
      };
      this.pdf = await loadingTask.promise;
      this.pageNumber = 1;
      this.pagesLabel.textContent = `/ ${this.pdf.numPages}`;
      this.pageInput.max = String(this.pdf.numPages);
      await this.renderPage();
    } catch (error) {
      console.error("PDF.js Viewer", error);
      this.setStatus(`PDF konnte nicht angezeigt werden: ${error?.message || String(error)}`, true);
      throw error;
    }
  }

  async renderPage() {
    if (!this.pdf) return;
    if (this.renderTask) {
      try { this.renderTask.cancel(); } catch (_) {}
      this.renderTask = null;
    }
    const page = await this.pdf.getPage(this.pageNumber);
    const baseViewport = page.getViewport({ scale: 1, rotation: this.rotation });
    let cssScale = this.scale;
    if (this.fitMode === "width") {
      const available = Math.max(240, this.stage.clientWidth - 32);
      cssScale = available / baseViewport.width;
    }
    const cssViewport = page.getViewport({ scale: cssScale, rotation: this.rotation });
    const outputScale = Math.min(window.devicePixelRatio || 1, 2);
    const renderViewport = page.getViewport({ scale: cssScale * outputScale, rotation: this.rotation });
    const context = this.canvas.getContext("2d", { alpha: false });
    this.canvas.width = Math.floor(renderViewport.width);
    this.canvas.height = Math.floor(renderViewport.height);
    this.canvas.style.width = `${Math.floor(cssViewport.width)}px`;
    this.canvas.style.height = `${Math.floor(cssViewport.height)}px`;
    this.setStatus("Seite wird gerendert …");
    this.renderTask = page.render({ canvasContext: context, viewport: renderViewport });
    try {
      await this.renderTask.promise;
      this.renderTask = null;
      this.status.hidden = true;
      this.canvas.hidden = false;
      this.pageInput.value = String(this.pageNumber);
      this.zoomLabel.textContent = this.fitMode === "width" ? "Breite" : `${Math.round(this.scale * 100)} %`;
    } catch (error) {
      if (error?.name !== "RenderingCancelledException") throw error;
    }
  }

  setStatus(message, isError = false) {
    this.status.hidden = false;
    this.status.textContent = message;
    this.status.classList.toggle("is-error", isError);
    if (isError) this.canvas.hidden = true;
  }

  async goToPage(number) {
    if (!this.pdf) return;
    const target = Math.min(this.pdf.numPages, Math.max(1, Math.round(number || 1)));
    if (target === this.pageNumber) return;
    this.pageNumber = target;
    await this.renderPage();
  }

  async handleAction(action) {
    switch (action) {
      case "prev": return this.goToPage(this.pageNumber - 1);
      case "next": return this.goToPage(this.pageNumber + 1);
      case "zoom-in": this.fitMode = "custom"; this.scale = Math.min(4, this.scale + 0.2); return this.renderPage();
      case "zoom-out": this.fitMode = "custom"; this.scale = Math.max(0.3, this.scale - 0.2); return this.renderPage();
      case "fit": this.fitMode = "width"; return this.renderPage();
      case "rotate": this.rotation = (this.rotation + 90) % 360; return this.renderPage();
      case "download": return this.download();
      case "fullscreen": return this.toggleFullscreen();
    }
  }

  download() {
    if (!this.blob) return;
    const url = URL.createObjectURL(this.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = this.fileName;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async toggleFullscreen() {
    if (!document.fullscreenElement) await this.host.requestFullscreen?.();
    else await document.exitFullscreen?.();
  }

  destroy() {
    this.resizeObserver?.disconnect();
    if (this.renderTask) try { this.renderTask.cancel(); } catch (_) {}
    this.pdf?.destroy?.();
    this.host.innerHTML = "";
  }
}
