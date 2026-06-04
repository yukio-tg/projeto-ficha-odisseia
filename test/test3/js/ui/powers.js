// ui/powers.js
'use strict';

// ========== Configuração ==========
const JSON_PATH = '/data/poderes.json'; // Ajuste para o caminho real do seu JSON

// Estado dos dados
let poderesDB = [];
let dataLoading = true;
let dataError = false;

const ordemCores = [
    "Vermelho",
    "Vermelho escuro",
    "Laranja",
    "Amarelo",
    "Azul",
    "Verde",
    "Roxo",
    "Rosa"
];

const corCSSMap = {
    "Vermelho": "#c0392b",
    "Vermelho escuro": "#7b1a10",
    "Laranja": "#c96a12",
    "Amarelo": "#b8920a",
    "Azul": "#2e6e9e",
    "Verde": "#4a7c3f",
    "Roxo": "#6b4a8a",
    "Rosa": "#a85070"
};

let containerCards;
let inputBusca;
let ptAtualInput;
let btnAdicionar;
let btnCategorySearch;
let currentSelectedColor = null;
let colorDropdownGlobal = null;
let cardCounter = 0;

// ---------- Carregar dados do JSON ----------
async function carregarPoderes() {
    try {
        const response = await fetch(JSON_PATH);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('JSON não é um array');
        poderesDB = data;
        dataError = false;
        console.log(`[Powers] Carregados ${poderesDB.length} poderes do JSON`);
    } catch (err) {
        console.error('[Powers] Erro ao carregar poderes.json:', err);
        poderesDB = [];
        dataError = true;
    } finally {
        dataLoading = false;
    }
}

