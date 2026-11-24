// core/grimorio-acesso.js — Quem o Grimório mostra e quem pode adicionar. Sem DOM.

import { normalizar } from './utils.js';

export const HABITO_LUTA = ['Certeiro', 'Coração', 'Engenhoso', 'Terrível', 'Treinador'];
export const HABITO_MAGIA = ['Arcanista', 'Feromântico', 'Engenhoso', 'Teurgista', 'Treinador'];

const LIMITES_RARIDADE = {
    pobre:       [Infinity, 2, 0, 0, 0, 0],
    trabalhador: [Infinity, 2, 1, 0, 0, 0],
    vendedor:    [Infinity, 3, 2, 0, 0, 0],
    burgues:     [Infinity, 3, 2, 1, 0, 0],
    barao:       [Infinity, 3, 3, 2, 1, 0],
    duque:       [Infinity, 4, 3, 3, 2, 1],
    herdeiro:    [Infinity, 4, 4, 4, 3, 2],
    imperador:   [Infinity, 5, 5, 4, 3, 3],
};

const RARIDADE_IDX = {
    banal: 0, comum: 1, incomum: 2, raro: 3, epico: 4, lendario: 5,
};

export const MALS_MONSTRO = [
    { nome: 'Burro', descricao: 'Ao invés do normal você sempre terá -2 perícias, ou seja, sua primeira evolução de perícia é em nível 3.' },
    { nome: 'Descontrolado', descricao: 'Toda ação que envolva um alvo diferente de você, realizada dentro de um combate enquanto Machucado, deve ser seguida de uma rolagem de teste de Poder (DT 1d10 + seu nível). Caso falhe, o alvo da ação será escolhido pelo Cronista.' },
    { nome: 'Faminto', descricao: 'Toda ação de Descanso deve-se realizar a ação Cozinhar, se não sofre -3 em todos os testes de Atributo.' },
    { nome: 'Frágil', descricao: 'Ao cair em Morrendo, ao invés do normal, você instantaneamente morre.' },
    { nome: 'Impedido de Sentidos', descricao: 'Você é atribuído da condição Cego ou Surdo.' },
    { nome: 'Instável', descricao: 'Todo fim de cena, você perde 2 PM. Isso é um dano não-letal, logo, não pode te levar à Morrendo.' },
    { nome: 'Macabro', descricao: 'Tem -5 em testes baseados em Carisma.' },
    { nome: 'Malformado', descricao: 'Sua vida máxima é reduzida em 20%.' },
    { nome: 'Nichado', descricao: 'Escolha 2 entre: frio, calor, sequidão e umidade. Ao estar em um ambiente não eleito, você sofre de Fraco.' },
    { nome: 'Sem Membros', descricao: 'Escolha não ter pernas ou braços. Braços: não pode empunhar itens. Pernas: é considerado permanentemente Caído.' },
];

const RANK = { I: 1, II: 2, III: 3 };

function igual(a, b) {
    return normalizar(a) === normalizar(b);
}

function temNome(perfil, nome, lista) {
    const alvo = normalizar(nome);
    const fonte = lista || perfil.nomes || [];
    return fonte.some(n => normalizar(n) === alvo);
}

export function grauLiberado(nivel) {
    const n = parseInt(nivel, 10) || 0;
    if (n >= 15) return 4;
    if (n >= 10) return 3;
    if (n >= 5) return 2;
    if (n >= 1) return 1;
    return 0;
}

export function vagasHabito(nivel) {
    return [4, 9, 14, 18].filter(n => (parseInt(nivel, 10) || 0) >= n).length;
}

export function vagasVersatilidadeRamo(nivel) {
    const n = parseInt(nivel, 10) || 0;
    return (n >= 7 ? 1 : 0) + (n >= 17 ? 1 : 0);
}

export function vagasVersatilidadeClasse(nivel) {
    return (parseInt(nivel, 10) || 0) >= 10 ? 1 : 0;
}

export function vagasAspectoMonstro(nivel) {
    const n = parseInt(nivel, 10) || 0;
    if (n < 1) return 0;
    return 1 + Math.floor(n / 3);
}

export function chaveRaridade(raridade) {
    return normalizar(raridade).replace(/\s+/g, '');
}

export function cotaMaxima(hierarquia, raridade) {
    const tabela = LIMITES_RARIDADE[normalizar(hierarquia)] || LIMITES_RARIDADE.pobre;
    const idx = RARIDADE_IDX[chaveRaridade(raridade)];
    if (idx === undefined) return 0;
    return tabela[idx];
}

export function baseAspecto(nome) {
    const m = String(nome || '').trim().match(/^(.*?)(?:\s+(I{1,3}))?$/);
    return { base: (m?.[1] || '').trim(), rank: m?.[2] || 'I' };
}

