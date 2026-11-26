import test from 'node:test';
import assert from 'node:assert/strict';
import { reconciliar, reconciliarLinhas, linhasDesejadas, linhasAspectosBesta } from './efeitos-passivos.js';
import {
    setIncrementos, getIncrementos, incrementar, registrarAjusteManual, normalizarLog,
} from './incrementos.js';
import { setSheetMode, MODO_REGRAS, MODO_LIVRE } from './state.js';

const reset = () => { setIncrementos([]); setSheetMode(MODO_REGRAS); };
const cartao = (id, nome) => ({ id, nome });

test('A Prática Supera a Teoria vira +8 PV e +5 PM', () => {
    reset();
    const { log, campos } = reconciliar([], [cartao('c1', 'A Prática Supera a Teoria')]);
    setIncrementos(log);
    assert.deepEqual(campos.sort(), ['pm', 'pv']);
    assert.equal(incrementar('pv', 30), 38);
    assert.equal(incrementar('pm', 20), 25);
    reset();
});

test('A Teoria Supera a Prática: +5 PT, -8 PV, -5 PM', () => {
    reset();
    setIncrementos(reconciliar([], [cartao('c1', 'a teoria supera a pratica')]).log);
    assert.equal(incrementar('pt', 10), 15);
    assert.equal(incrementar('pv', 30), 22);
    assert.equal(incrementar('pm', 20), 15);
    reset();
});

test('sincronizar duas vezes não soma em dobro', () => {
    reset();
    const cartoes = [cartao('c1', 'Auto-preservação')];
    const um = reconciliar([], cartoes).log;
    const dois = reconciliar(um, cartoes);
    assert.equal(dois.campos.length, 0);
    assert.equal(dois.log.length, 1);
    setIncrementos(dois.log);
    assert.equal(incrementar('pv', 30), 40);
    reset();
});

test('remover o cartão tira o bônus e deixa o resto do log', () => {
    reset();
    let log = reconciliar([], [cartao('c1', 'Patrulha')]).log;
    setIncrementos(log);
    registrarAjusteManual('def', -10);
    log = getIncrementos();
    const r = reconciliar(log, []);
    setIncrementos(r.log);
    assert.deepEqual(r.campos, ['def']);
    assert.equal(incrementar('def', 12), 2);
    assert.equal(getIncrementos().length, 1);
    reset();
});

test('poder +5 e ajuste manual -10 acumulam: resultado -5 (Regras e Livre)', () => {
    reset();
    setIncrementos(reconciliar([], [cartao('c1', 'Patrulha')]).log);
    registrarAjusteManual('def', -8);
    for (const modo of [MODO_REGRAS, MODO_LIVRE]) {
        setSheetMode(modo);
        assert.equal(incrementar('def', 12), 12 + 3 - 8);
    }
    reset();
});

test('renomear o cartão troca as linhas; nome fora da tabela não cria nada', () => {
    reset();
    let r = reconciliar([], [cartao('c1', 'Patrulha')]);
    r = reconciliar(r.log, [cartao('c1', 'Mana Sensível')]);
    assert.equal(r.log.length, 1);
    assert.equal(r.log[0].valor, 2);
    assert.deepEqual(linhasDesejadas([cartao('c2', 'Poder Inventado')]), []);
    reset();
});

test('dois cartões do mesmo poder contam uma vez', () => {
    assert.equal(linhasDesejadas([cartao('a', 'Auto-didata'), cartao('b', 'Auto-didata')]).length, 1);
});

test('a origem do poder sobrevive ao normalizarLog (salvar e carregar)', () => {
    const log = reconciliar([], [cartao('c1', 'Patrulha')]).log;
    const volta = normalizarLog(JSON.parse(JSON.stringify(log)));
    assert.equal(volta[0].origem, 'poder:Patrulha');
    assert.equal(reconciliar(volta, [cartao('c1', 'Patrulha')]).campos.length, 0);
});

