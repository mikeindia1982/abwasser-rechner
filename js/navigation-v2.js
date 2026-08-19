const STORAGE_PLANTS = "abwasser-plants-v07";
const STORAGE_ACTIVE_PLANT = "abwasser-active-plant-v07";
const STORAGE_PLANT_PAGE = "abwasser-plant-page-v091a";

function $(selector, root = document) {
  return root.querySelector(selector);
}

function $$(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

function clickExisting(selector) {
  const target = $(selector);
  if (!target) return false;
  target.click();
  return true;
}

function getActivePlantSnapshot() {
  try {
    const plants = JSON.parse(localStorage.getItem(STORAGE_PLANTS) || "[]");
    const select = $("#activePlantSelect");
    const activeId =
      localStorage.getItem(STORAGE_ACTIVE_PLANT) || select?.value || plants[0]?.id || "";
    return {
      activeId,
      plant: Array.isArray(plants) ? plants.find((item) => item.id === activeId) || null : null,
    };
  } catch {
    return { activeId: "", plant: null };
  }
}

function openActivePlant(page = "overview") {
  const { activeId } = getActivePlantSnapshot();
  if (!activeId) {
    clickExisting('[data-primary-view="plants"]');
    return false;
  }
  localStorage.setItem(STORAGE_PLANT_PAGE, page);
  const select = $("#activePlantSelect");
  if (!select) return false;
  select.value = activeId;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function waitForElement(test, timeout = 1800) {
  return new Promise((resolve) => {
    const find = () => (typeof test === "function" ? test() : $(test));
    const existing = find();
    if (existing) return resolve(existing);

    const observer = new MutationObserver(() => {
      const found = find();
      if (!found) return;
      observer.disconnect();
      clearTimeout(timer);
      resolve(found);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

async function handleVisitShortcut() {
  if ($(".visit-mode-header")) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const { plant, activeId } = getActivePlantSnapshot();
  if (!activeId || !plant) {
    clickExisting('[data-primary-view="plants"]');
    return;
  }

  const activeVisit = (plant.visits || []).find((visit) => visit.modeStatus === "active");
  if (activeVisit) {
    const currentButton = $$('[data-open-visit]').find(
      (button) => button.dataset.openVisit === activeVisit.id,
    );
    if (currentButton) {
      currentButton.click();
      return;
    }

    if (!openActivePlant("visits")) return;
    const continueButton = await waitForElement(
      () => $$('[data-open-visit]').find((button) => button.dataset.openVisit === activeVisit.id),
      2200,
    );
    continueButton?.click();
    return;
  }

  const directStart = $("#startVisit") || $("#startVisitCockpit") || $("#startVisitMain");
  if (directStart) {
    directStart.click();
    return;
  }

  if (!openActivePlant("overview")) return;
  const startButton = await waitForElement("#startVisit", 2200);
  startButton?.click();
}

function buildMoreSheet() {
  if ($("#navigationV2MoreSheet")) return;
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="nav-v2-more-backdrop" id="navigationV2MoreBackdrop" hidden></div>
     <section class="nav-v2-more-sheet" id="navigationV2MoreSheet" role="dialog" aria-modal="true" aria-labelledby="navigationV2MoreTitle" hidden>
       <div class="nav-v2-sheet-handle" aria-hidden="true"></div>
       <header class="nav-v2-sheet-header">
         <div><p>Weitere Bereiche</p><h2 id="navigationV2MoreTitle">Mehr</h2></div>
         <button type="button" class="nav-v2-sheet-close" aria-label="Menü schließen">×</button>
       </header>
       <div class="nav-v2-sheet-group">
         <span class="nav-v2-sheet-label">Arbeitsmittel</span>
         <button type="button" data-v2-target='[data-global-view="products"]'><b>Produkte</b><small>Produktdatenbank und Produktwissen</small><i>›</i></button>
         <button type="button" data-v2-target='[data-global-view="documents"]'><b>Dokumente</b><small>PDFs, Berichte und Unterlagen</small><i>›</i></button>
         <button type="button" data-v2-target='[data-primary-view="calculators"]'><b>Rechner</b><small>Fachliche Berechnungen und Werkzeuge</small><i>›</i></button>
         <button type="button" data-v2-target='[data-global-view="projects"]'><b>Optimierungsprojekte</b><small>Projekt- und Vertriebspipeline</small><i>›</i></button>
       </div>
       <div class="nav-v2-sheet-group">
         <span class="nav-v2-sheet-label">Organisation</span>
         <button type="button" data-v2-target='[data-global-view="appointments"]'><b>Termine</b><small>Besuche und Einsatzplanung</small><i>›</i></button>
         <button type="button" data-v2-target="#profileButton"><b>Mitarbeiterprofil</b><small>Kontaktdaten und Visitenkarte</small><i>›</i></button>
       </div>
       <div class="nav-v2-sheet-group">
         <span class="nav-v2-sheet-label">System</span>
         <button type="button" data-v2-target='[data-global-view="backup"]'><b>Backup</b><small>Lokale Daten sichern und wiederherstellen</small><i>›</i></button>
         <button type="button" data-v2-target='[data-global-view="settings"]'><b>Einstellungen</b><small>Appweite Optionen</small><i>›</i></button>
         <button type="button" data-v2-target='[data-global-view="system"]'><b>Info &amp; System</b><small>Version und Systeminformationen</small><i>›</i></button>
       </div>
     </section>`,
  );

  $("#navigationV2MoreBackdrop")?.addEventListener("click", closeMoreSheet);
  $(".nav-v2-sheet-close")?.addEventListener("click", closeMoreSheet);
  $$("[data-v2-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.v2Target;
      closeMoreSheet();
      requestAnimationFrame(() => clickExisting(target));
    });
  });
}

function openMoreSheet() {
  buildMoreSheet();
  const sheet = $("#navigationV2MoreSheet");
  const backdrop = $("#navigationV2MoreBackdrop");
  if (!sheet || !backdrop) return;
  sheet.hidden = false;
  backdrop.hidden = false;
  requestAnimationFrame(() => {
    sheet.classList.add("open");
    backdrop.classList.add("open");
    document.body.classList.add("nav-v2-sheet-open");
    syncNavigationState();
  });
}

function closeMoreSheet() {
  const sheet = $("#navigationV2MoreSheet");
  const backdrop = $("#navigationV2MoreBackdrop");
  if (!sheet || !backdrop) return;
  sheet.classList.remove("open");
  backdrop.classList.remove("open");
  document.body.classList.remove("nav-v2-sheet-open");
  setTimeout(() => {
    sheet.hidden = true;
    backdrop.hidden = true;
    syncNavigationState();
  }, 180);
}

function normalizePlantNavigation() {
  const subnav = $(".plant-subnav");
  if (!subnav) return;
  const labels = {
    overview: "Übersicht",
    technology: "Technik",
    visits: "Aktivitäten",
    tasks: "Vorgänge",
    record: "Stammdaten",
  };
  for (const [page, label] of Object.entries(labels)) {
    const button = $(`[data-plant-page="${page}"]`, subnav);
    if (button && button.textContent !== label) button.textContent = label;
  }

  const routeButton = $("#openNavigation");
  if (routeButton && routeButton.textContent.trim() === "Navigation") {
    routeButton.textContent = "Route starten";
  }

  const plantTitle = $(".plant-shell-header h1")?.textContent?.trim();
  const breadcrumb = $("#breadcrumbCurrent");
  if (plantTitle && breadcrumb) breadcrumb.textContent = plantTitle;
}

function normalizeWorkflowLabels() {
  const taskNav = $('[data-global-view="tasks-global"]');
  const taskLabel = taskNav?.querySelector("strong");
  if (taskLabel) taskLabel.textContent = "Vorgänge";

  if (!taskNav?.classList.contains("active")) return;
  const applicationView = $("#applicationView");
  if (!applicationView || applicationView.classList.contains("hidden")) return;
  const header = $(".global-page-header", applicationView);
  if (!header) return;
  const eyebrow = $(".eyebrow", header);
  const title = $("h1", header);
  const subtitle = $(".subtitle", header);
  if (eyebrow) eyebrow.textContent = "Arbeitsliste";
  if (title) title.textContent = "Vorgänge";
  if (subtitle) subtitle.textContent = "Offene Vorgänge und Aufgaben aus allen Anlagen.";
}

function syncNavigationState() {
  const visitMode = Boolean($(".visit-mode-header"));
  const mappings = {
    start: $('[data-global-view="today"]')?.classList.contains("active"),
    plants:
      $('[data-primary-view="plants"]')?.classList.contains("active") && !visitMode,
    workflows: $('[data-global-view="tasks-global"]')?.classList.contains("active"),
    visit: visitMode,
    more: Boolean($("#navigationV2MoreSheet")?.classList.contains("open")),
  };

  $$("[data-bottom-nav]").forEach((button) => {
    const active = Boolean(mappings[button.dataset.bottomNav]);
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });

  const { plant } = getActivePlantSnapshot();
  const activeVisit = (plant?.visits || []).find((visit) => visit.modeStatus === "active");
  const visitButton = $('[data-bottom-nav="visit"]');
  if (visitButton) {
    visitButton.title = activeVisit ? "Laufenden Besuch fortsetzen" : "Besuch starten";
    visitButton.setAttribute(
      "aria-label",
      activeVisit ? "Laufenden Besuch fortsetzen" : "Besuch starten",
    );
  }
}

function refreshNavigationV2() {
  normalizePlantNavigation();
  normalizeWorkflowLabels();
  syncNavigationState();
}

function initNavigationV2() {
  const bottom = $("#bottomNavigation");
  if (!bottom) return;

  buildMoreSheet();

  $('[data-bottom-nav="start"]')?.addEventListener("click", () =>
    clickExisting('[data-global-view="today"]'),
  );
  $('[data-bottom-nav="plants"]')?.addEventListener("click", () =>
    clickExisting('[data-primary-view="plants"]'),
  );
  $('[data-bottom-nav="visit"]')?.addEventListener("click", handleVisitShortcut);
  $('[data-bottom-nav="workflows"]')?.addEventListener("click", () =>
    clickExisting('[data-global-view="tasks-global"]'),
  );
  $('[data-bottom-nav="more"]')?.addEventListener("click", openMoreSheet);

  const observer = new MutationObserver(() => refreshNavigationV2());
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });

  refreshNavigationV2();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initNavigationV2, { once: true });
} else {
  initNavigationV2();
}
