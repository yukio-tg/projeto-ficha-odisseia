// ui/configuracoes.js — Configurações tab logic
// Handles: level arrow in evolution table, increment values applied to stats.
'use strict';

// ── Evolution table level tracking ───────────────────────────────────────────

let _lastNivel = null;
let _evoInterval = null;

/**
 * Updates the evolution table to highlight the current character level.
 * Safe to call multiple times — no-ops if level unchanged.
 */
export function updateEvoTable() {
    const nivelInput = document.querySelector('[data-field="nivel"]');
    const nivel = parseInt(nivelInput?.value, 10) || 1;

    if (nivel === _lastNivel) return;
    _lastNivel = nivel;

    const table = document.getElementById('cfg-evo-table');
    if (!table) return;

    table.querySelectorAll('tbody tr').forEach(row => {
        const rowNivel = parseInt(row.dataset.nivel, 10);
        row.classList.toggle('cfg-evo-current', rowNivel === nivel);
    });
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
    const nivelInput = document.querySelector('[data-field="nivel"]');
    if (nivelInput) {
        // User-triggered changes
        nivelInput.addEventListener('input', updateEvoTable);
        nivelInput.addEventListener('change', updateEvoTable);
    }

    // Initial update (may not be correct if ficha hasn't loaded yet)
    updateEvoTable();

    // Poll for programmatic changes (desserializer sets .value without firing events)
    // Run 10 times over 5 seconds after init to catch late ficha loads
    let polls = 0;
    _evoInterval = setInterval(() => {
        updateEvoTable();
        polls++;
        if (polls >= 10) {
            clearInterval(_evoInterval);
            _evoInterval = null;
        }
    }, 500);

    // Also update when a ficha:loaded event is dispatched (if available)
    document.addEventListener('ficha:loaded', () => {
        // Give deserializer 50ms to finish setting values
        setTimeout(updateEvoTable, 50);
    });

    // Wire increment inputs → recalculate stats
    document.querySelectorAll('.cfg-incr-input').forEach(inp => {
        inp.addEventListener('input', () => {
            triggerRecalc();
            document.dispatchEvent(new Event('ficha:changed', { bubbles: true }));
        });
    });
}