test('Calejado: +2 PV por nível, refeito quando o nível muda', () => {
    reset();
    const cartoes = [cartao('c1', 'Calejado')];
    let r = reconciliar([], cartoes, 3);
    setIncrementos(r.log);
    assert.equal(incrementar('pv', 30), 36);
    r = reconciliar(getIncrementos(), cartoes, 4);
    assert.deepEqual(r.campos, ['pv']);
    setIncrementos(r.log);
    assert.equal(incrementar('pv', 30), 38);
    assert.equal(getIncrementos().length, 1);
    assert.equal(reconciliar(getIncrementos(), cartoes, 4).campos.length, 0);
    reset();
});

test('Calejado e Treino de Resistência somam; remover um tira só o dele', () => {
    reset();
    const dois = [cartao('a', 'Calejado'), cartao('b', 'Treino de Resistência')];
    setIncrementos(reconciliar([], dois, 5).log);
    assert.equal(incrementar('pv', 40), 60);
    setIncrementos(reconciliar(getIncrementos(), [dois[1]], 5).log);
    assert.equal(incrementar('pv', 40), 50);
    reset();
});

test('porNivel sobrevive ao salvar e carregar', () => {
    const log = reconciliar([], [cartao('c1', 'Calejado')], 2).log;
    const volta = normalizarLog(JSON.parse(JSON.stringify(log)));
    assert.equal(volta[0].porNivel, 2);
    assert.equal(reconciliar(volta, [cartao('c1', 'Calejado')], 2).campos.length, 0);
});

test('Volátil: grau pelo nome, maior grau vale, não soma graus', () => {
    const v = (aspectos, n) => linhasAspectosBesta(aspectos, n);
    assert.equal(v([{ nome: 'Volátil', nivel: 'I' }], 3)[0].valor, 6);
    assert.equal(v([{ nome: 'Volátil II', nivel: 'II' }], 3)[0].valor, 9);
    assert.equal(v([{ nome: 'Volátil III', nivel: 'III' }], 4)[0].valor, 20);
    const juntos = v([{ nome: 'Volátil', nivel: 'I' }, { nome: 'Volátil III', nivel: 'III' }], 2);
    assert.equal(juntos.length, 1);
    assert.equal(juntos[0].valor, 10);
    assert.equal(v([{ nome: 'Volátil', nivel: 'II' }], 2)[0].valor, 6);
    assert.equal(v([{ nome: 'Ágil' }], 2).length, 0);
    assert.equal(v([], 2).length, 0);
});

test('Volátil na besta: muda com o nível, sai ao remover, linha manual fica', () => {
    reset();
    let log = [];
    let r = reconciliarLinhas(log, linhasAspectosBesta([{ nome: 'Volátil II' }], 2));
    assert.equal(r.log[0].valor, 6);
    log = r.log;
    r = reconciliarLinhas(log, linhasAspectosBesta([{ nome: 'Volátil II' }], 5));
    assert.equal(r.log[0].valor, 15);
    log = [...r.log, { id: 'm', campo: 'pm', tipo: 'flat', valor: -4, origem: 'manual' }];
    r = reconciliarLinhas(log, linhasAspectosBesta([], 5));
    assert.deepEqual(r.log.map(l => l.id), ['m']);
    reset();
});

// ── Perícias, atributos e graus ─────────────────────────────────────────────
import {
    getBonusAtributo, getBonusPericia, getGrauExtra, bonusPericiaEm, grauExtraEm, bonusAtributoEm,
    campoValido, rotuloCampo,
} from './incrementos.js';
import { escolhaDoPoder, opcoesEscolha } from './efeitos-passivos.js';

test('campos compostos: válidos e inválidos', () => {
    assert.equal(campoValido('atributo:FOR'), true);
    assert.equal(campoValido('atributo:XYZ'), false);
    assert.equal(campoValido('pericia:Lutar'), true);
    assert.equal(campoValido('pericias:todas'), true);
    assert.equal(campoValido('pericias:CAR'), true);
    assert.equal(campoValido('pericias:XYZ'), false);
    assert.equal(campoValido('grau:Lutar'), true);
    assert.equal(campoValido('pericia:'), false);
    assert.equal(campoValido('coisa:Lutar'), false);
    assert.equal(rotuloCampo('pericias:CAR').rotulo, 'Perícias CAR');
});

test('Sorte da Deusa: +1 em todas as perícias e -20% PM', () => {
    reset();
    setIncrementos(reconciliar([], [cartao('c1', 'Sorte da Deusa')], 1).log);
    assert.equal(getBonusPericia('Lutar', 'FOR'), 1);
    assert.equal(getBonusPericia('Magia', 'SAB'), 1);
    assert.equal(incrementar('pm', 50), 40);
    reset();
});

