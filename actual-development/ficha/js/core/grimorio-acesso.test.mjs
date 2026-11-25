import test from 'node:test';
import assert from 'node:assert/strict';
import { avaliar, limitesDaHierarquia } from './grimorio-acesso.js';

test('item de raridade que a hierarquia não permite fica escondido; cota cheia vira "falta"', () => {
    const raro = { kind: 'item', nome: 'X', raridade: 'raro', peso: 1 };
    assert.equal(avaliar(raro, { hierarquia: 'trabalhador' }).visivel, false);
    assert.equal(avaliar(raro, { hierarquia: 'barao' }).podeAdicionar, true);
    const incomum = { kind: 'item', nome: 'Y', raridade: 'incomum', peso: 1 };
    const cheia = avaliar(incomum, { hierarquia: 'trabalhador', cotasUsadas: { incomum: 1 } });
    assert.equal(cheia.visivel, true);
    assert.equal(cheia.podeAdicionar, false);
    assert.equal(cheia.motivo, 'cota de raridade esgotada');
});

test('aspecto biológico nível II só depois do I; III só depois do II', () => {
    const perfil = (nomes) => ({ besta: { nomes, bioUsado: 0, bioLim: 6 } });
    const ii = { kind: 'aspecto', grupo: 'bio', nome: 'Disparo II', nivel: 'II' };
    const iii = { kind: 'aspecto', grupo: 'bio', nome: 'Disparo III', nivel: 'III' };
    assert.equal(avaliar(ii, perfil([])).visivel, false);
    assert.equal(avaliar(ii, perfil(['Disparo'])).podeAdicionar, true);
    assert.equal(avaliar(iii, perfil(['Disparo'])).visivel, false);
    assert.equal(avaliar(iii, perfil(['Disparo', 'Disparo II'])).podeAdicionar, true);
});

test('limitesDaHierarquia devolve uma cópia da tabela', () => {
    const l = limitesDaHierarquia('trabalhador');
    assert.deepEqual(l.slice(1), [2, 1, 0, 0, 0]);
    l[1] = 99;
    assert.equal(limitesDaHierarquia('trabalhador')[1], 2);
});
