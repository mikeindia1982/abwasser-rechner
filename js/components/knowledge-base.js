import { knowledgeRepository } from '../repositories/knowledge-repository.js';

const TYPE_LABELS = {
  technical_knowledge: 'Fachwissen',
  problem_solution: 'Problem & Lösung',
  experience: 'Praxiserfahrung',
  test_result: 'Versuchsergebnis',
  product_knowledge: 'Produktwissen',
  work_instruction: 'Arbeitsanweisung',
  faq: 'FAQ',
  best_practice: 'Best Practice',
  issue_pattern: 'Fehlerbild',
  internal_knowledge: 'Unternehmenswissen',
};
const STATUS_LABELS = { draft: 'Entwurf', review: 'Zur Prüfung', approved: 'Freigegeben', archived: 'Archiviert' };
const LEVEL_LABELS = { unverified: 'Ungeprüfte Erfahrung', practical: 'Praxiserprobt', verified: 'Geprüft', official: 'Offizielle Information' };
const VISIBILITY_LABELS = { private: 'Privat', team: 'Team', company: 'Unternehmen' };

const state = { query: '', type: 'all', status: 'active', level: 'all', plant: 'all', selectedId: null, editingId: null, searchTimer: null };

function esc(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
function readJson(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; }
}
function plants() { const rows = readJson('abwasser-plants-v07', []); return Array.isArray(rows) ? rows : []; }
function products() { const rows = readJson('abwasser-products-v092', []); return Array.isArray(rows) ? rows : []; }
function activePlantId() { return localStorage.getItem('abwasser-active-plant-v07') || ''; }
function plantLabel(plant) { return plant?.master?.name || plant?.name || plant?.title || plant?.operator?.name || 'Unbenannte Anlage'; }
function productLabel(product) { return product?.name || product?.title || product?.productName || 'Unbenanntes Produkt'; }
function linkedPlant(entry) { return entry.links?.find((link) => link.entityType === 'plant') || null; }
function linkedProduct(entry) { return entry.links?.find((link) => link.entityType === 'product') || null; }

