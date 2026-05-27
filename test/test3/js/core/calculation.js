import { getNivel, getAtributoTotal } from './radar-service.js';
import { autoCalcEnabled } from './state.js';
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
    const nivel = getNivel();
    const tamanho = document.querySelector('[data-field="tamanho"]')?.value || 'tam-medio';
    const bonus = INERTIDAO_TAMANHO[tamanho] ?? 7;
    const input = document.querySelector('[data-field="inertidao-base"]');
    if (input) input.value = nivel + bonus;
}

const FORMULAS = {
    'coração': { pv: { base: 23, per: 4 }, pm: { base: 2, per: 1 }, pt: { base: 2, per: 1 }, inv: (f) => 7 + f, la: (s) => s, laPer: 0 },
    'arcanista': { pv: { base: 13, per: 2 }, pm: { base: 8, per: 3 }, pt: { base: 6, per: 3 }, inv: (f) => 2 + f, la: (s) => 3 + s, laPer: 2 },
    'certeiro': { pv: { base: 13, per: 2 }, pm: { base: 5, per: 2 }, pt: { base: 6, per: 3 }, inv: (f) => 2 + f, la: (s) => s, laPer: (s, l) => s/2 },
    'terrível': { pv: { base: 18, per: 3 }, pm: { base: 8, per: 3 }, pt: { base: 4, per: 2 }, inv: (f) => 5 + f, la: (s) => s, laPer: (s, l) => s/2 },
    'feromântico': { pv: { base: 18, per: 3 }, pm: { base: 5, per: 4 }, pt: { base: 4, per: 2 }, inv: (f) => 5 + f, la: (s) => 3 + s, laPer: 1 },
    'teurgista': { pv: { base: 13, per: 2 }, pm: { base: 8, per: 3 }, pt: { base: 4, per: 2 }, inv: (f) => 5 + f, la: (s) => 3 + s, laPer: 1 },
    'engenhoso': { pv: { base: 18, per: 3 }, pm: { base: 5, per: 2 }, pt: { base: 6, per: 3 }, inv: (f) => 7 + f, la: (s) => s, laPer: (s, l) => s/2 },
    'treinador': { pv: { base: 18, per: 3 }, pm: { base: 5, per: 2 }, pt: { base: 6, per: 3 }, inv: (f) => 2 + f, la: (s) => s, laPer: (s, l) => s/2 }
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
    
    if (!skipAtualUpdate) {
        // Comportamento original: se estava cheio ou zerado, atualiza para o novo máximo
        if (oldAtual === oldMax || (oldMax === 0 && oldAtual === 0)) {
            atualInput.value = maxVal;
        } else if (oldAtual > maxVal) {
            atualInput.value = maxVal;
        }
    } else {
        // Para PT: só assegura que atual não seja negativo e não ultrapasse novo máximo
        if (oldAtual > maxVal) {
            atualInput.value = maxVal;
        }
        if (oldAtual < 0) atualInput.value = 0;
    }
    maxInput.value = maxVal;
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
    let invMax = Math.floor(formulas.inv(forc));
    let laMax;
    if (typeof formulas.la === 'function') {
        const baseLa = formulas.la(sab, nivel);
        const perLa = typeof formulas.laPer === 'function' ? formulas.laPer(sab, nivel) : (formulas.laPer || 0);
        laMax = Math.floor(baseLa + nivel * perLa);
    } else {
        laMax = Math.floor(formulas.la + nivel * (formulas.laPer || 0));
    }

    const alinhamento = document.querySelector('[data-field="alinhamento-nome"]')?.value.trim().toLowerCase() || 'nenhum';
    const feAtivo = alinhamento !== 'nenhum';
    const feCard = document.querySelector('.vital-card-fe');
    if (feCard) feCard.style.display = feAtivo ? '' : 'none';

    let pmMax, feMax;
    if (feAtivo) {
        pmMax = Math.floor(pmBase / 2);
        feMax = pmBase - pmMax;
    } else {
        pmMax = pmBase;
        feMax = 0;
    }

    // PV e PM com comportamento normal (atual pode ser sobrescrito se condição bater)
    atualizarVital('pv', pvMax);
    atualizarVital('mana', pmMax);
    
    // ===== TRATAMENTO ESPECIAL PARA PT =====
    // Só atualiza o total e garante que o atual não ultrapasse o novo máximo
    // mas NÃO sobrescreve o atual com o máximo (o atual é controlado pelos cards de poder)
    const ptAtualInput = document.querySelector('[data-field="pt-atual"]');
    const ptTotalInput = document.querySelector('[data-field="pt-total"]');
    if (ptTotalInput) {
        const oldMax = parseInt(ptTotalInput.value) || 0;
        const oldAtual = ptAtualInput ? parseInt(ptAtualInput.value) || 0 : 0;
        if (oldAtual > ptMax) {
            if (ptAtualInput) ptAtualInput.value = ptMax;
        }
        ptTotalInput.value = ptMax;
    } else {
        // Se não existe, cria via atualizarVital com skipAtualUpdate = true
        atualizarVital('pt', ptMax, true);
    }
    
    // Atualiza o limite exportado
    calculatedLimits.pt = ptMax;
    calculatedLimits.inv = invMax;
    calculatedLimits.la = laMax;
    
    // Fé (se ativo)
    if (feAtivo) {
        const feAtualInput = document.querySelector('[data-field="fe-atual"]');
        const feMaxInput = document.querySelector('[data-field="fe-total"]');
        if (feMaxInput) {
            const oldMax = parseInt(feMaxInput.value) || 0;
            const oldAtual = feAtualInput ? parseInt(feAtualInput.value) || 0 : 0;
            if (oldAtual === oldMax || oldMax === 0) {
                if (feAtualInput) feAtualInput.value = feMax;
            } else if (oldAtual > feMax) {
                if (feAtualInput) feAtualInput.value = feMax;
            }
            feMaxInput.value = feMax;
        }
    } else {
        const feMaxInput = document.querySelector('[data-field="fe-total"]');
        if (feMaxInput) feMaxInput.value = 0;
    }
    
    // Reaplica classe de overflow (caso pt-total tenha mudado)
    verificarPtOverflow();
    refreshAllBars();
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