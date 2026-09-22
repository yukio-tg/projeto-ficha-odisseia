// wiki-editor.js — Create / Edit document editor for the Odisseia Wiki.
// Shared by criar.html and editar.html. Mode: ?id= present = edit, absent = create.

import {
    initWikiFirebase, getWikiDoc, createWikiDoc, updateWikiDoc,
    titleExists, getTagSuggestions, registerTags,
} from './wiki-firebase.js';
import { getAuthState, requireAuth }                     from './wiki-auth.js';
import { escapeHtml, getParam, slugifyTag, showToast }   from './wiki-utils.js';
import {
    buildThemePicker, applyDocTheme, resetDocTheme,
    clearDocThemeCache, WIKI_DEFAULTS,
} from './wiki-theme.js';
import { THREAT_LEVELS, DOMAIN_TYPES, ALIGNMENT_TYPES }  from './wiki-consts.js';
import { extractAllWikiLinks, resolveWikiLinks }          from './wiki-wikilinks.js';

// ── Module state ──────────────────────────────────────────────────────────────
let currentDocId  = null;
let currentTheme  = { ...WIKI_DEFAULTS };
let tipos         = [];
let regioes       = [];
let user          = null;
let isAdmin       = false;
const tipoChipMap   = new Map();
const regiaoChipMap = new Map();

// Tag suggestions loaded at init
let tipoSuggestions   = [];
let regiaoSuggestions = [];

// ── Bootstrap ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    initWikiFirebase();
    currentDocId = getParam('id') || null;

    const authedUser = await requireAuth('/index.html');
    if (!authedUser) return;

    ({ user, isAdmin } = await getAuthState());

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
    document.getElementById('wiki-form')?.addEventListener('submit', handleSubmit);

    // Edit mode: load existing doc
    if (currentDocId) await loadDoc(currentDocId);
});

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

    function showSuggestions(query) {
        const q = (query || '').toLowerCase();
        const matches = (
            category === 'tipo' ? tipoSuggestions : regiaoSuggestions
        ).filter(s => s.toLowerCase().includes(q) && !chipMap.has(slugifyTag(s)));

        list.innerHTML = '';
        if (!matches.length || !q) { list.style.display = 'none'; return; }

        matches.slice(0, 8).forEach(s => {
            const li = document.createElement('li');
            li.className = 'wiki-autocomplete-item';
            li.textContent = s;
            li.addEventListener('mousedown', (e) => {
                e.preventDefault(); // prevent blur before click
                addFn(s);
                input.value = '';
                list.style.display = 'none';
            });
            list.appendChild(li);
        });
        list.style.display = 'block';
    }

    function commitInput() {
        const val = input.value.trim();
        if (val) { addFn(val); input.value = ''; }
        list.style.display = 'none';
    }

    input.addEventListener('input', () => showSuggestions(input.value));
    input.addEventListener('blur',  () => setTimeout(() => { list.style.display = 'none'; }, 150));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commitInput(); }
        if (e.key === 'Backspace' && !input.value && arr.length) {
            const last = arr[arr.length - 1];
            const slug = slugifyTag(last);
            arr.pop();
            chipMap.delete(slug);
            const field = document.getElementById(fieldId);
            const chips = field?.querySelectorAll('.wiki-tag-chip');
            chips?.[chips.length - 1]?.remove();
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
    const { heading = '', body = '', collapsible = false } = section;
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

    // Collapsible toggle
    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'wiki-collapsible-toggle';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = collapsible;
    const indicator = document.createElement('span');
    indicator.className = 'wiki-collapsible-indicator';
    if (collapsible) {
        const checkIcon = document.createElement('span');
        checkIcon.className = 'material-symbols-outlined';
        checkIcon.style.cssText = 'font-size:10px;font-variation-settings:"FILL" 1';
        checkIcon.textContent = 'check';
        indicator.appendChild(checkIcon);
    }
    cb.addEventListener('change', () => {
        indicator.innerHTML = cb.checked
            ? '<span class="material-symbols-outlined" style="font-size:10px;font-variation-settings:\'FILL\' 1">check</span>'
            : '';
    });
    const toggleText = document.createTextNode('\u00a0Recolhível');
    toggleLabel.appendChild(cb);
    toggleLabel.appendChild(indicator);
    toggleLabel.appendChild(toggleText);

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'wiki-section-control-btn';
    removeBtn.setAttribute('aria-label', 'Remover seção');
    const removeIcon = document.createElement('span');
    removeIcon.className = 'material-symbols-outlined';
    removeIcon.textContent = 'close';
    removeBtn.appendChild(removeIcon);
    removeBtn.addEventListener('click', () => item.remove());

    controls.appendChild(toggleLabel);
    controls.appendChild(removeBtn);
    headerRow.appendChild(headingInput);
    headerRow.appendChild(controls);
    item.appendChild(headerRow);

    // Body textarea
    const bodyArea = document.createElement('textarea');
    bodyArea.className = 'wiki-textarea';
    bodyArea.placeholder = 'Conteúdo da seção...\n\nUse [[Nome do Documento]] para criar links automáticos para outros documentos da wiki.';
    bodyArea.rows = 5;
    bodyArea.value = body;
    item.appendChild(bodyArea);

    builder.appendChild(item);
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
        if (v) {
            preview.src = v;
            if (row.contains(placeholder)) row.replaceChild(preview, placeholder);
        } else {
            if (row.contains(preview)) row.replaceChild(placeholder, preview);
        }
    });

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
    removeBtn.addEventListener('click', () => row.remove());

    inputs.appendChild(urlInput);
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

    // Theme
    if (doc.theme && (doc.theme.fundo || doc.theme.metalico || doc.theme.pergaminho)) {
        currentTheme = { ...WIKI_DEFAULTS, ...doc.theme };
        const container = document.getElementById('wiki-theme-picker-container');
        buildThemePicker(container, currentTheme, onThemeChange);
        applyDocTheme(currentTheme.fundo, currentTheme.metalico, currentTheme.pergaminho);
    }

    // Update page title
    const editorTitle = document.getElementById('editor-title');
    if (editorTitle) editorTitle.textContent = doc.title || 'Editar Documento';
}

