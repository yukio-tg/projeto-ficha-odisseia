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
    const tempFields = ['pv-temp', 'mana-temp', 'fe-temp'];
    tempFields.forEach(prefix => {
        const currField = prefix + '-atual';
        const totalField = prefix + '-total';
        const fillEl = document.getElementById(prefix + '-fill');
        if (fillEl) updateBar(currField, totalField, fillEl);
    });
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
        const targetId = btn.dataset.target;
        if (!targetId) return;
        btn.addEventListener('click', () => {
            const wrapper = document.getElementById(targetId);
            if (!wrapper) return;
            const isOpen = wrapper.classList.contains('open');
            wrapper.classList.toggle('open', !isOpen);
            btn.classList.toggle('active', !isOpen);
            if (!isOpen) refreshAllBars();
        });
    });
}