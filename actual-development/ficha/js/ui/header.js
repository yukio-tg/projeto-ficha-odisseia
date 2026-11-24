import { CAMPOS_DERIVADOS, isModoRegras } from '../core/state.js';
import { atualizarAvisoFormulaClasse } from '../core/calculation.js';
import { atualizarAvisoFormulaHeranca } from '../core/heranca-logic.js';

let _updateHeader = null;

function aplicarTravaCamposDerivados(regras) {
    CAMPOS_DERIVADOS.forEach(field => {
        document.querySelectorAll(`[data-field="${field}"]`).forEach(el => {
            if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
            el.readOnly = regras;
            el.classList.remove('combat-input--readonly');
            el.classList.toggle('is-livro', regras);
            el.title = regras
                ? 'Calculado no modo Regras. Mude para Livre para editar, ou use Recalcular.'
                : '';
        });
    });
}

function garantirBotaoRecalcular() {
    const wrap = document.querySelector('.header-autocalc');
    if (!wrap || document.getElementById('recalc-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'recalc-btn';
    btn.title = 'Recalcular derivados, perícias e incrementos';
    btn.setAttribute('aria-label', 'Recalcular');
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = 'refresh';
    btn.append(icon);
    btn.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('ficha:recalcular'));
    });
    wrap.appendChild(btn);
}

function garantirBotaoExportar() {
    if (document.getElementById('export-json-btn')) return;
    const host = document.querySelector('.header-buttons');
    if (!host) return;
    const wrap = document.createElement('div');
    wrap.className = 'header-export';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'export-json-btn';
    btn.title = 'Exportar JSON da ficha';
    btn.setAttribute('aria-label', 'Exportar JSON');
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = 'download';
    btn.append(icon);
    btn.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('ficha:export-json'));
    });
    wrap.appendChild(btn);
    const share = document.getElementById('share-btn-wrapper');
    if (share) host.insertBefore(wrap, share);
    else host.appendChild(wrap);
}

/** Atualiza o interruptor, a trava dos derivados e os avisos de fórmula. Não recalcula. */
export function syncModoUi() {
    garantirBotaoRecalcular();
    const regras = isModoRegras();
    const btn = document.getElementById('autocalc-switch');
    if (btn) {
        btn.classList.toggle('active', regras);
        btn.classList.toggle('is-livre', !regras);
        btn.setAttribute('aria-pressed', regras ? 'true' : 'false');
        const modo = regras ? 'Modo Regras' : 'Modo Livre';
        btn.title = regras
            ? 'Modo Regras — o livro trava os derivados. Clique para escrever no modo Livre.'
            : 'Modo Livre — o número escrito fica. Clique para voltar às regras.';
        btn.setAttribute('aria-label', modo);
        btn.querySelector('.modo-label')?.remove();
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = regras ? 'calculate' : 'edit';
    }
    const recalc = document.getElementById('recalc-btn');
    if (recalc) {
        recalc.title = 'Recalcular derivados, perícias e incrementos';
    }
    aplicarTravaCamposDerivados(regras);
    atualizarAvisoFormulaClasse();
    atualizarAvisoFormulaHeranca();
    document.dispatchEvent(new CustomEvent('ficha:modo-sync'));
}

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
    syncModoUi();
    garantirBotaoExportar();
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
    const wrap = document.querySelector('.owner-sheet');
    const name = (ownerEmail || '').trim();
    if (ownerEl) ownerEl.textContent = name || '—';
    if (wrap) wrap.style.display = name ? 'flex' : 'none';
}
