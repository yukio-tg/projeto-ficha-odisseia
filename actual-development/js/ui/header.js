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

export function updateAuthHeader(user) {
    if (!user) return;
    const loggedEl = document.querySelector('.logged');
    const notLoggedEl = document.querySelector('.not-logged');
    const accountNameEl = document.querySelector('.your-account-name');
    if (loggedEl) loggedEl.style.display = 'flex';
    if (notLoggedEl) notLoggedEl.style.display = 'none';
    if (accountNameEl) accountNameEl.textContent = user.email || user.uid;
}