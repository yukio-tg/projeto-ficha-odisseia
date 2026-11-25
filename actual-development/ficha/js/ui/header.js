import { CAMPOS_DERIVADOS, isModoRegras } from '../core/state.js';
import { atualizarAvisoFormulaClasse } from '../core/calculation.js';
import { atualizarAvisoFormulaHeranca } from '../core/heranca-logic.js';

let _updateHeader = null;

const CHAVE_LARGURA = 'odisseia-largura-v1';
const DICA_CALCULADO = 'Calculado pelas regras. Passe para o modo Livre para editar.';
const ATRASO_DICA_MS = 350;

const $ = (sel, raiz = document) => raiz.querySelector(sel);

// ── Campos calculados (modo Regras) ─────────────────────────────────────────
// Sem sinal visual de trava. Só um atributo de marcação para a dica e o aviso.
function aplicarTravaCamposDerivados(regras) {
    CAMPOS_DERIVADOS.forEach(field => {
        document.querySelectorAll(`[data-field="${field}"]`).forEach(el => {
            if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
            el.readOnly = regras;
            el.classList.remove('combat-input--readonly', 'is-livro');
            if (regras) el.setAttribute('data-calculado', '');
            else el.removeAttribute('data-calculado');
        });
    });
}

// ── Dica (mouse) e aviso (clique) nos campos calculados ─────────────────────
let _dica = null;
let _aviso = null;
let _timerDica = null;

function criarDicaEAviso() {
    if (_dica) return;
    _dica = document.createElement('div');
    _dica.id = 'calc-dica';
    _dica.className = 'calc-dica';
    _dica.setAttribute('role', 'tooltip');
    _dica.hidden = true;
    _dica.textContent = DICA_CALCULADO;

    _aviso = document.createElement('div');
    _aviso.id = 'calc-aviso';
    _aviso.className = 'calc-aviso';
    _aviso.setAttribute('role', 'dialog');
    _aviso.setAttribute('aria-label', 'Campo calculado');
    _aviso.hidden = true;
    const texto = document.createElement('div');
    texto.textContent = 'Campo calculado pelas regras.';
    const ir = document.createElement('button');
    ir.type = 'button';
    ir.id = 'calc-aviso-livre';
    const ico = document.createElement('span');
    ico.className = 'material-symbols-outlined';
    ico.setAttribute('aria-hidden', 'true');
    ico.textContent = 'lock_open';
    ir.append(ico, 'Passar para Livre');
    ir.addEventListener('click', () => {
        esconderAviso();
        // Mesmo caminho do clique no botão de modo (main.js).
        document.getElementById('autocalc-switch')?.click();
    });
    _aviso.append(texto, ir);
    document.body.append(_dica, _aviso);
}

function posicionar(el, alvo, folga) {
    const r = alvo.getBoundingClientRect();
    el.hidden = false;
    const w = el.offsetWidth;
    const esq = Math.min(Math.max(6, r.left + r.width / 2 - w / 2), window.innerWidth - w - 6);
    el.style.left = `${Math.max(6, esq)}px`;
    el.style.top = `${r.bottom + folga}px`;
}

function esconderDica() {
    clearTimeout(_timerDica);
    _timerDica = null;
    if (_dica) _dica.hidden = true;
}

function esconderAviso() {
    if (_aviso) _aviso.hidden = true;
}

function campoCalculado(alvo) {
    if (!(alvo instanceof Element)) return null;
    if (document.body.classList.contains('mode-readonly')) return null;
    return isModoRegras() ? alvo.closest('[data-calculado]') : null;
}

