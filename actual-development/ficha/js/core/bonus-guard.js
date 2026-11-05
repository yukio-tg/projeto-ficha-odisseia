// Predicados puros do bônus que não pode empilhar no segundo load.
// Sem DOM: heranca-logic e item-effects consultam daqui.

/**
 * O bônus de Aprendizado de Vida já está no valor salvo desta herança.
 * atualizarHeranca sai cedo: não remove nem soma de novo.
 */
export function herancaBonusJaAplicado({
    bonusAprendizadoFlag = false,
    aprendizadoAtivo = false,
    chave = '',
    chaveAplicada = '',
} = {}) {
    return !!(bonusAprendizadoFlag && aprendizadoAtivo && chave && chave === chaveAplicada);
}

/**
 * Recalc de proteção não roda durante a hidratação (o visível já é o salvo,
 * com ou sem base) nem no modo Livre sem um recálculo pedido.
 */
export function devePularRecalcProtecao({
    hydrating = false,
    modoLivre = false,
    explicitRecalc = false,
} = {}) {
    if (hydrating) return true;
    if (modoLivre && !explicitRecalc) return true;
    return false;
}

/** Há base persistida. Usar o valor visível como base empilharia o bônus. */
export function temBaseRestaurada(baseValue) {
    return baseValue != null && String(baseValue) !== '';
}

/**
 * RD (ou outro inteiro) depois do bônus.
 * Com base restaurada, soma em cima da base — o visível salvo não muda.
 * Sem base, a base vira o visível (já bonificado) e o bônus entra de novo.
 */
export function aplicarBonusSobreBase(baseValue, visivel, bonus) {
    const base = temBaseRestaurada(baseValue) ? baseValue : visivel;
    return (parseInt(base, 10) || 0) + (Number(bonus) || 0);
}
