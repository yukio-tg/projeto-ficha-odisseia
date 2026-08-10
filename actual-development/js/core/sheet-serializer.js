// core/sheet-serializer.js
// Coleta todo o estado da ficha em um objeto plano e restaura a partir dele.

import { getSkillsState, setSkillsState } from '../ui/skills.js';
import { getPowersState, setPowersState } from '../ui/powers.js';
import { getMagiasState, setMagiasState } from '../ui/magias.js';
import { getCombatState, setCombatState } from '../ui/combat.js';
import { getInventarioState, setInventarioState } from '../ui/inventory.js';
import { getItemEffectsState, setItemEffectsState } from './item-effects.js';
import { getAnotacoesState, setAnotacoesState } from '../ui/anotacoes.js';
import { getBestasState, setBestasState } from '../ui/besta.js';
import { getRadarAttrWrap } from './radar-service.js';

const ATTRS = ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'];

// ─── Campos simples (data-field) ─────────────────────────────────────────────

function serializeFields() {
    const fields = {};
    document.querySelectorAll('input[data-field], select[data-field], textarea[data-field]').forEach(el => {
        const key = el.dataset.field;
        if (!key) return;
        if (el.type === 'checkbox') {
            fields[key] = el.checked;
        } else {
            fields[key] = el.value;
        }
    });
    return fields;
}

function deserializeFields(fields) {
    if (!fields) return;
    Object.entries(fields).forEach(([key, val]) => {
        document.querySelectorAll(`[data-field="${key}"]`).forEach(el => {
            if (el.type === 'checkbox') {
                el.checked = !!val;
            } else {
                el.value = val ?? '';
            }
        });
    });
}

// ─── Radar (nível + atributos) ───────────────────────────────────────────────

function serializeRadar() {
    const radarDiv = document.getElementById('secao-radar');
    if (!radarDiv) return {};
    const levelInput = radarDiv.querySelector('.level-input');
    const radar = { level: levelInput ? levelInput.value : '1', attrs: {}, mods: {} };
    ATTRS.forEach(attr => {
        const wrap = getRadarAttrWrap(attr);
        if (!wrap) return;
        radar.attrs[attr] = wrap.querySelector('.attr-input')?.value ?? '0';
        radar.mods[attr] = wrap.querySelector('.mod-input')?.value ?? '+0';
    });
    return radar;
}

function deserializeRadar(radar) {
    if (!radar) return;
    const radarDiv = document.getElementById('secao-radar');
    if (!radarDiv) return;
    const levelInput = radarDiv.querySelector('.level-input');
    if (levelInput && radar.level !== undefined) levelInput.value = radar.level;
    ATTRS.forEach(attr => {
        const wrap = getRadarAttrWrap(attr);
        if (!wrap) return;
        const attrInput = wrap.querySelector('.attr-input');
        const modInput = wrap.querySelector('.mod-input');
        if (attrInput && radar.attrs?.[attr] !== undefined) attrInput.value = radar.attrs[attr];
        if (modInput && radar.mods?.[attr] !== undefined) modInput.value = radar.mods[attr];
    });
    // Dispara input no radar para recalcular tudo
    radarDiv.querySelector('.level-input')?.dispatchEvent(new Event('input', { bubbles: true }));
    ATTRS.forEach(attr => {
        const wrap = getRadarAttrWrap(attr);
        wrap?.querySelector('.attr-input')?.dispatchEvent(new Event('input', { bubbles: true }));
    });
}

// ─── API pública ─────────────────────────────────────────────────────────────

export function serializeSheet() {
    return {
        fields: serializeFields(),
        radar: serializeRadar(),
        pericias: getSkillsState(),
        poderes: getPowersState(),
        magias: getMagiasState(),
        combate: getCombatState(),
        inventario: getInventarioState(),
        itemEffects: getItemEffectsState(),
        anotacoes: getAnotacoesState(),
        bestas: getBestasState(),
    };
}

export function deserializeSheet(data) {
    if (!data) return;
    deserializeFields(data.fields);
    deserializeRadar(data.radar);
    if (data.pericias) setSkillsState(data.pericias);
    if (data.inventario) setInventarioState(data.inventario);
    if (data.itemEffects) setItemEffectsState(data.itemEffects);
    if (data.poderes) setPowersState(data.poderes);
    if (data.magias) setMagiasState(data.magias);
    if (data.combate) setCombatState(data.combate);
    if (data.anotacoes) setAnotacoesState(data.anotacoes);
    if (data.bestas) setBestasState(data.bestas);
}
