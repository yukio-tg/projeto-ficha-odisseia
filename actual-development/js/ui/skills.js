import { getNivel, getRadarAttrWrap } from '../core/radar-service.js';
import { autoCalcEnabled } from '../core/state.js';
import { atualizarInertidao, calcStats } from '../core/calculation.js';
let afterSkillsUpdate = null;
export function setAfterSkillsUpdate(fn) {
    afterSkillsUpdate = fn;
}

// Dados das perícias
export const periciasData = [
    { nome: "Lutar", attr: "FOR", desc: "Representa sua habilidade em combate corpo-a-corpo, capacidade de desferir golpes precisos ou se defender." },
    { nome: "Trabalho", attr: "FOR", desc: "Representa sua habilidade em esforçar-se fisicamente, capacidade de entregar força explosiva e aplicar tensão nos músculos." },
    { nome: "Esforço", attr: "CON", desc: "Representa sua fortitude e saúde, capacidade de se manter vivo contra doenças e em situações inóspitas." },
    { nome: "Acrobacia", attr: "DES", desc: "Representa sua habilidade em se movimentar e elasticidade corporal, capacidade de entregar saltos ou realizar performances corporais." },
    { nome: "Atirar", attr: "DES", desc: "Representa sua mira, capacidade de arremesso ou disparos à longa distância." },
    { nome: "Quietude", attr: "DES", desc: "Representa sua habilidade de ser imperceptível, capacidade de ser furtivo e realizar surpresas." },
    { nome: "Reflexos", attr: "DES", desc: "Representa sua agilidade mental, capacidade de desviar e preparação." },
    { nome: "Ameaçar", attr: "CAR", desc: "Representa sua habilidade de intimidar, capacidade de se mostrar mais forte e forçar outras pessoas sob sua vontade." },
    { nome: "Convencer", attr: "CAR", desc: "Representa sua persuasividade, capacidade de convencer outros e diplomacia." },
    { nome: "Mentir", attr: "CAR", desc: "Representa sua habilidade de enganar, capacidade de falsificar e ser dissimulado." },
    { nome: "Cuidar", attr: "INT", desc: "Representa suas habilidades médicas, sua capacidade de tratar ferimentos e oferecer diagnósticos." },
    { nome: "Cultura", attr: "INT", desc: "Representa seus conhecimentos gerais sobre o mundo, capacidade de entender relações entre países, curiosidades e outras ciências." },
    { nome: "Engenhosidade", attr: "INT", desc: "Representa sua habilidade de engenharia, sua capacidade de reparar, criar e desconstruir construtos." },
    { nome: "Perspicácia", attr: "INT", desc: "Representa sua atenção, sua capacidade de perceber intenções e investigação." },
    { nome: "Magia", attr: "SAB", desc: "Representa sua habilidade mágica, conhecimentos da Mana e sua afinidade com a mesma." },
    { nome: "Poder", attr: "SAB", desc: "Representa sua força de vontade, sua capacidade de reafirmação e seu ego." }
];

export const attrColors = {
    FOR: '#b52418', DES: '#4a7cb5', CON: '#d4620a', INT: '#d4a800', SAB: '#3a8a5c', CAR: '#8a4ab5'
};

const diceLabels = ['—', '1d4', '1d6', '1d8', '1d10', '1d12'];

export const periciasEstado = periciasData.map((p, idx) => ({
    ...p,
    proficiencia: 0,
    bonus: "",
    idx
}));

