import { getNivel, getAtributoTotal } from './radar-service.js';
import { autoCalcEnabled, manualOverrides } from './state.js';
import { refreshAllBars } from '../ui/vitals.js';

export const INERTIDAO_TAMANHO = {
    'tam-minusculo': 0,
    'tam-pequeno': 4,
    'tam-medio': 7,
    'tam-grande': 10,
    'tam-enorme': 13,
    'tam-colossal': 17
};

export function atualizarInertidao() {
    if (!autoCalcEnabled) return;
    if (manualOverrides.has('inertidao-base')) return;
    const nivel = getNivel();
    const tamanho = document.querySelector('[data-field="tamanho"]')?.value || 'tam-medio';
    const bonus = INERTIDAO_TAMANHO[tamanho] ?? 7;
    const input = document.querySelector('[data-field="inertidao-base"]');
    if (input) input.value = nivel + bonus;
}

export function atualizarDtSab() {
    if (!autoCalcEnabled) return;
    if (manualOverrides.has('dt-sab')) return;
    const nivel = getNivel();
    const sab = getAtributoTotal('SAB');
    const valor = 10 + Math.floor(nivel / 2) + sab;
    const input = document.querySelector('[data-field="dt-sab"]');
    if (input) input.value = valor;
}

const FORMULAS = {
    'coração': { pv: { base: 23, per: 4 }, pm: { base: 2, per: 1 }, pt: { base: 2, per: 1 }, inv: (f) => 7 + f, la: (s) => s, laPer: 0 },
    'arcanista': { pv: { base: 13, per: 2 }, pm: { base: 8, per: 3 }, pt: { base: 6, per: 3 }, inv: (f) => 2 + f, la: (s) => 3 + s, laPer: (s) => 2 + (s / 2) },
    'certeiro': { pv: { base: 13, per: 2 }, pm: { base: 5, per: 2 }, pt: { base: 6, per: 3 }, inv: (f) => 2 + f, la: (s) => s, laPer: (s) => s / 2 },
    'terrível': { pv: { base: 18, per: 3 }, pm: { base: 5, per: 2 }, pt: { base: 4, per: 2 }, inv: (f) => 5 + f, la: (s) => s, laPer: (s) => s / 2 },
    'feromântico': { pv: { base: 18, per: 3 }, pm: { base: 8, per: 3 }, pt: { base: 4, per: 2 }, inv: (f) => 5 + f, la: (s) => 3 + s, laPer: (s) => 1 + (s / 2) },
    'teurgista': { pv: { base: 13, per: 2 }, pm: { base: 8, per: 3 }, pt: { base: 4, per: 2 }, inv: (f) => 5 + f, la: (s) => 3 + s, laPer: (s) => 1 + (s / 2) },
    'engenhoso': { pv: { base: 13, per: 2 }, pm: { base: 5, per: 2 }, pt: { base: 6, per: 3 }, inv: (f) => 7 + f, la: (s) => s, laPer: (s) => s / 2 },
    'treinador': { pv: { base: 13, per: 2 }, pm: { base: 5, per: 2 }, pt: { base: 6, per: 3 }, inv: (f) => 5 + f, la: (s) => s, laPer: (s) => s / 2 }
};

export const calculatedLimits = { pt: 0, inv: 0, la: 0 };

function getClasseNormalizada() {
    const input = document.querySelector('[data-field="classe-nome"]');
    return input ? input.value.trim().toLowerCase() : '';
}

// ========== FUNÇÃO ATUALIZAR VITAL MODIFICADA ==========
// skipAtualUpdate: quando true, não sobrescreve o campo "atual"
function atualizarVital(prefix, maxVal, skipAtualUpdate = false) {
    const atualInput = document.querySelector(`[data-field="${prefix}-atual"]`);
    const maxInput = document.querySelector(`[data-field="${prefix}-total"]`);
    if (!atualInput || !maxInput) return;
    const oldMax = parseInt(maxInput.value) || 0;
    const oldAtual = parseInt(atualInput.value) || 0;

    const totalManual = manualOverrides.has(`${prefix}-total`);
    const atualManual = manualOverrides.has(`${prefix}-atual`);

    // Effective max: use manually-set value if overridden, otherwise the computed one
    const effectiveMax = totalManual ? oldMax : maxVal;

    if (!atualManual) {
        if (!skipAtualUpdate) {
            // Comportamento original: se estava cheio ou zerado, atualiza para o novo máximo
            if (oldAtual === oldMax || (oldMax === 0 && oldAtual === 0)) {
                atualInput.value = effectiveMax;
            } else if (oldAtual > effectiveMax) {
                atualInput.value = effectiveMax;
            }
        } else {
            // Para PT: só assegura que atual não seja negativo e não ultrapasse novo máximo
            if (oldAtual > effectiveMax) atualInput.value = effectiveMax;
            if (oldAtual < 0) atualInput.value = 0;
        }
    }

    if (!totalManual) {
        maxInput.value = maxVal;
    }
}

