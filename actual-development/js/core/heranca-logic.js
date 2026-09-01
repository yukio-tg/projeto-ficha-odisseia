import { HERANCA_DATA, HIERARQUIA_ORDEM } from '../config/herancas.js';
import { getNivel, getRadarAttrWrap, adjustRadarMaxPoints } from './radar-service.js';
import { autoCalcEnabled } from './state.js';

export let herancaAttrBonusAplicado = { FOR: 0, DES: 0, CON: 0, INT: 0, SAB: 0, CAR: 0 };

// Lazy DOM references — queried on first use, not at module load time
let _checkFortuna = null;
let _checkAprendizado = null;
let _checkHabilidade = null;
let _checkboxesCached = false;

function getCheckFortuna()    { if (!_checkboxesCached) cacheCheckboxes(); return _checkFortuna; }
function getCheckAprendizado() { if (!_checkboxesCached) cacheCheckboxes(); return _checkAprendizado; }
function getCheckHabilidade()  { if (!_checkboxesCached) cacheCheckboxes(); return _checkHabilidade; }
function getCheckboxes()       { if (!_checkboxesCached) cacheCheckboxes(); return [_checkFortuna, _checkAprendizado, _checkHabilidade]; }

function cacheCheckboxes() {
    _checkFortuna = document.querySelector('[data-field="aumentoDeFortuna"]');
    _checkAprendizado = document.querySelector('[data-field="aprendizadoDaVida"]');
    _checkHabilidade = document.querySelector('[data-field="habilidadeAdquirida"]');
    _checkboxesCached = true;
}

let currentChoiceValue = null;
// Rastreia o último nome de herança usado para calcular A$ (dinheiro).
// Só atualiza dinheiro se o nome realmente mudou.
let _lastHerancaNomeParaDinheiro = null;

function adjustRadarBaseAttribute(attr, delta) {
    const wrap = getRadarAttrWrap(attr);
    if (!wrap) return;
    const input = wrap.querySelector('.attr-input');
    if (input) {
        let val = parseInt(input.value, 10) || 0;
        val = Math.max(0, val + delta);
        input.value = val;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        // O bônus de herança aumenta o atributo E o limite máximo de pontos no radar
        adjustRadarMaxPoints(delta);
    }
}

export function removerBonusAtuais() {
    for (const [attr, val] of Object.entries(herancaAttrBonusAplicado)) {
        if (val !== 0) adjustRadarBaseAttribute(attr, -val);
    }
    herancaAttrBonusAplicado = { FOR: 0, DES: 0, CON: 0, INT: 0, SAB: 0, CAR: 0 };
}

function inicializarSelectEscolha(data) {
    let select = document.querySelector('[data-field="aprendizadoEscolha"]');
    const container = document.getElementById('aprendizado-escolha-container');
    const nota = document.getElementById('aprendizado-nota');
    if (!container || !nota) return null;

    if (!select) {
        select = document.createElement('select');
        select.setAttribute('data-field', 'aprendizadoEscolha');
        container.appendChild(select);
    }

    container.style.display = '';
    nota.textContent = 'Escolha o atributo para receber +1 (Aprendizado da Vida):';

    if (select.options.length === 0 || select.options[0]?.value !== data.bonus.choices[0]) {
        select.innerHTML = '';
        data.bonus.choices.forEach(attr => {
            const opt = document.createElement('option');
            opt.value = attr;
            opt.textContent = attr + ' (+1)';
            select.appendChild(opt);
        });
    }

    if (!select._listenerAdded) {
        select.addEventListener('change', () => {
            if (!autoCalcEnabled) return;
            const newValue = select.value;
            if (newValue && newValue !== currentChoiceValue) {
                removerBonusAtuais();
                aplicarBonusPorEscolha(newValue);
                currentChoiceValue = newValue;
            }
        });
        select._listenerAdded = true;
    }

    return select;
}

function aplicarBonusPorEscolha(attr) {
    if (!attr) return false;
    const bonusObj = { [attr]: 1 };
    for (const [attrKey, val] of Object.entries(bonusObj)) {
        adjustRadarBaseAttribute(attrKey, val);
        herancaAttrBonusAplicado[attrKey] = (herancaAttrBonusAplicado[attrKey] || 0) + val;
    }
    return true;
}

