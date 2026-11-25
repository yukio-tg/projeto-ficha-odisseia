// theme.js — Sistema de cores da ficha: 20 temas prontos + cor livre (RGB)
// Fonte de verdade: Firestore (campo `theme` no documento da ficha).
// Cache local: localStorage (aplicação imediata sem flash visual ao carregar).
// Formatos aceitos (todos validados na leitura; inválido volta ao padrão):
//   { preset: 'slug' }                                  tema pronto
//   { custom: { fundo, metalico, pergaminho } }         cor livre, hex '#rrggbb'
//   { fundo, metalico, pergaminho }                     formato antigo (ids da PALETTE)
//   null                                                padrão (Pergaminho clássico)
// A paleta e os geradores vivem em js/theme-palette.js.

import {
    PALETTE,
    SHEET_DEFAULTS as DEFAULTS,
    SHEET_THEME_PRESETS as PRESETS,
    buildThemeVars,
    swatchColor,
    THEME_CSS_PROPS,
    colorsFromHex,
    hexToRgb,
    rgbToHex,
    isHex6,
    clamp,
} from '../../../js/theme-palette.js';

const STORAGE_KEY = 'odisseia-theme-v1';
const CLASSICO = 'classico';
const GRUPOS_RGB = [['fundo', 'Fundo'], ['metalico', 'Detalhes'], ['pergaminho', 'Pergaminho']];

const findColor = id => PALETTE.find(c => c.id === id);
const findPreset = slug => PRESETS.find(t => t.slug === slug);
const validId = id => (findColor(id) ? id : null);

/** Hex (fundo, detalhes, pergaminho) de um tema pronto, para miniatura e para o painel RGB. */
function hexDoPreset(t) {
    if (t.hex) return { fundo: t.hex[0], metalico: t.hex[1], pergaminho: t.hex[2] };
    return {
        fundo: corParaHex(swatchColor(findColor(t.f), 'fundo')),
        metalico: corParaHex(swatchColor(findColor(t.m), 'metalico')),
        pergaminho: corParaHex(swatchColor(findColor(t.p), 'pergaminho')),
    };
}

/** Converte qualquer cor CSS (ex.: hsl(...)) em '#rrggbb' usando o canvas. */
function corParaHex(css) {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.fillStyle = css;
    return ctx.fillStyle; // o navegador devolve '#rrggbb' para cores opacas
}

// ── Estado ────────────────────────────────────────────────────────────────────
// { kind:'preset', slug } | { kind:'custom', rgb:{fundo,metalico,pergaminho} } | { kind:'legacy', fundo, metalico, pergaminho }
const PADRAO = () => ({ kind: 'preset', slug: CLASSICO });
let state = PADRAO();
let _saveToFirestore = null; // callback injetado por main.js
let _onThemeUpdate   = null; // callback para redesenhar elementos canvas (ex: radar)
let _cacheKey = STORAGE_KEY;

/** Lê e valida um valor vindo do Firestore ou do cache. Nunca lança; inválido = padrão. */
export function parseTheme(theme) {
    if (!theme || typeof theme !== 'object') return PADRAO();
    if (typeof theme.preset === 'string' && findPreset(theme.preset)) return { kind: 'preset', slug: theme.preset };
    const c = theme.custom;
    if (c && typeof c === 'object' && GRUPOS_RGB.every(([g]) => isHex6(c[g]))) {
        return { kind: 'custom', rgb: Object.fromEntries(GRUPOS_RGB.map(([g]) => [g, c[g].toLowerCase()])) };
    }
    if ('fundo' in theme || 'metalico' in theme || 'pergaminho' in theme) {
        const legado = {
            fundo:      validId(theme.fundo)      ?? DEFAULTS.fundo,
            metalico:   validId(theme.metalico)   ?? DEFAULTS.metalico,
            pergaminho: validId(theme.pergaminho) ?? DEFAULTS.pergaminho,
        };
        const igualPadrao = legado.fundo === DEFAULTS.fundo && legado.metalico === DEFAULTS.metalico && legado.pergaminho === DEFAULTS.pergaminho;
        return igualPadrao ? PADRAO() : { kind: 'legacy', ...legado };
    }
    return PADRAO();
}

/** Valor que vai para o Firestore e para o cache. null = padrão (apaga o campo). */
export function serializeTheme(s) {
    if (s.kind === 'preset') return s.slug === CLASSICO ? null : { preset: s.slug };
    if (s.kind === 'custom') return { custom: { ...s.rgb } };
    return { fundo: s.fundo, metalico: s.metalico, pergaminho: s.pergaminho };
}

/** Variáveis CSS e se o pergaminho é escuro. `vars` null = padrão (remove as overrides). */
function resolver(s) {
    if (s.kind === 'preset') {
        if (s.slug === CLASSICO) return { vars: null, dark: false };
        const t = findPreset(s.slug);
        if (t.hex) return resolverHex(hexDoPreset(t));
        const p = findColor(t.p);
        return { vars: buildThemeVars(findColor(t.f), findColor(t.m), p), dark: p.darkPaper };
    }
    if (s.kind === 'custom') return resolverHex(s.rgb);
    const p = findColor(s.pergaminho);
    return { vars: buildThemeVars(findColor(s.fundo), findColor(s.metalico), p), dark: p.darkPaper };
}

