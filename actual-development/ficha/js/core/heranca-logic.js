import { HERANCA_DATA, HIERARQUIA_ORDEM } from '../config/herancas.js';
import { getNivel, getRadarAttrWrap, adjustRadarMaxPoints } from './radar-service.js';
import { autoCalcEnabled } from './state.js';

// ── Estado de bônus aplicado ──────────────────────────────────────────────────

export let herancaAttrBonusAplicado = { FOR: 0, DES: 0, CON: 0, INT: 0, SAB: 0, CAR: 0 };

/**
 * Flag explícita: indica se o bônus de Aprendizado de Vida já foi somado
 * aos atributos do personagem E ainda está correto para a herança atual.
 *
 * Enquanto true, atualizarHeranca() retorna antecipadamente sem modificar
 * os atributos — impedindo que o bônus seja somado novamente ao recarregar
 * a ficha (o save já contém os atributos com o bônus incluído).
 *
 * Ciclo de vida:
 *  • Ativada (true)  → quando aplicarNovoBonus() ou aplicarBonusPorEscolha()
 *                       efetivamente somam o bônus no DOM.
 *  • Desativada (false) → quando removerBonusAtuais() remove o bônus do DOM
 *                         (ocorre ao trocar herança ou desmarcar o checkbox).
 *  • Restaurada do save  → setBonusAprendizadoRestaurado() em deserializeSheet.
 */
let _bonusAprendizadoFlag = false;

/**
 * Chave (lowercase) da herança que estava ativa quando o bônus foi aplicado.
 * Usada para invalidar a flag quando a herança muda.
 */
let _herancaNomeAplicado = '';

// ── Exportações de estado de flag ─────────────────────────────────────────────

/** Retorna o valor atual da flag (para serialização). */
export function getBonusAprendizadoFlag() { return _bonusAprendizadoFlag; }

/**
 * Restaura a flag a partir dos dados do save.
 *
 * Aceita `flagVal` explícito (saves novos com bonusAprendizadoFlag) ou
 * inferência via `fields` (saves antigos sem o campo, mas com herança e
 * checkbox corretos no Firestore — retrocompatibilidade total).
 *
 * Também sincroniza herancaAttrBonusAplicado imediatamente, para que
 * removerBonusAtuais() funcione corretamente caso o usuário troque de
 * herança antes de atualizarHeranca() ter rodado pela primeira vez.
 *
 * @param {boolean|undefined} flagVal  - Valor salvo da flag (ou undefined para inferir)
 * @param {Object}            fields   - data.fields do save (para inferência e herança-nome)
 */
export function setBonusAprendizadoRestaurado(flagVal, fields) {
    // Determina o valor da flag: explícito no save, ou inferido dos campos
    const ativo = (flagVal !== undefined && flagVal !== null)
        ? !!flagVal
        : inferHerancaBonusFromFields(fields) !== null;

    _bonusAprendizadoFlag = ativo;
    _herancaNomeAplicado  = ativo
        ? String(fields?.['heranca-nome'] || '').trim().toLowerCase()
        : '';

    if (ativo) {
        // Sincroniza herancaAttrBonusAplicado via inferência para que
        // removerBonusAtuais() saiba o que desfazer em mudanças futuras.
        const bonus = inferHerancaBonusFromFields(fields);
        setHerancaAttrBonusAplicado(bonus);
    }
}

/**
 * Restaura herancaAttrBonusAplicado a partir de um objeto de bônus explícito.
 * Mantido para retrocompatibilidade e uso interno.
 */
export function setHerancaAttrBonusAplicado(obj) {
    herancaAttrBonusAplicado = { FOR: 0, DES: 0, CON: 0, INT: 0, SAB: 0, CAR: 0 };
    if (obj && typeof obj === 'object') {
        Object.keys(herancaAttrBonusAplicado).forEach(k => {
            if (obj[k] != null) herancaAttrBonusAplicado[k] = Number(obj[k]) || 0;
        });
    }
}

/**
 * Infere o bônus de Aprendizado de Vida a partir dos campos brutos salvos
 * (data.fields), sem precisar que herancaAttrBonus exista no save.
 * Usado para retrocompatibilidade com saves anteriores ao fix.
 *
 * @param {Object} fields - Objeto data.fields do save
 * @returns {Object|null} Mapa atributo → delta, ou null se sem bônus
 */
