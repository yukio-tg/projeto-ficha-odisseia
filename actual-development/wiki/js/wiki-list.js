// wiki-list.js — Wiki list page controller for Odisseia
// Handles: auth state, search, type filters, card rendering.

import { initWikiFirebase, listWikiDocs }                                from './wiki-firebase.js';
import { getAuthState }                                                  from './wiki-auth.js';
import { escapeHtml, normalizar, TYPE_LABELS, TYPE_ICONS, showToast }   from './wiki-utils.js';
import { getAuth, signOut }  from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

// ─── Page state ───────────────────────────────────────────────────────────────
let allDocs       = [];   // full dataset from Firestore
let currentType   = '';   // '' = all types
let currentSearch = '';   // normalised search string

// ─── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    initWikiFirebase();

    const { user, isAdmin } = await getAuthState();

    // "Criar" button is only visible to authenticated users
    if (user) {
        const createBtn = document.getElementById('wiki-create-btn');
        if (createBtn) createBtn.style.display = '';
    }

    renderUserArea(user, isAdmin);
    await loadDocs();

    // ── Search input ────────────────────────────────────────────────────────
    const searchInput = document.getElementById('wiki-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentSearch = searchInput.value.trim();
            renderList();
        });
    }

    // ── Filter tabs ─────────────────────────────────────────────────────────
    document.querySelectorAll('.wiki-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.wiki-tab-btn')
                    .forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentType = btn.dataset.type || '';
            renderList();
        });
    });
});

// ─── Data loading ─────────────────────────────────────────────────────────────
async function loadDocs() {
    const main = document.getElementById('wiki-main');

    // Show animated spinner while fetching
    main.innerHTML = `
        <div class="wiki-loading">
            <span class="material-symbols-outlined">autorenew</span>
            Carregando documentos...
        </div>`;

    try {
        allDocs = await listWikiDocs();
    } catch (e) {
        console.error('[wiki-list] loadDocs error:', e);
        showToast('Erro ao carregar documentos.', true);
        allDocs = [];
    }

    renderList();
}

// ─── List rendering ───────────────────────────────────────────────────────────
function renderList() {
    const main = document.getElementById('wiki-main');

    // 1. Filter by selected type
    let filtered = currentType
        ? allDocs.filter(d => d.type === currentType)
        : allDocs.slice();

    // 2. Filter by search query (title · summary · tags)
    if (currentSearch) {
        const q = normalizar(currentSearch);
        filtered = filtered.filter(d =>
            normalizar(d.title).includes(q) ||
            normalizar(d.summary || '').includes(q) ||
            (d.tags || []).some(t => normalizar(t).includes(q))
        );
    }

    // 3. Empty state
    if (filtered.length === 0) {
        main.innerHTML = `
            <div class="wiki-empty">
                <span class="material-symbols-outlined">search_off</span>
                Nenhum documento encontrado.
            </div>`;
        return;
    }

    // 4. Build grid
    const grid = document.createElement('div');
    grid.className = 'wiki-grid';
    filtered.forEach(doc => grid.appendChild(buildCard(doc)));

    main.innerHTML = '';
    main.appendChild(grid);
}

// ─── Card builder ─────────────────────────────────────────────────────────────
/**
 * Builds a wiki card anchor element for the given document.
 *
 * Uses `document.createElement` for the card and all its children.
 * Text content is always set via `.textContent` (XSS-safe, no innerHTML for
 * user-supplied strings). `escapeHtml` is reserved for any future innerHTML
 * concatenation with user data.
 *
 * @param   {Object} doc  – Firestore wiki_doc record (id + all fields)
 * @returns {HTMLAnchorElement}
 */
