// ui/incrementos-ui.js — Painel "Incrementos" e seletor no campo (modo Livre).
// O log é dado puro (core/incrementos.js). Aqui ficam o DOM e o recálculo por campo.
// Um alvo é a ficha (besta = null) ou uma besta (besta = id); cada um tem seu log.

import {
    CAMPOS_INCREMENTO,
    rotuloCampo,
    ehCampoComposto,
    partesCampo,
    TIPO_FLAT,
    TIPO_PCT,
    campoValido,
    ehManual,
    normalizarLog,
    getIncrementos,
    setIncrementos,
    somarIncrementos,
    incrementar,
    calcularFlatManual,
    aplicarAjusteManual,
    aplicarEdicao,
} from '../core/incrementos.js';
import {
    isModoLivre,
    isHydrating,
    manualOverrides,
    beginScopedRecalc,
    endScopedRecalc,
} from '../core/state.js';
import { ehLinhaDePoder, PREFIXO_ORIGEM_PODER } from '../core/efeitos-passivos.js';
import { getNivel, setRadarMaxPoints } from '../core/radar-service.js';
import { herancaAttrBonusAplicado } from '../core/heranca-logic.js';
import { calcStats, calcularVitais } from '../core/calculation.js';
import { reaplicarBonusProtecao, getBasesProtecaoLivro, storeBaseDeslocamento } from '../core/item-effects.js';
import { CAMPOS_BESTA } from '../core/besta-regras.js';
import { atualizarContadorProficiencia, atualizarPericias } from './skills.js';
import { refreshAllBars } from './vitals.js';
import { listarBestasIncrementos, atualizarIncrementosBesta } from './besta.js';

// Campos da ficha que a fórmula de cada incremento escreve.
const ALVOS = {
    pv:   ['pv-total', 'pv-atual'],
    pm:   ['mana-total', 'mana-atual'],
    fe:   ['fe-total', 'fe-atual'],
    pt:   ['pt-total'],
    la:   ['la-total', 'la-atual'],
    inv:  ['inv-total'],
    def:  ['defesa'],
    desl: ['deslocamento'],
    attr: [],
    skill: [],
};
const VIA_CALCSTATS = new Set(['pv', 'pm', 'fe', 'pt', 'la', 'inv']);
const VIA_PROTECAO = new Set(['def', 'desl']);

// Total digitado à mão que vira a linha de ajuste manual do campo.
const CAMPO_DO_INPUT = {
    'pv-total': 'pv',
    'mana-total': 'pm',
    'fe-total': 'fe',
    'pt-total': 'pt',
    'la-total': 'la',
    'inv-total': 'inv',
    'defesa': 'def',
    'deslocamento': 'desl',
};

const ANCORAS_FICHA = [
    ['#tab-geral .vital-card-hp .vital-bar, #tab-mesa .play-vital--hp', 'pv'],
    ['#tab-geral .vital-card-mana .vital-bar, #tab-mesa .play-vital--pm', 'pm'],
    ['#tab-geral .vital-card-fe .vital-bar', 'fe'],
    ['.total-pt:has([data-field="pt-total"])', 'pt'],
    ['.total-pt:has([data-field="la-total"])', 'la'],
    ['.total-inv:has([data-field="inv-total"])', 'inv'],
    ['#tab-geral .cstat-defesa .cstat-main-value', 'def'],
    ['#tab-geral .cstat-desl .cstat-main-value', 'desl'],
    ['#secao-radar .total-row', 'attr'],
    ['#tab-pericias .proficiencia-counter', 'skill'],
];

const ANCORAS_BESTA = [
    ['.vital-card-mana .vital-bar', 'pm'],
    ['.cstat-defesa .cstat-main-value', 'def'],
    ['.radar-column .total-row', 'attr'],
    ['.besta-proficiencia-counter', 'skill'],
    ['[data-bio-counter]', 'bio'],
];