export function aplicarNovoBonus() {
    const herancaNome = (document.querySelector('[data-field="heranca-nome"]')?.value || '').trim();
    const chave = herancaNome.toLowerCase();
    const data = HERANCA_DATA[chave];
    const checkAprendizado = getCheckAprendizado();
    const aprendizadoAtivo = checkAprendizado && checkAprendizado.checked;

    if (!data || !aprendizadoAtivo) {
        const container = document.getElementById('aprendizado-escolha-container');
        if (container) container.style.display = 'none';
        return false;
    }

    if (data.bonus.type === 'fixed') {
        const bonusObj = { [data.bonus.attr]: data.bonus.value };
        for (const [attr, val] of Object.entries(bonusObj)) {
            adjustRadarBaseAttribute(attr, val);
            herancaAttrBonusAplicado[attr] = (herancaAttrBonusAplicado[attr] || 0) + val;
        }
        const container = document.getElementById('aprendizado-escolha-container');
        if (container) container.style.display = 'none';
        return true;
    }

    if (data.bonus.type === 'choice') {
        const select = inicializarSelectEscolha(data);
        if (!select) return false;

        if (!currentChoiceValue && select.options.length) {
            currentChoiceValue = select.options[0].value;
            select.value = currentChoiceValue;
        }
        return aplicarBonusPorEscolha(currentChoiceValue);
    }
    return false;
}

export function limitarCheckboxes() {
    const nivel = getNivel();
    const checkboxes = getCheckboxes();
    const checkFortuna = getCheckFortuna();
    const checkAprendizado = getCheckAprendizado();
    const checkHabilidade = getCheckHabilidade();
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
    const data = HERANCA_DATA[chave] || { hierarquia: 'pobre', dinheiro: 0 };
    const nivel = getNivel();

    let indiceBase = HIERARQUIA_ORDEM.indexOf(data.hierarquia);
    if (indiceBase === -1) indiceBase = 0;

    let aumento = 0;
    if (nivel >= 5) aumento++;
    if (nivel >= 13) aumento++;
    if (nivel >= 19) aumento++;
    const checkFortuna = getCheckFortuna();
    if (checkFortuna && checkFortuna.checked) aumento++;

    const indiceFinal = Math.min(indiceBase + aumento, HIERARQUIA_ORDEM.length - 1);
    const novaHierarquia = HIERARQUIA_ORDEM[indiceFinal];

    // Update ALL hierarquia elements (tab-geral + tab-inventário)
    document.querySelectorAll('[data-field="hierarquia"]').forEach(el => {
        if (el.value !== novaHierarquia) {
            el.value = novaHierarquia;
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });

    // Só atualiza A$ (dinheiro) se o nome da herança mudou — bônus/checkboxes/nível não devem alterá-lo
    if (herancaNome !== _lastHerancaNomeParaDinheiro) {
        _lastHerancaNomeParaDinheiro = herancaNome;
        document.querySelectorAll('[data-field="dinheiro"]').forEach(el => {
            if (el.value !== String(data.dinheiro)) {
                el.value = data.dinheiro;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    }

    document.dispatchEvent(new CustomEvent('fortuna:atualizado'));
}

function _dispararPoderHeranca() {
    const herancaNome = (document.querySelector('[data-field="heranca-nome"]')?.value || '').trim();
    const chave = herancaNome.toLowerCase();
    const data = HERANCA_DATA[chave];
    const checkHabilidade = getCheckHabilidade();
    const habilidadeAtiva = checkHabilidade && checkHabilidade.checked;

    document.dispatchEvent(new CustomEvent('heranca:atualizar-poder', {
        detail: (data && habilidadeAtiva) ? {
            nome: data.poder,
            ptCost: data.poderPt ?? 0,
            otherCosts: data.poderOtherCosts || '',
            descricao: data.poderDesc || '',
            cor: 'Verde',
        } : null
    }));
}

export function atualizarHeranca() {
    if (!autoCalcEnabled) return;
    limitarCheckboxes();
    atualizarFortuna();
    removerBonusAtuais();
    aplicarNovoBonus();
    _dispararPoderHeranca();
}