function buildCard(doc) {
    // ── Root anchor ──────────────────────────────────────────────────────────
    const card = document.createElement('a');
    card.className = 'wiki-card' + (doc.status === 'canonical' ? ' canonical' : '');
    card.href = `/wiki/doc?id=${doc.id}`;

    // ── Image wrap ───────────────────────────────────────────────────────────
    const imgWrap = document.createElement('div');
    imgWrap.className = 'wiki-card-img-wrap';

    const firstImage = doc.images && doc.images.length > 0 ? doc.images[0] : null;

    if (firstImage) {
        const img = document.createElement('img');
        img.className = 'wiki-card-img';
        img.src       = firstImage.url;
        img.alt       = firstImage.caption || doc.title || '';
        // Broken image → fall back to type placeholder
        img.onerror = () => {
            imgWrap.innerHTML = '';
            imgWrap.appendChild(_makePlaceholder(doc.type));
        };
        imgWrap.appendChild(img);
    } else {
        imgWrap.appendChild(_makePlaceholder(doc.type));
    }

    card.appendChild(imgWrap);

    // ── Card body ────────────────────────────────────────────────────────────
    const body = document.createElement('div');
    body.className = 'wiki-card-body';

    // ·· Type row ·············································
    const typeRow = document.createElement('div');
    typeRow.className = 'wiki-card-type-row';

    // Type badge (pill with icon + label)
    const typeBadge = document.createElement('span');
    typeBadge.className = 'wiki-type-badge';

    const typeIconEl = document.createElement('span');
    typeIconEl.className = 'material-symbols-outlined';
    typeIconEl.style.cssText = "font-variation-settings:'FILL' 1;font-size:10px;vertical-align:middle;margin-right:3px";
    typeIconEl.textContent  = TYPE_ICONS[doc.type]  || 'article';
    typeBadge.appendChild(typeIconEl);
    typeBadge.appendChild(document.createTextNode(TYPE_LABELS[doc.type] || doc.type));
    typeRow.appendChild(typeBadge);

    // Canonical badge (crown + "Canônico") — only for canonical docs
    if (doc.status === 'canonical') {
        const canonBadge = document.createElement('span');
        canonBadge.className = 'wiki-canonical-badge';

        const crownIconEl = document.createElement('span');
        crownIconEl.className = 'material-symbols-outlined';
        crownIconEl.style.fontVariationSettings = "'FILL' 1";
        crownIconEl.textContent = 'crown';
        canonBadge.appendChild(crownIconEl);
        canonBadge.appendChild(document.createTextNode(' Canônico'));
        typeRow.appendChild(canonBadge);
    }

    body.appendChild(typeRow);

    // ·· Title ···············································
    const titleEl = document.createElement('h3');
    titleEl.className  = 'wiki-card-title';
    titleEl.textContent = doc.title || '(Sem título)';
    body.appendChild(titleEl);

    // ·· Summary — omitted entirely when empty ···············
    const summaryText = (doc.summary || '').trim();
    if (summaryText) {
        const summaryEl = document.createElement('p');
        summaryEl.className   = 'wiki-card-summary';
        summaryEl.textContent = summaryText;
        body.appendChild(summaryEl);
    }

    // ·· Tags — omitted entirely when array is empty, max 5 ·
    if (doc.tags && doc.tags.length > 0) {
        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'wiki-card-tags';
        doc.tags.slice(0, 5).forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className   = 'wiki-tag';
            tagSpan.textContent = tag;
            tagsDiv.appendChild(tagSpan);
        });
        body.appendChild(tagsDiv);
    }

    card.appendChild(body);
    return card;
}

/**
 * Creates the image-area placeholder span for a given doc type.
 * Has both `material-symbols-outlined` (renders the icon) and
 * `wiki-card-img-placeholder` (CSS: flex-centred, full wrap height).
 *
 * @param   {string} type  – doc.type key
 * @returns {HTMLSpanElement}
 */
function _makePlaceholder(type) {
    const ph = document.createElement('span');
    ph.className = 'material-symbols-outlined wiki-card-img-placeholder';
    ph.style.fontVariationSettings = "'FILL' 1";
    ph.textContent = TYPE_ICONS[type] || 'article';
    return ph;
}

// ─── User area ────────────────────────────────────────────────────────────────
/**
 * Renders authentication UI into `#wiki-user-area`.
 *  • Logged-out → "Entrar" link
 *  • Logged-in  → username chip (with ★ crown for admins) + logout button
 *
 * @param {import('firebase/auth').User|null} user
 * @param {boolean} isAdmin
 */
function renderUserArea(user, isAdmin) {
    const area = document.getElementById('wiki-user-area');
    if (!area) return;

    // ── Not logged in ────────────────────────────────────────────────────────
    if (!user) {
        area.innerHTML = '<a href="/index.html" class="wiki-login-link">Entrar</a>';
        return;
    }

    area.innerHTML = '';

    // ── User chip ────────────────────────────────────────────────────────────
    const chip = document.createElement('span');
    chip.className = 'wiki-user-chip';

    // Admin indicator
    if (isAdmin) {
        const crownStar = document.createElement('span');
        crownStar.textContent = '★';
        crownStar.title       = 'Administrador';
        chip.appendChild(crownStar);
        chip.appendChild(document.createTextNode(' '));
    }

    const nameSpan = document.createElement('span');
    nameSpan.textContent = user.displayName || user.email?.split('@')[0] || 'Usuário';
    chip.appendChild(nameSpan);
    area.appendChild(chip);

    // ── Logout button ────────────────────────────────────────────────────────
    const logoutBtn = document.createElement('button');
    logoutBtn.className   = 'wiki-btn wiki-btn-secondary';
    logoutBtn.textContent = 'Sair';
    logoutBtn.addEventListener('click', () => {
        signOut(getAuth()).then(() => window.location.reload());
    });
    area.appendChild(logoutBtn);
}
