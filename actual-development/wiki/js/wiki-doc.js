// wiki-doc.js — Document viewer for the Odisseia Wiki
import { initWikiFirebase, getWikiDoc, getRelatedDocs, deleteWikiDoc } from './wiki-firebase.js';
import { getAuthState } from './wiki-auth.js';
import { escapeHtml, getParam, formatDate, TYPE_LABELS, showToast } from './wiki-utils.js';
import { applyDocTheme, WIKI_DEFAULTS } from './wiki-theme.js';
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns true if the user may edit/delete this document.
 * Admins can always edit; authors can edit their own docs.
 */
function canEdit(user, isAdmin, doc) {
    return isAdmin || (!!user && user.uid === doc.authorId);
}

/**
 * Converts raw body text into safe HTML paragraphs.
 * Double newlines become paragraph breaks; single newlines become <br>.
 * escapeHtml runs before any HTML is inserted.
 */
function renderBody(text) {
    if (!text?.trim()) return '';
    return text.trim()
        .split(/\n\n+/)
        .map(p => `<p>${escapeHtml(p.trim()).replace(/\n/g, '<br>')}</p>`)
        .join('');
}

// ── Delete handler (shared by topbar and bottom actions bar) ───────────────

async function handleDelete(doc) {
    if (!confirm(`Excluir "${doc.title}"? Esta ação não pode ser desfeita.`)) return;
    try {
        await deleteWikiDoc(doc.id);
        showToast('Documento excluído.');
        window.location.href = '/wiki';
    } catch (e) {
        console.error('[Wiki] deleteWikiDoc error:', e);
        showToast('Erro ao excluir o documento.', true);
    }
}

// ── Topbar actions ─────────────────────────────────────────────────────────

/**
 * Renders edit/delete buttons into #wiki-topbar-actions when the user
 * has permission to edit the document.
 */
function renderTopbarActions(user, isAdmin, doc) {
    const container = document.getElementById('wiki-topbar-actions');
    if (!container || !canEdit(user, isAdmin, doc)) return;

    // Edit link
    const editLink = document.createElement('a');
    editLink.href = `/wiki/editar?id=${encodeURIComponent(doc.id)}`;
    editLink.className = 'wiki-btn wiki-btn-primary';

    const editIcon = document.createElement('span');
    editIcon.className = 'material-symbols-outlined';
    editIcon.textContent = 'edit';
    editLink.appendChild(editIcon);
    editLink.append('Editar');

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'wiki-btn wiki-btn-danger';

    const delIcon = document.createElement('span');
    delIcon.className = 'material-symbols-outlined';
    delIcon.textContent = 'delete';
    delBtn.appendChild(delIcon);
    delBtn.append('Excluir');
    delBtn.addEventListener('click', () => handleDelete(doc));

    container.appendChild(editLink);
    container.appendChild(delBtn);
}

// ── Related doc card ───────────────────────────────────────────────────────

/** Builds a single .wiki-related-card anchor element from a related doc object. */
function buildRelatedCard(relatedDoc) {
    const card = document.createElement('a');
    card.className = 'wiki-related-card';
    card.href = `/wiki/doc?id=${encodeURIComponent(relatedDoc.id)}`;

    // Thumbnail or placeholder
    const firstImg = relatedDoc.images?.[0]?.url;
    if (firstImg) {
        const img = document.createElement('img');
        img.className = 'wiki-related-card-img';
        img.src = firstImg;
        img.alt = '';
        img.loading = 'lazy';
        card.appendChild(img);
    } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'wiki-related-card-img-placeholder';
        const icon = document.createElement('span');
        icon.className = 'material-symbols-outlined';
        icon.textContent = 'image';
        placeholder.appendChild(icon);
        card.appendChild(placeholder);
    }

    // Card body: type label + title
    const body = document.createElement('div');
    body.className = 'wiki-related-card-body';

    const typeEl = document.createElement('div');
    typeEl.className = 'wiki-related-card-type';
    typeEl.textContent = TYPE_LABELS[relatedDoc.type] ?? relatedDoc.type ?? '';
    body.appendChild(typeEl);

    const titleEl = document.createElement('div');
    titleEl.className = 'wiki-related-card-title';
    titleEl.textContent = relatedDoc.title ?? '';
    body.appendChild(titleEl);

    card.appendChild(body);
    return card;
}

// ── Main document renderer ─────────────────────────────────────────────────

