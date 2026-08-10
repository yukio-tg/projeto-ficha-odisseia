// ui/besta.js — Besta (Companion Creature) Tab
'use strict';

import { normalizar, escapeHtml, uid } from '../core/utils.js';
import { setupAccordion } from '../core/dom-helpers.js';
import { INERTIDAO_TAMANHO } from '../core/calculation.js';
import { periciasData } from './skills.js';
import { createDataLoader } from '../core/data-loader.js';
import { createAutocomplete } from '../core/autocomplete.js';
import { updateBestaBar } from './vitals.js';

// ── Constants ──────────────────────────────────────────────────────────────

const TITULO_TABLE = [
    [1,1,'Vassallus Inferior'],[2,3,'Vassallus'],[4,4,'Vassallus Superior'],
    [5,5,'Baronia Inferior'],[6,7,'Baronia'],[8,8,'Baronia Superior'],
    [9,9,'Dominius Inferior'],[10,11,'Dominius'],[12,12,'Dominius Superior'],
    [13,13,'Imperator Inferior'],[14,15,'Imperator'],[16,16,'Imperator Superior'],
    [17,17,'Tyrannus Inferior'],[18,19,'Tyrannus'],[20,20,'Tyrannus Superior'],
];

const TAMANHO_OPTIONS = [
    {label:'Minúsculo',key:'tam-minusculo'},{label:'Pequeno',key:'tam-pequeno'},
    {label:'Médio',key:'tam-medio'},{label:'Grande',key:'tam-grande'},
    {label:'Enorme',key:'tam-enorme'},{label:'Colossal',key:'tam-colossal'},
];

const ATTRS = ['FOR','DES','CON','INT','SAB','CAR'];

const ATTR_COLORS = { FOR:'#b52418',DES:'#4a7cb5',CON:'#d4620a',INT:'#d4a800',SAB:'#3a8a5c',CAR:'#8a4ab5' };

const HAB_TYPES = {
    bio:   { label:'Aspecto Biológico',  color:'#c0392b' },
    treino:{ label:'Aspecto de Treino',  color:'#2e7d32' },
    indiv: { label:'Aspecto Individual', color:'#1565c0' },
};

const MAGIC_TYPES = ['arcanismo','feromancia','teurgia'];

const poderesLoader = createDataLoader('/data/poderes.json','Besta-Poderes');
const magiasLoader  = createDataLoader('/data/magias.json','Besta-Magias','magias');

// ── State ──────────────────────────────────────────────────────────────────

let bestas = [];
const bestaRadars = new Map();
let _bestaPtTotal = 0;

// ── Pure helpers ───────────────────────────────────────────────────────────

function getTitulo(n) {
    for (const [a,b,t] of TITULO_TABLE) if (n>=a && n<=b) return t;
    return 'Vassallus Inferior';
}

function attrBase(nivel) { return 13 + parseInt(nivel,10); }

function calcPmMax(nivel, conMod, carMod) {
    const base = 25 + conMod + carMod;
    return Math.floor(base + nivel * (3 + (conMod + carMod) / 2));
}

function calcDefesa(desMod) { return 12 + desMod; }

function calcInertia(nivel, tamanhoLabel) {
    const entry = TAMANHO_OPTIONS.find(t => t.label === tamanhoLabel);
    const key   = entry ? entry.key : 'tam-medio';
    return parseInt(nivel,10) + (INERTIDAO_TAMANHO[key] ?? 7);
}

function calcProfLimit(nivel) { return 3 + Math.floor(parseInt(nivel,10) / 2); }

const BIO_BONUS_LEVELS = new Set([3,6,7,9,11,13,14,17,19]);
function calcBioLimit(nivel) {
    const n = parseInt(nivel,10) || 1;
    let extra = 0;
    for (const lvl of BIO_BONUS_LEVELS) { if (n >= lvl) extra++; }
    return 6 + extra;
}

function getOwnerName() {
    return document.querySelector('[data-field="personagem-nome"]')?.value?.trim() || '—';
}

function newBesta() {
    const startPm = calcPmMax(1, 0, 0);
    return {
        id: uid(), nome:'', nivel:1, tamanho:'Médio', individualidade:'', retrato:'',
        attrs: { FOR:0, DES:0, CON:0, INT:0, SAB:0, CAR:0 },
        pmAtual:startPm, pmTempAtual:0, pmTempMax:0, periciaBonus:{},
        rd:0, rdTipo1:'', rdVal1:'', rdTipo2:'', rdVal2:'',
        defesaTipo1:'', defesaVal1:'', defesaTipo2:'', defesaVal2:'',
        deslocamento:6, deslocExtra:[{label:'',val:''},{label:'',val:''}],
        anotacoes:'',
        pericias: {},
        ataques: [], reacoes: [],
        condicoes: [], bonusOnus: [],
        hab: { bio:[], treino:[], indiv:[] },
        magias: [],
        itens: [], invMax:0,
        expandMagias:false, expandInv:false, expandSkills:false,
    };
}

// ── Persistence ────────────────────────────────────────────────────────────

function saveBestas() { /* localStorage desativado para fase de testes */ }
function loadBestas() { /* localStorage desativado para fase de testes */ }

// ── Visibility ─────────────────────────────────────────────────────────────

export function checkBestaTabVisibility() {
    const classe  = (document.querySelector('[data-field="classe-nome"]')?.value || '').trim().toLowerCase();
    const vinculo = (document.querySelector('[data-field="besta-nome"]')?.value  || '').trim().toLowerCase();
    const show    = classe === 'treinador' || (vinculo !== '' && vinculo !== 'nenhum');

    document.querySelectorAll('#tabs li[data-tab="besta"], #mobile-tabs li[data-tab="besta"]')
        .forEach(li => { li.style.display = show ? '' : 'none'; });
}

// ── Derived values ──────────────────────────────────────────────────────────

function derivedFor(b) {
    const n  = parseInt(b.nivel,10) || 1;
    const ba = attrBase(n);
    const conMod = b.attrs.CON || 0;
    const carMod = b.attrs.CAR || 0;
    const desMod = b.attrs.DES || 0;
    const pmMax   = calcPmMax(n, conMod, carMod);
    const defesa  = calcDefesa(desMod);
    const inertia = calcInertia(n, b.tamanho);
    const profLim = calcProfLimit(n);
    const titulo  = getTitulo(n);
    return { n, ba, pmMax, defesa, inertia, profLim, titulo };
}

// ── HTML builders ──────────────────────────────────────────────────────────

function tamanhoOptions(current) {
    return TAMANHO_OPTIONS.map(t =>
        `<option value="${t.label}" ${current===t.label?'selected':''}>${t.label}</option>`
    ).join('');
}

function buildIdentityHTML(b, d) {
    const indivDisplay = d.n >= 5 ? '' : 'display:none';
    const hasImg = !!b.retrato;
    return `
<div class="besta-section besta-identity">
    <div class="portrait-column">
        <div class="info-img">
            <div class="portrait-corner portrait-corner-tl"></div>
            <div class="portrait-corner portrait-corner-tr"></div>
            <div class="portrait-corner portrait-corner-bl"></div>
            <div class="portrait-corner portrait-corner-br"></div>
            <div class="centralize-y">
                <img id="besta-img-${b.id}" src="${escapeHtml(b.retrato)}" alt="Retrato"
                    class="besta-portrait-img"
                    style="${hasImg ? 'display:block' : 'display:none'}">
                <div id="besta-ph-${b.id}" style="${hasImg ? 'display:none' : 'display:flex'};width:100%;flex:1;flex-direction:column;align-items:center;justify-content:center;padding:16px 12px">
                    <div class="portrait-placeholder-icon">🐾</div>
                    <p class="portrait-placeholder-text">Retrato da Besta</p>
                    <div style="width:100%">
                        <input type="text" data-besta-field="retrato"
                            class="besta-retrato-url"
                            placeholder="Insira URL da imagem" value="${escapeHtml(b.retrato)}">
                    </div>
                </div>
            </div>
            <button type="button" class="besta-clear-portrait"
                    data-besta-clear-portrait="${b.id}"
                    style="${hasImg ? 'display:inline-flex' : 'display:none'}">
                <span class="material-symbols-outlined">remove</span>
            </button>
        </div>
    </div>
    <div class="identity-column">
        <div class="identity-name-block">
            <div>
                <label class="ifl">Nome da Besta</label>
                <input type="text" data-besta-field="nome" class="ifinput-name"
                    value="${escapeHtml(b.nome)}" placeholder="…" autocomplete="off">
            </div>
            <div>
                <label class="ifl">Título</label>
                <input type="text" class="ifinput-title besta-input-title"
                    value="${escapeHtml(d.titulo)}" readonly>
            </div>
        </div>
        <div class="identity-fields-grid">
            <fieldset><legend>Vínculo</legend>
                <input type="text" class="besta-vinculo-input" value="${escapeHtml(getOwnerName())}" readonly>
            </fieldset>
            <fieldset><legend>Tamanho</legend>
                <select data-besta-field="tamanho">${tamanhoOptions(b.tamanho)}</select>
            </fieldset>
            <fieldset><legend>Inertidão</legend>
                <input type="number" class="besta-inertia-display" value="${d.inertia}" readonly>
            </fieldset>
            <fieldset class="besta-indiv-fs" style="${indivDisplay}"><legend>Individualidade</legend>
                <input type="text" data-besta-field="individualidade"
                    value="${escapeHtml(b.individualidade)}" placeholder="…">
            </fieldset>
        </div>
    </div>
</div>`;
}

function buildAttrsHTML(b, d) {
    return `<div class="radar-column">
        <div class="radar-column-title">Atributos</div>
        <div id="besta-radar-${b.id}" style="width:100%;max-width:360px;margin:0 auto"></div>
    </div>`;
}