export function renderizarTabelaPericias() {
    const tbody = document.getElementById('skill-tbody');
    tbody.innerHTML = '';

    periciasEstado.forEach(pericia => {
        const attrColor = attrColors[pericia.attr] || '#7a5c28';

        const tr = document.createElement('tr');
        tr.dataset.idx = pericia.idx;
        tr.style.setProperty('--row-attr-color', attrColor);

        // Nome
        const nomeTd = document.createElement('td');
        nomeTd.style.cssText = 'white-space:nowrap; border-left: 2.5px solid ' + attrColor + '30;';
        const infoBtn = document.createElement('button');
        infoBtn.className = 'pericia-info-btn material-symbols-outlined';
        infoBtn.textContent = 'arrow_right';
        infoBtn.title = 'Ver descrição';
        infoBtn.type = 'button';
        infoBtn.style.color = attrColor;
        const nomeSpan = document.createElement('span');
        nomeSpan.textContent = pericia.nome;
        nomeTd.appendChild(infoBtn);
        nomeTd.appendChild(nomeSpan);
        tr.appendChild(nomeTd);

        // Atributo - badje colorido
        const attrTd = document.createElement('td');
        attrTd.style.textAlign = 'center';
        const attrBadge = document.createElement('span');
        attrBadge.textContent = pericia.attr;
        attrBadge.style.cssText = `
            font-family: 'Cinzel', serif;
            font-size: 8.5px;
            font-weight: 700;
            letter-spacing: .12em;
            text-transform: uppercase;
            color: ${attrColor};
            background: ${attrColor}18;
            border: 1px solid ${attrColor}55;
            border-radius: 3px;
            padding: 1px 4px;
            display: inline-block;
        `;
        attrTd.appendChild(attrBadge);
        tr.appendChild(attrTd);

        // Base
        const baseTd = document.createElement('td');
        baseTd.className = 'pericia-base';
        baseTd.style.textAlign = 'center';
        baseTd.textContent = '0';
        tr.appendChild(baseTd);

        // Proficiência - pips
        const profTd = document.createElement('td');
        profTd.style.textAlign = 'center';
        const pipsDiv = document.createElement('div');
        pipsDiv.className = 'prof-pips';

        for (let lvl = 0; lvl <= 5; lvl++) {
            const pip = document.createElement('button');
            pip.type = 'button';
            pip.className = 'prof-pip' + (pericia.proficiencia >= lvl && lvl > 0 ? ' active' : '');
            pip.dataset.level = lvl;
            pip.title = lvl === 0 ? 'Sem proficiência' : `Grau ${lvl} — ${diceLabels[lvl]}`;
            if (lvl === 0) pip.style.display = 'none';
            pip.addEventListener('click', () => {
                const newVal = pericia.proficiencia === lvl ? 0 : lvl;
                pericia.proficiencia = newVal;
                pipsDiv.querySelectorAll('.prof-pip').forEach(p => {
                    const pl = parseInt(p.dataset.level);
                    p.classList.toggle('active', pl > 0 && pl <= pericia.proficiencia);
                });
                labelSpan.textContent = pericia.proficiencia === 0 ? '—' : diceLabels[pericia.proficiencia];
                atualizarPericias();
            });
            pipsDiv.appendChild(pip);
        }
        const labelSpan = document.createElement('span');
        labelSpan.className = 'prof-label';
        labelSpan.textContent = pericia.proficiencia === 0 ? '—' : diceLabels[pericia.proficiencia];
        pipsDiv.appendChild(labelSpan);

        profTd.appendChild(pipsDiv);
        tr.appendChild(profTd);

        // Bônus
        const bonusTd = document.createElement('td');
        const bonusInput = document.createElement('input');
        bonusInput.type = 'text';
        bonusInput.className = 'pericia-bonus';
        bonusInput.placeholder = 'ex: +1';
        bonusInput.value = pericia.bonus;
        bonusInput.addEventListener('input', (e) => {
            pericia.bonus = e.target.value;
            atualizarPericias();
        });
        bonusTd.appendChild(bonusInput);
        tr.appendChild(bonusTd);

        // Total
        const totalTd = document.createElement('td');
        totalTd.className = 'pericia-total';
        totalTd.style.cssText = `text-align:center;font-family:'Cinzel Decorative',serif;color:${attrColor};font-size:13px;font-weight:700;`;
        totalTd.textContent = '0';
        tr.appendChild(totalTd);

        tbody.appendChild(tr);

        // Linha de descrição
        const descTr = document.createElement('tr');
        descTr.className = 'pericia-desc-row';
        descTr.style.setProperty('--row-attr-color', attrColor);
        const descTd = document.createElement('td');
        descTd.colSpan = 6;
        const descContent = document.createElement('div');
        descContent.className = 'pericia-desc-content';
        const descInner = document.createElement('div');
        descInner.className = 'pericia-desc-inner';
        descInner.style.borderLeftColor = attrColor;
        descInner.textContent = pericia.desc;
        descContent.appendChild(descInner);
        descTd.appendChild(descContent);
        descTr.appendChild(descTd);
        tbody.appendChild(descTr);

        // Toggle da descrição
        infoBtn.addEventListener('click', () => {
            const isOpen = descContent.classList.contains('open');
            descContent.classList.toggle('open', !isOpen);
            infoBtn.classList.toggle('open', !isOpen);
            infoBtn.textContent = isOpen ? 'arrow_right' : 'arrow_drop_down';
        });
    });
}

