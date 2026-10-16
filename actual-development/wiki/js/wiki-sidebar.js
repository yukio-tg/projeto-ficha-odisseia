// wiki-sidebar.js — Persistent sidebar article list for all wiki pages
import { listWikiDocs } from './wiki-firebase.js';
import { TYPE_PLURALS, TYPE_SVG } from './wiki-consts.js';
import { normalizar } from './wiki-utils.js';

let _allDocs = [];
let _currentDocId = null;

const TYPE_ORDER = ['creature', 'place', 'person', 'concept', 'item', 'group'];

/**
 * Initialise the sidebar: load docs, render list, wire search.
 * @param {string|null} currentDocId - Highlight this doc in the list (doc viewer page).
 */
export async function initWikiSidebar(currentDocId = null) {
    _currentDocId = currentDocId;
    const sidebar = document.getElementById('wiki-sidebar');
    if (!sidebar) return;

    try {
        _allDocs = await listWikiDocs();
    } catch { _allDocs = []; }

    renderSidebarList('');

    // Wire search inputs — both the sidebar-specific one and (on index) the shared one
    const searches = [
        document.getElementById('wiki-sidebar-search'),
        document.getElementById('wiki-search'),
    ].filter(Boolean);

    searches.forEach(input => {
        input.addEventListener('input', () => {
            const q = input.value.trim();
            // Sync both search inputs
            searches.forEach(other => { if (other !== input) other.value = q; });
            renderSidebarList(q);
            // If there's a wiki-list renderList function on the page, trigger it too
            if (typeof window.__wikiSidebarSearchHook === 'function') {
                window.__wikiSidebarSearchHook(q);
            }
        });
    });
}

function renderSidebarList(query) {
    const listEl = document.getElementById('wiki-sidebar-list');
    if (!listEl) return;

    const q = normalizar(query);
    const filtered = q
        ? _allDocs.filter(d =>
            normalizar(d.title || '').includes(q) ||
            normalizar(d.altName || '').includes(q) ||
            normalizar(d.summary || '').includes(q)
          )
        : _allDocs;

    if (filtered.length === 0) {
        listEl.innerHTML = '<div class="wiki-sidebar-empty">Nenhum artigo encontrado</div>';
        return;
    }

    // Group by type
    const grouped = {};
    TYPE_ORDER.forEach(t => { grouped[t] = []; });
    filtered.forEach(doc => {
        const t = doc.type;
        if (!grouped[t]) grouped[t] = [];
        grouped[t].push(doc);
    });

    listEl.innerHTML = '';
    TYPE_ORDER.forEach(type => {
        const docs = grouped[type];
        if (!docs?.length) return;

        // Group header
        const groupHeader = document.createElement('div');
        groupHeader.className = 'wiki-sidebar-group-header';
        const svgPath = TYPE_SVG[type];
        if (svgPath) {
            const icon = document.createElement('span');
            icon.className = 'wiki-sidebar-group-icon';
            icon.style.cssText = `mask:url('${svgPath}') center/contain no-repeat;-webkit-mask:url('${svgPath}') center/contain no-repeat`;
            groupHeader.appendChild(icon);
        }
        const label = document.createElement('span');
        label.textContent = TYPE_PLURALS[type] || type;
        groupHeader.appendChild(label);
        listEl.appendChild(groupHeader);

        // Doc entries
        docs.forEach(doc => {
            const item = document.createElement('a');
            item.className = 'wiki-sidebar-item';
            if (doc.id === _currentDocId) item.classList.add('wiki-sidebar-item--active');
            item.href = `/wiki/doc?id=${encodeURIComponent(doc.id)}`;

            const title = document.createElement('span');
            title.className = 'wiki-sidebar-item-title';
            title.textContent = doc.title || '(Sem título)';
            item.appendChild(title);

            if (doc.status === 'canonical') {
                const crown = document.createElement('span');
                crown.className = 'material-symbols-outlined wiki-sidebar-item-crown';
                crown.style.fontVariationSettings = "'FILL' 1";
                crown.textContent = 'crown';
                item.appendChild(crown);
            }

            listEl.appendChild(item);
        });
    });
}