const PAINEL_RECOLHIDO_KEY = 'ficha-incrementos-recolhido';
const PAINEL_POS_KEY = 'ficha-incrementos-pos';
const HOVER_ABRIR_MS = 220;
const HOVER_FECHAR_MS = 320;
const MARGEM_TELA = 4;

let _painel = null;
let _seletor = null;
let _aberto = null;          // { campo, besta }
let _ancoraAberta = null;
let _ancoraHover = null;
let _tipoEscolhido = TIPO_FLAT;
let _timerAbrir = null;
let _timerFechar = null;
let _ultimoPonteiro = 'mouse';

function somenteLeitura() {
    return document.body.classList.contains('mode-readonly');
}

function avisarMudanca() {
    document.dispatchEvent(new Event('ficha:changed', { bubbles: true }));
}

function formatarNumero(valor) {
    return Number.isInteger(valor) ? String(valor) : String(Math.round(valor * 100) / 100).replace('.', ',');
}

function formatarValor(tipo, valor) {
    const sinal = valor > 0 ? '+' : '';
    const n = formatarNumero(valor);
    return tipo === TIPO_PCT ? `${sinal}${n}%` : `${sinal}${n}`;
}

function isMonstro() {
    return document.querySelector('[data-field="monstro"]')?.checked ?? false;
}

function alvosDoCampo(campo) {
    const alvos = [...(ALVOS[campo] || [])];
    // Monstro: PM = PV + metade do PM base, então o PV arrasta o PM.
    if (campo === 'pv' && isMonstro()) alvos.push(...ALVOS.pm);
    return alvos;
}

// ── Recálculo por campo ──────────────────────────────────────────────────────

function herancaTetoBonus() {
    return Object.values(herancaAttrBonusAplicado).reduce((a, b) => a + (Number(b) || 0), 0);
}

/** Teto do radar: 10 + nível + herança (livro), com a camada do modo Livre. */
export function sincronizarTetoAtributos() {
    const livro = 10 + getNivel() + herancaTetoBonus();
    setRadarMaxPoints(Math.max(0, incrementar('attr', livro)));
}

/**
 * Aplica a fórmula só nos campos pedidos. Os outros campos ficam como estão.
 * O total recalculado deixa de ser override manual: a camada passa a valer.
 */
export function recalcularCampos(camposPedidos) {
    if (isHydrating()) return;
    // Campos compostos viram os campos de base que eles movem.
    // Atributo mexe em PV, PM, FÉ, PT, LA, inventário e Defesa; todos os compostos mexem nas perícias.
    const campos = [];
    let pericias = false;
    (camposPedidos || []).forEach(c => {
        if (!ehCampoComposto(c)) { campos.push(c); return; }
        pericias = true;
        if (partesCampo(c).prefixo === 'atributo') campos.push('pv', 'pm', 'fe', 'pt', 'la', 'inv', 'def');
    });
    if (pericias) {
        recalcularCamposBase(campos);
        atualizarPericias(true);
        return;
    }
    recalcularCamposBase(campos);
}

function recalcularCamposBase(campos) {
    if (isHydrating()) return;
    const lista = Array.from(new Set(campos || [])).filter(campoValido);
    if (!lista.length) return;

    const alvos = new Set();
    lista.forEach(c => alvosDoCampo(c).forEach(f => alvos.add(f)));
    alvos.forEach(f => {
        if (!f.endsWith('-atual')) manualOverrides.delete(f);
    });

    beginScopedRecalc(alvos);
    try {
        if (lista.some(c => VIA_CALCSTATS.has(c))) calcStats();
        if (lista.some(c => VIA_PROTECAO.has(c))) reaplicarBonusProtecao();
    } finally {
        endScopedRecalc();
    }
    if (lista.includes('attr')) sincronizarTetoAtributos();
    if (lista.includes('skill')) atualizarContadorProficiencia();
    refreshAllBars();
}