function atualizarContadorProficiencia() {
    const totalGasto = periciasEstado.reduce((sum, p) => sum + p.proficiencia, 0);
    const nivel = getNivel();
    const maxPontos = nivel;

    const gastoEl = document.getElementById('proficiencia-gasto');
    const maxEl = document.getElementById('proficiencia-max');
    const warningEl = document.getElementById('proficiencia-warning');
    const pipsPreview = document.getElementById('counter-pips-preview');

    if (gastoEl) {
        gastoEl.textContent = totalGasto;
        gastoEl.style.color = totalGasto > maxPontos ? 'var(--blood2)' : 'var(--gold3)';
    }
    if (maxEl) maxEl.textContent = maxPontos;
    if (warningEl) warningEl.style.display = totalGasto > maxPontos ? 'flex' : 'none';

    if (pipsPreview) {
        pipsPreview.innerHTML = '';
        for (let i = 0; i < maxPontos; i++) {
            const dot = document.createElement('div');
            dot.className = 'counter-pip-dot' + (i < totalGasto ? ' used' : '');
            pipsPreview.appendChild(dot);
        }
    }
}

export function atualizarPericias(force = false) {
    if (!autoCalcEnabled && !force) return;

    const radarDiv = document.getElementById('secao-radar');
    if (!radarDiv) return;

    // Obter valores e modificadores
    const valoresAttr = {};
    const modsAttr = {};
    const wraps = radarDiv.querySelectorAll('.attr-wrap');
    wraps.forEach(wrap => {
        const label = wrap.querySelector('.attr-label');
        const attrInput = wrap.querySelector('.attr-input');
        const modInput = wrap.querySelector('.mod-input');
        if (label && attrInput && modInput) {
            const attr = label.textContent;
            valoresAttr[attr] = parseInt(attrInput.value, 10) || 0;
            let modVal = 0;
            const modText = modInput.value.trim();
            const match = modText.match(/^[-+]?\d+/);
            if (match) modVal = parseInt(match[0], 10);
            modsAttr[attr] = modVal;
        }
    });

    // Atualizar Defesa (Destreza + 10)
    const defesaInput = document.querySelector('[data-field="defesa"]');
    if (defesaInput) {
        const destrezaVal = valoresAttr['DES'] || 0;
        defesaInput.value = destrezaVal + 10;
    }

    // Blocos de atributos (na aba perícias)
    const mapeamentoIds = {
        FOR: { base: 'base-for', mod: 'mod-for', total: 'total-for' },
        DES: { base: 'base-des', mod: 'mod-des', total: 'total-des' },
        CON: { base: 'base-con', mod: 'mod-con', total: 'total-con' },
        INT: { base: 'base-int', mod: 'mod-int', total: 'total-int' },
        SAB: { base: 'base-sab', mod: 'mod-sab', total: 'total-sab' },
        CAR: { base: 'base-car', mod: 'mod-car', total: 'total-car' }
    };

    for (const [attr, ids] of Object.entries(mapeamentoIds)) {
        const base = valoresAttr[attr] || 0;
        const mod = modsAttr[attr] || 0;
        const baseTotal = base + mod;
        const baseEl = document.getElementById(ids.base);
        const modEl = document.getElementById(ids.mod);
        const totalEl = document.getElementById(ids.total);
        if (baseEl) baseEl.textContent = base;
        if (modEl) modEl.textContent = (mod >= 0 ? '+' : '') + mod;
        if (totalEl) totalEl.textContent = baseTotal;
    }

    // Tabela de perícias
    const diceMap = { 0: '', 1: '1d4', 2: '1d6', 3: '1d8', 4: '1d10', 5: '1d12' };

    periciasEstado.forEach(pericia => {
        const row = document.querySelector(`#skill-tbody tr[data-idx='${pericia.idx}']`);
        if (!row) return;

        const baseAttr = valoresAttr[pericia.attr] || 0;
        const modAttr = modsAttr[pericia.attr] || 0;
        const baseTotal = baseAttr + modAttr;

        const baseCell = row.querySelector('.pericia-base');
        if (baseCell) baseCell.textContent = baseTotal;

        let bonusNum = 0;
        if (pericia.bonus) {
            const match = pericia.bonus.trim().match(/^[-+]?\d+/);
            if (match) bonusNum = parseInt(match[0], 10);
        }
        const somaBonusBase = bonusNum + baseTotal;
        const dice = diceMap[pericia.proficiencia] || '';
        let totalStr = dice;
        if (dice) {
            totalStr += somaBonusBase !== 0 ? (somaBonusBase >= 0 ? '+' : '') + somaBonusBase : '';
        } else {
            totalStr = somaBonusBase !== 0 ? (somaBonusBase >= 0 ? '+' : '') + somaBonusBase : '0';
        }

        const totalCell = row.querySelector('.pericia-total');
        if (totalCell) {
            totalCell.textContent = totalStr;
            const ac = attrColors[pericia.attr];
            if (ac) totalCell.style.color = ac;
        }

        // Opacidade para não treinadas
        if (pericia.proficiencia === 0) {
            row.classList.add('pericia-row-grau0');
        } else {
            row.classList.remove('pericia-row-grau0');
        }
    });

    // Atualiza inertidão, contador de proficiência e cálculos gerais (PV, PM, etc.)
    atualizarInertidao();
    atualizarContadorProficiencia();
    calcStats();
    if (afterSkillsUpdate) afterSkillsUpdate();
}

