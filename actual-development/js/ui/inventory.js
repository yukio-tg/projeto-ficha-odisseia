// ui/inventory.js
'use strict';

import { normalizar, escapeHtml, capitalize } from '../core/utils.js';
import { createDataLoader } from '../core/data-loader.js';
import { createAutocomplete } from '../core/autocomplete.js';
import { verificarOverflow, syncFieldToDisplay } from '../core/dom-helpers.js';
import { onItemAdded, onItemRemoved, onItemCategoryChanged, onFonteRaridadeChanged, onFonteNomeChanged } from '../core/item-effects.js';

// ========== Configuração ==========
const itensLoader = createDataLoader('/data/itens.json', 'Inventário', 'itens');
let cardCounter = 0;

// Mapeamento de raridades para cores e ordem
const RARIDADES = [
    { nome: 'Banal', cor: '#9e9e9e', ordem: 0, limiteChave: 'banal' },
    { nome: 'Comum', cor: '#8b5a2b', ordem: 1, limiteChave: 'comum' },
    { nome: 'Incomum', cor: '#2e7d32', ordem: 2, limiteChave: 'incomum' },
    { nome: 'Raro', cor: '#1565c0', ordem: 3, limiteChave: 'raro' },
    { nome: 'Épico', cor: '#6a1b9a', ordem: 4, limiteChave: 'epico' },
    { nome: 'Lendário', cor: '#f9a825', ordem: 5, limiteChave: 'lendario' },
    { nome: 'Desconhecido', cor: '#424242', ordem: -1, limiteChave: 'desconhecido' }
];

// Tabela de limites por hierarquia (conforme especificação)
const LIMITES_POR_HIERARQUIA = {
    'pobre': [Infinity, 2, 0, 0, 0, 0],
    'trabalhador': [Infinity, 2, 1, 0, 0, 0],
    'vendedor': [Infinity, 3, 2, 0, 0, 0],
    'burgues': [Infinity, 3, 2, 1, 0, 0],
    'barao': [Infinity, 3, 3, 2, 1, 0],
    'duque': [Infinity, 4, 3, 3, 2, 1],
    'herdeiro': [Infinity, 4, 4, 4, 3, 2],
    'imperador': [Infinity, 5, 5, 4, 3, 3]
};

// Categorias possíveis
const CATEGORIAS = ['arma', 'proteção', 'fonte', 'básico'];

// Estado do item
const ESTADOS = {
    PADRAO: { value: 'padrao', label: 'Padrão', contaParaLimite: true },
    ANULAR: { value: 'anular', label: 'Anular', contaParaLimite: false },
    COMPRADO: { value: 'comprado', label: 'Comprado', contaParaLimite: false }
};

// Mapeamento de categoria → ícone Material Symbol
const CAT_ICON = {
    'arma':       'swords',
    'proteção':   'shield',
    'fonte':      'auto_awesome',
    'básico':'backpack'
};

// Mapeamento de estado → ícone Material Symbol
const ESTADO_ICON = {
    'padrao':   '',             // sem ícone: padrão é o estado "normal"
    'anular':   'block',
    'comprado': 'shopping_bag'
};

/** Atualiza o ícone de categoria no wrapper ao lado do select */
function atualizarIconeCategoria(wrapper) {
    const select = wrapper.querySelector('.item-categoria-select');
    const span   = wrapper.querySelector('.item-cat-icon');
    if (!select || !span) return;
    span.textContent = CAT_ICON[select.value] || 'backpack';
}

/** Atualiza o ícone de estado no wrapper ao lado do select */
function atualizarIconeEstado(wrapper) {
    const select = wrapper.querySelector('.item-estado-select');
    const span   = wrapper.querySelector('.item-estado-icon');
    if (!select || !span) return;
    const icon = ESTADO_ICON[select.value] ?? '';
    span.textContent = icon;
    span.style.display = icon ? '' : 'none';
    // aplica classe visual para colorir o ícone conforme estado
    wrapper.dataset.estado = select.value;
}