export function camposDoLog() {
    return Array.from(new Set(getIncrementos().map(l => l.campo)));
}

// ── Log por alvo ─────────────────────────────────────────────────────────────

function logDoAlvo(besta) {
    if (!besta) return getIncrementos();
    return listarBestasIncrementos().find(x => x.id === besta)?.incrementos || [];
}

function gravarLog(besta, log, campos) {
    if (besta) {
        atualizarIncrementosBesta(besta, log, campos);
        return;
    }
    setIncrementos(log);
    recalcularCampos(campos);
}

function campoPermitido(campo, besta) {
    if (!campoValido(campo)) return false;
    if (besta) return CAMPOS_BESTA.includes(campo);
    return campo !== 'bio';
}

function nomeDoAlvo(besta) {
    if (!besta) return '';
    return listarBestasIncrementos().find(x => x.id === besta)?.nome || 'Besta';
}

/** Depois de qualquer mudança no log: painel, resumo do seletor e autosave. */
function concluirMudanca() {
    renderizarPainel();
    atualizarResumoSeletor();
    avisarMudanca();
}

// ── Ajuste manual ────────────────────────────────────────────────────────────

function baseDoLivro(campo) {
    if (VIA_CALCSTATS.has(campo)) {
        const v = calcularVitais();
        return v ? v.base[campo] : null;
    }
    if (VIA_PROTECAO.has(campo)) return getBasesProtecaoLivro()[campo];
    return null;
}

/**
 * Livre: o total digitado à mão vira uma linha flat relativa à base do livro.
 * Sem base (classe sem fórmula, Fé inativa), o número fica como override, como antes.
 */
function registrarAjusteManualFicha(field, el) {
    const campo = CAMPO_DO_INPUT[field];
    const base = baseDoLivro(campo);
    if (base == null) return false;
    const texto = String(el.value ?? '').trim();
    const log = getIncrementos();
    const flat = texto === '' ? 0 : calcularFlatManual(parseFloat(texto.replace(',', '.')), base, log, campo);
    if (flat === null) return false;
    gravarLog(null, aplicarAjusteManual(log, campo, flat), [campo]);
    return true;
}

function ligarAjusteManual() {
    document.addEventListener('focusin', (e) => {
        if (e.target?.dataset?.field === 'deslocamento' && isModoLivre()) storeBaseDeslocamento();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const el = e.target;
        const field = el?.dataset?.field;
        if (!field || !CAMPO_DO_INPUT[field] || el.closest?.('#tab-besta')) return;
        if (!isModoLivre() || somenteLeitura()) return;
        e.preventDefault();
        el.blur();
    });
    document.addEventListener('change', (e) => {
        const el = e.target;
        const field = el?.dataset?.field;
        if (!field || !CAMPO_DO_INPUT[field] || el.closest?.('#tab-besta')) return;
        if (!isModoLivre() || isHydrating() || somenteLeitura()) return;
        // Só o que o jogador digitou: o input confiável marca o override antes do change.
        if (!manualOverrides.has(field)) return;
        if (registrarAjusteManualFicha(field, el)) concluirMudanca();
    });
    document.addEventListener('incrementos:mudou', () => {
        renderizarPainel();
        atualizarResumoSeletor();
    });
}

// ── Painel ───────────────────────────────────────────────────────────────────

function criarIcone(nome) {
    const s = document.createElement('span');
    s.className = 'material-symbols-outlined';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = nome;
    return s;
}

function lerStorage(chave) {
    try { return localStorage.getItem(chave); } catch { return null; }
}

function gravarStorage(chave, valor) {
    try { localStorage.setItem(chave, valor); } catch { /* sem storage */ }
}

// Sem preferência gravada, o painel começa recolhido no celular.
function painelRecolhido() {
    const salvo = lerStorage(PAINEL_RECOLHIDO_KEY);
    if (salvo === '1' || salvo === '0') return salvo === '1';
    return window.matchMedia('(max-width: 600px)').matches;
}