function buildVitalsHTML(b, d) {
    const deslExtra = (b.deslocExtra||[]);
    return `<div class="vitals-column besta-vitals-section" id="besta-vitals-col-${b.id}">
        <div class="vital-card vital-card-mana">
            <div class="vital-card-header">
                <div class="vital-card-label">
                    <span class="vital-card-icon">✦</span>
                    Pontos de Mana
                </div>
                <button type="button" class="vital-temp-toggle besta-pm-temp-toggle" data-besta-pm-temp="${b.id}"
                    title="Pontos de Mana Temporários">
                    <span class="material-symbols-outlined toggle-arrow" style="font-size:14px;line-height:1">arrow_right</span>
                    temp.
                </button>
            </div>
            <div class="vital-bar">
                <div class="vital-bar-fill mana" id="besta-mana-fill-${b.id}"></div>
                <div class="vital-bar-inputs">
                    <input type="number" data-besta-field="pmAtual" value="${b.pmAtual||0}" min="-999">
                    <span class="separator">/</span>
                    <input type="number" class="besta-pm-max-display" value="${d.pmMax}" readonly>
                </div>
            </div>
            <div class="vital-temp-wrapper" id="besta-pm-temp-${b.id}">
                <div class="vital-temp-label">Pontos de Mana Temporários</div>
                <div class="vital-bar vital-bar--temp">
                    <div class="vital-bar-fill mana" id="besta-mana-temp-fill-${b.id}"></div>
                    <div class="vital-bar-inputs">
                        <input type="number" data-besta-field="pmTempAtual" value="${b.pmTempAtual||0}" min="0">
                        <span class="separator">/</span>
                        <input type="number" data-besta-field="pmTempMax" value="${b.pmTempMax||0}" min="0">
                    </div>
                </div>
            </div>
        </div>
        <div class="combat-stats-row">
            <div class="cstat-block cstat-defesa">
                <div class="cstat-accent"></div>
                <div class="cstat-label">Defesa</div>
                <div class="cstat-main-value">
                    <input type="number" data-besta-field="defesa" value="${d.defesa}" class="cstat-main-input">
                </div>
                <div class="cstat-divider"><span class="cstat-divider-text">casos especiais</span></div>
                <div class="cstat-special-list">
                    <div class="cstat-special-row">
                        <input type="text" class="cstat-type-input" data-besta-field="defesaTipo1" placeholder="ex: de 4"
                            value="${escapeHtml(b.defesaTipo1||'')}">
                        <input type="number" class="cstat-val-input" data-besta-field="defesaVal1" placeholder="—"
                            value="${b.defesaVal1||''}">
                    </div>
                    <div class="cstat-special-row">
                        <input type="text" class="cstat-type-input" data-besta-field="defesaTipo2" placeholder="ex: esquivando"
                            value="${escapeHtml(b.defesaTipo2||'')}">
                        <input type="number" class="cstat-val-input" data-besta-field="defesaVal2" placeholder="—"
                            value="${b.defesaVal2||''}">
                    </div>
                </div>
            </div>
            <div class="cstat-block cstat-rd">
                <div class="cstat-accent"></div>
                <div class="cstat-label">Red. de Dano</div>
                <div class="cstat-main-value">
                    <input type="number" data-besta-field="rd" value="${b.rd||0}" class="cstat-main-input">
                </div>
                <div class="cstat-divider"><span class="cstat-divider-text">casos especiais</span></div>
                <div class="cstat-special-list">
                    <div class="cstat-special-row">
                        <input type="text" class="cstat-type-input" data-besta-field="rdTipo1" placeholder="ex: impacto"
                            value="${escapeHtml(b.rdTipo1||'')}">
                        <input type="number" class="cstat-val-input" data-besta-field="rdVal1" placeholder="—"
                            value="${b.rdVal1||''}">
                    </div>
                    <div class="cstat-special-row">
                        <input type="text" class="cstat-type-input" data-besta-field="rdTipo2" placeholder="ex: mágico"
                            value="${escapeHtml(b.rdTipo2||'')}">
                        <input type="number" class="cstat-val-input" data-besta-field="rdVal2" placeholder="—"
                            value="${b.rdVal2||''}">
                    </div>
                </div>
            </div>
            <div class="cstat-block cstat-desl">
                <div class="cstat-accent"></div>
                <div class="cstat-label">Deslocamento</div>
                <div class="cstat-main-value">
                    <input type="number" data-besta-field="deslocamento" value="${b.deslocamento||6}"
                        class="cstat-main-input cstat-main-input--sm">
                    <span class="cstat-unit">m</span>
                </div>
                <div class="desl-modes">
                    ${deslExtra.map((e,i) => `<div class="desl-mode-row">
                        <input type="text" class="desl-mode-label-input" data-besta-desl-label="${i}"
                            value="${escapeHtml(e.label||'')}" placeholder="ex: Voo">
                        <input type="number" class="desl-mode-val" data-besta-desl-val="${i}"
                            value="${e.val||''}" placeholder="—">
                        <span class="desl-mode-unit">m</span>
                    </div>`).join('')}
                </div>
            </div>
        </div>
        <div id="besta-skills-mount-${b.id}" class="besta-skills-inner-mount"></div>
    </div>`;
}

function buildTotalStr(diceStr, bonusNum, baseVal) {
    const n = baseVal + bonusNum;
    if (diceStr) {
        return diceStr + (n !== 0 ? (n > 0 ? '+' : '') + n : '');
    }
    return n !== 0 ? String(n) : '—';
}

