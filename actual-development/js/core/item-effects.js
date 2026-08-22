// core/item-effects.js
'use strict';

import { uid } from './utils.js';
import { getAtributoBase } from './radar-service.js';
import { criarCardAtaque } from '../ui/combat.js';

// ════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════

export const FONTE_LA_TABLE = {
    banal:    { la: 3,  grauMax: 1 },
    comum:    { la: 5,  grauMax: 1 },
    incomum:  { la: 8,  grauMax: 2 },
    raro:     { la: 12, grauMax: 3 },
    epico:    { la: 18, grauMax: 4 },
    lendario: { la: 25, grauMax: 'S' }
};

function grausFromMax(grauMax) {
    if (grauMax === 'S') return [1, 2, 3, 4, 'S'];
    const n = parseInt(grauMax, 10) || 1;
    return Array.from({ length: n }, (_, i) => i + 1);
}

// ════════════════════════════════════════════════════════════════
// STATE — tracks active item effects
// ════════════════════════════════════════════════════════════════

const activeWeapons = new Map();   // cardId → { ataqueId, nome }
const activeProtections = new Map(); // cardId → { defesa, rd, deslocPct }
const activeFontes = new Map();    // cardId → { nome, raridade, laMax, grauMax, usedLa, deusa, spells:[] }

// ════════════════════════════════════════════════════════════════
// ARMAS — Weapon → Attack Entry
// ════════════════════════════════════════════════════════════════

function resolveEmpunhaduraAttr(empunhadura, alcance) {
    // Ranged weapons always use DES regardless of empunhadura
    if (alcance && !alcance.toLowerCase().includes('corpo')) return 'DES';
    if (!empunhadura) return 'FOR';
    const emp = empunhadura.toLowerCase();
    if (emp === 'leve') {
        const forca = getAtributoBase('FOR');
        const destreza = getAtributoBase('DES');
        return destreza > forca ? 'DES' : 'FOR';
    }
    return 'FOR';
}

function resolveAlcancePericia(alcance) {
    if (!alcance) return { pericia: 'Lutar', attr: 'FOR' };
    const alc = alcance.toLowerCase();
    if (alc.includes('corpo')) return { pericia: 'Lutar', attr: 'FOR' };
    return { pericia: 'Atirar', attr: 'DES' };
}

/** Replace +ATTR tokens (e.g. +FOR, +DES) with the actual numeric bonus. */
function resolveDanoTokens(danoStr, finalAttr) {
    if (!danoStr) return danoStr;
    const ATTRS = ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'];
    return danoStr.replace(/([+-])(FOR|DES|CON|INT|SAB|CAR)/gi, (_, sign, attr) => {
        const val = getAtributoBase(attr.toUpperCase()) || 0;
        const signed = sign === '-' ? -val : val;
        return signed >= 0 ? `+${signed}` : `${signed}`;
    });
}