export function inferHerancaBonusFromFields(fields) {
    if (!fields) return null;
    if (!fields['aprendizadoDaVida']) return null;

    const herancaNome = String(fields['heranca-nome'] || '').trim().toLowerCase();
    const data = HERANCA_DATA[herancaNome];
    if (!data) return null;

    if (data.bonus.type === 'fixed') {
        return { [data.bonus.attr]: data.bonus.value };
    }
    if (data.bonus.type === 'choice') {
        const chosen = fields['aprendizadoEscolha'];
        if (chosen) return { [chosen]: 1 };
        if (data.bonus.choices?.length) return { [data.bonus.choices[0]]: 1 };
    }
    return null;
}

/**
 * Sincroniza herancaAttrBonusAplicado com o bônus esperado para `chave`,
 * SEM modificar o DOM. Garante que removerBonusAtuais() funcione
 * corretamente numa futura chamada (ex.: troca de herança após reload).
 */
function _syncHerancaAttrBonus(chave) {
    herancaAttrBonusAplicado = { FOR: 0, DES: 0, CON: 0, INT: 0, SAB: 0, CAR: 0 };
    const data = HERANCA_DATA[chave];
    if (!data) return;
    if (data.bonus.type === 'fixed') {
        herancaAttrBonusAplicado[data.bonus.attr] = data.bonus.value;
    } else if (data.bonus.type === 'choice' && currentChoiceValue) {
        herancaAttrBonusAplicado[currentChoiceValue] = 1;
    }
}

// ── Lazy DOM references ───────────────────────────────────────────────────────

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

// ── Funções de atributo ───────────────────────────────────────────────────────

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
    // Limpa a flag: o bônus foi removido do DOM, próxima chamada deve reaplicar
    _bonusAprendizadoFlag = false;
    _herancaNomeAplicado  = '';
}

// ── Escolha de atributo (heranças tipo 'choice') ──────────────────────────────

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
    // Ativa a flag: bônus somado ao DOM
    _bonusAprendizadoFlag = true;
    _herancaNomeAplicado  = (document.querySelector('[data-field="heranca-nome"]')?.value || '').trim().toLowerCase();
    return true;
}

// ── Aplicação do bônus ────────────────────────────────────────────────────────

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
        // Ativa a flag: bônus somado ao DOM
        _bonusAprendizadoFlag = true;
        _herancaNomeAplicado  = chave;
        return true;
    }

    if (data.bonus.type === 'choice') {
        const select = inicializarSelectEscolha(data);
        if (!select) return false;

        if (!currentChoiceValue && select.options.length) {
            // Prefere o valor já restaurado pelo deserialize; cai para a primeira opção
            // somente se o select ainda não tiver um valor válido selecionado.
            currentChoiceValue = select.value || select.options[0].value;
            select.value = currentChoiceValue;
        }
        // Nota: aplicarBonusPorEscolha() ativa a flag internamente
        return aplicarBonusPorEscolha(currentChoiceValue);
    }
    return false;
}

// ── Checkboxes / Fortuna ──────────────────────────────────────────────────────

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

// ── Ponto de entrada principal ────────────────────────────────────────────────

export function atualizarHeranca() {
    if (!autoCalcEnabled) return;
    limitarCheckboxes();
    atualizarFortuna();

    const herancaNome      = (document.querySelector('[data-field="heranca-nome"]')?.value || '').trim();
    const chave            = herancaNome.toLowerCase();
    const checkAprendizado = getCheckAprendizado();
    const aprendizadoAtivo = checkAprendizado?.checked;

    // ── VERIFICAÇÃO DA FLAG ───────────────────────────────────────────────────
    // Se a flag indica que o bônus já foi somado para ESTA herança específica
    // e o checkbox ainda está marcado, o DOM já contém os valores corretos.
    // Saída antecipada: não remover nem somar novamente — sem empilhamento.
    //
    // Também sincroniza herancaAttrBonusAplicado (sem tocar no DOM) para que
    // removerBonusAtuais() funcione corretamente numa troca de herança futura.
    if (_bonusAprendizadoFlag && aprendizadoAtivo && chave && chave === _herancaNomeAplicado) {
        _syncHerancaAttrBonus(chave);
        // Para heranças tipo 'choice': mantém o container de seleção visível
        const data = HERANCA_DATA[chave];
        if (data?.bonus.type === 'choice') inicializarSelectEscolha(data);
        _dispararPoderHeranca();
        return; // DOM intocado — bônus já estava correto
    }

    // ── CICLO NORMAL ──────────────────────────────────────────────────────────
    // Remove o bônus anterior (se houver) e reaplica conforme estado atual.
    // Ocorre quando: herança mudou, checkbox foi alterado, ou primeira aplicação.
    removerBonusAtuais();
    aplicarNovoBonus();
    _dispararPoderHeranca();
}