/**
 * Builds and inserts the full document HTML into #wiki-doc-wrap.
 * All user-provided text is set via textContent or through escapeHtml
 * before innerHTML insertion — never raw user content as HTML.
 */
async function renderDoc(doc, user, isAdmin) {
    const wrap = document.getElementById('wiki-doc-wrap');
    wrap.innerHTML = '';

    // ── 1. Document header ─────────────────────────────────────────────────

    const header = document.createElement('div');
    header.className = 'wiki-doc-header';

    // Meta row: type badge + optional canonical indicator
    const metaRow = document.createElement('div');
    metaRow.className = 'wiki-doc-meta-row';

    const typeBadge = document.createElement('span');
    typeBadge.className = 'wiki-doc-type-badge';
    typeBadge.textContent = TYPE_LABELS[doc.type] ?? doc.type ?? '';
    metaRow.appendChild(typeBadge);

    if (doc.status === 'canonical') {
        const canonical = document.createElement('span');
        canonical.className = 'wiki-doc-canonical';

        const crownIcon = document.createElement('span');
        crownIcon.className = 'material-symbols-outlined';
        crownIcon.style.fontVariationSettings = "'FILL' 1";
        crownIcon.textContent = 'crown';
        canonical.appendChild(crownIcon);
        canonical.append('Canônico');

        metaRow.appendChild(canonical);
    }

    header.appendChild(metaRow);

    // Title
    const titleEl = document.createElement('h1');
    titleEl.className = 'wiki-doc-title';
    titleEl.textContent = doc.title ?? '';
    header.appendChild(titleEl);

    // Author / date line
    const authorEl = document.createElement('div');
    authorEl.className = 'wiki-doc-author';

    const authorName = document.createElement('span');
    authorName.textContent = doc.authorEmail ?? '';
    authorEl.appendChild(authorName);

    if (doc.createdAt) {
        const sep = document.createElement('span');
        sep.className = 'wiki-doc-author-sep';
        sep.textContent = '·';
        authorEl.appendChild(sep);

        const dateEl = document.createElement('span');
        dateEl.textContent = formatDate(doc.createdAt);
        authorEl.appendChild(dateEl);
    }

    header.appendChild(authorEl);
    wrap.appendChild(header);

    // ── 2. Cover image ─────────────────────────────────────────────────────

    if (doc.images?.[0]?.url) {
        const cover = document.createElement('div');
        cover.className = 'wiki-doc-cover';

        const img = document.createElement('img');
        img.src = doc.images[0].url;
        img.alt = doc.images[0].caption ?? doc.title ?? '';
        img.loading = 'lazy';
        cover.appendChild(img);

        wrap.appendChild(cover);
    }

    // ── 3. Tags ────────────────────────────────────────────────────────────

    if (doc.tags?.length > 0) {
        const tagsRow = document.createElement('div');
        tagsRow.className = 'wiki-doc-tags';

        for (const tag of doc.tags) {
            const tagEl = document.createElement('span');
            tagEl.className = 'wiki-tag';
            tagEl.textContent = '#' + tag;
            tagsRow.appendChild(tagEl);
        }

        wrap.appendChild(tagsRow);
    }

    // ── 4. Content sections ────────────────────────────────────────────────

    if (doc.content?.length > 0) {
        for (const section of doc.content) {
            // Skip sections with no meaningful body text
            if (!section.body?.trim()) continue;

            const sectionEl = document.createElement('div');
            sectionEl.className = 'wiki-section';

            // Section button (heading row)
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'wiki-section-btn';

            const headingText = document.createElement('span');
            headingText.textContent = section.heading ?? '';
            btn.appendChild(headingText);

            // Collapse arrow — hidden but present when section is not collapsible,
            // so layout remains consistent across all section headings.
            const arrow = document.createElement('span');
            arrow.className = 'material-symbols-outlined wiki-section-arrow';
            arrow.textContent = 'expand_more';

            if (section.collapsible === false) {
                // Non-collapsible: keep button for the heading, hide arrow
                arrow.style.visibility = 'hidden';
                arrow.setAttribute('aria-hidden', 'true');
            } else {
                // Collapsible (true or unset): toggle collapsed class on click
                btn.addEventListener('click', () => {
                    sectionEl.classList.toggle('collapsed');
                });
            }

            btn.appendChild(arrow);
            sectionEl.appendChild(btn);

            // Section body with safe HTML paragraphs
            const bodyEl = document.createElement('div');
            bodyEl.className = 'wiki-section-body';
            bodyEl.innerHTML = renderBody(section.body);
            sectionEl.appendChild(bodyEl);

            wrap.appendChild(sectionEl);
        }
    }

    // ── 5. Gallery ─────────────────────────────────────────────────────────
    // First image is the cover — gallery starts from index 1.

    if (doc.images?.length > 1) {
        const gallery = document.createElement('div');
        gallery.className = 'wiki-gallery';

        const galleryHeading = document.createElement('div');
        galleryHeading.className = 'wiki-sh';
        galleryHeading.textContent = 'Galeria';
        gallery.appendChild(galleryHeading);

        const grid = document.createElement('div');
        grid.className = 'wiki-gallery-grid';

        for (let i = 1; i < doc.images.length; i++) {
            const imgData = doc.images[i];
            if (!imgData?.url) continue;

            const item = document.createElement('div');
            item.className = 'wiki-gallery-item';

            const img = document.createElement('img');
            img.src = imgData.url;
            img.alt = imgData.caption ?? '';
            img.loading = 'lazy';
            item.appendChild(img);

            if (imgData.caption) {
                const caption = document.createElement('div');
                caption.className = 'wiki-gallery-caption';
                caption.textContent = imgData.caption;
                item.appendChild(caption);
            }

            grid.appendChild(item);
        }

        gallery.appendChild(grid);
        wrap.appendChild(gallery);
    }

    // ── 6. Related documents ───────────────────────────────────────────────

    if (doc.relatedDocs?.length > 0) {
        const relatedDocs = await getRelatedDocs(doc.relatedDocs);

        if (relatedDocs.length > 0) {
            const relatedHeading = document.createElement('div');
            relatedHeading.className = 'wiki-sh';
            relatedHeading.textContent = 'Documentos Relacionados';
            wrap.appendChild(relatedHeading);

            const relatedGrid = document.createElement('div');
            relatedGrid.className = 'wiki-related-grid';

            for (const relDoc of relatedDocs) {
                relatedGrid.appendChild(buildRelatedCard(relDoc));
            }

            wrap.appendChild(relatedGrid);
        }
    }

    // ── 7. Bottom actions bar (edit / delete) ──────────────────────────────
    // Duplicates topbar actions for convenience on long documents.

    if (canEdit(user, isAdmin, doc)) {
        const actionsBar = document.createElement('div');
        actionsBar.className = 'wiki-doc-actions-bar';

        const editLink = document.createElement('a');
        editLink.href = `/wiki/editar?id=${encodeURIComponent(doc.id)}`;
        editLink.className = 'wiki-btn wiki-btn-primary';

        const editIcon = document.createElement('span');
        editIcon.className = 'material-symbols-outlined';
        editIcon.textContent = 'edit';
        editLink.appendChild(editIcon);
        editLink.append('Editar');

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'wiki-btn wiki-btn-danger';

        const delIcon = document.createElement('span');
        delIcon.className = 'material-symbols-outlined';
        delIcon.textContent = 'delete';
        delBtn.appendChild(delIcon);
        delBtn.append('Excluir');
        delBtn.addEventListener('click', () => handleDelete(doc));

        actionsBar.appendChild(editLink);
        actionsBar.appendChild(delBtn);
        wrap.appendChild(actionsBar);
    }
}

// ── Entry point ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    initWikiFirebase();

    // Require a document ID in the URL; redirect to wiki index otherwise
    const id = getParam('id');
    if (!id) {
        window.location.href = '/wiki';
        return;
    }

    // Resolve auth state and fetch the document in parallel
    const [{ user, isAdmin }, wikiDoc] = await Promise.all([
        getAuthState(),
        getWikiDoc(id),
    ]);

    // Document not found
    if (!wikiDoc) {
        const wrap = document.getElementById('wiki-doc-wrap');
        wrap.innerHTML = '<div class="wiki-empty">Documento não encontrado.</div>';
        return;
    }

    // Apply the document's colour theme to CSS custom properties
    applyDocTheme(
        wikiDoc.theme?.fundo      ?? WIKI_DEFAULTS.fundo,
        wikiDoc.theme?.metalico   ?? WIKI_DEFAULTS.metalico,
        wikiDoc.theme?.pergaminho ?? WIKI_DEFAULTS.pergaminho
    );

    // Update browser tab title
    document.title = wikiDoc.title + ' — Wiki Odisseia';

    // Render topbar actions then the document body
    renderTopbarActions(user, isAdmin, wikiDoc);
    await renderDoc(wikiDoc, user, isAdmin);
});