function aplicarRecolhido(recolhido) {
    if (!_painel) return;
    _painel.classList.toggle('is-collapsed', recolhido);
    const btn = _painel.querySelector('.incr-panel__toggle');
    btn?.setAttribute('aria-expanded', recolhido ? 'false' : 'true');
    btn?.setAttribute('title', recolhido ? 'Abrir incrementos' : 'Recolher incrementos');
    btn?.setAttribute('aria-label', recolhido ? 'Abrir incrementos' : 'Recolher incrementos');
    const chev = _painel.querySelector('.incr-panel__chevron');
    if (chev) chev.textContent = recolhido ? 'expand_less' : 'expand_more';
}

// ── Arrastar ─────────────────────────────────────────────────────────────────

function limiteInferior() {
    const nav = document.getElementById('mobile-nav');
    if (nav && getComputedStyle(nav).display !== 'none') {
        return Math.min(window.innerHeight, nav.getBoundingClientRect().top);
    }
    return window.innerHeight;
}

function lerPosicao() {
    try {
        const p = JSON.parse(lerStorage(PAINEL_POS_KEY) || 'null');
        if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) return p;
    } catch { /* posição inválida */ }
    return null;
}

/** Coloca o painel em (x, y), dentro da área visível. Devolve a posição usada. */
function moverPainel(x, y) {
    const r = _painel.getBoundingClientRect();
    const maxX = Math.max(MARGEM_TELA, window.innerWidth - r.width - MARGEM_TELA);
    const maxY = Math.max(MARGEM_TELA, limiteInferior() - r.height - MARGEM_TELA);
    const nx = Math.round(Math.min(Math.max(MARGEM_TELA, x), maxX));
    const ny = Math.round(Math.min(Math.max(MARGEM_TELA, y), maxY));
    _painel.style.left = `${nx}px`;
    _painel.style.top = `${ny}px`;
    _painel.style.right = 'auto';
    _painel.style.bottom = 'auto';
    return { x: nx, y: ny };
}

function reposicionarPainel() {
    if (!_painel || _painel.hidden) return;
    const pos = lerPosicao();
    if (pos) moverPainel(pos.x, pos.y);
}

function ligarArrasto(handle) {
    let arrasto = null;
    handle.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('button, input, select')) return;
        const r = _painel.getBoundingClientRect();
        arrasto = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top };
        try { handle.setPointerCapture(e.pointerId); } catch { /* ponteiro já solto */ }
        _painel.classList.add('is-dragging');
        e.preventDefault();
    });
    handle.addEventListener('pointermove', (e) => {
        if (!arrasto || e.pointerId !== arrasto.id) return;
        moverPainel(e.clientX - arrasto.dx, e.clientY - arrasto.dy);
    });
    const soltar = (e) => {
        if (!arrasto || e.pointerId !== arrasto.id) return;
        arrasto = null;
        _painel.classList.remove('is-dragging');
        const r = _painel.getBoundingClientRect();
        gravarStorage(PAINEL_POS_KEY, JSON.stringify(moverPainel(r.left, r.top)));
    };
    handle.addEventListener('pointerup', soltar);
    handle.addEventListener('pointercancel', soltar);
}

