// ui/magias.js
'use strict';

import { normalizar as normalizarMagia, escapeHtml } from '../core/utils.js';
import { createDataLoader } from '../core/data-loader.js';
import { getFontes, addSpellToFonte, removeSpellFromFonte, validateSpellForFonte, setFonteDeusa, transferSpellBetweenFontes } from '../core/item-effects.js';

// ========== Configuração ==========
const magiasLoader = createDataLoader('/data/magias.json', 'Magias', 'magias');
let cardMagiaCounter = 0;

// ========== Limite Arcano ==========
function atualizarLaAtual() {
    const laAtualInput = document.querySelector('[data-field="la-atual"]');
    if (!laAtualInput) return;

    let soma = 0;
    // Soma apenas arcanismo e feromancia
    ['arcanismo', 'feromancia'].forEach(tipo => {
        const sheet = document.querySelector(`[data-magic-sheet="${tipo}"]`);
        if (!sheet) return;
        sheet.querySelectorAll('.magic-card').forEach(card => {
            const laInput = card.querySelector('.magic-la-input');
            if (laInput) {
                const val = parseInt(laInput.value, 10);
                if (!isNaN(val)) soma += val;
            }
        });
    });

    laAtualInput.value = soma;
    verificarLaOverflow();
}

function verificarLaOverflow() {
    const container = document.querySelector('#tab-magias .total-pt');
    if (!container) return;
    const laAtualInput = document.querySelector('[data-field="la-atual"]');
    const laTotalInput = document.querySelector('[data-field="la-total"]');
    if (!laAtualInput || !laTotalInput) return;
    const atual = parseInt(laAtualInput.value, 10) || 0;
    const total = parseInt(laTotalInput.value, 10) || 0;

    const aviso = container.querySelector('.la-excedido');
    if (atual > total) {
        container.classList.add('la-over-limit');
        if (!aviso) {
            const msg = document.createElement('span');
            msg.className = 'la-excedido';
            msg.textContent = 'limite excedido!';
            container.appendChild(msg);
        }
    } else {
        container.classList.remove('la-over-limit');
        if (aviso) aviso.remove();
    }
}

function bindLaOverflowWatcher() {
    const laAtualInput = document.querySelector('[data-field="la-atual"]');
    const laTotalInput = document.querySelector('[data-field="la-total"]');
    if (laAtualInput) laAtualInput.addEventListener('input', verificarLaOverflow);
    if (laTotalInput) laTotalInput.addEventListener('input', verificarLaOverflow);
    verificarLaOverflow();
}

// ========== Tabs ==========
function getTabAtiva() {
    const btn = document.querySelector('.magic-tab-btn.active');
    return btn ? btn.dataset.magicTab : 'arcanismo';
}

function ativarTab(tab) {
    document.querySelectorAll('.magic-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.magicTab === tab);
    });
    document.querySelectorAll('.magic-sheet').forEach(sheet => {
        const isActive = sheet.dataset.magicSheet === tab;
        sheet.style.display = isActive ? 'block' : 'none';
    });
}

function initTabs() {
    document.querySelectorAll('.magic-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => ativarTab(btn.dataset.magicTab));
    });
    // Garante que arcanismo está ativado por padrão
    const algumAtivo = document.querySelector('.magic-tab-btn.active');
    ativarTab(algumAtivo ? algumAtivo.dataset.magicTab : 'arcanismo');
}

// ========== Graus ==========
function grauToKey(grau) {
    return grau === 'S' || grau === 's' ? 'grauS' : `grau${grau}`;
}

function atualizarVisibilidadeGraus(sheet) {
    if (!sheet) return;
    ['grau1', 'grau2', 'grau3', 'grau4', 'grauS'].forEach(grauKey => {
        const grauDiv = sheet.querySelector(`.${grauKey}`);
        if (!grauDiv) return;
        const temMagias = grauDiv.querySelectorAll('.magic-card').length > 0;
        grauDiv.style.display = temMagias ? 'block' : 'none';
    });
}

function atualizarVisibilidadeTodosGraus() {
    document.querySelectorAll('.magic-sheet').forEach(atualizarVisibilidadeGraus);
}

// ========== Nível do personagem ==========
function getNivelPersonagem() {
    const input = document.querySelector('#secao-radar .level-input');
    return input ? parseInt(input.value, 10) || 1 : 1;
}

// ========== Aprimoramentos ==========
function aprimoramentoVisivel(requisito, nivel) {
    if (!requisito) return true;
    const r = requisito.toLowerCase();
    if (r.includes('grau 4')) return nivel >= 15;
    if (r.includes('grau 3')) return nivel >= 10;
    if (r.includes('grau 2')) return nivel >= 5;
    if (r.includes('grau 1')) return true;
    return true;
}

function renderAprimoramentos(aprimoramentos, tipo, editMode = false) {
    if (!aprimoramentos || aprimoramentos.length === 0) return '';
    const nivel = getNivelPersonagem();

    const items = aprimoramentos.map((apr, i) => {
        const visivel = aprimoramentoVisivel(apr.requisito, nivel);
        const display = visivel ? '' : 'display:none;';
        const custo = apr.custo ? `<span class="apr-custo">${escapeHtml(apr.custo)}</span>` : '';
        const desc = `<span class="apr-desc">${escapeHtml(apr.descricao || '')}</span>`;
        const req = apr.requisito ? `<span class="apr-req">${escapeHtml(apr.requisito)}</span>` : '';
        return `<li class="apr-item" data-apr-index="${i}" style="${display}">${custo}${custo && (desc || req) ? ' ' : ''}${desc}${req ? ' ' + req : ''}</li>`;
    }).join('');

    return `<ol class="aprimoramentos-list">${items}</ol>`;
}

