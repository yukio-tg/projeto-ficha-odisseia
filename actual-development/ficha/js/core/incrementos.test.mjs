import test from 'node:test';
import assert from 'node:assert/strict';

import {
    aplicarIncremento,
    somarIncrementos,
    valorComIncrementos,
    migrarIncrementosLegados,
    normalizarLog,
    setIncrementos,
    getIncrementos,
    adicionarIncremento,
    removerIncremento,
    removerIncrementosDoCampo,
    incrementar,
    ehCampoLegado,
    calcularFlatManual,
    aplicarAjusteManual,
    aplicarEdicao,
    registrarAjusteManual,
    editarIncremento,
    ehManual,
} from './incrementos.js';
import { basesBesta, derivadosBesta, calcPmMax, CAMPOS_BESTA } from './besta-regras.js';
import { setSheetMode, MODO_LIVRE, MODO_REGRAS, podeSobrescrever, manualOverrides, beginScopedRecalc, endScopedRecalc } from './state.js';

function reset() {
    setIncrementos([]);
    setSheetMode(MODO_REGRAS);
    manualOverrides.clear();
}

test('flat e porcentagem: (base + flat) × (1 + pct/100), várias linhas no mesmo campo', () => {
    assert.equal(aplicarIncremento(20, 5, 10), 27);
    assert.equal(aplicarIncremento(20, 0, 0), 20);
    assert.equal(aplicarIncremento(9.5, 0, 0), 9);

    const log = normalizarLog([
        { id: 'a', campo: 'pv', tipo: 'flat', valor: 5 },
        { id: 'b', campo: 'pv', tipo: 'flat', valor: 3 },
        { id: 'c', campo: 'pv', tipo: 'pct', valor: 10 },
        { id: 'd', campo: 'pm', tipo: 'pct', valor: 50 },
    ]);
    assert.deepEqual(somarIncrementos(log, 'pv'), { flat: 8, pct: 10 });
    assert.equal(valorComIncrementos(22, log, 'pv'), 33);
    assert.equal(valorComIncrementos(10, log, 'pm'), 15);
    assert.equal(valorComIncrementos(7, log, 'fe'), 7);
});

test('excluir a linha de PM não muda o PV', () => {
    reset();
    setSheetMode(MODO_LIVRE);
    const pv = adicionarIncremento('pv', 'flat', 5);
    const pm = adicionarIncremento('pm', 'flat', 4);
    assert.ok(pv && pm);

    const pvAntes = incrementar('pv', 30);
    assert.equal(pvAntes, 35);
    assert.equal(incrementar('pm', 10), 14);

    assert.equal(removerIncremento(pm.id).campo, 'pm');
    assert.equal(incrementar('pv', 30), pvAntes);
    assert.equal(incrementar('pm', 10), 10);
    assert.equal(getIncrementos().length, 1);

    // Recalcular só o PM não libera a escrita no PV.
    beginScopedRecalc(['mana-total', 'mana-atual']);
    assert.equal(podeSobrescrever('mana-total'), true);
    assert.equal(podeSobrescrever('pv-total'), false);
    endScopedRecalc();
    assert.equal(podeSobrescrever('pv-total'), true);
    reset();
});

test('várias linhas no mesmo campo: excluir uma remove só aquela', () => {
    reset();
    setSheetMode(MODO_LIVRE);
    const a = adicionarIncremento('pv', 'flat', 5);
    adicionarIncremento('pv', 'flat', 2);
    removerIncremento(a.id);
    assert.equal(incrementar('pv', 30), 32);
    assert.equal(removerIncrementosDoCampo('pv'), 1);
    assert.equal(incrementar('pv', 30), 30);
    reset();
});

test('a base do livro muda e o +5 do log permanece', () => {
    reset();
    setSheetMode(MODO_LIVRE);
    adicionarIncremento('pv', 'flat', 5);
    // Nível 3 → 4 muda o PV base; a camada continua por cima.
    assert.equal(incrementar('pv', 31), 36);
    assert.equal(incrementar('pv', 35), 40);
    reset();
});