function buildSkillsSection(b, d, container) {
    const DICE = ['','1d4','1d6','1d8','1d10','1d12'];

    const wrap = document.createElement('div');
    wrap.className = 'besta-section besta-skills-section';

    // Header row: counter + expand button inline
    const header = document.createElement('div');
    header.className = 'besta-skills-header';

    const counter = document.createElement('div');
    counter.className = 'besta-proficiencia-counter';
    const counterLabel = document.createElement('span');
    counterLabel.className = 'counter-label';
    counterLabel.textContent = 'Proficiência';
    const counterFrac = document.createElement('div');
    counterFrac.className = 'counter-fraction';
    const cUsed = document.createElement('span');
    cUsed.className = 'counter-value';
    const cSep = document.createElement('span');
    cSep.className = 'counter-sep';
    cSep.textContent = '/';
    const cMax = document.createElement('span');
    cMax.className = 'counter-max';
    const cWarn = document.createElement('span');
    cWarn.className = 'counter-warning';
    cWarn.style.display = 'none';
    cWarn.innerHTML = '<span class="material-symbols-outlined" style="font-size:12px">warning</span> Excesso';
    counterFrac.append(cUsed, cSep, cMax);
    counter.append(counterLabel, counterFrac, cWarn);

    const expandBtn = document.createElement('button');
    expandBtn.type = 'button';
    expandBtn.className = 'besta-expand-btn';
    expandBtn.setAttribute('aria-expanded', b.expandSkills ? 'true' : 'false');
    expandBtn.innerHTML = `<span class="material-symbols-outlined besta-skills-chevron">${b.expandSkills ? 'expand_less' : 'expand_more'}</span>
        ${b.expandSkills ? 'Recolher' : 'Perícias'}`;

    header.append(counter, expandBtn);
    wrap.appendChild(header);

    function refreshCounter() {
        const totalGasto = periciasData.reduce((s, p) => s + (b.pericias[p.nome] || 0), 0);
        const maxPts = calcProfLimit(b.nivel);
        cUsed.textContent = totalGasto;
        cMax.textContent = maxPts;
        cUsed.style.color = totalGasto > maxPts ? 'var(--blood2)' : 'var(--gold3)';
        cWarn.style.display = totalGasto > maxPts ? 'flex' : 'none';
    }

    // Collapsible wrapper — rows control visibility, tableWrap animates height
    const tableWrap = document.createElement('div');
    tableWrap.className = 'besta-skills-table-wrap';

    function getNonEssentialRows() {
        const rows = [];
        tbody.querySelectorAll('tr[data-skill-row]').forEach(tr => {
            const nome = tr.dataset.skillRow;
            const hasTraining = (b.pericias[nome] || 0) > 0;
            const hasBonus = (b.periciaBonus?.[nome] || '') !== '';
            if (!hasTraining && !hasBonus) rows.push(tr);
        });
        return rows;
    }

    function showAllRows() {
        tbody.querySelectorAll('tr[data-skill-hidden]').forEach(tr => {
            tr.removeAttribute('data-skill-hidden');
            tr.style.display = '';
        });
    }

    function hideNonEssentialRows() {
        getNonEssentialRows().forEach(tr => {
            tr.setAttribute('data-skill-hidden', '');
            tr.style.display = 'none';
        });
    }

    expandBtn.addEventListener('click', () => {
        b.expandSkills = !b.expandSkills;
        expandBtn.setAttribute('aria-expanded', b.expandSkills ? 'true' : 'false');

        if (b.expandSkills) {
            expandBtn.innerHTML = `<span class="material-symbols-outlined besta-skills-chevron">expand_less</span> Recolher`;
            const currentH = tableWrap.offsetHeight;
            showAllRows();
            const newH = tableWrap.scrollHeight;
            tableWrap.style.overflow = 'hidden';
            tableWrap.style.height = currentH + 'px';
            requestAnimationFrame(() => requestAnimationFrame(() => {
                tableWrap.style.height = newH + 'px';
                tableWrap.addEventListener('transitionend', () => {
                    tableWrap.style.height = '';
                    tableWrap.style.overflow = '';
                }, { once: true });
            }));
        } else {
            expandBtn.innerHTML = `<span class="material-symbols-outlined besta-skills-chevron">expand_more</span> Perícias`;
            const nonEssential = getNonEssentialRows();
            const currentH = tableWrap.offsetHeight;
            // Temporarily hide to measure essential-only height
            nonEssential.forEach(tr => { tr.style.display = 'none'; });
            const essentialH = tableWrap.scrollHeight;
            nonEssential.forEach(tr => { tr.style.display = ''; });
            tableWrap.style.overflow = 'hidden';
            tableWrap.style.height = currentH + 'px';
            requestAnimationFrame(() => requestAnimationFrame(() => {
                tableWrap.style.height = essentialH + 'px';
                tableWrap.addEventListener('transitionend', () => {
                    hideNonEssentialRows();
                    tableWrap.style.height = '';
                    tableWrap.style.overflow = '';
                }, { once: true });
            }));
        }
        saveBestas();
    });

    // Table
    const table = document.createElement('table');
    table.className = 'besta-skill-table';
    const thead = document.createElement('thead');
    thead.innerHTML = `<tr>
        <th class="col-nome">Perícia</th>
        <th class="col-prof">Treino</th>
        <th class="col-bonus">Bônus</th>
        <th class="col-total">Total</th>
    </tr>`;
    table.appendChild(thead);
    const tbody = document.createElement('tbody');

    periciasData.forEach(p => {
        const color = ATTR_COLORS[p.attr] || '#7a5c28';
        const prof  = b.pericias[p.nome] || 0;
        const bonus = b.periciaBonus?.[p.nome] || '';
        const baseVal = b.attrs[p.attr] || 0;
        const diceStr = DICE[prof] || '';
        const bonusNum = parseInt(bonus, 10) || 0;
        const totalStr = buildTotalStr(diceStr, bonusNum, baseVal);
        const hidden = !b.expandSkills && prof === 0 && bonus === '';

        const tr = document.createElement('tr');
        tr.dataset.skillRow = p.nome;
        if (hidden) { tr.setAttribute('data-skill-hidden', ''); tr.style.display = 'none'; }
        if (prof === 0) tr.classList.add('pericia-row-grau0');
        tr.style.setProperty('--row-attr-color', color);
        tr.style.borderLeft = `2.5px solid ${color}30`;

        // Nome
        const nomeTd = document.createElement('td');
        nomeTd.className = 'col-nome';
        const nomeSpan = document.createElement('span');
        nomeSpan.textContent = p.nome;
        nomeSpan.style.cssText = 'font-size:12.5px';
        nomeTd.appendChild(nomeSpan);
        tr.appendChild(nomeTd);

        // Pips
        const profTd = document.createElement('td');
        profTd.className = 'col-prof';
        profTd.style.textAlign = 'center';
        const pipsDiv = document.createElement('div');
        pipsDiv.className = 'prof-pips';
        const labelSpan = document.createElement('span');
        labelSpan.className = 'prof-label';
        const DICE_LABEL = ['—','1d4','1d6','1d8','1d10','1d12'];
        labelSpan.textContent = DICE_LABEL[prof] || '—';
        for (let lvl = 1; lvl <= 5; lvl++) {
            const pip = document.createElement('button');
            pip.type = 'button';
            pip.className = 'prof-pip' + (prof >= lvl ? ' active' : '');
            pip.dataset.level = lvl;
            pip.title = `Grau ${lvl} — ${DICE_LABEL[lvl]}`;
            pip.addEventListener('click', () => {
                const cur = b.pericias[p.nome] || 0;
                const nv  = cur === lvl ? lvl - 1 : lvl;
                b.pericias[p.nome] = nv;
                pipsDiv.querySelectorAll('.prof-pip').forEach(pp => {
                    pp.classList.toggle('active', parseInt(pp.dataset.level) <= nv);
                });
                labelSpan.textContent = nv === 0 ? '—' : DICE_LABEL[nv];
                tr.classList.toggle('pericia-row-grau0', nv === 0);
                if (!b.expandSkills) {
                    const curBonus = (b.periciaBonus?.[p.nome] || '') !== '';
                    if (nv === 0 && !curBonus) { tr.setAttribute('data-skill-hidden', ''); tr.style.display = 'none'; }
                    else { tr.removeAttribute('data-skill-hidden'); tr.style.display = ''; }
                }
                recalcTotal();
                refreshCounter();
                saveBestas();
            });
            pipsDiv.appendChild(pip);
        }
        pipsDiv.appendChild(labelSpan);
        profTd.appendChild(pipsDiv);
        tr.appendChild(profTd);

        // Bônus input
        const bonusTd = document.createElement('td');
        bonusTd.className = 'col-bonus';
        const bonusInp = document.createElement('input');
        bonusInp.type = 'text';
        bonusInp.className = 'besta-pericia-bonus';
        bonusInp.placeholder = 'ex: +1';
        bonusInp.value = bonus;
        bonusInp.addEventListener('input', () => {
            if (!b.periciaBonus) b.periciaBonus = {};
            b.periciaBonus[p.nome] = bonusInp.value;
            if (!b.expandSkills) {
                const hasTraining = (b.pericias[p.nome] || 0) > 0;
                const hasBonus = bonusInp.value !== '';
                if (!hasTraining && !hasBonus) { tr.setAttribute('data-skill-hidden', ''); tr.style.display = 'none'; }
                else { tr.removeAttribute('data-skill-hidden'); tr.style.display = ''; }
            }
            recalcTotal();
            saveBestas();
        });
        bonusTd.appendChild(bonusInp);
        tr.appendChild(bonusTd);

        // Total
        const totalTd = document.createElement('td');
        totalTd.className = 'col-total pericia-total';
        totalTd.style.cssText = `text-align:center;font-family:'Cinzel Decorative',serif;color:${color};font-size:13px;font-weight:700;`;
        totalTd.textContent = totalStr;
        tr.appendChild(totalTd);

        tbody.appendChild(tr);

        function recalcTotal() {
            const curProf = b.pericias[p.nome] || 0;
            const curBonus = parseInt(b.periciaBonus?.[p.nome] || '', 10) || 0;
            const curBase = b.attrs[p.attr] || 0;
            const ds = DICE[curProf] || '';
            totalTd.textContent = buildTotalStr(ds, curBonus, curBase);
        }
    });

    // Expose refresh function for external callers (e.g. attr input changes)
    container._skillTotalRefreshers = container._skillTotalRefreshers || {};
    periciasData.forEach(p => {
        container._skillTotalRefreshers[p.nome] = () => {
            const curProf = b.pericias[p.nome] || 0;
            const curBonus = parseInt(b.periciaBonus?.[p.nome] || '', 10) || 0;
            const curBase = b.attrs[p.attr] || 0;
            const ds = DICE[curProf] || '';
            const row = tbody.querySelector(`tr[data-skill-row="${p.nome}"]`);
            if (row) row.querySelector('.col-total').textContent = buildTotalStr(ds, curBonus, curBase);
        };
    });
    container.refreshSkillTotals = (attrKey) => {
        periciasData
            .filter(p => !attrKey || p.attr === attrKey)
            .forEach(p => container._skillTotalRefreshers[p.nome]?.());
    };
    container.refreshProfCounter = refreshCounter;

    table.appendChild(tbody);
    tableWrap.appendChild(table);
    wrap.appendChild(tableWrap);
    container.appendChild(wrap);
    refreshCounter();
}

function buildCombatHTML(b, d) {
    return `<div class="besta-section besta-combat-section">
        <div class="besta-sh">Ataques</div>
        <div class="besta-ataques-list" data-besta-ataque-list="${b.id}"></div>
        <button type="button" class="besta-add-btn" data-besta-add="ataque">
            <span class="material-symbols-outlined" style="font-size:14px">add</span> Adicionar Ataque
        </button>
        <div class="besta-sh" style="margin-top:14px">Reações Complexas</div>
        <div class="besta-reacoes-list" data-besta-reacao-list="${b.id}"></div>
        <button type="button" class="besta-add-btn" data-besta-add="reacao">
            <span class="material-symbols-outlined" style="font-size:14px">add</span> Adicionar Reação Complexa
        </button>
    </div>`;
}

function buildConditionsHTML(b) {
    return `<div class="besta-section besta-conditions-section">
        <div class="besta-sh">Condições</div>
        <div class="besta-condicoes-list" data-besta-condicao-list="${b.id}"></div>
        <button type="button" class="besta-add-btn" data-besta-add="condicao" style="margin-bottom:10px">
            <span class="material-symbols-outlined" style="font-size:14px">add</span> Condição
        </button>
        <div class="besta-sh">Bônus &amp; Ônus</div>
        <div class="besta-bonus-cards-list" data-besta-bonus-list="${b.id}"></div>
        <button type="button" class="besta-add-btn" data-besta-add="bonusOnus">
            <span class="material-symbols-outlined" style="font-size:14px">add</span> Bônus / Ônus
        </button>
    </div>`;
}

// ── DOM-based attack card (combat.js style) ─────────────────────────────────

function criarBestaCardAtaque(b, atk, instEl) {
    if (!atk.id) atk.id = uid();
    const card = document.createElement('div');
    card.className = 'combat-card combat-card--ataque';
    card.dataset.bestaAtkId = atk.id;

    card.innerHTML = `
        <div class="combat-card__header" data-action="toggle-accordion" role="button" tabindex="0" aria-expanded="false">
            <div class="combat-card__header-left">
                <input type="text" class="combat-card__name-input besta-atk-nome"
                    placeholder="Nome do Ataque" value="${escapeHtml(atk.nome||'')}" aria-label="Nome do ataque">
            </div>
            <div class="combat-card__header-summary" aria-hidden="true">
                <span data-summary="acerto">—</span>
                <span class="combat-card__summary-sep">·</span>
                <span data-summary="dano">—</span>
            </div>
            <button type="button" class="combat-card__delete-btn" title="Remover ataque" aria-label="Remover ataque">
                <span>x</span>
            </button>
            <span class="combat-card__chevron material-symbols-outlined" aria-hidden="true">expand_more</span>
        </div>
        <div class="combat-card__body" hidden>
            <div class="ataque-fields-grid">
                <div class="ataque-field-group">
                    <label class="combat-label">Acerto</label>
                    <input type="text" class="ataque-acerto combat-input besta-atk-acerto"
                        placeholder="+6" value="${escapeHtml(atk.acerto||'')}" aria-label="Bônus de acerto">
                </div>
                <div class="ataque-field-group">
                    <label class="combat-label">Dano</label>
                    <input type="text" class="combat-input ataque-dano besta-atk-dano"
                        placeholder="1d8+4" value="${escapeHtml(atk.dano||'')}" aria-label="Expressão de dano">
                </div>
                <div class="ataque-field-group">
                    <label class="combat-label">Crítico</label>
                    <input type="text" class="combat-input besta-atk-critico"
                        placeholder="20/x2" value="${escapeHtml(atk.critico||'')}" aria-label="Crítico">
                </div>
                <div class="ataque-field-group">
                    <label class="combat-label">Tipo</label>
                    <input type="text" class="combat-input besta-atk-tipo"
                        placeholder="Cortante" value="${escapeHtml(atk.tipo||'')}" aria-label="Tipo de dano">
                </div>
                <div class="ataque-field-group ataque-field-group--alcance">
                    <label class="combat-label">Alcance</label>
                    <input type="text" class="combat-input besta-atk-alcance"
                        placeholder="CaC / 30 m" value="${escapeHtml(atk.alcance||'')}" aria-label="Alcance">
                </div>
            </div>
            <div class="ataque-desc-row">
                <label class="combat-label">Notas</label>
                <textarea class="combat-textarea besta-atk-desc" rows="2"
                    placeholder="Efeitos especiais, condições, notas…">${escapeHtml(atk.desc||'')}</textarea>
            </div>
        </div>`;

    setupAccordion(card);

    const summaryAcerto = card.querySelector('[data-summary="acerto"]');
    const summaryDano   = card.querySelector('[data-summary="dano"]');
    const acertoInp     = card.querySelector('.besta-atk-acerto');
    const danoInp       = card.querySelector('.besta-atk-dano');

    function atualizarSummary() {
        summaryAcerto.textContent = acertoInp.value.trim() || '—';
        summaryDano.textContent   = danoInp.value.trim()   || '—';
    }

    function bind(sel, field) {
        const el2 = card.querySelector(sel);
        if (!el2) return;
        el2.addEventListener('input', () => { atk[field] = el2.value; atualizarSummary(); saveBestas(); });
    }
    bind('.besta-atk-nome',   'nome');
    bind('.besta-atk-acerto', 'acerto');
    bind('.besta-atk-dano',   'dano');
    bind('.besta-atk-critico','critico');
    bind('.besta-atk-tipo',   'tipo');
    bind('.besta-atk-alcance','alcance');
    bind('.besta-atk-desc',   'desc');

    card.querySelector('.combat-card__delete-btn').addEventListener('click', () => {
        const idx = b.ataques.indexOf(atk);
        if (idx !== -1) b.ataques.splice(idx, 1);
        card.remove();
        saveBestas();
    });

    atualizarSummary();
    return card;
}

