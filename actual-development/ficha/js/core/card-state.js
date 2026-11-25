// core/card-state.js
// Lembra quais cartões estão abertos ou fechados (poderes, magias, itens, combate, aspectos...).
//
// O estado vive dentro da ficha, mas separado por pessoa (uid): cada pessoa que abre a ficha
// tem os seus próprios cartões abertos, sem mexer nos da outra.
// Abrir ou fechar um cartão NÃO conta como alteração: não acende o indicador "não salvo"
// e não dispara o autosave normal. O dado entra no próximo salvamento. Para não se perder
// quando ninguém mais edita, o main.js salva em silêncio depois de uma pausa.
//
// Uso nos módulos de UI:
//   import { cartaoAberto, lembrarCartao } from '../core/card-state.js';
//   const aberto = cartaoAberto('poder:' + id, false);   // 2º argumento = padrão se nunca foi tocado
//                                                         // 3º (opcional) = estado antigo gravado no cartão
//   lembrarCartao('poder:' + id, true);                  // chame ao abrir/fechar
//
// Chave: "<tipo>:<id estável>". O id precisa sobreviver a salvar, recarregar e reordenar
// (nome ou id gravado no cartão; evite o índice da lista).

import { getAuth_ } from './firebase-service.js';

/** { [uid]: { [chave]: true|false } } */
let mapa = {};

function uidAtual() {
    try { return getAuth_()?.currentUser?.uid || 'anon'; } catch { return 'anon'; }
}

function meu() {
    const uid = uidAtual();
    if (!mapa[uid]) mapa[uid] = {};
    return mapa[uid];
}

/**
 * O cartão está aberto? `padrao` vale quando esta pessoa nunca mexeu nele.
 * `legado` (opcional) é o estado gravado por fichas antigas no próprio cartão:
 * se vier e a pessoa ainda não tem registro, ele vale e passa a ser guardado em silêncio
 * (sem evento), para não se perder quando o cartão deixar de gravá-lo.
 */
export function cartaoAberto(chave, padrao = false, legado) {
    const m = meu();
    const v = m[chave];
    if (typeof v === 'boolean') return v;
    if (typeof legado === 'boolean') { m[chave] = legado; return legado; }
    return !!padrao;
}

/** Guarda o estado do cartão. Não marca a ficha como alterada. */
export function lembrarCartao(chave, aberto) {
    const m = meu();
    const novo = !!aberto;
    if (m[chave] === novo) return;
    m[chave] = novo;
    document.dispatchEvent(new CustomEvent('ficha:ui-estado'));
}

/** Esquece um cartão (item apagado). */
export function esquecerCartao(chave) {
    const m = meu();
    if (!(chave in m)) return;
    delete m[chave];
    document.dispatchEvent(new CustomEvent('ficha:ui-estado'));
}

/** Para o serializador. Devolve uma cópia simples. */
export function serializarCartoes() {
    return JSON.parse(JSON.stringify(mapa));
}

/**
 * Para o desserializador. Aceita a ficha vinda do banco.
 * Os cartões desta pessoa que ela acabou de mexer ficam como estão; o resto vem da ficha.
 */
export function restaurarCartoes(dados) {
    const local = meu();
    const remoto = dados && typeof dados === 'object' && !Array.isArray(dados) ? dados : {};
    const uid = uidAtual();
    const novo = {};
    for (const [u, v] of Object.entries(remoto)) {
        if (v && typeof v === 'object') novo[u] = { ...v };
    }
    novo[uid] = { ...(novo[uid] || {}), ...local };
    mapa = novo;
}
