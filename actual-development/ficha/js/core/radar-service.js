export let radarInstance = null;

export function initRadar(containerId) {
    const rootStyles = getComputedStyle(document.documentElement);
    const theme = {
        gold: rootStyles.getPropertyValue('--gold1').trim() || '#c4892a',
        goldLight: rootStyles.getPropertyValue('--gold3').trim() || '#f5d878',
        goldDim: rootStyles.getPropertyValue('--gold0').trim() || '#8a5e10',
        crimson: rootStyles.getPropertyValue('--blood2').trim() || '#b52418',
        ink: rootStyles.getPropertyValue('--ink1').trim() || '#2a1e08',
        inkDim: rootStyles.getPropertyValue('--ink3').trim() || '#7a5c28',
        levelColor: rootStyles.getPropertyValue('--blood2').trim() || '#b52418',
        parchment: rootStyles.getPropertyValue('--p0').trim() || '#f7ecd4',
        parchmentDark: rootStyles.getPropertyValue('--p1').trim() || '#eedcb2',
    };
    radarInstance = RadarRPG.create(document.getElementById(containerId), {
        theme: theme,
        level: 1,
        values: [0, 0, 0, 0, 0, 0],
        padding: 72,
        inputOffset: 46,
    });
    return radarInstance;
}

export function getNivel() {
    const levelInput = document.querySelector('#secao-radar .level-input');
    return levelInput ? parseInt(levelInput.value, 10) || 1 : 1;
}

export function getAtributoBase(attr) {
    const wrap = getRadarAttrWrap(attr);
    if (!wrap) return 0;
    const input = wrap.querySelector('.attr-input');
    return input ? parseInt(input.value, 10) || 0 : 0;
}

export function setAtributoBase(attr, valor) {
    const wrap = getRadarAttrWrap(attr);
    if (!wrap) return;
    const input = wrap.querySelector('.attr-input');
    if (input) {
        input.value = valor;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

export function getRadarAttrWrap(attr) {
    const wraps = document.querySelectorAll('#secao-radar .attr-wrap');
    for (const wrap of wraps) {
        const label = wrap.querySelector('.attr-label');
        if (label && label.textContent.trim() === attr) return wrap;
    }
    return null;
}

/**
 * Atualiza as cores do radar lendo as variáveis CSS atuais.
 * Deve ser chamado sempre que o tema da ficha for alterado.
 */
export function updateRadarTheme() {
    if (!radarInstance) return;
    radarInstance.updateTheme();
}

/**
 * Ajusta o maxPoints do radarInstance em `delta` unidades.
 * Usado para refletir bônus de herança (Aprendizado da Vida) no contador.
 */
export function adjustRadarMaxPoints(delta) {
    if (!radarInstance) return;
    radarInstance.maxPoints = Math.max(0, radarInstance.maxPoints + delta);
    radarInstance.updateTotal();
}

/**
 * Copia nível e atributos já escritos nos inputs para o modelo do radar
 * e redesenha, sem disparar input/change (isso recalcularia a ficha).
 * maxPointsBonus preserva o teto do Aprendizado de Vida já salvo.
 */
export function adoptRadarInputs({ maxPointsBonus = 0 } = {}) {
    if (!radarInstance) return;
    const level = getNivel();
    radarInstance.levelVal = level;
    radarInstance.maxPoints = 10 + level + (Number(maxPointsBonus) || 0);
    radarInstance.attrs.forEach((attr, i) => {
        const wrap = getRadarAttrWrap(attr.abbr);
        if (!wrap) return;
        const raw = wrap.querySelector('.attr-input')?.value;
        const n = parseInt(raw, 10);
        if (!Number.isNaN(n)) radarInstance.values[i] = n;
        const mod = wrap.querySelector('.mod-input')?.value;
        if (mod != null) radarInstance.modValues[i] = mod;
    });
    radarInstance.draw();
    radarInstance.updateTotal();
    radarInstance.updateHexGlow();
    radarInstance.updateLegendTiers();
}

export function getAtributoTotal(attr) {
    const wrap = getRadarAttrWrap(attr);
    if (!wrap) return 0;
    const base = parseInt(wrap.querySelector('.attr-input').value, 10) || 0;
    const modStr = wrap.querySelector('.mod-input').value;
    let mod = 0;
    const match = modStr.trim().match(/^[-+]?\d+/);
    if (match) mod = parseInt(match[0], 10);
    return base + mod;
}