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
        const el = document.querySelector(`[data-field="${f}"]`);
        if (el) el.addEventListener('input', refreshAllBars);
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