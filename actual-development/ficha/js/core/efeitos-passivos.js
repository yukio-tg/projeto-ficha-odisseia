// core/efeitos-passivos.js — Bônus fixos dos poderes, escritos no log de incrementos.
// Dado puro, sem DOM. Cada poder vira linhas { campo, tipo, valor } com `origem: 'poder:<Nome>'`.
// A fonte da lista é reference/glossario-passivas.md. Primeira fatia: PV, PM, PT e DEF fixos.

import { campoValido, TIPO_FLAT } from './incrementos.js';

export const PREFIXO_ORIGEM_PODER = 'poder:';

export const EFEITOS_PODERES = {
    'A Prática Supera a Teoria': [
        { campo: 'pv', valor: 8 },
        { campo: 'pm', valor: 5 },
    ],
    'A Teoria Supera a Prática': [
        { campo: 'pt', valor: 5 },
        { campo: 'pv', valor: -8 },
        { campo: 'pm', valor: -5 },
    ],
    'Auto-análise': [{ campo: 'pm', valor: 6 }],
    'Auto-didata': [{ campo: 'pt', valor: 5 }],
    'Auto-preservação': [{ campo: 'pv', valor: 10 }],
    'Patrulha': [{ campo: 'def', valor: 3 }],
    'Mana Sensível': [{ campo: 'def', valor: 2 }],
    // porNivel: o valor da linha é porNivel x nível da ficha, refeito a cada mudança de nível.
    'Calejado': [{ campo: 'pv', porNivel: 2 }],
    'Treino de Resistência': [{ campo: 'pv', porNivel: 2 }],
    'Vigor Flecha': [{ campo: 'pv', porNivel: 2 }],

    // Perícias e atributos sem escolha.
    'Sorte da Deusa': [{ campo: 'pericias:todas', valor: 1 }, { campo: 'pm', tipo: 'pct', valor: -20 }],
    'Provação da Deusa': [{ campo: 'pericias:todas', valor: -1 }, { campo: 'fe', tipo: 'pct', valor: 25 }],
    'Divino Inerente': [{ campo: 'fe', valor: 10 }, { campo: 'pv', valor: -10 }],
    'Ler Aura': [{ campo: 'pericias:CAR', valor: 2 }],
    'Fisiculturismo': [{ campo: 'pericias:CAR', valor: 2 }],

    // Ônus (cartões de Bônus/Ônus da aba Combate).
    'Macabro': [{ campo: 'pericias:CAR', valor: -5 }],
    'Malformado': [{ campo: 'pv', tipo: 'pct', valor: -20 }],

    // Com escolha: o jogador escolhe o alvo no cartão. Sem escolha, o poder não faz nada.
    // `escolha` diz de onde vêm as opções; `prefixo` diz que tipo de campo a linha escreve.
    'Atributo Extra': [{ escolha: 'atributo', prefixo: 'atributo', valor: 1 }],
    'Acrescento': [{ escolha: 'pericia', prefixo: 'pericia', valor: 1 }],
    'Treinamento de Perícia': [{ escolha: 'pericia', prefixo: 'grau', valor: 1 }],
    'Aprendizado Acadêmico': [{ escolha: 'pericia-sem-fisico', prefixo: 'grau', valor: 1 }],
    'Diplomacia': [{ escolha: 'pericia-social', prefixo: 'grau', valor: 1 }],

    // Itens: só valem equipados (botão "Equipado" no cartão do item).
    'Mochilão': [{ campo: 'inv', valor: 5 }],
    'Calçado de Marcha': [{ campo: 'desl', valor: 3 }],
    'Escudo de Pulso': [{ campo: 'def', valor: 1 }],
    'Utensílio': [{ escolha: 'pericia-item', prefixo: 'pericia', valor: 2 }],
    'Vestimenta': [{ escolha: 'pericia-item', prefixo: 'pericia', valor: 2 }],
};

/** Nomes de item com efeito fixo. O cartão mostra o botão "Equipado" só para eles. */
export const ITENS_COM_EFEITO = ['Mochilão', 'Calçado de Marcha', 'Escudo de Pulso', 'Utensílio', 'Vestimenta'];
export const LIMITE_EQUIPADO = { 'Vestimenta': 2 };
const ESCUDOS_QUE_ANULAM_PULSO = ['Escudo Leve', 'Escudo Pesado'];

