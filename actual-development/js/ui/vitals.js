// ── Calc mode para inputs vitais ─────────────────────────────────────────────
//
// Regras:
//  • "38-7"  → expressão absoluta → 31
//  • "+5"    → delta relativo ao valor salvo ao focar → base + 5
//  • "-3"    → delta relativo ao valor salvo ao focar → base - 3
//  • "30"    → inteiro puro, sem avaliação extra
//  • Escape  → reverte para o valor salvo ao focar
//  • Blur    → auto-confirma a expressão (ou reverte se inválida)

const VITAL_CALC_FIELDS = [
    'pv-atual', 'pv-total', 'mana-atual', 'mana-total', 'fe-atual', 'fe-total',
];

function evalCalcExpr(val, base) {
    const s = val.trim();
    if (!s) return null;
    // Permitir apenas chars seguros de expressão numérica
    if (!/^[0-9+\-*/().\s]+$/.test(s)) return null;
    // Inteiro positivo puro: normaliza sem avaliar
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    try {
        // Começa com sinal → delta relativo ao valor base salvo
        if (/^[+-]/.test(s)) {
            const delta = Function('"use strict"; return (' + s + ')')();
            if (typeof delta === 'number' && isFinite(delta))
                return Math.round(base + delta);
            return null;
        }
        // Expressão absoluta (ex.: "38-7", "10*2+5")
        const result = Function('"use strict"; return (' + s + ')')();
        if (typeof result === 'number' && isFinite(result))
            return Math.round(result);
    } catch { /* expressão inválida */ }
    return null;
}

function isCalcLike(val) {
    const s = (val || '').trim();
    if (!s || /^\d+$/.test(s)) return false; // inteiro positivo puro
    return /[+\-*/()]/.test(s);              // contém qualquer operador
}

function commitCalc(el) {
    const val = el.value.trim();
    const base = parseInt(el.dataset.calcBase ?? 0, 10) || 0;
    if (!isCalcLike(val)) return false;
    const result = evalCalcExpr(val, base);
    if (result !== null) {
        el.value = result;
        el.dataset.calcBase = result;
        return true;
    }
    el.value = base; // reverte se inválido
    return false;
}

export function attachCalcMode(el) {
    el.addEventListener('focus', () => {
        el.dataset.calcBase = parseInt(el.value, 10) || 0;
        el.type = 'text';
        el.select();
    });

    el.addEventListener('input', () => {
        el.classList.toggle('calc-mode', isCalcLike(el.value));
    });

    el.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            el.value = el.dataset.calcBase ?? el.value;
            el.classList.remove('calc-mode');
            el.type = 'number';
            el.blur();
            return;
        }
        if (e.key !== 'Enter') return;
        if (!isCalcLike(el.value)) return; // inteiro puro: comportamento padrão
        e.preventDefault();
        const committed = commitCalc(el);
        el.classList.remove('calc-mode');
        el.type = 'number';
        if (committed) {
            el.dispatchEvent(new Event('input',  { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        el.blur();
    });

    el.addEventListener('blur', () => {
        const wasCalc = isCalcLike(el.value);
        const committed = wasCalc ? commitCalc(el) : false;
        el.classList.remove('calc-mode');
        el.type = 'number';
        if (committed) {
            el.dispatchEvent(new Event('input',  { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
}

export function refreshAllBars() {
    function updateBar(currentField, totalField, fillEl) {
        const currInput = document.querySelector(`[data-field="${currentField}"]`);
        const totalInput = document.querySelector(`[data-field="${totalField}"]`);
        if (!currInput || !totalInput || !fillEl) return;
        const curr = parseInt(currInput.value, 10) || 0;
        const total = parseInt(totalInput.value, 10) || 0;
        let percent = 0;
        if (total > 0) percent = Math.max(0, Math.min(1, curr / total)) * 100;
        if (curr < 0) percent = 0;
        fillEl.style.width = percent + '%';
    }

    updateBar('pv-atual', 'pv-total', document.getElementById('hp-fill'));
    updateBar('mana-atual', 'mana-total', document.getElementById('mana-fill'));
    updateBar('fe-atual', 'fe-total', document.getElementById('fe-fill'));

    // Barras temporárias (caso existam)
    const tempFields = [
        { curr: 'pv-temp-atual', total: 'pv-temp-total', fillId: 'hp-temp-fill' },
        { curr: 'mana-temp-atual', total: 'mana-temp-total', fillId: 'mana-temp-fill' },
        { curr: 'fe-temp-atual', total: 'fe-temp-total', fillId: 'fe-temp-fill' }
    ];
    tempFields.forEach(({ curr, total, fillId }) => {
        const currInput = document.querySelector(`[data-field="${curr}"]`);
        const totalInput = document.querySelector(`[data-field="${total}"]`);
        const fillEl = document.getElementById(fillId);
        if (currInput && totalInput && fillEl) {
            const currVal = parseInt(currInput.value, 10) || 0;
            const totalVal = parseInt(totalInput.value, 10) || 0;
            const percent = totalVal > 0 ? Math.min(100, (currVal / totalVal) * 100) : 0;
            fillEl.style.width = percent + '%';
        }
    });
}

export function updateBestaBar(curr, max, fillEl) {
    if (!fillEl) return;
    const pct = max > 0 ? Math.max(0, Math.min(1, curr / max)) * 100 : 0;
    fillEl.style.width = (curr < 0 ? 0 : pct) + '%';
}

export function initBars() {
    refreshAllBars();

    // Listeners para mudanças manuais
    const fields = [
        'pv-atual', 'pv-total', 'mana-atual', 'mana-total', 'fe-atual', 'fe-total',
        'pv-temp-atual', 'pv-temp-total', 'mana-temp-atual', 'mana-temp-total',
        'fe-temp-atual', 'fe-temp-total'
    ];
    fields.forEach(f => {
        document.querySelectorAll(`[data-field="${f}"]`).forEach(el => {
            el.addEventListener('input', refreshAllBars);
        });
    });

    // Calc mode nos campos vitais (atual + total)
    VITAL_CALC_FIELDS.forEach(f => {
        document.querySelectorAll(`[data-field="${f}"]`).forEach(el => {
            attachCalcMode(el);
        });
    });

    // Toggle dos temporários (se existirem)
    document.querySelectorAll('.vital-temp-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const wrapper = document.getElementById(btn.dataset.target);
            if (wrapper) {
                wrapper.classList.toggle('open');
                btn.classList.toggle('active');
                refreshAllBars(); // força atualização ao abrir
            }
        });
    });
}