export function nomeRankAnterior(nome) {
    const { base, rank } = baseAspecto(nome);
    if (rank === 'II') return base;
    if (rank === 'III') return `${base} II`;
    return null;
}

export function pesoRank(nivel) {
    return RANK[nivel] || RANK[baseAspecto(nivel).rank] || 1;
}

function grausFromMax(grauMax) {
    if (grauMax === 'S') return [1, 2, 3, 4, 'S'];
    const n = parseInt(grauMax, 10) || 1;
    return Array.from({ length: n }, (_, i) => i + 1);
}

function escondido() {
    return { visivel: false, podeAdicionar: false, motivo: '', aviso: '' };
}

function mudo(motivo) {
    return { visivel: true, podeAdicionar: false, motivo, aviso: '' };
}

function livre(aviso = '') {
    return { visivel: true, podeAdicionar: true, motivo: '', aviso };
}

function prereqFalha(prereq, perfil) {
    if (!prereq) return false;
    if (Array.isArray(prereq.classes) && prereq.classes.length) {
        if (!prereq.classes.some(c => igual(c, perfil.classe))) return true;
    }
    if (prereq.nivelMin && (parseInt(perfil.nivel, 10) || 0) < prereq.nivelMin) return true;
    if (prereq.sabMin && (parseInt(perfil.sabedoria, 10) || 0) < prereq.sabMin) return true;
    if (prereq.alinhamento && (!perfil.alinhamento || igual(perfil.alinhamento, 'nenhum'))) return true;
    if (Array.isArray(prereq.poderes) && prereq.poderes.some(nome => !temNome(perfil, nome))) return true;
    if (Array.isArray(prereq.poderesAlgum) && prereq.poderesAlgum.length
        && !prereq.poderesAlgum.some(nome => temNome(perfil, nome))) return true;
    return false;
}

function habitoPermitido(habito, classe) {
    if (habito === 'geral') return true;
    const lista = habito === 'luta' ? HABITO_LUTA : habito === 'magia' ? HABITO_MAGIA : [];
    return lista.some(c => igual(c, classe));
}

function ptCabe(custo, perfil) {
    return (Number(custo) || 0) <= (Number(perfil.ptRestante) || 0);
}

function avaliarPoder(entrada, perfil) {
    const origem = entrada.origem;
    if (!origem || origem === 'heranca' || origem === 'aspecto') return escondido();

    const repetivel = entrada.repetivel === true;
    if (temNome(perfil, entrada.nome) && !repetivel) return escondido();

    if (prereqFalha(entrada.prereq, perfil)) return escondido();

    const nivel = parseInt(perfil.nivel, 10) || 0;
    const gastos = perfil.gastos || {};

    if (origem === 'habito') {
        if (nivel < 4) return escondido();
        if (!habitoPermitido(entrada.habito, perfil.classe)) return escondido();
        if ((gastos.habito || 0) >= vagasHabito(nivel)) return mudo('vaga de hábito gasta');
        return livre();
    }

    if (origem === 'classe') {
        const propria = igual(entrada.classe, perfil.classe);
        const vaga = !propria && vagasVersatilidadeClasse(nivel) > (gastos.classe || 0);
        if (!propria && !vaga) return escondido();
    } else if (origem === 'ramo') {
        if (nivel < 2) return escondido();
        if (!igual(entrada.classe, perfil.classe)) return escondido();
        const proprio = igual(entrada.ramo, perfil.ramo);
        if (!proprio && nivel < 7) return escondido();
    } else if (origem !== 'geral') {
        return escondido();
    }

    if (!ptCabe(entrada.ptCost, perfil)) return mudo('PT insuficiente');
    return livre();
}

function semAlinhamento(perfil) {
    return !perfil.alinhamento || igual(perfil.alinhamento, 'nenhum');
}

function avaliarMagia(entrada, perfil) {
    const grau = entrada.grau === 'S' || entrada.grau === 's' ? 'S' : parseInt(entrada.grau, 10) || 1;
    if (grau === 'S') return escondido();
    if (grau > grauLiberado(perfil.nivel)) return escondido();

    const tradicao = normalizar(entrada.tradicao);
    if (semAlinhamento(perfil)) {
        if (tradicao !== 'arcanismo' && tradicao !== 'feromancia') return escondido();
    } else if (tradicao !== 'teurgia') {
        return escondido();
    } else if (entrada.divindade && !igual(entrada.divindade, perfil.alinhamento)) {
        return escondido();
    }

    if (temNome(perfil, entrada.nome, perfil.nomesMagia)) return mudo('já na ficha');

    if (tradicao === 'teurgia') {
        const motivo = motivoFonte(entrada, perfil);
        if (motivo) return mudo(motivo);
        return livre();
    }

    const la = Number(entrada.la) || 0;
    if (la > (Number(perfil.laRestante) || 0)) return mudo('LA insuficiente');
    return livre();
}