test('modo Regras também aplica o log, e o log não some ao trocar de modo', () => {
    reset();
    setSheetMode(MODO_LIVRE);
    adicionarIncremento('attr', 'flat', 2);
    adicionarIncremento('skill', 'flat', 1);
    assert.equal(incrementar('attr', 14), 16);
    assert.equal(incrementar('skill', 4), 5);

    setSheetMode(MODO_REGRAS);
    assert.equal(incrementar('attr', 14), 16);
    assert.equal(incrementar('skill', 4), 5);
    assert.equal(getIncrementos().length, 2);

    setSheetMode(MODO_LIVRE);
    assert.equal(incrementar('attr', 14), 16);
    reset();
});

test('migração de incr-* antigos: uma vez, sem bônus em dobro', () => {
    const antigo = {
        fields: {
            'pv-total': '35',
            'incr-pv-flat': '5',
            'incr-pv-pct': '0',
            'incr-pm-pct': '10',
            'incr-def-flat': '',
            'incr-skill-flat': '1',
            dinheiro: '10',
        },
        sheetMode: 'regras',
    };

    const m1 = migrarIncrementosLegados(antigo);
    assert.equal(m1.migrou, true);
    assert.equal(m1.incrementos.length, 3);
    assert.deepEqual(somarIncrementos(m1.incrementos, 'pv'), { flat: 5, pct: 0 });
    assert.deepEqual(somarIncrementos(m1.incrementos, 'pm'), { flat: 0, pct: 10 });
    assert.deepEqual(somarIncrementos(m1.incrementos, 'skill'), { flat: 1, pct: 0 });
    // A fonte antiga sai de fields; o resto fica.
    assert.equal(Object.keys(m1.fields).some(ehCampoLegado), false);
    assert.equal(m1.fields['pv-total'], '35');
    assert.equal(m1.fields.dinheiro, '10');
    // O blob original não é alterado.
    assert.equal(antigo.fields['incr-pv-flat'], '5');

    // Segunda abertura do save já migrado: nada novo.
    const salvo = { ...antigo, fields: m1.fields, incrementos: m1.incrementos };
    const m2 = migrarIncrementosLegados(salvo);
    assert.equal(m2.migrou, false);
    assert.deepEqual(m2.incrementos, m1.incrementos);

    // Log já existe e a fonte antiga ainda está lá (cliente velho): não duplica.
    const misto = { fields: { 'incr-pv-flat': '5' }, incrementos: m1.incrementos };
    const m3 = migrarIncrementosLegados(misto);
    assert.equal(m3.migrou, false);
    assert.deepEqual(somarIncrementos(m3.incrementos, 'pv'), { flat: 5, pct: 0 });
    assert.equal('incr-pv-flat' in m3.fields, false);

    // Abrir duas vezes sem salvar gera o mesmo log (ids estáveis).
    const m4 = migrarIncrementosLegados(antigo);
    assert.deepEqual(m4.incrementos, m1.incrementos);

    // Save sem nada de incremento.
    const vazio = migrarIncrementosLegados({ fields: { 'incr-pv-flat': '0' } });
    assert.equal(vazio.migrou, false);
    assert.deepEqual(vazio.incrementos, []);
});

test('log normaliza linhas inválidas e ids repetidos', () => {
    const log = normalizarLog([
        { id: 'x', campo: 'pv', tipo: 'flat', valor: 2 },
        { id: 'x', campo: 'pv', tipo: 'flat', valor: 9 },
        { id: 'y', campo: 'inexistente', tipo: 'flat', valor: 1 },
        { id: 'z', campo: 'pm', tipo: 'pct', valor: 0 },
        { id: 'w', campo: 'pm', tipo: 'qualquer', valor: '3' },
        null,
    ]);
    assert.deepEqual(log, [
        { id: 'x', campo: 'pv', tipo: 'flat', valor: 2 },
        { id: 'w', campo: 'pm', tipo: 'flat', valor: 3 },
    ]);
});