// Elementos DOM
let containerItems;
let inputBusca;
let invAtualInput;
let invTotalInput;
let btnAdicionar;
let hierarquiaDisplay;

// ========== Funções auxiliares ==========
function getHierarquiaAtual() {
    const select = document.querySelector('[data-field="hierarquia"]');
    return select ? select.value : 'pobre';
}

function getLimitesRaridade() {
    const hierarquia = getHierarquiaAtual();
    const limites = LIMITES_POR_HIERARQUIA[hierarquia] || LIMITES_POR_HIERARQUIA['pobre'];
    return {
        banal: limites[0],
        comum: limites[1],
        incomum: limites[2],
        raro: limites[3],
        epico: limites[4],
        lendario: limites[5]
    };
}

// ========== Contadores de raridade ==========
function atualizarContadoresRaridade() {
    const limites = getLimitesRaridade();
    const contagem = { banal: 0, comum: 0, incomum: 0, raro: 0, epico: 0, lendario: 0 };
    document.querySelectorAll('.item-card').forEach(card => {
        const estadoSelect = card.querySelector('.item-estado-select');
        if (estadoSelect && estadoSelect.value !== ESTADOS.PADRAO.value) return;
        const raridade = card.dataset.raridade;
        if (raridade && contagem.hasOwnProperty(raridade)) {
            contagem[raridade]++;
        }
    });

    for (const [raridadeKey, max] of Object.entries(limites)) {
        const atual = contagem[raridadeKey];
        const spanAtual = document.getElementById(`contador-${raridadeKey}-atual`);
        const spanMax = document.getElementById(`contador-${raridadeKey}-max`);
        const container = document.getElementById(`contador-${raridadeKey}`);
        if (spanAtual && spanMax) {
            spanAtual.textContent = atual;
            spanMax.textContent = (max === Infinity ? '∞' : max);
            if (container && max !== Infinity && atual > max) {
                container.classList.add('excedido');
            } else if (container) {
                container.classList.remove('excedido');
            }
        }
    }

    const avisoGlobal = document.getElementById('raridade-aviso-global');
    if (avisoGlobal) {
        const algumExcedido = Object.keys(limites).some(key => {
            if (limites[key] === Infinity) return false;
            return contagem[key] > limites[key];
        });
        avisoGlobal.style.display = algumExcedido ? 'inline-flex' : 'none';
    }
}