function setVal(id, val)       { const el = document.getElementById(id); if (el) el.value = val; }
function setSelect(id, val)    {
    const el = document.getElementById(id);
    if (!el) return;
    const opt = [...el.options].find(o => o.value === val);
    if (opt) el.value = val;
}

// ── Form submission ────────────────────────────────────────────────────────────

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

    if (!valid) return;

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
            return;
        }
    } catch (e) {
        console.warn('[wiki-editor] titleExists check failed:', e);
    }

    submitBtn.textContent = 'Salvando...';

    // Collect sections
    const content = [];
    document.querySelectorAll('#wiki-sections-builder .wiki-section-item').forEach(item => {
        const headingEl = item.querySelector('.wiki-section-item-heading-input');
        const bodyEl    = item.querySelector('.wiki-textarea');
        const cbEl      = item.querySelector('input[type="checkbox"]');
        const heading   = headingEl?.value.trim() ?? '';
        const body      = bodyEl?.value.trim() ?? '';
        const coll      = cbEl?.checked ?? false;
        if (heading || body) content.push({ heading, body, collapsible: coll });
    });

    // Collect gallery images
    const images = [];
    document.querySelectorAll('#wiki-gallery-builder .wiki-gallery-item-row').forEach(row => {
        const ins = row.querySelectorAll('.wiki-input');
        const url = ins[0]?.value.trim() ?? '';
        const cap = ins[1]?.value.trim() ?? '';
        if (url) images.push({ url, caption: cap });
    });

    // Auto-populate relatedDocs from wiki-links
    let relatedDocs = [];
    try {
        const allNames = extractAllWikiLinks(content);
        const linksMap = await resolveWikiLinks(allNames);
        relatedDocs = [...new Set([...linksMap.values()].map(d => d.id))];
    } catch (e) {
        console.warn('[wiki-editor] wiki-links resolution failed:', e);
    }

    const data = {
        title:    titleVal,
        altName:  document.getElementById('field-alt-name')?.value.trim() ?? '',
        type:     document.getElementById('field-type')?.value    || 'creature',
        summary:  summaryVal,
        threat:   document.getElementById('field-threat')?.value    || '',
        domain:   document.getElementById('field-domain')?.value    || '',
        alignment: document.getElementById('field-alignment')?.value || '',
        types:    [...tipos],
        regions:  [...regioes],
        content,
        images,
        relatedDocs,
        theme:    { ...currentTheme },
    };

    // Status: only in create mode or for admins
    if (!currentDocId || isAdmin) {
        data.status = document.getElementById('field-status')?.value || 'community';
    }

    try {
        // Register free tags for future autocomplete
        await Promise.all([
            registerTags(tipos,   'tipo'),
            registerTags(regioes, 'regiao'),
        ]);

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
        submitBtn.disabled  = false;
        submitBtn.innerHTML = originalHTML;
        showToast('Erro ao salvar: ' + (saveErr.message || String(saveErr)), true);
    }
}
