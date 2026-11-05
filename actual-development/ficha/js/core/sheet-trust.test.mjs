import test from 'node:test';
import assert from 'node:assert/strict';

import { fingerprintSheet, shouldApplyRemoteSnapshot } from './save-guard.js';
import {
    manualOverrides,
    podeSobrescrever,
    restoreSheetMode,
    setSheetMode,
    beginExplicitRecalc,
    endExplicitRecalc,
    MODO_LIVRE,
    MODO_REGRAS,
} from './state.js';
import {
    herancaBonusJaAplicado,
    devePularRecalcProtecao,
    aplicarBonusSobreBase,
} from './bonus-guard.js';

function roundTrip(data) {
    return JSON.parse(fingerprintSheet(JSON.parse(fingerprintSheet(data))));
}

function resetOverrides() {
    manualOverrides.clear();
    setSheetMode(MODO_REGRAS);
    endExplicitRecalc();
}

test('ida e volta do snapshot não altera número que o jogador não editou', () => {
    const salvo = {
        fields: { defesa: '18', 'pv-total': '24', rd: '3', dinheiro: '10' },
        radar: { level: '4', attrs: { FOR: '3', DES: '2' } },
        manualOverrides: ['defesa'],
        protectionBases: { rd: '0', deslocamento: '9' },
        bonusAprendizadoFlag: true,
        sheetMode: 'regras',
    };

    const deVolta = roundTrip(salvo);
    assert.equal(deVolta.fields.defesa, '18');
    assert.equal(deVolta.fields['pv-total'], '24');
    assert.equal(deVolta.fields.rd, '3');
    assert.equal(deVolta.fields.dinheiro, '10');
    assert.equal(deVolta.radar.attrs.FOR, '3');
    assert.deepEqual(deVolta.protectionBases, salvo.protectionBases);
    assert.equal(deVolta.bonusAprendizadoFlag, true);

    assert.equal(
        fingerprintSheet({ b: 1, a: { z: 2, y: 3 } }),
        fingerprintSheet({ a: { y: 3, z: 2 }, b: 1 }),
    );

    const numero = { fields: { defesa: 18 } };
    assert.equal(JSON.parse(fingerprintSheet(numero)).fields.defesa, 18);
});

test('eco da própria gravação e save em voo não reaplicam o snapshot', () => {
    const fp = fingerprintSheet({ fields: { defesa: '18' } });
    const enviados = new Set([fp]);

    assert.equal(shouldApplyRemoteSnapshot({
        permission: 'edit',
        remoteFingerprint: fp,
        knownSentFingerprints: enviados,
    }), false);

    assert.equal(shouldApplyRemoteSnapshot({
        permission: 'edit',
        saveInFlight: true,
        remoteFingerprint: 'outro',
    }), false);

    assert.equal(shouldApplyRemoteSnapshot({
        permission: 'edit',
        saveTimerActive: true,
    }), false);

    assert.equal(shouldApplyRemoteSnapshot({
        permission: 'read',
        saveInFlight: true,
        remoteFingerprint: fp,
        knownSentFingerprints: enviados,
    }), true);

    assert.equal(shouldApplyRemoteSnapshot({
        permission: 'edit',
        remoteFingerprint: fingerprintSheet({ fields: { defesa: '19' } }),
        knownSentFingerprints: enviados,
    }), true);
});

test('override manual sobrevive ao modo e o cálculo não reescreve o campo', () => {
    resetOverrides();
    manualOverrides.add('defesa');
    manualOverrides.add('pv-total');

    restoreSheetMode({ sheetMode: MODO_LIVRE });
    assert.equal(manualOverrides.has('defesa'), true);
    assert.equal(podeSobrescrever('defesa'), false);

    setSheetMode(MODO_REGRAS);
    assert.equal(podeSobrescrever('pv-total'), false);
    assert.equal(podeSobrescrever('rd'), true);

    const fields = { defesa: '18', 'pv-total': '24', rd: '3' };
    const calculado = { defesa: '99', 'pv-total': '99', rd: '9' };
    const aplicado = { ...fields };
    for (const [campo, valor] of Object.entries(calculado)) {
        if (podeSobrescrever(campo)) aplicado[campo] = valor;
    }
    assert.equal(aplicado.defesa, '18');
    assert.equal(aplicado['pv-total'], '24');
    assert.equal(aplicado.rd, '9');

    beginExplicitRecalc();
    assert.equal(podeSobrescrever('defesa'), true);
    endExplicitRecalc();
    assert.equal(podeSobrescrever('defesa'), false);

    manualOverrides.clear();
});

test('bônus de herança restaurado não reaplica na mesma herança', () => {
    assert.equal(herancaBonusJaAplicado({
        bonusAprendizadoFlag: true,
        aprendizadoAtivo: true,
        chave: 'anao',
        chaveAplicada: 'anao',
    }), true);

    assert.equal(herancaBonusJaAplicado({
        bonusAprendizadoFlag: false,
        aprendizadoAtivo: true,
        chave: 'anao',
        chaveAplicada: 'anao',
    }), false);

    assert.equal(herancaBonusJaAplicado({
        bonusAprendizadoFlag: true,
        aprendizadoAtivo: false,
        chave: 'anao',
        chaveAplicada: 'anao',
    }), false);

    assert.equal(herancaBonusJaAplicado({
        bonusAprendizadoFlag: true,
        aprendizadoAtivo: true,
        chave: 'elfo',
        chaveAplicada: 'anao',
    }), false);
});

test('proteção restaurada não empilha no segundo load', () => {
    assert.equal(devePularRecalcProtecao({ hydrating: true }), true);
    assert.equal(devePularRecalcProtecao({
        hydrating: true,
        modoLivre: false,
        explicitRecalc: true,
    }), true);
    assert.equal(devePularRecalcProtecao({ modoLivre: true, explicitRecalc: false }), true);
    assert.equal(devePularRecalcProtecao({ modoLivre: true, explicitRecalc: true }), false);
    assert.equal(devePularRecalcProtecao({ modoLivre: false, explicitRecalc: false }), false);

    const base = '0';
    const bonus = 3;
    const visivelSalvo = String(aplicarBonusSobreBase(base, '0', bonus));
    assert.equal(visivelSalvo, '3');

    const segundoLoad = aplicarBonusSobreBase(base, visivelSalvo, bonus);
    assert.equal(segundoLoad, 3);

    const semBase = aplicarBonusSobreBase(null, visivelSalvo, bonus);
    assert.equal(semBase, 6);
});
