// wiki-editor.js — Create / Edit document editor for the Odisseia Wiki.
// Shared by criar.html and editar.html. Mode: ?id= present = edit, absent = create.

import {
    initWikiFirebase, getWikiDoc, createWikiDoc, updateWikiDoc,
    titleExists, getTagSuggestions, registerTags,
} from './wiki-firebase.js';
import { getAuthState }                                  from './wiki-auth.js';
import { escapeHtml, getParam, slugifyTag, showToast, safeHttpUrl } from './wiki-utils.js';
import {
    buildThemePicker, applyDocTheme, resetDocTheme,
    clearDocThemeCache, WIKI_DEFAULTS,
} from './wiki-theme.js';
import { THREAT_LEVELS, DOMAIN_TYPES, ALIGNMENT_TYPES }  from './wiki-consts.js';
import { extractLinkedDocIds }                           from './wiki-format.js';
import { initWikiSidebar }                               from './wiki-sidebar.js';

// ── Module state ──────────────────────────────────────────────────────────────
let currentDocId  = null;
let currentTheme  = { ...WIKI_DEFAULTS };
let tipos         = [];
let regioes       = [];
let user          = null;
let isAdmin       = false;
let dirty         = false;          // há alterações ainda não salvas
const commitPendingTags = [];       // grava o texto solto nos campos de tag
const tipoChipMap   = new Map();
const regiaoChipMap = new Map();

// Tag suggestions loaded at init
let tipoSuggestions   = [];
let regiaoSuggestions = [];

// ── Type-based field visibility ────────────────────────────────────────────────
// Fields and which types they apply to:
const FIELD_VISIBILITY = {
    'tag-threat-wrap':   ['creature', 'person', 'item', 'group'],
    'tag-domain-wrap':   ['creature', 'place', 'person', 'item', 'group'],
    'tag-tipo-wrap':     ['creature', 'place', 'person', 'item', 'group'],
    'tag-regiao-wrap':   ['creature', 'person', 'group'], // Item não tem região
    'tag-alignment-wrap':['creature', 'person', 'item', 'group'],
    'field-attrs-wrap':  ['creature', 'person'],    // Item e Grupo: sem atributos
    'field-md-wrap':     ['creature', 'person'],    // Item e Grupo: sem ficha
};

function typeAllows(fieldId, type) {
    const allowed = FIELD_VISIBILITY[fieldId];
    return Array.isArray(allowed) && allowed.includes(type);
}

function updateTypeVisibility(type) {
    for (const [id, allowedTypes] of Object.entries(FIELD_VISIBILITY)) {
        const el = document.getElementById(id);
        if (el) el.style.display = allowedTypes.includes(type) ? '' : 'none';
    }
}

// ── Attribute chip preview in editor ──────────────────────────────────────────

const ATTR_KEYS = ['corpo', 'velocidade', 'essencia', 'inteligencia'];

/** Lê um atributo: vazio vira null; o resto vira inteiro de 0 a 10. */
function readAttr(key) {
    const n = parseInt(document.getElementById(`attr-${key}`)?.value, 10);
    return Number.isNaN(n) ? null : Math.min(10, Math.max(0, n));
}

/** Renders or updates the chip preview next to an attribute input. */
function updateAttrChipPreview(key) {
    const input = document.getElementById(`attr-${key}`);
    if (!input) return;
    // 0 e campo vazio mostram zero chips (o "|| 5" antigo trocava o 0 por 5).
    const n = parseInt(input.value, 10);
    const val = Number.isNaN(n) ? 0 : Math.min(10, Math.max(0, n));

    // Find or create the chip preview element
    const row = input.closest('.wiki-attr-row');
    if (!row) return;
    let preview = row.querySelector('.wiki-editor-attr-chips');
    if (!preview) {
        preview = document.createElement('div');
        preview.className = 'wiki-editor-attr-chips wiki-attr-bar-chips';
        preview.style.cssText = 'margin-top:5px;grid-column:2/-1';
        row.appendChild(preview);
    }

    preview.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
        const chip = document.createElement('span');
        chip.className = 'wiki-attr-chip';
        if (i <= val) {
            chip.classList.add('filled');
            if (i >= 9) chip.classList.add('chip-max');
            else if (i >= 7) chip.classList.add('chip-high');
        }
        preview.appendChild(chip);
    }
}

