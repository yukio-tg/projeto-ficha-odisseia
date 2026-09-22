// wiki-editor.js — Create / Edit document editor for the Odisseia Wiki.
// Shared by criar.html and editar.html.
// Mode detection: ?id= present → edit mode; absent → create mode.

import { initWikiFirebase, getWikiDoc, createWikiDoc, updateWikiDoc } from './wiki-firebase.js';
import { getAuthState, requireAuth }                                    from './wiki-auth.js';
import { escapeHtml, getParam, slugifyTag, showToast }                  from './wiki-utils.js';
import { buildThemePicker, applyDocTheme, WIKI_DEFAULTS }               from './wiki-theme.js';
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

// ── Module state ──────────────────────────────────────────────────────────────

/** null = create mode; non-null string = edit mode */
let currentDocId = null;

/** Currently selected theme IDs — kept in sync via onThemeChange */
let currentTheme = { ...WIKI_DEFAULTS };

/**
 * Live list of slugified tag strings.
 * Mutations happen through addTag / removeTag only.
 */
let tags = [];

// Sections, gallery, and related-doc data are read back from the DOM at submit
// time rather than tracked reactively — the arrays below satisfy the spec
// declaration without introducing a parallel state that could desync.
let sections   = []; // eslint-disable-line no-unused-vars
let gallery    = []; // eslint-disable-line no-unused-vars
let relatedIds = []; // eslint-disable-line no-unused-vars

/** Authenticated Firebase user */
let user = null;

/** Whether the current user has admin privileges */
let isAdmin = false;

/**
 * Maps tag slug → its chip DOM element.
 * Enables O(1) removal without DOM queries.
 */
const tagChipMap = new Map();

// ── Bootstrap ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    initWikiFirebase();

    // Detect mode from URL
    currentDocId = getParam('id') || null;

    // Gate: redirect to login if the user is not authenticated
    const authedUser = await requireAuth('/index.html');
    if (!authedUser) return; // redirect already triggered

    // Resolve and cache auth state (cached after requireAuth)
    const authState = await getAuthState();
    user    = authState.user;
    isAdmin = authState.isAdmin;

    // Status field: only admins may choose "canonical"
    maybeAddCanonicalOption(isAdmin);

    // In edit mode non-admins cannot change status at all — hide the field.
    // Firestore rules enforce this server-side as well.
    if (currentDocId && !isAdmin) {
        const statusWrap = document.getElementById('field-status-wrap');
        if (statusWrap) statusWrap.style.display = 'none';
    }

    // Build theme picker with defaults; will be rebuilt if edit mode loads
    // a document that carries its own theme overrides.
    const themeContainer = document.getElementById('wiki-theme-picker-container');
    buildThemePicker(themeContainer, currentTheme, onThemeChange);
    applyDocTheme(currentTheme.fundo, currentTheme.metalico, currentTheme.pergaminho);

    // Edit mode: fetch the document and fill the form
    if (currentDocId) {
        await loadDoc(currentDocId);
    }

    // ── Wire events ───────────────────────────────────────────────────────────
    document.getElementById('wiki-form')
        .addEventListener('submit', handleSubmit);

    document.getElementById('wiki-add-section')
        .addEventListener('click', () => addSection());

    document.getElementById('wiki-add-image')
        .addEventListener('click', () => addGalleryItem());

    document.getElementById('wiki-add-related')
        .addEventListener('click', () => addRelatedId());

    setupTagInput();
});

// ── Canonical status option ───────────────────────────────────────────────────

/**
 * Appends the "Canônico ★" option to the status <select> when the user is an
 * admin and the option is not already present.
 */
function maybeAddCanonicalOption(isAdminFlag) {
    const sel = document.getElementById('field-status');
    if (!isAdminFlag || !sel) return;
    if (!sel.querySelector('option[value="canonical"]')) {
        const opt = document.createElement('option');
        opt.value       = 'canonical';
        opt.textContent = 'Canônico ★';
        sel.appendChild(opt);
    }
}

// ── Theme ─────────────────────────────────────────────────────────────────────

/**
 * Callback passed to buildThemePicker.
 * Keeps currentTheme in sync and applies the new CSS variables.
 * The .wiki-theme-preview strip auto-refreshes because it uses the same vars.
 */
