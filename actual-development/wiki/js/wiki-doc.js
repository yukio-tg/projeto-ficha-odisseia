// wiki-doc.js — Document viewer for the Odisseia Wiki

import { initWikiFirebase, getWikiDoc, getRelatedDocs, deleteWikiDoc } from './wiki-firebase.js';
import { getAuthState }                                                  from './wiki-auth.js';
import { escapeHtml, getParam, formatDate, showToast }                  from './wiki-utils.js';
import { initWikiSidebar }                                               from './wiki-sidebar.js';
import {
    applyAndCacheDocTheme, applyPreloadedTheme, WIKI_DEFAULTS,
} from './wiki-theme.js';
import {
    TYPE_LABELS, TYPE_ICONS, TYPE_SVG,
    getThreatStyle, getDomainStyle, getAlignmentStyle,
} from './wiki-consts.js';
import {
    extractAllWikiLinks, resolveWikiLinks, renderBodyWithLinks,
} from './wiki-wikilinks.js';
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function canEdit(user, isAdmin, doc) {
    return isAdmin || (!!user && user.uid === doc.authorId);
}

function isDarkPaper() {
    return document.body.classList.contains('theme-dark-paper');
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

let _lightbox = null;

function ensureLightbox() {
    if (_lightbox) return _lightbox;
    const lb = document.createElement('div');
    lb.id = 'wiki-lightbox';
    lb.className = 'wiki-lightbox';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'wiki-lightbox-close';
    closeBtn.setAttribute('aria-label', 'Fechar');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', closeLightbox);

    const img = document.createElement('img');
    img.className = 'wiki-lightbox-img';
    img.alt = '';

    const caption = document.createElement('div');
    caption.className = 'wiki-lightbox-caption';

    lb.appendChild(closeBtn);
    lb.appendChild(img);
    lb.appendChild(caption);

    lb.addEventListener('click', (e) => {
        if (e.target === lb) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lb.classList.contains('open')) closeLightbox();
    });

    document.body.appendChild(lb);
    _lightbox = lb;
    return lb;
}

function openLightbox(url, captionText) {
    const lb = ensureLightbox();
    lb.querySelector('.wiki-lightbox-img').src = url;
    lb.querySelector('.wiki-lightbox-caption').textContent = captionText || '';
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    if (!_lightbox) return;
    _lightbox.classList.remove('open');
    document.body.style.overflow = '';
}

// ── Carousel ──────────────────────────────────────────────────────────────────

function buildCarousel(images) {
    if (!images?.length) return null;

    const container = document.createElement('div');
    container.className = 'wiki-carousel';

    const track = document.createElement('div');
    track.className = 'wiki-carousel-track';

    images.forEach((img, i) => {
        const slide = document.createElement('div');
        slide.className = 'wiki-carousel-slide';

        const imgEl = document.createElement('img');
        imgEl.src     = img.url;
        imgEl.alt     = img.caption || '';
        imgEl.loading = i === 0 ? 'eager' : 'lazy';
        imgEl.addEventListener('click', () => openLightbox(img.url, img.caption || ''));

        slide.appendChild(imgEl);
        track.appendChild(slide);
    });

    container.appendChild(track);

    let current = 0;

    function goTo(idx) {
        current = (idx + images.length) % images.length;
        track.style.transform = `translateX(-${current * 100}%)`;
        dots.querySelectorAll('.wiki-carousel-dot').forEach((d, i) => {
            d.classList.toggle('active', i === current);
        });
    }

    if (images.length > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'wiki-carousel-btn wiki-carousel-btn-prev';
        prevBtn.setAttribute('aria-label', 'Anterior');
        prevBtn.innerHTML = '&#8249;';
        prevBtn.addEventListener('click', () => goTo(current - 1));

        const nextBtn = document.createElement('button');
        nextBtn.className = 'wiki-carousel-btn wiki-carousel-btn-next';
        nextBtn.setAttribute('aria-label', 'Próximo');
        nextBtn.innerHTML = '&#8250;';
        nextBtn.addEventListener('click', () => goTo(current + 1));

        container.appendChild(prevBtn);
        container.appendChild(nextBtn);
    }

    const dots = document.createElement('div');
    dots.className = 'wiki-carousel-dots';
    if (images.length > 1) {
        images.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.className = 'wiki-carousel-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('aria-label', `Imagem ${i + 1}`);
            dot.addEventListener('click', () => goTo(i));
            dots.appendChild(dot);
        });
        container.appendChild(dots);
    }

    return container;
}

