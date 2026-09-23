// wiki-theme.js — Color theme system for the Odisseia Wiki
// Generation functions are identical to ficha/js/ui/theme.js.
// No localStorage cache: the theme comes from the Firestore document and is
// applied once on page load (or when the editor picker fires onChange).

// ── Palette (29 colors — identical to ficha) ──────────────────────────────────
export const WIKI_PALETTE = [
    { id: 'vermelho-saturado', h:   0, s: 90, bias:  0, darkPaper: false, label: 'Vermelho Saturado' },
    { id: 'vermelho-escuro',   h: 355, s: 72, bias: -4, darkPaper: true,  label: 'Vermelho Escuro'   },
    { id: 'vermelho-claro',    h:   5, s: 55, bias: +5, darkPaper: false, label: 'Vermelho Claro'    },
    { id: 'laranja',           h:  25, s: 88, bias:  0, darkPaper: false, label: 'Laranja'           },
    { id: 'marrom',            h:  22, s: 70, bias:  0, darkPaper: false, label: 'Marrom'            },
    { id: 'bege',              h:  38, s: 46, bias: +4, darkPaper: false, label: 'Bege'              },
    { id: 'amarelo-banana',    h:  57, s: 78, bias: +9, darkPaper: false, label: 'Amarelo Banana'    },
    { id: 'amarelo-escuro',    h:  45, s: 75, bias:  0, darkPaper: false, label: 'Amarelo Escuro'    },
    { id: 'amarelo-saturado',  h:  50, s: 97, bias: +3, darkPaper: false, label: 'Amarelo Saturado'  },
    { id: 'verde-escuro',      h: 120, s: 72, bias: -4, darkPaper: true,  label: 'Verde Escuro'      },
    { id: 'verde-saturado',    h: 125, s: 88, bias:  0, darkPaper: false, label: 'Verde Saturado'    },
    { id: 'verde-claro',       h: 140, s: 55, bias: +5, darkPaper: false, label: 'Verde Claro'       },
    { id: 'ciano-escuro',      h: 185, s: 72, bias: -4, darkPaper: true,  label: 'Ciano Escuro'      },
    { id: 'ciano-saturado',    h: 180, s: 90, bias:  0, darkPaper: false, label: 'Ciano Saturado'    },
    { id: 'ciano-claro',       h: 175, s: 55, bias: +5, darkPaper: false, label: 'Ciano Claro'       },
    { id: 'azul-claro',        h: 210, s: 58, bias: +5, darkPaper: false, label: 'Azul Claro'        },
    { id: 'azul-saturado',     h: 220, s: 90, bias:  0, darkPaper: false, label: 'Azul Saturado'     },
    { id: 'azul-escuro',       h: 230, s: 72, bias: -4, darkPaper: true,  label: 'Azul Escuro'       },
    { id: 'roxo-escuro',       h: 265, s: 72, bias: -4, darkPaper: true,  label: 'Roxo Escuro'       },
    { id: 'roxo-claro',        h: 280, s: 50, bias: +5, darkPaper: false, label: 'Roxo Claro'        },
    { id: 'roxo-saturado',     h: 270, s: 90, bias:  0, darkPaper: false, label: 'Roxo Saturado'     },
    { id: 'rosa-escuro',       h: 330, s: 65, bias: -4, darkPaper: true,  label: 'Rosa Escuro'       },
    { id: 'rosa-claro',        h: 340, s: 50, bias: +5, darkPaper: false, label: 'Rosa Claro'        },
    { id: 'rosa-saturado',     h: 335, s: 88, bias:  0, darkPaper: false, label: 'Rosa Saturado'     },
    { id: 'cinza-escuro',      h:  20, s:  8, bias: -8, darkPaper: true,  label: 'Cinza Escuro'      },
    { id: 'cinza',             h:  20, s:  5, bias:  0, darkPaper: false, label: 'Cinza'             },
    { id: 'cinza-claro',       h:  20, s:  5, bias: +12, darkPaper: false, label: 'Cinza Claro'      },
    { id: 'preto',             h:   0, s:  0, bias: -10, darkPaper: true,  label: 'Preto'            },
    { id: 'branco',            h:  38, s: 18, bias: +22, darkPaper: false, label: 'Branco'           },
];

export const WIKI_DEFAULTS = { fundo: 'marrom', metalico: 'amarelo-escuro', pergaminho: 'bege' };

// ── Internal helpers (identical logic to ficha/js/ui/theme.js) ────────────────

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function hsl(h, s, l)     { return `hsl(${h},${clamp(s, 0, 100).toFixed(1)}%,${clamp(l, 0, 100).toFixed(1)}%)`; }
function findColor(id)    { return WIKI_PALETTE.find(c => c.id === id); }
function validId(id)      { return findColor(id) ? id : null; }

// ── CSS variable generators (1-to-1 copy from ficha/js/ui/theme.js) ──────────

function genFundo(h, s, b) {
    const sat = Math.min(s * 0.93, 88);
    return {
        '--leath0': hsl(h, sat, clamp( 5 + b,  0, 42)),
        '--leath1': hsl(h, sat, clamp( 9 + b,  0, 48)),
        '--leath2': hsl(h, sat, clamp(17 + b,  2, 55)),
        '--leath3': hsl(h, sat, clamp(28 + b,  5, 65)),
        '--leath4': hsl(h, sat, clamp(40 + b,  8, 75)),
    };
}