// ========== Construção do card ==========
function criarCardMagia(magiaData, tipo, grau, nomeForcado = '') {
    const cardId = `magia_${Date.now()}_${cardMagiaCounter++}`;
    const card = document.createElement('div');
    card.className = `magic-card magic-card--${tipo}`;
    card.dataset.cardId = cardId;
    card.dataset.tipo = tipo;
    card.dataset.grau = grau;

    const isFeromancia = tipo === 'feromancia';
    const isTeurgia = tipo === 'teurgia';

    // Dados iniciais
    const nome = magiaData ? (magiaData.nome || '') : (nomeForcado || '');
    const la = magiaData ? (magiaData.la ?? magiaData.fe ?? 1) : 1;
    const custo = magiaData ? (magiaData.custo || '') : '';
    const execucao = magiaData ? (magiaData.execucao || '') : '';
    const alcance = magiaData ? (magiaData.alcance || '') : '';
    const area = magiaData ? (magiaData.area || '') : '';
    const alvo = magiaData ? (magiaData.alvo || '') : '';
    const duracao = magiaData ? (magiaData.duracao || '') : '';
    const resistencia = magiaData ? (magiaData.resistencia || '') : '';
    const divindade = magiaData ? (magiaData.divindade || '') : '';

    // Descrições
    let descricao = '';
    let descSucesso = '';
    let descFracasso = '';
    if (isFeromancia) {
        descricao = magiaData ? (magiaData.descricao_geral || '') : '';
        descSucesso = magiaData ? (magiaData.descricao_sucesso || '') : '';
        descFracasso = magiaData ? (magiaData.descricao_fracasso || '') : '';
    } else {
        descricao = magiaData ? (magiaData.descricao || '') : '';
    }

    const aprimoramentos = magiaData ? (magiaData.aprimoramentos || []) : [];

    // ---- Info fields (oculta se null e não editando) ----
    function infoField(label, value, dataKey) {
        const hasValue = value !== null && value !== undefined && value !== '';
        return `<div class="magic-info-field" data-info-key="${dataKey}" style="${hasValue ? '' : 'display:none;'}">
            <span class="magic-info-label">${label}</span>
            <span class="magic-info-value">${escapeHtml(value || '')}</span>
        </div>`;
    }

    const infoHTML = `
        <div class="magic-info">
            ${isTeurgia ? `<div class="magic-info-field" data-info-key="divindade">
                <span class="magic-info-label">Deusa</span>
                <span class="magic-info-value">${escapeHtml(divindade)}</span>
            </div>` : ''}
            <div class="magic-info-field" data-info-key="grau">
                <span class="magic-info-label">Grau</span>
                <span class="magic-info-value">${escapeHtml(String(grau))}</span>
            </div>
            ${infoField('Execução', execucao, 'execucao')}
            ${infoField('Alcance', alcance, 'alcance')}
            ${infoField('Área', area, 'area')}
            ${infoField('Alvo', alvo, 'alvo')}
            ${infoField('Duração', duracao, 'duracao')}
            ${infoField('Resistência', resistencia, 'resistencia')}
        </div>`;

    const descHTML = isFeromancia
        ? `<div class="magic-desc magic-desc--feromancia">
            ${descricao ? `<p class="magic-desc-efeito">${escapeHtml(descricao)}</p>` : ''}
            <p class="magic-desc-sucesso"><strong>Sucesso:</strong> ${escapeHtml(descSucesso)}</p>
            <p class="magic-desc-fracasso"><strong>Fracasso:</strong> ${escapeHtml(descFracasso)}</p>
           </div>`
        : `<div class="magic-desc"><p>${escapeHtml(descricao)}</p></div>`;

    const aprHTML = renderAprimoramentos(aprimoramentos, tipo);

    card.innerHTML = `
        <div class="magic-card-header">
            <button class="btn-magic-minimize" type="button" title="Minimizar">
                <span class="material-symbols-outlined">expand_less</span>
            </button>
            <input type="number" class="magic-la-input" value="${la}" min="0" title="Limite Arcano">
            <span class="magic-nome">${escapeHtml(nome)}</span>
            <span class="magic-custo">${escapeHtml(custo)}</span>
            <button class="btn-magic-edit" type="button" title="Editar">
                <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-magic-remove" type="button" title="Remover">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
        <div class="magic-card-body">
            ${infoHTML}
            ${descHTML}
            ${aprHTML ? `<div class="magic-aprimoramentos">${aprHTML}</div>` : ''}
        </div>`;

    // Minimizar
    let minimizado = false;
    const btnMin = card.querySelector('.btn-magic-minimize');
    const body = card.querySelector('.magic-card-body');
    btnMin.addEventListener('click', () => {
        minimizado = !minimizado;
        body.style.display = minimizado ? 'none' : '';
        btnMin.querySelector('.material-symbols-outlined').textContent = minimizado ? 'expand_more' : 'expand_less';
    });

    // LA input -> atualiza total
    const laInput = card.querySelector('.magic-la-input');
    laInput.addEventListener('input', atualizarLaAtual);

    // Remover
    card.querySelector('.btn-magic-remove').addEventListener('click', () => {
        // Release Fonte capacity if linked
        if (card.dataset.fonteId && card.dataset.fonteFe) {
            removeSpellFromFonte(card.dataset.fonteId, parseInt(card.dataset.fonteFe, 10) || 0, card);
        }
        const sheetEl = card.closest('.magic-sheet');
        card.remove();
        atualizarLaAtual();
        if (sheetEl) atualizarVisibilidadeGraus(sheetEl);
    });

    // Editar
    card.querySelector('.btn-magic-edit').addEventListener('click', () => {
        abrirEditorMagia(card, tipo);
    });

    return card;
}