// ── Delete handler ─────────────────────────────────────────────────────────────

async function handleDelete(doc) {
    if (!confirm(`Excluir "${doc.title}"? Esta ação não pode ser desfeita.`)) return;
    try {
        await deleteWikiDoc(doc.id);
        showToast('Documento excluído.');
        window.location.href = '/wiki';
    } catch (e) {
        console.error('[wiki-doc] deleteWikiDoc error:', e);
        showToast('Erro ao excluir o documento.', true);
    }
}

// ── Topbar actions ─────────────────────────────────────────────────────────────

function renderTopbarActions(user, isAdmin, doc) {
    const container = document.getElementById('wiki-topbar-actions');
    if (!container) return;

    if (canEdit(user, isAdmin, doc)) {
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

        container.appendChild(editLink);
        container.appendChild(delBtn);
    }
}

// ── Related doc card ───────────────────────────────────────────────────────────

function buildRelatedCard(relDoc) {
    const card = document.createElement('a');
    card.className = 'wiki-related-card';
    card.href = `/wiki/doc?id=${encodeURIComponent(relDoc.id)}`;

    const firstImg = relDoc.images?.[0]?.url;
    if (firstImg) {
        const img = document.createElement('img');
        img.className = 'wiki-related-card-img';
        img.src = firstImg;
        img.alt = '';
        img.loading = 'lazy';
        card.appendChild(img);
    } else {
        const ph = document.createElement('div');
        ph.className = 'wiki-related-card-img';
        const icon = document.createElement('span');
        icon.className = 'material-symbols-outlined';
        icon.style.cssText = 'font-size:22px;color:var(--leath4);opacity:0.5;display:flex;align-items:center;justify-content:center;height:100%';
        icon.textContent = TYPE_ICONS[relDoc.type] || 'article';
        ph.appendChild(icon);
        card.appendChild(ph);
    }

    const body = document.createElement('div');
    body.className = 'wiki-related-card-body';

    const typeEl = document.createElement('div');
    typeEl.className = 'wiki-related-card-type';
    typeEl.textContent = TYPE_LABELS[relDoc.type] ?? relDoc.type ?? '';
    body.appendChild(typeEl);

    const titleEl = document.createElement('div');
    titleEl.className = 'wiki-related-card-title';
    titleEl.textContent = relDoc.title ?? '';
    body.appendChild(titleEl);

    card.appendChild(body);
    return card;
}

// ── Attribute bars renderer ────────────────────────────────────────────────────

const ATTR_DEFS = [
    { key: 'corpo',        label: 'Corpo',        svg: '/image/corpo.svg',        hint: 'Resistência física e força' },
    { key: 'velocidade',   label: 'Velocidade',   svg: '/image/velocidade.svg',   hint: 'Agilidade e precisão' },
    { key: 'essencia',     label: 'Essência',     svg: '/image/essencia.svg',     hint: 'Influência e poder mágico' },
    { key: 'inteligencia', label: 'Inteligência', svg: '/image/inteligencia.svg', hint: 'Capacidade de aprender e tática' },
];