function criarPainel() {
    const painel = document.createElement('aside');
    painel.id = 'incr-panel';
    painel.className = 'incr-panel';
    painel.setAttribute('aria-label', 'Incrementos');
    painel.hidden = true;

    const head = document.createElement('div');
    head.className = 'incr-panel__head';
    head.title = 'Arraste para mover';
    const grip = criarIcone('drag_indicator');
    grip.classList.add('incr-panel__grip');
    const titulo = document.createElement('span');
    titulo.className = 'incr-panel__title';
    titulo.textContent = 'Incrementos';
    const count = document.createElement('span');
    count.className = 'incr-panel__count';
    count.textContent = '0';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'incr-panel__toggle';
    const chev = criarIcone('expand_more');
    chev.classList.add('incr-panel__chevron');
    toggle.appendChild(chev);
    toggle.addEventListener('click', () => {
        const recolhido = !_painel.classList.contains('is-collapsed');
        gravarStorage(PAINEL_RECOLHIDO_KEY, recolhido ? '1' : '0');
        aplicarRecolhido(recolhido);
        reposicionarPainel();
    });
    head.append(grip, titulo, count, toggle);
    ligarArrasto(head);

    const body = document.createElement('div');
    body.className = 'incr-panel__body';
    const list = document.createElement('ul');
    list.className = 'incr-panel__list';
    const vazio = document.createElement('p');
    vazio.className = 'incr-panel__empty';
    vazio.textContent = 'Nenhum incremento. Passe o mouse (ou toque) em PV, PM, Defesa ou outro total para adicionar, ou digite o número no campo.';
    body.append(list, vazio);

    // Editar no painel não é campo da ficha: o autosave só vê o commit.
    ['input', 'change'].forEach(t => list.addEventListener(t, e => e.stopPropagation()));

    list.addEventListener('click', (e) => {
        const btn = e.target.closest('.incr-row__del');
        if (!btn || somenteLeitura()) return;
        const row = btn.closest('.incr-row');
        const besta = row.dataset.besta || null;
        const log = logDoAlvo(besta);
        const linha = log.find(l => l.id === row.dataset.id);
        if (!linha) return;
        gravarLog(besta, log.filter(l => l.id !== linha.id), [linha.campo]);
        concluirMudanca();
    });

    list.addEventListener('change', (e) => {
        const row = e.target.closest('.incr-row');
        if (!row || somenteLeitura()) return;
        const besta = row.dataset.besta || null;
        const patch = {};
        if (e.target.classList.contains('incr-row__tipo')) patch.tipo = e.target.value;
        else if (e.target.classList.contains('incr-row__valor')) {
            const v = Number(String(e.target.value).replace(',', '.'));
            if (!Number.isFinite(v)) { renderizarPainel(); return; }
            patch.valor = v;
        } else return;
        gravarLog(besta, aplicarEdicao(logDoAlvo(besta), row.dataset.id, patch), [row.dataset.campo]);
        concluirMudanca();
    });

    list.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('incr-row__valor')) {
            e.preventDefault();
            e.target.blur();
        }
    });

    painel.append(head, body);
    document.body.appendChild(painel);
    return painel;
}

function criarLinha(l, besta, nomeBesta) {
    const li = document.createElement('li');
    li.className = 'incr-row';
    li.dataset.id = l.id;
    li.dataset.campo = l.campo;
    if (besta) li.dataset.besta = besta;

    const meta = rotuloCampo(l.campo);
    const rotulo = document.createElement('span');
    rotulo.className = 'incr-row__campo';
    const nome = document.createElement('span');
    nome.className = 'incr-row__nome';
    nome.textContent = besta ? `${nomeBesta} · ${meta?.rotulo || l.campo}` : (meta?.rotulo || l.campo);
    nome.title = besta ? `${nomeBesta} — ${meta?.nome || ''}` : (meta?.nome || '');
    rotulo.appendChild(nome);
    if (ehManual(l)) {
        const tag = document.createElement('span');
        tag.className = 'incr-row__tag';
        tag.textContent = 'ajuste manual';
        rotulo.appendChild(tag);
    } else if (ehLinhaDePoder(l)) {
        const tag = document.createElement('span');
        tag.className = 'incr-row__tag';
        tag.textContent = l.origem.slice(PREFIXO_ORIGEM_PODER.length);
        rotulo.appendChild(tag);
    }

    const tipo = document.createElement('select');
    tipo.className = 'incr-row__tipo';
    tipo.setAttribute('aria-label', 'Tipo do incremento');
    [[TIPO_FLAT, 'Flat'], [TIPO_PCT, '%']].forEach(([v, t]) => {
        const o = document.createElement('option');
        o.value = v;
        o.textContent = t;
        o.selected = l.tipo === v;
        tipo.appendChild(o);
    });

    const valor = document.createElement('input');
    valor.type = 'number';
    valor.step = 'any';
    valor.inputMode = 'decimal';
    valor.className = 'incr-row__valor';
    valor.value = String(l.valor);
    valor.setAttribute('aria-label', `Valor do incremento ${nome.textContent}`);

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'incr-row__del';
    del.title = 'Excluir este incremento';
    del.setAttribute('aria-label', `Excluir incremento ${nome.textContent} ${formatarValor(l.tipo, l.valor)}`);
    del.appendChild(criarIcone('delete'));

    li.append(rotulo, tipo, valor, del);
    return li;
}