function genMetalico(h, s, b) {
    const sat = Math.min(s, 92);
    const bh  = b * 0.5;
    return {
        '--gold0': hsl(h, sat, clamp(28 + bh, 14, 56)),
        '--gold1': hsl(h, sat, clamp(44 + bh, 26, 68)),
        '--gold2': hsl(h, sat, clamp(60 + bh, 40, 80)),
        '--gold3': hsl(h, sat, clamp(75 + bh, 56, 90)),
    };
}

function genPergaminhoClaro(h, s, b) {
    const sat = Math.min(s * 1.6, 84);
    const bh  = b * 0.4;
    return {
        '--p0':       hsl(h, sat,                       clamp(96 + bh, 78, 100)),
        '--p1':       hsl(h, sat * 0.97,                clamp(91 + bh, 72,  98)),
        '--p2':       hsl(h, sat * 0.91,                clamp(84 + bh, 65,  95)),
        '--p3':       hsl(h, sat * 0.84,                clamp(74 + bh, 55,  88)),
        '--p4':       hsl(h, sat * 0.77,                clamp(63 + bh, 45,  80)),
        '--sheet-bg': hsl(h, Math.min(sat * 0.91, 78), clamp(90 + bh, 72,  98)),
    };
}

function genPergaminhoEscuro(h, s, b) {
    const sat = Math.min(s * 0.85, 78);
    const bh  = b * 0.3;
    return {
        '--p0':       hsl(h, sat,                       clamp(12 + bh,  4, 28)),
        '--p1':       hsl(h, sat * 0.95,                clamp(18 + bh,  7, 36)),
        '--p2':       hsl(h, sat * 0.88,                clamp(28 + bh, 12, 48)),
        '--p3':       hsl(h, sat * 0.80,                clamp(42 + bh, 20, 60)),
        '--p4':       hsl(h, sat * 0.72,                clamp(56 + bh, 30, 70)),
        '--sheet-bg': hsl(h, Math.min(sat * 0.90, 72), clamp(10 + bh,  3, 24)),
    };
}

function genInk(h, s, isDark) {
    if (isDark) {
        const sat = Math.min(s * 0.35, 38);
        return {
            '--ink0': hsl(h, sat, 92),
            '--ink1': hsl(h, sat, 84),
            '--ink2': hsl(h, sat, 73),
            '--ink3': hsl(h, sat, 58),
        };
    }
    const sat = Math.min(s * 0.75, 70);
    return {
        '--ink0': hsl(h, sat,  3),
        '--ink1': hsl(h, sat,  7),
        '--ink2': hsl(h, sat, 16),
        '--ink3': hsl(h, sat, 26),
    };
}

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
        ...genFundo(f.h, f.s, f.bias),
        ...genMetalico(m.h, m.s, m.bias),
        ...(p.darkPaper
            ? genPergaminhoEscuro(p.h, p.s, p.bias)
            : genPergaminhoClaro(p.h, p.s, p.bias)),
        ...genInk(p.h, p.s, p.darkPaper),
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

    const vars = {
        ...genFundo(f.h, f.s, f.bias),
        ...genMetalico(m.h, m.s, m.bias),
        ...(p.darkPaper
            ? genPergaminhoEscuro(p.h, p.s, p.bias)
            : genPergaminhoClaro(p.h, p.s, p.bias)),
        ...genInk(p.h, p.s, p.darkPaper),
    };

    const root = document.documentElement;
    for (const [prop, val] of Object.entries(vars)) root.style.setProperty(prop, val);
    document.body.classList.toggle('theme-dark-paper', p.darkPaper);
}

/**
 * Returns the representative preview color (as an hsl() string) for a
 * swatch button. Identical logic to ficha/js/ui/theme.js#swatchColor.
 *
 * @param {object} color - Entry from WIKI_PALETTE.
 * @param {string} group - 'fundo' | 'metalico' | 'pergaminho'
 * @returns {string} CSS color string
 */
export function swatchColor(color, group) {
    const { h, s, bias: b, darkPaper } = color;
    if (group === 'fundo')
        return hsl(h, Math.min(s * 0.93, 88), clamp(20 + b, 3, 48));
    if (group === 'metalico')
        return hsl(h, Math.min(s, 92),        clamp(52 + b * 0.5, 22, 80));
    if (group === 'pergaminho')
        return darkPaper
            ? hsl(h, Math.min(s * 0.85, 78), clamp(18 + b * 0.3,  4, 38))
            : hsl(h, Math.min(s * 1.6,  84), clamp(88 + b * 0.4, 70, 100));
    return '#888';
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

        for (const color of WIKI_PALETTE) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'wiki-theme-swatch';
            btn.title = color.label + (color.darkPaper && key === 'pergaminho' ? ' ◐' : '');
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
    [
        '--leath0', '--leath1', '--leath2', '--leath3', '--leath4',
        '--gold0',  '--gold1',  '--gold2',  '--gold3',
        '--p0',     '--p1',     '--p2',     '--p3',     '--p4',
        '--sheet-bg',
        '--ink0',   '--ink1',   '--ink2',   '--ink3',
    ].forEach(p => root.style.removeProperty(p));
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
