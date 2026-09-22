let _updateHeader = null;

/** Extrai o primeiro nome (primeira palavra antes de espaço) do nome completo. */
function primeiroNome(nomeCompleto) {
    const partes = (nomeCompleto || '').trim().split(/\s+/);
    return partes[0] || '';
}

/** Atualiza o título da aba do navegador com o primeiro nome do personagem. */
function atualizarTituloPagina(nomeCompleto) {
    const primeiro = primeiroNome(nomeCompleto);
    document.title = primeiro ? `${primeiro} — FICHA ODISSEIA` : 'Odisseia — Ficha de Personagem';
}

export function initHeaderSync() {
    const nomeInput = document.querySelector('[data-field="personagem-nome"]');
    const tituloInput = document.querySelector('[data-field="personagem-titulo"]');
    const headerTitle = document.querySelector('.header-title');
    const headerEyebrow = document.querySelector('.header-eyebrow');

    function updateHeader() {
        const nome = nomeInput?.value.trim() || '';
        if (headerTitle) headerTitle.textContent = nome || 'Nome';
        if (headerEyebrow) headerEyebrow.textContent = tituloInput?.value.trim() || 'Título';
        atualizarTituloPagina(nome);
    }

    _updateHeader = updateHeader;
    nomeInput?.addEventListener('input', updateHeader);
    tituloInput?.addEventListener('input', updateHeader);
    updateHeader();
}

/** Força a atualização do header após carregamento de dados externos (ex.: deserializeSheet). */
export function refreshHeader() {
    if (_updateHeader) _updateHeader();
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

/** Preenche o nome do dono da ficha no header (substitui o valor hardcoded). */
export function updateOwnerHeader(ownerEmail) {
    const ownerEl = document.querySelector('.owner-account-name');
    if (ownerEl) ownerEl.textContent = ownerEmail || '—';
}