export function renderizarPainel() {
    if (!_painel) return;
    const linhas = getIncrementos().map(l => criarLinha(l, null, ''));
    listarBestasIncrementos().forEach(b => {
        b.incrementos.forEach(l => linhas.push(criarLinha(l, b.id, b.nome)));
    });
    const list = _painel.querySelector('.incr-panel__list');
    list.replaceChildren(...linhas);
    _painel.querySelector('.incr-panel__count').textContent = String(linhas.length);
    _painel.querySelector('.incr-panel__empty').hidden = linhas.length > 0;
    // O log vale nos dois modos. No Livre o painel fica sempre; no Regras só aparece se houver linhas.
    _painel.hidden = !(isModoLivre() || linhas.length > 0);
    reposicionarPainel();
}

// ── Seletor no campo ─────────────────────────────────────────────────────────

function criarSeletor() {
    const el = document.createElement('div');
    el.id = 'incr-picker';
    el.className = 'incr-picker';
    el.setAttribute('role', 'dialog');
    el.hidden = true;
    el.innerHTML = `
        <div class="incr-picker__head">
            <span class="incr-picker__campo"></span>
            <span class="incr-picker__nome"></span>
            <button type="button" class="incr-picker__close" aria-label="Fechar"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
        </div>
        <div class="incr-picker__row">
            <input type="number" class="incr-picker__valor" step="any" inputmode="decimal" placeholder="+0" aria-label="Valor do incremento">
            <div class="incr-picker__tipo" role="group" aria-label="Tipo">
                <button type="button" data-tipo="flat" aria-pressed="true">Flat</button>
                <button type="button" data-tipo="pct" aria-pressed="false">%</button>
            </div>
        </div>
        <div class="incr-picker__actions">
            <button type="button" class="incr-picker__add"><span class="material-symbols-outlined" aria-hidden="true">add</span>Adicionar</button>
            <button type="button" class="incr-picker__remove" title="Remove todos os incrementos deste campo"><span class="material-symbols-outlined" aria-hidden="true">remove</span>Remover</button>
        </div>
        <div class="incr-picker__resumo"></div>
    `;

    // O input do seletor não é campo da ficha: não pode disparar o autosave.
    ['input', 'change'].forEach(t => el.addEventListener(t, e => e.stopPropagation()));

    el.querySelectorAll('.incr-picker__tipo button').forEach(btn => {
        btn.addEventListener('click', () => escolherTipo(btn.dataset.tipo));
    });
    el.querySelector('.incr-picker__add').addEventListener('click', confirmarAdicao);
    el.querySelector('.incr-picker__remove').addEventListener('click', removerDoCampoAberto);
    el.querySelector('.incr-picker__close').addEventListener('click', () => fecharSeletor());
    el.querySelector('.incr-picker__valor').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); confirmarAdicao(); }
    });
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.stopPropagation(); fecharSeletor(); }
    });
    el.addEventListener('pointerenter', () => clearTimeout(_timerFechar));
    el.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'mouse') agendarFechar();
    });

    document.body.appendChild(el);
    return el;
}

