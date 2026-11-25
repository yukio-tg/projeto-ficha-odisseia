// core/incrementos.js — Log de incrementos do modo Livre.
// Dado puro, sem DOM: o cálculo, o serializer e a UI consultam daqui.
//
// Cada linha é { id, campo, tipo: 'flat' | 'pct', valor }, mais `origem: 'manual'`
// na linha que registra o número digitado à mão (no máximo uma por campo).
// Fórmula por campo: (base do livro + Σflat) × (1 + Σpct/100), arredondada para baixo.
// O log vale nos dois modos (Regras e Livre). Linhas de poder levam `origem: 'poder:<Nome>'`.

export const TIPO_FLAT = 'flat';
export const TIPO_PCT = 'pct';
export const TIPO_DADO = 'dado';   // +Nd de dano (valor = quantidade de dados, pode ser negativo)
export const TIPO_NOTA = 'nota';   // só texto no painel; não entra em conta
export const ORIGEM_MANUAL = 'manual';

// Chaves iguais às dos antigos inputs `incr-<campo>-flat` / `incr-<campo>-pct`.
export const CAMPOS_INCREMENTO = {
    pv:    { rotulo: 'PV',        nome: 'Pontos de Vida' },
    pm:    { rotulo: 'PM',        nome: 'Pontos de Mana' },
    fe:    { rotulo: 'Fé',        nome: 'Pontos de Fé' },
    pt:    { rotulo: 'PT',        nome: 'Pontos de Treino' },
    la:    { rotulo: 'LA',        nome: 'Limite Arcano' },
    inv:   { rotulo: 'INV',       nome: 'Inventário' },
    def:   { rotulo: 'DEF',       nome: 'Defesa' },
    desl:  { rotulo: 'DESL',      nome: 'Deslocamento' },
    rd:    { rotulo: 'RD',        nome: 'Redução de dano' },
    dt:    { rotulo: 'DT',        nome: 'DT de magia (Sabedoria)' },
    attr:  { rotulo: 'Atributos', nome: 'Teto de pontos de atributo' },
    skill: { rotulo: 'Perícias',  nome: 'Teto de perícias' },
    bio:   { rotulo: 'Biológicos', nome: 'Limite de aspectos biológicos' },
};

export const ATRIBUTOS = ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR'];

/** Categorias de ataque. O cartão de ataque declara a sua pela perícia ou pelo alcance. */
export const CATEGORIAS_ATAQUE = ['todos', 'corpo', 'distancia', 'magia'];

// Campos "compostos": levam um argumento depois dos dois pontos.
//   atributo:FOR      bônus no valor do atributo
//   pericia:Lutar     bônus nos testes de uma perícia
//   pericias:todas    bônus em todas as perícias; pericias:CAR, nas perícias de um atributo
//   grau:Lutar        grau de proficiência grátis (não gasta o teto de pontos)
//   dano:corpo        dano dos ataques da categoria (todos | corpo | distancia | magia); aceita tipo `dado`
//   acerto:distancia  bônus no teste de ataque da categoria
//   margem:corpo      amplia a margem de ameaça (20 vira 20 - valor)
//   multi:corpo       soma ao multiplicador de crítico
//   alcance:distancia passos de alcance a mais
//   rd:mundano        redução de dano de um tipo (mundano, magico, Vento...)
//   vantagem:Lutar    +1 vantagem, -1 desvantagem; arg = perícia, atributo ou `todas`
//   nota:texto        só aviso, sem número
// Só o valor fixo vale para a maioria; porcentagem é ignorada.
const PREFIXOS_COMPOSTOS = [
    'atributo', 'pericia', 'pericias', 'grau',
    'dano', 'acerto', 'margem', 'multi', 'alcance', 'rd', 'vantagem', 'nota',
];
const PREFIXOS_DE_ATAQUE = ['dano', 'acerto', 'margem', 'multi', 'alcance'];

export function partesCampo(campo) {
    const txt = String(campo || '');
    const i = txt.indexOf(':');
    if (i < 0) return null;
    const prefixo = txt.slice(0, i);
    const arg = txt.slice(i + 1);
    if (!PREFIXOS_COMPOSTOS.includes(prefixo) || !arg) return null;
    return { prefixo, arg };
}