function motivoFonte(entrada, perfil) {
    const fontes = perfil.fontes || [];
    if (!fontes.length) return 'precisa de uma Fonte';
    const la = Number(entrada.la) || 1;
    const grau = entrada.grau === 'S' ? 'S' : parseInt(entrada.grau, 10) || 1;
    let motivo = 'nenhuma Fonte comporta esta magia';
    for (const fonte of fontes) {
        if (!grausFromMax(fonte.grauMax).includes(grau)) {
            motivo = `Esta Fonte (${fonte.raridade}) não suporta Grau ${grau}`;
            continue;
        }
        if (entrada.divindade && fonte.deusa && !igual(fonte.deusa, entrada.divindade)) {
            motivo = `Esta Fonte pertence a ${fonte.deusa}, não a ${entrada.divindade}`;
            continue;
        }
        const restante = (Number(fonte.laMax) || 0) - (Number(fonte.usedLa) || 0);
        if (la > restante) {
            motivo = 'LA da Fonte esgotado';
            continue;
        }
        return '';
    }
    return motivo;
}

function avaliarItem(entrada, perfil) {
    const max = cotaMaxima(perfil.hierarquia, entrada.raridade);
    if (max === 0) return escondido();
    const chave = chaveRaridade(entrada.raridade);
    const usado = Number(perfil.cotasUsadas?.[chave]) || 0;
    if (Number.isFinite(max) && usado >= max) return mudo('cota de raridade esgotada');

    const limite = Number(perfil.pesoLimite) || 0;
    const depois = (Number(perfil.pesoAtual) || 0) + (Number(entrada.peso) || 0);
    if (limite > 0 && depois > limite * 2) return mudo('acima do dobro do inventário');
    if (limite > 0 && depois > limite) return livre('sobrecarga');
    return livre();
}

function avaliarAspecto(entrada, perfil) {
    const grupo = entrada.grupo;
    if (grupo === 'monstro') {
        if (!perfil.monstro) return escondido();
        if (temNome(perfil, entrada.nome)) return mudo('já na ficha');
        const anterior = nomeRankAnterior(entrada.nome);
        if (anterior && !temNome(perfil, anterior)) return escondido();
        const nivel = parseInt(perfil.nivel, 10) || 0;
        const gastos = perfil.gastos || {};
        if ((gastos.aspectoMonstro || 0) >= vagasAspectoMonstro(nivel)) return mudo('vaga de aspecto gasta');
        if (perfil.malsLivres === 0) return mudo('sem mal disponível');
        if (!ptCabe(entrada.custo ?? 2, perfil)) return mudo('PT insuficiente');
        return livre();
    }

    const besta = perfil.besta;
    if (!besta) return escondido();
    if ((besta.nomes || []).some(n => igual(n, entrada.nome))) return mudo('já na ficha');

    if (grupo === 'bio') {
        const peso = pesoRank(entrada.nivel || baseAspecto(entrada.nome).rank);
        if ((Number(besta.bioUsado) || 0) + peso > (Number(besta.bioLim) || 0)) return mudo('limite biológico');
        return livre();
    }

    if (grupo === 'treino') {
        if (!ptCabe(entrada.custo, perfil)) return mudo('PT insuficiente');
        return livre();
    }
    return escondido();
}

export function avaliar(entrada, perfil) {
    const ctx = perfil || {};
    if (!entrada) return escondido();
    if (entrada.kind === 'magia') return avaliarMagia(entrada, ctx);
    if (entrada.kind === 'item') return avaliarItem(entrada, ctx);
    if (entrada.kind === 'aspecto') return avaliarAspecto(entrada, ctx);
    return avaliarPoder(entrada, ctx);
}

export function contarGastos(owned, perfil) {
    const classe = normalizar(perfil?.classe);
    const ramo = normalizar(perfil?.ramo);
    const gastos = { ramo: 0, classe: 0, habito: 0, aspectoMonstro: 0 };
    for (const p of owned || []) {
        if (p.origem === 'ramo' && normalizar(p.classe) === classe && normalizar(p.ramo) !== ramo) gastos.ramo += 1;
        else if (p.origem === 'classe' && classe && normalizar(p.classe) !== classe) gastos.classe += 1;
        else if (p.origem === 'habito') gastos.habito += 1;
        else if (p.grupo === 'monstro' || p.origem === 'monstro') gastos.aspectoMonstro += 1;
    }
    return gastos;
}

export function textoPrereq(prereq) {
    return prereq?.texto || '';
}
