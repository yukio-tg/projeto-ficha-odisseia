// wiki-utils.js — Utility functions for the Odisseia Wiki

export function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    )[m]);
}

export function normalizar(str) {
    return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

export function formatDate(timestamp) {
    if (!timestamp) return '';
    try {
        const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return ''; }
}

export function slugifyTag(str) {
    return normalizar(str)
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

export const TYPE_LABELS = {
    creature: 'Criatura',
    place:    'Lugar',
    person:   'Pessoa',
    concept:  'Conceito',
};

export const TYPE_ICONS = {
    creature: 'pets',
    place:    'map',
    person:   'person',
    concept:  'auto_awesome',
};

/** Shows a toast notification in the bottom-right corner. */
export function showToast(message, isError = false) {
    let toast = document.getElementById('wiki-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'wiki-toast';
        toast.className = 'wiki-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'wiki-toast' + (isError ? ' error' : '');
    // Force reflow for transition
    toast.offsetHeight;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}
