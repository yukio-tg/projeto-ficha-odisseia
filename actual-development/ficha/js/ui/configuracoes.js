// ui/configuracoes.js — Configurações tab logic
// Handles: level arrow in evolution table, increment values applied to stats.
'use strict';

import { getNivel } from '../core/radar-service.js';

// ── Evolution table level tracking ───────────────────────────────────────────

let _lastNivel = null;

function nivelAtual() {
    const radar = document.querySelector('#secao-radar .level-input');
    if (radar) return parseInt(radar.value, 10) || getNivel();
    return getNivel();
}

/**
 * Highlights the character's current level and marks earlier milestones as reached.
 */
export function updateEvoTable(opcoes = {}) {
    const nivel = nivelAtual();
    const table = document.getElementById('cfg-evo-table');
    if (!table) return;

    const mudou = nivel !== _lastNivel;
    _lastNivel = nivel;

    let atual = null;
    table.querySelectorAll('tbody tr').forEach(row => {
        const rowNivel = parseInt(row.dataset.nivel, 10);
        const isCurrent = rowNivel === nivel;
        row.classList.toggle('cfg-evo-current', isCurrent);
        row.classList.toggle('cfg-evo-reached', rowNivel < nivel);
        if (isCurrent) atual = row;
    });

    const paginaAtiva = document.getElementById('tab-configuracoes')?.classList.contains('active');
    if (atual && paginaAtiva && (mudou || opcoes.scroll)) {
        atual.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
}

// ── Increment helpers ─────────────────────────────────────────────────────────

/**
 * Gets a flat increment value for a field key.
 */
export function getIncrFlat(key) {
    return parseInt(document.querySelector(`[data-field="incr-${key}-flat"]`)?.value, 10) || 0;
}

/**
 * Gets a percentage increment value for a field key.
 */
export function getIncrPct(key) {
    return parseFloat(document.querySelector(`[data-field="incr-${key}-pct"]`)?.value) || 0;
}

/**
 * Applies increment to a value: (base + flat) * (1 + pct/100)
 * Returns Math.floor of the result.
 */
export function applyIncrement(base, flat, pct) {
    const afterFlat = base + flat;
    const afterPct  = afterFlat * (1 + pct / 100);
    return Math.floor(afterPct);
}

/**
 * Triggers a full recalculation via the nivel input event.
 * Used when increment values change.
 */
export function triggerRecalc() {
    const nivelEl = document.querySelector('[data-field="nivel"]');
    if (nivelEl) nivelEl.dispatchEvent(new Event('input', { bubbles: true }));
}

// ── Wiring ────────────────────────────────────────────────────────────────────

/**
 * Call this during init. Wires all increment inputs and sets up level tracking.
 * Polls for programmatic nivel changes (e.g., ficha load) every 500ms for 5s.
 */
export function initConfiguracoes() {
    const ligarNivel = () => {
        const nivelInput = document.querySelector('#secao-radar .level-input');
        if (!nivelInput || nivelInput.dataset.evoBound === '1') return !!nivelInput;
        nivelInput.dataset.evoBound = '1';
        nivelInput.addEventListener('input', () => updateEvoTable());
        nivelInput.addEventListener('change', () => updateEvoTable());
        return true;
    };

    ligarNivel();
    updateEvoTable();

    document.addEventListener('ficha:loaded', () => {
        _lastNivel = null;
        setTimeout(() => updateEvoTable(), 50);
    });

    document.querySelectorAll('[data-tab="configuracoes"]').forEach(tab => {
        tab.addEventListener('click', () => {
            _lastNivel = null;
            setTimeout(() => updateEvoTable({ scroll: true }), 0);
        });
    });

    // Wire increment inputs → recalculate stats
    document.querySelectorAll('.cfg-incr-input').forEach(inp => {
        inp.addEventListener('input', () => {
            triggerRecalc();
            document.dispatchEvent(new Event('ficha:changed', { bubbles: true }));
        });
    });
}