function onThemeChange(newTheme) {
    currentTheme = newTheme;
    applyDocTheme(newTheme.fundo, newTheme.metalico, newTheme.pergaminho);
}

// ── Load document (edit mode) ─────────────────────────────────────────────────

/**
 * Fetches the wiki document, verifies the current user has edit rights,
 * updates the page heading, and delegates field population to populateForm().
 *
 * On failure (not found / unauthorised / network error) a toast is shown
 * and the user is redirected after a brief delay.
 */
async function loadDoc(id) {
    try {
        const wikiDoc = await getWikiDoc(id);

        if (!wikiDoc) {
            showToast('Documento não encontrado.', true);
            setTimeout(() => { window.location.href = '/wiki'; }, 2500);
            return;
        }

        // Only the document's author or an admin may edit
        if (!isAdmin && wikiDoc.authorId !== user.uid) {
            showToast('Você não tem permissão para editar este documento.', true);
            setTimeout(() => { window.location.href = '/wiki/doc?id=' + id; }, 2500);
            return;
        }

        // Reflect the actual document title in the page heading
        const editorTitle = document.getElementById('editor-title');
        if (editorTitle && wikiDoc.title) {
            editorTitle.textContent = wikiDoc.title;
        }

        populateForm(wikiDoc);

    } catch (err) {
        console.error('[wiki-editor] loadDoc error:', err);
        showToast('Erro ao carregar documento: ' + (err.message || String(err)), true);
    }
}

// ── Populate form (edit mode) ─────────────────────────────────────────────────

/**
 * Fills every form field with data from an existing wiki document.
 * Also rebuilds the theme picker when the document defines theme overrides.
 */
function populateForm(wikiDoc) {
    // ── Scalar fields ─────────────────────────────────────────────────────────
    const typeSelect   = document.getElementById('field-type');
    const statusSelect = document.getElementById('field-status');
    const titleInput   = document.getElementById('field-title');
    const summaryInput = document.getElementById('field-summary');

    if (typeSelect   && wikiDoc.type)    typeSelect.value   = wikiDoc.type;
    if (statusSelect && wikiDoc.status)  statusSelect.value = wikiDoc.status;
    if (titleInput)                      titleInput.value   = wikiDoc.title   || '';
    if (summaryInput)                    summaryInput.value = wikiDoc.summary || '';

    // ── Collections ───────────────────────────────────────────────────────────
    (wikiDoc.tags       || []).forEach(t   => addTag(t));
    (wikiDoc.content    || []).forEach(s   => addSection(s));
    (wikiDoc.images     || []).forEach(img => addGalleryItem(img));
    (wikiDoc.relatedDocs || []).forEach(id => addRelatedId(id));

    // ── Theme — rebuild picker only when the doc has overrides ────────────────
    if (wikiDoc.theme && Object.keys(wikiDoc.theme).length > 0) {
        currentTheme = { ...WIKI_DEFAULTS, ...wikiDoc.theme };
        const themeContainer = document.getElementById('wiki-theme-picker-container');
        buildThemePicker(themeContainer, currentTheme, onThemeChange);
        applyDocTheme(currentTheme.fundo, currentTheme.metalico, currentTheme.pergaminho);
    }
}

// ── Tag management ────────────────────────────────────────────────────────────

/**
 * Attaches keyboard and paste listeners to the tag text input.
 *
 * • Enter / comma  → commit the current value as a tag
 * • Backspace      → remove the last tag when the input is empty
 * • Paste          → split by comma/whitespace and add each part as a tag
 */
function setupTagInput() {
    const input = document.getElementById('wiki-tag-input');
    const field = document.getElementById('wiki-tag-field');
    if (!input || !field) return;

    // Click anywhere in the tag container to focus the text input
    field.addEventListener('click', () => input.focus());

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const raw  = input.value.trim().replace(/,+$/, '');
            const slug = raw ? slugifyTag(raw) : '';
            if (slug && !tags.includes(slug)) addTag(slug);
            input.value = '';
            return;
        }

        // Backspace on an empty input removes the last committed tag
        if (e.key === 'Backspace' && input.value === '' && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        }
    });

    // Paste support: split pasted text and add each resulting slug
    input.addEventListener('paste', e => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData('text');
        pasted
            .split(/[,\s]+/)
            .map(p => slugifyTag(p.trim()))
            .filter(Boolean)
            .forEach(slug => { if (!tags.includes(slug)) addTag(slug); });
    });
}