function ligarDicaEAviso() {
    criarDicaEAviso();
    // mousemove (e não só mouseover): se algo esconder a dica (rolagem, troca de
    // modo), ela volta enquanto o mouse continuar sobre o campo.
    const agendarDica = e => {
        const campo = campoCalculado(e.target);
        if (!campo || !_aviso.hidden || !_dica.hidden || _timerDica) return;
        _timerDica = setTimeout(() => {
            _timerDica = null;
            if (campoCalculado(campo) && campo.matches(':hover') && _aviso.hidden) posicionar(_dica, campo, 8);
        }, ATRASO_DICA_MS);
    };
    document.addEventListener('mouseover', agendarDica);
    document.addEventListener('mousemove', agendarDica, { passive: true });
    document.addEventListener('mouseout', e => {
        if (e.target instanceof Element && e.target.closest('[data-calculado]')) esconderDica();
    });
    // pointerup, não click: alguns campos trocam de tipo ao ganhar foco (vitals.js)
    // e aí o navegador não dispara o click. Vale para mouse e toque.
    document.addEventListener('pointerup', e => {
        if (e.button !== 0) return;
        const campo = campoCalculado(e.target);
        if (!campo) return;
        esconderDica();
        fecharMenu();
        posicionar(_aviso, campo, 6);
    });
    document.addEventListener('click', e => {
        if (!(e.target instanceof Element)) return;
        if (!e.target.closest('#calc-aviso, [data-calculado]')) esconderAviso();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { esconderAviso(); esconderDica(); }
    });
    // Rolar esconde o que está aberto, mas não cancela a dica que ainda vai aparecer.
    document.addEventListener('scroll', () => { esconderAviso(); if (_dica) _dica.hidden = true; }, true);
}

// ── Menu ⋯ ──────────────────────────────────────────────────────────────────
function itensDoMenu() {
    return [...document.querySelectorAll('#more-menu button')].filter(b => b.offsetParent !== null);
}

function fecharMenu(devolverFoco = false) {
    const menu = $('#more-menu');
    const btn = $('#more-btn');
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    btn?.setAttribute('aria-expanded', 'false');
    if (devolverFoco) btn?.focus();
}

function abrirMenu() {
    const menu = $('#more-menu');
    const btn = $('#more-btn');
    if (!menu || !btn) return;
    esconderAviso();
    esconderDica();
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
}

function ligarMenu() {
    const menu = $('#more-menu');
    const btn = $('#more-btn');
    if (!menu || !btn || btn.dataset.ligado === '1') return;
    btn.dataset.ligado = '1';

    btn.addEventListener('click', e => {
        e.stopPropagation();
        if (menu.hidden) {
            abrirMenu();
            // Com o teclado (detail 0), já cai no primeiro item.
            if (e.detail === 0) itensDoMenu()[0]?.focus();
        } else fecharMenu();
    });
    btn.addEventListener('keydown', e => {
        if (e.key !== 'ArrowDown') return;
        e.preventDefault();
        abrirMenu();
        itensDoMenu()[0]?.focus();
    });
    // Escolher um item fecha o menu. O clique do próprio item segue para seu dono.
    menu.addEventListener('click', e => {
        if (e.target.closest('button')) fecharMenu();
    });
    document.addEventListener('click', e => {
        if (!e.target.closest('#more-menu, #more-btn')) fecharMenu();
    });
    document.addEventListener('keydown', e => {
        if (menu.hidden) return;
        if (e.key === 'Escape') { e.preventDefault(); fecharMenu(true); return; }
        const itens = itensDoMenu();
        const i = itens.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); itens[(i + 1) % itens.length]?.focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); itens[(i - 1 + itens.length) % itens.length]?.focus(); }
        else if (e.key === 'Home') { e.preventDefault(); itens[0]?.focus(); }
        else if (e.key === 'End') { e.preventDefault(); itens[itens.length - 1]?.focus(); }
        else if (e.key === 'Tab') fecharMenu();
    });

    $('#recalc-btn')?.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('ficha:recalcular'));
    });
    $('#export-json-btn')?.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('ficha:export-json'));
    });

    // O texto do Auto-save acompanha a classe que o main.js liga e desliga.
    const auto = $('#autosave-switch');
    if (auto) {
        const atualizar = () => {
            const ligado = auto.classList.contains('active');
            const txt = $('.mi-txt', auto);
            if (txt) txt.textContent = `Auto-save: ${ligado ? 'ligado' : 'desligado'}`;
        };
        new MutationObserver(atualizar).observe(auto, { attributes: true, attributeFilter: ['class'] });
        atualizar();
    }

    $('#largura-btn')?.addEventListener('click', () => aplicarLargura(!larguraTotal(), true));
}

// ── Tela cheia (largura total), preferência só deste navegador ───────────────
function larguraTotal() {
    return document.body.classList.contains('largura-total');
}

