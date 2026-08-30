import { getRadarAttrWrap, getAtributoBase } from '../core/radar-service.js';
import { periciasEstado, getTotalPericia } from './skills.js';
import { CONDICOES_LISTA } from '../config/condicoes.js';
import { EFEITOS_CONDICOES, combinarEfeitos } from '../config/efeitos-condicoes.js';
import { uid } from '../core/utils.js';
import { setupAccordion } from '../core/dom-helpers.js';

function normalizePresetClass(nome) {
    if (!nome) return '';
    return 'reacao--' + nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function getPericiaMaxDice(nomePericia) {
    const pericia = periciasEstado.find(p => p.nome === nomePericia);
    if (!pericia) return 0;
    const mapaDice = { 0: 0, 1: 4, 2: 6, 3: 8, 4: 10, 5: 12 };
    return mapaDice[pericia.proficiencia] || 0;
}
// --- Presets de Reações Complexas ---
export const REACOES_PRESET = {
    "Brecha": {
        tipo: "recurso",
        template: "Quando for alvo de um ataque, você recebe {inteligencia} pontos de Brecha. Pontos de Brecha podem ser gastos:\n- RD contra dano: gaste X pontos para receber X em RD contra um inimigo até o fim da rodada.\n- Dano extra: gaste X pontos para receber X em dano extra no seu próximo ataque ou método de dano.",
        templateValor: "BRECHA: {brecha}",
        formatters: { inteligencia: () => getAtributoBase('INT') },
        requiresExtraUI: true
    },
    "Proteção Mágica": {
        tipo: "gasto-mana",
        template: "Quando é alvo de um ataque, você pode gastar uma Reação e {gastoPM} pontos de Mana (máx. {sabedoria}) para conjurar uma proteção mágica, ganhando {rd} de RD contra aquele ataque.",
        templateValor: "RD: {rd}",
        formatters: {
            sabedoria: () => getAtributoBase('SAB'),
            gastoPM: (val) => val || 0,
            rd: (val) => (val || 0) * 5
        },
        allowsInput: true,
        inputLabel: "PM gastos",
        inputMin: 1,
        inputMax: () => getAtributoBase('SAB')
    },
    "Dramatizar": {
        tipo: "static",
        template: "Quando for alvo de um ataque, você pode usar uma reação para impressionar o inimigo. O inimigo fica impressionado e sofre desvantagem em testes de ataque até o início do seu próximo turno. Caso você utilize essa mesma reação contra um mesmo inimigo mais de duas vezes na mesma rodada, você recebe RD igual ao seu Carisma ({carisma}) para resistir ao dano e fica imune à crítico.",
        templateValor: "RD: {rd}",
        formatters: { carisma: () => getAtributoBase('CAR') }
    },
    "Bloquear": {
        tipo: "calculo",
        template: "Quando é alvo de um ataque, você pode gastar uma Reação para erguer sua guarda. Você ganha RD contra aquele ataque igual a: (Constituição x 2) + máximo do dado de Esforço = {rd}.",
        templateValor: "RD: {rd}",
        formatters: {
            rd: () => {
                const con = getAtributoBase('CON');
                const maxEsforco = getPericiaMaxDice('Esforço');
                return (con * 2) + maxEsforco;
            }
        }
    },
    "Esquivar": {
        tipo: "calculo",
        template: "Quando for alvo de um ataque, você pode usar uma reação para esquivar. Você ganha um bônus de Defesa contra aquele ataque igual a: Destreza + máximo do dado de Reflexos = {bonusDefesa}.",
        templateValor: "DEF: {def}",
        formatters: {
            bonusDefesa: () => {
                const des = getAtributoBase('DES');
                const maxReflexos = getPericiaMaxDice('Reflexos');
                return des + maxReflexos;
            }
        }
    },
    "Contra-atacar": {
        tipo: "calculo",
        template: "Quando é alvo de um ataque corpo a corpo, você pode gastar uma Reação para revidar. Faça um teste de ataque contra o oponente. Se acertar, cause metade do seu dano normal (metade do dano da sua arma principal).",
        formatters: {}
    },
    "Ataque de Oportunidade": {
        tipo: "static",
        template: "Quando um inimigo se move de forma que seu caminho passe por um espaço adjacente a você (entrando, saindo ou cruzando), você pode usar uma reação complexa para atacá-lo. Você só pode usar esta reação contra inimigos que não o tenham atacado em nenhum momento durante o turno atual deles. Um inimigo que já o ataca e se move no mesmo turno, pode se mover livremente por seus espaços adjacentes sem provocar este ataque."
    }
};

// Datalist global para autocomplete
let datalistReacoes = null;

function garantirDatalistReacoes() {
    if (!datalistReacoes) {
        datalistReacoes = document.createElement('datalist');
        datalistReacoes.id = 'reacoes-preset-list';
        document.body.appendChild(datalistReacoes);
    }
    return datalistReacoes;
}

// Popula o datalist com os nomes dos presets
export function popularReacoesPreset() {
    const datalist = garantirDatalistReacoes();
    datalist.innerHTML = '';
    for (const nome of Object.keys(REACOES_PRESET)) {
        const option = document.createElement('option');
        option.value = nome;
        datalist.appendChild(option);
    }
}

// Gera a descrição substituindo placeholders pelos valores calculados
function gerarDescricaoPreset(nome, valoresInput = {}) {
    const preset = REACOES_PRESET[nome];
    if (!preset) return '';
    let template = preset.template;
    for (const [key, fn] of Object.entries(preset.formatters)) {
        let valor = typeof fn === 'function' ? fn(valoresInput[key]) : fn;
        if (valor === undefined) valor = '';
        template = template.replace(new RegExp(`\\{${key}\\}`, 'g'), valor);
    }
    return template;
}

// Gera a descrição textual do preset SEM os valores calculados embutidos inline
// (os valores ficam no setor de stats separado)
function gerarDescricaoLimpa(nome) {
    const preset = REACOES_PRESET[nome];
    if (!preset) return '';
    let template = preset.template;
    const labels = {
        inteligencia: 'INT', sabedoria: 'SAB', carisma: 'CAR',
        gastoPM: 'PM gastos', rd: 'RD calculado', bonusDefesa: 'bônus DEF',
        brecha: 'pontos de Brecha'
    };
    for (const [key, label] of Object.entries(labels)) {
        template = template.replace(new RegExp(`\\{${key}\\}`, 'g'), `[${label}]`);
    }
    return template;
}

// Gera os chips de estatísticas calculadas para o setor de stats do card de reação
function gerarStatsChips(nome, valoresInput = {}) {
    const preset = REACOES_PRESET[nome];
    if (!preset || !preset.templateValor) return null;

    // Resolve os valores dos formatters para montar os chips
    const chips = [];

    if (nome === 'Bloquear') {
        const con = getAtributoBase('CON');
        const maxEsforco = getPericiaMaxDice('Esforço');
        const rd = (con * 2) + maxEsforco;
        chips.push({ label: 'RD', valor: rd });
        chips.push({ label: 'CON×2', valor: con * 2, sub: true });
        chips.push({ label: 'Dado Esforço', valor: `d${maxEsforco}`, sub: true });
    } else if (nome === 'Esquivar') {
        const des = getAtributoBase('DES');
        const maxReflexos = getPericiaMaxDice('Reflexos');
        const bonus = des + maxReflexos;
        chips.push({ label: 'DEF +', valor: bonus });
        chips.push({ label: 'DES', valor: des, sub: true });
        chips.push({ label: 'Dado Reflexos', valor: `d${maxReflexos}`, sub: true });
    } else if (nome === 'Brecha') {
        const int = getAtributoBase('INT');
        chips.push({ label: 'Brecha/ataque', valor: int });
        chips.push({ label: '(1 PT = +1 RD ou DANO)', valor: '', sub: true });
    } else if (nome === 'Proteção Mágica') {
        const sab = getAtributoBase('SAB');
        chips.push({ label: 'Máx. RD', valor: sab * 5 });
        chips.push({ label: 'Máx. PM', valor: sab, sub: true });
        chips.push({ label: 'RD por PM', valor: 5, sub: true });
    } else if (nome === 'Dramatizar') {
        const car = getAtributoBase('CAR');
        chips.push({ label: 'RD (2ª vez)', valor: car });
    } else {
        // Fallback genérico via templateValor
        let valorTemplate = preset.templateValor;
        for (const [key, fn] of Object.entries(preset.formatters)) {
            const val = typeof fn === 'function' ? fn(valoresInput[key]) : fn;
            valorTemplate = valorTemplate.replace(new RegExp(`\\{${key}\\}`, 'g'), val ?? '');
        }
        chips.push({ label: valorTemplate, valor: '' });
    }

    return chips;
}

// Renderiza os chips no setor de stats do card de reação
function renderizarStatsChips(container, chips) {
    container.innerHTML = '';
    if (!chips || chips.length === 0) return;

    chips.forEach(chip => {
        const el = document.createElement('div');
        el.className = chip.sub ? 'reacao-stat-chip reacao-stat-chip--sub' : 'reacao-stat-chip';
        if (chip.valor !== '') {
            el.innerHTML = `<span class="reacao-stat-chip__label">${chip.label}</span><span class="reacao-stat-chip__valor">${chip.valor}</span>`;
        } else {
            el.innerHTML = `<span class="reacao-stat-chip__label reacao-stat-chip__label--full">${chip.label}</span>`;
        }
        container.appendChild(el);
    });
}

// Cria um card de reação especial (preset)
function criarCardReacaoPreset(nome, id) {
    const preset = REACOES_PRESET[nome];
    const card = document.createElement('div');
    card.className = 'combat-card combat-card--reacao';
    card.dataset.reacaoId = id;
    card.dataset.preset = nome;
    const presetClass = normalizePresetClass(nome);
    if (presetClass) card.classList.add(presetClass);

    // Cabeçalho
    const headerHtml = `
        <div class="combat-card__header" data-action="toggle-accordion" role="button" tabindex="0" aria-expanded="false">
            <div class="combat-card__header-left">
                <input type="text" class="combat-card__name-input" data-field="reacao-nome-${id}" value="${nome}" placeholder="Nome da Reação" list="reacoes-preset-list" style="background:var(--p0); color:var(--mana1);">
            </div>
            <button type="button" class="combat-card__delete-btn" title="Remover reação">
                <span class="material-symbols-outlined" style="font-size:16px;">remove</span>
            </button>
            <span class="combat-card__chevron material-symbols-outlined" aria-hidden="true">expand_more</span>
        </div>`;

    // Setor de estatísticas calculadas (sempre visível, fora do accordion)
    const statsHtml = `<div class="reacao-stats-bar" data-stats-bar="reacao-${id}"></div>`;

    let corpoHtml = `<div class="combat-card__body" hidden>`;

    // Campos extras por tipo
    if (preset.tipo === 'recurso' && nome === 'Brecha') {
        corpoHtml += `
            <div class="reacao-recurso-row">
                <label class="combat-label">Pontos de Brecha atuais</label>
                <div class="reacao-recurso-controls">
                    <input type="number" class="combat-input combat-input--sm" data-field="brecha-pontos-${id}" value="0" min="0" style="width: 72px;">
                    <button type="button" class="combat-add-btn reacao-btn-gasto" data-action="gastar-brecha-rd">Gastar RD</button>
                    <button type="button" class="combat-add-btn reacao-btn-gasto" data-action="gastar-brecha-dano">Gastar Dano Extra</button>
                </div>
                <small class="combat-label" style="font-size:9px; margin-top:2px; display:block;">1 ponto = +1 RD ou +1 dano extra (até fim da rodada/próximo ataque).</small>
            </div>
            <div style="margin-bottom: 8px;">
                <label class="combat-label">Notas de Brecha</label>
                <textarea class="combat-textarea combat-textarea--sm" data-field="brecha-notas-${id}" rows="2" placeholder="Anotações sobre alvos, gastos específicos..."></textarea>
            </div>`;
    } else if (preset.allowsInput) {
        const maxVal = typeof preset.inputMax === 'function' ? preset.inputMax() : preset.inputMax;
        corpoHtml += `
            <div class="reacao-input-row">
                <label class="combat-label">${preset.inputLabel}</label>
                <input type="number" class="combat-input combat-input--sm" data-field="reacao-input-${id}" value="1" min="${preset.inputMin}" max="${maxVal}" style="width: 72px;">
                <small class="combat-label" style="margin-left: 6px;">máx. ${maxVal}</small>
            </div>`;
    }

    // Descrição: apenas texto descritivo, sem valores calculados embutidos
    const descricaoLimpa = gerarDescricaoLimpa(nome);
    corpoHtml += `
        <label class="combat-label">Descrição</label>
        <textarea class="combat-textarea combat-textarea--sm" data-field="reacao-desc-${id}" rows="4" placeholder="Descrição da reação…">${descricaoLimpa}</textarea>
    </div>`;

    card.innerHTML = headerHtml + statsHtml + corpoHtml;

    // Renderiza chips de stats
    const statsBar = card.querySelector(`[data-stats-bar="reacao-${id}"]`);
    function atualizarStats(valoresInput = {}) {
        const chips = gerarStatsChips(nome, valoresInput);
        renderizarStatsChips(statsBar, chips);
    }
    atualizarStats();

    // Configurar accordion
    const header = card.querySelector('.combat-card__header');
    const body = card.querySelector('.combat-card__body');
    const chevron = card.querySelector('.combat-card__chevron');
    function toggleAccordion() {
        const isOpen = body.hidden;
        body.hidden = !isOpen;
        header.setAttribute('aria-expanded', String(isOpen));
        chevron.textContent = isOpen ? 'expand_less' : 'expand_more';
        card.classList.toggle('combat-card--open', isOpen);
    }
    header.addEventListener('click', (e) => {
        if (e.target.closest('.combat-card__delete-btn') ||
            e.target.closest('.combat-card__name-input')) return;
        toggleAccordion();
    });
    header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAccordion(); }
    });
    card.querySelector('.combat-card__name-input').addEventListener('click', e => e.stopPropagation());
    card.querySelector('.combat-card__delete-btn').addEventListener('click', () => {
        card.remove();
        document.dispatchEvent(new Event('ficha:changed'));
    });

    // Para Proteção Mágica: atualiza stats e descrição ao mudar gasto de PM
    if (preset.allowsInput) {
        const inputGasto = card.querySelector(`[data-field="reacao-input-${id}"]`);
        const updateTudo = () => {
            const gasto = parseInt(inputGasto.value, 10) || 0;
            // Atualiza apenas o chip de RD resultante
            const rdResultante = gasto * 5;
            if (statsBar) {
                const rdChip = statsBar.querySelector('.reacao-stat-chip__valor');
                // Re-renderiza com valor calculado pelo gasto atual
                const chips = gerarStatsChips(nome, { gastoPM: gasto });
                renderizarStatsChips(statsBar, chips);
                // Adiciona chip de RD atual
                const rdAtualEl = document.createElement('div');
                rdAtualEl.className = 'reacao-stat-chip reacao-stat-chip--highlight';
                rdAtualEl.innerHTML = `<span class="reacao-stat-chip__label">RD atual</span><span class="reacao-stat-chip__valor">${rdResultante}</span>`;
                statsBar.appendChild(rdAtualEl);
            }
        };
        inputGasto.addEventListener('input', updateTudo);
        updateTudo();
    }

    // Lógica para Brecha: botões de gastar
    if (nome === 'Brecha') {
        const pontosInput = card.querySelector(`[data-field="brecha-pontos-${id}"]`);
        const btnRd = card.querySelector('[data-action="gastar-brecha-rd"]');
        const btnDano = card.querySelector('[data-action="gastar-brecha-dano"]');
        const notasTA = card.querySelector(`[data-field="brecha-notas-${id}"]`);

        const gastar = (tipo) => {
            let pontos = parseInt(pontosInput.value, 10) || 0;
            if (pontos <= 0) { alert('Sem pontos de Brecha!'); return; }
            const gasto = prompt(`Quantos pontos de Brecha deseja gastar para ${tipo === 'rd' ? 'RD extra' : 'dano extra'}? (até ${pontos})`);
            const qtd = parseInt(gasto, 10);
            if (isNaN(qtd) || qtd <= 0 || qtd > pontos) return;
            pontosInput.value = pontos - qtd;
            const timestamp = new Date().toLocaleTimeString();
            notasTA.value += `\n[${timestamp}] Gastou ${qtd} ponto(s) para ${tipo === 'rd' ? 'RD' : 'dano extra'}.`;
            atualizarStats();
            alert(`${qtd} ponto(s) gasto(s). Efeito temporário aplicado.`);
        };
        pontosInput.addEventListener('input', () => atualizarStats());
        btnRd.addEventListener('click', () => gastar('rd'));
        btnDano.addEventListener('click', () => gastar('dano'));
    }

    return card;
}