function buildAttrBars(attrs) {
    const container = document.createElement('div');
    container.className = 'wiki-attr-bars';

    // Legend (tooltip on hover)
    const legend = document.createElement('div');
    legend.className = 'wiki-attr-bars-legend';
    legend.textContent = '✦ Perfil de atributos';
    container.appendChild(legend);

    const grid = document.createElement('div');
    grid.className = 'wiki-attr-bars-grid';

    ATTR_DEFS.forEach(({ key, label, svg, hint }) => {
        const val = Math.min(10, Math.max(0, Number(attrs?.[key] ?? 5)));

        const row = document.createElement('div');
        row.className = 'wiki-attr-bar-row';
        row.title = `${label}: ${val}/10 — ${hint}`;

        const icon = document.createElement('div');
        icon.className = 'wiki-attr-bar-icon';
        icon.style.cssText = `mask:url('${svg}') center/contain no-repeat;-webkit-mask:url('${svg}') center/contain no-repeat`;
        row.appendChild(icon);

        const labelEl = document.createElement('span');
        labelEl.className = 'wiki-attr-bar-label';
        labelEl.textContent = label;
        row.appendChild(labelEl);

        // Chip-based bar (10 chips, filled based on value)
        const chipsEl = document.createElement('div');
        chipsEl.className = 'wiki-attr-bar-chips';
        for (let i = 1; i <= 10; i++) {
            const chip = document.createElement('span');
            chip.className = 'wiki-attr-chip';
            if (i <= val) {
                chip.classList.add('filled');
                if (i >= 9) chip.classList.add('chip-max');
                else if (i >= 7) chip.classList.add('chip-high');
            }
            chipsEl.appendChild(chip);
        }
        row.appendChild(chipsEl);

        const numEl = document.createElement('span');
        numEl.className = 'wiki-attr-bar-num';
        numEl.textContent = val;
        row.appendChild(numEl);

        grid.appendChild(row);
    });

    container.appendChild(grid);
    return container;
}

// ── Main document renderer ─────────────────────────────────────────────────────