// ========== Editor flutuante ==========
function abrirEditorMagia(card, tipo) {
    // Remove editor anterior se existir
    const existingEditor = document.querySelector('.magic-editor-overlay');
    if (existingEditor) existingEditor.remove();

    const isFeromancia = tipo === 'feromancia';
    const isTeurgia = tipo === 'teurgia';

    // Lê dados atuais do card
    const nome = card.querySelector('.magic-nome')?.textContent || '';
    const custo = card.querySelector('.magic-custo')?.textContent || '';
    const laVal = card.querySelector('.magic-la-input')?.value || '1';
    const grauAtual = card.dataset.grau || '1';

    function getInfoVal(key) {
        return card.querySelector(`[data-info-key="${key}"] .magic-info-value`)?.textContent || '';
    }

    const descContainer = card.querySelector('.magic-desc');
    let descGeral = '', descSucesso = '', descFracasso = '', descUnica = '';
    if (isFeromancia) {
        descGeral = descContainer?.querySelector('.magic-desc-efeito')?.textContent || '';
        descSucesso = descContainer?.querySelector('.magic-desc-sucesso')?.textContent.replace(/^Sucesso:\s*/i, '') || '';
        descFracasso = descContainer?.querySelector('.magic-desc-fracasso')?.textContent.replace(/^Fracasso:\s*/i, '') || '';
    } else {
        descUnica = descContainer?.querySelector('p')?.textContent || '';
    }

    // Aprimoramentos atuais
    const aprs = [];
    card.querySelectorAll('.apr-item').forEach(item => {
        aprs.push({
            custo: item.querySelector('.apr-custo')?.textContent || '',
            descricao: item.querySelector('.apr-desc')?.textContent || '',
            requisito: item.querySelector('.apr-req')?.textContent || ''
        });
    });

    const overlay = document.createElement('div');
    overlay.className = 'magic-editor-overlay';

    const editor = document.createElement('div');
    editor.className = 'magic-editor';

    function aprEditRow(apr, i) {
        return `<div class="apr-edit-row" data-apr-edit="${i}">
            <input type="text" class="apr-edit-custo" placeholder="Custo" value="${escapeHtml(apr.custo)}">
            <input type="text" class="apr-edit-desc" placeholder="Descrição" value="${escapeHtml(apr.descricao)}">
            <input type="text" class="apr-edit-req" placeholder="Requisito (opcional)" value="${escapeHtml(apr.requisito)}">
            <button type="button" class="btn-apr-remove-edit">
                <span class="material-symbols-outlined">remove</span>
            </button>
        </div>`;
    }

    const aprsHTML = aprs.map((a, i) => aprEditRow(a, i)).join('');

    editor.innerHTML = `
        <div class="magic-editor-header">
            <h3>Editar Magia</h3>
            <button type="button" class="btn-editor-close"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div class="magic-editor-body">
            <label>Nome
                <input type="text" class="edit-nome" value="${escapeHtml(nome)}">
            </label>
            <div class="edit-row-two">
                <label>Limite Arcano
                    <input type="number" class="edit-la" value="${escapeHtml(laVal)}" min="0">
                </label>
                <label>Custo Base
                    <input type="text" class="edit-custo" value="${escapeHtml(custo)}">
                </label>
                <label>Grau
                    <select class="edit-grau">
                        ${['1','2','3','4','S'].map(g =>
                            `<option value="${g}" ${g == grauAtual ? 'selected' : ''}>${g === 'S' ? 'Especial' : g + '° Grau'}</option>`
                        ).join('')}
                    </select>
                </label>
            </div>
            ${isTeurgia ? `
            <label>Deusa
                <input type="text" class="edit-divindade" value="${escapeHtml(getInfoVal('divindade'))}">
            </label>
            <label>Fonte armazenada
                <select class="edit-fonte">
                    <option value="">— nenhuma —</option>
                    ${getFontes().map(f =>
                        `<option value="${escapeHtml(f.id)}" ${f.id === card.dataset.fonteId ? 'selected' : ''}>${escapeHtml(f.displayName)}${f.deusa ? ' · ' + escapeHtml(f.deusa) : ''} [${f.usedLa}/${f.laMax}]</option>`
                    ).join('')}
                </select>
            </label>` : ''}
            <div class="edit-infos-grid">
                <label>Execução
                    <input type="text" class="edit-execucao" value="${escapeHtml(getInfoVal('execucao'))}">
                </label>
                <label>Alcance
                    <input type="text" class="edit-alcance" value="${escapeHtml(getInfoVal('alcance'))}">
                </label>
                <label>Área
                    <input type="text" class="edit-area" value="${escapeHtml(getInfoVal('area'))}">
                </label>
                <label>Alvo
                    <input type="text" class="edit-alvo" value="${escapeHtml(getInfoVal('alvo'))}">
                </label>
                <label>Duração
                    <input type="text" class="edit-duracao" value="${escapeHtml(getInfoVal('duracao'))}">
                </label>
                <label>Resistência
                    <input type="text" class="edit-resistencia" value="${escapeHtml(getInfoVal('resistencia'))}">
                </label>
            </div>
            ${isFeromancia ? `
            <label>Efeito (Geral)
                <textarea class="edit-desc-geral">${escapeHtml(descGeral)}</textarea>
            </label>
            <label>Sucesso <span class="edit-required">*</span>
                <textarea class="edit-desc-sucesso">${escapeHtml(descSucesso)}</textarea>
            </label>
            <label>Fracasso <span class="edit-required">*</span>
                <textarea class="edit-desc-fracasso">${escapeHtml(descFracasso)}</textarea>
            </label>
            ` : `
            <label>Descrição
                <textarea class="edit-desc">${escapeHtml(descUnica)}</textarea>
            </label>
            `}
            <div class="edit-aprimoramentos-section">
                <h4>Aprimoramentos</h4>
                <div class="edit-aprs-list">${aprsHTML}</div>
                <button type="button" class="btn-apr-add-edit">
                    <span class="material-symbols-outlined">add</span> Adicionar Aprimoramento
                </button>
            </div>
        </div>
        <div class="magic-editor-footer">
            <button type="button" class="btn-editor-save">Salvar Alterações</button>
        </div>`;

    overlay.appendChild(editor);
    document.body.appendChild(overlay);

    // Fechar
    overlay.querySelector('.btn-editor-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    // Adicionar aprimoramento
    let aprCount = aprs.length;
    overlay.querySelector('.btn-apr-add-edit').addEventListener('click', () => {
        const list = overlay.querySelector('.edit-aprs-list');
        const row = document.createElement('div');
        row.className = 'apr-edit-row';
        row.dataset.aprEdit = aprCount++;
        row.innerHTML = `
            <input type="text" class="apr-edit-custo" placeholder="Custo">
            <input type="text" class="apr-edit-desc" placeholder="Descrição">
            <input type="text" class="apr-edit-req" placeholder="Requisito (opcional)">
            <button type="button" class="btn-apr-remove-edit">
                <span class="material-symbols-outlined">remove</span>
            </button>`;
        list.appendChild(row);
        setupAprRemoveButtons(overlay);
    });

    setupAprRemoveButtons(overlay);

    // Salvar
    overlay.querySelector('.btn-editor-save').addEventListener('click', () => {
        salvarEdicaoMagia(overlay, card, tipo);
    });
}

function setupAprRemoveButtons(overlay) {
    overlay.querySelectorAll('.btn-apr-remove-edit').forEach(btn => {
        btn.onclick = () => btn.closest('.apr-edit-row').remove();
    });
}

function salvarEdicaoMagia(overlay, card, tipo) {
    const isFeromancia = tipo === 'feromancia';
    const isTeurgia = tipo === 'teurgia';

    // Validações específicas
    if (isFeromancia) {
        const sucesso = overlay.querySelector('.edit-desc-sucesso')?.value.trim();
        const fracasso = overlay.querySelector('.edit-desc-fracasso')?.value.trim();
        if (!sucesso) { alert('Sucesso não pode ficar vazio em magias de Feromancia!'); return; }
        if (!fracasso) { alert('Fracasso não pode ficar vazio em magias de Feromancia!'); return; }
    }
    if (isTeurgia) {
        const divindade = overlay.querySelector('.edit-divindade')?.value.trim();
        if (!divindade) { alert('Deusa não pode ficar vazio em magias de Teurgia!'); return; }
    }

    // Nome
    const novoNome = overlay.querySelector('.edit-nome')?.value.trim() || '';
    card.querySelector('.magic-nome').textContent = novoNome;

    // Custo
    const novoCusto = overlay.querySelector('.edit-custo')?.value.trim() || '';
    card.querySelector('.magic-custo').textContent = novoCusto;

    // LA
    const novoLa = overlay.querySelector('.edit-la')?.value || '1';
    card.querySelector('.magic-la-input').value = novoLa;

    // Grau
    const novoGrau = overlay.querySelector('.edit-grau')?.value || '1';
    const grauAntigo = card.dataset.grau;

    // Teurgia: deusa + fonte transfer
    if (isTeurgia) {
        const divindade = overlay.querySelector('.edit-divindade')?.value.trim() || '';
        const divEl = card.querySelector('[data-info-key="divindade"] .magic-info-value');
        const divField = card.querySelector('[data-info-key="divindade"]');
        if (divEl) divEl.textContent = divindade;
        if (divField) divField.style.display = divindade ? '' : 'none';

        const novaFonteId = overlay.querySelector('.edit-fonte')?.value || '';
        const velhaFonteId = card.dataset.fonteId || '';
        const fe = parseInt(card.dataset.fonteFe, 10) || 1;
        const spellNome = card.querySelector('.magic-nome')?.textContent || '';
        const spellGrauAtual = card.dataset.grau || '1';

        if (novaFonteId !== velhaFonteId) {
            if (velhaFonteId && novaFonteId) {
                transferSpellBetweenFontes(velhaFonteId, novaFonteId, fe, spellGrauAtual, spellNome, card);
            } else if (velhaFonteId && !novaFonteId) {
                removeSpellFromFonte(velhaFonteId, fe, card);
            } else if (!velhaFonteId && novaFonteId) {
                addSpellToFonte(novaFonteId, fe, spellGrauAtual, spellNome, card);
            }
            card.dataset.fonteId = novaFonteId;
            if (novaFonteId) {
                anexarFonteBadge(card, novaFonteId);
                if (divindade) setFonteDeusa(novaFonteId, divindade);
            } else {
                card.querySelector('.magic-fonte-badge')?.remove();
            }
        }
    }

    // Info fields
    const infoMap = {
        'grau': novoGrau,
        'execucao': overlay.querySelector('.edit-execucao')?.value.trim() || '',
        'alcance': overlay.querySelector('.edit-alcance')?.value.trim() || '',
        'area': overlay.querySelector('.edit-area')?.value.trim() || '',
        'alvo': overlay.querySelector('.edit-alvo')?.value.trim() || '',
        'duracao': overlay.querySelector('.edit-duracao')?.value.trim() || '',
        'resistencia': overlay.querySelector('.edit-resistencia')?.value.trim() || '',
    };

    Object.entries(infoMap).forEach(([key, val]) => {
        const field = card.querySelector(`[data-info-key="${key}"]`);
        if (!field) return;
        field.querySelector('.magic-info-value').textContent = val;
        if (key === 'grau') {
            field.style.display = '';
        } else {
            field.style.display = val ? '' : 'none';
        }
    });

    // Descrições
    const descContainer = card.querySelector('.magic-desc');
    if (isFeromancia) {
        const geralEl = descContainer?.querySelector('.magic-desc-efeito');
        const sucessoEl = descContainer?.querySelector('.magic-desc-sucesso');
        const fracassoEl = descContainer?.querySelector('.magic-desc-fracasso');
        const geral = overlay.querySelector('.edit-desc-geral')?.value.trim() || '';
        const sucesso = overlay.querySelector('.edit-desc-sucesso')?.value.trim() || '';
        const fracasso = overlay.querySelector('.edit-desc-fracasso')?.value.trim() || '';
        if (geralEl) geralEl.textContent = geral;
        if (sucessoEl) sucessoEl.innerHTML = `<strong>Sucesso:</strong> ${escapeHtml(sucesso)}`;
        if (fracassoEl) fracassoEl.innerHTML = `<strong>Fracasso:</strong> ${escapeHtml(fracasso)}`;
    } else {
        const p = descContainer?.querySelector('p');
        if (p) p.textContent = overlay.querySelector('.edit-desc')?.value.trim() || '';
    }

    // Aprimoramentos
    const novasAprs = [];
    overlay.querySelectorAll('.apr-edit-row').forEach(row => {
        novasAprs.push({
            custo: row.querySelector('.apr-edit-custo')?.value.trim() || '',
            descricao: row.querySelector('.apr-edit-desc')?.value.trim() || '',
            requisito: row.querySelector('.apr-edit-req')?.value.trim() || ''
        });
    });

    const aprContainer = card.querySelector('.magic-aprimoramentos');
    const nivel = getNivelPersonagem();
    const aprHTML = renderAprimoramentos(novasAprs.map(a => ({
        custo: a.custo,
        descricao: a.descricao,
        requisito: a.requisito || null
    })), tipo);

    if (aprContainer) {
        if (aprHTML) {
            aprContainer.innerHTML = aprHTML;
        } else {
            aprContainer.innerHTML = '';
        }
    } else if (aprHTML) {
        const newAprContainer = document.createElement('div');
        newAprContainer.className = 'magic-aprimoramentos';
        newAprContainer.innerHTML = aprHTML;
        card.querySelector('.magic-card-body').appendChild(newAprContainer);
    }

    // Grau: realocar card se mudou
    card.dataset.grau = novoGrau;
    if (novoGrau !== grauAntigo) {
        const sheetEl = card.closest('.magic-sheet');
        if (sheetEl) {
            const novoGrauKey = grauToKey(novoGrau);
            const novoGrauDiv = sheetEl.querySelector(`.${novoGrauKey}`);
            if (novoGrauDiv) {
                // Adiciona na div de grau mantendo a tag de container existente
                const containerClass = `.card-${tipo}`;
                const innerContainer = novoGrauDiv.querySelector(containerClass) || novoGrauDiv;
                innerContainer.appendChild(card);
            }
            atualizarVisibilidadeGraus(sheetEl);
        }
    }

    atualizarLaAtual();
    overlay.remove();
}

// ========== Autocomplete ==========
function criarAutocompleteMagias(inputEl) {
    let dropdown = document.querySelector('.autocomplete-magias-dropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-magias-dropdown';
        const container = inputEl.closest('.magic-container-searcher');
        if (container) {
            container.style.position = 'relative';
            container.appendChild(dropdown);
        }
    }
    return dropdown;
}

function fecharAutocompleteMagias() {
    const dropdown = document.querySelector('.autocomplete-magias-dropdown');
    if (dropdown) dropdown.style.display = 'none';
}

function mostrarAutocompleteMagias(inputEl, query) {
    const dropdown = criarAutocompleteMagias(inputEl);
    if (!query || query.trim() === '') {
        fecharAutocompleteMagias();
        return;
    }
    if (magiasLoader.isLoading() || magiasLoader.hasError()) {
        fecharAutocompleteMagias();
        return;
    }

    const qNorm = normalizarMagia(query);
    const resultados = magiasLoader.getData().filter(m => normalizarMagia(m.nome).includes(qNorm)).slice(0, 10);

    if (resultados.length === 0) {
        fecharAutocompleteMagias();
        return;
    }

    dropdown.innerHTML = '';
    resultados.forEach(m => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item-magia';
        const laVal = m.la ?? m.fe ?? '?';
        const tipoLabel = m.tipo ? m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1) : '';
        item.innerHTML = `
            <span class="autocomplete-magia-la">${escapeHtml(String(laVal))}</span>
            <strong class="autocomplete-magia-nome">${escapeHtml(m.nome)}</strong>
            <span class="autocomplete-magia-tipo">${escapeHtml(tipoLabel)}</span>`;
        item.addEventListener('click', () => {
            inputEl.value = m.nome;
            fecharAutocompleteMagias();
        });
        dropdown.appendChild(item);
    });

    dropdown.style.display = 'block';
    dropdown.style.width = inputEl.closest('.magic-searchbox')?.offsetWidth
        ? (inputEl.closest('.magic-container-searcher')?.offsetWidth + 'px')
        : '';
}