// Gera a descrição textual do preset SEM os valores calculados embutidos inline
// (os valores ficam no setor de stats separado)
// Sobrescreve o card existente com a versão preset
function upgradeCardToPreset(card, nome) {
    const id = card.dataset.reacaoId;
    const novoCard = criarCardReacaoPreset(nome, id);
    card.parentNode.replaceChild(novoCard, card);
    // Reatachar eventos de remoção e arrasto se necessário
    atualizarAvisoReacoes();
}

// ============================================================
// UTILITIES
// ============================================================

/** Reads the character level from the radar input. */
function getNivelAtual() {
    const el = document.querySelector('#secao-radar .level-input');
    return el ? (parseInt(el.value, 10) || 1) : 1;
}

// ============================================================
// EVENT DELEGATION — replaces window.addSpecialRow + inline onclick
// ============================================================

function initDelegatedEvents() {
    // All dynamic "add special row" buttons use data-action="add-special-row"
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="add-special-row"]');
        if (btn) {
            const listId = btn.dataset.target;
            addSpecialRow(listId);
        }
    });
}

function addSpecialRow(listId) {
    const list = document.getElementById(listId);
    if (!list) return;
    const prefix = listId === 'defesa-specials' ? 'defesa' : 'rd';
    const id = uid();
    const row = document.createElement('div');
    row.className = 'cstat-special-row';
    row.innerHTML = `
        <input type="text"   class="cstat-type-input" placeholder="caso especial"  data-field="${prefix}-tipo-${id}">
        <input type="number" class="cstat-val-input"  placeholder="—"              data-field="${prefix}-val-${id}">
        <button class="cstat-row-remove-btn" title="Remover" aria-label="Remover linha">
            <span class="material-symbols-outlined" style="font-size:14px;">remove</span>
        </button>`;
    row.querySelector('.cstat-row-remove-btn').addEventListener('click', () => row.remove());
    list.appendChild(row);
}