export function ehCampoComposto(campo) {
    return partesCampo(campo) !== null;
}

export function campoValido(campo) {
    if (Object.prototype.hasOwnProperty.call(CAMPOS_INCREMENTO, campo)) return true;
    const p = partesCampo(campo);
    if (!p) return false;
    if (p.prefixo === 'atributo') return ATRIBUTOS.includes(p.arg);
    if (p.prefixo === 'pericias') return p.arg === 'todas' || ATRIBUTOS.includes(p.arg);
    if (PREFIXOS_DE_ATAQUE.includes(p.prefixo)) return CATEGORIAS_ATAQUE.includes(p.arg);
    return true;
}

const NOME_CATEGORIA = { todos: 'todos os ataques', corpo: 'ataques corpo a corpo', distancia: 'ataques à distância', magia: 'ataques de magia' };

/** Rótulo curto e nome longo de qualquer campo, para o painel. */
export function rotuloCampo(campo) {
    if (CAMPOS_INCREMENTO[campo]) return CAMPOS_INCREMENTO[campo];
    const p = partesCampo(campo);
    if (!p) return { rotulo: String(campo), nome: '' };
    if (p.prefixo === 'atributo') return { rotulo: p.arg, nome: `Atributo ${p.arg}` };
    if (p.prefixo === 'pericia') return { rotulo: p.arg, nome: `Testes de ${p.arg}` };
    if (p.prefixo === 'grau') return { rotulo: `Grau ${p.arg}`, nome: `Grau de proficiência em ${p.arg} (grátis)` };
    const cat = NOME_CATEGORIA[p.arg] || p.arg;
    if (p.prefixo === 'dano') return { rotulo: `Dano ${p.arg}`, nome: `Dano de ${cat}` };
    if (p.prefixo === 'acerto') return { rotulo: `Acerto ${p.arg}`, nome: `Teste de ataque de ${cat}` };
    if (p.prefixo === 'margem') return { rotulo: `Margem ${p.arg}`, nome: `Margem de ameaça de ${cat}` };
    if (p.prefixo === 'multi') return { rotulo: `Crítico ${p.arg}`, nome: `Multiplicador de crítico de ${cat}` };
    if (p.prefixo === 'alcance') return { rotulo: `Alcance ${p.arg}`, nome: `Alcance de ${cat} (em passos)` };
    if (p.prefixo === 'rd') return { rotulo: `RD ${p.arg}`, nome: `Redução de dano ${p.arg}` };
    if (p.prefixo === 'vantagem') return { rotulo: `Vantagem ${p.arg === 'todas' ? 'geral' : p.arg}`, nome: `Vantagem (+1) ou desvantagem (-1) em testes: ${p.arg}` };
    if (p.prefixo === 'nota') return { rotulo: 'Aviso', nome: p.arg };
    return p.arg === 'todas'
        ? { rotulo: 'Perícias', nome: 'Testes de todas as perícias' }
        : { rotulo: `Perícias ${p.arg}`, nome: `Testes das perícias de ${p.arg}` };
}