// ── DOM-based bonus/ônus card (combat.js style) ──────────────────────────────

function criarBestaCardBonus(b, bo) {
    if (!bo.id) bo.id = uid();
    const card = document.createElement('div');
    card.className = 'combat-card combat-card--bonus';
    card.dataset.bonusTipo = bo.tipo || 'bonus';

    card.innerHTML = `
        <div class="combat-card__header" data-action="toggle-accordion" role="button" tabindex="0" aria-expanded="false">
            <div class="combat-card__header-left">
                <select class="bonus-tipo-select combat-select combat-select--tipo" aria-label="Tipo">
                    <option value="bonus" ${(bo.tipo||'bonus')==='bonus'?'selected':''}>Bônus</option>
                    <option value="onus"  ${(bo.tipo)==='onus'?'selected':''}>Ônus</option>
                </select>
                <input type="text" class="combat-card__name-input besta-bonus-nome"
                    placeholder="Nome do bônus / ônus" value="${escapeHtml(bo.nome||'')}" aria-label="Nome">
            </div>
            <button type="button" class="combat-card__delete-btn" title="Remover" aria-label="Remover bônus/ônus">
                <span class="material-symbols-outlined" style="font-size:16px">remove</span>
            </button>
            <span class="combat-card__chevron material-symbols-outlined" aria-hidden="true">expand_more</span>
        </div>
        <div class="combat-card__body" hidden>
            <label class="combat-label">Descrição</label>
            <textarea class="combat-textarea besta-bonus-desc" rows="2"
                placeholder="Efeito do bônus ou ônus…">${escapeHtml(bo.desc||'')}</textarea>
        </div>`;

    const tipoSel = card.querySelector('.bonus-tipo-select');
    tipoSel.addEventListener('change', () => { bo.tipo = tipoSel.value; card.dataset.bonusTipo = bo.tipo; saveBestas(); });
    card.querySelector('.besta-bonus-nome').addEventListener('input', e => { bo.nome = e.target.value; saveBestas(); });
    card.querySelector('.besta-bonus-desc').addEventListener('input', e => { bo.desc = e.target.value; saveBestas(); });

    setupAccordion(card);

    card.querySelector('.combat-card__delete-btn').addEventListener('click', () => {
        const idx = b.bonusOnus.indexOf(bo);
        if (idx !== -1) b.bonusOnus.splice(idx, 1);
        card.remove();
        saveBestas();
    });

    return card;
}

// ── DOM-based condition card (no screen effects) ─────────────────────────────

function criarBestaCardCondicao(b, cond) {
    if (!cond.id) cond.id = uid();
    const card = document.createElement('div');
    card.className = 'combat-card combat-card--condicao besta-cond-card';

    card.innerHTML = `
        <div class="condicao-header-row">
            <input type="text" class="combat-card__name-input condicao-nome besta-cond-nome"
                placeholder="Nome da Condição" value="${escapeHtml(cond.nome||'')}" aria-label="Nome da condição">
            <div class="condicao-duracao-row" role="group">
                <input type="number" class="condicao-duracao-qtd combat-input combat-input--sm besta-cond-qtd"
                    value="${cond.duracaoQtd||1}" min="1" aria-label="Duração">
                <select class="condicao-duracao-tipo combat-select combat-select--sm besta-cond-tipo"
                    aria-label="Tipo de duração">
                    <option value="rodadas"  ${(cond.duracaoTipo||'rodadas')==='rodadas'?'selected':''}>Rod.</option>
                    <option value="cenas"    ${cond.duracaoTipo==='cenas'?'selected':''}>Cena(s)</option>
                    <option value="descanso" ${cond.duracaoTipo==='descanso'?'selected':''}>Descanso</option>
                    <option value="indefinido" ${cond.duracaoTipo==='indefinido'?'selected':''}>Indefinido</option>
                </select>
                <button type="button" class="condicao-tick-btn besta-cond-tick" title="−1 na duração">
                    <span class="material-symbols-outlined" style="font-size:14px">remove</span>
                </button>
            </div>
            <button type="button" class="combat-card__delete-btn" title="Remover condição">
                <span class="material-symbols-outlined" style="font-size:16px">close</span>
            </button>
        </div>
        <textarea class="condicao-desc combat-textarea combat-textarea--sm besta-cond-desc" rows="2"
            placeholder="Efeito da condição…">${escapeHtml(cond.desc||'')}</textarea>`;

    const qtdInp  = card.querySelector('.besta-cond-qtd');
    const tipoSel = card.querySelector('.besta-cond-tipo');
    const tickBtn = card.querySelector('.besta-cond-tick');

    function syncDuracaoVis() {
        const hide = tipoSel.value === 'indefinido' || tipoSel.value === 'descanso';
        qtdInp.hidden = hide; qtdInp.disabled = hide;
        tickBtn.hidden = hide;
    }
    tipoSel.addEventListener('change', () => { cond.duracaoTipo = tipoSel.value; syncDuracaoVis(); saveBestas(); });
    qtdInp.addEventListener('input', () => { cond.duracaoQtd = parseInt(qtdInp.value,10)||1; saveBestas(); });
    card.querySelector('.besta-cond-nome').addEventListener('input', e => { cond.nome = e.target.value; saveBestas(); });
    card.querySelector('.besta-cond-desc').addEventListener('input', e => { cond.desc = e.target.value; saveBestas(); });
    syncDuracaoVis();

    tickBtn.addEventListener('click', () => {
        const val = parseInt(qtdInp.value,10)||1;
        if (val <= 1) {
            const idx = b.condicoes.indexOf(cond);
            if (idx !== -1) b.condicoes.splice(idx, 1);
            card.classList.add('combat-card--expiring');
            setTimeout(() => card.remove(), 350);
        } else {
            qtdInp.value = val - 1; cond.duracaoQtd = val - 1;
            qtdInp.classList.add('combat-input--flash');
            setTimeout(() => qtdInp.classList.remove('combat-input--flash'), 300);
        }
        saveBestas();
    });

    card.querySelector('.combat-card__delete-btn').addEventListener('click', () => {
        const idx = b.condicoes.indexOf(cond);
        if (idx !== -1) b.condicoes.splice(idx, 1);
        card.remove();
        saveBestas();
    });

    return card;
}

function criarBestaCardReacao(b, r, idx) {
    if (!r.id) r.id = uid();
    const card = document.createElement('div');
    card.className = 'combat-card combat-card--reacao';
    card.dataset.bestaReacaoId = r.id;

    card.innerHTML = `
        <div class="combat-card__header" data-action="toggle-accordion" role="button" tabindex="0" aria-expanded="false">
            <div class="combat-card__header-left">
                <input type="text" class="combat-card__name-input besta-reacao-nome"
                    placeholder="Nome da Reação" value="${escapeHtml(r.nome||'')}" aria-label="Nome da reação">
            </div>
            <button type="button" class="combat-card__delete-btn" title="Remover reação" aria-label="Remover reação">
                <span>x</span>
            </button>
            <span class="combat-card__chevron material-symbols-outlined" aria-hidden="true">expand_more</span>
        </div>
        <div class="combat-card__body" hidden>
            <label class="combat-label">Descrição</label>
            <textarea class="combat-textarea besta-reacao-desc" rows="3"
                placeholder="Descrição da reação…">${escapeHtml(r.desc||'')}</textarea>
        </div>`;

    setupAccordion(card);

    card.querySelector('.besta-reacao-nome').addEventListener('input', e => { r.nome = e.target.value; saveBestas(); });
    card.querySelector('.besta-reacao-desc').addEventListener('input', e => { r.desc = e.target.value; saveBestas(); });

    card.querySelector('.combat-card__delete-btn').addEventListener('click', () => {
        const i = b.reacoes.indexOf(r);
        if (i !== -1) b.reacoes.splice(i, 1);
        card.remove();
        saveBestas();
    });

    return card;
}


function sumBioNiveis(b) {
    const NIVEL_MAP = {I:1, II:2, III:3};
    return (b.hab.bio || []).reduce((s, h) => s + (NIVEL_MAP[h.nivel] || 1), 0);
}

function sumTreinoPt(b) {
    return (b.hab.treino || []).reduce((s, h) => s + (parseInt(h.custo, 10) || 0), 0);
}