// ============================================================
// AÇÕES POR NÍVEL
// ============================================================

export function atualizarAcoesPorNivel() {
    const nivel = getNivelAtual();
    // Define valores padrão baseados no nível
    let protagonistas = 1;
    let coesao = 1;
    let reacoes = 1;

    if (nivel >= 19) protagonistas = 2;
    if (nivel >= 13) coesao = 2;
    if (nivel >= 5) reacoes = 2; // exemplo, ajuste conforme regras do sistema

    // Aplica nos campos
    const protInput = document.querySelector('[data-field="acoes-protagonistas"]');
    const coesaoInput = document.querySelector('[data-field="acoes-coesao"]');
    const reacoesInput = document.querySelector('[data-field="acoes-reacoes"]');
    if (protInput) protInput.value = protagonistas;
    if (coesaoInput) coesaoInput.value = coesao;
    if (reacoesInput) reacoesInput.value = reacoes;
}

// ============================================================
// AVISO DE REAÇÕES
// ============================================================

export function atualizarAvisoReacoes() {
    const nivel = getNivelAtual();
    const avisoDiv = document.getElementById('reacoes-aviso');
    if (!avisoDiv) return;

    // Conta apenas reações personalizadas (cards sem atributo data-oportunidade)
    const todosCards = document.querySelectorAll('#reacoes-container .combat-card');
    const personalizadas = Array.from(todosCards).filter(card => !card.hasAttribute('data-oportunidade')).length;

    // Define os checkpoints: [nivelMinimo, quantidadeNecessaria, mensagem]
    const checkpoints = [
        { nivelMin: 1, necessario: 1, texto: 'Você pode adicionar 1 reação complexa (nível 1).' },
        { nivelMin: 5, necessario: 2, texto: 'Você pode adicionar mais 1 reação complexa (nível 5).' },
        { nivelMin: 13, necessario: 3, texto: 'Você pode adicionar mais 1 reação complexa (nível 13).' }
    ];

    // Filtra os checkpoints que devem ser exibidos
    const avisosAtivos = checkpoints.filter(cp =>
        nivel >= cp.nivelMin && personalizadas < cp.necessario
    );

    // Preenche o container com os avisos (ou esconde se não houver)
    if (avisosAtivos.length === 0) {
        avisoDiv.innerHTML = '';
        avisoDiv.hidden = true;
    } else {
        avisoDiv.hidden = false;
        avisoDiv.innerHTML = avisosAtivos.map(aviso =>
            `<span class="reacoes-aviso-line">${aviso.texto}</span>`
        ).join('');
    }

    console.log(`[DEBUG] Nível ${nivel}, Reações personalizadas: ${personalizadas}, Avisos ativos: ${avisosAtivos.length}`);
}

// ============================================================
// ATTACK CARDS — accordion, UUID-keyed, no inline styles
// ============================================================