function setupAutocompleteKeyboardMagias(inputEl) {
    let currentIndex = -1;
    inputEl.addEventListener('keydown', (e) => {
        const dropdown = document.querySelector('.autocomplete-magias-dropdown');
        const visible = dropdown && dropdown.style.display === 'block';
        const items = visible ? dropdown.querySelectorAll('.autocomplete-item-magia') : [];

        if (visible && items.length) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                currentIndex = (currentIndex + 1) % items.length;
                items.forEach((it, i) => it.classList.toggle('autocomplete-item-magia--active', i === currentIndex));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                currentIndex = (currentIndex - 1 + items.length) % items.length;
                items.forEach((it, i) => it.classList.toggle('autocomplete-item-magia--active', i === currentIndex));
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (currentIndex >= 0 && items[currentIndex]) {
                    items[currentIndex].click();
                    return;
                }
            }
            if (e.key === 'Escape') {
                fecharAutocompleteMagias();
                currentIndex = -1;
                return;
            }
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('btn-add-magic')?.click();
        }
    });

    document.addEventListener('click', (e) => {
        const dropdown = document.querySelector('.autocomplete-magias-dropdown');
        if (!inputEl.contains(e.target) && !dropdown?.contains(e.target)) {
            fecharAutocompleteMagias();
            currentIndex = -1;
        }
    });
}