function calcAllBestasPt() {
    return bestas.reduce((s, b) => s + sumTreinoPt(b), 0);
}

function atualizarPtBesta() {
    _bestaPtTotal = calcAllBestasPt();
    document.body.dataset.bestaPt = _bestaPtTotal;
    const anyPtInput = document.querySelector('.card-power .pt-cost-input');
    if (anyPtInput) {
        anyPtInput.dispatchEvent(new Event('input', {bubbles:true}));
    } else {
        const ptInp = document.querySelector('[data-field="pt-atual"]');
        if (ptInp) { ptInp.value = _bestaPtTotal; ptInp.dispatchEvent(new Event('input', {bubbles:true})); }
    }
    let disc = document.getElementById('besta-pt-disclaimer');
    if (_bestaPtTotal > 0) {
        if (!disc) {
            disc = document.createElement('div');
            disc.id = 'besta-pt-disclaimer';
            disc.className = 'besta-pt-disclaimer';
            const anchor = document.querySelector('.powers-container');
            if (anchor) anchor.after(disc);
        }
        disc.textContent = `\u2022 Sua Besta possui Aspectos de Treino (+${_bestaPtTotal} PT)`;
    } else if (disc) {
        disc.remove();
    }
}

function refreshBioCounter(el, b) {
    const span = el.querySelector(`[data-bio-counter="${b.id}"]`);
    if (!span) return;
    const used = sumBioNiveis(b);
    const max  = calcBioLimit(b.nivel);
    const usedEl = span.querySelector('.besta-bio-used');
    const maxEl  = span.querySelector('.besta-bio-max');
    const warnEl = span.querySelector('.besta-bio-warn');
    if (usedEl) { usedEl.textContent = used; usedEl.style.color = used > max ? 'var(--blood2)' : 'inherit'; }
    if (maxEl)  maxEl.textContent = max;
    if (warnEl) warnEl.style.display = used > max ? 'inline' : 'none';
}

function refreshTreinoCounter(el, b) {
    const span = el.querySelector(`[data-treino-counter="${b.id}"]`);
    if (!span) span;
    if (!span) return;
    span.textContent = `(${sumTreinoPt(b)} PT)`;
}

function buildBioCounter(b) {
    const used = sumBioNiveis(b);
    const max  = calcBioLimit(b.nivel);
    const over = used > max;
    return `<span class="besta-bio-inline" data-bio-counter="${b.id}"> (<span class="besta-bio-used" style="color:${over?'var(--blood2)':'inherit'}">${used}</span>/<span class="besta-bio-max">${max}</span>${over ? ' <span class="besta-bio-warn material-symbols-outlined" style="font-size:11px;vertical-align:middle">warning</span>' : '<span class="besta-bio-warn" style="display:none"></span>'})</span>`;
}

function buildAbilitiesHTML(b) {
    const bioColor   = HAB_TYPES.bio.color;
    const treinoColor = HAB_TYPES.treino.color;
    const indivColor  = HAB_TYPES.indiv.color;

    const indivCards  = (b.hab.indiv  || []).map((h,i) => buildIndivCard(h, i)).join('');

    return `<div class="besta-section besta-abilities-section">

        <div class="besta-aspect-block besta-aspect-bio" data-hab-type="bio">
            <div class="besta-aspect-header">
                <div class="besta-aspect-title" style="--aspect-color:${bioColor}">
                    <span class="besta-aspect-pip" style="background:${bioColor}"></span>
                    Aspectos Biológicos ${buildBioCounter(b)}
                </div>
            </div>
            <div class="besta-hab-list" data-besta-hab-list="bio"></div>
            <button type="button" class="besta-add-btn besta-add-hab" data-besta-add-hab="bio"
                style="border-color:${bioColor}60;color:${bioColor}">
                <span class="material-symbols-outlined" style="font-size:14px">add</span> Aspecto Biológico
            </button>
        </div>

        <div class="besta-aspect-block besta-aspect-treino" data-hab-type="treino">
            <div class="besta-aspect-header">
                <div class="besta-aspect-title" style="--aspect-color:${treinoColor}">
                    <span class="besta-aspect-pip" style="background:${treinoColor}"></span>
                    Aspectos de Treino <span class="besta-bio-inline" data-treino-counter="${b.id}">(${sumTreinoPt(b)} PT)</span>
                </div>
            </div>
            <div class="besta-hab-list" data-besta-hab-list="treino"></div>
            <button type="button" class="besta-add-btn besta-add-hab" data-besta-add-hab="treino"
                style="border-color:${treinoColor}60;color:${treinoColor}">
                <span class="material-symbols-outlined" style="font-size:14px">add</span> Aspecto de Treino
            </button>
        </div>

        <div class="besta-aspect-block besta-aspect-indiv" data-hab-type="indiv">
            <div class="besta-aspect-header">
                <div class="besta-aspect-title" style="--aspect-color:${indivColor}">
                    <span class="besta-aspect-pip" style="background:${indivColor}"></span>
                    Aspectos Individuais
                </div>
            </div>
            <div class="besta-indiv-list" data-besta-indiv-list="${b.id}">${indivCards}</div>
            <button type="button" class="besta-add-btn" data-besta-add="indiv"
                style="border-color:${indivColor}60;color:${indivColor}">
                <span class="material-symbols-outlined" style="font-size:14px">add</span> Aspecto Individual
            </button>
        </div>

    </div>`;
}

function buildIndivCard(h, i) {
    const color = HAB_TYPES.indiv.color;
    return `<div class="besta-indiv-card" data-indiv-idx="${i}" style="border-left:3px solid ${color}">
        <div class="besta-indiv-card-header">
            <input type="text" class="besta-indiv-titulo" placeholder="Título do Aspecto" value="${escapeHtml(h.titulo||'')}">
            <button type="button" class="besta-del-btn" data-besta-del="indiv" data-idx="${i}" title="Remover">
                <span class="material-symbols-outlined" style="font-size:13px">delete</span>
            </button>
        </div>
        <textarea class="besta-indiv-desc" placeholder="Descrição livre…" rows="2">${escapeHtml(h.desc||'')}</textarea>
        <div class="besta-indiv-values">
            <div class="besta-indiv-value-group">
                <label class="besta-indiv-value-label">Valor 1</label>
                <input type="text" class="besta-indiv-val1" placeholder="ex: +2 FOR" value="${escapeHtml(h.val1||'')}">
            </div>
            <div class="besta-indiv-value-group">
                <label class="besta-indiv-value-label">Valor 2</label>
                <input type="text" class="besta-indiv-val2" placeholder="ex: 1d6 fogo" value="${escapeHtml(h.val2||'')}">
            </div>
        </div>
    </div>`;
}

function indivCardDOM(h, i) {
    const tmp = document.createElement('div');
    tmp.innerHTML = buildIndivCard(h, i);
    return tmp.firstElementChild;
}

function criarBestaCardBio(b, h, instEl) {
    if (!h.id) h.id = uid();
    if (!h.nivel) h.nivel = 'I';
    const color = HAB_TYPES.bio.color;
    const card = document.createElement('div');
    card.className = 'besta-hab-card besta-hab-card--bio';
    card.style.borderLeft = `3px solid ${color}`;
    card.dataset.bestaHabBioId = h.id;

    card.innerHTML = `
        <div class="besta-hab-card-header">
            <input type="text" class="besta-hab-nome" placeholder="Nome do Aspecto" value="${escapeHtml(h.nome||'')}">
            <div class="besta-bio-nivel-group">
                ${['I','II','III'].map(n =>
                    `<button type="button" class="besta-nivel-btn${h.nivel===n?' active':''}" data-nivel="${n}">${n}</button>`
                ).join('')}
            </div>
            <button type="button" class="besta-del-btn besta-del-bio" title="Remover">
                <span class="material-symbols-outlined" style="font-size:13px">delete</span>
            </button>
        </div>
        <textarea class="besta-hab-desc" placeholder="Descrição do Aspecto Biológico…" rows="2">${escapeHtml(h.desc||'')}</textarea>`;

    card.querySelector('.besta-hab-nome').addEventListener('input', e => { h.nome = e.target.value; saveBestas(); });
    card.querySelector('.besta-hab-desc').addEventListener('input', e => { h.desc = e.target.value; saveBestas(); });

    card.querySelectorAll('.besta-nivel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            h.nivel = btn.dataset.nivel;
            card.querySelectorAll('.besta-nivel-btn').forEach(b2 => b2.classList.toggle('active', b2.dataset.nivel === h.nivel));
            saveBestas();
            if (instEl) refreshBioCounter(instEl, b);
        });
    });

    card.querySelector('.besta-del-bio').addEventListener('click', () => {
        const i = b.hab.bio.indexOf(h);
        if (i !== -1) b.hab.bio.splice(i, 1);
        card.remove();
        saveBestas();
        if (instEl) refreshBioCounter(instEl, b);
    });

    return card;
}

function criarBestaCardTreino(b, h, instEl) {
    if (!h.id) h.id = uid();
    const color = HAB_TYPES.treino.color;
    const card = document.createElement('div');
    card.className = 'besta-hab-card besta-hab-card--treino';
    card.style.borderLeft = `3px solid ${color}`;
    card.dataset.bestaHabTreinoId = h.id;

    card.innerHTML = `
        <div class="besta-hab-card-header">
            <div class="besta-treino-pt-group">
                <input type="number" class="besta-hab-custo besta-treino-pt-input" placeholder="0" value="${parseInt(h.custo,10)||0}" min="0" style="width:46px">
            </div>
            <input type="text" class="besta-hab-nome" placeholder="Nome do Poder" value="${escapeHtml(h.nome||'')}">
            <button type="button" class="besta-del-btn besta-del-treino" title="Remover">
                <span class="material-symbols-outlined" style="font-size:13px">delete</span>
            </button>
        </div>
        <textarea class="besta-hab-desc" placeholder="Descrição do Poder de Treino…" rows="2">${escapeHtml(h.desc||'')}</textarea>`;

    card.querySelector('.besta-hab-nome').addEventListener('input', e => { h.nome = e.target.value; saveBestas(); });
    card.querySelector('.besta-hab-desc').addEventListener('input', e => { h.desc = e.target.value; saveBestas(); });
    card.querySelector('.besta-treino-pt-input').addEventListener('input', e => {
        h.custo = e.target.value;
        saveBestas();
        if (instEl) refreshTreinoCounter(instEl, b);
        atualizarPtBesta();
    });

    card.querySelector('.besta-del-treino').addEventListener('click', () => {
        const i = b.hab.treino.indexOf(h);
        if (i !== -1) b.hab.treino.splice(i, 1);
        card.remove();
        saveBestas();
        if (instEl) refreshTreinoCounter(instEl, b);
        atualizarPtBesta();
    });

    return card;
}

