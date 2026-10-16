// wiki-list.js — Wiki list page controller for Odisseia

import { initWikiFirebase, listWikiDocs }          from './wiki-firebase.js';
import { getAuthState }                             from './wiki-auth.js';
import { escapeHtml, normalizar, showToast }        from './wiki-utils.js';
import { initWikiSidebar }                          from './wiki-sidebar.js';
import {
    TYPE_LABELS, TYPE_ICONS, TYPE_SVG,
    THREAT_COLORS, THREAT_COLORS_DARK,
    DOMAIN_COLORS, DOMAIN_COLORS_DARK,
    ALIGNMENT_COLORS, ALIGNMENT_COLORS_DARK,
    getThreatStyle, getDomainStyle, getAlignmentStyle,
} from './wiki-consts.js';
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

// ─── Page state ────────────────────────────────────────────────────────────────
let allDocs       = [];
let currentType   = '';
let currentSearch = '';

// ─── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Permanent dark mode for the wiki
    document.body.classList.add('theme-dark-paper');
    initWikiFirebase();

    const { user, isAdmin } = await getAuthState();

    if (user) {
        const createBtn = document.getElementById('wiki-create-btn');
        if (createBtn) createBtn.style.display = '';
    }

    renderUserArea(user, isAdmin);

    // Sidebar (loads its own docs)
    initWikiSidebar(null);

    // Hook sidebar search to also filter the card grid
    window.__wikiSidebarSearchHook = (q) => {
        currentSearch = q;
        renderList();
    };

    await loadDocs();

    // Wire the legacy wiki-search ID (now in sidebar) to the grid
    const searchInput = document.getElementById('wiki-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            currentSearch = searchInput.value.trim();
            renderList();
        });
    }

    document.querySelectorAll('.wiki-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.wiki-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentType = btn.dataset.type || '';
            renderList();
        });
    });
});

// ─── Data loading ─────────────────────────────────────────────────────────────
async function loadDocs() {
    const main = document.getElementById('wiki-main');
    main.innerHTML = '<div class="wiki-loading"><span class="material-symbols-outlined">autorenew</span>Carregando documentos...</div>';
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

    let filtered = currentType ? allDocs.filter(d => d.type === currentType) : allDocs.slice();

    if (currentSearch) {
        const q = normalizar(currentSearch);
        filtered = filtered.filter(d =>
            normalizar(d.title).includes(q) ||
            normalizar(d.altName || '').includes(q) ||
            normalizar(d.summary || '').includes(q) ||
            (d.types || []).some(t => normalizar(t).includes(q)) ||
            (d.regions || []).some(t => normalizar(t).includes(q)) ||
            normalizar(d.threat || '').includes(q) ||
            normalizar(d.domain || '').includes(q)
        );
    }

    if (filtered.length === 0) {
        main.innerHTML = '<div class="wiki-empty"><span class="material-symbols-outlined">search_off</span>Nenhum documento encontrado.</div>';
        return;
    }

    const grid = document.createElement('div');
    grid.className = 'wiki-grid';
    filtered.forEach(doc => grid.appendChild(buildCard(doc)));

    main.innerHTML = '';
    main.appendChild(grid);
}

