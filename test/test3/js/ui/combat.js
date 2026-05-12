export function initCombatExtras() {
    // Special rows
    window.addSpecialRow = function(listId) {
        const list = document.getElementById(listId);
        const prefix = listId === 'defesa-specials' ? 'defesa' : 'rd';
        const count = list.querySelectorAll('.cstat-special-row').length + 1;
        const row = document.createElement('div');
        row.className = 'cstat-special-row';
        row.innerHTML = `
            <input type="text" class="cstat-type-input" placeholder="caso especial" data-field="${prefix}-tipo-${count}">
            <input type="number" class="cstat-val-input" placeholder="—" data-field="${prefix}-val-${count}">
            <button onclick="this.parentElement.remove()" style="...">×</button>`;
        list.appendChild(row);
    };

    // Notes character count
    const notesTA = document.getElementById('notes-textarea');
    const notesCount = document.getElementById('notes-char-count');
    if (notesTA && notesCount) {
        notesTA.addEventListener('input', () => {
            const n = notesTA.value.length;
            notesCount.textContent = n + ' caractere' + (n !== 1 ? 's' : '');
        });
    }
}