test('Ler Aura soma só nas perícias de Carisma; Macabro tira 5', () => {
    reset();
    setIncrementos(reconciliar([], [cartao('a', 'Ler Aura'), cartao('b', 'Macabro')]).log);
    assert.equal(getBonusPericia('Mentir', 'CAR'), -3);
    assert.equal(getBonusPericia('Lutar', 'FOR'), 0);
    reset();
});

test('Atributo Extra: sem escolha não faz nada; com escolha soma +1 no atributo', () => {
    reset();
    assert.equal(escolhaDoPoder('Atributo Extra'), 'atributo');
    assert.equal(reconciliar([], [cartao('a', 'Atributo Extra')]).log.length, 0);
    setIncrementos(reconciliar([], [{ id: 'a', nome: 'Atributo Extra', escolha: 'DES' }]).log);
    assert.equal(getBonusAtributo('DES'), 1);
    assert.equal(getBonusAtributo('FOR'), 0);
    // trocar a escolha troca a linha
    const r = reconciliar(getIncrementos(), [{ id: 'a', nome: 'Atributo Extra', escolha: 'FOR' }]);
    setIncrementos(r.log);
    assert.equal(getBonusAtributo('DES'), 0);
    assert.equal(getBonusAtributo('FOR'), 1);
    assert.equal(getIncrementos().length, 1);
    assert.deepEqual(r.campos.sort(), ['atributo:DES', 'atributo:FOR']);
    reset();
});

test('Acrescento repetível: duas perícias diferentes, cada cartão com sua escolha', () => {
    reset();
    const cartoes = [
        { id: 'a', nome: 'Acrescento', escolha: 'Lutar' },
        { id: 'b', nome: 'Acrescento', escolha: 'Atirar' },
    ];
    setIncrementos(reconciliar([], cartoes).log);
    assert.equal(getBonusPericia('Lutar', 'FOR'), 1);
    assert.equal(getBonusPericia('Atirar', 'DES'), 1);
    assert.equal(getBonusPericia('Magia', 'SAB'), 0);
    reset();
});

test('grau grátis: Treinamento de Perícia e Diplomacia; opções por tipo', () => {
    reset();
    setIncrementos(reconciliar([], [
        { id: 'a', nome: 'Treinamento de Perícia', escolha: 'Lutar' },
        { id: 'b', nome: 'Diplomacia', escolha: 'Mentir' },
    ]).log);
    assert.equal(getGrauExtra('Lutar'), 1);
    assert.equal(getGrauExtra('Mentir'), 1);
    assert.equal(getGrauExtra('Magia'), 0);
    // Diplomacia só aceita Convencer, Mentir ou Ameaçar
    assert.equal(reconciliar([], [{ id: 'c', nome: 'Diplomacia', escolha: 'Lutar' }]).log.length, 0);
    assert.equal(opcoesEscolha('pericia-sem-fisico').includes('Lutar'), false);
    assert.equal(opcoesEscolha('pericia-sem-fisico').includes('Magia'), true);
    reset();
});

test('perícia casa sem acento e sem diferença de maiúscula', () => {
    const log = [{ id: 'x', campo: 'pericia:Perspicácia', tipo: 'flat', valor: 2 }];
    assert.equal(bonusPericiaEm(log, 'perspicacia', 'INT'), 2);
    assert.equal(grauExtraEm([{ id: 'y', campo: 'grau:Esforço', tipo: 'flat', valor: 1 }], 'ESFORCO'), 1);
    assert.equal(bonusAtributoEm([{ id: 'z', campo: 'atributo:CON', tipo: 'flat', valor: 3 }], 'CON'), 3);
});

test('porcentagem em campo composto é ignorada', () => {
    const log = [{ id: 'x', campo: 'pericias:todas', tipo: 'pct', valor: 50 }];
    assert.equal(bonusPericiaEm(log, 'Lutar', 'FOR'), 0);
});

