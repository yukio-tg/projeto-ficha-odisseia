// ui/inventory.js
'use strict';

import { normalizar, escapeHtml, capitalize } from '../core/utils.js';
import { createDataLoader } from '../core/data-loader.js';
import { createAutocomplete } from '../core/autocomplete.js';
import { verificarOverflow, syncFieldToDisplay } from '../core/dom-helpers.js';

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
    { nome: 'Lendário', cor: '#f9a825', ordem: 5, limiteChave: 'lendario' }
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
const CATEGORIAS = ['arma', 'proteção', 'vestimenta', 'fonte', 'equipamento'];

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
    'vestimenta': 'apparel',
    'fonte':      'auto_awesome',
    'equipamento':'backpack'
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

// ========== Persistência local ==========
function salvarInventarioLocal() {
    const cardsData = [];
    document.querySelectorAll('.item-card').forEach(card => {
        const id = card.dataset.cardId;
        const nome = card.querySelector('.item-nome-input')?.value || '';
        const quantidade = parseInt(card.querySelector('.item-quantidade')?.value, 10) || 1;
        const pesoUnit = parseInt(card.querySelector('.item-peso-unit')?.value, 10) || 0;
        const raridade = card.dataset.raridade || 'comum';
        const estado = card.querySelector('.item-estado-select')?.value || ESTADOS.PADRAO.value;
        const categoria = card.querySelector('.item-categoria-select')?.value || '';
        const descricao = card.querySelector('.item-desc-textarea')?.value || '';
        const valor1 = card.querySelector('.item-valor1')?.value || '';
        const valor2 = card.querySelector('.item-valor2')?.value || '';
        cardsData.push({ id, nome, quantidade, pesoUnit, raridade, estado, categoria, descricao, valor1, valor2 });
    });
    localStorage.setItem('ficha_inventario', JSON.stringify(cardsData));
}

function carregarInventarioLocal() {
    const saved = localStorage.getItem('ficha_inventario');
    if (!saved) return;
    try {
        const cardsData = JSON.parse(saved);
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
                atualizarIconeEstado(card.querySelector('.item-estado-wrapper'));
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
            card.dispatchEvent(new Event('item-loaded', { bubbles: true }));
        });
        atualizarPesoTotal();
        atualizarContadoresRaridade();
    } catch (e) { console.warn('Erro ao carregar inventário local', e); }
}

