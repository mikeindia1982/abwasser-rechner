(() => {
  const STORAGE_PLANTS = "abwasser-plants-v07";
  const MAX_PREVIEW_TASKS = 4;
  const TASK_ICONS = {
    general: "✓",
    call: "☎",
    scheduling: "◷",
    email: "✉",
    followup: "↻",
    review: "◎",
    technical: "⚙",
    commercial: "€",
    "spare-part": "▣"
  };

  function ensureStyles() {
    if (document.querySelector("#sidebarTaskPreviewStyles")) return;
    const style = document.createElement("style");
    style.id = "sidebarTaskPreviewStyles";
    style.textContent = `
      .sidebar-task-nav { position: relative; }
      .global-nav-item > .sidebar-task-count {
        margin-left: auto;
        width: auto;
        min-width: 1.45rem;
        height: 1.45rem;
        padding: 0 .38rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: rgba(255,255,255,.16);
        font-size: .72rem;
        font-weight: 800;
        line-height: 1;
      }
      .global-nav-item > .sidebar-task-count[hidden] { display: none; }
      .sidebar-task-preview {
        margin: -.18rem .55rem .55rem 2.5rem;
        padding: .35rem 0 .2rem;
        border-left: 1px solid rgba(255,255,255,.14);
      }
      .sidebar-task-preview[hidden] { display: none; }
      .sidebar-task-preview-item {
        width: 100%;
        display: grid;
        grid-template-columns: 1.45rem minmax(0,1fr);
        gap: .45rem;
        align-items: start;
        padding: .48rem .55rem;
        border: 0;
        border-radius: .55rem;
        background: transparent;
        color: inherit;
        text-align: left;
        cursor: pointer;
      }
      .sidebar-task-preview-item:hover,
      .sidebar-task-preview-item:focus-visible {
        background: rgba(255,255,255,.08);
        outline: none;
      }
      .sidebar-task-preview-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.35rem;
        height: 1.35rem;
        border-radius: .4rem;
        background: rgba(255,255,255,.09);
        font-size: .76rem;
        font-weight: 800;
      }
      .sidebar-task-preview-copy { min-width: 0; }
      .sidebar-task-preview-copy strong,
      .sidebar-task-preview-copy small {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .sidebar-task-preview-copy strong {
        font-size: .76rem;
        font-weight: 700;
        line-height: 1.25;
      }
      .sidebar-task-preview-copy small {
        margin-top: .14rem;
        font-size: .65rem;
        opacity: .68;
      }
      .sidebar-task-preview-item.is-overdue .sidebar-task-preview-copy small {
        font-weight: 700;
        opacity: .95;
      }
      .sidebar-task-all {
        display: block;
        width: 100%;
        margin-top: .15rem;
        padding: .4rem .55rem;
        border: 0;
        background: transparent;
        color: inherit;
        text-align: left;
        font-size: .69rem;
        font-weight: 800;
        cursor: pointer;
        opacity: .78;
      }
      .sidebar-task-all:hover,
      .sidebar-task-all:focus-visible { opacity: 1; outline: none; }
      @media (max-width: 760px) {
        .sidebar-task-preview { margin-left: 2.65rem; margin-right: .65rem; }
      }
    `;
    document.head.append(style);
  }

  function loadOpenTasks() {
    try {
      const plants = JSON.parse(localStorage.getItem(STORAGE_PLANTS) || "[]");
      if (!Array.isArray(plants)) return [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      return plants.flatMap(plant => (Array.isArray(plant?.actions) ? plant.actions : [])
        .filter(action => action?.status !== "done")
        .map(action => ({
          plantId: plant?.id || "",
          plantName: plant?.master?.name || "Kläranlage",
          action,
          overdue: Boolean(action?.dueDate && action.dueDate < todayKey)
        })))
        .sort((a, b) => {
          if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
          const priority = item => item.action?.priority === "high" ? 0 : 1;
          if (priority(a) !== priority(b)) return priority(a) - priority(b);
          const dueCompare = String(a.action?.dueDate || "9999-12-31").localeCompare(String(b.action?.dueDate || "9999-12-31"));
          if (dueCompare) return dueCompare;
          return String(b.action?.createdAt || "").localeCompare(String(a.action?.createdAt || ""));
        });
    } catch (error) {
      console.warn("Sidebar-Aufgaben konnten nicht gelesen werden", error);
      return [];
    }
  }

  function formatDueDate(value, overdue) {
    if (!value) return "Ohne Fälligkeit";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "Fälligkeit prüfen";
    const label = date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
    return overdue ? `Überfällig · ${label}` : `Fällig ${label}`;
  }

  function openGlobalTasks(actionId = "") {
    const navButton = document.querySelector('[data-global-view="tasks-global"]');
    if (!navButton) return;
    navButton.click();
    if (!actionId) return;
    window.setTimeout(() => {
      const card = [...document.querySelectorAll("[data-action-id]")].find(element => element.dataset.actionId === actionId);
      if (!card) return;
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      card.animate?.([
        { transform: "scale(1)", opacity: 1 },
        { transform: "scale(1.015)", opacity: .92 },
        { transform: "scale(1)", opacity: 1 }
      ], { duration: 480, easing: "ease-out" });
    }, 80);
  }

  function ensurePreviewElements() {
    const navButton = document.querySelector('[data-global-view="tasks-global"]');
    if (!navButton) return null;
    navButton.classList.add("sidebar-task-nav");

    let count = navButton.querySelector(".sidebar-task-count");
    if (!count) {
      count = document.createElement("span");
      count.className = "sidebar-task-count";
      count.setAttribute("aria-label", "Offene Aufgaben");
      navButton.append(count);
    }

    let preview = document.querySelector("#sidebarTaskPreview");
    if (!preview) {
      preview = document.createElement("div");
      preview.id = "sidebarTaskPreview";
      preview.className = "sidebar-task-preview";
      navButton.insertAdjacentElement("afterend", preview);
    }
    return { navButton, count, preview };
  }

  function renderSidebarTasks() {
    ensureStyles();
    const elements = ensurePreviewElements();
    if (!elements) return;
    const tasks = loadOpenTasks();
    const { count, preview } = elements;

    count.textContent = String(tasks.length);
    count.hidden = tasks.length === 0;
    preview.replaceChildren();
    preview.hidden = tasks.length === 0;
    if (!tasks.length) return;

    tasks.slice(0, MAX_PREVIEW_TASKS).forEach(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `sidebar-task-preview-item${item.overdue ? " is-overdue" : ""}`;
      button.title = `${item.action?.title || "Aufgabe"} · ${item.plantName}`;
      button.addEventListener("click", () => openGlobalTasks(item.action?.id || ""));

      const icon = document.createElement("span");
      icon.className = "sidebar-task-preview-icon";
      icon.textContent = TASK_ICONS[item.action?.taskType] || TASK_ICONS.general;

      const copy = document.createElement("span");
      copy.className = "sidebar-task-preview-copy";
      const title = document.createElement("strong");
      title.textContent = item.action?.title || "Aufgabe";
      const meta = document.createElement("small");
      meta.textContent = `${item.plantName} · ${formatDueDate(item.action?.dueDate || "", item.overdue)}`;
      copy.append(title, meta);
      button.append(icon, copy);
      preview.append(button);
    });

    const allButton = document.createElement("button");
    allButton.type = "button";
    allButton.className = "sidebar-task-all";
    allButton.textContent = tasks.length > MAX_PREVIEW_TASKS
      ? `Alle ${tasks.length} Aufgaben anzeigen →`
      : "Alle Aufgaben anzeigen →";
    allButton.addEventListener("click", () => openGlobalTasks());
    preview.append(allButton);
  }

  function start() {
    renderSidebarTasks();
    const mainContent = document.querySelector("#mainContent");
    if (mainContent) {
      let refreshQueued = false;
      const observer = new MutationObserver(() => {
        if (refreshQueued) return;
        refreshQueued = true;
        requestAnimationFrame(() => {
          refreshQueued = false;
          renderSidebarTasks();
        });
      });
      observer.observe(mainContent, { childList: true, subtree: true });
    }
    window.addEventListener("storage", event => {
      if (event.key === STORAGE_PLANTS) renderSidebarTasks();
    });
    window.addEventListener("pageshow", renderSidebarTasks);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) renderSidebarTasks();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