function initAttrChipPreviews() {
    ATTR_KEYS.forEach(key => {
        const input = document.getElementById(`attr-${key}`);
        if (input) {
            if (input.dataset.chipsWired !== '1') {
                input.dataset.chipsWired = '1';
                input.addEventListener('input', () => updateAttrChipPreview(key));
                // Ao sair do campo, o número digitado é corrigido para a faixa 0 a 10.
                input.addEventListener('change', () => {
                    const v = readAttr(key);
                    input.value = v === null ? '' : String(v);
                    updateAttrChipPreview(key);
                });
            }
            updateAttrChipPreview(key);
        }
    });
}

function clearAttrs() {
    ATTR_KEYS.forEach(key => {
        const input = document.getElementById(`attr-${key}`);
        if (input) input.value = '';
        updateAttrChipPreview(key);
    });
    dirty = true;
}

// ── Bootstrap ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    // Permanent dark mode for the wiki
    document.body.classList.add('theme-dark-paper');
    initWikiFirebase();
    currentDocId = getParam('id') || null;

    ({ user, isAdmin } = await getAuthState());
    if (!user) { showLoginNeeded(); return; }

    // Sidebar
    initWikiSidebar(null);

    // Populate controlled-vocabulary selects
    populateThreatSelect();
    populateDomainSelect();
    maybeAddCanonicalOption(isAdmin);

    // Non-admin in edit mode cannot change status
    if (currentDocId && !isAdmin) {
        const w = document.getElementById('field-status-wrap');
        if (w) w.style.display = 'none';
    }

    // Theme picker
    const themeContainer = document.getElementById('wiki-theme-picker-container');
    buildThemePicker(themeContainer, currentTheme, onThemeChange);
    applyDocTheme(currentTheme.fundo, currentTheme.metalico, currentTheme.pergaminho);

    // Reset button
    document.getElementById('wiki-theme-reset')?.addEventListener('click', () => {
        currentTheme = { ...WIKI_DEFAULTS };
        resetDocTheme();
        if (currentDocId) clearDocThemeCache(currentDocId);
        buildThemePicker(themeContainer, currentTheme, onThemeChange);
    });

    // Load tag suggestions in background
    getTagSuggestions('tipo').then(r => { tipoSuggestions = r; });
    getTagSuggestions('regiao').then(r => { regiaoSuggestions = r; });

    // Wire tag inputs
    wireTagInput('wiki-tipo-input',   'wiki-tipo-suggestions',   'wiki-tipos-field',   tipoSuggestions,   tipoChipMap,   tipos,   'tipo');
    wireTagInput('wiki-regiao-input', 'wiki-regiao-suggestions', 'wiki-regioes-field', regiaoSuggestions, regiaoChipMap, regioes, 'regiao');

    // Wire section / gallery builder
    document.getElementById('wiki-add-section')?.addEventListener('click', () => addSection());
    document.getElementById('wiki-add-image')?.addEventListener('click', () => addGalleryItem());

    // Form submission
    const form = document.getElementById('wiki-form');
    form?.addEventListener('submit', handleSubmit);

    // Enter num campo de uma linha não envia o formulário (os campos de tag usam Enter para criar a tag).
    form?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault();
    });

    // Alterações não salvas: avisa antes de sair da página.
    form?.addEventListener('input',  () => { dirty = true; });
    form?.addEventListener('change', () => { dirty = true; });
    window.addEventListener('beforeunload', (e) => {
        if (!dirty) return;
        e.preventDefault();
        e.returnValue = '';
    });

    // Some o aviso de erro assim que a pessoa volta a escrever no campo.
    ['field-title-wrap', 'field-summary-wrap'].forEach(id => {
        const wrap = document.getElementById(id);
        wrap?.addEventListener('input', () => wrap.classList.remove('error'));
    });

    document.getElementById('wiki-attrs-clear')?.addEventListener('click', clearAttrs);

    // Type selector: update field visibility on change
    const typeSelect = document.getElementById('field-type');
    if (typeSelect) {
        typeSelect.addEventListener('change', () => {
            updateTypeVisibility(typeSelect.value);
            // Re-init chip previews when type changes to creature/person
            initAttrChipPreviews();
        });
        // Initial visibility
        updateTypeVisibility(typeSelect.value);
    }

    // Wire chip previews for attribute inputs
    initAttrChipPreviews();

    // Edit mode: load existing doc
    if (currentDocId) await loadDoc(currentDocId);
    dirty = false;
});