export function getTotalPericia(nomePericia, attrOverride = null) {
    const pericia = periciasEstado.find(p => p.nome.toLowerCase() === nomePericia.trim().toLowerCase());
    if (!pericia) return '';

    const attr = attrOverride || pericia.attr;
    const wrap = getRadarAttrWrap(attr);
    if (!wrap) return '0';
    const baseAttrInput = wrap.querySelector('.attr-input');
    const modAttrInput = wrap.querySelector('.mod-input');
    const baseAttr = baseAttrInput ? parseInt(baseAttrInput.value, 10) || 0 : 0;
    const modAttr = modAttrInput ? parseInt(modAttrInput.value, 10) || 0 : 0;
    const baseTotal = baseAttr + modAttr;

    let bonusNum = 0;
    if (pericia.bonus) {
        const match = pericia.bonus.trim().match(/^[-+]?\d+/);
        if (match) bonusNum = parseInt(match[0], 10);
    }
    const soma = bonusNum + baseTotal;
    const diceMap = { 0:'', 1:'1d4', 2:'1d6', 3:'1d8', 4:'1d10', 5:'1d12' };
    const dice = diceMap[pericia.proficiencia] || '';

    if (dice) {
        if (soma !== 0) return dice + (soma >= 0 ? '+' : '') + soma;
        else return dice;
    } else {
        return (soma >= 0 ? '+' : '') + soma;
    }
}

export function getSkillsState() {
    return periciasEstado.map(p => ({ idx: p.idx, proficiencia: p.proficiencia, bonus: p.bonus }));
}

export function setSkillsState(data) {
    if (!Array.isArray(data)) return;
    data.forEach(s => {
        const p = periciasEstado.find(x => x.idx === s.idx);
        if (p) {
            p.proficiencia = s.proficiencia || 0;
            p.bonus = s.bonus || '';
        }
    });
    renderizarTabelaPericias();
    if (autoCalcEnabled) atualizarPericias(true);
}

export function initSkills() {
    renderizarTabelaPericias();
    const radarDiv = document.getElementById('secao-radar');
    if (radarDiv) {
        radarDiv.querySelectorAll('.attr-input, .mod-input, .level-input').forEach(input => {
            input.addEventListener('input', () => {
                if (autoCalcEnabled) atualizarPericias();
            });
        });
    }
    // Atualiza uma vez na inicialização
    if (autoCalcEnabled) atualizarPericias();
}