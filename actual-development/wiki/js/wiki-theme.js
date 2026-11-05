// wiki-theme.js — Tema da wiki. Geradores e paleta base vêm de js/theme-palette.js.
// A wiki acrescenta três pergaminhos escuros e mantém o modo escuro sempre ligado.

import {
    PALETTE,
    WIKI_EXTRA_COLORS,
    buildThemeVars,
    swatchColor,
    THEME_CSS_PROPS,
} from '../../js/theme-palette.js';

export { swatchColor };

export const WIKI_PALETTE = [...WIKI_EXTRA_COLORS, ...PALETTE];

// Pergaminho escuro por padrão; fundo e metal seguem a ficha.
export const WIKI_DEFAULTS = { fundo: 'marrom', metalico: 'amarelo-escuro', pergaminho: 'marrom-escuro' };

function findColor(id) { return WIKI_PALETTE.find(c => c.id === id); }
function validId(id)   { return findColor(id) ? id : null; }

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Computes the CSS variable map for a theme WITHOUT applying it to the DOM.
 * Used to colour individual cards with their document's theme.
 *
 * @returns {{ [cssVar: string]: string, darkPaper: boolean }}
 */
export function computeThemeVars(fundoId, metalicoId, pergaminhoId) {
    const f = findColor(fundoId)      ?? findColor(WIKI_DEFAULTS.fundo);
    const m = findColor(metalicoId)   ?? findColor(WIKI_DEFAULTS.metalico);
    const p = findColor(pergaminhoId) ?? findColor(WIKI_DEFAULTS.pergaminho);
    return {
        ...buildThemeVars(f, m, p),
        darkPaper: p.darkPaper,
    };
}

/**
 * Applies all theme CSS variables to document.documentElement and toggles
 * the `theme-dark-paper` class on document.body.
 *
 * @param {string} fundo       - Palette ID for the leather/background group.
 * @param {string} metalico    - Palette ID for the metallic/gold group.
 * @param {string} pergaminho  - Palette ID for the paper/parchment group.
 */
export function applyDocTheme(fundo, metalico, pergaminho) {
    const f = findColor(fundo)      ?? findColor(WIKI_DEFAULTS.fundo);
    const m = findColor(metalico)   ?? findColor(WIKI_DEFAULTS.metalico);
    const p = findColor(pergaminho) ?? findColor(WIKI_DEFAULTS.pergaminho);

    const vars = buildThemeVars(f, m, p);

    const root = document.documentElement;
    for (const [prop, val] of Object.entries(vars)) root.style.setProperty(prop, val);
    // Wiki is always dark mode — always keep the class regardless of pergaminho
    document.body.classList.add('theme-dark-paper');
}

/**
 * Builds a theme picker UI (3 swatch rows: Fundo, Detalhes, Pergaminho)
 * inside `container`. Calls `onChange({ fundo, metalico, pergaminho })` on
 * every swatch click with the updated theme object.
 *
 * Markup structure written into the container:
 *   .wiki-theme-picker
 *     .wiki-theme-row  (× 3)
 *       label.wiki-theme-row-label
 *       .wiki-theme-swatches
 *         button.wiki-theme-swatch[.active]  (× 29)
 *
 * @param {HTMLElement} container     - Element to render into (cleared first).
 * @param {{ fundo, metalico, pergaminho }} currentTheme - Currently selected IDs.
 * @param {Function} onChange         - Called with the full updated theme object.
 */