/** Sem login: explica o motivo em vez de mandar a pessoa para outra tela sem aviso. */
function showLoginNeeded() {
    const wrap = document.querySelector('.wiki-editor-wrap');
    if (!wrap) return;
    wrap.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'wiki-empty';
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = 'lock';
    const msg = document.createElement('p');
    msg.textContent = currentDocId
        ? 'Entre na sua conta para editar este artigo.'
        : 'Entre na sua conta para criar artigos.';
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:10px;justify-content:center;flex-wrap:wrap';
    const login = document.createElement('a');
    login.href = '/index.html';
    login.className = 'wiki-btn wiki-btn-primary';
    login.textContent = 'Entrar';
    const back = document.createElement('a');
    back.href = '/wiki';
    back.className = 'wiki-btn wiki-btn-secondary';
    back.textContent = 'Voltar à enciclopédia';
    actions.append(login, back);
    box.append(icon, msg, actions);
    wrap.appendChild(box);
}

// ── Controlled-vocabulary selects ─────────────────────────────────────────────

function populateThreatSelect() {
    const sel = document.getElementById('field-threat');
    if (!sel) return;
    THREAT_LEVELS.forEach(level => {
        const opt = document.createElement('option');
        opt.value = level;
        opt.textContent = level;
        sel.appendChild(opt);
    });
}

function populateDomainSelect() {
    const sel = document.getElementById('field-domain');
    if (!sel) return;
    DOMAIN_TYPES.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        sel.appendChild(opt);
    });
}

function maybeAddCanonicalOption(admin) {
    if (!admin) return;
    const sel = document.getElementById('field-status');
    if (!sel || sel.querySelector('option[value="canonical"]')) return;
    const opt = document.createElement('option');
    opt.value = 'canonical';
    opt.textContent = 'Canônico ★';
    sel.appendChild(opt);
}

// ── Theme ──────────────────────────────────────────────────────────────────────

function onThemeChange(newTheme) {
    currentTheme = newTheme;
    applyDocTheme(newTheme.fundo, newTheme.metalico, newTheme.pergaminho);
}

// ── Tag chip management ────────────────────────────────────────────────────────

function addTagChip(name, slugFn, chipMap, arr, fieldId, category) {
    const slug = slugFn(name);
    if (!slug || chipMap.has(slug)) return;

    arr.push(name);
    chipMap.set(slug, name);
    dirty = true;

    const field = document.getElementById(fieldId);
    if (!field) return;

    const chip = document.createElement('span');
    chip.className = 'wiki-tag-chip';

    const label = document.createElement('span');
    label.textContent = name;
    chip.appendChild(label);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'wiki-tag-chip-remove';
    removeBtn.setAttribute('aria-label', 'Remover');
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
        const idx = arr.indexOf(name);
        if (idx !== -1) arr.splice(idx, 1);
        chipMap.delete(slug);
        chip.remove();
        dirty = true;
    });

    chip.appendChild(removeBtn);
    // Insert before the text input
    const input = field.querySelector('.wiki-tag-text-input');
    field.insertBefore(chip, input);
}

// ── Tag autocomplete ───────────────────────────────────────────────────────────