export function criarCardAtaque(id) {
    const card = document.createElement('div');
    card.className = 'combat-card combat-card--ataque';
    card.dataset.ataqueId = id;

    const periciasOpts = periciasEstado
        .map(p => `<option value="${p.nome}">${p.nome}</option>`)
        .join('');

    card.innerHTML = `
        <div class="combat-card__header" data-action="toggle-accordion" role="button" tabindex="0" aria-expanded="false">
            <div class="combat-card__header-left">
                <input type="text"
                    class="combat-card__name-input"
                    data-field="ataque-nome-${id}"
                    placeholder="Nome do Ataque"
                    aria-label="Nome do ataque">
            </div>
            <div class="combat-card__header-summary" aria-hidden="true">
                <span class="combat-card__summary-acerto" data-summary="acerto">—</span>
                <span class="combat-card__summary-sep">·</span>
                <span class="combat-card__summary-dano"  data-summary="dano">—</span>
            </div>
            <button type="button" class="combat-card__delete-btn" title="Remover ataque" aria-label="Remover ataque">
                <span>x</span>
            </button>
            <span class="combat-card__chevron material-symbols-outlined" aria-hidden="true">expand_more</span>
        </div>

        <div class="combat-card__body" hidden>
            <div class="ataque-fields-grid">

                <div class="ataque-field-group">
                    <label class="combat-label">Perícia</label>
                    <select class="ataque-pericia combat-select" data-field="ataque-pericia-${id}" aria-label="Perícia vinculada">
                        <option value="">— livre —</option>
                        ${periciasOpts}
                    </select>
                </div>

                <div class="ataque-field-group">
                    <label class="combat-label">Atributo</label>
                    <select class="ataque-attr combat-select" data-field="ataque-attr-${id}" aria-label="Atributo base">
                        <option value="FOR">FOR</option>
                        <option value="DES">DES</option>
                        <option value="CON">CON</option>
                        <option value="INT">INT</option>
                        <option value="SAB">SAB</option>
                        <option value="CAR">CAR</option>
                    </select>
                </div>

                <div class="ataque-field-group">
                    <label class="combat-label">Acerto</label>
                    <input type="text"
                        class="ataque-acerto combat-input"
                        data-field="ataque-acerto-${id}"
                        placeholder="+6"
                        aria-label="Bônus de acerto">
                </div>

                <div class="ataque-field-group">
                    <label class="combat-label">Dano</label>
                    <input type="text"
                        class="combat-input ataque-dano"
                        data-field="ataque-dano-${id}"
                        placeholder="1d8+4"
                        aria-label="Expressão de dano">
                </div>

                <div class="ataque-field-group">
                    <label class="combat-label">Margem de Ameaça</label>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <input type="number" class="combat-input combat-input--sm" data-field="ataque-ameaca-${id}" value="20" min="1" max="20">
                        <div class="grouped-btn">
                            <button type="button" class="combat-add-btn increase" data-action="inc-ameaca"><span class="material-symbols-outlined">stat_1</span></button>
                            <button type="button" class="combat-add-btn decrease" data-action="dec-ameaca"><span class="material-symbols-outlined">stat_minus_1</span></button>
                        </div>
                    </div>
                </div>

                <div class="ataque-field-group">
                    <label class="combat-label">Multiplicador</label>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <input type="number" step="0.5" class="combat-input combat-input--sm" data-field="ataque-multi-${id}" value="1.5" min="1">
                        <div class="grouped-btn">
                            <button type="button" class="combat-add-btn increase" data-action="inc-multi"><span class="material-symbols-outlined">stat_1</span></button>
                            <button type="button" class="combat-add-btn decrease" data-action="dec-multi"><span class="material-symbols-outlined">stat_minus_1</span></button>
                        </div>
                    </div>
                </div>

                <div class="ataque-field-group">
                    <label class="combat-label">Tipo</label>
                    <input type="text"
                        class="combat-input"
                        data-field="ataque-tipo-${id}"
                        placeholder="Cortante"
                        aria-label="Tipo de dano">
                </div>

                <div class="ataque-field-group">
    <label class="combat-label">Munição</label>
    <div style="display: flex; align-items: center; gap: 4px;">
        <input type="number" class="combat-input combat-input--sm" data-field="ataque-municao-atual-${id}" value="0" min="0" style="width: 48px;" placeholder="atual">
        <span style="font-size: 12px;">/</span>
        <input type="number" class="combat-input combat-input--sm" data-field="ataque-municao-max-${id}" value="0" min="0" style="width: 48px;" placeholder="máx">
    </div>
</div>

                <div class="ataque-field-group ataque-field-group--alcance">
                    <label class="combat-label">Alcance</label>
                    <input type="text"
                        class="combat-input"
                        data-field="ataque-alcance-${id}"
                        placeholder="Corpo a corpo / 30 m"
                        aria-label="Alcance ou distância">
                </div>

            </div>

            <div class="ataque-desc-row">
                <label class="combat-label">Notas</label>
                <textarea
                    class="combat-textarea"
                    data-field="ataque-desc-${id}"
                    placeholder="Efeitos especiais, condições, notas…"
                    rows="2"
                    aria-label="Notas do ataque"></textarea>
            </div>
        </div>`;

    // — Accordion toggle
    const header = card.querySelector('.combat-card__header');
    const body = card.querySelector('.combat-card__body');
    const chevron = card.querySelector('.combat-card__chevron');

    function toggleAccordion(open) {
        const isOpen = open !== undefined ? open : body.hidden;
        body.hidden = !isOpen;
        header.setAttribute('aria-expanded', String(isOpen));
        chevron.textContent = isOpen ? 'expand_less' : 'expand_more';
        card.classList.toggle('combat-card--open', isOpen);
    }

    header.addEventListener('click', (e) => {
        if (e.target.closest('.combat-card__delete-btn') ||
            e.target.closest('.combat-card__name-input')) return;
        toggleAccordion();
    });
    header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleAccordion(); }
    });

    // Stop name-input click from toggling
    card.querySelector('.combat-card__name-input').addEventListener('click', e => e.stopPropagation());

    // --- Live summary update ---
    const acertoInput = card.querySelector('.ataque-acerto');
    const danoInput = card.querySelector('.ataque-dano');
    const ameacaInput = card.querySelector(`[data-field="ataque-ameaca-${id}"]`);
    const multiInput = card.querySelector(`[data-field="ataque-multi-${id}"]`);
    const summaryAcerto = card.querySelector('[data-summary="acerto"]');
    const summaryDano = card.querySelector('[data-summary="dano"]');

    // Cria o elemento de crítico uma única vez
    let critSpan = card.querySelector('.combat-card__summary-crit');
    const headerSummary = card.querySelector('.combat-card__header-summary');

    if (!critSpan && headerSummary) {
        critSpan = document.createElement('span');
        critSpan.className = 'combat-card__summary-crit';

        // Adiciona um separador antes do crítico
        const sep = document.createElement('span');
        sep.className = 'combat-card__summary-sep';
        sep.textContent = '·';
        headerSummary.appendChild(sep);
        headerSummary.appendChild(critSpan);
    }

    function atualizarSummary() {
        const acerto = acertoInput.value.trim() || '—';
        const dano = danoInput.value.trim() || '—';
        const ameaca = ameacaInput.value || '20';
        const multi = multiInput.value || '1.5';

        summaryAcerto.textContent = acerto;
        summaryDano.textContent = dano;

        // Crit com pipe e espaço antes
        if (critSpan) {
            critSpan.textContent = `${ameaca}/×${multi}`;  // exemplo: · 20/×1.5
        }
    }

    acertoInput.addEventListener('input', atualizarSummary);
    danoInput.addEventListener('input', atualizarSummary);
    ameacaInput.addEventListener('input', atualizarSummary);
    multiInput.addEventListener('input', atualizarSummary);

    // Botões margem
    card.querySelector('[data-action="inc-ameaca"]').addEventListener('click', () => {
        let val = parseInt(ameacaInput.value, 10) || 20;
        if (val < 20) ameacaInput.value = val + 1;
        atualizarSummary();
    });
    card.querySelector('[data-action="dec-ameaca"]').addEventListener('click', () => {
        let val = parseInt(ameacaInput.value, 10) || 20;
        if (val > 1) ameacaInput.value = val - 1;
        atualizarSummary();
    });

    // Botões multiplicador
    card.querySelector('[data-action="inc-multi"]').addEventListener('click', () => {
        let val = parseFloat(multiInput.value) || 1.5;
        multiInput.value = val + 0.5;
        atualizarSummary();
    });
    card.querySelector('[data-action="dec-multi"]').addEventListener('click', () => {
        let val = parseFloat(multiInput.value) || 1.5;
        if (val > 1) multiInput.value = val - 0.5;
        atualizarSummary();
    });

    // — Pericia → auto-fill attr + acerto
    const periciaSelect = card.querySelector('.ataque-pericia');
    const attrSelect = card.querySelector('.ataque-attr');

    function sincronizarAcerto() {
        if (!periciaSelect.value) {
            acertoInput.readOnly = false;
            acertoInput.classList.remove('combat-input--readonly');
            return;
        }
        acertoInput.readOnly = true;
        acertoInput.classList.add('combat-input--readonly');
        const total = getTotalPericia(periciaSelect.value, attrSelect.value || 'FOR');
        acertoInput.value = total != null ? String(total) : '';
        atualizarSummary();
    }

    periciaSelect.addEventListener('change', () => {
        const p = periciasEstado.find(p => p.nome === periciaSelect.value);
        if (p) attrSelect.value = p.attr;
        sincronizarAcerto();
    });
    attrSelect.addEventListener('change', sincronizarAcerto);

    // — Delete
    card.querySelector('.combat-card__delete-btn').addEventListener('click', () => {
        card.remove();
        atualizarAvisoReacoes();
        document.dispatchEvent(new Event('ficha:changed'));
    });

    // Expose sync for external calls
    card._sincronizarAcerto = sincronizarAcerto;

    atualizarSummary();

    return card;
}