function escolherTipo(tipo) {
    _tipoEscolhido = tipo === TIPO_PCT ? TIPO_PCT : TIPO_FLAT;
    _seletor?.querySelectorAll('.incr-picker__tipo button').forEach(b => {
        b.setAttribute('aria-pressed', b.dataset.tipo === _tipoEscolhido ? 'true' : 'false');
    });
}

function atualizarResumoSeletor() {
    if (!_seletor || !_aberto) return;
    const { flat, pct } = somarIncrementos(logDoAlvo(_aberto.besta), _aberto.campo);
    const partes = [];
    if (flat) partes.push(formatarValor(TIPO_FLAT, flat));
    if (pct) partes.push(formatarValor(TIPO_PCT, pct));
    _seletor.querySelector('.incr-picker__resumo').textContent = partes.length
        ? `Neste campo: ${partes.join(' · ')}`
        : 'Sem incremento neste campo.';
    _seletor.querySelector('.incr-picker__remove').disabled = partes.length === 0;
}

function posicionarSeletor() {
    if (!_seletor || _seletor.hidden || !_ancoraAberta) return;
    if (window.matchMedia('(max-width: 600px)').matches) {
        _seletor.style.top = '';
        _seletor.style.left = '';
        return;
    }
    const r = _ancoraAberta.getBoundingClientRect();
    const w = _seletor.offsetWidth;
    const h = _seletor.offsetHeight;
    const margem = 8;
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - margem) top = Math.max(margem, r.top - h - 6);
    let left = r.left + r.width / 2 - w / 2;
    left = Math.min(Math.max(margem, left), window.innerWidth - w - margem);
    _seletor.style.top = `${Math.round(top)}px`;
    _seletor.style.left = `${Math.round(left)}px`;
}

function abrirSeletor(ancora) {
    const { el, campo, besta } = ancora;
    if (!isModoLivre() || somenteLeitura() || !campoPermitido(campo, besta)) return;
    clearTimeout(_timerFechar);
    if (_aberto?.campo !== campo || _aberto?.besta !== besta) {
        _seletor.querySelector('.incr-picker__valor').value = '';
        escolherTipo(TIPO_FLAT);
    }
    _aberto = { campo, besta };
    _ancoraAberta?.classList.remove('incr-anchor--open');
    _ancoraAberta = el;
    el.classList.add('incr-anchor--open');
    const meta = CAMPOS_INCREMENTO[campo];
    const dono = nomeDoAlvo(besta);
    _seletor.querySelector('.incr-picker__campo').textContent = meta.rotulo;
    _seletor.querySelector('.incr-picker__nome').textContent = dono ? `${dono} — ${meta.nome}` : meta.nome;
    _seletor.setAttribute('aria-label', `Incremento de ${meta.nome}${dono ? ` (${dono})` : ''}`);
    atualizarResumoSeletor();
    _seletor.hidden = false;
    posicionarSeletor();
}

export function fecharSeletor() {
    clearTimeout(_timerAbrir);
    clearTimeout(_timerFechar);
    if (_seletor) _seletor.hidden = true;
    _ancoraAberta?.classList.remove('incr-anchor--open');
    _ancoraAberta = null;
    _aberto = null;
}

function agendarFechar() {
    clearTimeout(_timerFechar);
    _timerFechar = setTimeout(() => {
        if (_seletor?.contains(document.activeElement)) return;
        fecharSeletor();
    }, HOVER_FECHAR_MS);
}

