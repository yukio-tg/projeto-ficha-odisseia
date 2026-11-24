export const MODO_REGRAS = 'regras';
export const MODO_LIVRE = 'livre';

export let sheetMode = MODO_REGRAS;

// O livro calcula nos dois modos. Regras trava os derivados e ignora o log de
// incrementos; Livre solta os derivados (o número digitado vira override) e
// aplica o log por cima da base. O flag segue no blob para saves antigos.
export let autoCalcEnabled = true;

// Campos que a fórmula preenche. O modo Regras os trava; o Livre os solta.
// Um recálculo pedido libera a escrita mesmo que tenham sido editados à mão.
export const CAMPOS_DERIVADOS = [
    'pv-total', 'mana-total', 'pt-total', 'la-total', 'inv-total', 'fe-total',
    'inertidao-base', 'dt-sab',
    'defesa', 'rd', 'deslocamento',
    'acoes-protagonistas', 'acoes-coesao', 'acoes-reacoes',
];

// Tracks fields that the user has manually edited (overriding auto-calc).
// Auto-calc functions will not overwrite these fields.
// Trocar de modo não apaga esta lista — só o recálculo pedido.
export const manualOverrides = new Set();

// Ações por nível: a tabela só escreve se o jogador não tiver editado à mão.
export const LEVEL_ACTION_FIELDS = ['acoes-protagonistas', 'acoes-coesao', 'acoes-reacoes'];

export function isModoRegras() {
    return sheetMode === MODO_REGRAS;
}

export function isModoLivre() {
    return sheetMode === MODO_LIVRE;
}

export function setSheetMode(mode) {
    sheetMode = mode === MODO_LIVRE ? MODO_LIVRE : MODO_REGRAS;
    autoCalcEnabled = true;
}

/** @deprecated Use setSheetMode. Não apaga overrides. */
export function setAutoCalcEnabled(val) {
    setSheetMode(val ? MODO_REGRAS : MODO_LIVRE);
}

/** Restaura o interruptor a partir do save sem apagar os overrides recém-carregados. */
export function restoreAutoCalcEnabled(val) {
    setSheetMode(val ? MODO_REGRAS : MODO_LIVRE);
}

/**
 * Fichas novas gravam sheetMode. Saves antigos: Regras, salvo autoCalcEnabled === false.
 * Não mexe em manualOverrides.
 */
export function restoreSheetMode(data) {
    const gravado = data?.sheetMode;
    if (gravado === MODO_LIVRE || gravado === MODO_REGRAS) {
        setSheetMode(gravado);
        return;
    }
    if (data?.autoCalcEnabled === false) {
        setSheetMode(MODO_LIVRE);
        return;
    }
    setSheetMode(MODO_REGRAS);
}

export function addManualOverride(field) {
    manualOverrides.add(field);
}

let _recalcDepth = 0;

export function isExplicitRecalc() {
    return _recalcDepth > 0;
}

export function beginExplicitRecalc() {
    _recalcDepth += 1;
}

export function endExplicitRecalc() {
    _recalcDepth = Math.max(0, _recalcDepth - 1);
}

// Recálculo de um campo só (incremento adicionado ou excluído, troca de modo).
// Enquanto ativo, só os campos do alvo podem ser escritos; os outros ficam.
let _alvoRecalc = null;

export function beginScopedRecalc(fields) {
    _alvoRecalc = new Set(fields || []);
    beginExplicitRecalc();
}

export function endScopedRecalc() {
    _alvoRecalc = null;
    endExplicitRecalc();
}

export function isScopedRecalc() {
    return _alvoRecalc !== null;
}

/** O recálculo pedido escreve por cima do número digitado. O automático, não. */
export function podeSobrescrever(field) {
    if (_alvoRecalc) return _alvoRecalc.has(field);
    if (isExplicitRecalc()) return true;
    return !manualOverrides.has(field);
}

export function liberarDerivadosParaRecalculo() {
    CAMPOS_DERIVADOS.forEach(field => manualOverrides.delete(field));
}

export function shouldWriteLevelAction(field) {
    if (_alvoRecalc) return _alvoRecalc.has(field);
    if (isExplicitRecalc()) return true;
    return !manualOverrides.has(field);
}

// ── Hidratação ────────────────────────────────────────────────────────────────
// Depth só zera depois dos eventos síncronos e dos timers conhecidos que a
// restauração dispara (0 ms do inventário, 60 ms do ficha:loaded).

let _hydrationDepth = 0;
const HYDRATION_RELEASE_MS = 80;

export function isHydrating() {
    return _hydrationDepth > 0;
}

export function beginHydration() {
    _hydrationDepth += 1;
}

export function endHydration() {
    setTimeout(() => {
        _hydrationDepth = Math.max(0, _hydrationDepth - 1);
    }, HYDRATION_RELEASE_MS);
}

// A rodada inicial de wireCalculations (600 ms) não pode recalcular por cima
// de uma ficha que acabou de ser restaurada. O flag vive até esse timeout.
let _sheetRestored = false;

export function noteSheetRestored() {
    _sheetRestored = true;
}

export function consumeSheetRestored() {
    const restored = _sheetRestored;
    _sheetRestored = false;
    return restored;
}

// Snapshot estável. Durante a hidratação o DOM está no meio da restauração;
// o save usa esta cópia em vez de fotografar um documento pela metade.
let _stableSnapshot = null;

export function setStableSnapshot(data) {
    _stableSnapshot = data;
}

export function getStableSnapshot() {
    return _stableSnapshot;
}