// ---------- Controle de classe de overflow do PT ----------
function verificarPtOverflow() {
    const container = document.querySelector('.total-pt');
    if (!container) return;
    const atualInput = document.querySelector('[data-field="pt-atual"]');
    const totalInput = document.querySelector('[data-field="pt-total"]');
    if (!atualInput || !totalInput) return;
    const atual = parseInt(atualInput.value) || 0;
    const total = parseInt(totalInput.value) || 0;
    if (atual > total) {
        container.classList.add('pt-over-limit');
    } else {
        container.classList.remove('pt-over-limit');
    }
}

// Configura observadores para mudanças nos campos de PT
function bindPtOverflowWatcher() {
    const atualInput = document.querySelector('[data-field="pt-atual"]');
    const totalInput = document.querySelector('[data-field="pt-total"]');
    if (atualInput) {
        atualInput.addEventListener('input', verificarPtOverflow);
        // Para caso o valor seja alterado programaticamente, disparar manualmente
        const observer = new MutationObserver(() => verificarPtOverflow());
        observer.observe(atualInput, { attributes: true, attributeFilter: ['value'] });
    }
    if (totalInput) {
        totalInput.addEventListener('input', verificarPtOverflow);
        const observer = new MutationObserver(() => verificarPtOverflow());
        observer.observe(totalInput, { attributes: true, attributeFilter: ['value'] });
    }
    verificarPtOverflow(); // executa uma vez no início
}

// ========== FUNÇÕES DE VISIBILIDADE ==========
export function updateVisibilityByLevel() {
    const nivel = getNivel();
    const ramoFieldset = document.querySelector('fieldset:has([data-field="ramo-nome"])');
    const indivFieldset = document.querySelector('fieldset:has([data-field="individualidade-nome"])');
    if (ramoFieldset) ramoFieldset.style.display = nivel >= 2 ? '' : 'none';
    if (indivFieldset) indivFieldset.style.display = nivel >= 3 ? '' : 'none';
}

export function updateFeVisibility() {
    const alinhamento = document.querySelector('[data-field="alinhamento-nome"]')?.value.trim().toLowerCase() || 'nenhum';
    const feCard = document.querySelector('.vital-card-fe');
    if (!feCard) return;
    if (alinhamento === 'nenhum') {
        feCard.style.display = 'none';
    } else {
        feCard.style.display = '';
    }
    calcStats();
}