function wireTagInput(inputId, listId, fieldId, suggestions, chipMap, arr, category) {
    const input = document.getElementById(inputId);
    const list  = document.getElementById(listId);
    if (!input || !list) return;

    const addFn = (name) => addTagChip(
        name, slugifyTag, chipMap, arr, fieldId, category
    );

    let activeIdx = -1;

    function setActive(idx) {
        const items = [...list.querySelectorAll('.wiki-autocomplete-item')];
        activeIdx = items.length ? (idx + items.length) % items.length : -1;
        items.forEach((li, i) => li.classList.toggle('active', i === activeIdx));
        items[activeIdx]?.scrollIntoView({ block: 'nearest' });
    }

    function hideList() {
        list.style.display = 'none';
        activeIdx = -1;
    }

    function showSuggestions(query) {
        const q = (query || '').toLowerCase();
        const matches = (
            category === 'tipo' ? tipoSuggestions : regiaoSuggestions
        ).filter(s => s.toLowerCase().includes(q) && !chipMap.has(slugifyTag(s)));

        list.innerHTML = '';
        activeIdx = -1;
        if (!matches.length || !q) { list.style.display = 'none'; return; }

        matches.slice(0, 8).forEach(s => {
            const li = document.createElement('li');
            li.className = 'wiki-autocomplete-item';
            li.textContent = s;
            li.addEventListener('mousedown', (e) => {
                e.preventDefault(); // prevent blur before click
                addFn(s);
                input.value = '';
                hideList();
            });
            list.appendChild(li);
        });
        list.style.display = 'block';
    }

    function commitInput() {
        const val = input.value.trim();
        if (val) { addFn(val); input.value = ''; }
        hideList();
    }
    // O envio do formulário também grava o texto que ficou solto no campo.
    commitPendingTags.push(commitInput);

    input.addEventListener('input', () => showSuggestions(input.value));
    // Ao sair do campo, o texto digitado vira tag (antes ele ficava no campo e não era salvo).
    input.addEventListener('blur',  () => commitInput());
    input.addEventListener('keydown', (e) => {
        const open = list.style.display !== 'none' && list.children.length > 0;
        if (e.key === 'ArrowDown' && open) { e.preventDefault(); setActive(activeIdx + 1); return; }
        if (e.key === 'ArrowUp'   && open) { e.preventDefault(); setActive(activeIdx - 1); return; }
        if (e.key === 'Escape'    && open) { e.preventDefault(); hideList(); return; }
        if (e.key === 'Enter' && open && activeIdx >= 0) {
            e.preventDefault();
            addFn(list.children[activeIdx].textContent);
            input.value = '';
            hideList();
            return;
        }
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commitInput(); }
        if (e.key === 'Backspace' && !input.value && arr.length) {
            const last = arr[arr.length - 1];
            const slug = slugifyTag(last);
            arr.pop();
            chipMap.delete(slug);
            const field = document.getElementById(fieldId);
            const chips = field?.querySelectorAll('.wiki-tag-chip');
            chips?.[chips.length - 1]?.remove();
            dirty = true;
        }
    });
    input.addEventListener('paste', (e) => {
        const pasted = e.clipboardData.getData('text');
        e.preventDefault();
        pasted.split(/[,\n\t]/).forEach(t => { const v = t.trim(); if (v) addFn(v); });
    });
}

// ── Content sections builder ───────────────────────────────────────────────────

function addSection(section = {}) {
    const { heading = '', body = '' } = section;
    const builder = document.getElementById('wiki-sections-builder');
    if (!builder) return;

    const item = document.createElement('div');
    item.className = 'wiki-section-item';

    // Header row
    const headerRow = document.createElement('div');
    headerRow.className = 'wiki-section-item-header';

    const headingInput = document.createElement('input');
    headingInput.type = 'text';
    headingInput.className = 'wiki-section-item-heading-input';
    headingInput.placeholder = 'Título da seção (ex: Descrição, História...)';
    headingInput.value = heading;

    const controls = document.createElement('div');
    controls.className = 'wiki-section-controls';

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'wiki-section-control-btn';
    removeBtn.setAttribute('aria-label', 'Remover seção');
    const removeIcon = document.createElement('span');
    removeIcon.className = 'material-symbols-outlined';
    removeIcon.textContent = 'close';
    removeBtn.appendChild(removeIcon);
    removeBtn.addEventListener('click', () => {
        const temTexto = headingInput.value.trim() || bodyArea.value.trim();
        if (temTexto && !confirm('Remover esta seção? O texto escrito nela será perdido.')) return;
        item.remove();
        dirty = true;
    });

    controls.appendChild(removeBtn);
    headerRow.appendChild(headingInput);
    headerRow.appendChild(controls);
    item.appendChild(headerRow);

    // Body textarea
    const bodyArea = document.createElement('textarea');
    bodyArea.className = 'wiki-textarea';
    bodyArea.placeholder = 'Conteúdo da seção...\n\nCtrl+B para **negrito**, Ctrl+I para *itálico*. Veja o guia de formatação acima.';
    bodyArea.rows = 5;
    bodyArea.value = body;
    wireFormattingShortcuts(bodyArea);
    item.appendChild(bodyArea);

    builder.appendChild(item);
}

// ── Formatting shortcuts (Ctrl+B / Ctrl+I) ─────────────────────────────────────