// ========== Fonte Badge on Teurgia card ==========
function anexarFonteBadge(card, fonteId) {
    // Remove existing badge first
    card.querySelector('.magic-fonte-badge')?.remove();
    const fontes = getFontes();
    const fonte = fontes.find(f => f.id === fonteId);
    if (!fonte) return;
    const badge = document.createElement('span');
    badge.className = 'magic-fonte-badge';
    badge.title = `Armazenada em: ${fonte.displayName}`;
    badge.innerHTML = `<span class="material-symbols-outlined" style="font-size:10px;vertical-align:middle;">auto_awesome</span> ${fonte.displayName}`;
    const header = card.querySelector('.magic-card-header');
    if (header) header.appendChild(badge);
}

// ========== Fonte Selection for Teurgia ==========
function promptFonteSelection(spellGrau, spellFe, spellDeusa) {
    const fontes = getFontes();
    if (fontes.length === 0) {
        alert('Nenhuma Fonte equipada no inventário!\nAdicione um item de categoria "Fonte" ao inventário antes de adicionar magias de Teurgia.');
        return null;
    }

    // Build options text
    const options = fontes.map((f, i) => {
        const validation = validateSpellForFonte(f.id, spellGrau, spellDeusa);
        const capacidadeRestante = f.laMax - f.usedLa;
        let status = `[${f.usedLa}/${f.laMax}]`;
        let warn = '';
        if (!validation.valid) warn = ` ⚠ ${validation.reason}`;
        else if (validation.overCapacity) warn = ' ⚠ EXCEDIDA';
        else if (capacidadeRestante < spellFe) warn = ' ⚠ Ficará excedida';
        const deusaTag = f.deusa ? ` · ${f.deusa}` : '';
        return `${i + 1}) ${f.displayName}${deusaTag} ${status}${warn}`;
    }).join('\n');

    const choice = prompt(
        `Selecione a Fonte para armazenar esta magia de Teurgia (FE: ${spellFe}, Grau: ${spellGrau}):\n\n${options}\n\nDigite o número da Fonte:`
    );

    if (choice === null) return null;
    const idx = parseInt(choice, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= fontes.length) {
        alert('Seleção inválida.');
        return null;
    }

    const selected = fontes[idx];
    const validation = validateSpellForFonte(selected.id, spellGrau, spellDeusa);
    if (!validation.valid) {
        const proceed = confirm(`${validation.reason}\n\nDeseja adicionar mesmo assim?`);
        if (!proceed) return null;
    }

    return selected.id;
}