function resolverHex(hexes) {
    const [f, m, p] = colorsFromHex(hexes);
    return { vars: buildThemeVars(f, m, p), dark: p.darkPaper };
}

function aplicar() {
    const { vars, dark } = resolver(state);
    const root = document.documentElement;
    if (vars) for (const [prop, val] of Object.entries(vars)) root.style.setProperty(prop, val);
    else THEME_CSS_PROPS.forEach(p => root.style.removeProperty(p)); // volta aos valores do :root do CSS
    document.body.classList.toggle('theme-dark-paper', dark);
    // Notifica quem precisa redesenhar (radar) e quem decide claro/escuro sozinho (Grimório)
    if (_onThemeUpdate) _onThemeUpdate();
    document.dispatchEvent(new CustomEvent('ficha:tema-mudou'));
    marcarAtivo();
}

// ── Cache local (localStorage) ────────────────────────────────────────────────

function cacheWrite(valor) {
    try {
        if (valor) localStorage.setItem(_cacheKey, JSON.stringify(valor));
        else localStorage.removeItem(_cacheKey);
    } catch { /* storage indisponível */ }
}

function cacheRead() {
    try { const r = localStorage.getItem(_cacheKey); return r ? JSON.parse(r) : null; }
    catch { return null; }
}

/** Aplica uma escolha feita pela pessoa nesta ficha e grava (cache + Firestore). */
function escolher(novo) {
    state = novo;
    aplicar();
    const valor = serializeTheme(state);
    cacheWrite(valor);
    if (_saveToFirestore) _saveToFirestore(valor); // null = apaga o campo no Firestore
}

// ── Painel ────────────────────────────────────────────────────────────────────

function el(tag, classe, texto) {
    const n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto != null) n.textContent = texto;
    return n;
}

function construirTemas() {
    const grid = document.getElementById('cp-grid');
    if (!grid) return;
    grid.replaceChildren();
    let ultimo = null;
    PRESETS.forEach(t => {
        if (t.claro !== ultimo) {
            ultimo = t.claro;
            grid.appendChild(el('div', 'cp-sub', t.claro ? 'Pergaminho claro' : 'Pergaminho escuro'));
        }
        const hx = hexDoPreset(t);
        const b = el('button', 'theme-card');
        b.type = 'button';
        b.dataset.slug = t.slug;
        const thumb = el('span', 'theme-thumb');
        [hx.fundo, hx.metalico, hx.pergaminho].forEach(c => {
            const i = document.createElement('i');
            i.style.background = c;
            thumb.appendChild(i);
        });
        const legenda = el('span', 'theme-legend');
        ['Fundo', 'Detalhes', 'Perg.'].forEach(x => legenda.appendChild(el('span', null, x)));
        b.append(thumb, el('span', 'theme-name', t.name), legenda);
        b.addEventListener('click', () => escolher({ kind: 'preset', slug: t.slug }));
        grid.appendChild(b);
    });
    marcarAtivo();
}

function marcarAtivo() {
    document.querySelectorAll('#cp-grid .theme-card').forEach(c => {
        const ativo = state.kind === 'preset' && c.dataset.slug === state.slug;
        c.classList.toggle('active', ativo);
        c.setAttribute('aria-pressed', String(ativo));
    });
}

/** Hex atuais dos três grupos, ponto de partida do painel RGB. */
function hexAtuais() {
    if (state.kind === 'custom') return { ...state.rgb };
    if (state.kind === 'preset') return hexDoPreset(findPreset(state.slug));
    return {
        fundo: corParaHex(swatchColor(findColor(state.fundo), 'fundo')),
        metalico: corParaHex(swatchColor(findColor(state.metalico), 'metalico')),
        pergaminho: corParaHex(swatchColor(findColor(state.pergaminho), 'pergaminho')),
    };
}