function adicionarAtaque() {
    const id = uid();
    document.getElementById('ataques-container').appendChild(criarCardAtaque(id));
}

// ============================================================
// REACTION CARDS
// ============================================================

function criarCardReacao(id, nome = '', desc = '', isOportunidade = false) {
    const card = document.createElement('div');
    card.className = 'combat-card combat-card--reacao';
    card.dataset.reacaoId = id;
    if (isOportunidade) {
        card.dataset.oportunidade = 'true';
        card.classList.add('combat-card--oportunidade');
    }

    card.innerHTML = `
        <div class="combat-card__header" data-action="toggle-accordion" role="button" tabindex="0" aria-expanded="false">
            <div class="combat-card__header-left">
                ${isOportunidade ? `<span class="combat-card__oportunidade-badge">Básico</span>` : ''}
                <input type="text"
                    class="combat-card__name-input"
                    data-field="reacao-nome-${id}"
                    placeholder="Nome da Reação"
                    value="${nome.replace(/"/g, '&quot;')}"
                    list="reacoes-preset-list"
                    aria-label="Nome da reação"
                    ${isOportunidade ? 'readonly' : ''}>
            </div>
            ${!isOportunidade ? `
            <button type="button" class="combat-card__delete-btn" title="Remover reação" aria-label="Remover reação">
                <span class="material-symbols-outlined" style="font-size:16px;">remove</span>
            </button>` : ''}
            <span class="combat-card__chevron material-symbols-outlined" aria-hidden="true">expand_more</span>
        </div>
        <div class="reacao-stats-bar" data-stats-bar="reacao-${id}"></div>
        <div class="combat-card__body" hidden>
            <label class="combat-label">Descrição</label>
            <textarea
                class="combat-textarea"
                data-field="reacao-desc-${id}"
                placeholder="Descrição da reação…"
                rows="3"
                aria-label="Descrição da reação">${desc.replace(/</g, '&lt;')}</textarea>
        </div>`;

    // Elementos
    // Configurar accordion (versão corrigida)
    const header = card.querySelector('.combat-card__header');
    const body = card.querySelector('.combat-card__body');
    const chevron = card.querySelector('.combat-card__chevron');

    function toggleAccordion() {
        const isOpen = body.hidden;
        body.hidden = !isOpen;
        header.setAttribute('aria-expanded', String(!isOpen));
        chevron.textContent = !isOpen ? 'expand_less' : 'expand_more';
        card.classList.toggle('combat-card--open', !isOpen);
    }

    header.addEventListener('click', (e) => {
        // Ignora clique se for no botão de deletar ou no input de nome
        if (e.target.closest('.combat-card__delete-btn') ||
            e.target.closest('.combat-card__name-input')) return;
        toggleAccordion();
    });

    header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleAccordion();
        }
    });

    const nomeInput = card.querySelector('.combat-card__name-input');
    if (nomeInput) {
        nomeInput.addEventListener('click', (e) => e.stopPropagation());
    }

    if (!isOportunidade) {
        const deleteBtn = card.querySelector('.combat-card__delete-btn');
        deleteBtn.addEventListener('click', () => {
            card.remove();
            atualizarAvisoReacoes();
            document.dispatchEvent(new Event('ficha:changed'));
        });
    }

    // --- Autocomplete: preenche descrição limpa e atualiza stats bar ---
    if (!isOportunidade && nomeInput) {
        function updatePresetClass() {
            const val = nomeInput.value.trim();
            const className = normalizePresetClass(val);
            // Remove qualquer classe existente que comece com 'reacao--'
            card.classList.forEach(cls => {
                if (cls.startsWith('reacao--')) card.classList.remove(cls);
            });
            if (className && REACOES_PRESET[val]) {
                card.classList.add(className);
            }
        }

        nomeInput.addEventListener('change', () => {
            const val = nomeInput.value.trim();
            if (REACOES_PRESET[val]) {
                const descTextarea = card.querySelector(`[data-field="reacao-desc-${id}"]`);
                if (descTextarea && !descTextarea.value.trim()) {
                    descTextarea.value = gerarDescricaoLimpa(val);
                }
                const statsBar = card.querySelector(`[data-stats-bar="reacao-${id}"]`);
                if (statsBar) {
                    const chips = gerarStatsChips(val);
                    renderizarStatsChips(statsBar, chips);
                }
            }
            updatePresetClass();
        });

        // Também dispara na criação, caso o nome já venha preenchido (ex: quando for carregado do storage)
        updatePresetClass();
    }
    // ... dentro de criarCardReacao, após a criação do innerHTML e antes do return

    // --- Adicionar campo extra para Brecha (apenas se o nome for "Brecha") ---
    const bodyDiv = card.querySelector('.combat-card__body');
    let campoExtra = null;

    function adicionarCampoBrecha() {
        if (!bodyDiv) return;
        // Verifica se já existe um campo com data-brecha-notes
        if (bodyDiv.querySelector('[data-brecha-notes]')) return;

        const extraDiv = document.createElement('div');
        extraDiv.setAttribute('data-brecha-notes', 'true');
        extraDiv.style.marginTop = '12px';
        extraDiv.style.marginBottom = '4px';
        extraDiv.innerHTML = `
        <label class="combat-label">Notas de Brecha</label>
        <textarea class="combat-textarea combat-textarea--sm" 
                  data-field="brecha-notas-${id}" 
                  rows="2" 
                  placeholder="Registre aqui os pontos de Brecha recebidos e gastos, ou outras anotações..."></textarea>
    `;
        bodyDiv.appendChild(extraDiv);
        campoExtra = extraDiv;
    }

    // Verifica o nome atual e, se for "Brecha", adiciona o campo
    function verificarNomeBrecha() {
        const nomeAtual = nomeInput ? nomeInput.value.trim() : '';
        if (nomeAtual.toLowerCase() === 'brecha') {
            adicionarCampoBrecha();
        }
    }

    // Observa mudanças no nome
    if (nomeInput && !isOportunidade) {
        nomeInput.addEventListener('change', verificarNomeBrecha);
        // Também chama uma vez na criação, caso o nome já venha como "Brecha"
        verificarNomeBrecha();
    }

    return card;
}