export const PERICIAS = [
    ['Lutar', 'FOR'], ['Trabalho', 'FOR'], ['Esforço', 'CON'],
    ['Acrobacia', 'DES'], ['Atirar', 'DES'], ['Quietude', 'DES'], ['Reflexos', 'DES'],
    ['Ameaçar', 'CAR'], ['Convencer', 'CAR'], ['Mentir', 'CAR'],
    ['Cuidar', 'INT'], ['Cultura', 'INT'], ['Engenhosidade', 'INT'], ['Perspicácia', 'INT'],
    ['Magia', 'SAB'], ['Poder', 'SAB'],
];

/** Opções do seletor de escolha de um poder. */
export function opcoesEscolha(tipo) {
    if (tipo === 'atributo') return ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'];
    if (tipo === 'pericia') return PERICIAS.map(([n]) => n);
    if (tipo === 'pericia-sem-fisico') return PERICIAS.filter(([, a]) => a !== 'FOR' && a !== 'CON').map(([n]) => n);
    if (tipo === 'pericia-social') return ['Convencer', 'Mentir', 'Ameaçar'];
    if (tipo === 'pericia-item') return PERICIAS.map(([n]) => n).filter(n => n !== 'Lutar' && n !== 'Atirar');
    return [];
}

export function ehItemComEfeito(nome) {
    const n = normalizarNomePoder(nome);
    return ITENS_COM_EFEITO.some(i => normalizarNomePoder(i) === n);
}

/**
 * Itens equipados que realmente contam.
 * - Vestimenta: no máximo 2 (as duas primeiras da lista).
 * - Escudo de Pulso: não vale com Escudo Leve ou Pesado no inventário.
 * `todosNomes` são os nomes de todos os itens do inventário.
 */
export function itensQueContam(equipados, todosNomes = []) {
    const nomesTodos = new Set(todosNomes.map(normalizarNomePoder));
    const temEscudo = ESCUDOS_QUE_ANULAM_PULSO.some(e => nomesTodos.has(normalizarNomePoder(e)));
    const contagem = new Map();
    return (equipados || []).filter(it => {
        const chave = normalizarNomePoder(it.nome);
        if (chave === normalizarNomePoder('Escudo de Pulso') && temEscudo) return false;
        const limite = LIMITE_EQUIPADO[Object.keys(LIMITE_EQUIPADO).find(k => normalizarNomePoder(k) === chave)];
        const n = (contagem.get(chave) || 0) + 1;
        contagem.set(chave, n);
        return !limite || n <= limite;
    });
}

/** Tipo de escolha que o poder pede, ou null. */
export function escolhaDoPoder(nome) {
    const achado = POR_NOME.get(normalizarNomePoder(nome));
    return achado?.efeitos.find(e => e.escolha)?.escolha || null;
}

// Aspectos de Besta que mexem na vida da Besta (campo 'pm' do log da besta).
// Os três graus do mesmo aspecto não somam: vale o maior grau presente.
export const EFEITOS_ASPECTOS_BESTA = {
    'Volátil': { campo: 'pm', porNivelPorGrau: { I: 2, II: 3, III: 5 } },
};