function buildHabCard(h, key, i, color) {
    return '';
}

function buildMagiasHTML(b) {
    const expanded = b.expandMagias;
    const content = expanded ? buildMagiasContent(b) : '';
    return `<div class="besta-section besta-magias-section">
        <button type="button" class="besta-collapse-toggle" data-besta-toggle="magias">
            <span class="material-symbols-outlined" style="font-size:14px">${expanded?'expand_less':'expand_more'}</span>
            Magias (${b.magias.length})
        </button>
        <div class="besta-magias-body" style="${expanded?'':'display:none'}">${content}</div>
    </div>`;
}

function buildMagiasContent(b) {
    const searcher = `<div class="besta-searcher" data-searcher="magias">
        <input type="text" class="besta-search-input" placeholder="Buscar magia…" data-besta-search="magias">
        <button type="button" class="besta-add-btn" data-besta-add="magia">
            <span class="material-symbols-outlined" style="font-size:14px">add</span>
        </button>
        <div class="besta-dropdown" data-besta-dropdown="magias" style="display:none"></div>
    </div>`;
    const byType = {};
    b.magias.forEach(m => {
        const t = m.tipo || 'arcanismo';
        (byType[t] = byType[t] || []).push(m);
    });
    const typeSections = MAGIC_TYPES.map(t => {
        const list = byType[t] || [];
        if (!list.length) return '';
        const cards = list.map((m,i) => buildMagiaCard(m, i)).join('');
        const label = { arcanismo:'de Arcanismo', feromancia:'de Feromancia', teurgia:'de Teurgia' }[t];
        return `<div class="besta-magic-school"><div class="besta-magic-school-lbl">${label}</div>${cards}</div>`;
    }).join('');
    return `${searcher}<div class="besta-magic-list">${typeSections || '<p class="besta-empty">Nenhuma magia adicionada.</p>'}</div>`;
}

function buildMagiaCard(m, i) {
    return `<div class="besta-magia-card" data-magia-idx="${i}">
        <div class="besta-ataque-header">
            <span class="besta-magia-nome">${escapeHtml(m.nome||'—')}</span>
            <span class="besta-magia-custo">${escapeHtml(m.custo||'')}</span>
            <button type="button" class="besta-del-btn" data-besta-del="magia" data-idx="${i}">
                <span class="material-symbols-outlined" style="font-size:13px">delete</span>
            </button>
        </div>
        <p class="besta-magia-desc">${escapeHtml(m.desc||'')}</p>
    </div>`;
}

function buildInventarioHTML(b) {
    const expanded = b.expandInv;
    const content = expanded ? buildInventarioContent(b) : '';
    return `<div class="besta-section besta-inv-section">
        <button type="button" class="besta-collapse-toggle" data-besta-toggle="inventario">
            <span class="material-symbols-outlined" style="font-size:14px">${expanded?'expand_less':'expand_more'}</span>
            Inventário (${b.itens.length} itens &nbsp;|&nbsp; espaço:
            <input type="number" class="besta-inv-atual" data-besta-field="invAtual" value="${b.invAtual||0}" min="0" style="width:36px"> /
            <input type="number" class="besta-inv-max"   data-besta-field="invMax"   value="${b.invMax||0}"   min="0" style="width:36px">)
        </button>
        <div class="besta-inv-body" style="${expanded?'':'display:none'}">${content}</div>
    </div>`;
}

function buildInventarioContent(b) {
    const searcher = `<div class="besta-searcher" data-searcher="itens">
        <input type="text" class="besta-search-input" placeholder="Buscar item…" data-besta-search="itens">
        <button type="button" class="besta-add-btn" data-besta-add="item">
            <span class="material-symbols-outlined" style="font-size:14px">add</span>
        </button>
        <div class="besta-dropdown" data-besta-dropdown="itens" style="display:none"></div>
    </div>`;
    const items = b.itens.map((it,i) => `<div class="besta-item-card">
        <input type="text" class="besta-item-nome" placeholder="Nome do item" value="${escapeHtml(it.nome||'')}">
        <input type="number" class="besta-item-peso" placeholder="Peso" value="${it.peso||0}" min="0" style="width:44px">
        <input type="text" class="besta-item-desc" placeholder="Descrição" value="${escapeHtml(it.desc||'')}">
        <button type="button" class="besta-del-btn" data-besta-del="item" data-idx="${i}">
            <span class="material-symbols-outlined" style="font-size:13px">delete</span>
        </button>
    </div>`).join('');
    return `${searcher}<div class="besta-item-list">${items || '<p class="besta-empty">Nenhum item.</p>'}</div>`;
}

function buildAnotacoesHTML(b) {
    return `<div class="besta-section besta-anotacoes-section">
        <div class="notes-header" style="margin-bottom:6px">
            <span class="notes-quill">✒</span>
            <span class="notes-title">Anotações da Besta</span>
        </div>
        <textarea class="besta-anotacoes" data-besta-field="anotacoes" placeholder="Anotações livres sobre esta Besta…">${escapeHtml(b.anotacoes||'')}</textarea>
    </div>`;
}

// ── Main instance builder ──────────────────────────────────────────────────

function buildBestaHTML(b) {
    const d = derivedFor(b);
    return `
        <div class="besta-instance-toolbar">
            <h2 class="besta-instance-title">${escapeHtml(b.nome||'Nova Besta')}</h2>
            <button type="button" class="besta-remove-btn" data-besta-remove="${b.id}" title="Remover besta">
                <span class="material-symbols-outlined" style="font-size:14px">delete</span> Remover Besta
            </button>
        </div>
        ${buildIdentityHTML(b, d)}
        <div class="sh besta-sub-sh" style="margin-top:16px">Vitalidade &amp; Atributos</div>
        <div class="vitals-attrs-grid">
            ${buildVitalsHTML(b, d)}
            ${buildAttrsHTML(b, d)}
        </div>
        ${buildCombatHTML(b, d)}
        <div class="besta-sh" style="margin-top:16px">Aspectos</div>
        ${buildAbilitiesHTML(b)}
        ${buildAnotacoesHTML(b)}
        ${buildConditionsHTML(b)}
    `;
}

// ── Render & bind ──────────────────────────────────────────────────────────

function initBestaRadar(el, b) {
    const container = el.querySelector(`#besta-radar-${b.id}`);
    if (!container || typeof RadarRPG === 'undefined') return;
    const d = derivedFor(b);
    const rootStyles = getComputedStyle(document.documentElement);
    const instance = RadarRPG.create(container, {
        theme: {
            gold:         rootStyles.getPropertyValue('--gold1').trim()  || '#c4892a',
            goldLight:    rootStyles.getPropertyValue('--gold3').trim()  || '#f5d878',
            goldDim:      rootStyles.getPropertyValue('--gold0').trim()  || '#8a5e10',
            crimson:      rootStyles.getPropertyValue('--blood2').trim() || '#b52418',
            ink:          rootStyles.getPropertyValue('--ink1').trim()   || '#2a1e08',
            inkDim:       rootStyles.getPropertyValue('--ink3').trim()   || '#7a5c28',
            levelColor:   rootStyles.getPropertyValue('--blood2').trim() || '#b52418',
            parchment:    rootStyles.getPropertyValue('--p0').trim()     || '#f7ecd4',
            parchmentDark:rootStyles.getPropertyValue('--p1').trim()     || '#eedcb2',
        },
        level:  b.nivel,
        values: ATTRS.map(a => b.attrs[a] || 0),
        attrs:  ATTRS.map(a => ({ abbr: a, color: ATTR_COLORS[a] || '#7a5c28' })),
        max: 20,
        padding: 72,
        inputOffset: 46,
    });
    // Besta formula: 13 + nivel (vendor defaults to 10 + nivel)
    instance.maxPoints = 13 + b.nivel;
    instance.updateTotal();
    bestaRadars.set(b.id, instance);

    // Sync nivel changes from radar level-input → b.nivel
    const levelInp = container.querySelector('.level-input');
    if (levelInp) {
        levelInp.addEventListener('input', () => {
            const oldPmMax = derivedFor(b).pmMax;
            const wasFullPm = b.pmAtual !== 0 && b.pmAtual === oldPmMax;
            b.nivel = Math.max(1, Math.min(20, parseInt(levelInp.value,10)||1));
            instance.maxPoints = 13 + b.nivel;
            instance.updateTotal();
            const d2 = derivedFor(b);
            if (wasFullPm) { b.pmAtual = d2.pmMax; const pi = el.querySelector('[data-besta-field="pmAtual"]'); if (pi) pi.value = d2.pmMax; }
            const inertDisp = el.querySelector('.besta-inertia-display');
            if (inertDisp) inertDisp.value = d2.inertia;
            const titleInp = el.querySelector('.besta-input-title');
            if (titleInp) titleInp.value = d2.titulo;
            const pmDisp = el.querySelector('.besta-pm-max-display');
            if (pmDisp) pmDisp.value = d2.pmMax;
            updateBestaBar(b.pmAtual || 0, d2.pmMax, el.querySelector(`#besta-mana-fill-${b.id}`));
            // Refresh proficiency counter
            const sm = el.querySelector(`#besta-skills-mount-${b.id}`);
            if (sm?.refreshProfCounter) sm.refreshProfCounter();
            // Refresh bio counter
            const bioUsedEl = el.querySelector(`[data-bio-counter="${b.id}"] .besta-bio-used`);
            const bioMaxEl  = el.querySelector(`[data-bio-counter="${b.id}"] .besta-bio-max`);
            const bioWarnEl = el.querySelector(`[data-bio-counter="${b.id}"] .besta-bio-warn`);
            if (bioMaxEl) {
                const newMax = calcBioLimit(b.nivel);
                const used = (b.hab.bio || []).length;
                bioMaxEl.textContent = newMax;
                if (bioUsedEl) bioUsedEl.style.color = used > newMax ? 'var(--blood2)' : 'inherit';
                if (bioWarnEl) bioWarnEl.style.display = used > newMax ? 'inline' : 'none';
            }
            saveBestas();
        });
    }

    // Sync attr-input changes → b.attrs (inputs hold the modifier, base = 13+nivel)
    const attrInputs = container.querySelectorAll('.attr-input');
    ATTRS.forEach((a, i) => {
        const inp = attrInputs[i];
        if (!inp) return;
        inp.addEventListener('input', () => {
            const oldPmMaxPre = (a === 'CON' || a === 'CAR') ? derivedFor(b).pmMax : 0;
            const wasFullPmPre = oldPmMaxPre !== 0 && b.pmAtual !== 0 && b.pmAtual === oldPmMaxPre;
            b.attrs[a] = parseInt(inp.value, 10) || 0;
            // Update defesa when DES changes
            if (a === 'DES') {
                const d2 = derivedFor(b);
                const defField = el.querySelector('[data-besta-field="defesa"]');
                if (defField) defField.value = d2.defesa;
            }
            // Update PM when CON or CAR changes
            if (a === 'CON' || a === 'CAR') {
                const d2 = derivedFor(b);
                const wasFullPm2 = wasFullPmPre;
                if (wasFullPm2) { b.pmAtual = d2.pmMax; const pi2 = el.querySelector('[data-besta-field="pmAtual"]'); if (pi2) pi2.value = d2.pmMax; }
                const pmDisp = el.querySelector('.besta-pm-max-display');
                if (pmDisp) pmDisp.value = d2.pmMax;
                updateBestaBar(b.pmAtual || 0, d2.pmMax, el.querySelector(`#besta-mana-fill-${b.id}`));
            }
            // Refresh skill totals that depend on this attribute
            const sm = el.querySelector(`#besta-skills-mount-${b.id}`);
            if (sm?.refreshSkillTotals) sm.refreshSkillTotals(a);
            saveBestas();
        });
    });
}