test('ajuste manual: flat relativo à base, com e sem % no campo', () => {
    // A regra dá 16, o jogador digita 20.
    assert.equal(calcularFlatManual(20, 16, [], 'pv'), 4);

    const comFlat = normalizarLog([{ id: 'f', campo: 'pv', tipo: 'flat', valor: 2 }]);
    assert.equal(calcularFlatManual(20, 16, comFlat, 'pv'), 2);
    assert.equal(valorComIncrementos(16, aplicarAjusteManual(comFlat, 'pv', 2), 'pv'), 20);

    // Com +10%: o flat inteiro que fecha é 3, porque floor((16 + 3) × 1,1) = 20.
    const comPct = normalizarLog([{ id: 'p', campo: 'pv', tipo: 'pct', valor: 10 }]);
    const f = calcularFlatManual(20, 16, comPct, 'pv');
    assert.equal(f, 3);
    assert.equal(valorComIncrementos(16, aplicarAjusteManual(comPct, 'pv', f), 'pv'), 20);

    // +100% pula os ímpares com flat inteiro: duas casas fecham o número.
    const dobro = normalizarLog([{ id: 'd', campo: 'pv', tipo: 'pct', valor: 100 }]);
    const meio = calcularFlatManual(21, 10, dobro, 'pv');
    assert.equal(meio, 0.5);
    assert.equal(valorComIncrementos(10, aplicarAjusteManual(dobro, 'pv', meio), 'pv'), 21);

    // A linha manual anterior não entra na conta da nova.
    const comManual = aplicarAjusteManual([], 'pv', 4);
    assert.equal(calcularFlatManual(25, 16, comManual, 'pv'), 9);

    // Outros campos não interferem; fator zero não tem solução.
    const outroCampo = normalizarLog([{ id: 'm', campo: 'pm', tipo: 'flat', valor: 7 }]);
    assert.equal(calcularFlatManual(20, 16, outroCampo, 'pv'), 4);
    assert.equal(calcularFlatManual(20, 16, [{ id: 'z', campo: 'pv', tipo: 'pct', valor: -100 }], 'pv'), null);
    assert.equal(calcularFlatManual(20, null, [], 'pv'), null);
});

test('ajuste manual: uma linha por campo, atualizada ou removida', () => {
    let log = normalizarLog([{ id: 'a', campo: 'pv', tipo: 'flat', valor: 1 }]);
    log = aplicarAjusteManual(log, 'pv', 4);
    const manual = log.find(ehManual);
    assert.equal(log.length, 2);
    assert.deepEqual({ ...manual, id: 'x' }, { id: 'x', campo: 'pv', tipo: 'flat', valor: 4, origem: 'manual' });

    log = aplicarAjusteManual(log, 'pv', 6);
    assert.equal(log.filter(ehManual).length, 1);
    assert.equal(log.find(ehManual).id, manual.id);
    assert.equal(log.find(ehManual).valor, 6);

    log = aplicarAjusteManual(log, 'pv', 0);
    assert.deepEqual(log, [{ id: 'a', campo: 'pv', tipo: 'flat', valor: 1 }]);

    // Duas manuais no mesmo campo (blob editado à mão): fica a primeira.
    const dup = normalizarLog([
        { id: 'm1', campo: 'pv', tipo: 'flat', valor: 2, origem: 'manual' },
        { id: 'm2', campo: 'pv', tipo: 'flat', valor: 3, origem: 'manual' },
        { id: 'm3', campo: 'pm', tipo: 'flat', valor: 3, origem: 'manual' },
        { id: 'v', campo: 'pv', tipo: 'flat', valor: 1, origem: 'outra' },
    ]);
    assert.deepEqual(dup.map(l => l.id), ['m1', 'm3', 'v']);
    assert.equal('origem' in dup[2], false);
});