async function renderDoc(doc, user, isAdmin) {
    const wrap = document.getElementById('wiki-doc-wrap');
    wrap.innerHTML = '';

    const dark = isDarkPaper();

    // ── 1. Document header ────────────────────────────────────────────────────
    const header = document.createElement('div');
    header.className = 'wiki-doc-header';

    // Meta row: type badge + canonical
    const metaRow = document.createElement('div');
    metaRow.className = 'wiki-doc-meta-row';

    const typeBadge = document.createElement('span');
    typeBadge.className = 'wiki-doc-type-badge';
    const svgPathBadge = TYPE_SVG[doc.type];
    if (svgPathBadge) {
        const svgIcon = document.createElement('span');
        svgIcon.className = 'wiki-type-svg-icon';
        svgIcon.style.cssText = `display:inline-block;width:11px;height:11px;vertical-align:middle;margin-right:4px;mask:url('${svgPathBadge}') center/contain no-repeat;-webkit-mask:url('${svgPathBadge}') center/contain no-repeat;background:currentColor`;
        typeBadge.appendChild(svgIcon);
    }
    typeBadge.appendChild(document.createTextNode(TYPE_LABELS[doc.type] ?? doc.type ?? ''));
    metaRow.appendChild(typeBadge);

    if (doc.status === 'canonical') {
        const canonEl = document.createElement('span');
        canonEl.className = 'wiki-doc-canonical';
        const crownIcon = document.createElement('span');
        crownIcon.className = 'material-symbols-outlined';
        crownIcon.style.fontVariationSettings = "'FILL' 1";
        crownIcon.textContent = 'crown';
        canonEl.appendChild(crownIcon);
        canonEl.append('\u00a0Canônico');
        metaRow.appendChild(canonEl);
    }
    header.appendChild(metaRow);

    // Title
    const titleEl = document.createElement('h1');
    titleEl.className = 'wiki-doc-title';
    titleEl.textContent = doc.title ?? '';
    header.appendChild(titleEl);

    // Alt name
    if (doc.altName?.trim()) {
        const altEl = document.createElement('p');
        altEl.className = 'wiki-doc-alt-name';
        altEl.textContent = doc.altName;
        header.appendChild(altEl);
    }

    // Prominent badges row (threat + domain) — hidden for place/concept where not applicable
    const hasThreat = !!doc.threat && doc.type !== 'place' && doc.type !== 'concept';
    const hasDomain = !!doc.domain && doc.type !== 'concept';
    if (hasThreat || hasDomain) {
        const badgeRow = document.createElement('div');
        badgeRow.className = 'wiki-badge-row';
        if (hasThreat) {
            const b = document.createElement('span');
            b.className = 'wiki-badge wiki-threat-badge';
            b.textContent = doc.threat;
            b.style.cssText = getThreatStyle(doc.threat, dark);
            badgeRow.appendChild(b);
        }
        if (hasDomain) {
            const b = document.createElement('span');
            b.className = 'wiki-badge wiki-domain-badge';
            b.textContent = doc.domain;
            b.style.cssText = getDomainStyle(doc.domain, dark);
            badgeRow.appendChild(b);
        }
        header.appendChild(badgeRow);
    }

    // Author / date
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

    // ── 2. Hero layout — image RIGHT, summary LEFT ────────────────────────────
    const hasImage = doc.images?.length >= 1;
    const hasSummary = !!doc.summary?.trim();
    const hasAttrs = (doc.type === 'creature' || doc.type === 'person') && doc.attributes;

    if (hasImage || hasSummary || hasAttrs) {
        const hero = document.createElement('div');
        hero.className = 'wiki-doc-hero';

        // Left column: summary + attribute bars
        const leftCol = document.createElement('div');
        leftCol.className = 'wiki-doc-hero-left';

        if (hasSummary) {
            const summaryBox = document.createElement('div');
            summaryBox.className = 'wiki-doc-summary-box';
            const summaryP = document.createElement('p');
            summaryP.textContent = doc.summary;
            summaryBox.appendChild(summaryP);
            leftCol.appendChild(summaryBox);
        }

        if (hasAttrs) {
            leftCol.appendChild(buildAttrBars(doc.attributes));
        }

        hero.appendChild(leftCol);

        // Right column: image (first only)
        if (hasImage) {
            const rightCol = document.createElement('div');
            rightCol.className = 'wiki-doc-hero-right';

            const imgWrap = document.createElement('div');
            imgWrap.className = 'wiki-doc-hero-img-wrap';
            const img = document.createElement('img');
            img.src     = doc.images[0].url;
            img.alt     = doc.images[0].caption || doc.title || '';
            img.loading = 'eager';
            img.className = 'wiki-doc-hero-img';
            img.addEventListener('click', () => openLightbox(doc.images[0].url, doc.images[0].caption || ''));
            if (doc.images[0].caption) {
                img.title = doc.images[0].caption;
            }
            imgWrap.appendChild(img);
            rightCol.appendChild(imgWrap);
            hero.appendChild(rightCol);
        }

        wrap.appendChild(hero);
    } else if (hasSummary) {
        const summaryBox = document.createElement('div');
        summaryBox.className = 'wiki-doc-summary-box';
        const summaryP = document.createElement('p');
        summaryP.textContent = doc.summary;
        summaryBox.appendChild(summaryP);
        wrap.appendChild(summaryBox);
    }

    // ── 3. Tags row (types, regions, alignment) ───────────────────────────────
    const freeTags = [
        ...(doc.types || []).map(t => ({ text: t, cls: 'wiki-tag' })),
        ...(doc.regions || []).map(t => ({ text: t, cls: 'wiki-tag' })),
        ...(doc.alignment && doc.type !== 'place' && doc.type !== 'concept'
            ? [{ text: doc.alignment, cls: 'wiki-alignment-badge wiki-badge', style: getAlignmentStyle(doc.alignment, dark) }]
            : []),
    ];
    if (freeTags.length > 0) {
        const tagsRow = document.createElement('div');
        tagsRow.className = 'wiki-doc-tags';
        freeTags.forEach(({ text, cls, style }) => {
            const span = document.createElement('span');
            span.className = cls;
            span.textContent = text;
            if (style) span.style.cssText = style;
            tagsRow.appendChild(span);
        });
        wrap.appendChild(tagsRow);
    }

    // ── 4. Content sections with wiki-links ───────────────────────────────────
    const nonEmptySections = (doc.content || []).filter(s => s.body?.trim());

    if (nonEmptySections.length > 0) {
        // Resolve wiki-links for all sections at once
        const allNames = extractAllWikiLinks(doc.content || []);
        const linksMap = await resolveWikiLinks(allNames);

        const sectionDivider = document.createElement('div');
        sectionDivider.className = 'wiki-sh';
        sectionDivider.textContent = 'Conteúdo';
        wrap.appendChild(sectionDivider);

        for (const section of nonEmptySections) {
            const sectionEl = document.createElement('div');
            sectionEl.className = 'wiki-section';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'wiki-section-btn';

            const headingText = document.createElement('span');
            headingText.textContent = section.heading ?? '';
            btn.appendChild(headingText);

            const arrow = document.createElement('span');
            arrow.className = 'material-symbols-outlined wiki-section-arrow';
            arrow.textContent = 'expand_more';

            if (section.collapsible === false) {
                arrow.style.visibility = 'hidden';
            } else {
                btn.addEventListener('click', () => sectionEl.classList.toggle('collapsed'));
            }
            btn.appendChild(arrow);
            sectionEl.appendChild(btn);

            const bodyEl = document.createElement('div');
            bodyEl.className = 'wiki-section-body';
            bodyEl.innerHTML = renderBodyWithLinks(section.body, linksMap);
            sectionEl.appendChild(bodyEl);

            wrap.appendChild(sectionEl);
        }

        // ── 5. References section (from wiki-links) ───────────────────────────
        if (linksMap.size > 0) {
            const refsSection = document.createElement('div');
            refsSection.className = 'wiki-references';

            const refHeading = document.createElement('div');
            refHeading.className = 'wiki-sh';
            refHeading.textContent = 'Referências';
            refsSection.appendChild(refHeading);

            const refGrid = document.createElement('div');
            refGrid.className = 'wiki-references-grid';
            for (const relDoc of linksMap.values()) {
                refGrid.appendChild(buildRelatedCard(relDoc));
            }
            refsSection.appendChild(refGrid);
            wrap.appendChild(refsSection);
        }
    }

    // ── 6. Gallery (images[1+]) ───────────────────────────────────────────────
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
            item.addEventListener('click', () => openLightbox(imgData.url, imgData.caption || ''));

            const img = document.createElement('img');
            img.src     = imgData.url;
            img.alt     = imgData.caption ?? '';
            img.loading = 'lazy';
            item.appendChild(img);

            if (imgData.caption) {
                const cap = document.createElement('div');
                cap.className = 'wiki-gallery-caption';
                cap.textContent = imgData.caption;
                item.appendChild(cap);
            }
            grid.appendChild(item);
        }
        gallery.appendChild(grid);
        wrap.appendChild(gallery);
    }

    // ── 7. .md "Revelar Ficha" button ─────────────────────────────────────────
    if (doc.mdContent && (doc.type === 'creature' || doc.type === 'person')) {
        const revealBar = document.createElement('div');
        revealBar.className = 'wiki-md-reveal-bar';
        const ornament = document.createElement('div');
        ornament.className = 'wiki-orn';
        ornament.textContent = '· ✦ ·';
        revealBar.appendChild(ornament);

        const revealBtn = document.createElement('button');
        revealBtn.type = 'button';
        revealBtn.className = 'wiki-md-reveal-btn';
        revealBtn.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px;font-variation-settings:'FILL' 1">description</span> Revelar Ficha`;
        revealBar.appendChild(revealBtn);
        wrap.appendChild(revealBar);

        const openModal = initMdModal(doc);
        if (openModal) revealBtn.addEventListener('click', openModal);
    }

    // ── 8. Actions bar (edit / delete) ────────────────────────────────────────
    if (canEdit(user, isAdmin, doc)) {
        const actionsBar = document.createElement('div');
        actionsBar.className = 'wiki-doc-actions-bar';
        wrap.appendChild(actionsBar);
    }
}