// ========== Soma do peso total (inteiro) ==========
function atualizarPesoTotal() {
    if (!invAtualInput) return;
    let totalPeso = 0;
    document.querySelectorAll('.item-card').forEach(card => {
        const qtdInput = card.querySelector('.item-quantidade');
        const pesoUnitInput = card.querySelector('.item-peso-unit');
        if (qtdInput && pesoUnitInput) {
            const qtd = parseInt(qtdInput.value, 10) || 0;
            const pesoUnit = parseInt(pesoUnitInput.value, 10) || 0;
            totalPeso += qtd * pesoUnit;
        }
    });
    invAtualInput.value = totalPeso;
    verificarInvOverflow();
    invAtualInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function verificarInvOverflow() {
    verificarOverflow('.total-inv', '[data-field="inv-atual"]', '[data-field="inv-total"]', 'inv-over-limit');
}

// ========== Persistência ==========
function salvarInventarioLocal() { /* substituído por auto-save Firebase */ }

let suppressEffects = false;

export function getInventarioState() {
    const cardsData = [];
    document.querySelectorAll('.item-card').forEach(card => {
        const id = card.dataset.cardId;
        const nome = card.querySelector('.item-nome-input')?.value || '';
        const quantidade = parseInt(card.querySelector('.item-quantidade')?.value, 10) || 1;
        const pesoUnit = parseInt(card.querySelector('.item-peso-unit')?.value, 10) || 0;
        const raridade = card.dataset.raridade || 'banal';
        const estado = card.querySelector('.item-estado-select')?.value || ESTADOS.PADRAO.value;
        const categoria = card.querySelector('.item-categoria-select')?.value || '';
        const descricao = card.querySelector('.item-desc-textarea')?.value || '';
        const valor1 = card.querySelector('.item-valor1')?.value || '';
        const valor2 = card.querySelector('.item-valor2')?.value || '';
        const itemSource = card.dataset.itemSource || '';
        cardsData.push({ id, nome, quantidade, pesoUnit, raridade, estado, categoria, descricao, valor1, valor2, itemSource });
    });
    return cardsData;
}

export function setInventarioState(cardsData) {
    if (!containerItems || !Array.isArray(cardsData)) return;
    containerItems.innerHTML = '';
    suppressEffects = true;
    try {
        cardsData.forEach(data => {
            const card = criarCardItem(null, data.nome, data);
            containerItems.appendChild(card);
            const qtdInput = card.querySelector('.item-quantidade');
            if (qtdInput) qtdInput.value = data.quantidade;
            const pesoInput = card.querySelector('.item-peso-unit');
            if (pesoInput) pesoInput.value = data.pesoUnit;
            const raridadeSelect = card.querySelector('.item-raridade-select');
            if (raridadeSelect) {
                raridadeSelect.value = data.raridade;
                card.dataset.raridade = data.raridade;
            }
            const estadoSelect = card.querySelector('.item-estado-select');
            if (estadoSelect) {
                estadoSelect.value = data.estado;
                const glyphEl = card.querySelector('.item-raridade-glyph');
                if (glyphEl) glyphEl.dataset.estado = data.estado;
            }
            const catSelect = card.querySelector('.item-categoria-select');
            if (catSelect) {
                catSelect.value = data.categoria;
                atualizarIconeCategoria(card.querySelector('.item-cat-wrapper'));
                const catLabel = card.querySelector('.item-cat-label');
                if (catLabel) catLabel.textContent = catSelect.options[catSelect.selectedIndex].text;
            }
            const descTextarea = card.querySelector('.item-desc-textarea');
            if (descTextarea) descTextarea.value = data.descricao;
            const v1 = card.querySelector('.item-valor1');
            if (v1 && data.valor1) v1.value = data.valor1;
            const v2 = card.querySelector('.item-valor2');
            if (v2 && data.valor2) v2.value = data.valor2;
            if (data.itemSource) card.dataset.itemSource = data.itemSource;
            card.dispatchEvent(new Event('item-loaded', { bubbles: true }));
        });
        atualizarPesoTotal();
        atualizarContadoresRaridade();
    } catch (e) { console.warn('Erro ao carregar inventário local', e); }
    // Defer the reset: each criarCardItem queues a setTimeout(0) that calls onItemAdded.
    // By deferring suppressEffects = false to ANOTHER setTimeout(0) (queued last), all of
    // those callbacks fire while suppressEffects is still true, preventing duplicate effects.
    setTimeout(() => { suppressEffects = false; }, 0);
}

// ========== Reordenação automática ==========
function reordenarItems() {
    if (!containerItems) return;
    const cards = Array.from(containerItems.querySelectorAll('.item-card'));
    cards.sort((a, b) => {
        const raA = RARIDADES.findIndex(r => r.limiteChave === a.dataset.raridade);
        const raB = RARIDADES.findIndex(r => r.limiteChave === b.dataset.raridade);
        if (raA !== raB) return raB - raA;
        const nomeA = (a.querySelector('.item-nome-input')?.value || '').toLowerCase();
        const nomeB = (b.querySelector('.item-nome-input')?.value || '').toLowerCase();
        return nomeA.localeCompare(nomeB, 'pt');
    });
    cards.forEach(c => containerItems.appendChild(c));
}

// ========== Glyph helper para raridade ==========
function getRaridadeGlyph(raridade) {
    if (raridade === 'desconhecido') return '?';
    const obj = RARIDADES.find(r => r.limiteChave === raridade) || RARIDADES[0];
    return obj.nome.charAt(0);
}

// ========== Criação do card de item ==========
function criarCardItem(itemData, nomeForcado = '', savedData = null) {
    // When restoring from saved data, reuse the original cardId so that
    // activeWeapons/activeFontes lookups (which use cardId as key) still match.
    const cardId = savedData?.id || `item_${Date.now()}_${cardCounter++}`;
    const card = document.createElement('div');
    card.className = 'item-card';
    card.dataset.cardId = cardId;

    let nome = nomeForcado || '';
    let peso = 1;
    let raridade = 'banal';
    let categoria = 'básico';
    let descricao = '';
    let quantidade = 1;
    let estado = ESTADOS.PADRAO.value;

    if (itemData) {
        nome = itemData.nome || nome;
        peso = (itemData.peso !== undefined && !isNaN(itemData.peso)) ? parseInt(itemData.peso, 10) : 1;
        raridade = itemData.raridade || raridade;
        categoria = itemData.categoria || categoria;
        descricao = itemData.descricao || '';
    }
    if (savedData) {
        nome = savedData.nome || nome;
        peso = (savedData.pesoUnit !== undefined && !isNaN(savedData.pesoUnit)) ? parseInt(savedData.pesoUnit, 10) : 1;
        raridade = savedData.raridade || raridade;
        categoria = savedData.categoria || categoria;
        descricao = savedData.descricao || descricao;
        quantidade = savedData.quantidade !== undefined ? savedData.quantidade : quantidade;
        estado = savedData.estado || estado;
    }

    card.dataset.raridade = raridade;
    // Store full item source data for cross-tab effect hooks
    if (itemData) card.dataset.itemSource = JSON.stringify(itemData);
    const raridadeObj = RARIDADES.find(r => r.nome.toLowerCase() === raridade.toLowerCase()) || RARIDADES[0];
    card.style.setProperty('--item-rarity-color', raridadeObj.cor);

    let valor1 = '';
    let valor2 = '';
    if (itemData) { valor1 = itemData.valor1 || ''; }
    if (savedData) { valor1 = savedData.valor1 || valor1; valor2 = savedData.valor2 || ''; }

    const glyph = getRaridadeGlyph(raridade);

    card.innerHTML = `
        <div class="item-card-header">
            <button class="btn-item-minimize" type="button" title="Minimizar">
                <span class="material-symbols-outlined">expand_less</span>
            </button>
            <div class="item-peso-header" title="Peso">
                <span class="item-peso-label">Peso</span>
                <input type="number" class="item-peso-unit" value="${peso}" step="1" min="0">
            </div>
            <input type="text" class="item-nome-input" value="${escapeHtml(nome)}" placeholder="Nome do item">
            <div class="item-quantidade-container">
                <span class="item-qty-tag">Qtd</span>
                <button class="btn-item-increment" type="button" title="Aumentar">+</button>
                <input type="number" class="item-quantidade" value="${quantidade}" min="1" step="1" title="Quantidade">
                <button class="btn-item-decrement" type="button" title="Reduzir">-</button>
            </div>
            <button class="btn-item-remove" type="button" title="Remover item">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
        <div class="item-card-body">
            <div class="item-body-left">
                <div class="item-raridade-glyph" data-estado="${estado}" title="Raridade: ${raridadeObj.nome} \u00b7 Estado: ${capitalize(estado)}">
                    <span class="glyph-letter">${glyph}</span>
                    <span class="glyph-overlay"></span>
                    <select class="item-raridade-select">
                        ${RARIDADES.map(r => `<option value="${r.limiteChave}" ${r.limiteChave === raridade ? 'selected' : ''}>${r.nome}</option>`).join('')}
                    </select>
                    <select class="item-estado-select">
                        <option value="${ESTADOS.PADRAO.value}" ${estado === ESTADOS.PADRAO.value ? 'selected' : ''}>${ESTADOS.PADRAO.label}</option>
                        <option value="${ESTADOS.ANULAR.value}" ${estado === ESTADOS.ANULAR.value ? 'selected' : ''}>${ESTADOS.ANULAR.label}</option>
                        <option value="${ESTADOS.COMPRADO.value}" ${estado === ESTADOS.COMPRADO.value ? 'selected' : ''}>${ESTADOS.COMPRADO.label}</option>
                    </select>
                    <div class="glyph-hover-zone glyph-hover-zone--top"></div>
                    <div class="glyph-hover-zone glyph-hover-zone--bottom"></div>
                </div>
            </div>
            <textarea class="item-desc-textarea" placeholder="Descri\u00e7\u00e3o do item...">${escapeHtml(descricao)}</textarea>
            <div class="item-body-right">
                <div class="item-cat-wrapper" title="Categoria">
                    <span class="material-symbols-outlined item-cat-icon" style="font-variation-settings: 'FILL' 1;">${CAT_ICON[categoria] || 'backpack'}</span>
                    <span class="item-cat-label">${capitalize(categoria || 'básico').toUpperCase()}</span>
                    <select class="item-categoria-select">
                        ${CATEGORIAS.map(c => `<option value="${c}" ${c === categoria ? 'selected' : ''}>${capitalize(c)}</option>`).join('')}
                    </select>
                </div>
                <div class="item-valor-field">
                    <input type="text" class="item-valor-input item-valor1" value="${escapeHtml(valor1)}" placeholder="Valor 1">
                </div>
                <div class="item-valor-field">
                    <input type="text" class="item-valor-input item-valor2" value="${escapeHtml(valor2)}" placeholder="Valor 2">
                </div>
            </div>
        </div>
    `;

    // === Event bindings ===
    let minimizado = false;
    const btnMin = card.querySelector('.btn-item-minimize');
    const body = card.querySelector('.item-card-body');
    btnMin.addEventListener('click', () => {
        minimizado = !minimizado;
        body.style.display = minimizado ? 'none' : '';
        btnMin.querySelector('.material-symbols-outlined').textContent = minimizado ? 'expand_more' : 'expand_less';
    });

    const qtdInput = card.querySelector('.item-quantidade');
    const btnDec = card.querySelector('.btn-item-decrement');
    const btnInc = card.querySelector('.btn-item-increment');
    btnDec.addEventListener('click', () => {
        let qtd = parseInt(qtdInput.value, 10) || 1;
        if (qtd > 1) { qtdInput.value = qtd - 1; qtdInput.dispatchEvent(new Event('input', { bubbles: true })); }
        else {
            const cat = card.querySelector('.item-categoria-select')?.value || 'básico';
            onItemRemoved(cardId, cat, getCardItemData(card));
            card.remove();
            atualizarPesoTotal();
            atualizarContadoresRaridade();
            salvarInventarioLocal();
        }
    });
    btnInc.addEventListener('click', () => {
        qtdInput.value = (parseInt(qtdInput.value, 10) || 1) + 1;
        qtdInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    qtdInput.addEventListener('input', () => { atualizarPesoTotal(); salvarInventarioLocal(); });

    const pesoInput = card.querySelector('.item-peso-unit');
    pesoInput.addEventListener('input', () => { atualizarPesoTotal(); salvarInventarioLocal(); });

    // Raridade + Estado glyph
    const glyphEl = card.querySelector('.item-raridade-glyph');
    const raridadeSelect = card.querySelector('.item-raridade-select');
    const estadoSelect = card.querySelector('.item-estado-select');
    function updateGlyph() {
        const r = raridadeSelect.value;
        const e = estadoSelect.value;
        const rObj = RARIDADES.find(x => x.limiteChave === r) || RARIDADES[0];
        card.dataset.raridade = r;
        card.style.setProperty('--item-rarity-color', rObj.cor);
        glyphEl.querySelector('.glyph-letter').textContent = getRaridadeGlyph(r);
        glyphEl.dataset.estado = e;
        glyphEl.title = `Raridade: ${rObj.nome} \u00b7 Estado: ${capitalize(e)}`;
    }
    raridadeSelect.addEventListener('change', () => {
        updateGlyph(); atualizarContadoresRaridade(); reordenarItems(); salvarInventarioLocal();
        const currentCat = card.querySelector('.item-categoria-select')?.value || '';
        if (currentCat === 'fonte') onFonteRaridadeChanged(cardId, raridadeSelect.value);
    });
    estadoSelect.addEventListener('change', () => { updateGlyph(); atualizarContadoresRaridade(); salvarInventarioLocal(); });

    const categoriaSelect = card.querySelector('.item-categoria-select');
    const catWrapper = card.querySelector('.item-cat-wrapper');
    let prevCategoria = categoria;
    categoriaSelect.addEventListener('change', () => {
        atualizarIconeCategoria(catWrapper);
        const label = catWrapper.querySelector('.item-cat-label');
        if (label) label.textContent = categoriaSelect.options[categoriaSelect.selectedIndex].text.toUpperCase();
        const newCat = categoriaSelect.value;
        onItemCategoryChanged(cardId, prevCategoria, newCat, getCardItemData(card));
        prevCategoria = newCat;
        salvarInventarioLocal();
    });

    const descTextarea = card.querySelector('.item-desc-textarea');
    descTextarea.addEventListener('input', salvarInventarioLocal);
    const nomeInput = card.querySelector('.item-nome-input');
    let reorderTimeout = null;
    nomeInput.addEventListener('input', () => {
        salvarInventarioLocal();
        clearTimeout(reorderTimeout);
        reorderTimeout = setTimeout(reordenarItems, 800);
        // Se for uma fonte, atualiza o nome exibido no tab de Magias
        const currentCat = card.querySelector('.item-categoria-select')?.value || categoria;
        if (currentCat === 'fonte') {
            onFonteNomeChanged(cardId, nomeInput.value.trim());
        }
    });
    const valor1Input = card.querySelector('.item-valor1');
    const valor2Input = card.querySelector('.item-valor2');
    if (valor1Input) valor1Input.addEventListener('input', salvarInventarioLocal);
    if (valor2Input) valor2Input.addEventListener('input', salvarInventarioLocal);

    const btnRemove = card.querySelector('.btn-item-remove');
    btnRemove.addEventListener('click', () => {
        const cat = card.querySelector('.item-categoria-select')?.value || 'básico';
        onItemRemoved(cardId, cat, getCardItemData(card));
        card.remove();
        atualizarPesoTotal();
        atualizarContadoresRaridade();
        salvarInventarioLocal();
    });

    // Trigger cross-tab effects for non-básico categories
    setTimeout(() => {
        atualizarPesoTotal();
        atualizarContadoresRaridade();
        if (!suppressEffects && categoria !== 'básico') {
            onItemAdded(cardId, categoria, getCardItemData(card));
        }
    }, 0);
    return card;
}

function getCardItemData(card) {
    // Merge stored JSON source with current card values
    let source = {};
    try { source = JSON.parse(card.dataset.itemSource || '{}'); } catch (e) { /* noop */ }
    return {
        ...source,
        nome: card.querySelector('.item-nome-input')?.value || source.nome || '',
        categoria: card.querySelector('.item-categoria-select')?.value || source.categoria || 'básico',
        raridade: card.dataset.raridade || source.raridade || 'banal',
        peso: parseInt(card.querySelector('.item-peso-unit')?.value, 10) || source.peso || 0,
        descricao: card.querySelector('.item-desc-textarea')?.value || source.descricao || '',
        valor1: card.querySelector('.item-valor1')?.value || source.valor1 || '',
        valor2: card.querySelector('.item-valor2')?.value || source.valor2 || '',
    };
}

// ========== Autocomplete (via shared engine) ==========
let autocompleteInstance = null;

// Função principal de adicionar item (com suporte a vazio)
function adicionarItemDoBusca() {
    const nomeDigitado = inputBusca.value.trim();

    if (nomeDigitado === '') {
        const card = criarCardItem(null, '');
        containerItems.appendChild(card);
        reordenarItems();
        atualizarPesoTotal();
        atualizarContadoresRaridade();
        salvarInventarioLocal();
        if (autocompleteInstance) autocompleteInstance.close();
        return;
    }

    let itemEncontrado = null;
    if (!itensLoader.hasError() && !itensLoader.isLoading()) {
        const nomeNorm = normalizar(nomeDigitado);
        itemEncontrado = itensLoader.getData().find(i => normalizar(i.nome) === nomeNorm);
    }
    const card = criarCardItem(itemEncontrado, nomeDigitado);
    containerItems.appendChild(card);
    reordenarItems();
    atualizarPesoTotal();
    atualizarContadoresRaridade();
    salvarInventarioLocal();
    inputBusca.value = '';
    if (autocompleteInstance) autocompleteInstance.close();
}

// ========== Inicialização ==========
export async function initInventory() {
    await itensLoader.load();

    containerItems = document.querySelector('.items-container');
    if (!containerItems) return console.error('[Inventário] .items-container não encontrado');
    inputBusca = document.querySelector('.item-searchbox input');
    if (!inputBusca) return console.error('[Inventário] .item-searchbox input não encontrado');
    invAtualInput = document.querySelector('[data-field="inv-atual"]');
    invTotalInput = document.querySelector('[data-field="inv-total"]');
    btnAdicionar = document.getElementById('btn-add-item');
    if (btnAdicionar) btnAdicionar.addEventListener('click', adicionarItemDoBusca);

    // Autocomplete (via shared engine)
    autocompleteInstance = createAutocomplete({
        input: inputBusca,
        containerSelector: '.item-container-searcher',
        dropdownClass: 'autocomplete-itens-dropdown',
        itemClass: 'autocomplete-item-item',
        activeClass: 'autocomplete-item-item--active',
        getItems: () => itensLoader.getData(),
        filterFn: (item, qNorm) => normalizar(item.nome).includes(qNorm),
        renderItem: (item) => {
            const raridadeObj = RARIDADES.find(r => r.nome.toLowerCase() === (item.raridade || 'banal').toLowerCase()) || RARIDADES[0];
            return `<span class="autocomplete-raridade-dot" style="background-color:${raridadeObj.cor}"></span><strong>${escapeHtml(item.nome)}</strong><small>${item.categoria || ''}</small>`;
        },
        onSelect: (item) => { inputBusca.value = item.nome; },
        onEnter: adicionarItemDoBusca
    });

    // Carregamento inicial é feito pelo sheet-serializer via setInventarioState()

    // Escuta eventos gerais de atualização da ficha
    document.addEventListener('reacoes:atualizar-stats', () => {
        atualizarPesoTotal();
        atualizarContadoresRaridade();
    });

    // Escutar atualizações de fortuna (herança, nível, checkbox)
    document.addEventListener('fortuna:atualizado', () => {
        atualizarContadoresRaridade();
    });

    // Bidirectional sync: since both tab-geral and tab-inventario now use
    // the same data-field attributes, we sync all elements sharing [data-field="dinheiro"]
    // and [data-field="hierarquia"] bidirectionally.
    setupBidirectionalSync('dinheiro');
    setupBidirectionalSync('hierarquia');

    // Also listen for hierarquia changes to update raridade counters
    document.querySelectorAll('[data-field="hierarquia"]').forEach(el => {
        el.addEventListener('change', atualizarContadoresRaridade);
        el.addEventListener('input', atualizarContadoresRaridade);
    });
    atualizarContadoresRaridade();

    // Fix: manual edits on inv-total must trigger overflow check
    if (invTotalInput) {
        invTotalInput.addEventListener('input', verificarInvOverflow);
        invTotalInput.addEventListener('change', verificarInvOverflow);
    }
    if (invAtualInput) {
        invAtualInput.addEventListener('input', verificarInvOverflow);
        invAtualInput.addEventListener('change', verificarInvOverflow);
    }

    console.log('[Inventário] Inicializado com sucesso');
}

// ========== Bidirectional Sync for shared data-fields ==========
function setupBidirectionalSync(fieldName) {
    const elements = document.querySelectorAll(`[data-field="${fieldName}"]`);
    if (elements.length < 2) return;

    let syncing = false;
    elements.forEach(source => {
        const handler = () => {
            if (syncing) return;
            syncing = true;
            const val = source.value;
            elements.forEach(target => {
                if (target !== source && target.value !== val) {
                    target.value = val;
                    target.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
            syncing = false;
        };
        source.addEventListener('input', handler);
        source.addEventListener('change', handler);
    });
}