/**
 * Adds a tag chip to the tag field.
 * No-op when the tag already exists or produces an empty slug after slugification.
 *
 * @param {string} tag - Raw tag string; will be slugified internally.
 */
function addTag(tag) {
    const slug = slugifyTag(tag);
    if (!slug || tags.includes(slug)) return;

    tags.push(slug);

    // ── Build chip DOM ────────────────────────────────────────────────────────
    const chip = document.createElement('span');
    chip.className = 'wiki-tag-chip';

    const text = document.createElement('span');
    text.className   = 'wiki-tag-text';
    text.textContent = slug;

    const removeBtn = document.createElement('button');
    removeBtn.type      = 'button';
    removeBtn.className = 'wiki-tag-chip-remove';
    removeBtn.setAttribute('aria-label', 'Remover tag ' + escapeHtml(slug));
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => removeTag(slug));

    chip.appendChild(text);
    chip.appendChild(removeBtn);

    // Register in the map for O(1) removal later
    tagChipMap.set(slug, chip);

    // Insert the chip just before the text input (right-most element)
    const field = document.getElementById('wiki-tag-field');
    const input = document.getElementById('wiki-tag-input');
    if (field && input) field.insertBefore(chip, input);
}

/**
 * Removes a tag chip from the DOM and from the tags[] array.
 *
 * @param {string} tag - Exact slug string, as stored in tags[].
 */
function removeTag(tag) {
    const idx = tags.indexOf(tag);
    if (idx === -1) return;
    tags.splice(idx, 1);

    const chip = tagChipMap.get(tag);
    if (chip) {
        chip.remove();
        tagChipMap.delete(tag);
    }
}

// ── Content sections builder ──────────────────────────────────────────────────

/**
 * Creates a content section item and appends it to the sections builder.
 * Section data is read back from the DOM at submit time — nothing is
 * tracked live beyond the DOM.
 *
 * @param {{ heading?: string, body?: string, collapsible?: boolean }} section
 */
function addSection(section = { heading: '', body: '', collapsible: false }) {
    const item = document.createElement('div');
    item.className = 'wiki-section-item';

    // ── Header row ────────────────────────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'wiki-section-item-header';

    const headingInput = document.createElement('input');
    headingInput.type        = 'text';
    headingInput.className   = 'wiki-section-item-heading-input';
    headingInput.placeholder = 'Título da seção';
    headingInput.value       = section.heading || '';

    // ── Controls cluster ──────────────────────────────────────────────────────
    const controls = document.createElement('div');
    controls.className = 'wiki-section-controls';

    // Custom collapsible checkbox
    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'wiki-collapsible-toggle';

    const checkbox     = document.createElement('input');
    checkbox.type      = 'checkbox';
    checkbox.checked   = !!section.collapsible;

    const indicator    = document.createElement('span');
    indicator.className = 'wiki-collapsible-indicator';

    const checkIcon    = document.createElement('span');
    checkIcon.className   = 'material-symbols-outlined';
    checkIcon.textContent = 'check';
    indicator.appendChild(checkIcon);

    toggleLabel.appendChild(checkbox);
    toggleLabel.appendChild(indicator);
    toggleLabel.appendChild(document.createTextNode('\u00a0Recolhível'));

    // Remove-section button
    const removeBtn = document.createElement('button');
    removeBtn.type      = 'button';
    removeBtn.className = 'wiki-section-control-btn';
    removeBtn.setAttribute('aria-label', 'Remover seção');
    removeBtn.addEventListener('click', () => item.remove());

    const removeIcon    = document.createElement('span');
    removeIcon.className   = 'material-symbols-outlined';
    removeIcon.textContent = 'close';
    removeBtn.appendChild(removeIcon);

    controls.appendChild(toggleLabel);
    controls.appendChild(removeBtn);

    header.appendChild(headingInput);
    header.appendChild(controls);

    // ── Body textarea ─────────────────────────────────────────────────────────
    const bodyTextarea       = document.createElement('textarea');
    bodyTextarea.className   = 'wiki-textarea';
    bodyTextarea.placeholder = 'Conteúdo da seção...';
    bodyTextarea.rows        = 4;
    bodyTextarea.value       = section.body || '';

    item.appendChild(header);
    item.appendChild(bodyTextarea);

    document.getElementById('wiki-sections-builder').appendChild(item);
}