// ========== Adição de Magia ==========
function adicionarMagia(inputEl) {
    const nome = inputEl.value.trim();

    // Busca no JSON
    const magiaNorm = normalizarMagia(nome);
    const magiaBD = (!magiasLoader.hasError() && !magiasLoader.isLoading() && nome !== '')
        ? magiasLoader.getData().find(m => normalizarMagia(m.nome) === magiaNorm)
        : null;

    if (magiaBD) {
        // Magia encontrada no JSON
        const tipo = (magiaBD.tipo || '').toLowerCase();
        if (!['arcanismo', 'feromancia', 'teurgia'].includes(tipo)) {
            alert('Erro: magia má catalogada');
            return;
        }

        const grau = magiaBD.grau || 1;
        const grauKey = grauToKey(grau);

        // Teurgia: require Fonte selection
        if (tipo === 'teurgia') {
            const spellDeusa = magiaBD.divindade || '';
            const fonteId = promptFonteSelection(grau, magiaBD.fe || magiaBD.la || 1, spellDeusa);
            if (fonteId === null) return; // user cancelled
            magiaBD._selectedFonteId = fonteId;
            // Set deusa on the fonte if not yet assigned
            if (spellDeusa) setFonteDeusa(fonteId, spellDeusa);
        }

        const sheet = document.querySelector(`[data-magic-sheet="${tipo}"]`);
        if (!sheet) {
            alert('Erro: sheet não encontrada para o tipo ' + tipo);
            return;
        }

        const grauDiv = sheet.querySelector(`.${grauKey}`);
        if (!grauDiv) {
            alert('Erro: grau não encontrado');
            return;
        }

        const card = criarCardMagia(magiaBD, tipo, String(grau));

        // Track Fonte link on the card for removal
        if (magiaBD._selectedFonteId) {
            card.dataset.fonteId = magiaBD._selectedFonteId;
            const fe = magiaBD.fe || magiaBD.la || 1;
            card.dataset.fonteFe = fe;
            const spellNome = magiaBD.nome || '';
            addSpellToFonte(magiaBD._selectedFonteId, fe, grau, spellNome, card);
            // Add Fonte badge to card header
            anexarFonteBadge(card, magiaBD._selectedFonteId);
        }

        // Coloca no container interno se existir (grau1 tem card-tipo dentro)
        const innerContainer = grauDiv.querySelector(`.card-${tipo}`) || grauDiv;
        innerContainer.appendChild(card);

        atualizarVisibilidadeGraus(sheet);
        atualizarLaAtual();

        // Ativa tab correspondente
        ativarTab(tipo);

    } else {
        // Não encontrada no JSON: adiciona na tab ativa com dados vazios
        const tabAtiva = getTabAtiva();
        const grau = '1';
        const grauKey = grauToKey(grau);

        // Teurgia vazia também exige Fonte
        if (tabAtiva === 'teurgia') {
            const fonteId = promptFonteSelection(grau, 1, '');
            if (fonteId === null) return;
            const sheet = document.querySelector('[data-magic-sheet="teurgia"]');
            if (!sheet) return;
            const grauDiv = sheet.querySelector(`.${grauKey}`);
            if (!grauDiv) return;
            const card = criarCardMagia(null, 'teurgia', grau, nome);
            card.dataset.fonteId = fonteId;
            card.dataset.fonteFe = 1;
            addSpellToFonte(fonteId, 1, grau, nome || 'Magia vazia', card);
            anexarFonteBadge(card, fonteId);
            (grauDiv.querySelector('.card-teurgia') || grauDiv).appendChild(card);
            atualizarVisibilidadeGraus(sheet);
            atualizarLaAtual();
            ativarTab('teurgia');
            inputEl.value = '';
            fecharAutocompleteMagias();
            return;
        }

        const sheet = document.querySelector(`[data-magic-sheet="${tabAtiva}"]`);
        if (!sheet) return;

        const grauDiv = sheet.querySelector(`.${grauKey}`);
        if (!grauDiv) return;

        const card = criarCardMagia(null, tabAtiva, grau, nome);

        const innerContainer = grauDiv.querySelector(`.card-${tabAtiva}`) || grauDiv;
        innerContainer.appendChild(card);

        atualizarVisibilidadeGraus(sheet);
        atualizarLaAtual();
    }

    inputEl.value = '';
    fecharAutocompleteMagias();
}

