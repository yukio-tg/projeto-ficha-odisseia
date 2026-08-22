// theme.js — Sistema de personalização de cores da ficha
// Fonte de verdade: Firestore (campo `theme` no documento da ficha).
// Cache local: localStorage (aplicação imediata sem flash visual ao carregar).
// Três grupos: Fundo (leath*), Metálico (gold*), Pergaminho (p* + ink*).

// ── Paleta de 29 cores ────────────────────────────────────────────────────────
const PALETTE = [
    { id: 'vermelho-saturado', h: 0,   s: 90, bias:  0, darkPaper: false, label: 'Vermelho Saturado' },
    { id: 'vermelho-escuro',   h: 355, s: 72, bias: -4, darkPaper: true,  label: 'Vermelho Escuro'   },
    { id: 'vermelho-claro',    h: 5,   s: 55, bias: +5, darkPaper: false, label: 'Vermelho Claro'    },
    { id: 'laranja',           h: 25,  s: 88, bias:  0, darkPaper: false, label: 'Laranja'           },
    { id: 'marrom',            h: 22,  s: 70, bias:  0, darkPaper: false, label: 'Marrom'            },
    { id: 'bege',              h: 38,  s: 46, bias: +4, darkPaper: false, label: 'Bege'              },
    { id: 'amarelo-banana',    h: 57,  s: 78, bias: +9, darkPaper: false, label: 'Amarelo Banana'    },
    { id: 'amarelo-escuro',    h: 45,  s: 75, bias:  0, darkPaper: false, label: 'Amarelo Escuro'    },
    { id: 'amarelo-saturado',  h: 50,  s: 97, bias: +3, darkPaper: false, label: 'Amarelo Saturado'  },
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
    { id: 'cinza-escuro',      h: 20,  s:  8, bias: -8, darkPaper: true,  label: 'Cinza Escuro'      },
    { id: 'cinza',             h: 20,  s:  5, bias:  0, darkPaper: false, label: 'Cinza'             },
    { id: 'cinza-claro',       h: 20,  s:  5, bias: +12, darkPaper: false, label: 'Cinza Claro'     },
    { id: 'preto',             h: 0,   s:  0, bias: -10, darkPaper: true,  label: 'Preto'            },
    { id: 'branco',            h: 38,  s: 18, bias: +22, darkPaper: false, label: 'Branco'           },
];

const DEFAULTS    = { fundo: 'marrom', metalico: 'amarelo-escuro', pergaminho: 'bege' };
const STORAGE_KEY = 'odisseia-theme-v1';

// ── Auxiliares ────────────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function hsl(h, s, l)     { return `hsl(${h},${clamp(s,0,100).toFixed(1)}%,${clamp(l,0,100).toFixed(1)}%)`; }
function validId(id)      { return PALETTE.find(c => c.id === id) ? id : null; }

// ── Geração de variáveis CSS ──────────────────────────────────────────────────

function genFundo(h, s, b) {
    const sat = Math.min(s * 0.93, 88);
    return {
        '--leath0': hsl(h, sat, clamp( 5+b,  0, 42)),
        '--leath1': hsl(h, sat, clamp( 9+b,  0, 48)),
        '--leath2': hsl(h, sat, clamp(17+b,  2, 55)),
        '--leath3': hsl(h, sat, clamp(28+b,  5, 65)),
        '--leath4': hsl(h, sat, clamp(40+b,  8, 75)),
    };
}

function genMetalico(h, s, b) {
    const sat = Math.min(s, 92);
    const bh  = b * 0.5;
    return {
        '--gold0': hsl(h, sat, clamp(28+bh, 14, 56)),
        '--gold1': hsl(h, sat, clamp(44+bh, 26, 68)),
        '--gold2': hsl(h, sat, clamp(60+bh, 40, 80)),
        '--gold3': hsl(h, sat, clamp(75+bh, 56, 90)),
    };
}

function genPergaminhoClaro(h, s, b) {
    const sat = Math.min(s * 1.6, 84);
    const bh  = b * 0.4;
    return {
        '--p0':       hsl(h, sat,                        clamp(96+bh, 78, 100)),
        '--p1':       hsl(h, sat * 0.97,                 clamp(91+bh, 72,  98)),
        '--p2':       hsl(h, sat * 0.91,                 clamp(84+bh, 65,  95)),
        '--p3':       hsl(h, sat * 0.84,                 clamp(74+bh, 55,  88)),
        '--p4':       hsl(h, sat * 0.77,                 clamp(63+bh, 45,  80)),
        '--sheet-bg': hsl(h, Math.min(sat * 0.91, 78),  clamp(90+bh, 72,  98)),
    };
}

