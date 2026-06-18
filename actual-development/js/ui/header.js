export function initHeaderSync() {
    const nomeInput = document.querySelector('[data-field="personagem-nome"]');
    const tituloInput = document.querySelector('[data-field="personagem-titulo"]');
    const headerTitle = document.querySelector('.header-title');
    const headerEyebrow = document.querySelector('.header-eyebrow');

    function updateHeader() {
        if (headerTitle) headerTitle.textContent = nomeInput?.value.trim() || 'Nome';
        if (headerEyebrow) headerEyebrow.textContent = tituloInput?.value.trim() || 'Título';
    }

    nomeInput?.addEventListener('input', updateHeader);
    tituloInput?.addEventListener('input', updateHeader);
    updateHeader();
}