export function buildThemePicker(container, currentTheme, onChange) {
    if (!container) return;

    // Resolve current values, fall back to defaults when invalid
    const current = {
        fundo:      validId(currentTheme?.fundo)      ?? WIKI_DEFAULTS.fundo,
        metalico:   validId(currentTheme?.metalico)   ?? WIKI_DEFAULTS.metalico,
        pergaminho: validId(currentTheme?.pergaminho) ?? WIKI_DEFAULTS.pergaminho,
    };

    const rows = [
        { key: 'fundo',      label: 'Fundo'      },
        { key: 'metalico',   label: 'Detalhes'   },
        { key: 'pergaminho', label: 'Pergaminho' },
    ];

    const picker = document.createElement('div');
    picker.className = 'wiki-theme-picker';

    for (const { key, label } of rows) {
        const row = document.createElement('div');
        row.className = 'wiki-theme-row';

        const rowLabel = document.createElement('label');
        rowLabel.className = 'wiki-theme-row-label';
        rowLabel.textContent = label;
        row.appendChild(rowLabel);

        const swatchesEl = document.createElement('div');
        swatchesEl.className = 'wiki-theme-swatches';

        // For wiki dark mode: only show dark-compatible colors for pergaminho
        const filteredPalette = (key === 'pergaminho')
            ? WIKI_PALETTE.filter(c => c.darkPaper)
            : WIKI_PALETTE;

        for (const color of filteredPalette) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'wiki-theme-swatch';
            btn.title = color.label;
            btn.style.backgroundColor = swatchColor(color, key);
            if (current[key] === color.id) btn.classList.add('active');

            btn.addEventListener('click', () => {
                current[key] = color.id;
                // Update active state within this row only
                swatchesEl.querySelectorAll('.wiki-theme-swatch')
                    .forEach(s => s.classList.remove('active'));
                btn.classList.add('active');
                onChange({ ...current });
            });

            swatchesEl.appendChild(btn);
        }

        row.appendChild(swatchesEl);
        picker.appendChild(row);
    }

    container.innerHTML = '';
    container.appendChild(picker);
}

// ── localStorage cache (avoids theme flash on page load) ──────────────────────

const WIKI_THEME_STORAGE_PREFIX = 'odisseia-wiki-theme-v1';

/** Cache key for a specific document ID (or generic fallback). */
export function wikiThemeCacheKey(docId) {
    return docId ? `${WIKI_THEME_STORAGE_PREFIX}-${docId}` : WIKI_THEME_STORAGE_PREFIX;
}

/** Write theme to localStorage for this document. */
export function cacheDocTheme(docId, theme) {
    try {
        localStorage.setItem(wikiThemeCacheKey(docId), JSON.stringify(theme));
    } catch { /* storage unavailable */ }
}

/** Read cached theme from localStorage, or null if not found. */
export function getCachedDocTheme(docId) {
    try {
        const raw = localStorage.getItem(wikiThemeCacheKey(docId));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        // Validate all three keys
        if (validId(parsed?.fundo) && validId(parsed?.metalico) && validId(parsed?.pergaminho)) {
            return parsed;
        }
        return null;
    } catch { return null; }
}

/** Clear cached theme for a document (on reset). */
export function clearDocThemeCache(docId) {
    try { localStorage.removeItem(wikiThemeCacheKey(docId)); } catch { /* ok */ }
}

/**
 * Removes all theme overrides applied to document.documentElement,
 * returning the page to the default CSS tokens.
 * Also removes the dark-paper class from body.
 */
export function resetDocTheme() {
    const root = document.documentElement;
    THEME_CSS_PROPS.forEach(p => root.style.removeProperty(p));
    document.body.classList.remove('theme-dark-paper');
}

/**
 * Applies a theme from Firestore (or localStorage cache) on the viewer page,
 * with fast-load cache support to prevent a visual flash.
 *
 * @param {string} docId
 * @param {{ fundo, metalico, pergaminho }|null} remoteTheme — from Firestore
 */
export function applyAndCacheDocTheme(docId, remoteTheme) {
    const theme = remoteTheme ?? WIKI_DEFAULTS;
    const f = validId(theme.fundo)      ?? WIKI_DEFAULTS.fundo;
    const m = validId(theme.metalico)   ?? WIKI_DEFAULTS.metalico;
    const p = validId(theme.pergaminho) ?? WIKI_DEFAULTS.pergaminho;
    applyDocTheme(f, m, p);
    cacheDocTheme(docId, { fundo: f, metalico: m, pergaminho: p });
}

/**
 * Applies the localStorage-cached theme immediately (call before async Firestore load
 * to prevent flash). Does nothing if no cache exists.
 *
 * @param {string} docId
 */
export function applyPreloadedTheme(docId) {
    const cached = getCachedDocTheme(docId);
    if (!cached) return;
    applyDocTheme(cached.fundo, cached.metalico, cached.pergaminho);
}