test('ajuste manual continua flat fixo quando a base muda', () => {
    reset();
    setSheetMode(MODO_LIVRE);
    const flat = calcularFlatManual(20, 16, getIncrementos(), 'pv');
    registrarAjusteManual('pv', flat);
    assert.equal(incrementar('pv', 16), 20);
    // Sobe de nível: base 19, o +4 fica.
    assert.equal(incrementar('pv', 19), 23);
    setSheetMode(MODO_REGRAS);
    assert.equal(incrementar('pv', 19), 23);
    assert.equal(getIncrementos().length, 1);
    reset();
});

test('editar uma linha muda só aquele campo', () => {
    reset();
    setSheetMode(MODO_LIVRE);
    const pv = adicionarIncremento('pv', 'flat', 1);
    const pm = adicionarIncremento('pm', 'flat', 2);
    assert.equal(incrementar('pv', 16), 17);

    editarIncremento(pv.id, { valor: 3 });
    assert.equal(incrementar('pv', 16), 19);
    assert.equal(incrementar('pm', 10), 12);

    editarIncremento(pv.id, { tipo: 'pct' });
    assert.equal(incrementar('pv', 100), 103);
    assert.equal(incrementar('pm', 10), 12);

    assert.equal(editarIncremento(pm.id, { valor: 0 }), null);
    assert.equal(incrementar('pm', 10), 10);
    assert.equal(incrementar('pv', 100), 103);

    // A linha manual também é editável e continua manual.
    registrarAjusteManual('fe', 4);
    const fe = getIncrementos().find(ehManual);
    editarIncremento(fe.id, { valor: 5 });
    assert.equal(ehManual(getIncrementos().find(l => l.id === fe.id)), true);
    assert.equal(incrementar('fe', 6), 11);

    // Pura: o log de entrada não muda.
    const base = normalizarLog([{ id: 'k', campo: 'pv', tipo: 'flat', valor: 1 }]);
    aplicarEdicao(base, 'k', { valor: 9 });
    assert.equal(base[0].valor, 1);
    reset();
});

test('besta: incrementos e ajuste manual no próprio log, Regras também aplica', () => {
    reset();
    const b = {
        nivel: 1,
        attrs: { CON: 0, SAB: 0, DES: 2 },
        pmMaxManual: null,
        defesaManual: null,
        incrementos: [{ id: 'b1', campo: 'pm', tipo: 'flat', valor: 5 }],
    };
    assert.deepEqual(CAMPOS_BESTA, ['pm', 'def', 'attr', 'skill', 'bio']);
    const base = basesBesta(b);
    assert.equal(base.pm, calcPmMax(1, 0, 0));
    assert.equal(base.def, 14);
    assert.equal(base.attr, 14);
    assert.equal(base.skill, 3);
    assert.equal(base.bio, 6);

    setSheetMode(MODO_REGRAS);
    assert.equal(derivadosBesta(b).pmMax, base.pm + 5);

    setSheetMode(MODO_LIVRE);
    assert.equal(derivadosBesta(b).pmMax, base.pm + 5);

    // Digitar 20 de defesa com base 14 vira +6 manual.
    const flat = calcularFlatManual(20, base.def, b.incrementos, 'def');
    b.incrementos = aplicarAjusteManual(b.incrementos, 'def', flat);
    assert.equal(derivadosBesta(b).defesa, 20);

    // Sobe de nível: a base do PM muda, o +5 continua.
    b.nivel = 4;
    assert.equal(derivadosBesta(b).pmMax, calcPmMax(4, 0, 0) + 5);
    b.incrementos = normalizarLog([...b.incrementos, { campo: 'skill', tipo: 'flat', valor: 2 }, { campo: 'attr', tipo: 'flat', valor: 1 }]);
    assert.equal(derivadosBesta(b).profLim, 5 + 2);
    assert.equal(derivadosBesta(b).tetoAttr, 17 + 1);

    // O override antigo ainda vence.
    assert.equal(derivadosBesta({ ...b, pmMaxManual: 50 }).pmMax, 50);

    setSheetMode(MODO_REGRAS);
    assert.equal(derivadosBesta(b).defesa, 20);
    assert.equal(b.incrementos.length, 4);
    reset();
});