/** Sem acento, minúsculo, sem espaços nas pontas: para comparar nomes. */
export function chaveNome(nome) {
    return String(nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** Linha desligada pelo jogador no painel (`ativo: false`) não conta. */
function conta(l) {
    return l && l.ativo !== false;
}

/** Soma só as linhas fixas de um campo composto. */
function somaFlat(log, campo) {
    let total = 0;
    (log || []).forEach(l => {
        if (conta(l) && l.campo === campo && l.tipo !== TIPO_PCT && l.tipo !== TIPO_DADO && l.tipo !== TIPO_NOTA) total += Number(l.valor) || 0;
    });
    return total;
}

/** Soma dos dados (+1d, -1d) de um campo. */
function somaDados(log, campo) {
    let total = 0;
    (log || []).forEach(l => {
        if (conta(l) && l.campo === campo && l.tipo === TIPO_DADO) total += Number(l.valor) || 0;
    });
    return total;
}

/** Bônus de ataque de um cartão: soma `<tipo>:todos` com `<tipo>:<categoria>`. */
export function bonusAtaqueEm(log, categoria) {
    const soma = (prefixo) => somaFlat(log, `${prefixo}:todos`) + (categoria !== 'todos' ? somaFlat(log, `${prefixo}:${categoria}`) : 0);
    return {
        dano: soma('dano'),
        dados: somaDados(log, 'dano:todos') + (categoria !== 'todos' ? somaDados(log, `dano:${categoria}`) : 0),
        acerto: soma('acerto'),
        margem: soma('margem'),
        multi: soma('multi'),
        alcance: soma('alcance'),
    };
}

/** Vantagem líquida em uma perícia: positivo = vantagem, negativo = desvantagem, 0 = nada ou se anulam. */
export function vantagemEm(log, nomePericia, attrDaPericia) {
    let total = somaFlat(log, 'vantagem:todas');
    if (attrDaPericia) total += somaFlat(log, `vantagem:${attrDaPericia}`);
    (log || []).forEach(l => {
        const p = partesCampo(l.campo);
        if (conta(l) && p?.prefixo === 'vantagem' && chaveNome(p.arg) === chaveNome(nomePericia)) total += Number(l.valor) || 0;
    });
    return Math.sign(total);
}

/** RD por tipo: { mundano: 5, Vento: 5 }. */
export function rdPorTipoEm(log) {
    const out = {};
    (log || []).forEach(l => {
        const p = partesCampo(l.campo);
        if (conta(l) && p?.prefixo === 'rd' && l.tipo !== TIPO_PCT && l.tipo !== TIPO_NOTA) out[p.arg] = (out[p.arg] || 0) + (Number(l.valor) || 0);
    });
    return out;
}

export function bonusAtributoEm(log, attr) {
    return somaFlat(log, `atributo:${attr}`);
}

/** Bônus nos testes: perícia pelo nome, grupo do atributo dela e todas. */
export function bonusPericiaEm(log, nomePericia, attrDaPericia) {
    const alvo = chaveNome(nomePericia);
    let total = somaFlat(log, 'pericias:todas');
    if (attrDaPericia) total += somaFlat(log, `pericias:${attrDaPericia}`);
    (log || []).forEach(l => {
        const p = partesCampo(l.campo);
        if (conta(l) && p?.prefixo === 'pericia' && l.tipo !== TIPO_PCT && chaveNome(p.arg) === alvo) total += Number(l.valor) || 0;
    });
    return total;
}

export function grauExtraEm(log, nomePericia) {
    const alvo = chaveNome(nomePericia);
    let total = 0;
    (log || []).forEach(l => {
        const p = partesCampo(l.campo);
        if (conta(l) && p?.prefixo === 'grau' && l.tipo !== TIPO_PCT && chaveNome(p.arg) === alvo) total += Number(l.valor) || 0;
    });
    return total;
}

let _seq = 0;
function novoId() {
    _seq += 1;
    return `inc_${Date.now().toString(36)}_${_seq.toString(36)}`;
}

function normalizarLinha(linha) {
    if (!linha || typeof linha !== 'object') return null;
    const campo = String(linha.campo || '');
    if (!campoValido(campo)) return null;
    const tipo = [TIPO_PCT, TIPO_DADO, TIPO_NOTA].includes(linha.tipo) ? linha.tipo : TIPO_FLAT;
    // Nota não tem número: o valor é só um marcador.
    const valor = tipo === TIPO_NOTA ? 1 : Number(linha.valor);
    if (!Number.isFinite(valor) || valor === 0) return null;
    const id = linha.id ? String(linha.id) : novoId();
    const out = { id, campo, tipo, valor };
    if (linha.origem === ORIGEM_MANUAL) out.origem = ORIGEM_MANUAL;
    else if (typeof linha.origem === 'string' && linha.origem.startsWith('poder:')) out.origem = linha.origem;
    const porNivel = Number(linha.porNivel);
    if (Number.isFinite(porNivel) && porNivel !== 0 && out.origem?.startsWith('poder:')) out.porNivel = porNivel;
    if (linha.ativo === false) out.ativo = false;
    if (typeof linha.texto === 'string' && linha.texto) out.texto = linha.texto.slice(0, 200);
    return out;
}

export function ehManual(linha) {
    return linha?.origem === ORIGEM_MANUAL;
}

/** Linhas inválidas, de campo desconhecido ou com valor zero são descartadas. */
export function normalizarLog(arr) {
    if (!Array.isArray(arr)) return [];
    const vistos = new Set();
    const manuais = new Set();
    const out = [];
    arr.forEach(l => {
        const n = normalizarLinha(l);
        if (!n || vistos.has(n.id)) return;
        if (ehManual(n)) {
            if (manuais.has(n.campo)) return;
            manuais.add(n.campo);
        }
        vistos.add(n.id);
        out.push(n);
    });
    return out;
}

// ── Fórmula ──────────────────────────────────────────────────────────────────

export function aplicarIncremento(base, flat = 0, pct = 0) {
    const b = Number(base) || 0;
    return Math.floor((b + (Number(flat) || 0)) * (1 + (Number(pct) || 0) / 100));
}

export function somarIncrementos(log, campo) {
    let flat = 0;
    let pct = 0;
    (log || []).forEach(l => {
        if (!conta(l) || l.campo !== campo || l.tipo === TIPO_DADO || l.tipo === TIPO_NOTA) return;
        if (l.tipo === TIPO_PCT) pct += Number(l.valor) || 0;
        else flat += Number(l.valor) || 0;
    });
    return { flat, pct };
}

export function valorComIncrementos(base, log, campo) {
    const { flat, pct } = somarIncrementos(log, campo);
    return aplicarIncremento(base, flat, pct);
}

/** Mesmo cálculo de `incrementar`, para um log que não é o da ficha (ex.: uma besta). */
export function incrementarEm(log, campo, base) {
    return valorComIncrementos(base, log, campo);
}

/**
 * Flat da linha manual para o campo terminar no número digitado, com os outros
 * incrementos do campo mantidos: digitado/(1 + Σpct/100) − base − Σflat.
 * Prefere inteiro; com % que não fecha em inteiro, usa duas casas, arredondando
 * para cima, para o piso da fórmula cair exatamente no digitado.
 * Devolve null quando não há como chegar ao número (base ausente ou fator ≤ 0).
 */
export function calcularFlatManual(digitado, base, log, campo) {
    if (base == null || digitado == null) return null;
    const alvo = Number(digitado);
    const b = Number(base);
    if (!Number.isFinite(alvo) || !Number.isFinite(b)) return null;
    const outros = (log || []).filter(l => l.campo === campo && !ehManual(l));
    const { flat, pct } = somarIncrementos(outros, campo);
    const fator = 1 + pct / 100;
    if (fator <= 0) return null;
    const bruto = alvo / fator - b - flat;
    const fecha = (f) => aplicarIncremento(b, flat + f, pct) === alvo;
    const r = Math.round(bruto);
    for (const f of [r, Math.ceil(bruto), Math.floor(bruto)]) {
        if (fecha(f)) return f === 0 ? 0 : f;
    }
    let dec = Math.ceil(bruto * 100 - 1e-9) / 100;
    for (let i = 0; i < 3 && !fecha(dec); i++) dec = Math.round((dec + 0.01) * 100) / 100;
    return dec;
}

/** Cria, atualiza ou remove (flat 0) a linha manual do campo. Devolve um log novo. */
export function aplicarAjusteManual(log, campo, flat) {
    const atual = normalizarLog(log);
    const idx = atual.findIndex(l => l.campo === campo && ehManual(l));
    const valor = Number(flat);
    if (!Number.isFinite(valor) || valor === 0) {
        if (idx >= 0) atual.splice(idx, 1);
        return atual;
    }
    if (idx >= 0) {
        atual[idx] = { ...atual[idx], tipo: TIPO_FLAT, valor };
        return atual;
    }
    atual.push({ id: novoId(), campo, tipo: TIPO_FLAT, valor, origem: ORIGEM_MANUAL });
    return atual;
}

/** Troca tipo e/ou valor de uma linha. Valor 0 ou inválido remove a linha. */
export function aplicarEdicao(log, id, { tipo, valor, ativo } = {}) {
    const atual = normalizarLog(log);
    const idx = atual.findIndex(l => l.id === id);
    if (idx < 0) return atual;
    const linha = { ...atual[idx] };
    if (tipo !== undefined) linha.tipo = tipo === TIPO_PCT ? TIPO_PCT : (tipo === TIPO_DADO ? TIPO_DADO : TIPO_FLAT);
    if (valor !== undefined) linha.valor = Number(valor);
    if (ativo !== undefined) {
        if (ativo) delete linha.ativo; else linha.ativo = false;
    }
    const n = normalizarLinha(linha);
    if (n) atual[idx] = n;
    else atual.splice(idx, 1);
    return atual;
}

export function camposComIncremento(log) {
    return Array.from(new Set((log || []).map(l => l.campo)));
}

// ── Estado do log ────────────────────────────────────────────────────────────

let _log = [];

export function getIncrementos() {
    return _log.map(l => ({ ...l }));
}

export function setIncrementos(arr) {
    _log = normalizarLog(arr);
}

/** O log vale nos dois modos: Regras e Livre acumulam as mesmas linhas. */
export function incrementosAtivos() {
    return _log;
}

/** Base do livro com a camada de incrementos do campo, se o modo Livre estiver ligado. */
export function incrementar(campo, base) {
    return valorComIncrementos(base, incrementosAtivos(), campo);
}

export function getBonusAtributo(attr) { return bonusAtributoEm(_log, attr); }
export function getBonusPericia(nome, attr) { return bonusPericiaEm(_log, nome, attr); }
export function getGrauExtra(nome) { return grauExtraEm(_log, nome); }
export function getBonusAtaque(categoria) { return bonusAtaqueEm(_log, categoria); }
export function getVantagem(nome, attr) { return vantagemEm(_log, nome, attr); }
export function getRdPorTipo() { return rdPorTipoEm(_log); }

/** Linhas de aviso (tipo nota) ativas, para mostrar onde couber. */
export function getNotas() { return _log.filter(l => conta(l) && l.tipo === TIPO_NOTA); }

export function adicionarIncremento(campo, tipo, valor) {
    const linha = normalizarLinha({ campo, tipo, valor });
    if (!linha) return null;
    _log.push(linha);
    return { ...linha };
}

/** Remove só a linha pedida. Devolve a linha removida, ou null. */
export function removerIncremento(id) {
    const idx = _log.findIndex(l => l.id === id);
    if (idx < 0) return null;
    const [removida] = _log.splice(idx, 1);
    return { ...removida };
}

export function registrarAjusteManual(campo, flat) {
    _log = aplicarAjusteManual(_log, campo, flat);
    return _log.find(l => l.campo === campo && ehManual(l)) || null;
}

/** Devolve a linha editada (ou null se a edição a removeu). */
export function editarIncremento(id, patch) {
    _log = aplicarEdicao(_log, id, patch);
    const l = _log.find(x => x.id === id);
    return l ? { ...l } : null;
}

export function removerIncrementosDoCampo(campo) {
    const antes = _log.length;
    _log = _log.filter(l => l.campo !== campo);
    return antes - _log.length;
}

// ── Migração dos inputs da aba Configurações ─────────────────────────────────

const LEGADO_RE = /^incr-([a-z]+)-(flat|pct)$/;

export function ehCampoLegado(chave) {
    return LEGADO_RE.test(chave);
}

/**
 * Saves antigos guardavam o bônus em fields['incr-<campo>-flat|pct'].
 * Sem `incrementos` no blob, esses números viram linhas do log.
 * Com `incrementos` no blob, a migração já aconteceu e nada é criado.
 * Nos dois casos a fonte antiga sai de `fields`, para o bônus não contar duas vezes.
 */
export function migrarIncrementosLegados(data) {
    const fieldsOrig = (data && data.fields) || {};
    const fields = {};
    const legado = [];
    Object.entries(fieldsOrig).forEach(([chave, valor]) => {
        const m = chave.match(LEGADO_RE);
        if (!m) {
            fields[chave] = valor;
            return;
        }
        const [, campo, tipo] = m;
        if (!campoValido(campo)) return;
        const n = tipo === TIPO_PCT ? parseFloat(valor) : parseInt(valor, 10);
        if (Number.isFinite(n) && n !== 0) {
            legado.push({ id: `legado_${campo}_${tipo}`, campo, tipo, valor: n });
        }
    });

    if (Array.isArray(data?.incrementos)) {
        return { incrementos: normalizarLog(data.incrementos), fields, migrou: false };
    }
    return { incrementos: normalizarLog(legado), fields, migrou: legado.length > 0 };
}