function refreshBestaRadar(el, b) {
    const instance = bestaRadars.get(b.id);
    if (!instance) return;
    ATTRS.forEach((a, i) => { instance.values[i] = b.attrs[a] || 0; });
    instance.draw();
    instance.updateTotal();
    const container = el.querySelector(`#besta-radar-${b.id}`);
    if (!container) return;
    const inputs = container.querySelectorAll('.attr-input');
    ATTRS.forEach((a, i) => { if (inputs[i]) inputs[i].value = b.attrs[a] || 0; });
}

function renderBestaInstance(b, container) {
    const old = container.querySelector(`[data-besta-id="${b.id}"]`);
    const el = document.createElement('div');
    el.className = 'besta-instance';
    el.dataset.bestaId = b.id;
    el.innerHTML = buildBestaHTML(b);
    if (old) container.replaceChild(el, old);
    else container.insertBefore(el, container.querySelector('.besta-add-bar'));
    // Inject DOM-built skills section into its mount point
    const skillsMount = el.querySelector(`#besta-skills-mount-${b.id}`);
    if (skillsMount) buildSkillsSection(b, derivedFor(b), skillsMount);
    // Populate DOM-based combat cards
    const bioList = el.querySelector('[data-besta-hab-list="bio"]');
    if (bioList) { bioList.innerHTML = ''; b.hab.bio.forEach(h => bioList.appendChild(criarBestaCardBio(b, h, el))); }
    const treinoList = el.querySelector('[data-besta-hab-list="treino"]');
    if (treinoList) { treinoList.innerHTML = ''; b.hab.treino.forEach(h => treinoList.appendChild(criarBestaCardTreino(b, h, el))); }
    const ataqueList = el.querySelector(`[data-besta-ataque-list="${b.id}"]`);
    if (ataqueList) b.ataques.forEach(a => ataqueList.appendChild(criarBestaCardAtaque(b, a, el)));
    const reacaoList = el.querySelector(`[data-besta-reacao-list="${b.id}"]`);
    if (reacaoList) b.reacoes.forEach(r => reacaoList.appendChild(criarBestaCardReacao(b, r)));
    const bonusList = el.querySelector(`[data-besta-bonus-list="${b.id}"]`);
    if (bonusList) b.bonusOnus.forEach(bo => bonusList.appendChild(criarBestaCardBonus(b, bo)));
    const condList = el.querySelector(`[data-besta-condicao-list="${b.id}"]`);
    if (condList) b.condicoes.forEach(c => condList.appendChild(criarBestaCardCondicao(b, c)));
    bindBestaEvents(el, b);
    initBestaRadar(el, b);
    bindBestaVitalToggles(el, b);
    updateBestaBar(b.pmAtual || 0, derivedFor(b).pmMax, el.querySelector(`#besta-mana-fill-${b.id}`));
}

function renderAllBestas(container) {
    const addBar = container.querySelector('.besta-add-bar');
    container.querySelectorAll('.besta-instance').forEach(el => el.remove());
    bestas.forEach(b => renderBestaInstance(b, container));
    if (!addBar) {
        const bar = document.createElement('div');
        bar.className = 'besta-add-bar';
        bar.innerHTML = `<button type="button" class="besta-add-new-btn" id="besta-add-new">
            <span class="material-symbols-outlined" style="font-size:15px">add</span> Adicionar Nova Besta
        </button>`;
        container.appendChild(bar);
        bar.querySelector('#besta-add-new').addEventListener('click', () => {
            const nb = newBesta();
            bestas.push(nb);
            saveBestas();
            renderBestaInstance(nb, container);
        });
    }
}

function refreshBestaDisplay(el, b) {
    const d = derivedFor(b);
    const titleInput = el.querySelector('.besta-input-title');
    if (titleInput) titleInput.value = d.titulo;
    const pmDisp = el.querySelector('.besta-pm-max-display');
    if (pmDisp) pmDisp.value = d.pmMax;
    const inertDisp = el.querySelector('.besta-inertia-display');
    if (inertDisp) inertDisp.value = d.inertia;
    const instTitle = el.querySelector('.besta-instance-title');
    if (instTitle) instTitle.textContent = b.nome || 'Nova Besta';
    const indivFs = el.querySelector('.besta-indiv-fs');
    if (indivFs) indivFs.style.display = d.n >= 5 ? '' : 'none';
    const defField = el.querySelector('[data-besta-field="defesa"]');
    if (defField) defField.value = d.defesa;
    updateBestaBar(b.pmAtual || 0, d.pmMax, el.querySelector(`#besta-mana-fill-${b.id}`));
    refreshBestaRadar(el, b);
}

// ── Event binding ──────────────────────────────────────────────────────────