function aplicarLargura(total, gravar = false) {
    document.body.classList.toggle('largura-total', total);
    if (gravar) {
        try { localStorage.setItem(CHAVE_LARGURA, total ? 'total' : 'normal'); } catch { /* sem armazenamento: vale só nesta visita */ }
    }
    const btn = $('#largura-btn');
    if (btn) {
        $('.material-symbols-outlined', btn).textContent = total ? 'fullscreen_exit' : 'fullscreen';
        $('.mi-txt', btn).textContent = total ? 'Largura normal' : 'Tela cheia';
    }
    window.dispatchEvent(new Event('resize'));
}

function lerLarguraSalva() {
    try { return localStorage.getItem(CHAVE_LARGURA) === 'total'; } catch { return false; }
}

// ── Vinheta do modo Livre ───────────────────────────────────────────────────
function garantirVinheta() {
    if (document.getElementById('vinheta-livre')) return;
    const v = document.createElement('div');
    v.id = 'vinheta-livre';
    v.className = 'vinheta-livre';
    v.setAttribute('aria-hidden', 'true');
    document.body.appendChild(v);
}

/** Atualiza o botão de modo, a trava dos derivados e os avisos de fórmula. Não recalcula. */
export function syncModoUi() {
    const regras = isModoRegras();
    document.body.classList.toggle('modo-livre', !regras);
    const btn = document.getElementById('autocalc-switch');
    if (btn) {
        btn.classList.toggle('active', regras);
        btn.classList.toggle('is-livre', !regras);
        const descricao = regras
            ? 'Modo Regras: os valores calculados seguem o livro. Clique para passar para o modo Livre.'
            : 'Modo Livre: você escreve os números e eles ficam. Clique para voltar ao modo Regras.';
        btn.title = descricao;
        btn.setAttribute('aria-label', descricao);
        btn.removeAttribute('aria-pressed');
        const ico = btn.querySelector('.mode-ico');
        if (ico) ico.textContent = regras ? 'lock' : 'lock_open';
        const txt = btn.querySelector('.mode-txt');
        if (txt) txt.textContent = regras ? 'Regras' : 'Livre';
    }
    aplicarTravaCamposDerivados(regras);
    if (_dica) _dica.hidden = true;
    esconderAviso();
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
    aplicarLargura(lerLarguraSalva());
    garantirVinheta();
    ligarMenu();
    ligarDicaEAviso();
    syncModoUi();
}

/** Força a atualização do header após carregamento de dados externos (ex.: deserializeSheet). */
export function refreshHeader() {
    if (_updateHeader) _updateHeader();
}

// Um nome só no topo. Quem vê a própria ficha: a pessoa logada. Quem vê a ficha
// de outra pessoa: o dono, com a coroa. O outro nome fica na dica (tooltip).
let _logado = '';
let _logadoUid = '';
let _dono = '';

function nomeCurto(email) {
    return email.includes('@') ? email.split('@')[0] : email;
}

function atualizarNomeTopo() {
    const logadoEl = document.querySelector('.logged');
    const donoEl = document.querySelector('.owner-sheet');
    const donoDeOutro = !!_dono && _dono !== '—' && !!_logado && _dono !== _logado && _dono !== _logadoUid;
    if (logadoEl) {
        logadoEl.style.display = _logado && !donoDeOutro ? 'flex' : 'none';
        logadoEl.title = _logado ? `Você: ${_logado}` : '';
        const n = logadoEl.querySelector('.your-account-name');
        if (n) n.textContent = nomeCurto(_logado);
    }
    if (donoEl) {
        donoEl.style.display = donoDeOutro ? 'flex' : 'none';
        donoEl.title = donoDeOutro ? `Dono da ficha: ${_dono}\nVocê: ${_logado}` : '';
        const n = donoEl.querySelector('.owner-account-name');
        if (n) n.textContent = donoDeOutro ? nomeCurto(_dono) : '—';
    }
}

export function updateAuthHeader(user) {
    if (!user) return;
    const notLoggedEl = document.querySelector('.not-logged');
    if (notLoggedEl) notLoggedEl.style.display = 'none';
    _logado = user.email || user.uid || '';
    _logadoUid = user.uid || '';
    atualizarNomeTopo();
}

/** Guarda o dono da ficha; o topo mostra o dono só quando é outra pessoa. */
export function updateOwnerHeader(ownerEmail) {
    _dono = (ownerEmail || '').trim();
    atualizarNomeTopo();
}