function adicionarReacao() {
    const id = uid();
    document.getElementById('reacoes-container').appendChild(criarCardReacao(id));
    atualizarAvisoReacoes();
}

function inicializarReacoes() {
    const container = document.getElementById('reacoes-container');
    container.innerHTML = '';
    container.appendChild(criarCardReacao(
        uid(),
        'Ataque de Oportunidade',
        'Quando um inimigo se move de forma que seu caminho passe por um espaço adjacente a você (entrando, saindo ou cruzando), você pode usar uma reação complexa para atacá-lo. Você só pode usar esta reação contra inimigos que não o tenham atacado em nenhum momento durante o turno atual deles. Um inimigo que já o ataca e se move no mesmo turno, pode se mover livremente por seus espaços adjacentes sem provocar este ataque.',
        true
    ));
    atualizarAvisoReacoes();
}

// ============================================================
// CONDITION CARDS
// ============================================================

const CONDICOES_DATA = CONDICOES_LISTA;

function getCondicaoDesc(nome) {
    const c = CONDICOES_DATA.find(c => c.nome.toLowerCase() === nome.trim().toLowerCase());
    return c ? c.desc : '';
}

function criarCardCondicao(id) {
    const card = document.createElement('div');
    card.className = 'combat-card combat-card--condicao';
    card.dataset.condicaoId = id;

    card.innerHTML = `
        <div class="condicao-header-row">
            <input type="text"
                class="combat-card__name-input condicao-nome"
                data-field="condicao-nome-${id}"
                list="condicoes-sugestoes"
                placeholder="Nome da Condição"
                aria-label="Nome da condição">
            <div class="condicao-duracao-row" role="group" aria-label="Duração da condição">
                <input type="number"
                    class="condicao-duracao-qtd combat-input combat-input--sm"
                    data-field="condicao-duracao-qtd-${id}"
                    value="1" min="1"
                    aria-label="Quantidade de duração">
                <select class="condicao-duracao-tipo combat-select combat-select--sm"
                    data-field="condicao-duracao-tipo-${id}"
                    aria-label="Tipo de duração">
                    <option value="rodadas">Rod.</option>
                    <option value="cenas">Cena(s)</option>
                    <option value="descanso">Descanso</option>
                    <option value="indefinido">Indefinido</option>
                </select>
                <button type="button" class="condicao-tick-btn" title="−1 na duração" aria-label="Reduzir duração em 1">
                    <span class="material-symbols-outlined" style="font-size:14px;">remove</span>
                </button>
            </div>
            <button type="button" class="combat-card__delete-btn" title="Remover condição" aria-label="Remover condição">
                <span class="material-symbols-outlined" style="font-size:16px;">close</span>
            </button>
        </div>
        <textarea
            class="condicao-desc combat-textarea combat-textarea--sm"
            data-field="condicao-desc-${id}"
            placeholder="Efeito da condição…"
            rows="2"
            aria-label="Descrição da condição"></textarea>`;

    const nomeInput = card.querySelector('.condicao-nome');
    const descTA = card.querySelector('.condicao-desc');
    const qtdInput = card.querySelector('.condicao-duracao-qtd');
    const tipoSelect = card.querySelector('.condicao-duracao-tipo');
    const tickBtn = card.querySelector('.condicao-tick-btn');

    // Auto-fill description from known conditions
    function tryFillDesc() {
        const desc = getCondicaoDesc(nomeInput.value);
        if (desc && !descTA.value.trim()) descTA.value = desc;
    }
    nomeInput.addEventListener('change', () => {
        tryFillDesc();
        onCondicaoChange(); // <-- atualiza quando nome muda
    });
    nomeInput.addEventListener('input', () => {
        tryFillDesc();
        onCondicaoChange();
    });

    // Show/hide quantity based on duration type
    function syncDuracaoVis() {
        const hide = tipoSelect.value === 'indefinido' || tipoSelect.value === 'descanso';
        qtdInput.hidden = hide;
        tickBtn.hidden = hide;
        qtdInput.disabled = hide;
    }
    tipoSelect.addEventListener('change', syncDuracaoVis);
    syncDuracaoVis();

    // Tick button: decrement duration, remove card at 0
    tickBtn.addEventListener('click', () => {
        const val = parseInt(qtdInput.value, 10) || 1;
        if (val <= 1) {
            card.classList.add('combat-card--expiring');
            setTimeout(() => {
                card.remove();
                atualizarEfeitoGlobal();
                document.dispatchEvent(new Event('ficha:changed'));
            }, 350);
        } else {
            qtdInput.value = val - 1;
            qtdInput.classList.add('combat-input--flash');
            setTimeout(() => qtdInput.classList.remove('combat-input--flash'), 300);
            atualizarEfeitoGlobal();
        }
    });
    card.querySelector('.combat-card__delete-btn').addEventListener('click', () => {
        card.remove();
        atualizarEfeitoGlobal();
        onCondicaoChange();
        document.dispatchEvent(new Event('ficha:changed'));
    });

    return card;
}

function adicionarCondicao() {
    const id = uid();
    document.getElementById('condicoes-container').appendChild(criarCardCondicao(id));
    onCondicaoChange()
}

// ── Auto-Morrendo (sistema de condição de morte automática) ──────────────────

// Flag para suprimir re-entrada durante a própria adição/remoção automática
let _morrendoSuppressed = false;

/**
 * Verifica os valores de pv-atual / mana-atual e adiciona ou remove
 * automaticamente a condição "Morrendo":
 *  - personagem normal: baseado em pv-atual
 *  - monstro (checkbox monstro=true): baseado em mana-atual
 * Deve ser chamada sempre que pv-atual, mana-atual ou monstro mudar.
 */
export function checkMorrendoCondition() {
    if (_morrendoSuppressed) return;

    const pvAtual   = parseInt(document.querySelector('[data-field="pv-atual"]')?.value,   10);
    const manaAtual = parseInt(document.querySelector('[data-field="mana-atual"]')?.value, 10);
    const isMonstro = document.querySelector('[data-field="monstro"]')?.checked ?? false;
    const classeEscolhida = document.querySelector('[data-field="classe-nome"]')?.value.trim() || '';

    // Valor relevante de acordo com o tipo de personagem
    const triggerVal     = isMonstro ? manaAtual : pvAtual;
    const shouldMorrendo = Number.isFinite(triggerVal) && triggerVal < 1 && Boolean(classeEscolhida);

    const container = document.getElementById('condicoes-container');
    if (!container) return;

    // Procura condição "Morrendo" existente (qualquer origem)
    const existingCard = Array.from(container.querySelectorAll('.combat-card--condicao'))
        .find(card => card.querySelector('.condicao-nome')?.value.trim().toLowerCase() === 'morrendo');

    if (shouldMorrendo && !existingCard) {
        // Adiciona a condição Morrendo com duração indefinida
        _morrendoSuppressed = true;
        try {
            const id = uid();
            const card = criarCardCondicao(id);
            card.dataset.autoMorrendo = 'true';

            const nomeInput = card.querySelector('.condicao-nome');
            if (nomeInput) nomeInput.value = 'Morrendo';

            const descTA = card.querySelector('.condicao-desc');
            if (descTA) {
                const desc = getCondicaoDesc('Morrendo');
                if (desc) descTA.value = desc;
            }

            const tipoSelect = card.querySelector('.condicao-duracao-tipo');
            if (tipoSelect) {
                tipoSelect.value = 'indefinido';
                // bubbles:false so this internal setup doesn't reach document-level listeners
                tipoSelect.dispatchEvent(new Event('change', { bubbles: false }));
            }

            container.appendChild(card);
            atualizarEfeitoGlobal();
        } finally {
            _morrendoSuppressed = false;
        }
    } else if (!shouldMorrendo && existingCard) {
        // Remove a condição Morrendo
        _morrendoSuppressed = true;
        try {
            existingCard.remove();
            atualizarEfeitoGlobal();
        } finally {
            _morrendoSuppressed = false;
        }
    }
}

