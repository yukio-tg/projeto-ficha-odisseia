import { CAMPOS_DERIVADOS, isModoRegras } from '../core/state.js';
import { atualizarAvisoFormulaClasse } from '../core/calculation.js';
import { atualizarAvisoFormulaHeranca } from '../core/heranca-logic.js';

let _updateHeader = null;

function aplicarTravaCamposDerivados(regras) {
    CAMPOS_DERIVADOS.forEach(field => {
        document.querySelectorAll(`[data-field="${field}"]`).forEach(el => {
            if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
            el.readOnly = regras;
            el.classList.toggle('combat-input--readonly', regras);
            el.title = regras
                ? 'Calculado no modo Regras. Mude para Livre para editar, ou use Recalcular.'
                : '';
        });
    });
}

function garantirBotaoRecalcular() {
    const wrap = document.querySelector('.header-autocalc');
    if (!wrap || document.getElementById('recalc-btn')) return;
    wrap.style.display = 'inline-flex';
    wrap.style.alignItems = 'center';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'recalc-btn';
    btn.style.cssText = 'background:none;border:none;color:var(--gold1);cursor:pointer;display:inline-flex;align-items:center;gap:2px;font-family:Cinzel,serif;font-size:10px;letter-spacing:.06em;margin-left:8px;padding:0;';
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = 'refresh';
    const text = document.createElement('span');
    text.textContent = 'Recalcular';
    btn.append(icon, text);
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
    btn.setAttribute('aria-label', 'Exportar JSON da ficha');
    btn.textContent = 'JSON';
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
        btn.setAttribute('aria-pressed', regras ? 'true' : 'false');
        btn.title = regras
            ? 'Modo Regras — derivados seguem o livro. Clique para o modo Livre.'
            : 'Modo Livre — o número escrito fica. Clique para o modo Regras.';
        let label = btn.querySelector('.modo-label');
        if (!label) {
            label = document.createElement('span');
            label.className = 'modo-label';
            label.style.cssText = 'font-family:Cinzel,serif;font-size:10px;letter-spacing:.08em;margin-left:4px;vertical-align:middle;';
            btn.appendChild(label);
        }
        label.textContent = regras ? 'Regras' : 'Livre';
    }
    const recalc = document.getElementById('recalc-btn');
    if (recalc) {
        recalc.title = 'Recalcular derivados, perícias e incrementos';
    }
    aplicarTravaCamposDerivados(regras);
    atualizarAvisoFormulaClasse();
    atualizarAvisoFormulaHeranca();
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
    if (ownerEl) ownerEl.textContent = ownerEmail || '—';
}