// ── Image gallery builder ─────────────────────────────────────────────────────

/**
 * Creates an image gallery row and appends it to the gallery builder.
 * The preview thumbnail updates in real time as the URL input value changes.
 *
 * @param {{ url?: string, caption?: string }} img
 */
function addGalleryItem(img = { url: '', caption: '' }) {
    const row       = document.createElement('div');
    row.className   = 'wiki-gallery-item-row';

    // ── Preview / placeholder ─────────────────────────────────────────────────
    const preview   = document.createElement('img');
    preview.className = 'wiki-gallery-img-preview';
    preview.alt       = 'Pré-visualização';

    const placeholder = document.createElement('div');
    placeholder.className = 'wiki-gallery-img-placeholder';

    const placeholderIcon       = document.createElement('span');
    placeholderIcon.className   = 'material-symbols-outlined';
    placeholderIcon.textContent = 'image';
    placeholder.appendChild(placeholderIcon);

    // Mount the correct visual for the initial state
    if (img.url) {
        preview.src = img.url;
        row.appendChild(preview);
    } else {
        row.appendChild(placeholder);
    }

    // ── Input group ───────────────────────────────────────────────────────────
    const inputs       = document.createElement('div');
    inputs.className   = 'wiki-gallery-item-inputs';

    const urlInput           = document.createElement('input');
    urlInput.type            = 'text';
    urlInput.className       = 'wiki-input wiki-gallery-item-url';
    urlInput.placeholder     = 'URL da imagem (https://...)';
    urlInput.value           = img.url || '';

    const captionInput       = document.createElement('input');
    captionInput.type        = 'text';
    captionInput.className   = 'wiki-input';
    captionInput.placeholder = 'Legenda (opcional)';
    captionInput.value       = img.caption || '';

    const removeBtn       = document.createElement('button');
    removeBtn.type        = 'button';
    removeBtn.className   = 'wiki-gallery-remove-btn';
    removeBtn.setAttribute('aria-label', 'Remover imagem da galeria');
    removeBtn.addEventListener('click', () => row.remove());

    const removeIcon       = document.createElement('span');
    removeIcon.className   = 'material-symbols-outlined';
    removeIcon.textContent = 'close';
    removeBtn.appendChild(removeIcon);

    inputs.appendChild(urlInput);
    inputs.appendChild(captionInput);
    inputs.appendChild(removeBtn);
    row.appendChild(inputs);

    // ── Live preview update ───────────────────────────────────────────────────
    urlInput.addEventListener('input', () => {
        const url = urlInput.value.trim();
        if (url) {
            preview.src = url;
            if (row.contains(placeholder)) row.replaceChild(preview, placeholder);
        } else {
            if (row.contains(preview)) row.replaceChild(placeholder, preview);
        }
    });

    document.getElementById('wiki-gallery-builder').appendChild(row);
}

// ── Related documents ─────────────────────────────────────────────────────────

/**
 * Adds a related document ID input row to the related-docs container.
 *
 * @param {string} id - Optional pre-filled document ID.
 */
function addRelatedId(id = '') {
    const container = document.getElementById('wiki-related-inputs');
    if (!container) return;

    const row           = document.createElement('div');
    row.style.cssText   = 'display:flex;gap:8px;align-items:center;';

    const input         = document.createElement('input');
    input.type          = 'text';
    input.className     = 'wiki-input';
    input.placeholder   = 'ID do documento relacionado';
    input.value         = String(id || '');
    input.style.flex    = '1';

    const removeBtn     = document.createElement('button');
    removeBtn.type      = 'button';
    removeBtn.className = 'wiki-section-control-btn';
    removeBtn.setAttribute('aria-label', 'Remover referência');
    removeBtn.addEventListener('click', () => row.remove());

    const removeIcon       = document.createElement('span');
    removeIcon.className   = 'material-symbols-outlined';
    removeIcon.textContent = 'close';
    removeBtn.appendChild(removeIcon);

    row.appendChild(input);
    row.appendChild(removeBtn);
    container.appendChild(row);
}

// ── Form submission ───────────────────────────────────────────────────────────