// Cria ou retorna o overlay global
function getGlobalOverlay() {
    let overlay = document.getElementById('global-effect-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'global-effect-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = 0;
        overlay.style.left = 0;
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.pointerEvents = 'none'; // para não bloquear cliques
        overlay.style.zIndex = '1001';
        overlay.style.transition = 'all 0.3s ease';
        document.body.appendChild(overlay);
    }
    return overlay;
}

// Coleta as condições ativas a partir dos cards
function getCondicoesAtivas() {
    const cards = document.querySelectorAll('#condicoes-container .combat-card--condicao');
    const nomes = [];
    cards.forEach(card => {
        const nomeInput = card.querySelector('.condicao-nome');
        if (nomeInput && nomeInput.value.trim()) {
            nomes.push(nomeInput.value.trim());
        }
    });
    return nomes;
}

// Aplica o efeito combinado ao overlay
function atualizarEfeitoGlobal() {
    const overlay = getGlobalOverlay();
    const condicoesAtivas = getCondicoesAtivas();
    const efeitos = condicoesAtivas
        .map(nome => EFEITOS_CONDICOES[nome])
        .filter(e => e !== undefined);

    const { background, filter } = combinarEfeitos(efeitos);
    overlay.style.background = background;
    overlay.style.backdropFilter = filter; // se quiser aplicar filtro no fundo, melhor usar backdrop-filter
    // Caso queira filter direto na camada (menos comum):
    // overlay.style.filter = filter;
    atualizarPopupCondicao();
}

// Disparar sempre que uma condição for alterada (adicione nos eventos relevantes)
function onCondicaoChange() {
    atualizarEfeitoGlobal();
}

// Mapa de cores para cada condição (usado no pop-up)
const COR_PADRAO = '#6b1616';

// Cria ou retorna o pop-up
function getPopupCondicao() {
    let popup = document.getElementById('popup-condicao');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'popup-condicao';
        popup.style.position = 'fixed';
        popup.style.bottom = '20px';
        popup.style.right = '20px';
        popup.style.zIndex = '1002';
        popup.style.backgroundColor = 'rgba(0,0,0,0.75)';
        popup.style.color = '#ffdede';
        popup.style.padding = '8px 14px';
        popup.style.borderRadius = '8px';
        popup.style.fontFamily = 'IM Fell English, serif';
        popup.style.fontSize = '13px';
        popup.style.backdropFilter = 'blur(4px)';
        popup.style.transition = 'opacity 0.2s';
        popup.style.opacity = '0.85';
        popup.style.pointerEvents = 'auto';
        popup.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        popup.style.cursor = 'default';
        popup.style.marginRight = '10vh';
        // Hover: fica mais transparente
        popup.addEventListener('mouseenter', () => { popup.style.opacity = '0.2'; });
        popup.addEventListener('mouseleave', () => { popup.style.opacity = '0.85'; });
        document.body.appendChild(popup);
    }
    return popup;
}

// Extrai a duração restante de um card de condição (em rodadas, como número)
function getDuracaoRestante(card) {
    const qtdInput = card.querySelector('.condicao-duracao-qtd');
    const tipoSelect = card.querySelector('.condicao-duracao-tipo');
    if (!qtdInput || !tipoSelect) return Infinity;
    const tipo = tipoSelect.value;
    if (tipo === 'indefinido' || tipo === 'descanso') return Infinity;
    let qtd = parseInt(qtdInput.value, 10);
    if (isNaN(qtd)) return Infinity;
    if (tipo === 'cenas') return qtd * 10; // cena ≈ 10 rodadas (aproximação)
    if (tipo === 'rodadas') return qtd;
    return Infinity;
}

// Obtém a condição ativa com menor duração restante
function getCondicaoMaisCurta() {
    const cards = document.querySelectorAll('#condicoes-container .combat-card--condicao');
    let melhorCard = null;
    let melhorDuracao = Infinity;
    cards.forEach(card => {
        const nomeInput = card.querySelector('.condicao-nome');
        if (!nomeInput || !nomeInput.value.trim()) return;
        const duracao = getDuracaoRestante(card);
        if (duracao < melhorDuracao) {
            melhorDuracao = duracao;
            melhorCard = card;
        }
    });
    if (!melhorCard) return null;
    const nome = melhorCard.querySelector('.condicao-nome').value.trim();
    const tipoSelect = melhorCard.querySelector('.condicao-duracao-tipo');
    const qtdInput = melhorCard.querySelector('.condicao-duracao-qtd');
    let textoDuracao = '';
    if (tipoSelect && qtdInput) {
        const tipo = tipoSelect.value;
        const qtd = qtdInput.value;
        if (tipo === 'rodadas') textoDuracao = `${qtd} rodada${qtd != 1 ? 's' : ''}`;
        else if (tipo === 'cenas') textoDuracao = `${qtd} cena${qtd != 1 ? 's' : ''}`;
        else if (tipo === 'descanso') textoDuracao = 'até descanso';
        else textoDuracao = 'indefinido';
    }
    return { nome, duracaoTexto: textoDuracao };
}

// Atualiza o pop-up (texto e cor de fundo)
function atualizarPopupCondicao() {
    const popup = getPopupCondicao();
    const cond = getCondicaoMaisCurta();
    if (!cond) {
        popup.style.display = 'none';
        return;
    }
    popup.style.display = 'block';
    const cor = COR_PADRAO;
    popup.style.backgroundColor = cor + 'cc'; // adiciona transparência
    popup.innerHTML = `<strong><span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1; font-size: 12px;">earthquake</span> ${cond.nome}</strong><br><small>${cond.duracaoTexto}</small>`;
}

// ============================================================
// BONUS / ÔNUS CARDS — dedicated class, not .ac
// ============================================================

function criarCardBonus(id) {
    const card = document.createElement('div');
    card.className = 'combat-card combat-card--bonus';
    card.dataset.bonusId = id;

    card.innerHTML = `
        <div class="combat-card__header" data-action="toggle-accordion" role="button" tabindex="0" aria-expanded="false">
            <div class="combat-card__header-left">
                <select class="bonus-tipo-select combat-select combat-select--tipo"
                    data-field="bonus-tipo-${id}"
                    aria-label="Tipo: Bônus ou Ônus">
                    <option value="bonus">Bônus</option>
                    <option value="onus">Ônus</option>
                </select>
                <input type="text"
                    class="combat-card__name-input"
                    data-field="bonus-nome-${id}"
                    placeholder="Nome do bônus / ônus"
                    aria-label="Nome do bônus ou ônus">
            </div>
            <button type="button" class="combat-card__delete-btn" title="Remover" aria-label="Remover bônus/ônus">
                <span class="material-symbols-outlined" style="font-size:16px;">remove</span>
            </button>
            <span class="combat-card__chevron material-symbols-outlined" aria-hidden="true">expand_more</span>
        </div>
        <div class="combat-card__body" hidden>
            <label class="combat-label">Descrição</label>
            <textarea
                class="combat-textarea"
                data-field="bonus-desc-${id}"
                placeholder="Efeito do bônus ou ônus…"
                rows="2"
                aria-label="Descrição do bônus ou ônus"></textarea>
        </div>`;

    const tipoSel = card.querySelector('.bonus-tipo-select');

    function syncTipoStyle() {
        card.dataset.bonusTipo = tipoSel.value;
    }
    tipoSel.addEventListener('change', syncTipoStyle);
    syncTipoStyle();

    setupAccordion(card);

    card.querySelector('.combat-card__delete-btn').addEventListener('click', () => {
        card.remove();
        atualizarEfeitoGlobal();
        document.dispatchEvent(new Event('ficha:changed'));
    });

    return card;
}