// ========== CÁLCULO PRINCIPAL ==========
export function calcStats() {
    if (!autoCalcEnabled) return;
    const classe = getClasseNormalizada();
    const formulas = FORMULAS[classe];
    if (!formulas) return;

    const nivel = getNivel();
    const con = getAtributoTotal('CON');
    const car = getAtributoTotal('CAR');
    const int = getAtributoTotal('INT');
    const sab = getAtributoTotal('SAB');
    const forc = getAtributoTotal('FOR');

    let pvMax = Math.floor(formulas.pv.base + con + nivel * (formulas.pv.per + con / 2));
    let pmBase = Math.floor(formulas.pm.base + car + nivel * (formulas.pm.per + car / 2));
    let ptMax = Math.floor(formulas.pt.base + int + nivel * (formulas.pt.per + int / 2));
    let laMax;
    if (typeof formulas.la === 'function') {
        const baseLa = formulas.la(sab, nivel);
        const perLa = typeof formulas.laPer === 'function' ? formulas.laPer(sab, nivel) : (formulas.laPer || 0);
        laMax = Math.floor(baseLa + nivel * perLa);
    } else {
        laMax = Math.floor(formulas.la + nivel * (formulas.laPer || 0));
    }
    let invMax = 0;
    const forca = getAtributoTotal('FOR');
    const classeInv = getClasseNormalizada();

    if (classeInv === 'coração' || classeInv === 'engenhoso') {
        invMax = 7 + forca;
    } else if (classeInv === 'terrível' || classeInv === 'teurgista' || classeInv === 'feromântico') {
        invMax = 5 + forca;
    } else if (classeInv === 'treinador' || classeInv === 'arcanista' || classeInv === 'certeiro') {
        invMax = 2 + forca;
    } else {
        // fallback (caso classe não reconhecida) – usa o antigo ou 5+FOR
        invMax = 5 + forca;
    }

    // Atualiza o campo total na interface e dispara evento
    const invTotalInput = document.querySelector('[data-field="inv-total"]');
    if (invTotalInput && !manualOverrides.has('inv-total')) {
        invTotalInput.value = invMax;
        invTotalInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    // Exporta o limite para outros módulos (ex: inventory.js) — sempre atualiza o limite interno
    calculatedLimits.inv = invMax;

    const alinhamento = document.querySelector('[data-field="alinhamento-nome"]')?.value.trim().toLowerCase() || 'nenhum';
    const feAtivo = alinhamento !== 'nenhum';
    const feCard = document.querySelector('.vital-card-fe');
    if (feCard) feCard.style.display = feAtivo ? '' : 'none';

    const isMonstro = document.querySelector('[data-field="monstro"]')?.checked ?? false;
    const pvCard = document.querySelector('.vital-card-hp');
    if (pvCard) pvCard.style.display = isMonstro ? 'none' : '';

    let pmMax, feMax;
    if (isMonstro) {
        // Novo PM = PV_normal + floor(pmBase / 2)
        // Se feAtivo, subtrai feMax (calculado normalmente) do resultado
        if (feAtivo) {
            feMax = pmBase - Math.floor(pmBase / 2);
            pmMax = pvMax + Math.floor(pmBase / 2) - feMax;
        } else {
            pmMax = pvMax + Math.floor(pmBase / 2);
            feMax = 0;
        }
        // Ainda atualiza PV nos campos (ocultos) para preservar o valor
        atualizarVital('pv', pvMax);
    } else {
        if (feAtivo) {
            pmMax = Math.floor(pmBase / 2);
            feMax = pmBase - pmMax;
        } else {
            pmMax = pmBase;
            feMax = 0;
        }
        atualizarVital('pv', pvMax);
    }

    atualizarVital('mana', pmMax);

    // ===== TRATAMENTO ESPECIAL PARA PT =====
    // Só atualiza o total e garante que o atual não ultrapasse o novo máximo
    // mas NÃO sobrescreve o atual com o máximo (o atual é controlado pelos cards de poder)
    const ptTotalInput = document.querySelector('[data-field="pt-total"]');
    if (ptTotalInput && !manualOverrides.has('pt-total')) {
        ptTotalInput.value = ptMax;
    }
    calculatedLimits.pt = ptMax;
    calculatedLimits.inv = invMax;
    calculatedLimits.la = laMax;

    // ===== TRATAMENTO ESPECIAL PARA LA =====
    const laTotalInput = document.querySelector('[data-field="la-total"]');
    if (laTotalInput && !manualOverrides.has('la-total')) {
        laTotalInput.value = laMax;
        // Dispara evento 'input' para que o watcher de magias.js reaja ao novo total
        laTotalInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const laAtualInput = document.querySelector('[data-field="la-atual"]');
    if (laAtualInput && !manualOverrides.has('la-atual')) {
        let oldAtual = parseInt(laAtualInput.value) || 0;
        let novoAtual = oldAtual;
        if (oldAtual > laMax) novoAtual = laMax;
        if (novoAtual < 0) novoAtual = 0;
        if (novoAtual !== oldAtual) {
            laAtualInput.value = novoAtual;
            laAtualInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // Fé (se ativo)
    if (feAtivo) {
        const feAtualInput = document.querySelector('[data-field="fe-atual"]');
        const feMaxInput = document.querySelector('[data-field="fe-total"]');
        if (feMaxInput) {
            const oldMax = parseInt(feMaxInput.value) || 0;
            const oldAtual = feAtualInput ? parseInt(feAtualInput.value) || 0 : 0;
            if (!manualOverrides.has('fe-atual') && feAtualInput) {
                if (oldAtual === oldMax || oldMax === 0) {
                    feAtualInput.value = feMax;
                } else if (oldAtual > feMax) {
                    feAtualInput.value = feMax;
                }
            }
            if (!manualOverrides.has('fe-total')) feMaxInput.value = feMax;
        }
    } else {
        const feMaxInput = document.querySelector('[data-field="fe-total"]');
        if (feMaxInput && !manualOverrides.has('fe-total')) feMaxInput.value = 0;
    }

    // Reaplica classe de overflow (caso pt-total tenha mudado)
    verificarPtOverflow();
    refreshAllBars();

    // DT SAB
    atualizarDtSab();
}

// ========== INICIALIZAÇÃO ==========
// Chame esta função após o DOM estar pronto (ex: no final do arquivo ou via event listener)
export function initPtOverflowControl() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindPtOverflowWatcher);
    } else {
        bindPtOverflowWatcher();
    }
}

// Inicializa automaticamente
initPtOverflowControl();