/**
 * Wraps the selection in `marker`, or — when nothing is selected — inserts the
 * markers and leaves the caret between them so typing continues formatted.
 * Wrapping an already-wrapped selection removes the markers again.
 */
function toggleMarker(textarea, marker) {
    const { value, selectionStart: start, selectionEnd: end } = textarea;
    const len = marker.length;
    const before = value.slice(0, start);
    const after  = value.slice(end);

    if (before.endsWith(marker) && after.startsWith(marker)) {
        const unwrapped = before.slice(0, -len) + value.slice(start, end) + after.slice(len);
        textarea.value = unwrapped;
        textarea.setSelectionRange(start - len, end - len);
    } else {
        textarea.value = before + marker + value.slice(start, end) + marker + after;
        textarea.setSelectionRange(start + len, end + len);
    }
    textarea.focus();
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function wireFormattingShortcuts(textarea) {
    textarea.addEventListener('keydown', (e) => {
        if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
        const key = e.key.toLowerCase();
        if (key !== 'b' && key !== 'i') return;
        e.preventDefault();
        toggleMarker(textarea, key === 'b' ? '**' : '*');
    });
}

// ── Gallery builder ────────────────────────────────────────────────────────────

function addGalleryItem(imgData = {}) {
    const { url = '', caption = '' } = imgData;
    const builder = document.getElementById('wiki-gallery-builder');
    if (!builder) return;

    const row = document.createElement('div');
    row.className = 'wiki-gallery-item-row';

    // Image preview
    const preview = document.createElement('img');
    preview.className = 'wiki-gallery-img-preview';
    preview.alt = '';
    preview.style.cssText = url ? '' : 'display:none';
    if (url) preview.src = url;

    const placeholder = document.createElement('div');
    placeholder.className = 'wiki-gallery-img-placeholder';
    const phIcon = document.createElement('span');
    phIcon.className = 'material-symbols-outlined';
    phIcon.textContent = 'image';
    placeholder.appendChild(phIcon);
    placeholder.style.cssText = url ? 'display:none' : '';

    // Inputs
    const inputs = document.createElement('div');
    inputs.className = 'wiki-gallery-item-inputs';

    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.className = 'wiki-input';
    urlInput.placeholder = 'URL da imagem (https://...)';
    urlInput.value = url;
    urlInput.addEventListener('input', () => {
        const v = urlInput.value.trim();
        imgError.style.display = 'none';
        if (v) {
            preview.style.display = '';
            preview.src = v;
            if (row.contains(placeholder)) row.replaceChild(preview, placeholder);
        } else {
            if (row.contains(preview)) row.replaceChild(placeholder, preview);
        }
    });

    // Aviso quando o endereço não abre como imagem.
    const imgError = document.createElement('span');
    imgError.className = 'wiki-input-hint wiki-gallery-img-error';
    imgError.textContent = 'Não foi possível carregar esta imagem. Confira o endereço.';
    imgError.style.cssText = 'display:none;color:var(--blood2);opacity:1';
    preview.addEventListener('error', () => { if (preview.getAttribute('src')) imgError.style.display = ''; });
    preview.addEventListener('load',  () => { imgError.style.display = 'none'; });

    const captionInput = document.createElement('input');
    captionInput.type = 'text';
    captionInput.className = 'wiki-input';
    captionInput.placeholder = 'Legenda (opcional)';
    captionInput.value = caption;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'wiki-gallery-remove-btn wiki-section-control-btn';
    removeBtn.setAttribute('aria-label', 'Remover imagem');
    const rIcon = document.createElement('span');
    rIcon.className = 'material-symbols-outlined';
    rIcon.textContent = 'delete';
    removeBtn.appendChild(rIcon);
    removeBtn.addEventListener('click', () => { row.remove(); dirty = true; });

    inputs.appendChild(urlInput);
    inputs.appendChild(imgError);
    inputs.appendChild(captionInput);
    inputs.appendChild(removeBtn);

    if (url) { row.appendChild(preview); } else { row.appendChild(placeholder); }
    row.appendChild(inputs);
    builder.appendChild(row);
}

// ── Load and populate form ─────────────────────────────────────────────────────

async function loadDoc(id) {
    const d = await getWikiDoc(id);
    if (!d) {
        showToast('Documento não encontrado.', true);
        window.location.href = '/wiki';
        return;
    }
    const canEditDoc = isAdmin || (user && user.uid === d.authorId);
    if (!canEditDoc) {
        showToast('Sem permissão para editar.', true);
        window.location.href = `/wiki/doc?id=${id}`;
        return;
    }
    await populateForm(d);
}

async function populateForm(doc) {
    setSelect('field-type', doc.type);
    // Update visibility BEFORE other fields
    updateTypeVisibility(doc.type);

    if (isAdmin || !currentDocId) {
        if (doc.status === 'canonical') maybeAddCanonicalOption(true);
        setSelect('field-status', doc.status);
    }
    setVal('field-title',    doc.title    || '');
    setVal('field-alt-name', doc.altName  || '');
    setVal('field-summary',  doc.summary  || '');
    setSelect('field-threat',    doc.threat    || '');
    setSelect('field-domain',    doc.domain    || '');
    setSelect('field-alignment', doc.alignment || '');

    // Tags
    (doc.types   || []).forEach(t => addTagChip(t, slugifyTag, tipoChipMap,   tipos,   'wiki-tipos-field',   'tipo'));
    (doc.regions || []).forEach(t => addTagChip(t, slugifyTag, regiaoChipMap, regioes, 'wiki-regioes-field', 'regiao'));

    // Sections
    (doc.content || []).forEach(s => addSection(s));

    // Gallery
    (doc.images || []).forEach(img => addGalleryItem(img));

    // Attributes (monstro/pessoa)
    if (doc.attributes) {
        ATTR_KEYS.forEach(k => {
            const inp = document.getElementById(`attr-${k}`);
            if (inp && doc.attributes[k] !== undefined) inp.value = doc.attributes[k];
        });
    } else {
        // Artigo salvo sem atributos: não inventa 5/5/5/5 ao editar.
        ATTR_KEYS.forEach(k => {
            const inp = document.getElementById(`attr-${k}`);
            if (inp) inp.value = '';
        });
    }
    initAttrChipPreviews();

    setVal('field-sheet-url', doc.sheetUrl || '');

    // Theme
    if (doc.theme && (doc.theme.fundo || doc.theme.metalico || doc.theme.pergaminho)) {
        currentTheme = { ...WIKI_DEFAULTS, ...doc.theme };
        const container = document.getElementById('wiki-theme-picker-container');
        buildThemePicker(container, currentTheme, onThemeChange);
        applyDocTheme(currentTheme.fundo, currentTheme.metalico, currentTheme.pergaminho);
    }

    // Update page title
    const editorTitle = document.getElementById('editor-title');
    if (editorTitle) editorTitle.textContent = doc.title || 'Editar Artigo';
}

function setVal(id, val)       { const el = document.getElementById(id); if (el) el.value = val; }
function setSelect(id, val)    {
    const el = document.getElementById(id);
    if (!el) return;
    const opt = [...el.options].find(o => o.value === val);
    if (opt) el.value = val;
}

// ── Form submission ────────────────────────────────────────────────────────────

/** Rola até o primeiro campo com erro e põe o cursor nele. */
function focusFirstError() {
    const wrap = document.querySelector('.wiki-field.error');
    if (!wrap) return;
    wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
    wrap.querySelector('input, textarea')?.focus({ preventScroll: true });
    showToast('Confira o campo marcado em vermelho.', true);
}

async function handleSubmit(e) {
    e.preventDefault();

    // Validation
    const titleWrap  = document.getElementById('field-title-wrap');
    const titleInput = document.getElementById('field-title');
    const titleVal   = titleInput?.value.trim() ?? '';

    const summaryWrap  = document.getElementById('field-summary-wrap');
    const summaryInput = document.getElementById('field-summary');
    const summaryVal   = summaryInput?.value.trim() ?? '';

    let valid = true;

    if (!titleVal) {
        titleWrap?.classList.add('error');
        valid = false;
    } else {
        titleWrap?.classList.remove('error');
    }

    if (!summaryVal) {
        summaryWrap?.classList.add('error');
        valid = false;
    } else {
        summaryWrap?.classList.remove('error');
    }

    if (!valid) {
        focusFirstError();
        return;
    }

    // Texto solto nos campos de tag entra como tag antes de salvar.
    commitPendingTags.forEach(fn => fn());

    // Unique title check
    const submitBtn    = document.getElementById('wiki-submit-btn');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Verificando...';

    try {
        const exists = await titleExists(titleVal, currentDocId);
        if (exists) {
            titleWrap?.classList.add('error');
            const errSpan = titleWrap?.querySelector('.wiki-field-error');
            if (errSpan) errSpan.textContent = 'Já existe um documento com este nome.';
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
            focusFirstError();
            return;
        }
    } catch (e) {
        console.warn('[wiki-editor] titleExists check failed:', e);
    }

    submitBtn.textContent = 'Salvando...';

    // Collect sections — sections are never collapsible
    const content = [];
    document.querySelectorAll('#wiki-sections-builder .wiki-section-item').forEach(item => {
        const headingEl = item.querySelector('.wiki-section-item-heading-input');
        const bodyEl    = item.querySelector('.wiki-textarea');
        const heading   = headingEl?.value.trim() ?? '';
        const body      = bodyEl?.value.trim() ?? '';
        if (heading || body) content.push({ heading, body, collapsible: false });
    });

    // Collect gallery images
    const images = [];
    document.querySelectorAll('#wiki-gallery-builder .wiki-gallery-item-row').forEach(row => {
        const ins = row.querySelectorAll('.wiki-input');
        const url = ins[0]?.value.trim() ?? '';
        const cap = ins[1]?.value.trim() ?? '';
        if (url) images.push({ url, caption: cap });
    });

    // Auto-populate relatedDocs from links pointing at other wiki documents
    const relatedDocs = extractLinkedDocIds(content).filter(id => id !== currentDocId);

    const docType = document.getElementById('field-type')?.value || 'creature';

    const savedTypes   = typeAllows('tag-tipo-wrap', docType) ? [...tipos] : [];
    const savedRegions = typeAllows('tag-regiao-wrap', docType) ? [...regioes] : [];

    // Attributes (monstro/pessoa)
    let attributes = null;
    if (typeAllows('field-attrs-wrap', docType)) {
        const lidos = Object.fromEntries(ATTR_KEYS.map(k => [k, readAttr(k)]));
        // Todos vazios = artigo sem atributos (a página não mostra o quadro).
        // Um campo vazio entre os outros vale 0. O valor é sempre limitado a 0..10.
        attributes = ATTR_KEYS.every(k => lidos[k] === null)
            ? null
            : Object.fromEntries(ATTR_KEYS.map(k => [k, lidos[k] ?? 0]));
    }

    const data = {
        title:    titleVal,
        altName:  document.getElementById('field-alt-name')?.value.trim() ?? '',
        type:     docType,
        summary:  summaryVal,
        threat:    typeAllows('tag-threat-wrap', docType) ? (document.getElementById('field-threat')?.value || '') : '',
        domain:    typeAllows('tag-domain-wrap', docType) ? (document.getElementById('field-domain')?.value || '') : '',
        alignment: typeAllows('tag-alignment-wrap', docType) ? (document.getElementById('field-alignment')?.value || '') : '',
        types:    savedTypes,
        regions:  savedRegions,
        content,
        images,
        relatedDocs,
        theme:    { ...currentTheme },
        attributes,
        sheetUrl: typeAllows('field-md-wrap', docType)
            ? safeHttpUrl(document.getElementById('field-sheet-url')?.value)
            : '',
    };

    // Status: only in create mode or for admins
    if (!currentDocId || isAdmin) {
        data.status = document.getElementById('field-status')?.value || 'community';
    }

    try {
        // Register free tags for future autocomplete
        await Promise.all([
            registerTags(savedTypes,   'tipo'),
            registerTags(savedRegions, 'regiao'),
        ]);

        dirty = false; // salvou: sair da página não deve avisar
        if (currentDocId) {
            await updateWikiDoc(currentDocId, data);
            window.location.href = `/wiki/doc?id=${currentDocId}`;
        } else {
            data.authorId    = user.uid;
            data.authorEmail = user.email;
            const newId = await createWikiDoc(data);
            window.location.href = `/wiki/doc?id=${newId}`;
        }
    } catch (saveErr) {
        console.error('[wiki-editor] handleSubmit error:', saveErr);
        dirty = true;
        submitBtn.disabled  = false;
        submitBtn.innerHTML = originalHTML;
        showToast('Erro ao salvar: ' + (saveErr.message || String(saveErr)), true);
    }
}
