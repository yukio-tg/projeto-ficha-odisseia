// ui/efeitos-passivos-ui.js — Liga os cartões de poder e de ônus ao log de incrementos.
// Cartão entra, sai, muda de nome ou de escolha, ou a ficha carrega: o log é conferido contra os cartões.
// A conferência é idempotente (ids fixos), então carregar uma ficha salva não soma em dobro.

import { reconciliar, escolhaDoPoder, opcoesEscolha, ehItemComEfeito, itensQueContam } from '../core/efeitos-passivos.js';
import { getIncrementos, setIncrementos } from '../core/incrementos.js';
import { isHydrating } from '../core/state.js';
import { getNivel } from '../core/radar-service.js';
import { recalcularCampos } from './incrementos-ui.js';

const ROTULO_ESCOLHA = {
    'atributo': 'Atributo',
    'pericia': 'Perícia',
    'pericia-sem-fisico': 'Perícia',
    'pericia-social': 'Perícia',
};

function lerFontes() {
    const poderes = Array.from(document.querySelectorAll('.powers-container .card-power')).map(card => ({
        id: card.getAttribute('data-card-id'),
        nome: card.querySelector('.power-name-input')?.value || '',
        escolha: card.dataset.escolha || '',
    }));
    const onus = Array.from(document.querySelectorAll('#bonus-onus-container .combat-card--bonus'))
        .filter(card => card.querySelector('.bonus-tipo-select')?.value === 'onus')
        .map(card => ({
            id: `onus_${card.dataset.bonusId}`,
            nome: card.querySelector('.bonus-nome-input')?.value || '',
        }));
    return [...poderes, ...onus, ...lerItensEquipados()];
}

function cartoesDeItens() {
    return Array.from(document.querySelectorAll('.items-container .item-card'));
}

function lerItensEquipados() {
    const cartoes = cartoesDeItens();
    const equipados = cartoes
        .filter(c => c.dataset.equipado === '1' && ehItemComEfeito(c.querySelector('.item-nome-input')?.value))
        .map(c => ({
            id: `item_${c.dataset.cardId}`,
            nome: c.querySelector('.item-nome-input')?.value || '',
            escolha: c.dataset.escolha || '',
        }));
    const todosNomes = cartoes.map(c => c.querySelector('.item-nome-input')?.value || '');
    return itensQueContam(equipados, todosNomes);
}

/** Item com efeito fixo ganha o botão "Equipado" (e o seletor de perícia, se o efeito pedir). */
function garantirControlesItens() {
    cartoesDeItens().forEach(card => {
        const nome = card.querySelector('.item-nome-input')?.value || '';
        const atual = card.querySelector('.item-equipado-wrap');
        if (!ehItemComEfeito(nome)) {
            atual?.remove();
            delete card.dataset.equipado;
            delete card.dataset.escolha;
            delete card.dataset.escolhaTipo;
            return;
        }
        const tipo = escolhaDoPoder(nome);
        if (atual && (card.dataset.escolhaTipo || '') === (tipo || '')) {
            const cb = atual.querySelector('.item-equipado');
            if (cb) cb.checked = card.dataset.equipado === '1';
            return;
        }
        atual?.remove();
        if (card.dataset.escolhaTipo && card.dataset.escolhaTipo !== tipo) delete card.dataset.escolha;
        card.dataset.escolhaTipo = tipo || '';

        const wrap = document.createElement('div');
        wrap.className = 'item-equipado-wrap';
        wrap.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:6px 0;font-size:12px;';
        const lab = document.createElement('label');
        lab.style.cssText = 'display:flex;align-items:center;gap:4px;cursor:pointer;';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'item-equipado';
        cb.checked = card.dataset.equipado === '1';
        cb.addEventListener('change', () => {
            if (cb.checked) card.dataset.equipado = '1'; else delete card.dataset.equipado;
            document.dispatchEvent(new Event('ficha:changed', { bubbles: true }));
            sincronizarEfeitosPoderes();
        });
        lab.append(cb, document.createTextNode('Equipado'));
        wrap.appendChild(lab);

        if (tipo) {
            const sel = document.createElement('select');
            sel.className = 'item-escolha';
            sel.setAttribute('aria-label', 'Perícia que este item afeta');
            const vazio = document.createElement('option');
            vazio.value = '';
            vazio.textContent = '— perícia —';
            sel.appendChild(vazio);
            opcoesEscolha(tipo).forEach(o => {
                const op = document.createElement('option');
                op.value = o;
                op.textContent = o;
                sel.appendChild(op);
            });
            sel.value = card.dataset.escolha || '';
            sel.addEventListener('change', () => {
                card.dataset.escolha = sel.value;
                document.dispatchEvent(new Event('ficha:changed', { bubbles: true }));
                sincronizarEfeitosPoderes();
            });
            wrap.appendChild(sel);
        }
        card.querySelector('.item-body-right')?.prepend(wrap);
    });
}