// ========== Inicialização ==========
export async function initMagias() {
    await magiasLoader.load();

    const inputBusca = document.querySelector('.magic-searchbox input');
    if (!inputBusca) return console.error('[Magias] .magic-searchbox input não encontrado');

    const btnAdicionar = document.getElementById('btn-add-magic');
    if (!btnAdicionar) return console.error('[Magias] #btn-add-magic não encontrado');

    // Tabs
    initTabs();

    // Oculta todos os graus inicialmente
    atualizarVisibilidadeTodosGraus();

    // LA overflow watcher
    bindLaOverflowWatcher();

    // Autocomplete
    inputBusca.addEventListener('input', (e) => mostrarAutocompleteMagias(inputBusca, e.target.value));
    inputBusca.addEventListener('blur', () => setTimeout(fecharAutocompleteMagias, 200));
    setupAutocompleteKeyboardMagias(inputBusca);

    // Adicionar
    btnAdicionar.addEventListener('click', () => adicionarMagia(inputBusca));

    // Atualiza LA atual se cards já existirem (caso de carregamento de estado salvo)
    atualizarLaAtual();

    // Listener global para mudanças em LA inputs de cards existentes
    document.body.addEventListener('input', (e) => {
        if (e.target.classList?.contains('magic-la-input')) atualizarLaAtual();
    });

    // Listener para mudanças manuais no la-total
    const laTotalInput = document.querySelector('[data-field="la-total"]');
    if (laTotalInput) {
        laTotalInput.addEventListener('input', verificarLaOverflow);
    }

    // Garante grau 1 visível se tiver magias estáticas no HTML
    atualizarVisibilidadeTodosGraus();

    // Recalc when Fonte cascade-removes spells
    document.addEventListener('magias:recalc-la', () => {
        atualizarLaAtual();
        atualizarVisibilidadeTodosGraus();
    });

    console.log('[Magias] Inicializado com sucesso');
}

