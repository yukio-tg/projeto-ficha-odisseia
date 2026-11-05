// Avisos, frase de lista vazia e desfazer curto — sem framework.

let undoTimer = null;
let undoToast = null;

export function offerUndo(message, onUndo) {
    dismissUndo();
    const toast = document.createElement('div');
    toast.className = 'card-undo-toast';
    toast.setAttribute('role', 'status');

    const text = document.createElement('span');
    text.textContent = message;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Desfazer';
    btn.addEventListener('click', () => {
        dismissUndo();
        onUndo();
    });

    toast.append(text, btn);
    document.body.appendChild(toast);
    undoToast = toast;
    undoTimer = setTimeout(dismissUndo, 6000);
}

function dismissUndo() {
    clearTimeout(undoTimer);
    undoTimer = null;
    undoToast?.remove();
    undoToast = null;
}

/**
 * Mostra `message` enquanto `container` não tiver nenhum `cardSelector`.
 * Sobrevive a innerHTML no container (o observer recria a frase).
 */
export function bindEmptyHint(container, cardSelector, message) {
    if (!container || container.dataset.emptyHint === '1') return;
    container.dataset.emptyHint = '1';

    const hint = document.createElement('p');
    hint.className = 'sheet-empty-hint';
    hint.textContent = message;

    const sync = () => {
        const hasCard = !!container.querySelector(cardSelector);
        hint.hidden = hasCard;
        if (!hint.isConnected) container.insertBefore(hint, container.firstChild);
    };

    const observer = new MutationObserver(sync);
    observer.observe(container, { childList: true, subtree: true });
    sync();
}

export function showCatalogWarning(tabId, message) {
    const tab = document.getElementById(tabId);
    if (!tab || !message) return;
    const already = [...tab.querySelectorAll('.catalog-load-error')].some(el => el.textContent === message);
    if (already) return;

    const el = document.createElement('p');
    el.className = 'catalog-load-error';
    el.setAttribute('role', 'alert');
    el.textContent = message;

    const heading = tab.querySelector(':scope > .sh');
    if (heading) heading.insertAdjacentElement('afterend', el);
    else tab.prepend(el);
}