/**
 * Validates the form, collects all field values, and persists the document.
 *
 * Create mode → createWikiDoc()  → redirect to /wiki/doc?id=<newId>
 * Edit mode   → updateWikiDoc()  → redirect to /wiki/doc?id=<currentDocId>
 *
 * On error the submit button is re-enabled and a toast shows the message.
 *
 * @param {SubmitEvent} e
 */
async function handleSubmit(e) {
    e.preventDefault();

    // ── Client-side validation ────────────────────────────────────────────────
    let isValid = true;

    const titleWrap  = document.getElementById('field-title-wrap');
    const titleInput = document.getElementById('field-title');
    const titleVal   = titleInput ? titleInput.value.trim() : '';

    if (!titleVal) {
        titleWrap?.classList.add('error');
        isValid = false;
    } else {
        titleWrap?.classList.remove('error');
    }

    const summaryWrap  = document.getElementById('field-summary-wrap');
    const summaryInput = document.getElementById('field-summary');
    const summaryVal   = summaryInput ? summaryInput.value.trim() : '';

    if (!summaryVal) {
        summaryWrap?.classList.add('error');
        isValid = false;
    } else {
        summaryWrap?.classList.remove('error');
    }

    if (!isValid) return;

    // ── Disable button while saving ───────────────────────────────────────────
    const submitBtn    = document.getElementById('wiki-submit-btn');
    const originalHTML = submitBtn.innerHTML; // static markup — safe to restore
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Salvando...';

    // ── Collect content sections ──────────────────────────────────────────────
    const content = [];
    document.querySelectorAll('#wiki-sections-builder .wiki-section-item')
        .forEach(item => {
            const headingEl   = item.querySelector('.wiki-section-item-heading-input');
            const bodyEl      = item.querySelector('.wiki-textarea');
            const collapseCb  = item.querySelector('input[type="checkbox"]');

            const heading     = headingEl  ? headingEl.value.trim()  : '';
            const body        = bodyEl     ? bodyEl.value.trim()     : '';
            const collapsible = collapseCb ? collapseCb.checked      : false;

            // Skip sections where both fields are empty
            if (heading || body) content.push({ heading, body, collapsible });
        });

    // ── Collect gallery images ────────────────────────────────────────────────
    const images = [];
    document.querySelectorAll('#wiki-gallery-builder .wiki-gallery-item-row')
        .forEach(row => {
            const allInputs = row.querySelectorAll('.wiki-input');
            const url     = allInputs[0] ? allInputs[0].value.trim() : '';
            const caption = allInputs[1] ? allInputs[1].value.trim() : '';

            // Skip rows without a URL
            if (url) images.push({ url, caption });
        });

    // ── Collect related document IDs ──────────────────────────────────────────
    const relatedDocs = [];
    document.querySelectorAll('#wiki-related-inputs .wiki-input')
        .forEach(input => {
            const val = input.value.trim();
            if (val) relatedDocs.push(val);
        });

    // ── Build payload ─────────────────────────────────────────────────────────
    const data = {
        title:       titleVal,
        type:        document.getElementById('field-type')?.value    || 'creature',
        summary:     summaryVal,
        tags:        [...tags],
        content,
        images,
        relatedDocs,
        theme:       { ...currentTheme },
    };

    // Status is included for:
    //   • create mode (any user — non-admins can only pick "community")
    //   • edit mode with admin privileges
    //
    // Non-admin users in edit mode do NOT send status; omitting the field from
    // updateWikiDoc leaves the existing Firestore value intact.
    // Firestore security rules provide a server-side guard as well.
    if (!currentDocId || isAdmin) {
        data.status = document.getElementById('field-status')?.value || 'community';
    }

    // ── Persist ───────────────────────────────────────────────────────────────
    try {
        if (currentDocId) {
            // Edit mode — authorId intentionally excluded to protect the author field
            await updateWikiDoc(currentDocId, data);
            window.location.href = '/wiki/doc?id=' + currentDocId;
        } else {
            // Create mode — attach author identity to the new document
            data.authorId    = user.uid;
            data.authorEmail = user.email;
            const newId = await createWikiDoc(data);
            window.location.href = '/wiki/doc?id=' + newId;
        }
    } catch (saveErr) {
        console.error('[wiki-editor] handleSubmit error:', saveErr);
        // Restore the submit button to its original state
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
        showToast('Erro ao salvar: ' + (saveErr.message || String(saveErr)), true);
    }
}
