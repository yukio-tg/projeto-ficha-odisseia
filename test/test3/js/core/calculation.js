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

// Fórmulas por classe (mesmas de antes, abreviado no exemplo)
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

function atualizarVital(prefix, maxVal) {
    const atualInput = document.querySelector(`[data-field="${prefix}-atual"]`);
    const maxInput = document.querySelector(`[data-field="${prefix}-total"]`);
    if (!atualInput || !maxInput) return;
    const oldMax = parseInt(maxInput.value) || 0;
    const oldAtual = parseInt(atualInput.value) || 0;
    if (oldAtual === oldMax || (oldMax === 0 && oldAtual === 0)) {
        atualInput.value = maxVal;
    } else if (oldAtual > maxVal) {
        atualInput.value = maxVal;
    }
    maxInput.value = maxVal;
}

// NOVAS FUNÇÕES DE VISIBILIDADE

export function updateVisibilityByLevel() {
    const nivel = getNivel();
    const ramoFieldset = document.querySelector('fieldset:has([data-field="ramo-nome"])');
    const indivFieldset = document.querySelector('fieldset:has([data-field="individualidade-nome"])');
    if (ramoFieldset) ramoFieldset.style.display = nivel >= 2 ? '' : 'none';
    if (indivFieldset) indivFieldset.style.display = nivel >= 3 ? '' : 'none';
}

export function updateFeVisibility() {
    const alinhamento = document.querySelector('[data-field="alinhamento-nome"]')?.value.trim().toLowerCase() || 'nenhum';
    const feCard = document.querySelector('.vital-card-fe'); // seleciona o card de Fé
    if (!feCard) return;
    if (alinhamento === 'nenhum') {
        feCard.style.display = 'none';
    } else {
        feCard.style.display = '';
    }
    // Recalcula stats para aplicar divisão de PM/Fé
    calcStats();
}

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

    // Base (sem corte de Fé)
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
        // PM = metade, Fé = metade (arredondamento piso para PM, teto para Fé se ímpar)
        pmMax = Math.floor(pmBase / 2);
        feMax = pmBase - pmMax; // a outra metade
    } else {
        pmMax = pmBase;
        feMax = 0;
    }

    atualizarVital('pv', pvMax);
    atualizarVital('mana', pmMax);
    if (feAtivo) {
        // atualizar Fé
        const feAtualInput = document.querySelector('[data-field="fe-atual"]');
        const feMaxInput = document.querySelector('[data-field="fe-total"]');
        if (feMaxInput) {
            const oldMax = parseInt(feMaxInput.value) || 0;
            const oldAtual = feAtualInput ? parseInt(feAtualInput.value) || 0 : 0;
            // Sincroniza se estava maximizado ou se é a primeira ativação
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

    calculatedLimits.pt = ptMax;
    calculatedLimits.inv = invMax;
    calculatedLimits.la = laMax;

    refreshAllBars();
}