// ========== Criação do card de item ==========
function criarCardItem(itemData, nomeForcado = '', savedData = null) {
    const cardId = `item_${Date.now()}_${cardCounter++}`;
    const card = document.createElement('div');
    card.className = 'item-card';
    card.dataset.cardId = cardId;

    let nome = nomeForcado || '';
    let peso = 1;
    let raridade = 'banal';
    let categoria = 'equipamento';
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
    const raridadeObj = RARIDADES.find(r => r.nome.toLowerCase() === raridade.toLowerCase()) || RARIDADES[0];
    card.style.setProperty('--item-rarity-color', raridadeObj.cor);

    let valor1 = '';
    let valor2 = '';
    if (itemData) {
        valor1 = itemData.valor1 || '';
    }
    if (savedData) {
        valor1 = savedData.valor1 || valor1;
        valor2 = savedData.valor2 || '';
    }

    card.innerHTML = `
        <div class="item-card-header">
            <button class="btn-item-minimize" type="button" title="Minimizar">
                <span class="material-symbols-outlined">expand_less</span>
            </button>
            <input type="text" class="item-nome-input" value="${escapeHtml(nome)}" placeholder="Nome do item">
            <div class="item-quantidade-container">
                <button class="btn-item-decrement" type="button" title="Reduzir quantidade">-</button>
                <input type="number" class="item-quantidade" value="${quantidade}" min="1" step="1" title="Quantidade">
            </div>
            <button class="btn-item-remove" type="button" title="Remover item">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
        <div class="item-card-body">
            <div class="item-meta-row">
                <div class="item-cat-wrapper" title="Categoria">
                    <span class="material-symbols-outlined item-cat-icon" style="font-variation-settings: 'FILL' 1;">${CAT_ICON[categoria] || 'backpack'}</span>
                    <span class="item-cat-label">${capitalize(categoria || 'equipamento')}</span>
                    <select class="item-categoria-select">
                        ${CATEGORIAS.map(c => `<option value="${c}" ${c === categoria ? 'selected' : ''}>${capitalize(c)}</option>`).join('')}
                    </select>
                </div>
                <div class="item-peso-container" title="Peso unitário">
                    <span class="material-symbols-outlined item-peso-icon">stat_1</span>
                    <input type="number" class="item-peso-unit" value="${peso}" step="1" min="0">
                </div>
                <div class="item-valores-row">
                    <div class="item-valor-field" title="Valor primário (ex: dano, defesa, bônus)">
                        <input type="text" class="item-valor-input item-valor1" value="${escapeHtml(valor1)}" placeholder="Valor 1">
                    </div>
                    <div class="item-valor-field" title="Valor secundário (ex: ônus, alcance, efeito)">
                        <input type="text" class="item-valor-input item-valor2" value="${escapeHtml(valor2)}" placeholder="Valor 2">
                    </div>
                </div>
                <div class="item-raridade-estado-group">
                    <div class="item-estado-wrapper" data-estado="${estado}" title="Estado">
                        <span class="material-symbols-outlined item-estado-icon" style="${ESTADO_ICON[estado] ? '' : 'display:none'}">${ESTADO_ICON[estado] || ''}</span>
                        <select class="item-estado-select">
                            <option value="${ESTADOS.PADRAO.value}" ${estado === ESTADOS.PADRAO.value ? 'selected' : ''}>${ESTADOS.PADRAO.label}</option>
                            <option value="${ESTADOS.ANULAR.value}" ${estado === ESTADOS.ANULAR.value ? 'selected' : ''}>${ESTADOS.ANULAR.label}</option>
                            <option value="${ESTADOS.COMPRADO.value}" ${estado === ESTADOS.COMPRADO.value ? 'selected' : ''}>${ESTADOS.COMPRADO.label}</option>
                        </select>
                    </div>
                    <select class="item-raridade-select" title="Raridade">
                        ${RARIDADES.map(r => `<option value="${r.nome.toLowerCase()}" ${r.nome.toLowerCase() === raridade ? 'selected' : ''}>${r.nome}</option>`).join('')}
                    </select>
                </div>
            </div>
            <textarea class="item-desc-textarea" placeholder="Descrição do item...">${escapeHtml(descricao)}</textarea>
        </div>
    `;

    // Minimizar
    let minimizado = false;
    const btnMin = card.querySelector('.btn-item-minimize');
    const body = card.querySelector('.item-card-body');
    btnMin.addEventListener('click', () => {
        minimizado = !minimizado;
        body.style.display = minimizado ? 'none' : '';
        btnMin.querySelector('.material-symbols-outlined').textContent = minimizado ? 'expand_more' : 'expand_less';
    });

    // Decrementar quantidade
    const qtdInput = card.querySelector('.item-quantidade');
    const btnDec = card.querySelector('.btn-item-decrement');
    btnDec.addEventListener('click', () => {
        let qtd = parseInt(qtdInput.value, 10) || 1;
        if (qtd > 1) {
            qtdInput.value = qtd - 1;
            qtdInput.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            card.remove();
            atualizarPesoTotal();
            atualizarContadoresRaridade();
            salvarInventarioLocal();
        }
    });

    // Eventos
    qtdInput.addEventListener('input', () => {
        atualizarPesoTotal();
        salvarInventarioLocal();
    });
    const pesoInput = card.querySelector('.item-peso-unit');
    pesoInput.addEventListener('input', () => {
        atualizarPesoTotal();
        salvarInventarioLocal();
    });
    const raridadeSelect = card.querySelector('.item-raridade-select');
    raridadeSelect.addEventListener('change', () => {
        const novaRaridade = raridadeSelect.value;
        card.dataset.raridade = novaRaridade;
        const novaCor = RARIDADES.find(r => r.nome.toLowerCase() === novaRaridade)?.cor || '#9e9e9e';
        card.style.setProperty('--item-rarity-color', novaCor);
        atualizarContadoresRaridade();
        salvarInventarioLocal();
    });
    const estadoSelect = card.querySelector('.item-estado-select');
    const estadoWrapper = card.querySelector('.item-estado-wrapper');
    estadoSelect.addEventListener('change', () => {
        atualizarIconeEstado(estadoWrapper);
        atualizarContadoresRaridade();
        salvarInventarioLocal();
    });
    const categoriaSelect = card.querySelector('.item-categoria-select');
    const catWrapper = card.querySelector('.item-cat-wrapper');
    categoriaSelect.addEventListener('change', () => {
        atualizarIconeCategoria(catWrapper);
        // Update label text
        const label = catWrapper.querySelector('.item-cat-label');
        if (label) label.textContent = categoriaSelect.options[categoriaSelect.selectedIndex].text;
        salvarInventarioLocal();
    });
    const descTextarea = card.querySelector('.item-desc-textarea');
    descTextarea.addEventListener('input', salvarInventarioLocal);
    const nomeInput = card.querySelector('.item-nome-input');
    nomeInput.addEventListener('input', salvarInventarioLocal);
    const valor1Input = card.querySelector('.item-valor1');
    const valor2Input = card.querySelector('.item-valor2');
    if (valor1Input) valor1Input.addEventListener('input', salvarInventarioLocal);
    if (valor2Input) valor2Input.addEventListener('input', salvarInventarioLocal);

    const btnRemove = card.querySelector('.btn-item-remove');
    btnRemove.addEventListener('click', () => {
        card.remove();
        atualizarPesoTotal();
        atualizarContadoresRaridade();
        salvarInventarioLocal();
    });

    setTimeout(() => {
        atualizarPesoTotal();
        atualizarContadoresRaridade();
    }, 0);

    return card;
}

