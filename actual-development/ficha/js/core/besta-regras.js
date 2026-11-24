// core/besta-regras.js — Fórmulas da besta, sem DOM.
// Os incrementos do modo Livre ficam em `b.incrementos`, no mesmo formato do log da ficha.

import { incrementarEm, normalizarLog } from './incrementos.js';

// Campos da besta com base no livro. RD e deslocamento são números livres, sem fórmula.
export const CAMPOS_BESTA = ['pm', 'def', 'attr', 'skill', 'bio'];

export function calcPmMax(nivel, conMod, sabMod) {
    // Vida da Besta: baseada em Constituição e Sabedoria (não Carisma)
    const base = 25 + conMod + sabMod;
    return Math.floor(base + nivel * (3 + (conMod + sabMod) / 2));
}

export function calcDefesa(desMod) { return 12 + desMod; }

export function calcProfLimit(nivel) { return 3 + Math.floor(parseInt(nivel, 10) / 2); }

const BIO_BONUS_LEVELS = new Set([3, 6, 7, 9, 11, 13, 14, 17, 19]);
export function calcBioLimit(nivel) {
    const n = parseInt(nivel, 10) || 1;
    let extra = 0;
    for (const lvl of BIO_BONUS_LEVELS) { if (n >= lvl) extra++; }
    return 6 + extra;
}

export function calcTetoAtributos(nivel) { return 13 + (parseInt(nivel, 10) || 1); }

export function nivelBesta(b) {
    return parseInt(b?.nivel, 10) || 1;
}

/** Valores do livro, antes de qualquer incremento ou override. */
export function basesBesta(b) {
    const n = nivelBesta(b);
    const attrs = b?.attrs || {};
    return {
        pm: calcPmMax(n, attrs.CON || 0, attrs.SAB || 0),
        def: calcDefesa(attrs.DES || 0),
        attr: calcTetoAtributos(n),
        skill: calcProfLimit(n),
        bio: calcBioLimit(n),
    };
}

/**
 * Valores exibidos. O override antigo (pmMaxManual / defesaManual) ainda vence;
 * no modo Livre o log de incrementos da besta entra por cima da base.
 */
export function derivadosBesta(b) {
    const base = basesBesta(b);
    const log = normalizarLog(b?.incrementos);
    const inc = (campo) => incrementarEm(log, campo, base[campo]);
    return {
        pmMax: b?.pmMaxManual != null ? b.pmMaxManual : inc('pm'),
        defesa: b?.defesaManual != null ? b.defesaManual : inc('def'),
        tetoAttr: Math.max(0, inc('attr')),
        profLim: Math.max(0, inc('skill')),
        bioLim: Math.max(0, inc('bio')),
    };
}