function genPergaminhoEscuro(h, s, b) {
    const sat = Math.min(s * 0.85, 78);
    const bh  = b * 0.3;
    return {
        '--p0':       hsl(h, sat,                        clamp(12+bh,  4, 28)),
        '--p1':       hsl(h, sat * 0.95,                 clamp(18+bh,  7, 36)),
        '--p2':       hsl(h, sat * 0.88,                 clamp(28+bh, 12, 48)),
        '--p3':       hsl(h, sat * 0.80,                 clamp(42+bh, 20, 60)),
        '--p4':       hsl(h, sat * 0.72,                 clamp(56+bh, 30, 70)),
        '--sheet-bg': hsl(h, Math.min(sat * 0.90, 72),  clamp(10+bh,  3, 24)),
    };
}

function genInk(h, s, isDark) {
    if (isDark) {
        const sat = Math.min(s * 0.35, 38);
        return { '--ink0': hsl(h,sat,92), '--ink1': hsl(h,sat,84), '--ink2': hsl(h,sat,73), '--ink3': hsl(h,sat,58) };
    }
    const sat = Math.min(s * 0.75, 70);
    return { '--ink0': hsl(h,sat,3), '--ink1': hsl(h,sat,7), '--ink2': hsl(h,sat,16), '--ink3': hsl(h,sat,26) };
}

// ── Aplicação do tema ─────────────────────────────────────────────────────────

function applyTheme(fundoId, metalicoId, pergaminhoId) {
    const find = id => PALETTE.find(c => c.id === id);
    const f = find(fundoId)      ?? find(DEFAULTS.fundo);
    const m = find(metalicoId)   ?? find(DEFAULTS.metalico);
    const p = find(pergaminhoId) ?? find(DEFAULTS.pergaminho);

    const vars = {
        ...genFundo(f.h, f.s, f.bias),
        ...genMetalico(m.h, m.s, m.bias),
        ...(p.darkPaper ? genPergaminhoEscuro(p.h, p.s, p.bias) : genPergaminhoClaro(p.h, p.s, p.bias)),
        ...genInk(p.h, p.s, p.darkPaper),
    };

    const root = document.documentElement;
    for (const [prop, val] of Object.entries(vars)) root.style.setProperty(prop, val);
    document.body.classList.toggle('theme-dark-paper', p.darkPaper);
}

function resetTheme() {
    const root = document.documentElement;
    // Remove todas as overrides inline — volta aos valores do :root do CSS
    const props = ['--leath0','--leath1','--leath2','--leath3','--leath4',
                   '--gold0','--gold1','--gold2','--gold3',
                   '--p0','--p1','--p2','--p3','--p4','--sheet-bg',
                   '--ink0','--ink1','--ink2','--ink3'];
    props.forEach(p => root.style.removeProperty(p));
    document.body.classList.remove('theme-dark-paper');
}

// ── Cache local (localStorage) ────────────────────────────────────────────────

let _cacheKey = STORAGE_KEY;

function cacheWrite(fundo, metalico, pergaminho) {
    try { localStorage.setItem(_cacheKey, JSON.stringify({ fundo, metalico, pergaminho })); }
    catch { /* storage indisponível */ }
}

function cacheRead() {
    try { const r = localStorage.getItem(_cacheKey); return r ? JSON.parse(r) : null; }
    catch { return null; }
}

function cacheClear() {
    try { localStorage.removeItem(_cacheKey); } catch { /* ok */ }
}

// ── Estado atual ──────────────────────────────────────────────────────────────
let state = { ...DEFAULTS };
let _saveToFirestore = null; // callback injetado por main.js

// ── Cor de preview dos swatches ───────────────────────────────────────────────

