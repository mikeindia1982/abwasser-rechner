import { mountKnowledgeBase } from './components/knowledge-base.js';
import { ensureKnowledgeSeed } from './services/knowledge-seed-service.js';

let active = false;
const seedReady = ensureKnowledgeSeed().catch((error) => {
  console.error('Basiswissen konnte nicht initialisiert werden', error);
  return { imported: 0, skipped: false, error };
});

function navButton() {
  return document.querySelector('[data-knowledge-view="knowledge"]');
}
function setKnowledgeActive(value) {
  active = value;
  navButton()?.classList.toggle('active', value);
}

async function showKnowledge() {
  const dashboard = document.getElementById('dashboard');
  const applicationView = document.getElementById('applicationView');
  const calculatorView = document.getElementById('calculatorView');
  if (!applicationView) return;

  dashboard?.classList.add('hidden');
  calculatorView?.classList.add('hidden');
  applicationView.classList.remove('hidden');
  document.getElementById('sidebar')?.classList.remove('mobile-open');
  document.getElementById('sidebarBackdrop')?.classList.remove('visible');
  document.body.classList.remove('menu-open');

  document.querySelectorAll('.global-nav-item').forEach((button) => button.classList.remove('active'));
  setKnowledgeActive(true);

  const current = document.getElementById('breadcrumbCurrent');
  const separator = document.getElementById('breadcrumbSeparator');
  if (current) current.textContent = 'Wissen';
  separator?.classList.remove('hidden');

  applicationView.innerHTML = '<div class="knowledge-loading">Wissensdatenbank wird geladen …</div>';
  try {
    await seedReady;
    await mountKnowledgeBase(applicationView);
  } catch (error) {
    console.error('Wissensdatenbank', error);
    applicationView.innerHTML = `<div class="knowledge-load-error"><h2>Wissensdatenbank konnte nicht geladen werden</h2><p>${String(error?.message || error)}</p></div>`;
  }
}

document.addEventListener('click', (event) => {
  const cancelForm = event.target.closest?.('[data-kb-action="cancel-form"]');
  if (cancelForm) {
    const modal = document.getElementById('knowledgeModal');
    if (modal) {
      event.preventDefault();
      event.stopPropagation();
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
      return;
    }
  }

  const knowledge = event.target.closest?.('[data-knowledge-view="knowledge"]');
  if (knowledge) {
    event.preventDefault();
    event.stopPropagation();
    showKnowledge();
    return;
  }

  const otherNavigation = event.target.closest?.('[data-global-view], [data-primary-view], #homeButton, #breadcrumbHome');
  if (otherNavigation && !knowledge && active) setKnowledgeActive(false);
}, true);

document.getElementById('activePlantSelect')?.addEventListener('change', () => {
  if (active) showKnowledge();
});