// ─── Card builder ─────────────────────────────────────────────────────────────
function buildCard(doc) {
    const isDark = document.body.classList.contains('theme-dark-paper');

    const card = document.createElement('a');
    card.className = 'wiki-card' + (doc.status === 'canonical' ? ' canonical' : '');
    card.href = `/wiki/doc?id=${doc.id}`;

    // ── Image wrap ────────────────────────────────────────────────────────────
    const imgWrap = document.createElement('div');
    imgWrap.className = 'wiki-card-img-wrap';
    const firstImage = doc.images?.[0] ?? null;
    if (firstImage?.url) {
        const img = document.createElement('img');
        img.className = 'wiki-card-img';
        img.src       = firstImage.url;
        img.alt       = firstImage.caption || doc.title || '';
        img.loading   = 'lazy';
        img.onerror   = () => { imgWrap.innerHTML = ''; imgWrap.appendChild(_makePlaceholder(doc.type)); };
        imgWrap.appendChild(img);
    } else {
        imgWrap.appendChild(_makePlaceholder(doc.type));
    }
    card.appendChild(imgWrap);

    // ── Card body ─────────────────────────────────────────────────────────────
    const body = document.createElement('div');
    body.className = 'wiki-card-body';

    // Type + canonical row
    const typeRow = document.createElement('div');
    typeRow.className = 'wiki-card-type-row';

    const typeBadge = document.createElement('span');
    typeBadge.className = 'wiki-type-badge';
    const svgPath = TYPE_SVG[doc.type];
    if (svgPath) {
        const typeIcon = document.createElement('span');
        typeIcon.className = 'wiki-type-svg-icon';
        typeIcon.style.cssText = `display:inline-block;width:10px;height:10px;vertical-align:middle;margin-right:3px;mask:url('${svgPath}') center/contain no-repeat;-webkit-mask:url('${svgPath}') center/contain no-repeat;background:currentColor`;
        typeBadge.appendChild(typeIcon);
    }
    typeBadge.appendChild(document.createTextNode(TYPE_LABELS[doc.type] || doc.type));
    typeRow.appendChild(typeBadge);

    if (doc.status === 'canonical') {
        const canonBadge = document.createElement('span');
        canonBadge.className = 'wiki-canonical-badge';
        const crownIcon = document.createElement('span');
        crownIcon.className = 'material-symbols-outlined';
        crownIcon.style.fontVariationSettings = "'FILL' 1";
        crownIcon.textContent = 'crown';
        canonBadge.appendChild(crownIcon);
        canonBadge.appendChild(document.createTextNode('\u00a0Canônico'));
        typeRow.appendChild(canonBadge);
    }
    body.appendChild(typeRow);

    // Title
    const titleEl = document.createElement('h3');
    titleEl.className   = 'wiki-card-title';
    titleEl.textContent = doc.title || '(Sem título)';
    body.appendChild(titleEl);

    // Alt name — only if non-empty
    if (doc.altName?.trim()) {
        const altEl = document.createElement('p');
        altEl.className   = 'wiki-card-alt-name';
        altEl.textContent = doc.altName;
        body.appendChild(altEl);
    }

    // Threat + domain badges row — shown prominently
    const hasThreat = !!doc.threat;
    const hasDomain = !!doc.domain;
    if (hasThreat || hasDomain) {
        const badgeRow = document.createElement('div');
        badgeRow.className = 'wiki-card-badge-row';
        if (hasThreat) {
            const b = document.createElement('span');
            b.className = 'wiki-badge wiki-threat-badge';
            b.textContent = doc.threat;
            b.style.cssText = getThreatStyle(doc.threat, isDark);
            badgeRow.appendChild(b);
        }
        if (hasDomain) {
            const b = document.createElement('span');
            b.className = 'wiki-badge wiki-domain-badge';
            b.textContent = doc.domain;
            b.style.cssText = getDomainStyle(doc.domain, isDark);
            badgeRow.appendChild(b);
        }
        body.appendChild(badgeRow);
    }

    // Summary
    const summaryText = (doc.summary || '').trim();
    if (summaryText) {
        const summaryEl = document.createElement('p');
        summaryEl.className   = 'wiki-card-summary';
        summaryEl.textContent = summaryText;
        body.appendChild(summaryEl);
    }

    // Free tags (types, regions, alignment) — max 4 total
    const freeTags = [
        ...(doc.types || []),
        ...(doc.type === 'item' ? [] : (doc.regions || [])),
        ...(doc.alignment ? [doc.alignment] : []),
    ];
    if (freeTags.length > 0) {
        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'wiki-card-tags';
        freeTags.slice(0, 4).forEach((tag, i) => {
            const isAlignment = doc.alignment && i === freeTags.indexOf(doc.alignment);
            const span = document.createElement('span');
            if (doc.alignment && tag === doc.alignment) {
                span.className = 'wiki-badge wiki-alignment-badge';
                span.style.cssText = getAlignmentStyle(tag, isDark);
            } else {
                span.className = 'wiki-tag';
            }
            span.textContent = tag;
            tagsDiv.appendChild(span);
        });
        body.appendChild(tagsDiv);
    }

    card.appendChild(body);
    return card;
}

function _makePlaceholder(type) {
    const svgPath = TYPE_SVG[type];
    const ph = document.createElement('div');
    ph.className = 'wiki-card-img-placeholder';
    if (svgPath) {
        ph.style.cssText = `mask:url('${svgPath}') center/55% no-repeat;-webkit-mask:url('${svgPath}') center/55% no-repeat;background:var(--leath4);opacity:0.3;width:100%;height:100%`;
    } else {
        const icon = document.createElement('span');
        icon.className = 'material-symbols-outlined';
        icon.style.fontVariationSettings = "'FILL' 1";
        icon.textContent = TYPE_ICONS[type] || 'article';
        ph.appendChild(icon);
    }
    return ph;
}

// ─── User area ────────────────────────────────────────────────────────────────
function renderUserArea(user, isAdmin) {
    const area = document.getElementById('wiki-user-area');
    if (!area) return;

    if (!user) {
        area.innerHTML = '<a href="/index.html" class="wiki-login-link">Entrar</a>';
        return;
    }

    area.innerHTML = '';

    const chip = document.createElement('span');
    chip.className = 'wiki-user-chip';
    if (isAdmin) {
        const star = document.createElement('span');
        star.textContent = '★';
        star.title = 'Administrador';
        chip.appendChild(star);
        chip.appendChild(document.createTextNode(' '));
    }
    const nameSpan = document.createElement('span');
    nameSpan.textContent = user.displayName || user.email?.split('@')[0] || 'Usuário';
    chip.appendChild(nameSpan);
    area.appendChild(chip);

    const logoutBtn = document.createElement('button');
    logoutBtn.className   = 'wiki-btn wiki-btn-secondary';
    logoutBtn.textContent = 'Sair';
    logoutBtn.style.cssText = 'font-size:10px;padding:4px 10px';
    logoutBtn.addEventListener('click', () => {
        signOut(getAuth()).then(() => window.location.reload());
    });
    area.appendChild(logoutBtn);
}