test('o poder +5 com ajuste manual -10 em perícia acumula (-5)', () => {
    reset();
    setIncrementos([
        { id: 'p', campo: 'pericia:Lutar', tipo: 'flat', valor: 5, origem: 'poder:Teste' },
        { id: 'm', campo: 'pericia:Lutar', tipo: 'flat', valor: -10, origem: 'manual' },
    ]);
    assert.equal(getBonusPericia('Lutar', 'FOR'), -5);
    reset();
});

// ── Itens equipados ─────────────────────────────────────────────────────────
import { itensQueContam, ehItemComEfeito } from './efeitos-passivos.js';

test('Mochilão e Calçado de Marcha equipados dão inventário e deslocamento', () => {
    reset();
    const fontes = itensQueContam([
        { id: 'item_1', nome: 'Mochilão', escolha: '' },
        { id: 'item_2', nome: 'Calçado de Marcha', escolha: '' },
    ], ['Mochilão', 'Calçado de Marcha']);
    setIncrementos(reconciliar([], fontes).log);
    assert.equal(incrementar('inv', 10), 15);
    assert.equal(incrementar('desl', 6), 9);
    reset();
});

test('Utensílio e Vestimenta: +2 na perícia escolhida; sem escolha não faz nada', () => {
    reset();
    assert.equal(reconciliar([], [{ id: 'item_1', nome: 'Utensílio', escolha: '' }]).log.length, 0);
    // Luta e Atirar não são opções
    assert.equal(reconciliar([], [{ id: 'item_1', nome: 'Utensílio', escolha: 'Lutar' }]).log.length, 0);
    setIncrementos(reconciliar([], [{ id: 'item_1', nome: 'Utensílio', escolha: 'Cuidar' }]).log);
    assert.equal(getBonusPericia('Cuidar', 'INT'), 2);
    reset();
});

test('Vestimenta: no máximo 2 contam', () => {
    const v = (i) => ({ id: `item_${i}`, nome: 'Vestimenta', escolha: 'Cuidar' });
    const contam = itensQueContam([v(1), v(2), v(3)], ['Vestimenta', 'Vestimenta', 'Vestimenta']);
    assert.equal(contam.length, 2);
    reset();
    setIncrementos(reconciliar([], contam).log);
    assert.equal(getBonusPericia('Cuidar', 'INT'), 4);
    reset();
});

test('Escudo de Pulso não vale com Escudo Leve ou Pesado no inventário', () => {
    const pulso = [{ id: 'item_1', nome: 'Escudo de Pulso', escolha: '' }];
    assert.equal(itensQueContam(pulso, ['Escudo de Pulso']).length, 1);
    assert.equal(itensQueContam(pulso, ['Escudo de Pulso', 'Escudo Leve']).length, 0);
    assert.equal(itensQueContam(pulso, ['Escudo de Pulso', 'Escudo Pesado']).length, 0);
    assert.equal(ehItemComEfeito('mochilao'), true);
    assert.equal(ehItemComEfeito('Espada Longa'), false);
});

test('desequipar tira o bônus e deixa as outras linhas', () => {
    reset();
    let log = reconciliar([], [{ id: 'item_1', nome: 'Mochilão' }, { id: 'p', nome: 'Patrulha' }]).log;
    setIncrementos(log);
    assert.equal(incrementar('inv', 10), 15);
    const r = reconciliar(getIncrementos(), [{ id: 'p', nome: 'Patrulha' }]);
    setIncrementos(r.log);
    assert.equal(incrementar('inv', 10), 10);
    assert.equal(incrementar('def', 12), 15);
    reset();
});

// ── Ataque, RD por tipo, avisos, desligar linha ─────────────────────────────
import {
    getBonusAtaque, getRdPorTipo, getNotas, getVantagem, vantagemEm, aplicarEdicao,
} from './incrementos.js';

test('Mira Boa: +2 de dano só nos ataques à distância', () => {
    reset();
    setIncrementos(reconciliar([], [cartao('c1', 'Mira Boa')]).log);
    assert.equal(getBonusAtaque('distancia').dano, 2);
    assert.equal(getBonusAtaque('corpo').dano, 0);
    reset();
});