export function normalizarNomePoder(nome) {
    return String(nome || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

const POR_NOME = new Map(
    Object.entries(EFEITOS_PODERES).map(([nome, efeitos]) => [normalizarNomePoder(nome), { nome, efeitos }])
);

function nivelValido(nivel) {
    const n = parseInt(nivel, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
}

const ROMANOS = { I: 1, II: 2, III: 3 };

export function ehLinhaDePoder(linha) {
    return typeof linha?.origem === 'string' && linha.origem.startsWith(PREFIXO_ORIGEM_PODER);
}

/**
 * Linhas que os cartões de poder pedem agora.
 * Os poderes da tabela não são repetíveis: só o primeiro cartão de cada nome conta.
 * O id é fixo (cartão + poder + campo), então sincronizar duas vezes não soma em dobro.
 */
export function linhasDesejadas(cartoes, nivel = 1) {
    const vistos = new Set();
    const out = [];
    (cartoes || []).forEach(({ id, nome, escolha }) => {
        const achado = POR_NOME.get(normalizarNomePoder(nome));
        if (!achado || !id) return;
        const chave = normalizarNomePoder(achado.nome);
        const pedeEscolha = achado.efeitos.some(e => e.escolha);
        // Poder com escolha pode ter vários cartões (cada um com sua escolha). Os outros contam uma vez.
        if (!pedeEscolha) {
            if (vistos.has(chave)) return;
            vistos.add(chave);
        }
        achado.efeitos.forEach(e => {
            let campo = e.campo;
            if (e.escolha) {
                if (!escolha || !opcoesEscolha(e.escolha).includes(escolha)) return;
                campo = `${e.prefixo}:${escolha}`;
            }
            if (!campoValido(campo)) return;
            const linha = {
                id: `poder_${id}_${chave.replace(/ /g, '-')}_${campo}`,
                campo,
                tipo: e.tipo || TIPO_FLAT,
                valor: e.porNivel ? e.porNivel * nivelValido(nivel) : e.valor,
                origem: `${PREFIXO_ORIGEM_PODER}${achado.nome}`,
            };
            if (e.porNivel) linha.porNivel = e.porNivel;
            out.push(linha);
        });
    });
    return out;
}

/**
 * Linhas dos aspectos de Besta. `aspectos` vem de b.hab.bio: { nome, nivel }.
 * O grau vem do sufixo do nome (Volátil II) ou, sem sufixo, do botão de grau do cartão.
 */
export function linhasAspectosBesta(aspectos, nivelBesta = 1) {
    const out = [];
    Object.entries(EFEITOS_ASPECTOS_BESTA).forEach(([base, cfg]) => {
        const baseNorm = normalizarNomePoder(base);
        let melhor = 0;
        (aspectos || []).forEach(a => {
            const nome = normalizarNomePoder(a?.nome);
            if (nome !== baseNorm && !/^(.*) (i|ii|iii)$/.test(nome)) return;
            const m = nome.match(/^(.*) (i|ii|iii)$/);
            if (nome !== baseNorm && m[1] !== baseNorm) return;
            const grau = m && m[1] === baseNorm ? m[2].toUpperCase() : String(a?.nivel || 'I').toUpperCase();
            melhor = Math.max(melhor, ROMANOS[grau] || 1);
        });
        if (!melhor) return;
        const grau = Object.keys(ROMANOS).find(g => ROMANOS[g] === melhor);
        const porNivel = cfg.porNivelPorGrau[grau];
        out.push({
            id: `aspecto_besta_${baseNorm}_${cfg.campo}`,
            campo: cfg.campo,
            tipo: TIPO_FLAT,
            valor: porNivel * nivelValido(nivelBesta),
            porNivel,
            origem: `${PREFIXO_ORIGEM_PODER}${base} ${grau}`,
        });
    });
    return out;
}

/**
 * Compara o log com as linhas pedidas.
 * - Linha pedida e ausente: entra.
 * - Linha de poder que ninguém pede mais: sai.
 * - Linha pedida e presente: fica (se o jogador editou o valor, a edição vale).
 *   Exceção: linha "por nível" é refeita a cada conferência, porque o nível muda.
 * - Linhas manuais e de outras origens não são tocadas.
 * Devolve { log, campos } com os campos que mudaram.
 */
export function reconciliarLinhas(log, desejadas) {
    const porId = new Map(desejadas.map(l => [l.id, l]));
    const campos = new Set();
    const atual = Array.isArray(log) ? log : [];

    const mantidas = atual.map(l => {
        if (!ehLinhaDePoder(l)) return l;
        const pedida = porId.get(l.id);
        if (!pedida) {
            campos.add(l.campo);
            return null;
        }
        if (pedida.porNivel && (l.valor !== pedida.valor || l.origem !== pedida.origem || l.porNivel !== pedida.porNivel)) {
            campos.add(l.campo);
            return { ...l, valor: pedida.valor, origem: pedida.origem, porNivel: pedida.porNivel };
        }
        return l;
    }).filter(Boolean);
    const idsPresentes = new Set(mantidas.map(l => l.id));
    desejadas.forEach(l => {
        if (idsPresentes.has(l.id)) return;
        mantidas.push(l);
        campos.add(l.campo);
    });
    return { log: mantidas, campos: Array.from(campos) };
}

/** Atalho para a ficha: cartões de poder e nível da ficha. */
export function reconciliar(log, cartoes, nivel = 1) {
    return reconciliarLinhas(log, linhasDesejadas(cartoes, nivel));
}