function swatchColor(color, group) {
    const { h, s, bias: b, darkPaper } = color;
    if (group === 'fundo')      return hsl(h, Math.min(s * 0.93, 88), clamp(20+b, 3, 48));
    if (group === 'metalico')   return hsl(h, Math.min(s, 92),        clamp(52+b*0.5, 22, 80));
    if (group === 'pergaminho') return darkPaper
        ? hsl(h, Math.min(s * 0.85, 78), clamp(18+b*0.3, 4, 38))
        : hsl(h, Math.min(s * 1.6, 84),  clamp(88+b*0.4, 70, 100));
    return '#888';
}

// ── Reconstrução dos swatches ─────────────────────────────────────────────────

function rebuildAllSwatches() {
    buildSwatches('theme-swatches-fundo',      'fundo');
    buildSwatches('theme-swatches-metalico',   'metalico');
    buildSwatches('theme-swatches-pergaminho', 'pergaminho');
}

function buildSwatches(containerId, group) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    for (const color of PALETTE) {
        const btn = document.createElement('button');
        btn.className = 'theme-swatch';
        btn.type = 'button';
        btn.title = color.label + (color.darkPaper && group === 'pergaminho' ? ' ◐' : '');
        btn.style.backgroundColor = swatchColor(color, group);
        if (state[group] === color.id) btn.classList.add('active');

        btn.addEventListener('click', () => {
            state[group] = color.id;
            applyTheme(state.fundo, state.metalico, state.pergaminho);
            // Cache imediato; Firestore em seguida
            cacheWrite(state.fundo, state.metalico, state.pergaminho);
            if (_saveToFirestore) _saveToFirestore({ ...state });
            container.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
            btn.classList.add('active');
        });

        container.appendChild(btn);
    }
}

// ── Aplicar tema externo (vindo do Firestore) ─────────────────────────────────

/**
 * Aplica um tema recebido externamente (do Firestore) e sincroniza o estado local.
 * Chamado pelo main.js após carregar o sheetDoc.
 */
export function applyRemoteTheme(theme) {
    if (!theme) return;
    state.fundo      = validId(theme.fundo)      ?? DEFAULTS.fundo;
    state.metalico   = validId(theme.metalico)   ?? DEFAULTS.metalico;
    state.pergaminho = validId(theme.pergaminho) ?? DEFAULTS.pergaminho;
    applyTheme(state.fundo, state.metalico, state.pergaminho);
    cacheWrite(state.fundo, state.metalico, state.pergaminho);
    // Atualiza a UI dos swatches se o painel já foi construído
    rebuildAllSwatches();
}

// ── Inicialização ─────────────────────────────────────────────────────────────

/**
 * @param {string|null} sheetId       ID da ficha (isola o cache por documento).
 * @param {Function|null} saveFn      Callback async (theme) → void para salvar no Firestore.
 *                                    Injetado pelo main.js após autenticação.
 */
export function initThemePanel(sheetId, saveFn = null) {
    _cacheKey        = sheetId ? `${STORAGE_KEY}-${sheetId}` : STORAGE_KEY;
    _saveToFirestore = saveFn;

    // Aplica cache local imediatamente (sem flash visual antes do Firestore responder)
    const cached = cacheRead();
    if (cached) {
        state.fundo      = validId(cached.fundo)      ?? DEFAULTS.fundo;
        state.metalico   = validId(cached.metalico)   ?? DEFAULTS.metalico;
        state.pergaminho = validId(cached.pergaminho) ?? DEFAULTS.pergaminho;
        applyTheme(state.fundo, state.metalico, state.pergaminho);
    }

    const panel     = document.getElementById('theme-panel');
    const toggleBtn = document.getElementById('theme-btn');
    const resetBtn  = document.getElementById('theme-reset-btn');
    if (!panel || !toggleBtn) return;

    rebuildAllSwatches();

    // Toggle do painel
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = panel.classList.toggle('open');
        toggleBtn.classList.toggle('active', open);
    });

    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && !toggleBtn.contains(e.target)) {
            panel.classList.remove('open');
            toggleBtn.classList.remove('active');
        }
    });

    // Botão de reset
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            state = { ...DEFAULTS };
            resetTheme();
            cacheClear();
            if (_saveToFirestore) _saveToFirestore(null); // null = apaga o campo tema no Firestore
            rebuildAllSwatches();
        });
    }
}

/** Atualiza o callback de save (chamado quando a autenticação confirmar a permissão). */
export function setThemeSaveFn(fn) {
    _saveToFirestore = fn;
}