function construirRGB() {
    const box = document.getElementById('rgb-groups');
    if (!box) return;
    box.replaceChildren();
    const rgb = hexAtuais();
    const aplicarLivre = () => escolher({ kind: 'custom', rgb: { ...rgb } });

    GRUPOS_RGB.forEach(([g, rotulo]) => {
        const row = el('div', 'rgb-row');
        const cor = el('input'); cor.type = 'color'; cor.setAttribute('aria-label', rotulo);
        const nums = el('div', 'rgb-nums');
        const campos = ['R', 'G', 'B'].map((letra, k) => {
            const lab = el('label', null, letra);
            const n = el('input');
            n.type = 'number'; n.min = '0'; n.max = '255'; n.step = '1';
            n.setAttribute('aria-label', `${rotulo} ${letra}`);
            lab.appendChild(n);
            nums.appendChild(lab);
            n.addEventListener('input', () => {
                const v = [...hexToRgb(rgb[g])];
                v[k] = clamp(Math.round(+n.value || 0), 0, 255);
                rgb[g] = rgbToHex(v);
                sync(n);
                aplicarLivre();
            });
            return n;
        });
        const hx = el('input', 'hex'); hx.type = 'text'; hx.maxLength = 7; hx.setAttribute('aria-label', `${rotulo} hex`);
        nums.appendChild(hx);
        row.append(el('span', 'rgb-label', rotulo), cor, nums);
        box.appendChild(row);

        // Atualiza os outros campos da linha (menos o que a pessoa está digitando)
        function sync(origem) {
            const v = hexToRgb(rgb[g]);
            if (origem !== cor) cor.value = rgb[g];
            campos.forEach((n, k) => { if (n !== origem) n.value = v[k]; });
            if (origem !== hx) hx.value = rgb[g];
        }
        sync(null);
        cor.addEventListener('input', () => { rgb[g] = cor.value.toLowerCase(); sync(cor); aplicarLivre(); });
        hx.addEventListener('input', () => {
            const t = hx.value.trim();
            if (isHex6(t)) { rgb[g] = t.toLowerCase(); sync(hx); aplicarLivre(); }
        });
    });
}

function mostrarVista(rgb) {
    document.getElementById('cp-themes').hidden = rgb;
    document.getElementById('cp-rgb').hidden = !rgb;
}

// ── Aplicar tema externo (Firestore) ──────────────────────────────────────────

/**
 * Aplica um tema recebido do Firestore e sincroniza o estado local.
 * Chamado pelo main.js ao carregar a ficha e a cada mudança em tempo real.
 * @param {object|null} theme  valor do campo `theme`.
 * @param {boolean} [restaurarSeVazio=false]  em tempo real, `null` significa que outra
 *        pessoa restaurou o padrão; no carregamento inicial `null` mantém o cache.
 */
export function applyRemoteTheme(theme, restaurarSeVazio = false) {
    if (!theme && !restaurarSeVazio) return;
    const novo = parseTheme(theme);
    const igual = JSON.stringify(serializeTheme(novo)) === JSON.stringify(serializeTheme(state));
    state = novo;
    cacheWrite(serializeTheme(state));
    // No carregamento inicial aplica sempre (garante classe e evento); em tempo real só se mudou
    if (!igual || !restaurarSeVazio) aplicar();
    if (igual) return;
    // Se o painel RGB estiver aberto, mostra os valores novos
    const rgbAberto = document.getElementById('cp-rgb');
    if (rgbAberto && !rgbAberto.hidden) construirRGB();
}

// ── Inicialização ─────────────────────────────────────────────────────────────

/**
 * @param {string|null} sheetId       ID da ficha (isola o cache por documento).
 * @param {Function|null} saveFn      Callback (theme|null) → void para salvar no Firestore.
 */
export function initThemePanel(sheetId, saveFn = null) {
    _cacheKey        = sheetId ? `${STORAGE_KEY}-${sheetId}` : STORAGE_KEY;
    _saveToFirestore = saveFn;

    // Aplica o cache local já (sem flash antes do Firestore responder)
    const cached = cacheRead();
    if (cached) { state = parseTheme(cached); aplicar(); }

    const panel     = document.getElementById('theme-panel');
    const toggleBtn = document.getElementById('theme-btn');
    if (!panel || !toggleBtn) return;

    construirTemas();

    const abrir = (v) => {
        panel.hidden = !v;
        toggleBtn.classList.toggle('active', v);
        toggleBtn.setAttribute('aria-expanded', String(v));
        if (v) mostrarVista(false);
    };
    abrir(false);

    toggleBtn.addEventListener('click', (e) => { e.stopPropagation(); abrir(panel.hidden); });
    // Clique fora fecha; Esc fecha e devolve o foco ao botão
    document.addEventListener('click', (e) => {
        if (!panel.hidden && !panel.contains(e.target) && !toggleBtn.contains(e.target)) abrir(false);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !panel.hidden) { abrir(false); toggleBtn.focus(); }
    });

    document.getElementById('cp-custom')?.addEventListener('click', () => { construirRGB(); mostrarVista(true); });
    document.getElementById('cp-back')?.addEventListener('click', () => mostrarVista(false));
    const restaurar = () => { escolher(PADRAO()); if (!document.getElementById('cp-rgb').hidden) construirRGB(); };
    document.getElementById('cp-reset')?.addEventListener('click', restaurar);
    document.getElementById('cp-reset2')?.addEventListener('click', restaurar);
}

/** Atualiza o callback de save (chamado quando a autenticação confirmar a permissão). */
export function setThemeSaveFn(fn) {
    _saveToFirestore = fn;
}

/** Registra callback chamado após cada mudança de tema (ex: redesenhar canvas do radar). */
export function setThemeUpdateFn(fn) {
    _onThemeUpdate = fn;
}