// ── Identity header (new design) ──────────────────────────────────────────────

function renderIdentityHeader(doc) {
    const header     = document.getElementById('wiki-doc-header-bar');
    const crestInner = document.getElementById('wiki-doc-crest-inner');
    const typeEl     = document.getElementById('wiki-doc-header-type');
    const titleEl    = document.getElementById('wiki-doc-header-title');
    const subEl      = document.getElementById('wiki-doc-header-sub');
    if (!header) return;

    // Crest: use SVG icon mask
    const svgPath = TYPE_SVG[doc.type];
    if (crestInner) {
        if (svgPath) {
            crestInner.innerHTML = `<span class="wiki-doc-crest-svg" style="mask:url('${svgPath}') center/70% no-repeat;-webkit-mask:url('${svgPath}') center/70% no-repeat"></span>`;
        } else {
            crestInner.innerHTML = `<span class="material-symbols-outlined" style="font-size:26px">auto_stories</span>`;
        }
    }

    // Type label
    const typeLabel = TYPE_LABELS[doc.type] ?? doc.type ?? '';
    if (typeEl) typeEl.textContent = typeLabel;

    // Title
    if (titleEl) titleEl.textContent = doc.title ?? '';

    // Subtitle
    if (subEl) {
        const parts = [];
        if (doc.altName?.trim()) parts.push(doc.altName);
        if (doc.status === 'canonical') parts.push('✦ Canônico');
        subEl.textContent = parts.join('  ·  ');
        subEl.style.display = parts.length ? '' : 'none';
    }

    header.style.display = 'block';
}