function bindBestaEvents(el, b) {
    el.addEventListener('input', e => {
        const t = e.target;
        const field = t.dataset.bestaField;

        if (field) {
            if (field === 'nome') b.nome = t.value;
            else if (field === 'tamanho') b.tamanho = t.value;
            else if (field === 'individualidade') b.individualidade = t.value;
            else if (field === 'retrato') {
                b.retrato = t.value.trim();
                const img      = el.querySelector(`#besta-img-${b.id}`);
                const ph       = el.querySelector(`#besta-ph-${b.id}`);
                const clearBtn = el.querySelector('[data-besta-clear-portrait]');
                if (!img) return;
                if (b.retrato) {
                    img.onload  = () => { img.style.display = 'block'; if (ph) ph.style.display = 'none'; if (clearBtn) clearBtn.style.display = 'inline-flex'; };
                    img.onerror = () => { img.style.display = 'none';  if (ph) ph.style.display = 'flex'; if (clearBtn) clearBtn.style.display = 'none'; };
                    img.src = b.retrato;
                } else {
                    img.src = ''; img.style.display = 'none';
                    if (ph) ph.style.display = 'flex';
                    const urlInp2 = ph?.querySelector('[data-besta-field="retrato"]');
                    if (urlInp2) urlInp2.value = '';
                    if (clearBtn) clearBtn.style.display = 'none';
                }
            }
            else if (['pmAtual','pmTempAtual','pmTempMax','rd','deslocamento','anotacoes','invAtual','invMax'].includes(field)) {
                b[field] = field === 'anotacoes' ? t.value : (parseFloat(t.value)||0);
                if (field === 'pmTempAtual' || field === 'pmTempMax') {
                    updateBestaBar(b.pmTempAtual||0, b.pmTempMax||0, el.querySelector(`#besta-mana-temp-fill-${b.id}`));
                }
            }
            else if (['defesaTipo1','defesaTipo2','rdTipo1','rdTipo2'].includes(field)) { b[field] = t.value; }
            else if (['defesaVal1','defesaVal2','rdVal1','rdVal2'].includes(field)) { b[field] = parseFloat(t.value)||0; }
            refreshBestaDisplay(el, b);
            saveBestas();
            return;
        }

        const attrKey = t.dataset.bestaAttr;
        if (attrKey) {
            b.attrs[attrKey] = parseInt(t.value,10)||0;
            refreshBestaDisplay(el, b);
            const sm2 = el.querySelector(`#besta-skills-mount-${b.id}`);
            if (sm2?.refreshSkillTotals) sm2.refreshSkillTotals(attrKey);
            saveBestas();
            return;
        }

        const deslLabelIdx = t.dataset.bestaDesllabel;
        if (deslLabelIdx !== undefined) {
            b.deslocExtra[parseInt(deslLabelIdx,10)].label = t.value;
            saveBestas(); return;
        }
        const deslValIdx = t.dataset.bestaDesval;
        if (deslValIdx !== undefined) {
            b.deslocExtra[parseInt(deslValIdx,10)].val = t.value;
            saveBestas(); return;
        }

        // besta-reacao handled by card closures
        const habCard = t.closest('.besta-hab-card');
        if (habCard) {
            const htype = habCard.dataset.habType;
            const idx   = parseInt(habCard.dataset.habIdx,10);
            if (!isNaN(idx) && b.hab[htype]?.[idx]) {
                if (t.classList.contains('besta-hab-nome'))  b.hab[htype][idx].nome  = t.value;
                if (t.classList.contains('besta-hab-custo')) b.hab[htype][idx].custo = t.value;
                if (t.classList.contains('besta-hab-desc'))  b.hab[htype][idx].desc  = t.value;
                saveBestas();
            } return;
        }
        const indivCard = t.closest('.besta-indiv-card');
        if (indivCard) {
            const idx = parseInt(indivCard.dataset.indivIdx, 10);
            if (!isNaN(idx) && b.hab.indiv[idx]) {
                if (t.classList.contains('besta-indiv-titulo')) b.hab.indiv[idx].titulo = t.value;
                if (t.classList.contains('besta-indiv-desc'))   b.hab.indiv[idx].desc   = t.value;
                if (t.classList.contains('besta-indiv-val1'))   b.hab.indiv[idx].val1   = t.value;
                if (t.classList.contains('besta-indiv-val2'))   b.hab.indiv[idx].val2   = t.value;
                saveBestas();
            } return;
        }
    });

    el.addEventListener('click', e => {
        const t = e.target.closest('[data-besta-add],[data-besta-del],[data-besta-del-hab],[data-besta-add-hab],[data-besta-toggle],[data-besta-remove],[data-besta-clear-portrait]');
        if (!t) return;
        const container = el.closest('#tab-besta');

        if (t.dataset.bestaAdd) {
            const type = t.dataset.bestaAdd;
            if (type === 'ataque') {
                const atk = {id:uid(), nome:'', acerto:'', dano:'', critico:'', tipo:'', alcance:'', desc:''};
                b.ataques.push(atk);
                saveBestas();
                const list = el.querySelector(`[data-besta-ataque-list="${b.id}"]`);
                if (list) list.appendChild(criarBestaCardAtaque(b, atk, el));
                return;
            }
            if (type === 'condicao') {
                const cond = {id:uid(), nome:'', desc:'', duracaoQtd:1, duracaoTipo:'rodadas'};
                b.condicoes.push(cond);
                saveBestas();
                const list = el.querySelector(`[data-besta-condicao-list="${b.id}"]`);
                if (list) list.appendChild(criarBestaCardCondicao(b, cond));
                return;
            }
            if (type === 'bonusOnus') {
                const bo = {id:uid(), tipo:'bonus', nome:'', desc:''};
                b.bonusOnus.push(bo);
                saveBestas();
                const list = el.querySelector(`[data-besta-bonus-list="${b.id}"]`);
                if (list) list.appendChild(criarBestaCardBonus(b, bo));
                return;
            }
            if (type === 'reacao') {
                const r = {id:uid(), nome:'', desc:''};
                b.reacoes.push(r);
                saveBestas();
                const list = el.querySelector(`[data-besta-reacao-list="${b.id}"]`);
                if (list) list.appendChild(criarBestaCardReacao(b, r));
                return;
            }
            if (type === 'indiv') {
                if (!b.hab.indiv) b.hab.indiv = [];
                const h = {titulo:'', desc:'', val1:'', val2:''};
                b.hab.indiv.push(h);
                saveBestas();
                const list = el.querySelector(`[data-besta-indiv-list="${b.id}"]`);
                if (list) list.appendChild(indivCardDOM(h, b.hab.indiv.length - 1));
                return;
            }
            saveBestas();
            renderBestaInstance(b, container);
            return;
        }

        if (t.dataset.bestaAddHab) {
            const key = t.dataset.bestaAddHab;
            if (key === 'bio') {
                const h = {id:uid(), nome:'', nivel:'I', desc:''};
                b.hab.bio.push(h);
                saveBestas();
                const list = el.querySelector('[data-besta-hab-list="bio"]');
                if (list) list.appendChild(criarBestaCardBio(b, h, el));
                refreshBioCounter(el, b);
            } else if (key === 'treino') {
                const h = {id:uid(), nome:'', custo:'0', desc:''};
                b.hab.treino.push(h);
                saveBestas();
                const list = el.querySelector('[data-besta-hab-list="treino"]');
                if (list) list.appendChild(criarBestaCardTreino(b, h, el));
                refreshTreinoCounter(el, b);
                atualizarPtBesta();
            }
            return;
        }


        if (t.dataset.bestaDel) {
            const type = t.dataset.bestaDel;
            const idx  = parseInt(t.dataset.idx,10);
            if (type === 'indiv') {
                b.hab.indiv.splice(idx,1);
                saveBestas();
                const list = el.querySelector(`[data-besta-indiv-list="${b.id}"]`);
                if (list) {
                    list.innerHTML = '';
                    (b.hab.indiv || []).forEach((h2, i2) => list.appendChild(indivCardDOM(h2, i2)));
                }
            }
            return;
        }

        if (t.dataset.bestaToggle) {
            const target = t.dataset.bestaToggle;
            if (target === 'magias')     { b.expandMagias    = !b.expandMagias; }
            if (target === 'inventario') { b.expandInv        = !b.expandInv; }
            if (target === 'skills')     { b.expandSkills     = !b.expandSkills; }
            saveBestas();
            renderBestaInstance(b, container);
            return;
        }

        if (t.dataset.bestaRemove) {
            if (!confirm('Remover esta Besta permanentemente?')) return;
            const removeId = t.dataset.bestaRemove;
            bestaRadars.delete(removeId);
            bestas = bestas.filter(x => x.id !== removeId);
            saveBestas();
            el.remove();
            return;
        }

        if (t.dataset.bestaClearPortrait) {
            b.retrato = '';
            const img = el.querySelector(`#besta-img-${b.id}`);
            const ph  = el.querySelector(`#besta-ph-${b.id}`);
            if (img) { img.src = ''; img.style.display = 'none'; }
            if (ph)  { ph.style.display = 'flex'; const u = ph.querySelector('[data-besta-field="retrato"]'); if (u) u.value = ''; }
            t.style.display = 'none';
            saveBestas();
            return;
        }
    });

    setupBestaSearchers(el, b);
}

// ── PM Temp toggle ─────────────────────────────────────────────────────────

function bindBestaVitalToggles(el, b) {
    el.querySelector(`[data-besta-pm-temp="${b.id}"]`)?.addEventListener('click', function() {
        const wrapper = el.querySelector(`#besta-pm-temp-${b.id}`);
        if (wrapper) {
            wrapper.classList.toggle('open');
            this.classList.toggle('active');
            updateBestaBar(
                b.pmTempAtual || 0,
                b.pmTempMax   || 0,
                el.querySelector(`#besta-mana-temp-fill-${b.id}`)
            );
        }
    });
}

// ── Autocomplete searchers ─────────────────────────────────────────────────

function setupBestaSearchers(el, b) {
    const container = el.closest('#tab-besta');

    const magiaInput = el.querySelector('[data-besta-search="magias"]');
    if (magiaInput) {
        createAutocomplete({
            input: magiaInput,
            containerSelector: '[data-searcher="magias"]',
            dropdownClass: 'besta-dropdown besta-dropdown--open',
            itemClass: 'besta-dd-item',
            activeClass: 'besta-dd-item--active',
            getItems: () => magiasLoader.getData(),
            filterFn: (item, q) => normalizar(item.nome).includes(q) || normalizar(item.tipo||'').includes(q),
            renderItem: item => `<strong>${escapeHtml(item.nome)}</strong><span style="font-size:9px;opacity:.7"> ${escapeHtml(item.tipo||'')}</span>`,
            onSelect: item => {
                b.magias.push({ nome: item.nome, tipo: item.tipo||'arcanismo', custo: item.custo||'', desc: item.descricao||'' });
                saveBestas();
                renderBestaInstance(b, container);
            },
            maxResults: 8,
        });
    }

    const treino = el.querySelector('[data-hab-search="treino"]');
    if (treino) {
        createAutocomplete({
            input: treino,
            containerSelector: '[data-hab-searcher="treino"]',
            dropdownClass: 'besta-dropdown besta-dropdown--open',
            itemClass: 'besta-dd-item',
            activeClass: 'besta-dd-item--active',
            getItems: () => poderesLoader.getData().filter(p => p.deBesta),
            filterFn: (item, q) => normalizar(item.nome).includes(q),
            renderItem: item => `<strong>${escapeHtml(item.nome)}</strong><span style="font-size:9px;opacity:.7"> PT:${item.ptCost}</span>`,
            onSelect: item => {
                b.hab.treino.push({ nome: item.nome, custo: `${item.ptCost} PT${item.otherCosts?' / '+item.otherCosts:''}`, desc: item.descricao||'' });
                saveBestas();
                renderBestaInstance(b, container);
            },
            maxResults: 8,
        });
    }
}

// ── Init ───────────────────────────────────────────────────────────────────

export async function initBesta() {
    const tabPage = document.getElementById('tab-besta');
    if (!tabPage) return;

    tabPage.innerHTML = '<div class="besta-tab-root"></div>';
    const root = tabPage.querySelector('.besta-tab-root');

    loadBestas();

    await Promise.all([
        poderesLoader.load(),
        magiasLoader.load(),
    ]);

    renderAllBestas(root);
    checkBestaTabVisibility();

    document.querySelector('[data-field="classe-nome"]')?.addEventListener('input', checkBestaTabVisibility);
    document.querySelector('[data-field="besta-nome"]')?.addEventListener('input', checkBestaTabVisibility);

    // Atualiza o campo Vínculo em todas as instâncias quando o nome do personagem muda
    document.querySelector('[data-field="personagem-nome"]')?.addEventListener('input', () => {
        const nome = getOwnerName();
        document.querySelectorAll('#tab-besta .besta-vinculo-input').forEach(inp => {
            inp.value = nome;
        });
    });

    console.log('[Besta] Inicializado —', bestas.length, 'besta(s) carregada(s)');
}

export function getBestasState() {
    return JSON.parse(JSON.stringify(bestas));
}

export function setBestasState(data) {
    if (!Array.isArray(data)) return;
    bestas.length = 0;
    data.forEach(b => bestas.push(b));
    const root = document.querySelector('.besta-tab-root');
    if (root) renderAllBestas(root);
    checkBestaTabVisibility();
}