// ========== Autocomplete (via shared engine) ==========
let autocompleteInstance = null;

// Função principal de adicionar item (com suporte a vazio)
function adicionarItemDoBusca() {
    const nomeDigitado = inputBusca.value.trim();

    // Se não houver texto, cria item vazio (Banal, peso 1)
    if (nomeDigitado === '') {
        const card = criarCardItem(null, '', {
            raridade: 'banal',
            pesoUnit: 1,
            categoria: 'equipamento',
            descricao: '',
            quantidade: 1,
            estado: ESTADOS.PADRAO.value
        });
        containerItems.appendChild(card);
        atualizarPesoTotal();
        atualizarContadoresRaridade();
        salvarInventarioLocal();
        inputBusca.value = '';
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

    carregarInventarioLocal();

    // Escuta eventos gerais de atualização da ficha
    document.addEventListener('reacoes:atualizar-stats', () => {
        atualizarPesoTotal();
        atualizarContadoresRaridade();
    });

    // Escutar atualizações de fortuna (herança, nível, checkbox)
    document.addEventListener('fortuna:atualizado', () => {
        atualizarContadoresRaridade();
    });

    // Sincronizar exibição do dinheiro (via shared helper)
    syncFieldToDisplay('[data-field="dinheiro"]', 'inventario-dinheiro', v => v || '0');

    // Sincronizar hierarquia + contadores de raridade
    hierarquiaDisplay = document.getElementById('inventario-hierarquia');
    const hierarquiaSelect = document.querySelector('[data-field="hierarquia"]');
    if (hierarquiaSelect) {
        const HIERARQUIA_LABELS = {
            'pobre': 'Pobre', 'trabalhador': 'Trabalhador', 'vendedor': 'Vendedor',
            'burgues': 'Burguês', 'barao': 'Barão', 'duque': 'Duque',
            'herdeiro': 'Herdeiro', 'imperador': 'Imperador'
        };
        const updateHierarquia = () => {
            const val = hierarquiaSelect.value;
            if (hierarquiaDisplay) {
                hierarquiaDisplay.textContent = HIERARQUIA_LABELS[val] || val;
            }
            atualizarContadoresRaridade();
        };
        hierarquiaSelect.addEventListener('change', updateHierarquia);
        hierarquiaSelect.addEventListener('input', updateHierarquia);
        const hierObs = new MutationObserver(updateHierarquia);
        hierObs.observe(hierarquiaSelect, { attributes: true, attributeFilter: ['value'] });
        updateHierarquia();
    }

    console.log('[Inventário] Inicializado com sucesso');
}