function confirmarAdicao() {
    if (!_aberto || somenteLeitura()) return;
    const input = _seletor.querySelector('.incr-picker__valor');
    const valor = Number(String(input.value).replace(',', '.'));
    if (!Number.isFinite(valor) || valor === 0) {
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return;
    }
    input.removeAttribute('aria-invalid');
    const { campo, besta } = _aberto;
    const log = logDoAlvo(besta);
    gravarLog(besta, normalizarLog([...log, { campo, tipo: _tipoEscolhido, valor }]), [campo]);
    input.value = '';
    concluirMudanca();
}

function removerDoCampoAberto() {
    if (!_aberto || somenteLeitura()) return;
    const { campo, besta } = _aberto;
    const log = logDoAlvo(besta);
    const resto = log.filter(l => l.campo !== campo);
    if (resto.length === log.length) return;
    gravarLog(besta, resto, [campo]);
    concluirMudanca();
}

function resolverAncora(target) {
    if (!target?.closest) return null;
    const inst = target.closest('#tab-besta .besta-instance');
    const lista = inst ? ANCORAS_BESTA : ANCORAS_FICHA;
    for (const [sel, campo] of lista) {
        const el = target.closest(sel);
        if (el && (!inst || inst.contains(el))) return { el, campo, besta: inst ? inst.dataset.bestaId : null };
    }
    return null;
}

function marcarHover(el) {
    if (_ancoraHover === el) return;
    _ancoraHover?.classList.remove('incr-anchor--hover');
    _ancoraHover = el;
    el?.classList.add('incr-anchor--hover');
}

function ligarAncoras() {
    document.addEventListener('pointerdown', (e) => {
        _ultimoPonteiro = e.pointerType || 'mouse';
        if (!_seletor || _seletor.hidden) return;
        if (_seletor.contains(e.target)) return;
        if (resolverAncora(e.target)?.el === _ancoraAberta) return;
        fecharSeletor();
    }, true);

    document.addEventListener('pointerover', (e) => {
        if (e.pointerType !== 'mouse' || !isModoLivre()) return;
        const ancora = resolverAncora(e.target);
        if (!ancora || !campoPermitido(ancora.campo, ancora.besta)) return;
        marcarHover(ancora.el);
        clearTimeout(_timerFechar);
        if (ancora.el === _ancoraAberta) return;
        clearTimeout(_timerAbrir);
        _timerAbrir = setTimeout(() => abrirSeletor(ancora), HOVER_ABRIR_MS);
    });

    document.addEventListener('pointerout', (e) => {
        if (e.pointerType !== 'mouse') return;
        const ancora = resolverAncora(e.target);
        if (!ancora || ancora.el.contains(e.relatedTarget)) return;
        marcarHover(null);
        clearTimeout(_timerAbrir);
        if (ancora.el === _ancoraAberta) agendarFechar();
    });

    // Toque: um toque no campo abre o seletor.
    document.addEventListener('click', (e) => {
        if (_ultimoPonteiro === 'mouse' || !isModoLivre()) return;
        const ancora = resolverAncora(e.target);
        if (!ancora) return;
        abrirSeletor(ancora);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && _seletor && !_seletor.hidden) fecharSeletor();
    });

    const reposicionar = () => requestAnimationFrame(() => {
        posicionarSeletor();
        reposicionarPainel();
    });
    window.addEventListener('resize', reposicionar);
    document.addEventListener('scroll', () => requestAnimationFrame(posicionarSeletor), true);
}

/** Painel e seletor só existem no modo Livre. Chamado a cada sync do modo. */
export function syncIncrementosUi() {
    const livre = isModoLivre();
    document.body.classList.toggle('modo-livre', livre);
    if (!livre) {
        fecharSeletor();
        marcarHover(null);
    }
    renderizarPainel();
    reposicionarPainel();
}

export function initIncrementosUi() {
    if (_painel) return;
    _painel = criarPainel();
    _seletor = criarSeletor();
    aplicarRecolhido(painelRecolhido());
    ligarAncoras();
    ligarAjusteManual();
    document.addEventListener('ficha:modo-sync', syncIncrementosUi);
    syncIncrementosUi();
}