export function onWeaponAdded(cardId, itemData) {
    const nome = itemData.nome || 'Ataque';
    const ataqueId = uid();

    const container = document.getElementById('ataques-container');
    if (!container) return;

    const card = criarCardAtaque(ataqueId);
    card.dataset.linkedItemId = cardId;
    container.appendChild(card);

    // Fill fields
    const nomeInput = card.querySelector('.combat-card__name-input');
    if (nomeInput) nomeInput.value = nome;

    // Alcance → pericia (do this first so empunhadura can check alcance)
    const alcance = itemData.alcance || '';
    const { pericia } = resolveAlcancePericia(alcance);
    const periciaSelect = card.querySelector('.ataque-pericia');
    if (periciaSelect) {
        periciaSelect.value = pericia;
        periciaSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Empunhadura → attr (ranged overrides to DES)
    const empunhadura = itemData.empunhadura || '';
    const attr = resolveEmpunhaduraAttr(empunhadura, alcance);
    const attrSelect = card.querySelector('.ataque-attr');
    if (attrSelect) attrSelect.value = attr;

    // Dano: resolve +ATTR tokens to actual values
    const danoRaw = itemData.valor2 || itemData.dano || '';
    const dano = resolveDanoTokens(danoRaw, attr);
    const danoInput = card.querySelector('.ataque-dano');
    if (danoInput && dano) danoInput.value = dano;

    // Margem de ameaça
    const ameaca = itemData.ameaca || itemData.margem || '';
    if (ameaca) {
        const ameacaInput = card.querySelector(`[data-field="ataque-ameaca-${ataqueId}"]`);
        if (ameacaInput) ameacaInput.value = ameaca;
    }

    // Multiplicador de crítico
    const multi = itemData.multiplicador || itemData.critico || '';
    if (multi) {
        const multiInput = card.querySelector(`[data-field="ataque-multi-${ataqueId}"]`);
        if (multiInput) multiInput.value = multi;
    }

    // Tipo de dano
    const tipoDano = itemData.tipoDano || itemData.tipo_dano || '';
    if (tipoDano) {
        const tipoInput = card.querySelector(`[data-field="ataque-tipo-${ataqueId}"]`);
        if (tipoInput) tipoInput.value = tipoDano;
    }

    // Alcance field
    const alcanceInput = card.querySelector(`[data-field="ataque-alcance-${ataqueId}"]`);
    if (alcanceInput && alcance) alcanceInput.value = alcance;

    // Trigger summary update
    if (typeof card._sincronizarAcerto === 'function') card._sincronizarAcerto();

    activeWeapons.set(cardId, { ataqueId, nome });
    saveItemEffectsState();
}

export function onWeaponRemoved(cardId) {
    const entry = activeWeapons.get(cardId);
    if (!entry) return;

    const ataqueCard = document.querySelector(`.combat-card--ataque[data-ataque-id="${entry.ataqueId}"]`);
    if (!ataqueCard) {
        activeWeapons.delete(cardId);
        saveItemEffectsState();
        return;
    }

    // Show confirmation dialog
    const confirmed = confirm(
        `A arma "${entry.nome}" foi removida do inventário.\n\nDeseja remover também o ataque correspondente na aba Combate?`
    );

    if (confirmed) {
        ataqueCard.remove();
    } else {
        // Unlink so it becomes independent
        delete ataqueCard.dataset.linkedItemId;
    }

    activeWeapons.delete(cardId);
    saveItemEffectsState();
}

// ════════════════════════════════════════════════════════════════
// PROTEÇÃO — Protection → Defense/RD/Displacement bonuses
// ════════════════════════════════════════════════════════════════

function getBaseDeslocamento() {
    const input = document.querySelector('[data-field="deslocamento"]');
    if (!input) return 9;
    const stored = parseFloat(input.dataset.baseValue || input.value) || 9;
    return stored;
}

function storeBaseDeslocamento() {
    const input = document.querySelector('[data-field="deslocamento"]');
    if (!input) return;
    if (!input.dataset.baseValue) {
        input.dataset.baseValue = input.value;
    }
}

export function onProtectionAdded(cardId, itemData) {
    const defesa = parseInt(itemData.defesa || itemData.def || 0, 10);
    const rd = parseInt(itemData.rd || 0, 10);
    const deslocPct = parseFloat(itemData.deslocamento || itemData.desloc || 0);

    activeProtections.set(cardId, { defesa, rd, deslocPct });
    recalcProtectionBonuses();
    saveItemEffectsState();
}

export function onProtectionRemoved(cardId) {
    if (!activeProtections.has(cardId)) return;
    activeProtections.delete(cardId);
    recalcProtectionBonuses();
    saveItemEffectsState();
}

function recalcProtectionBonuses() {
    storeBaseDeslocamento();

    let totalDefBonus = 0;
    let totalRdBonus = 0;
    let totalDeslocReduction = 0;

    for (const [, data] of activeProtections) {
        totalDefBonus += data.defesa;
        totalRdBonus += data.rd;
        totalDeslocReduction += data.deslocPct;
    }

    // Apply to Defesa
    const defesaInput = document.querySelector('[data-field="defesa"]');
    if (defesaInput) {
        const baseDefesa = (getAtributoBase('DES') || 0) + 10;
        defesaInput.value = baseDefesa + totalDefBonus;
        defesaInput.dataset.protBonus = totalDefBonus;
        defesaInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Apply to RD
    const rdInput = document.querySelector('[data-field="rd"]');
    if (rdInput) {
        const baseRd = parseInt(rdInput.dataset.baseValue || 0, 10);
        if (!rdInput.dataset.baseValue) rdInput.dataset.baseValue = rdInput.value;
        rdInput.value = baseRd + totalRdBonus;
        rdInput.dataset.protBonus = totalRdBonus;
        rdInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Apply to Deslocamento (percentage reduction)
    const deslInput = document.querySelector('[data-field="deslocamento"]');
    if (deslInput) {
        const baseDesl = getBaseDeslocamento();
        const reducedDesl = baseDesl * (1 - totalDeslocReduction);
        // Round to 1 decimal place
        deslInput.value = Math.round(reducedDesl * 10) / 10;
        deslInput.dataset.protReduction = totalDeslocReduction;
        deslInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Dispatch event for UI updates
    document.dispatchEvent(new CustomEvent('protecao:atualizado', {
        detail: { defesa: totalDefBonus, rd: totalRdBonus, deslocReduction: totalDeslocReduction }
    }));
}

// ════════════════════════════════════════════════════════════════
// FONTE — Grimoire Capacity Tracking
// ════════════════════════════════════════════════════════════════

/** Returns a display name disambiguating fontes with the same nome. */
function getFonteDisplayName(id) {
    const fonte = activeFontes.get(id);
    if (!fonte) return '?';
    const sameNames = Array.from(activeFontes.entries()).filter(([, f]) => f.nome === fonte.nome);
    if (sameNames.length <= 1) return fonte.nome;
    const idx = sameNames.findIndex(([k]) => k === id);
    return `${fonte.nome} (${idx + 1})`;
}

export function onFonteAdded(cardId, itemData) {
    const nome = itemData.nome || 'Fonte';
    const raridade = (itemData.raridade || 'comum').toLowerCase();
    const tableEntry = FONTE_LA_TABLE[raridade] || FONTE_LA_TABLE.comum;

    activeFontes.set(cardId, {
        nome,
        raridade,
        laMax: tableEntry.la,
        grauMax: tableEntry.grauMax,
        usedLa: 0,
        deusa: null,
        spells: []   // [{ cardRef: WeakRef, nome, fe, grau }]
    });

    renderFonteUI();
    saveItemEffectsState();
}

export function onFonteRaridadeChanged(cardId, newRaridade) {
    const fonte = activeFontes.get(cardId);
    if (!fonte) return;
    // 'banal' is not a valid Fonte tier — ignore capacity change
    if (newRaridade === 'banal') return;
    const tableEntry = FONTE_LA_TABLE[newRaridade] || FONTE_LA_TABLE.comum;
    fonte.raridade = newRaridade;
    fonte.laMax = tableEntry.la;
    fonte.grauMax = tableEntry.grauMax;
    renderFonteUI();
    saveItemEffectsState();
}

/** Move a spell's capacity tracking from one Fonte to another. */
export function transferSpellBetweenFontes(oldFonteId, newFonteId, spellFe, spellGrau, spellNome, cardEl) {
    if (oldFonteId === newFonteId) return;
    // Remove from old
    const old = activeFontes.get(oldFonteId);
    if (old) {
        old.usedLa = Math.max(0, old.usedLa - spellFe);
        const idx = old.spells.findIndex(s => s.cardRef?.deref?.() === cardEl);
        if (idx !== -1) old.spells.splice(idx, 1);
    }
    // Add to new
    const next = activeFontes.get(newFonteId);
    if (next) {
        next.usedLa += spellFe;
        next.spells.push({ cardRef: cardEl ? new WeakRef(cardEl) : null, nome: spellNome, fe: spellFe, grau: spellGrau });
    }
    renderFonteUI();
    saveItemEffectsState();
}

export function onFonteRemoved(cardId) {
    if (!activeFontes.has(cardId)) return;
    const fonte = activeFontes.get(cardId);
    const displayName = getFonteDisplayName(cardId);

    // Ask whether to cascade-remove linked spells
    const hasSpells = fonte.spells && fonte.spells.length > 0;
    let removeSpells = false;
    if (hasSpells) {
        removeSpells = confirm(
            `A Fonte "${displayName}" foi removida do inventário.\n\nDeseja remover também as ${fonte.spells.length} magia(s) armazenada(s) nela?`
        );
    }

    if (removeSpells) {
        fonte.spells.forEach(s => {
            const card = s.cardRef?.deref?.();
            if (card && card.isConnected) card.remove();
        });
        // Trigger LA recalc
        document.querySelectorAll('.magic-sheet').forEach(sheet => {
            const { atualizarVisibilidadeGraus } = window.__magiasFns__ || {};
            if (typeof atualizarVisibilidadeGraus === 'function') atualizarVisibilidadeGraus(sheet);
        });
        document.dispatchEvent(new Event('magias:recalc-la'));
    }

    activeFontes.delete(cardId);
    renderFonteUI();
    saveItemEffectsState();
}

export function getFontes() {
    return Array.from(activeFontes.entries()).map(([id, data]) => ({
        id,
        displayName: getFonteDisplayName(id),
        ...data
    }));
}

export function addSpellToFonte(fonteId, spellFe, spellGrau, spellNome, cardEl) {
    const fonte = activeFontes.get(fonteId);
    if (!fonte) return false;
    fonte.usedLa += spellFe;
    fonte.spells.push({
        cardRef: cardEl ? new WeakRef(cardEl) : null,
        nome: spellNome || '',
        fe: spellFe,
        grau: spellGrau
    });
    renderFonteUI();
    saveItemEffectsState();
    return true;
}

export function removeSpellFromFonte(fonteId, spellFe, cardEl) {
    const fonte = activeFontes.get(fonteId);
    if (!fonte) return;
    fonte.usedLa = Math.max(0, fonte.usedLa - spellFe);
    if (cardEl) {
        const idx = fonte.spells.findIndex(s => s.cardRef?.deref?.() === cardEl);
        if (idx !== -1) fonte.spells.splice(idx, 1);
    }
    renderFonteUI();
    saveItemEffectsState();
}

export function setFonteDeusa(fonteId, deusa) {
    const fonte = activeFontes.get(fonteId);
    if (!fonte) return;
    fonte.deusa = deusa;
    saveItemEffectsState();
}

export function validateSpellForFonte(fonteId, spellGrau, spellDeusa) {
    const fonte = activeFontes.get(fonteId);
    if (!fonte) return { valid: false, reason: 'Fonte não encontrada' };

    const grauNorm = (spellGrau === 'S' || spellGrau === 's') ? 'S' : parseInt(spellGrau, 10);
    const grausSuportados = grausFromMax(fonte.grauMax);
    if (!grausSuportados.includes(grauNorm)) {
        return { valid: false, reason: `Esta Fonte (${fonte.raridade}) não suporta Grau ${grauNorm}` };
    }

    // Deusa restriction: once set, all spells must match
    if (spellDeusa && fonte.deusa && fonte.deusa !== spellDeusa) {
        return { valid: false, reason: `Esta Fonte pertence a ${fonte.deusa}, não a ${spellDeusa}` };
    }

    return { valid: true, overCapacity: fonte.usedLa >= fonte.laMax };
}

function renderFonteUI() {
    const teurgiaSheet = document.querySelector('[data-magic-sheet="teurgia"]');
    if (!teurgiaSheet) return;

    let fonteSection = teurgiaSheet.querySelector('.fonte-capacity-section');
    if (!fonteSection) {
        fonteSection = document.createElement('div');
        fonteSection.className = 'fonte-capacity-section';
        teurgiaSheet.insertBefore(fonteSection, teurgiaSheet.firstChild);
    }

    if (activeFontes.size === 0) {
        fonteSection.innerHTML = '<p class="fonte-empty">Nenhuma Fonte equipada. Adicione uma Fonte ao inventário.</p>';
        return;
    }

    fonteSection.innerHTML = `
        <div class="fonte-header">
            <span class="material-symbols-outlined" style="font-size:14px;">auto_awesome</span>
            <span>Fontes Equipadas</span>
        </div>
        <div class="fonte-list">
            ${Array.from(activeFontes.entries()).map(([id, f]) => {
                const pct = f.laMax > 0 ? Math.min((f.usedLa / f.laMax) * 100, 100) : 0;
                const isOver = f.usedLa > f.laMax;
                const grausSuportados = grausFromMax(f.grauMax);
                const displayName = getFonteDisplayName(id);
                const deusaLabel = f.deusa ? `<div class="fonte-item__deusa">${f.deusa}</div>` : '';
                const spellList = (f.spells || []).map(s =>
                    `<div class="fonte-spell-entry">${s.nome || '—'} <span class="fonte-spell-fe">FE ${s.fe}</span></div>`
                ).join('');
                return `
                    <div class="fonte-item ${isOver ? 'fonte-item--over' : ''}" data-fonte-id="${id}">
                        <div class="fonte-item__top">
                            <div class="fonte-item__name">${displayName}</div>
                            ${deusaLabel}
                            <button type="button" class="fonte-item__edit-btn" data-fonte-id="${id}" title="Editar capacidade">
                                <span class="material-symbols-outlined" style="font-size:12px;">edit</span>
                            </button>
                        </div>
                        <div class="fonte-item__bar">
                            <div class="fonte-item__bar-fill" style="width:${Math.min(pct, 100)}%"></div>
                        </div>
                        <div class="fonte-item__label">
                            <span class="fonte-item__usage">${f.usedLa}</span>/<span class="fonte-item__max" data-fonte-la="${id}">${f.laMax}</span>
                            <span class="fonte-item__grau-tag">até Grau ${f.grauMax}</span>
                            ${isOver ? '<span class="fonte-item__warn" title="Capacidade excedida!">⚠</span>' : ''}
                        </div>
                        ${spellList ? `<details class="fonte-spell-list"><summary>${f.spells.length} magia(s)</summary>${spellList}</details>` : ''}
                    </div>`;
            }).join('')}
        </div>`;

    // Wire edit buttons
    fonteSection.querySelectorAll('.fonte-item__edit-btn').forEach(btn => {
        btn.addEventListener('click', () => abrirEditorFonte(btn.dataset.fonteId));
    });
}

function abrirEditorFonte(fonteId) {
    const fonte = activeFontes.get(fonteId);
    if (!fonte) return;
    const displayName = getFonteDisplayName(fonteId);

    const existing = document.querySelector('.fonte-editor-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'fonte-editor-overlay magic-editor-overlay';
    overlay.innerHTML = `
        <div class="magic-editor fonte-editor">
            <div class="magic-editor-header">
                <h3>Editar Fonte — ${displayName}</h3>
                <button type="button" class="btn-editor-close"><span class="material-symbols-outlined">close</span></button>
            </div>
            <div class="magic-editor-body">
                <label>Capacidade (LA máx.)
                    <input type="number" class="fe-edit-la" value="${fonte.laMax}" min="1" style="width:80px">
                </label>
                <label>Grau máximo suportado
                    <select class="fe-edit-graumax">
                        ${['1','2','3','4','S'].map(g =>
                            `<option value="${g}" ${String(fonte.grauMax) === g ? 'selected' : ''}>${g === 'S' ? 'Especial' : g + '° Grau'}</option>`
                        ).join('')}
                    </select>
                </label>
            </div>
            <div class="magic-editor-footer">
                <button type="button" class="btn-editor-save">Salvar</button>
            </div>
        </div>`;

    overlay.querySelector('.btn-editor-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.btn-editor-save').addEventListener('click', () => {
        const newLa = parseInt(overlay.querySelector('.fe-edit-la').value, 10);
        const newGrauMax = overlay.querySelector('.fe-edit-graumax').value;
        if (!isNaN(newLa) && newLa > 0) fonte.laMax = newLa;
        fonte.grauMax = newGrauMax;
        renderFonteUI();
        saveItemEffectsState();
        overlay.remove();
    });

    document.body.appendChild(overlay);
}

// ════════════════════════════════════════════════════════════════
// VISIBILITY — Fonte section only visible on Teurgia sub-tab
// ════════════════════════════════════════════════════════════════

export function updateFonteVisibility() {
    const fonteSection = document.querySelector('.fonte-capacity-section');
    if (!fonteSection) return;
    const activeTab = document.querySelector('.magic-tab-btn.active');
    const isTeurgia = activeTab && activeTab.dataset.magicTab === 'teurgia';
    fonteSection.style.display = isTeurgia ? '' : 'none';
}

// ════════════════════════════════════════════════════════════════
// DISPATCHER — Called from inventory.js on category change/add/remove
// ════════════════════════════════════════════════════════════════

export function onItemCategoryChanged(cardId, oldCategory, newCategory, itemData) {
    // Remove old effects
    if (oldCategory === 'arma') onWeaponRemoved(cardId);
    if (oldCategory === 'proteção') onProtectionRemoved(cardId);
    if (oldCategory === 'fonte') onFonteRemoved(cardId);

    // Apply new effects
    if (newCategory === 'arma') onWeaponAdded(cardId, itemData);
    if (newCategory === 'proteção') onProtectionAdded(cardId, itemData);
    if (newCategory === 'fonte') onFonteAdded(cardId, itemData);
}

export function onItemRemoved(cardId, category, itemData) {
    if (category === 'arma') onWeaponRemoved(cardId);
    if (category === 'proteção') onProtectionRemoved(cardId);
    if (category === 'fonte') onFonteRemoved(cardId);
}

export function onItemAdded(cardId, category, itemData) {
    if (category === 'arma') onWeaponAdded(cardId, itemData);
    if (category === 'proteção') onProtectionAdded(cardId, itemData);
    if (category === 'fonte') onFonteAdded(cardId, itemData);
}

// ════════════════════════════════════════════════════════════════
// PERSISTENCE
// ════════════════════════════════════════════════════════════════

function saveItemEffectsState() { /* substituído por auto-save Firebase */ }

export function getItemEffectsState() {
    // Use plain objects instead of arrays-of-arrays to avoid Firestore nested-array restriction
    const fontesObj = {};
    activeFontes.forEach((f, k) => {
        fontesObj[k] = {
            ...f,
            spells: (f.spells || []).map(({ cardRef: _cr, ...rest }) => rest)
        };
    });
    return {
        weapons: Object.fromEntries(activeWeapons),
        protections: Object.fromEntries(activeProtections),
        fontes: fontesObj
    };
}

export function setItemEffectsState(state) {
    if (!state) return;
    try {
        if (state.weapons) {
            // Support both legacy array format [[k,v],...] and new object format {k:v,...}
            const entries = Array.isArray(state.weapons)
                ? state.weapons
                : Object.entries(state.weapons);
            entries.forEach(([k, v]) => activeWeapons.set(k, v));
        }
        if (state.protections) {
            const entries = Array.isArray(state.protections)
                ? state.protections
                : Object.entries(state.protections);
            entries.forEach(([k, v]) => activeProtections.set(k, v));
            recalcProtectionBonuses();
        }
        if (state.fontes) {
            const entries = Array.isArray(state.fontes)
                ? state.fontes
                : Object.entries(state.fontes);
            entries.forEach(([k, v]) => {
                v.spells = (v.spells || []).map(s => ({ ...s, cardRef: null }));
                activeFontes.set(k, v);
            });
            renderFonteUI();
        }
    } catch (e) {
        console.warn('[ItemEffects] Failed to set state', e);
    }
}

export function loadItemEffectsState() { /* kept for compat, use setItemEffectsState instead */ }

// ════════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════════

export function initItemEffects() {

    // Listen for magic tab switches to show/hide Fonte section
    document.querySelectorAll('.magic-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => setTimeout(updateFonteVisibility, 50));
    });

    // Listen for attribute changes to re-resolve empunhadura "Leve" weapons
    document.querySelector('#secao-radar')?.addEventListener('input', (e) => {
        if (e.target.classList.contains('attr-input')) {
            // Re-sync attack attr for "leve" weapons (only if linked)
            // This is handled by combat.js's own sincronizarAcerto
        }
    });

    console.log('[ItemEffects] Inicializado');
}