// ── Entry point ────────────────────────────────────────────────────────────────

// ── .md modal logic ───────────────────────────────────────────────────────────

function initMdModal(doc) {
    const modalEl   = document.getElementById('wiki-md-modal');
    const contentEl = document.getElementById('wiki-md-modal-content');
    const titleEl   = document.getElementById('wiki-md-modal-title');
    const closeBtn  = document.getElementById('wiki-md-close-btn');
    const dlBtn     = document.getElementById('wiki-md-download-btn');
    if (!modalEl || !doc.mdContent) return;

    // Close handlers
    const close = () => {
        modalEl.style.display = 'none';
        document.body.style.overflow = '';
    };
    closeBtn?.addEventListener('click', close);
    modalEl.addEventListener('click', e => { if (e.target === modalEl) close(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modalEl.style.display !== 'none') close();
    });

    // Download handler
    dlBtn?.addEventListener('click', () => {
        const blob = new Blob([doc.mdContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (doc.title || 'ficha').replace(/[^a-z0-9\-_]/gi, '_') + '.md';
        a.click();
        URL.revokeObjectURL(url);
    });

    // Return opener function
    return () => {
        if (titleEl) titleEl.textContent = 'Ficha — ' + (doc.title || '');
        // Render markdown as plain text (escaped) with basic formatting
        if (contentEl) contentEl.innerHTML = renderSimpleMd(doc.mdContent);
        modalEl.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    };
}

/** Minimal Markdown renderer (no external lib needed) */
function renderSimpleMd(md) {
    if (!md) return '';
    const escaped = md
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    return escaped
        // Headers
        .replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>')
        .replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>')
        .replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>')
        .replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>')
        .replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>')
        .replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>')
        // Bold + Italic
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Horizontal rule
        .replace(/^---+$/gm, '<hr>')
        // Blockquote
        .replace(/^&gt;\s(.+)$/gm, '<blockquote>$1</blockquote>')
        // Unordered list items
        .replace(/^[*\-]\s+(.+)$/gm, '<li>$1</li>')
        // Ordered list items
        .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
        // Paragraphs (double newline)
        .replace(/\n\n+/g, '</p><p>')
        // Single newlines
        .replace(/\n/g, '<br>');
}

// ── Entry point ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    // Permanent dark mode for the wiki
    document.body.classList.add('theme-dark-paper');
    initWikiFirebase();

    const id = getParam('id');
    if (!id) { window.location.href = '/wiki'; return; }

    // Apply cached theme immediately (prevents flash)
    applyPreloadedTheme(id);

    // Init sidebar (background load)
    initWikiSidebar(id);

    const [{ user, isAdmin }, wikiDoc] = await Promise.all([
        getAuthState(),
        getWikiDoc(id),
    ]);

    const wrap = document.getElementById('wiki-doc-wrap');

    if (!wikiDoc) {
        wrap.innerHTML = '<div class="wiki-empty">Documento não encontrado.</div>';
        return;
    }

    // Apply and cache the document's theme
    applyAndCacheDocTheme(id, wikiDoc.theme ?? null);

    document.title = wikiDoc.title + ' — Enciclopédia Ascalon';

    // Populate the identity header (new design)
    renderIdentityHeader(wikiDoc);

    renderTopbarActions(user, isAdmin, wikiDoc);
    await renderDoc(wikiDoc, user, isAdmin);
});