export function getMagiasState() {
    const result = {};
    document.querySelectorAll('.magic-sheet').forEach(sheet => {
        const tipo = sheet.dataset.magicSheet;
        result[tipo] = [];
        sheet.querySelectorAll('.magic-card').forEach(card => {
            const grau = card.dataset.grau || '1';
            const la = parseInt(card.querySelector('.magic-la-input')?.value, 10) || 1;
            const nome = card.querySelector('.magic-nome')?.textContent || '';
            const custo = card.querySelector('.magic-custo')?.textContent || '';
            const getInfo = key => card.querySelector(`[data-info-key="${key}"] .magic-info-value`)?.textContent || '';
            const descFerom = card.querySelector('.magic-desc--feromancia');
            let descricao = '', descricao_sucesso = '', descricao_fracasso = '';
            if (descFerom) {
                descricao = descFerom.querySelector('.magic-desc-efeito')?.textContent || '';
                descricao_sucesso = descFerom.querySelector('.magic-desc-sucesso')?.textContent.replace(/^Sucesso:\s*/i, '') || '';
                descricao_fracasso = descFerom.querySelector('.magic-desc-fracasso')?.textContent.replace(/^Fracasso:\s*/i, '') || '';
            } else {
                descricao = card.querySelector('.magic-desc p')?.textContent || '';
            }
            const aprs = [];
            card.querySelectorAll('.apr-item').forEach(item => {
                aprs.push({
                    custo: item.querySelector('.apr-custo')?.textContent || '',
                    descricao: item.querySelector('.apr-desc')?.textContent || '',
                    requisito: item.querySelector('.apr-req')?.textContent || ''
                });
            });
            result[tipo].push({
                grau, la, nome, custo, descricao, descricao_sucesso, descricao_fracasso,
                aprimoramentos: aprs,
                execucao: getInfo('execucao'), alcance: getInfo('alcance'),
                area: getInfo('area'), alvo: getInfo('alvo'),
                duracao: getInfo('duracao'), resistencia: getInfo('resistencia'),
                divindade: getInfo('divindade'),
                fonteId: card.dataset.fonteId || null,
                fonteFe: card.dataset.fonteFe ? parseInt(card.dataset.fonteFe, 10) : null,
            });
        });
    });
    return result;
}

export function setMagiasState(data) {
    if (!data) return;
    document.querySelectorAll('.magic-sheet').forEach(sheet => {
        const tipo = sheet.dataset.magicSheet;
        if (!data[tipo]) return;
        sheet.querySelectorAll('.magic-card').forEach(c => c.remove());
        data[tipo].forEach(m => {
            const magiaData = {
                nome: m.nome, custo: m.custo, la: m.la, fe: m.la,
                execucao: m.execucao, alcance: m.alcance, area: m.area,
                alvo: m.alvo, duracao: m.duracao, resistencia: m.resistencia,
                divindade: m.divindade, descricao: m.descricao,
                descricao_geral: m.descricao, descricao_sucesso: m.descricao_sucesso,
                descricao_fracasso: m.descricao_fracasso,
                aprimoramentos: m.aprimoramentos || [],
                tipo, grau: m.grau,
            };
            const grauKey = grauToKey(m.grau);
            const grauDiv = sheet.querySelector(`.${grauKey}`);
            if (!grauDiv) return;
            const card = criarCardMagia(magiaData, tipo, String(m.grau));
            if (m.fonteId) {
                card.dataset.fonteId = m.fonteId;
                card.dataset.fonteFe = m.fonteFe || 1;
                anexarFonteBadge(card, m.fonteId);
            }
            const innerContainer = grauDiv.querySelector(`.card-${tipo}`) || grauDiv;
            innerContainer.appendChild(card);
        });
        atualizarVisibilidadeGraus(sheet);
    });
    atualizarLaAtual();
}