function adicionarBonus() {
    const id = uid();
    document.getElementById('bonus-onus-container').appendChild(criarCardBonus(id));
}

// ============================================================
// GLOBAL ACERTO SYNC
// ============================================================

export function atualizarAtaquesAcerto(respeitarFoco = true) {
    document.querySelectorAll('#ataques-container .combat-card--ataque').forEach(card => {
        if (typeof card._sincronizarAcerto === 'function') {
            const acertoInput = card.querySelector('.ataque-acerto');
            if (respeitarFoco && document.activeElement === acertoInput) return;
            card._sincronizarAcerto();
        }
    });
}

// ============================================================
// DEFESA / RD extras (static rows from HTML, no window pollution)
// ============================================================

function initCombatExtras() {
    // Notes char counter (if present on another tab)
    const notesTA = document.getElementById('notes-textarea');
    const notesCount = document.getElementById('notes-char-count');
    if (notesTA && notesCount) {
        notesTA.addEventListener('input', () => {
            const n = notesTA.value.length;
            notesCount.textContent = `${n} caractere${n !== 1 ? 's' : ''}`;
        });
    }
}

// ============================================================
// INITIALISATION
// ============================================================

function atualizarTodasStatsBars() {
    document.querySelectorAll('#reacoes-container .combat-card[data-preset]').forEach(card => {
        const nome = card.dataset.preset;
        const id = card.dataset.reacaoId;
        const statsBar = card.querySelector(`[data-stats-bar="reacao-${id}"]`);
        if (!statsBar) return;
        const inputGasto = card.querySelector(`[data-field="reacao-input-${id}"]`);
        const valoresInput = inputGasto ? { gastoPM: parseInt(inputGasto.value, 10) || 0 } : {};
        const chips = gerarStatsChips(nome, valoresInput);
        renderizarStatsChips(statsBar, chips);
        // Para Proteção Mágica, re-adiciona chip de RD atual
        if (inputGasto) {
            const rdAtualEl = document.createElement('div');
            rdAtualEl.className = 'reacao-stat-chip reacao-stat-chip--highlight';
            const rd = (parseInt(inputGasto.value, 10) || 0) * 5;
            rdAtualEl.innerHTML = `<span class="reacao-stat-chip__label">RD atual</span><span class="reacao-stat-chip__valor">${rd}</span>`;
            statsBar.appendChild(rdAtualEl);
        }
    });
}

export function initCombat() {
    function popularDatalistCondicoes() {
        const datalist = document.getElementById('condicoes-sugestoes');
        if (!datalist) return;
        datalist.innerHTML = '';
        CONDICOES_LISTA.forEach(cond => {
            const option = document.createElement('option');
            option.value = cond.nome;
            datalist.appendChild(option);
        });
    }
    initDelegatedEvents();
    initCombatExtras();
    popularDatalistCondicoes();

    // Guard against double-init
    if (document.getElementById('ataques-container').dataset.initialized) return;
    document.getElementById('ataques-container').dataset.initialized = 'true';

    // Seed initial cards
    for (let i = 0; i < 2; i++) adicionarAtaque();
    inicializarReacoes();
    adicionarCondicao();
    adicionarBonus();
    onCondicaoChange()

    // Wire add buttons
    document.getElementById('add-ataque-btn')?.addEventListener('click', adicionarAtaque);
    document.getElementById('add-reacao-btn')?.addEventListener('click', adicionarReacao);
    document.getElementById('add-condicao-btn')?.addEventListener('click', adicionarCondicao);
    document.getElementById('add-bonus-onus-btn')?.addEventListener('click', adicionarBonus);

    atualizarAcoesPorNivel();
    atualizarAvisoReacoes();
    atualizarAtaquesAcerto(false);

    document.addEventListener('reacoes:atualizar-stats', atualizarTodasStatsBars);
}

function serializeCardFields(card) {
    const fields = {};
    card.querySelectorAll('[data-field]').forEach(el => {
        const key = el.dataset.field;
        fields[key] = el.tagName === 'SELECT' ? el.value : (el.value ?? '');
    });
    return fields;
}

export function getCombatState() {
    const ataques = Array.from(document.querySelectorAll('#ataques-container .combat-card--ataque')).map(card => ({
        id: card.dataset.ataqueId,
        linkedItemId: card.dataset.linkedItemId || null, // persist weapon→attack link
        fields: serializeCardFields(card),
    }));
    const reacoes = Array.from(document.querySelectorAll('#reacoes-container .combat-card--reacao:not([data-oportunidade])')).map(card => ({
        id: card.dataset.reacaoId,
        preset: card.dataset.preset || null,
        fields: serializeCardFields(card),
    }));
    const condicoes = Array.from(document.querySelectorAll('#condicoes-container .combat-card--condicao')).map(card => ({
        id: card.dataset.condicaoId,
        fields: serializeCardFields(card),
    }));
    const bonus = Array.from(document.querySelectorAll('#bonus-onus-container .combat-card--bonus')).map(card => ({
        id: card.dataset.bonusId,
        fields: serializeCardFields(card),
    }));
    return { ataques, reacoes, condicoes, bonus };
}

function restoreFields(card, fields) {
    if (!fields) return;
    Object.entries(fields).forEach(([key, val]) => {
        const el = card.querySelector(`[data-field="${key}"]`);
        if (el) el.value = val;
    });
}

export function setCombatState(data) {
    if (!data) return;
    if (data.ataques) {
        const c = document.getElementById('ataques-container');
        if (c) {
            c.innerHTML = '';
            data.ataques.forEach(a => {
                const card = criarCardAtaque(a.id);
                // Restore the weapon→attack link so DOM-based guards can detect it
                if (a.linkedItemId) card.dataset.linkedItemId = a.linkedItemId;
                restoreFields(card, a.fields);
                c.appendChild(card);
            });
        }
    }
    if (data.reacoes) {
        const c = document.getElementById('reacoes-container');
        if (c) {
            // Remove apenas reações personalizadas; mantém o card fixo de Ataque de Oportunidade
            Array.from(c.querySelectorAll('.combat-card--reacao:not([data-oportunidade])')).forEach(el => el.remove());
            data.reacoes.forEach(r => {
                const nome = (r.fields && r.fields[`reacao-nome-${r.id}`]) || '';
                const desc = (r.fields && r.fields[`reacao-desc-${r.id}`]) || '';
                const card = criarCardReacao(r.id, nome, desc);
                restoreFields(card, r.fields);
                c.appendChild(card);
            });
        }
    }
    if (data.condicoes) {
        const c = document.getElementById('condicoes-container');
        if (c) {
            c.innerHTML = '';
            data.condicoes.forEach(cd => {
                const card = criarCardCondicao(cd.id);
                restoreFields(card, cd.fields);
                c.appendChild(card);
            });
        }
    }
    if (data.bonus) {
        const c = document.getElementById('bonus-onus-container');
        if (c) {
            c.innerHTML = '';
            data.bonus.forEach(b => {
                const card = criarCardBonus(b.id);
                restoreFields(card, b.fields);
                c.appendChild(card);
            });
        }
    }
    atualizarAvisoReacoes();
    atualizarAtaquesAcerto(false);
}