function matches(entry) {
  if (state.type !== 'all' && entry.knowledgeType !== state.type) return false;
  if (state.level !== 'all' && entry.knowledgeLevel !== state.level) return false;
  if (state.status === 'active' && entry.status === 'archived') return false;
  if (state.status !== 'all' && state.status !== 'active' && entry.status !== state.status) return false;
  if (state.plant !== 'all' && !entry.links?.some((link) => link.entityType === 'plant' && String(link.entityId) === String(state.plant))) return false;
  if (!state.query) return true;
  const haystack = [entry.title, entry.summary, entry.content, entry.knowledgeType, entry.status, entry.knowledgeLevel, ...(entry.tags || []), ...(entry.links || []).flatMap((link) => [link.entityLabel, link.entityType, link.relationType]), ...Object.values(entry.fields || {})].join(' ').toLocaleLowerCase('de-DE');
  return haystack.includes(state.query.toLocaleLowerCase('de-DE'));
}
function options(labels, selected = '') {
  return Object.entries(labels).map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`).join('');
}
function dynamicFields(type, values = {}) {
  if (type === 'problem_solution') return `
    <label>Problem<textarea name="field.problem" rows="3">${esc(values.problem || '')}</textarea></label>
    <label>Mögliche Ursache<textarea name="field.cause" rows="3">${esc(values.cause || '')}</textarea></label>
    <label>Maßnahme<textarea name="field.action" rows="3">${esc(values.action || '')}</textarea></label>
    <label>Ergebnis<textarea name="field.result" rows="3">${esc(values.result || '')}</textarea></label>
    <label>Empfehlung<textarea name="field.recommendation" rows="3">${esc(values.recommendation || '')}</textarea></label>`;
  if (type === 'test_result') return `
    <label>Ausgangssituation<textarea name="field.initialSituation" rows="3">${esc(values.initialSituation || '')}</textarea></label>
    <label>Versuchsaufbau<textarea name="field.testSetup" rows="3">${esc(values.testSetup || '')}</textarea></label>
    <label>Dosierung / Parameter<input name="field.dosage" value="${esc(values.dosage || '')}"></label>
    <label>Messwerte<textarea name="field.measurements" rows="3">${esc(values.measurements || '')}</textarea></label>
    <label>Beobachtung<textarea name="field.observation" rows="3">${esc(values.observation || '')}</textarea></label>
    <label>Fazit<textarea name="field.conclusion" rows="3">${esc(values.conclusion || '')}</textarea></label>`;
  return `<label>Zusätzliche Fachnotiz<textarea name="field.note" rows="4">${esc(values.note || '')}</textarea></label>`;
}

function formMarkup(entry = {}) {
  const plantRows = plants();
  const productRows = products();
  const plantLink = linkedPlant(entry) || {};
  const productLink = linkedProduct(entry) || {};
  const selectedType = entry.knowledgeType || 'problem_solution';
  const sourceType = entry.sources?.[0]?.sourceType || 'manual';
  const sourceTypes = [['manual','Manuell'],['pdf','PDF'],['visit_report','Besuchsbericht'],['test','Versuch'],['ticket','Ticket'],['complaint','Reklamation'],['product_document','Produktdokument'],['external_reference','Externe Quelle']];
  return `<form id="knowledgeForm" class="knowledge-form">
    <div class="knowledge-form-head"><div><p class="eyebrow">${entry.id ? 'Wissenseintrag bearbeiten' : 'Neues Wissen'}</p><h2>${entry.id ? esc(entry.title || 'Wissenseintrag') : 'Wissenseintrag anlegen'}</h2></div><button class="button secondary" type="button" data-kb-action="cancel-form">Schließen</button></div>
    <div class="knowledge-form-grid">
      <label class="knowledge-span-2">Titel<input name="title" required maxlength="180" value="${esc(entry.title || '')}" placeholder="z. B. Hoher Polymerverbrauch beim Dekanter"></label>
      <label>Wissenstyp<select name="knowledgeType" id="knowledgeTypeSelect">${options(TYPE_LABELS, selectedType)}</select></label>
      <label>Status<select name="status">${options(STATUS_LABELS, entry.status || 'draft')}</select></label>
      <label>Wissensqualität<select name="knowledgeLevel">${options(LEVEL_LABELS, entry.knowledgeLevel || 'unverified')}</select></label>
      <label>Sichtbarkeit<select name="visibility">${options(VISIBILITY_LABELS, entry.visibility || 'company')}</select></label>
      <label class="knowledge-span-2">Kurzbeschreibung<textarea name="summary" rows="2" maxlength="500" placeholder="Kurze, belastbare Zusammenfassung">${esc(entry.summary || '')}</textarea></label>
      <label class="knowledge-span-2">Beschreibung<textarea name="content" rows="6" placeholder="Hintergrund, Kontext und fachliche Details">${esc(entry.content || '')}</textarea></label>
      <div id="knowledgeDynamicFields" class="knowledge-dynamic-fields knowledge-span-2">${dynamicFields(selectedType, entry.fields || {})}</div>
      <label>Anlage<select name="plantId"><option value="">Keine Anlage</option>${plantRows.map((plant) => `<option value="${esc(plant.id)}" ${String(plant.id) === String(plantLink.entityId || '') ? 'selected' : ''}>${esc(plantLabel(plant))}</option>`).join('')}</select></label>
      <label>Produkt<select name="productId"><option value="">Kein Produkt</option>${productRows.map((product) => `<option value="${esc(product.id)}" ${String(product.id) === String(productLink.entityId || '') ? 'selected' : ''}>${esc(productLabel(product))}</option>`).join('')}</select></label>
      <label class="knowledge-span-2">Tags<input name="tags" value="${esc((entry.tags || []).join(', '))}" placeholder="Polymer, Dekanter, Entwässerung"></label>
      <label>Quellentyp<select name="sourceType">${sourceTypes.map(([value, label]) => `<option value="${value}" ${value === sourceType ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
      <label>Quellentitel<input name="sourceTitle" value="${esc(entry.sources?.[0]?.sourceTitle || '')}" placeholder="z. B. Besuchsbericht 12.08.2026"></label>
    </div>
    <div class="knowledge-form-actions"><button class="button secondary" type="button" data-kb-action="cancel-form">Abbrechen</button><button class="button primary" type="submit">Wissenseintrag speichern</button></div>
  </form>`;
}

function cardMarkup(entry) {
  const plant = linkedPlant(entry), product = linkedProduct(entry);
  return `<article class="knowledge-card" data-kb-id="${esc(entry.id)}" tabindex="0">
    <div class="knowledge-card-top"><span class="knowledge-type">${esc(TYPE_LABELS[entry.knowledgeType] || entry.knowledgeType)}</span><span class="knowledge-status" data-status="${esc(entry.status)}">${esc(STATUS_LABELS[entry.status] || entry.status)}</span></div>
    <h3>${esc(entry.title)}</h3><p>${esc(entry.summary || entry.content || 'Noch keine Zusammenfassung hinterlegt.')}</p>
    <div class="knowledge-meta"><span>${esc(LEVEL_LABELS[entry.knowledgeLevel] || entry.knowledgeLevel)}</span>${plant ? `<span>Anlage: ${esc(plant.entityLabel || plant.entityId)}</span>` : ''}${product ? `<span>Produkt: ${esc(product.entityLabel || product.entityId)}</span>` : ''}</div>
    ${(entry.tags || []).length ? `<div class="knowledge-tags">${entry.tags.map((tag) => `<span>${esc(tag)}</span>`).join('')}</div>` : ''}
  </article>`;
}

function detailMarkup(entry) {
  if (!entry) return '<div class="knowledge-empty"><h3>Wissenseintrag auswählen</h3><p>Links einen Eintrag öffnen oder neues Wissen anlegen.</p></div>';
  const fieldRows = Object.entries(entry.fields || {}).filter(([, value]) => String(value || '').trim());
  const fieldLabels = { problem: 'Problem', cause: 'Mögliche Ursache', action: 'Maßnahme', result: 'Ergebnis', recommendation: 'Empfehlung', initialSituation: 'Ausgangssituation', testSetup: 'Versuchsaufbau', dosage: 'Dosierung / Parameter', measurements: 'Messwerte', observation: 'Beobachtung', conclusion: 'Fazit', note: 'Zusätzliche Fachnotiz' };
  return `<div class="knowledge-detail-head"><div><p class="eyebrow">${esc(TYPE_LABELS[entry.knowledgeType] || entry.knowledgeType)}</p><h2>${esc(entry.title)}</h2><div class="knowledge-detail-badges"><span>${esc(STATUS_LABELS[entry.status] || entry.status)}</span><span>${esc(LEVEL_LABELS[entry.knowledgeLevel] || entry.knowledgeLevel)}</span><span>${esc(VISIBILITY_LABELS[entry.visibility] || entry.visibility)}</span></div></div><div class="knowledge-detail-actions"><button class="button secondary" type="button" data-kb-action="edit" data-kb-id="${esc(entry.id)}">Bearbeiten</button>${entry.status !== 'archived' ? `<button class="button secondary" type="button" data-kb-action="archive" data-kb-id="${esc(entry.id)}">Archivieren</button>` : ''}</div></div>
    ${entry.summary ? `<section><h3>Zusammenfassung</h3><p>${esc(entry.summary)}</p></section>` : ''}${entry.content ? `<section><h3>Beschreibung</h3><p class="knowledge-prewrap">${esc(entry.content)}</p></section>` : ''}${fieldRows.map(([key, value]) => `<section><h3>${esc(fieldLabels[key] || key)}</h3><p class="knowledge-prewrap">${esc(value)}</p></section>`).join('')}
    ${(entry.links || []).length ? `<section><h3>Verknüpfungen</h3><div class="knowledge-link-list">${entry.links.map((link) => `<span>${esc(link.entityType === 'plant' ? 'Anlage' : link.entityType === 'product' ? 'Produkt' : link.entityType)}: ${esc(link.entityLabel || link.entityId)}</span>`).join('')}</div></section>` : ''}
    ${(entry.sources || []).length ? `<section><h3>Quellen</h3>${entry.sources.map((source) => `<p>${esc(source.sourceTitle || source.sourceType)}${source.pageNumber ? ` · Seite ${esc(source.pageNumber)}` : ''}</p>`).join('')}</section>` : ''}
    ${(entry.tags || []).length ? `<section><h3>Tags</h3><div class="knowledge-tags">${entry.tags.map((tag) => `<span>${esc(tag)}</span>`).join('')}</div></section>` : ''}`;
}

async function render(root) {
  const entries = await knowledgeRepository.detailsFor();
  const filtered = entries.filter(matches);
  if (state.selectedId && !entries.some((entry) => entry.id === state.selectedId)) state.selectedId = null;
  const selected = entries.find((entry) => entry.id === state.selectedId) || filtered[0] || null;
  if (!state.selectedId && selected) state.selectedId = selected.id;
  const plantRows = plants(), activeId = activePlantId();
  root.innerHTML = `<div class="knowledge-page">
    <div class="knowledge-hero"><div><p class="eyebrow">Unternehmensgedächtnis</p><h1>Wissensdatenbank</h1><p>Fachwissen, Praxiserfahrungen, Problemlösungen und Quellen strukturiert dokumentieren und mit Anlagen oder Produkten verknüpfen.</p></div><div class="knowledge-hero-actions">${activeId ? `<button class="button secondary" type="button" data-kb-action="active-plant">Wissen der aktiven Anlage</button>` : ''}<button class="button primary" type="button" data-kb-action="new">＋ Neuer Wissenseintrag</button></div></div>
    <div class="knowledge-kpis"><div><strong>${entries.filter((entry) => entry.status !== 'archived').length}</strong><span>aktive Einträge</span></div><div><strong>${entries.filter((entry) => entry.status === 'approved').length}</strong><span>freigegeben</span></div><div><strong>${entries.filter((entry) => ['practical','verified','official'].includes(entry.knowledgeLevel)).length}</strong><span>qualifiziert</span></div><div><strong>${new Set(entries.flatMap((entry) => entry.tags || [])).size}</strong><span>Tags</span></div></div>
    <div class="knowledge-toolbar"><input id="knowledgeSearch" type="search" placeholder="Wissen durchsuchen …" value="${esc(state.query)}"><select id="knowledgeTypeFilter"><option value="all">Alle Wissenstypen</option>${options(TYPE_LABELS, state.type)}</select><select id="knowledgeStatusFilter"><option value="active" ${state.status === 'active' ? 'selected' : ''}>Aktiv</option><option value="all" ${state.status === 'all' ? 'selected' : ''}>Alle Status</option>${options(STATUS_LABELS, state.status)}</select><select id="knowledgeLevelFilter"><option value="all">Alle Qualitätsstufen</option>${options(LEVEL_LABELS, state.level)}</select><select id="knowledgePlantFilter"><option value="all">Alle Anlagen</option>${plantRows.map((plant) => `<option value="${esc(plant.id)}" ${String(state.plant) === String(plant.id) ? 'selected' : ''}>${esc(plantLabel(plant))}</option>`).join('')}</select></div>
    <div class="knowledge-layout"><div class="knowledge-list"><div class="knowledge-list-head"><strong>${filtered.length} Treffer</strong><span>${entries.length} Einträge gesamt</span></div><div class="knowledge-cards">${filtered.length ? filtered.map(cardMarkup).join('') : '<div class="knowledge-empty"><h3>Keine Treffer</h3><p>Filter anpassen oder einen neuen Wissenseintrag anlegen.</p></div>'}</div></div><aside class="knowledge-detail">${detailMarkup(selected)}</aside></div>
    <div id="knowledgeModal" class="knowledge-modal hidden" aria-hidden="true"><div class="knowledge-modal-card"></div></div>
  </div>`;
  bind(root, entries);
}

function openForm(root, entry = {}) {
  const modal = root.querySelector('#knowledgeModal'), card = modal.querySelector('.knowledge-modal-card');
  state.editingId = entry.id || null;
  card.innerHTML = formMarkup(entry);
  modal.classList.remove('hidden'); modal.setAttribute('aria-hidden', 'false');
  card.querySelector('#knowledgeTypeSelect')?.addEventListener('change', (event) => { card.querySelector('#knowledgeDynamicFields').innerHTML = dynamicFields(event.target.value, {}); });
  card.querySelector('#knowledgeForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const rawCurrent = state.editingId ? await knowledgeRepository.get(state.editingId) : null;
    const current = rawCurrent ? (await knowledgeRepository.detailsFor([rawCurrent]))[0] : {};
    const fields = {}; for (const [key, value] of formData.entries()) if (key.startsWith('field.')) fields[key.slice(6)] = String(value).trim();
    const plantRows = plants(), productRows = products(), plantId = formData.get('plantId'), productId = formData.get('productId'), links = [];
    if (plantId) { const plant = plantRows.find((row) => String(row.id) === String(plantId)); links.push({ entityType: 'plant', entityId: String(plantId), entityLabel: plantLabel(plant), relationType: 'observed_at' }); }
    if (productId) { const product = productRows.find((row) => String(row.id) === String(productId)); links.push({ entityType: 'product', entityId: String(productId), entityLabel: productLabel(product), relationType: 'related_to' }); }
    const sourceTitle = String(formData.get('sourceTitle') || '').trim();
    const saved = await knowledgeRepository.save({ ...current, id: state.editingId || undefined, title: formData.get('title'), summary: formData.get('summary'), content: formData.get('content'), knowledgeType: formData.get('knowledgeType'), status: formData.get('status'), knowledgeLevel: formData.get('knowledgeLevel'), visibility: formData.get('visibility'), fields }, { tags: String(formData.get('tags') || '').split(',').map((tag) => tag.trim()).filter(Boolean), links, sources: sourceTitle ? [{ sourceType: formData.get('sourceType') || 'manual', sourceTitle }] : (current?.sources || []) });
    state.selectedId = saved.id; state.editingId = null; await render(root);
  });
}
function closeForm(root) { const modal = root.querySelector('#knowledgeModal'); if (!modal) return; modal.classList.add('hidden'); modal.setAttribute('aria-hidden', 'true'); state.editingId = null; }

function bind(root, entries) {
  const rerender = () => render(root).catch((error) => console.error('Wissensdatenbank', error));
  root.querySelector('#knowledgeSearch')?.addEventListener('input', (event) => { state.query = event.target.value; clearTimeout(state.searchTimer); state.searchTimer = setTimeout(async () => { await render(root); const input = root.querySelector('#knowledgeSearch'); if (input) { input.focus(); const end = input.value.length; input.setSelectionRange?.(end, end); } }, 220); });
  root.querySelector('#knowledgeTypeFilter')?.addEventListener('change', (event) => { state.type = event.target.value; rerender(); });
  root.querySelector('#knowledgeStatusFilter')?.addEventListener('change', (event) => { state.status = event.target.value; rerender(); });
  root.querySelector('#knowledgeLevelFilter')?.addEventListener('change', (event) => { state.level = event.target.value; rerender(); });
  root.querySelector('#knowledgePlantFilter')?.addEventListener('change', (event) => { state.plant = event.target.value; rerender(); });
  root.querySelectorAll('.knowledge-card').forEach((card) => { const select = () => { state.selectedId = card.dataset.kbId; rerender(); }; card.addEventListener('click', select); card.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } }); });
  root.querySelectorAll('[data-kb-action]').forEach((button) => button.addEventListener('click', async () => {
    const action = button.dataset.kbAction;
    if (action === 'new') return openForm(root, {});
    if (action === 'cancel-form') return closeForm(root);
    if (action === 'active-plant') { state.plant = activePlantId() || 'all'; return rerender(); }
    if (action === 'edit') { const entry = entries.find((row) => row.id === button.dataset.kbId); if (entry) return openForm(root, entry); }
    if (action === 'archive') { await knowledgeRepository.archive(button.dataset.kbId); return rerender(); }
  }));
}

export async function mountKnowledgeBase(root) {
  if (!root) throw new Error('Zielbereich für Wissensdatenbank fehlt.');
  await render(root);
}
