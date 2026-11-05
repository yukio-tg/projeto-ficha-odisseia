// theme.js — Sistema de personalização de cores da ficha
// Fonte de verdade: Firestore (campo `theme` no documento da ficha).
// Cache local: localStorage (aplicação imediata sem flash visual ao carregar).
// Três grupos: Fundo (leath*), Metálico (gold*), Pergaminho (p* + ink*).
// A paleta e os geradores vivem em js/theme-palette.js.

import {
    PALETTE,
    SHEET_DEFAULTS as DEFAULTS,
    buildThemeVars,
    swatchColor,
    THEME_CSS_PROPS,
} from '../../../js/theme-palette.js';

const STORAGE_KEY = 'odisseia-theme-v1';

function validId(id) { return PALETTE.find(c => c.id === id) ? id : null; }

function applyTheme(fundoId, metalicoId, pergaminhoId) {
    const find = id => PALETTE.find(c => c.id === id);
    const f = find(fundoId)      ?? find(DEFAULTS.fundo);
    const m = find(metalicoId)   ?? find(DEFAULTS.metalico);
    const p = find(pergaminhoId) ?? find(DEFAULTS.pergaminho);

    const vars = buildThemeVars(f, m, p);

    const root = document.documentElement;
    for (const [prop, val] of Object.entries(vars)) root.style.setProperty(prop, val);
    document.body.classList.toggle('theme-dark-paper', p.darkPaper);
    // Notifica listeners de canvas (ex: radar) para redesenhar com as novas cores
    if (_onThemeUpdate) _onThemeUpdate();
}

function resetTheme() {
    const root = document.documentElement;
    // Remove todas as overrides inline — volta aos valores do :root do CSS
    THEME_CSS_PROPS.forEach(p => root.style.removeProperty(p));
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
let _onThemeUpdate   = null; // callback para redesenhar elementos canvas (ex: radar)

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

/** Registra callback chamado após cada mudança de tema (ex: redesenhar canvas do radar). */
export function setThemeUpdateFn(fn) {
    _onThemeUpdate = fn;
}