// ---------- Funções auxiliares ----------
function normalizar(str) {
    return (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function atualizarTotalPt() {
    if (!ptAtualInput) return;
    let soma = 0;
    document.querySelectorAll('.card-power .pt-cost-input').forEach(input => {
        let valor = parseInt(input.value, 10);
        if (isNaN(valor)) valor = 0;
        soma += valor;
    });
    ptAtualInput.value = soma;
    // Força o calculation.js a verificar overflow
    ptAtualInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function indiceCor(cor) {
    const idx = ordemCores.indexOf(cor);
    return idx !== -1 ? idx : ordemCores.length;
}

function reordenarCards() {
    const cards = Array.from(containerCards.querySelectorAll('.card-power'));
    cards.sort((a, b) => {
        const corA = a.dataset.cor || "Vermelho";
        const corB = b.dataset.cor || "Vermelho";
        return indiceCor(corA) - indiceCor(corB);
    });
    cards.forEach(card => containerCards.appendChild(card));
}

function toggleCard(card, collapsed) {
    const body = card.querySelector('.body-power');
    const btn = card.querySelector('.btn-summarize');
    if (collapsed) {
        body.style.display = 'none';
        btn.classList.add('collapsed');
    } else {
        body.style.display = '';
        btn.classList.remove('collapsed');
    }
    card.dataset.collapsed = collapsed ? 'true' : 'false';
}

// ---------- Color Dot Selector (shared dropdown) ----------
function criarColorDropdownGlobal() {
    if (colorDropdownGlobal) return colorDropdownGlobal;
    colorDropdownGlobal = document.createElement('div');
    colorDropdownGlobal.className = 'color-dot-dropdown';

    const noneBtn = document.createElement('button');
    noneBtn.type = 'button';
    noneBtn.className = 'color-dot color-dot--none';
    noneBtn.title = 'Nenhuma';
    colorDropdownGlobal.appendChild(noneBtn);

    ordemCores.forEach(cor => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'color-dot';
        btn.style.backgroundColor = corCSSMap[cor];
        btn.dataset.cor = cor;
        btn.title = cor;
        colorDropdownGlobal.appendChild(btn);
    });

    document.body.appendChild(colorDropdownGlobal);
    return colorDropdownGlobal;
}

function fecharColorDropdown() {
    if (colorDropdownGlobal) colorDropdownGlobal.classList.remove('color-dot-dropdown--open');
    colorDropdownGlobal._callback = null;
    colorDropdownGlobal._anchor = null;
}

function abrirColorDropdown(anchorEl, corAtual, callback) {
    const dropdown = criarColorDropdownGlobal();
    dropdown._callback = callback;
    dropdown._anchor = anchorEl;

    dropdown.querySelectorAll('.color-dot').forEach(btn => {
        btn.classList.toggle('color-dot--active', btn.dataset.cor === corAtual);
    });

    const rect = anchorEl.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    dropdown.classList.add('color-dot-dropdown--open');
}

function setupColorDropdownEvents() {
    document.addEventListener('click', (e) => {
        if (!colorDropdownGlobal) return;
        if (!colorDropdownGlobal.classList.contains('color-dot-dropdown--open')) return;

        const dot = e.target.closest('.color-dot');
        if (dot && colorDropdownGlobal.contains(dot)) {
            const cor = dot.dataset.cor || null;
            if (colorDropdownGlobal._callback) colorDropdownGlobal._callback(cor);
            fecharColorDropdown();
            return;
        }

        if (!colorDropdownGlobal._anchor?.contains(e.target) && !colorDropdownGlobal.contains(e.target)) {
            fecharColorDropdown();
        }
    });
}

// ---------- Category Search dot ----------
function atualizarCategoryDot() {
    if (!btnCategorySearch) return;
    const dot = btnCategorySearch.querySelector('.category-color-dot');
    if (!dot) return;
    if (currentSelectedColor && corCSSMap[currentSelectedColor]) {
        dot.style.backgroundColor = corCSSMap[currentSelectedColor];
        dot.classList.add('category-color-dot--active');
    } else {
        dot.style.backgroundColor = '';
        dot.classList.remove('category-color-dot--active');
    }
}

// ---------- Card ----------
function criarCardPower(powerData, nomeForcado = '', corSobrescrita = null) {
    const cardId = `power_${Date.now()}_${cardCounter++}`;
    const card = document.createElement('div');
    card.className = 'card-power';
    card.setAttribute('data-card-id', cardId);

    let nome = '';
    let ptCost = 0;
    let otherCosts = '';
    let descricao = '';
    let corInicial = corSobrescrita || "Vermelho";

    if (powerData) {
        nome = powerData.nome || '';
        ptCost = powerData.ptCost !== undefined ? powerData.ptCost : 0;
        otherCosts = powerData.otherCosts || '';
        descricao = powerData.descricao || '';
        corInicial = (corSobrescrita !== null) ? corSobrescrita : (powerData.cor || "Vermelho");
    } else if (nomeForcado && nomeForcado.trim() !== '') {
        nome = nomeForcado.trim();
        corInicial = corSobrescrita || "Vermelho";
    }

    card.dataset.cor = corInicial;
    card.style.setProperty('--card-color', corCSSMap[corInicial] || corCSSMap["Vermelho"]);

    card.innerHTML = `
        <div class="header-power">
            <button class="btn-summarize" type="button" title="Minimizar/Expandir"></button>
            <div class="card-color-dot-wrapper"></div>
            <div class="power-first-container">
                <input type="number" class="pt-cost-input" data-field="${cardId}_pt" value="${ptCost}" min="0" step="1" placeholder="PT">
                <div class="power-name-container">
                    <input type="text" class="power-name-input" data-field="${cardId}_nome" value="${escapeHtml(nome)}" placeholder="Nome do Poder" oninput="this.parentNode.dataset.value = this.value">
                </div>
                <input type="text" class="other-costs-input" data-field="${cardId}_other" value="${escapeHtml(otherCosts)}" placeholder="0">
            </div>
            <button class="btn-remove-power" type="button" title="Remover poder"><span class="material-symbols-outlined" style="font-size:15px;" aria-hidden="true">close</span></button>
        </div>
        <div class="body-power">
            <textarea class="power-desc-textarea" data-field="${cardId}_desc" placeholder="Descrição do poder...">${escapeHtml(descricao)}</textarea>
        </div>
    `;

    const dotWrapper = card.querySelector('.card-color-dot-wrapper');
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'card-color-dot';
    dot.style.backgroundColor = corCSSMap[corInicial] || corCSSMap["Vermelho"];
    dot.dataset.cor = corInicial;
    dot.title = corInicial;
    dotWrapper.appendChild(dot);

    dot.addEventListener('click', (e) => {
        e.stopPropagation();
        abrirColorDropdown(dot, card.dataset.cor, (novaCor) => {
            const cor = novaCor || "Vermelho";
            card.dataset.cor = cor;
            card.style.setProperty('--card-color', corCSSMap[cor]);
            dot.style.backgroundColor = corCSSMap[cor];
            dot.dataset.cor = cor;
            dot.title = cor;
            reordenarCards();
        });
    });

    toggleCard(card, true);

    card.querySelector('.pt-cost-input').addEventListener('input', atualizarTotalPt);

    card.querySelector('.btn-remove-power').addEventListener('click', () => {
        card.remove();
        atualizarTotalPt();
        reordenarCards();
    });

    card.querySelector('.btn-summarize').addEventListener('click', () => {
        const isCollapsed = card.dataset.collapsed === 'true';
        toggleCard(card, !isCollapsed);
    });

    return card;
}

function adicionarPoderDoBusca() {
    if (!inputBusca) return;
    const nomeDigitado = inputBusca.value.trim();
    const corParaCard = currentSelectedColor !== null ? currentSelectedColor : "Vermelho";

    if (nomeDigitado === '') {
        const novoCard = criarCardPower(null, '', corParaCard);
        containerCards.appendChild(novoCard);
    } else {
        let poderEncontrado = null;
        if (!dataError && !dataLoading) {
            const nomeNorm = normalizar(nomeDigitado);
            poderEncontrado = poderesDB.find(p => normalizar(p.nome) === nomeNorm);
        }
        const novoCard = criarCardPower(poderEncontrado || null, nomeDigitado, corParaCard);
        containerCards.appendChild(novoCard);
    }

    atualizarTotalPt();
    reordenarCards();
    currentSelectedColor = null;
    atualizarCategoryDot();
    inputBusca.value = '';
    fecharAutocomplete();
}

// ---------- Autocomplete (com suporte a erro e loading) ----------
function criarAutocomplete() {
    let dropdown = document.querySelector('.autocomplete-powers-dropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-powers-dropdown';
        const container = inputBusca.closest('.power-container-searcher');
        container.style.position = 'relative';
        container.appendChild(dropdown);
    }
    return dropdown;
}

function fecharAutocomplete() {
    const dropdown = document.querySelector('.autocomplete-powers-dropdown');
    if (dropdown) dropdown.style.display = 'none';
}

function mostrarAutocomplete(query) {
    const dropdown = criarAutocomplete();
    
    // Caso ainda carregando
    if (dataLoading) {
        return;
    }
    
    // Caso erro no JSON
    if (dataError) {
        return;
    }
    
    // Sem query
    if (!query || query.trim() === '') {
        fecharAutocomplete();
        return;
    }
    
    const qNorm = normalizar(query);
    const resultados = poderesDB.filter(p => normalizar(p.nome).includes(qNorm)).slice(0, 8);
    if (resultados.length === 0) {
        return;
    }

    dropdown.innerHTML = '';
    resultados.forEach(p => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item-power';
        const bolinha = `<span class="autocomplete-cor-dot" style="background-color:${corCSSMap[p.cor] || '#ccc'}"></span>`;
        item.innerHTML = `${bolinha}<strong>${escapeHtml(p.nome)}</strong><span>PT: ${p.ptCost}</span>`;
        item.addEventListener('click', () => {
            inputBusca.value = p.nome;
            currentSelectedColor = p.cor || "Vermelho";
            atualizarCategoryDot();
            fecharAutocomplete();
            btnAdicionar.focus();
        });
        dropdown.appendChild(item);
    });
    dropdown.style.display = 'block';
    dropdown.style.width = inputBusca.offsetWidth + 'px';
}

function setupAutocompleteKeyboard() {
    let currentIndex = -1;
    inputBusca.addEventListener('keydown', (e) => {
        const dropdown = document.querySelector('.autocomplete-powers-dropdown');
        const isDropdownVisible = dropdown && dropdown.style.display === 'block';
        const items = isDropdownVisible ? dropdown.querySelectorAll('.autocomplete-item-power') : [];

        if (isDropdownVisible && items.length) {
            // Navegação com setas apenas quando dropdown está visível
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                currentIndex = (currentIndex + 1) % items.length;
                items.forEach((item, i) => item.classList.toggle('autocomplete-item-power--active', i === currentIndex));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                currentIndex = (currentIndex - 1 + items.length) % items.length;
                items.forEach((item, i) => item.classList.toggle('autocomplete-item-power--active', i === currentIndex));
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (currentIndex >= 0 && items[currentIndex]) {
                    items[currentIndex].click();   // seleciona o item do autocomplete
                    return;
                }
            }
            if (e.key === 'Escape') {
                fecharAutocomplete();
                return;
            }
        }

        // Se o dropdown NÃO está visível, ou está mas não há item selecionado, Enter chama adicionar
        if (e.key === 'Enter') {
            e.preventDefault();
            adicionarPoderDoBusca();
        }
    });

    // Fechar dropdown ao clicar fora
    document.addEventListener('click', (e) => {
        const dropdown = document.querySelector('.autocomplete-powers-dropdown');
        if (!inputBusca.contains(e.target) && !dropdown?.contains(e.target)) fecharAutocomplete();
    });
}