/** Poder que pede escolha ganha um seletor no corpo do cartão; os outros perdem o seletor. */
function garantirSeletores() {
    document.querySelectorAll('.powers-container .card-power').forEach(card => {
        const nome = card.querySelector('.power-name-input')?.value || '';
        const tipo = escolhaDoPoder(nome);
        const atual = card.querySelector('.power-escolha');
        if (!tipo) {
            if (atual) atual.closest('.power-escolha-wrap')?.remove();
            delete card.dataset.escolha;
            delete card.dataset.escolhaTipo;
            return;
        }
        if (atual && card.dataset.escolhaTipo === tipo) return;
        atual?.closest('.power-escolha-wrap')?.remove();
        if (card.dataset.escolhaTipo && card.dataset.escolhaTipo !== tipo) delete card.dataset.escolha;
        card.dataset.escolhaTipo = tipo;

        const wrap = document.createElement('label');
        wrap.className = 'power-escolha-wrap';
        wrap.style.cssText = 'display:flex;align-items:center;gap:8px;margin:6px 0;font-size:12px;';
        const texto = document.createElement('span');
        texto.textContent = `${ROTULO_ESCOLHA[tipo] || 'Escolha'} do poder:`;
        const sel = document.createElement('select');
        sel.className = 'power-escolha';
        sel.setAttribute('aria-label', `${ROTULO_ESCOLHA[tipo] || 'Escolha'} que este poder afeta`);
        const vazio = document.createElement('option');
        vazio.value = '';
        vazio.textContent = '— escolha —';
        sel.appendChild(vazio);
        opcoesEscolha(tipo).forEach(o => {
            const op = document.createElement('option');
            op.value = o;
            op.textContent = o;
            sel.appendChild(op);
        });
        sel.value = card.dataset.escolha || '';
        sel.addEventListener('change', () => {
            card.dataset.escolha = sel.value;
            document.dispatchEvent(new Event('ficha:changed', { bubbles: true }));
            sincronizarEfeitosPoderes();
        });
        wrap.append(texto, sel);
        card.querySelector('.body-power')?.prepend(wrap);
    });
}

export function sincronizarEfeitosPoderes() {
    garantirSeletores();
    garantirControlesItens();
    const { log, campos } = reconciliar(getIncrementos(), lerFontes(), getNivel());
    if (!campos.length) return;
    setIncrementos(log);
    recalcularCampos(campos);
    document.dispatchEvent(new CustomEvent('incrementos:mudou'));
    document.dispatchEvent(new Event('ficha:changed', { bubbles: true }));
}

export function initEfeitosPassivosUi() {
    const poderes = document.querySelector('.powers-container');
    const onus = document.getElementById('bonus-onus-container');
    if (!poderes) return;

    let agendado = false;
    let timerItem = null;
    const agendar = () => {
        if (agendado) return;
        agendado = true;
        queueMicrotask(() => {
            agendado = false;
            sincronizarEfeitosPoderes();
        });
    };

    new MutationObserver(agendar).observe(poderes, { childList: true });
    const itens = document.querySelector('.items-container');
    if (itens) new MutationObserver(agendar).observe(itens, { childList: true });
    poderes.addEventListener('change', (e) => {
        if (e.target?.classList?.contains('power-name-input')) agendar();
    });
    if (onus) {
        new MutationObserver(agendar).observe(onus, { childList: true });
        onus.addEventListener('change', (e) => {
            if (e.target?.matches?.('.bonus-nome-input, .bonus-tipo-select')) agendar();
        });
    }
    document.addEventListener('input', (e) => {
        if (e.target?.matches?.('#secao-radar .level-input')) agendar();
        if (e.target?.matches?.('.items-container .item-nome-input')) {
            clearTimeout(timerItem);
            timerItem = setTimeout(agendar, 400);
        }
    });
    document.addEventListener('ficha:loaded', () => setTimeout(() => {
        if (!isHydrating()) sincronizarEfeitosPoderes();
    }, 100));
}
