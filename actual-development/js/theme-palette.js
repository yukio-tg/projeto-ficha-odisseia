// Paleta e geradores de tema compartilhados pela ficha, pela wiki e pelo dashboard.
// Sem DOM: quem aplica no documento é o cliente (theme.js / wiki-theme.js).

export const PALETTE = [
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

/** Cores escuras extras da wiki. A ficha não as oferece no seletor. */
export const WIKI_EXTRA_COLORS = [
    { id: 'marrom-escuro', h: 22, s: 55, bias: -2, darkPaper: true, label: 'Marrom Escuro' },
    { id: 'ocre-escuro',   h: 30, s: 60, bias: -3, darkPaper: true, label: 'Ocre Escuro'   },
    { id: 'areia-escura',  h: 38, s: 45, bias: -2, darkPaper: true, label: 'Areia Escura'  },
];

export const SHEET_DEFAULTS = { fundo: 'marrom', metalico: 'amarelo-escuro', pergaminho: 'bege' };

export const THEME_CSS_PROPS = [
    '--leath0', '--leath1', '--leath2', '--leath3', '--leath4',
    '--gold0', '--gold1', '--gold2', '--gold3',
    '--p0', '--p1', '--p2', '--p3', '--p4', '--sheet-bg',
    '--ink0', '--ink1', '--ink2', '--ink3',
];

export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export function hsl(h, s, l) {
    return `hsl(${h},${clamp(s, 0, 100).toFixed(1)}%,${clamp(l, 0, 100).toFixed(1)}%)`;
}

export function genFundo(h, s, b) {
    const sat = Math.min(s * 0.93, 88);
    return {
        '--leath0': hsl(h, sat, clamp( 5 + b,  0, 42)),
        '--leath1': hsl(h, sat, clamp( 9 + b,  0, 48)),
        '--leath2': hsl(h, sat, clamp(17 + b,  2, 55)),
        '--leath3': hsl(h, sat, clamp(28 + b,  5, 65)),
        '--leath4': hsl(h, sat, clamp(40 + b,  8, 75)),
    };
}

export function genMetalico(h, s, b) {
    const sat = Math.min(s, 92);
    const bh  = b * 0.5;
    return {
        '--gold0': hsl(h, sat, clamp(28 + bh, 14, 56)),
        '--gold1': hsl(h, sat, clamp(44 + bh, 26, 68)),
        '--gold2': hsl(h, sat, clamp(60 + bh, 40, 80)),
        '--gold3': hsl(h, sat, clamp(75 + bh, 56, 90)),
    };
}

export function genPergaminhoClaro(h, s, b) {
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

export function genPergaminhoEscuro(h, s, b) {
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

export function genInk(h, s, isDark) {
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

/** Mapa de variáveis CSS para um trio de cores já resolvido. Sem `darkPaper` no mapa. */
export function buildThemeVars(fundo, metalico, pergaminho) {
    return {
        ...genFundo(fundo.h, fundo.s, fundo.bias),
        ...genMetalico(metalico.h, metalico.s, metalico.bias),
        ...(pergaminho.darkPaper
            ? genPergaminhoEscuro(pergaminho.h, pergaminho.s, pergaminho.bias)
            : genPergaminhoClaro(pergaminho.h, pergaminho.s, pergaminho.bias)),
        ...genInk(pergaminho.h, pergaminho.s, pergaminho.darkPaper),
    };
}

export function swatchColor(color, group) {
    const { h, s, bias: b, darkPaper } = color;
    if (group === 'fundo')      return hsl(h, Math.min(s * 0.93, 88), clamp(20 + b, 3, 48));
    if (group === 'metalico')   return hsl(h, Math.min(s, 92),        clamp(52 + b * 0.5, 22, 80));
    if (group === 'pergaminho') return darkPaper
        ? hsl(h, Math.min(s * 0.85, 78), clamp(18 + b * 0.3,  4, 38))
        : hsl(h, Math.min(s * 1.6,  84), clamp(88 + b * 0.4, 70, 100));
    return '#888';
}

/** Tom gold3 do grupo Detalhes. O dashboard pinta o ícone de classe com isto. */
export function gold3For(metalicoId) {
    const m = PALETTE.find(c => c.id === metalicoId)
        ?? PALETTE.find(c => c.id === SHEET_DEFAULTS.metalico);
    return genMetalico(m.h, m.s, m.bias)['--gold3'];
}

// ── Temas prontos e cor livre (só acréscimos; usado pela ficha) ──────────────

/**
 * Temas prontos da ficha. `slug` é o que vai para o Firestore ({ preset: slug }).
 * Cada tema é um trio de ids da PALETTE (f, m, p) ou três hex (fundo, detalhes, pergaminho).
 * `claro` diz em qual grupo do painel o tema aparece.
 */
export const SHEET_THEME_PRESETS = [
    // Pergaminho claro
    { slug: 'classico',           name: 'Pergaminho clássico', claro: true,  f: 'marrom',       m: 'amarelo-escuro', p: 'bege' },
    { slug: 'everforest',         name: 'Everforest',          claro: true,  hex: ['#2d3a35', '#a7c080', '#f2efdf'] },
    { slug: 'gruvbox',            name: 'Gruvbox',             claro: true,  hex: ['#3c3836', '#d79921', '#fbf1c7'] },
    { slug: 'nord',               name: 'Nord',                claro: true,  hex: ['#3b4252', '#88c0d0', '#eceff4'] },
    { slug: 'solarized',          name: 'Solarized',           claro: true,  hex: ['#073642', '#2aa198', '#fdf6e3'] },
    { slug: 'carmim',             name: 'Carmim',              claro: true,  hex: ['#4a1f26', '#cf6b5f', '#f8ebe6'] },
    { slug: 'tokyo-dia',          name: 'Tokyo Dia',           claro: true,  hex: ['#343b58', '#2e7de9', '#e6e7ed'] },
    { slug: 'cinza',              name: 'Cinza',               claro: true,  f: 'cinza-escuro', m: 'cinza-claro',    p: 'cinza-claro' },
    { slug: 'ambar',              name: 'Âmbar',               claro: true,  hex: ['#3b2a1a', '#e8872f', '#fdf3e1'] },
    { slug: 'lavanda',            name: 'Lavanda',             claro: true,  hex: ['#3a3350', '#8f7bd1', '#f4f0fb'] },
    // Pergaminho escuro
    { slug: 'noite',              name: 'Noite',               claro: false, f: 'azul-escuro',  m: 'azul-claro',     p: 'azul-escuro' },
    { slug: 'cripta',             name: 'Cripta',              claro: false, f: 'preto',        m: 'amarelo-escuro', p: 'preto' },
    { slug: 'rose-pine',          name: 'Rosé Pine',           claro: false, hex: ['#403d52', '#ebbcba', '#26233a'] },
    { slug: 'tokyo-night',        name: 'Tokyo Night',         claro: false, hex: ['#24283b', '#7aa2f7', '#1a1b26'] },
    { slug: 'rubi',               name: 'Rubi',                claro: false, hex: ['#4a1c26', '#e06c75', '#1f1216'] },
    { slug: 'ametista',           name: 'Ametista',            claro: false, hex: ['#2a1f3d', '#c084fc', '#120a1c'] },
    { slug: 'everforest-noturno', name: 'Everforest Noturno',  claro: false, hex: ['#374145', '#a7c080', '#2d353b'] },
    { slug: 'gruvbox-noturno',    name: 'Gruvbox Noturno',     claro: false, hex: ['#3c3836', '#fabd2f', '#282828'] },
    { slug: 'solarized-noturno',  name: 'Solarized Noturno',   claro: false, hex: ['#073642', '#b58900', '#002b36'] },
    { slug: 'one-dark',           name: 'One Dark',            claro: false, hex: ['#3e4451', '#56b6c2', '#21252b'] },
];

export function hexToRgb(h) { return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); }
export function rgbToHex(a) { return '#' + a.map(x => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join(''); }
export function isHex6(v) { return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v); }

/** Luminância relativa (WCAG), de 0 (preto) a 1 (branco). */
export function luminanciaRGB([r, g, b]) {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function rgbToHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    let h = 0, s = 0;
    if (d) {
        s = d / (1 - Math.abs(2 * l - 1));
        h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
        h = (h * 60 + 360) % 360;
    }
    return { h, s: s * 100, l: l * 100 };
}

/**
 * Converte uma cor livre (RGB) na entrada dos geradores (inverso de swatchColor).
 * O resultado é um tom DERIVADO pelas regras da ficha, não a cor exata escolhida.
 * Pergaminho: escuro ou claro conforme a luminância da cor (limite 0,18).
 */
export function colorFromRGB(group, rgb) {
    const { h, s, l } = rgbToHsl(rgb);
    if (group === 'fundo')    return { h, s: s / 0.93, bias: l - 20 };
    if (group === 'metalico') return { h, s, bias: (l - 52) * 2 };
    return luminanciaRGB(rgb) < 0.18
        ? { h, s: s / 0.85, bias: (l - 18) / 0.3, darkPaper: true }
        : { h, s: s / 1.6,  bias: (l - 88) / 0.4, darkPaper: false };
}

/** Cores (fundo, detalhes, pergaminho) já resolvidas para buildThemeVars, a partir de 3 hex. */
export function colorsFromHex({ fundo, metalico, pergaminho }) {
    return [
        colorFromRGB('fundo', hexToRgb(fundo)),
        colorFromRGB('metalico', hexToRgb(metalico)),
        colorFromRGB('pergaminho', hexToRgb(pergaminho)),
    ];
}