// ---------- Inicialização (assíncrona) ----------
export async function initPowers() {
    // Carrega os dados primeiro
    await carregarPoderes();
    
    containerCards = document.querySelector('.powers-container');
    if (!containerCards) return console.error('[Powers] .powers-container não encontrado');
    inputBusca = document.querySelector('.power-searchbox input');
    if (!inputBusca) return console.error('[Powers] .power-searchbox input não encontrado');
    ptAtualInput = document.querySelector('.total-pt input[data-field="pt-atual"]');

    btnAdicionar = document.getElementById('btn-add-power');
    if (!btnAdicionar) {
        const containerSearcher = document.querySelector('.power-container-searcher');
        if (containerSearcher) {
            btnAdicionar = document.createElement('button');
            btnAdicionar.id = 'btn-add-power';
            btnAdicionar.type = 'button';
            btnAdicionar.className = 'btn-add-power';
            btnAdicionar.innerHTML = '<span class="material-symbols-outlined" style="font-size:15px;" aria-hidden="true">add</span>';
            containerSearcher.appendChild(btnAdicionar);
        } else return console.error('[Powers] .power-container-searcher não encontrado');
    }
    btnAdicionar.addEventListener('click', adicionarPoderDoBusca);

    btnCategorySearch = document.querySelector('.power-container-searcher .power-category');
    if (btnCategorySearch) {
        btnCategorySearch.innerHTML = '<span class="category-color-dot"></span>';
        btnCategorySearch.classList.add('power-category--dot');
        btnCategorySearch.style.cursor = 'pointer';
        btnCategorySearch.addEventListener('click', (e) => {
            e.stopPropagation();
            abrirColorDropdown(btnCategorySearch, currentSelectedColor, (novaCor) => {
                currentSelectedColor = novaCor;
                atualizarCategoryDot();
            });
        });
    }

    setupColorDropdownEvents();

    inputBusca.addEventListener('input', (e) => mostrarAutocomplete(e.target.value));
    inputBusca.addEventListener('blur', () => setTimeout(fecharAutocomplete, 200));
    setupAutocompleteKeyboard();

    // Remove cards estáticos de exemplo
    document.querySelectorAll('.powers-container .card-power').forEach(card => card.remove());

    document.body.addEventListener('input', (e) => {
        if (e.target.classList?.contains('pt-cost-input')) atualizarTotalPt();
    });

    console.log('[Powers] Inicializado com sucesso');
}