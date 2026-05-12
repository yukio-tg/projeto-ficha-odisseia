import { HERANCA_DATA, HIERARQUIA_ORDEM } from '../config/herancas.js';
import { getNivel, getRadarAttrWrap } from './radar-service.js';
import { autoCalcEnabled } from './state.js';

export let herancaAttrBonusAplicado = { FOR:0, DES:0, CON:0, INT:0, SAB:0, CAR:0 };

const checkFortuna = document.querySelector('[data-field="aumentoDeFortuna"]');
const checkAprendizado = document.querySelector('[data-field="aprendizadoDaVida"]');
const checkHabilidade = document.querySelector('[data-field="habilidadeAdquirida"]');
const checkboxes = [checkFortuna, checkAprendizado, checkHabilidade];

function adjustRadarBaseAttribute(attr, delta) {
    const wrap = getRadarAttrWrap(attr);
    if (!wrap) return;
    const input = wrap.querySelector('.attr-input');
    if (input) {
        let val = parseInt(input.value, 10) || 0;
        val = Math.max(0, val + delta);
        input.value = val;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

export function removerBonusAtuais() {
    for (const [attr, val] of Object.entries(herancaAttrBonusAplicado)) {
        if (val !== 0) adjustRadarBaseAttribute(attr, -val);
    }
    herancaAttrBonusAplicado = { FOR:0, DES:0, CON:0, INT:0, SAB:0, CAR:0 };
}

export function aplicarNovoBonus() {
    const herancaNome = (document.querySelector('[data-field="heranca-nome"]')?.value || '').trim();
    const chave = herancaNome.toLowerCase();
    const data = HERANCA_DATA[chave];
    const aprendizadoAtivo = checkAprendizado && checkAprendizado.checked;
    if (!data || !aprendizadoAtivo) {
        const container = document.getElementById('aprendizado-escolha-container');
        if (container) container.style.display = 'none';
        return false;
    }

    let bonusObj = {};
    if (data.bonus.type === 'fixed') {
        bonusObj[data.bonus.attr] = data.bonus.value;
        const container = document.getElementById('aprendizado-escolha-container');
        if (container) container.style.display = 'none';
    } else if (data.bonus.type === 'choice') {
        const container = document.getElementById('aprendizado-escolha-container');
        const select = document.querySelector('[data-field="aprendizadoEscolha"]');
        const nota = document.getElementById('aprendizado-nota');
        if (container && select && nota) {
            container.style.display = '';
            nota.textContent = 'Escolha o atributo para receber +1 (Aprendizado da Vida):';
            select.innerHTML = '';
            data.bonus.choices.forEach(attr => {
                const opt = document.createElement('option');
                opt.value = attr;
                opt.textContent = attr + ' (+1)';
                select.appendChild(opt);
            });
            if (!select.value) return false;
            bonusObj[select.value] = 1;
        } else {
            return false;
        }
    }

    for (const [attr, val] of Object.entries(bonusObj)) {
        adjustRadarBaseAttribute(attr, val);
        herancaAttrBonusAplicado[attr] = (herancaAttrBonusAplicado[attr] || 0) + val;
    }
    return true;
}

export function limitarCheckboxes() {
    const nivel = getNivel();
    if (nivel >= 12) {
        checkboxes.forEach(cb => { if (cb) { cb.checked = true; cb.disabled = true; } });
    } else {
        checkboxes.forEach(cb => { if (cb) cb.disabled = false; });
        const marcadas = checkboxes.filter(cb => cb && cb.checked);
        if (marcadas.length > 2) {
            if (checkHabilidade && checkHabilidade.checked) checkHabilidade.checked = false;
            else if (checkAprendizado && checkAprendizado.checked) checkAprendizado.checked = false;
            else if (checkFortuna && checkFortuna.checked) checkFortuna.checked = false;
        }
    }
}

export function atualizarFortuna() {
    const herancaNome = (document.querySelector('[data-field="heranca-nome"]')?.value || '').trim();
    const chave = herancaNome.toLowerCase();
    const data = HERANCA_DATA[chave] || { hierarquia:'pobre', dinheiro:0 };
    const nivel = getNivel();

    let indiceBase = HIERARQUIA_ORDEM.indexOf(data.hierarquia);
    if (indiceBase === -1) indiceBase = 0;

    let aumento = 0;
    if (nivel >= 5) aumento++;
    if (nivel >= 13) aumento++;
    if (nivel >= 19) aumento++;
    if (checkFortuna && checkFortuna.checked) aumento++;

    const indiceFinal = Math.min(indiceBase + aumento, HIERARQUIA_ORDEM.length - 1);
    document.querySelector('[data-field="hierarquia"]').value = HIERARQUIA_ORDEM[indiceFinal];
    document.querySelector('[data-field="dinheiro"]').value = data.dinheiro;
}

export function atualizarHeranca() {
    if (!autoCalcEnabled) return;
    limitarCheckboxes();
    atualizarFortuna();
    removerBonusAtuais();
    aplicarNovoBonus();
}