test('Disparo Pesado soma +1d em todos os ataques; Ataque Pesado +1d só no corpo a corpo', () => {
    reset();
    setIncrementos(reconciliar([], [cartao('a', 'Disparo Pesado'), cartao('b', 'Ataque Pesado')]).log);
    assert.equal(getBonusAtaque('distancia').dados, 1);
    assert.equal(getBonusAtaque('corpo').dados, 2);
    assert.equal(getBonusAtaque('magia').dados, 1);
    reset();
});

test('Benefício da Distância: +5 de acerto e +1 passo de alcance à distância', () => {
    reset();
    setIncrementos(reconciliar([], [cartao('a', 'Benefício da Distância')]).log);
    const d = getBonusAtaque('distancia');
    assert.equal(d.acerto, 5);
    assert.equal(d.alcance, 1);
    assert.equal(getBonusAtaque('corpo').acerto, 0);
    reset();
});

test('Casca Grossa: RD mundano +2 a cada 3 níveis, desde o nível 1', () => {
    reset();
    const valor = (nivel) => {
        const r = reconciliar(getIncrementos(), [cartao('a', 'Casca Grossa')], nivel);
        setIncrementos(r.log);
        return getRdPorTipo().mundano;
    };
    assert.equal(valor(1), 2);
    assert.equal(valor(3), 2);
    assert.equal(valor(4), 4);
    assert.equal(valor(7), 6);
    reset();
});

test('RD por tipo, DT e avisos entram sem conta própria', () => {
    reset();
    setIncrementos(reconciliar([], [
        cartao('a', 'Cuidado Onde Pisa!'), cartao('b', 'Potência Mágica'), cartao('c', 'Conexão Premeditada'),
    ]).log);
    assert.equal(getRdPorTipo().queda, 2);
    assert.equal(incrementar('dt', 14), 16);
    assert.equal(getNotas().length, 1);
    assert.match(getNotas()[0].texto, /Vantagem/);
    reset();
});

test('desligar uma linha tira o efeito, mas guarda a linha; a conferência não a recria', () => {
    reset();
    const cartoes = [cartao('a', 'Mira Boa'), cartao('b', 'Patrulha')];
    let log = reconciliar([], cartoes).log;
    setIncrementos(log);
    const id = getIncrementos().find(l => l.campo === 'dano:distancia').id;
    setIncrementos(aplicarEdicao(getIncrementos(), id, { ativo: false }));
    assert.equal(getBonusAtaque('distancia').dano, 0);
    assert.equal(getIncrementos().length, 2);
    const r = reconciliar(getIncrementos(), cartoes);
    assert.equal(r.campos.length, 0);
    setIncrementos(r.log);
    assert.equal(getIncrementos().length, 2);
    // ligar de novo
    setIncrementos(aplicarEdicao(getIncrementos(), id, { ativo: true }));
    assert.equal(getBonusAtaque('distancia').dano, 2);
    // desligar também vale para campos de base
    const idDef = getIncrementos().find(l => l.campo === 'def').id;
    setIncrementos(aplicarEdicao(getIncrementos(), idDef, { ativo: false }));
    assert.equal(incrementar('def', 12), 12);
    reset();
});

test('vantagem e desvantagem se anulam; perícia, atributo e todas', () => {
    const log = [
        { id: 'a', campo: 'vantagem:Lutar', tipo: 'flat', valor: 1 },
        { id: 'b', campo: 'vantagem:FOR', tipo: 'flat', valor: -1 },
        { id: 'c', campo: 'vantagem:CAR', tipo: 'flat', valor: -1 },
    ];
    assert.equal(vantagemEm(log, 'Lutar', 'FOR'), 0);
    assert.equal(vantagemEm(log, 'Trabalho', 'FOR'), -1);
    assert.equal(vantagemEm(log, 'Mentir', 'CAR'), -1);
    assert.equal(vantagemEm(log, 'Magia', 'SAB'), 0);
    reset();
    setIncrementos(log.slice(0, 1));
    assert.equal(getVantagem('Lutar', 'FOR'), 1);
    reset();
});

test('porcentagem e dado não contaminam a soma de campos de base', () => {
    reset();
    setIncrementos([
        { id: 'a', campo: 'pv', tipo: 'flat', valor: 5 },
        { id: 'b', campo: 'dano:todos', tipo: 'dado', valor: 1 },
    ]);
    assert.equal(incrementar('pv', 30), 35);
    reset();
});
