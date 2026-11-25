// ui/grimorio-ui.js — Grimório: assistente da ficha, painel acoplado (não modal).
// A regra de quem aparece e de quem pode ser colocado fica em core/grimorio-acesso.js.

import { normalizar } from '../core/utils.js';
import { getNivel, getAtributoBase } from '../core/radar-service.js';
import { getFontes } from '../core/item-effects.js';
import {
    avaliar,
    contarGastos,
    textoPrereq,
    limitesDaHierarquia,
    chaveRaridade,
    MALS_MONSTRO,
} from '../core/grimorio-acesso.js';
import { getPoderesCatalogo, adicionarPoderCatalogo } from './powers.js';
import { getMagiasCatalogo, adicionarMagiaCatalogo } from './magias.js';
import { getItensCatalogo, adicionarItemCatalogo } from './inventory.js';
import { listarBestasConsulta, adicionarAspectoNaBesta } from './besta.js';
import { ASPECTOS_BIO, ASPECTOS_TREINO } from '../config/aspectos-besta.js';

const ABAS = [
    { id: 'sugestoes', nome: 'Sugestões', runa: 'K' },
    { id: 'poderes', nome: 'Poderes', runa: 'P' },
    { id: 'magias', nome: 'Magias', runa: 'M' },
    { id: 'itens', nome: 'Itens', runa: 'N' },
    { id: 'besta', nome: 'Besta', runa: 'A' },
];

const RARIDADES = ['banal', 'comum', 'incomum', 'raro', 'epico', 'lendario'];
const NOME_RARIDADE = ['Banal', 'Comum', 'Incomum', 'Raro', 'Épico', 'Lendário'];
const SUBTIPOS = ['Ofensivo', 'Defensivo', 'Movimentacional', 'Temperamental', 'Optativo'];
const GRUPOS_ITEM = { arma: 'Armas', 'proteção': 'Proteções', 'básico': 'Itens básicos', fonte: 'Fontes' };
const TRADICOES = { arcanismo: 'Arcanismo', feromancia: 'Feromancia', teurgia: 'Teurgia' };
const TAG_TIPO = { poder: 'Poder', magia: 'Magia', item: 'Item', aspecto: 'Besta' };
const ORDEM_SECOES = ['Armas', 'Proteções', 'Itens básicos', 'Fontes', 'Arcanismo', 'Feromancia', 'Teurgia',
    'Aspectos biológicos', 'Aspectos de treino'];
const LIMITE_GRUPO = 6;   // linhas visíveis por grupo antes do "Ver mais"
const LIMITE_FALTA = 12;  // linhas de "Ver o que falta" antes do "Ver mais"

let painel = null;
let btn = null;
let listaEl = null;
let buscaEl = null;
let abasEl = null;
let alvoEl = null;
let contextoEl = null;
let zonaEl = null;
let aberta = false;
let aba = 'sugestoes';
let busca = '';
let bestaId = '';
let pendente = '';
let faltaAberta = false;
let temporizador = 0;
const expandidos = new Set();
const gruposAbertos = new Set();

// ── Leitura da ficha ────────────────────────────────────────────────────────

function leitura() {
    return document.body.classList.contains('mode-readonly');
}

function num(seletor) {
    const n = parseInt(document.querySelector(seletor)?.value, 10);
    return Number.isFinite(n) ? n : 0;
}

function nomesDos(seletor, ler) {
    return [...document.querySelectorAll(seletor)].map(ler).map(s => (s || '').trim()).filter(Boolean);
}

// Mesma condição da aba Besta da ficha (besta.js, checkBestaTabVisibility).
function temAbaBesta() {
    const classe = (document.querySelector('[data-field="classe-nome"]')?.value || '').trim().toLowerCase();
    const vinculo = (document.querySelector('[data-field="besta-nome"]')?.value || '').trim().toLowerCase();
    return classe === 'treinador' || (vinculo !== '' && vinculo !== 'nenhum');
}

function perfilAtual() {
    const poderes = getPoderesCatalogo();
    const nomes = [];
    const owned = [];
    for (const card of document.querySelectorAll('.powers-container .card-power')) {
        const nome = card.querySelector('.power-name-input')?.value?.trim() || '';
        if (!nome) continue;
        nomes.push(nome);
        if (card.dataset.grimorioGrupo === 'monstro') {
            owned.push({ grupo: 'monstro', nome });
            continue;
        }
        const pt = parseInt(card.querySelector('.pt-cost-input')?.value, 10) || 0;
        const hits = poderes.filter(p => normalizar(p.nome) === normalizar(nome)
            && ['classe', 'ramo', 'geral', 'habito'].includes(p.origem));
        const hit = hits.find(p => Number(p.ptCost) === pt) || (hits.length === 1 ? hits[0] : null);
        if (hit) owned.push(hit);
        else if (ASPECTOS_BIO.some(a => normalizar(a.nome) === normalizar(nome))) owned.push({ grupo: 'monstro', nome });
    }
    const bestas = listarBestasConsulta();
    if (!bestaId || !bestas.some(b => b.id === bestaId)) bestaId = bestas[0]?.id || '';
    const cotasUsadas = { banal: 0, comum: 0, incomum: 0, raro: 0, epico: 0, lendario: 0 };
    document.querySelectorAll('.item-card').forEach(card => {
        const estado = card.querySelector('.item-estado-select')?.value;
        if (estado && estado !== 'padrao') return;
        const chave = normalizar(card.dataset.raridade || '');
        if (chave in cotasUsadas) cotasUsadas[chave] += 1;
    });
    const selHierarquia = document.querySelector('[data-field="hierarquia"]');
    const base = {
        nivel: getNivel(),
        classe: document.querySelector('[data-field="classe-nome"]')?.value?.trim() || '',
        ramo: document.querySelector('[data-field="ramo-nome"]')?.value?.trim() || '',
        alinhamento: document.querySelector('[data-field="alinhamento-nome"]')?.value?.trim() || '',
        sabedoria: getAtributoBase('SAB'),
        monstro: document.querySelector('[data-field="monstro"]')?.checked ?? false,
        hierarquia: selHierarquia?.value || 'pobre',
        hierarquiaNome: (selHierarquia?.selectedOptions?.[0]?.textContent || selHierarquia?.value || 'pobre').trim().toLowerCase(),
        ptRestante: num('[data-field="pt-total"]') - num('[data-field="pt-atual"]'),
        laRestante: num('[data-field="la-total"]') - num('[data-field="la-atual"]'),
        pesoAtual: num('[data-field="inv-atual"]'),
        pesoLimite: num('[data-field="inv-total"]'),
        cotasUsadas,
        nomes,
        nomesMagia: nomesDos('.magic-card .magic-nome', el => el.textContent),
        fontes: getFontes().map(f => ({
            deusa: f.deusa, grauMax: f.grauMax, laMax: f.laMax, usedLa: f.usedLa, raridade: f.raridade,
        })),
        besta: bestas.find(b => b.id === bestaId) || null,
        bestas,
        malsLivres: MALS_MONSTRO.filter(m => !nomes.some(n => normalizar(n) === normalizar(`Mal: ${m.nome}`))).length,
    };
    base.gastos = contarGastos(owned, base);
    return base;
}

// ── Claro ou escuro: mede o brilho do pergaminho da ficha (sem opção do jogador) ──

function brilhoDoPergaminho() {
    const amostra = document.createElement('i');
    amostra.style.cssText = 'position:absolute;width:0;height:0;background:var(--sheet-bg);';
    document.body.appendChild(amostra);
    const cor = getComputedStyle(amostra).backgroundColor;
    amostra.remove();
    const tela = document.createElement('canvas');
    tela.width = tela.height = 1;
    const ctx = tela.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 1;
    ctx.fillStyle = '#e8dcc0';
    ctx.fillStyle = cor;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function detectarPergaminho() {
    if (!painel) return;
    painel.classList.toggle('grimorio--escuro', brilhoDoPergaminho() < 0.4);
}

// ── Montagem das entradas (usam as regras de grimorio-acesso.js) ──────────────

function descricaoMagia(m) {
    const partes = [];
    if (m.custo) partes.push(`Custo: ${m.custo}`);
    if (m.descricao) partes.push(m.descricao);
    if (m.descricao_geral) partes.push(m.descricao_geral);
    if (m.descricao_sucesso) partes.push('Sucesso: ' + m.descricao_sucesso);
    if (m.descricao_fracasso) partes.push('Fracasso: ' + m.descricao_fracasso);
    (m.aprimoramentos || []).forEach(a => partes.push(`${a.custo || ''} ${a.descricao || ''}`.trim()));
    return partes.filter(Boolean);
}

function finalizar(entrada, resultado) {
    const ja = resultado.motivo === 'já na ficha';
    return { ...entrada, ...resultado, ja, falta: resultado.visivel && !resultado.podeAdicionar && !ja };
}

function entradaPoder(p, perfil) {
    const origem = p.origem;
    let secao = 'Poderes gerais';
    if (origem === 'classe') secao = 'Habilidades de classe';
    else if (origem === 'ramo') secao = `Ramo ${p.ramo || ''}`.trim();
    else if (origem === 'habito') secao = 'Hábito';
    return finalizar({
        key: `poder:${normalizar(p.nome)}:${p.ptCost}:${p.classe || ''}:${p.ramo || ''}`,
        kind: 'poder',
        nome: p.nome,
        custo: origem === 'habito' ? (p.otherCosts || 'Hábito') : `${Number(p.ptCost) || 0} PT${p.otherCosts ? ' ' + p.otherCosts : ''}`,
        descricao: [p.descricao || ''].filter(Boolean),
        prereq: textoPrereq(p.prereq),
        secao,
        raw: p,
    }, avaliar({ kind: 'poder', ...p }, perfil));
}

function entradaMagia(m, perfil) {
    const grau = m.grau === 'S' ? 'S' : (parseInt(m.grau, 10) || 1);
    const la = m.fe || m.la || 1;
    const tradicao = normalizar(m.tipo);
    return finalizar({
        key: `magia:${normalizar(m.nome)}:${m.tipo}`,
        kind: 'magia',
        nome: m.nome,
        custo: `${grau}° · LA ${la}`,
        descricao: descricaoMagia(m),
        prereq: m.divindade ? `Divindade: ${m.divindade}` : '',
        secao: TRADICOES[tradicao] || 'Magia',
        ordem: [Object.keys(TRADICOES).indexOf(tradicao), grau === 'S' ? 9 : grau, Number(la) || 0],
        raw: m,
    }, avaliar({ kind: 'magia', nome: m.nome, tradicao: m.tipo, grau, la, divindade: m.divindade || '' }, perfil));
}

function entradaItem(item, perfil) {
    const chave = chaveRaridade(item.raridade);
    const idx = Math.max(0, RARIDADES.indexOf(chave));
    return finalizar({
        key: `item:${normalizar(item.nome)}`,
        kind: 'item',
        nome: item.nome,
        custo: `${Number(item.peso) || 0} Inv.`,
        tag: NOME_RARIDADE[idx],
        descricao: [item.descricao || ''].filter(Boolean),
        prereq: '',
        secao: GRUPOS_ITEM[item.categoria] || 'Itens básicos',
        ordem: [idx],
        raw: item,
    }, avaliar({ kind: 'item', nome: item.nome, raridade: item.raridade, peso: item.peso }, perfil));
}

function entradaAspecto(a, grupo, perfil) {
    const custo = grupo === 'treino' ? `${a.custo} PT` : (grupo === 'monstro' ? '2 PT' : `Nível ${a.nivel}`);
    const secao = grupo === 'treino' ? 'Aspectos de treino'
        : grupo === 'monstro' ? 'Aspectos de monstro' : 'Aspectos biológicos';
    return finalizar({
        key: `aspecto:${grupo}:${normalizar(a.nome)}`,
        kind: 'aspecto',
        grupo,
        nome: a.nome,
        custo,
        descricao: [a.desc || a.descricao || ''].filter(Boolean),
        prereq: '',
        secao,
        sub: grupo === 'bio' ? a.subtipo : '',
        raw: a,
    }, avaliar({ kind: 'aspecto', grupo, nome: a.nome, nivel: a.nivel, custo: grupo === 'monstro' ? 2 : a.custo }, perfil));
}

function catalogo(perfil) {
    const poderes = getPoderesCatalogo()
        .filter(p => ['classe', 'ramo', 'geral', 'habito'].includes(p.origem))
        .map(p => entradaPoder(p, perfil));
    const magias = getMagiasCatalogo().map(m => entradaMagia(m, perfil));
    const itens = getItensCatalogo().map(i => entradaItem(i, perfil));
    const aspectos = [];
    if (perfil.monstro) ASPECTOS_BIO.forEach(a => aspectos.push(entradaAspecto({ ...a, custo: 2 }, 'monstro', perfil)));
    if (temAbaBesta() && perfil.besta) {
        ASPECTOS_BIO.forEach(a => aspectos.push(entradaAspecto(a, 'bio', perfil)));
        ASPECTOS_TREINO.forEach(a => aspectos.push(entradaAspecto(a, 'treino', perfil)));
    }
    return { poderes, magias, itens, aspectos };
}

// Sugestões: o que combina com a ficha e cabe agora (mistura de tipos).
function sugestoes(cat, perfil) {
    const livres = lista => lista.filter(e => e.visivel && e.podeAdicionar);
    const classe = normalizar(perfil.classe);
    const tradicaoPreferida = { arcanista: 'arcanismo', feromantico: 'feromancia', teurgista: 'teurgia' }[classe];
    const proprios = livres(cat.poderes).filter(e => ['classe', 'ramo'].includes(e.raw.origem));
    const gerais = livres(cat.poderes).filter(e => e.raw.origem === 'geral');
    const magias = livres(cat.magias).sort((a, b) => {
        const pa = normalizar(a.raw.tipo) === tradicaoPreferida ? 0 : 1;
        const pb = normalizar(b.raw.tipo) === tradicaoPreferida ? 0 : 1;
        return pa - pb || a.ordem[1] - b.ordem[1] || a.ordem[2] - b.ordem[2];
    });
    const itens = livres(cat.itens).filter(e => e.ordem[0] <= 1).sort((a, b) => a.ordem[0] - b.ordem[0]);
    const bio = livres(cat.aspectos).filter(e => e.grupo === 'bio' && /Ofensivo|Defensivo/.test(e.sub || ''));
    return [...proprios.slice(0, 3), ...gerais.slice(0, 1), ...magias.slice(0, 2), ...itens.slice(0, 2), ...bio.slice(0, 2)];
}

// ── Pintura ───────────────────────────────────────────────────────────────────

function el(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
}

function botao(classe, texto) {
    const b = el('button', classe, texto);
    b.type = 'button';
    return b;
}

function ordemPoder(nome, perfil) {
    if (nome === 'Habilidades de classe') return '0';
    if (nome.startsWith('Ramo ')) return (normalizar(nome.slice(5)) === normalizar(perfil.ramo) ? '1a' : '1b') + nome;
    if (nome === 'Poderes gerais') return '2';
    if (nome === 'Hábito') return '3';
    return '4' + nome;
}

function comparar(a, b) {
    const oa = a.ordem || [];
    const ob = b.ordem || [];
    for (let i = 0; i < Math.max(oa.length, ob.length); i += 1) {
        const d = (oa[i] || 0) - (ob[i] || 0);
        if (d) return d;
    }
    return a.nome.localeCompare(b.nome, 'pt');
}

/**
 * Quantos itens iguais ou equivalentes a este já estão no inventário (soma as quantidades).
 * Equivalente: mesmo nome, sem contar maiúsculas, acentos nem um sufixo de numeração
 * ("Arco Curto 2", "Arco Curto (2)", "Arco Curto x2").
 */
function quantosNaFicha(nome) {
    const alvo = normalizar(nome);
    let total = 0;
    document.querySelectorAll('.item-card').forEach(card => {
        const escrito = normalizar(card.querySelector('.item-nome-input')?.value || '')
            .replace(/\s*(\([^)]*\)|x?\s*\d+)\s*$/, '').trim();
        if (escrito !== alvo) return;
        total += Math.max(1, parseInt(card.querySelector('.item-quantidade')?.value, 10) || 1);
    });
    return total;
}

function criarLinha(e, comTipo) {
    const li = el('div', 'grimorio__item' + (e.falta ? ' is-falta' : '') + (e.ja ? ' is-ja' : ''));
    const cab = el('div', 'grimorio__item-cab');
    const aberto = expandidos.has(e.key);
    const nome = botao('grimorio__nome', e.nome);
    nome.setAttribute('aria-expanded', String(aberto));
    nome.dataset.fk = `${e.key}|nome`;
    cab.appendChild(nome);
    if (e.kind === 'item') {
        const qtd = quantosNaFicha(e.nome);
        if (qtd > 0) {
            const marca = el('span', 'grimorio__qtd', `x${qtd}`);
            marca.setAttribute('aria-label', `${qtd} na ficha`);
            marca.title = `${qtd} ${qtd === 1 ? 'igual já está' : 'iguais já estão'} na ficha`;
            cab.appendChild(marca);
        }
    }
    const tag = e.kind === 'item'
        ? (comTipo ? `Item · ${e.tag}` : e.tag)
        : (comTipo ? TAG_TIPO[e.kind] : '');
    if (tag) cab.appendChild(el('span', 'grimorio__tag' + (e.kind === 'item' ? ` grimorio__tag--r${RARIDADES.indexOf(chaveRaridade(e.raw.raridade))}` : ''), tag));
    cab.appendChild(el('span', 'grimorio__custo', e.custo));

    const corpo = el('div', 'grimorio__corpo');
    corpo.hidden = !aberto;
    if (e.prereq) corpo.appendChild(el('p', 'grimorio__pre', `Pré-requisito: ${e.prereq}`));
    e.descricao.forEach(t => corpo.appendChild(el('p', '', t)));
    nome.addEventListener('click', () => {
        corpo.hidden = !corpo.hidden;
        nome.setAttribute('aria-expanded', String(!corpo.hidden));
        if (corpo.hidden) expandidos.delete(e.key); else expandidos.add(e.key);
    });

    if (e.ja) {
        cab.appendChild(el('span', 'grimorio__ja', 'Na ficha'));
    } else if (e.podeAdicionar && !leitura()) {
        const b = botao('grimorio__colocar', 'Colocar');
        b.setAttribute('aria-label', `Colocar ${e.nome} na ficha`);
        b.dataset.fk = `${e.key}|colocar`;
        b.addEventListener('click', () => colocar(e));
        cab.appendChild(b);
    }
    li.append(cab, corpo);
    if (e.falta && e.motivo) li.appendChild(el('p', 'grimorio__motivo', e.motivo));
    else if (e.aviso) li.appendChild(el('p', 'grimorio__motivo', e.aviso));
    if (pendente === e.key && e.grupo === 'monstro' && e.podeAdicionar) li.appendChild(escolherMal(e));
    return li;
}

function escolherMal(e) {
    const caixa = el('div', 'grimorio__mals');
    caixa.appendChild(el('span', 'grimorio__mals-rot', 'Escolha o mal:'));
    const perfil = perfilAtual();
    MALS_MONSTRO.filter(m => !perfil.nomes.some(n => normalizar(n) === normalizar(`Mal: ${m.nome}`))).forEach(mal => {
        const b = botao('grimorio__colocar', mal.nome);
        b.setAttribute('aria-label', `Escolher o mal ${mal.nome}`);
        b.addEventListener('click', () => confirmarMal(e, mal));
        caixa.appendChild(b);
    });
    return caixa;
}

// Escreve um bloco de linhas com limite e "Ver mais N".
function blocoDeLinhas(entradas, chave, pai, comTipo, limite, forcarTodas) {
    const todas = forcarTodas || gruposAbertos.has(chave) || entradas.length <= limite + 1;
    entradas.forEach((e, i) => { if (todas || i < limite) pai.appendChild(criarLinha(e, comTipo)); });
    if (!todas) {
        const mais = botao('grimorio__mais', `Ver mais ${entradas.length - limite}`);
        mais.addEventListener('click', () => { gruposAbertos.add(chave); pintar(); });
        pai.appendChild(mais);
    }
}

function titulo(texto, runa) {
    const h = el('h3', 'grimorio__grupo');
    h.append(el('b', 'grimorio__runa', runa), document.createTextNode(texto));
    return h;
}

function pintarGrupos(entradas, comTipo, perfil, forcar) {
    const mapa = new Map();
    entradas.forEach(e => {
        const nome = comTipo && aba === 'sugestoes' && !busca.trim() ? 'Combina com a sua ficha' : e.secao;
        if (!mapa.has(nome)) mapa.set(nome, []);
        mapa.get(nome).push(e);
    });
    const nomes = [...mapa.keys()];
    if (aba === 'poderes') nomes.sort((a, b) => ordemPoder(a, perfil).localeCompare(ordemPoder(b, perfil), 'pt'));
    else nomes.sort((a, b) => ORDEM_SECOES.indexOf(a) - ORDEM_SECOES.indexOf(b));
    nomes.forEach(nome => {
        const itens = mapa.get(nome).sort(comparar);
        const sec = el('section', 'grimorio__secao');
        const bio = nome === 'Aspectos biológicos' && aba === 'besta';
        const total = bio && perfil.besta ? `${perfil.besta.bioUsado}/${perfil.besta.bioLim}` : String(itens.length);
        const runa = aba === 'besta' ? 'A' : ABAS.find(a => a.id === aba)?.runa || 'K';
        sec.appendChild(titulo(`${nome} · ${total}`, nome === 'Aspectos de monstro' ? 'P' : runa));
        if (bio) {
            SUBTIPOS.forEach(sub => {
                const parte = itens.filter(e => e.sub === sub);
                if (!parte.length) return;
                const caixa = el('div', 'grimorio__sub');
                caixa.appendChild(el('h4', 'grimorio__sub-rot', `${sub} · ${parte.length}`));
                blocoDeLinhas(parte, `${aba}:${nome}:${sub}`, caixa, comTipo, LIMITE_GRUPO, forcar);
                sec.appendChild(caixa);
            });
        } else {
            blocoDeLinhas(itens, `${aba}:${nome}`, sec, comTipo, LIMITE_GRUPO, forcar);
        }
        listaEl.appendChild(sec);
    });
}

function linhaLimites(perfil) {
    const limites = limitesDaHierarquia(perfil.hierarquia);
    const usadas = perfil.cotasUsadas;
    const com = [1, 2, 3, 4, 5].filter(i => limites[i] > 0)
        .map(i => `${NOME_RARIDADE[i]} ${usadas[RARIDADES[i]] || 0}/${limites[i]}`).join(' · ');
    const sem = [1, 2, 3, 4, 5].filter(i => limites[i] === 0).map(i => NOME_RARIDADE[i]).join(', ');
    return `Limites da hierarquia ${perfil.hierarquiaNome}: ${com || 'nenhum item além dos banais'}.${sem ? ` ${sem} não aparecem.` : ''}`;
}

function pintarAlvo(perfil) {
    alvoEl.replaceChildren();
    alvoEl.hidden = aba !== 'besta';
    if (aba !== 'besta') return;
    alvoEl.appendChild(Object.assign(el('label', 'grimorio__alvo-rot', 'Besta'), { htmlFor: 'grimorio-besta-sel' }));
    if (perfil.bestas.length > 1) {
        const sel = el('select');
        sel.id = 'grimorio-besta-sel';
        perfil.bestas.forEach(b => {
            const o = el('option', '', b.nome || 'Besta');
            o.value = b.id;
            o.selected = b.id === bestaId;
            sel.appendChild(o);
        });
        sel.addEventListener('change', () => { bestaId = sel.value; pintar(); });
        alvoEl.appendChild(sel);
    } else {
        const nome = el('span', 'grimorio__alvo-nome', perfil.bestas[0]?.nome || 'Nenhuma besta na ficha');
        nome.id = 'grimorio-besta-sel';
        alvoEl.appendChild(nome);
    }
}

function pintarAbas() {
    const mostrar = ABAS.filter(a => a.id !== 'besta' || temAbaBesta());
    if (!mostrar.some(a => a.id === aba)) aba = 'sugestoes';
    abasEl.replaceChildren();
    mostrar.forEach(a => {
        const b = botao('grimorio__aba');
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', String(a.id === aba));
        b.tabIndex = a.id === aba ? 0 : -1;
        b.dataset.aba = a.id;
        const runa = el('span', 'grimorio__aba-runa', a.runa);
        runa.setAttribute('aria-hidden', 'true');
        b.dataset.fk = `aba|${a.id}`;
        b.append(runa, document.createTextNode(a.nome));
        abasEl.appendChild(b);
    });
}

function pintar() {
    if (!painel || !aberta) return;
    const foco = document.activeElement?.dataset?.fk && painel.contains(document.activeElement)
        ? document.activeElement.dataset.fk : '';
    const rolagem = listaEl.scrollTop;
    const perfil = perfilAtual();
    const cat = catalogo(perfil);
    contextoEl.textContent = textoContexto(perfil);
    pintarAbas();
    pintarAlvo(perfil);
    listaEl.replaceChildren();

    const q = normalizar(busca.trim());
    const comTipo = aba === 'sugestoes';
    const todas = [...cat.poderes, ...cat.magias, ...cat.itens, ...cat.aspectos];
    let base;
    if (q) {
        // Em Sugestões a busca procura em tudo; nas outras abas, só no que a aba lista.
        base = comTipo ? todas : daAba(cat, perfil);
        base = base.filter(e => e.visivel && normalizar(e.nome).includes(q));
    } else if (comTipo) {
        base = sugestoes(cat, perfil);
    } else {
        base = daAba(cat, perfil).filter(e => e.visivel);
    }

    if (aba === 'itens' && !q) listaEl.appendChild(el('p', 'grimorio__nota', linhaLimites(perfil)));
    if (leitura()) listaEl.appendChild(el('p', 'grimorio__nota', 'Ficha em modo leitura: nada pode ser colocado.'));
    if (aba === 'besta' && !perfil.bestas.length) {
        listaEl.appendChild(el('p', 'grimorio__vazio', 'Nenhuma besta na ficha ainda. Crie uma na aba Besta da ficha.'));
    }

    const livres = base.filter(e => !e.falta);
    const falta = base.filter(e => e.falta);
    pintarGrupos(livres, comTipo || (q && aba === 'sugestoes'), perfil, !!q);
    if (falta.length) pintarFalta(falta, comTipo, !!q);
    if (!base.length && !(aba === 'besta' && !perfil.bestas.length)) {
        listaEl.appendChild(el('p', 'grimorio__vazio', q
            ? `Nada para “${busca.trim()}”.`
            : (comTipo ? 'Nada cabe na ficha agora. Veja as outras abas.' : 'Nada desta lista cabe nesta ficha agora.')));
    }

    listaEl.scrollTop = rolagem;
    if (foco) {
        const alvo = [...listaEl.querySelectorAll('[data-fk]')].find(b => b.dataset.fk === foco)
            || [...listaEl.querySelectorAll('[data-fk]')].find(b => b.dataset.fk === `${foco.split('|')[0]}|nome`);
        alvo?.focus({ preventScroll: true });
    }
    medirRunas();
}

function daAba(cat, perfil) {
    if (aba === 'poderes') return [...cat.poderes, ...cat.aspectos.filter(e => e.grupo === 'monstro')];
    if (aba === 'magias') return cat.magias;
    if (aba === 'itens') return cat.itens;
    if (aba === 'besta') return cat.aspectos.filter(e => e.grupo !== 'monstro');
    return [];
}

function pintarFalta(falta, comTipo, forcar) {
    const sec = el('section', 'grimorio__falta');
    const abre = faltaAberta || forcar;
    const bt = botao('grimorio__falta-bt', `Ver o que falta · ${falta.length}`);
    bt.setAttribute('aria-expanded', String(abre));
    const caixa = el('div', 'grimorio__falta-corpo');
    caixa.hidden = !abre;
    falta.sort(comparar);
    blocoDeLinhas(falta, `${aba}:falta`, caixa, comTipo, LIMITE_FALTA, forcar);
    bt.addEventListener('click', () => {
        faltaAberta = !faltaAberta;
        caixa.hidden = !faltaAberta;
        bt.setAttribute('aria-expanded', String(faltaAberta));
        medirRunas();
    });
    sec.append(bt, caixa);
    listaEl.appendChild(sec);
}

function textoContexto(perfil) {
    const quem = perfil.classe ? `${perfil.classe} · nível ${perfil.nivel || 0}` : `Nível ${perfil.nivel || 0}`;
    const sem = !perfil.alinhamento || normalizar(perfil.alinhamento) === 'nenhum';
    return `${quem}${perfil.ramo ? ' · ' + perfil.ramo : ''}${sem ? '' : ' · ' + perfil.alinhamento}`;
}

// ── Colocar na ficha ──────────────────────────────────────────────────────────

function colocar(e) {
    if (!e.podeAdicionar || leitura()) return;
    if (e.grupo === 'monstro') {
        pendente = e.key;
        pintar();
        return;
    }
    if (e.kind === 'poder') adicionarPoderCatalogo(e.raw);
    else if (e.kind === 'magia') adicionarMagiaCatalogo(e.raw);
    else if (e.kind === 'item') adicionarItemCatalogo(e.raw);
    else if (e.kind === 'aspecto') {
        const id = bestaId || listarBestasConsulta()[0]?.id;
        if (!id) return;
        adicionarAspectoNaBesta(id, {
            _type: e.grupo === 'treino' ? 'treino' : 'bio',
            nome: e.raw.nome,
            desc: e.raw.desc,
            nivel: e.raw.nivel,
            subtipo: e.raw.subtipo,
            custo: e.raw.custo,
        });
    }
    pintar();
}

function confirmarMal(e, mal) {
    pendente = '';
    const aspecto = adicionarPoderCatalogo({
        nome: e.nome, ptCost: 2, otherCosts: '', descricao: e.descricao.join('\n\n'), cor: 'Roxo',
    });
    if (aspecto) aspecto.dataset.grimorioGrupo = 'monstro';
    const malCard = adicionarPoderCatalogo({
        nome: `Mal: ${mal.nome}`, ptCost: 0, otherCosts: '', descricao: mal.descricao, cor: 'Roxo',
    });
    if (malCard) malCard.dataset.grimorioGrupo = 'mal';
    pintar();
}

// ── Runas flutuantes (decoração; ficam nas faixas laterais e atrás do texto) ──

function semente(inicial) {
    let s = inicial;
    return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function criarRunas(painelEl) {
    const rnd = semente(21);
    const letras = 'ABCDEFGHIJKLMNOPRSTUVWYZabcdefghijklmnoprstuvwy';
    // Cada runa tem 14 a 16px e balança no máximo 4px: cabe na faixa livre de 30px.
    const runa = (lado, x) => {
        const e = el('span', 'grimorio__fl', letras[Math.floor(rnd() * letras.length)]);
        e.style[lado] = x;
        e.style.setProperty('--t', `${14 + Math.floor(rnd() * 3)}px`);
        e.style.setProperty('--d', `${(13 + rnd() * 9).toFixed(1)}s`);
        e.style.setProperty('--atraso', `${(-rnd() * 20).toFixed(1)}s`);
        e.style.setProperty('--dx', `${((rnd() - 0.5) * 8).toFixed(1)}px`);
        e.style.setProperty('--giro', `${((rnd() - 0.5) * 80).toFixed(0)}deg`);
        e.style.setProperty('--pico', (0.78 + rnd() * 0.2).toFixed(2));
        return e;
    };
    const caixa = (classe) => {
        const c = el('div', `grimorio__flutua ${classe}`);
        c.setAttribute('aria-hidden', 'true');
        return c;
    };
    const lateral = caixa('');
    for (let i = 0; i < 7; i += 1) lateral.appendChild(runa('left', `${(3 + rnd() * 3).toFixed(1)}px`));
    for (let i = 0; i < 7; i += 1) lateral.appendChild(runa('right', `${(3 + rnd() * 3).toFixed(1)}px`));
    // Topo: dos dois lados do título, que fica no centro.
    const topo = caixa('grimorio__flutua--topo');
    for (let i = 0; i < 4; i += 1) topo.appendChild(runa('left', `${(i % 2 ? 14 + rnd() * 8 : 76 + rnd() * 8).toFixed(0)}%`));
    // Vazio abaixo de listas curtas: a zona é posicionada em medirRunas().
    zonaEl = caixa('grimorio__flutua--vazio');
    zonaEl.hidden = true;
    for (let i = 0; i < 4; i += 1) zonaEl.appendChild(runa('left', `${(12 + rnd() * 76).toFixed(0)}%`));
    painelEl.append(lateral, topo, zonaEl);
}

function medirRunas() {
    if (!painel || !aberta) return;
    painel.style.setProperty('--alt', `${painel.clientHeight}px`);
    // Onde a lista termina o painel está livre: ali as runas sobem por trás do vazio.
    const ultimo = listaEl.lastElementChild;
    const fim = ultimo ? ultimo.offsetTop + ultimo.offsetHeight : 0;
    const sobra = listaEl.clientHeight - fim - 24;
    if (listaEl.scrollHeight <= listaEl.clientHeight && sobra > 110) {
        zonaEl.style.top = `${listaEl.offsetTop + fim + 12}px`;
        zonaEl.style.setProperty('--alt-zona', `${sobra}px`);
        zonaEl.hidden = false;
    } else {
        zonaEl.hidden = true;
    }
}

function escrituras(painelEl) {
    const caixa = el('div', 'grimorio__escrita');
    caixa.setAttribute('aria-hidden', 'true');
    const linhas = [
        ['run', 3, 8, -2, 'Vo Ka Ne Tu Ra Sa Mi Eth Or Va Lu Ni Ha Ke Do'],
        ['cur', 17, 14, 1.5, 'Arcana verba in pelle scripta, quae nemo legit.'],
        ['run', 31, 6, 1, 'Ru Ta Be Ol Ga Ni Fe Su Ha Mo Ti Ak Re Zu'],
        ['cur', 46, 10, -1.5, 'Per umbram lucis et noctis fines.'],
        ['run', 60, 12, 2, 'Ni Pa Ro Ev Ul Ka Se Do Ma Ti Ah Bo'],
        ['cur', 74, 8, -1, 'Quod scribitur manet, quod dicitur volat.'],
        ['run', 88, 10, 1.2, 'Ek Lu Ra Sa Vo Ni Tu Ha Ke Mi Or Fa'],
    ];
    linhas.forEach(([tipo, topo, esq, giro, texto]) => {
        const p = el('p', `grimorio__esc grimorio__esc--${tipo}`, texto);
        p.style.cssText = `top:${topo}%;left:${esq}%;transform:rotate(${giro}deg)`;
        caixa.appendChild(p);
    });
    painelEl.appendChild(caixa);
}

// Borda esquerda irregular (só em tela larga; no celular a gaveta é reta).
function bordaIrregular(painelEl) {
    const rnd = semente(7);
    const pontos = ['100% 0'];
    for (let y = 0; y <= 100; y += 3.2) pontos.push(`${(rnd() * 5 * (y % 6 < 3 ? 1 : 0.6)).toFixed(2)}px ${y}%`);
    pontos.push('100% 100%');
    painelEl.style.setProperty('--borda', `polygon(${pontos.join(',')})`);
}

// ── Painel ────────────────────────────────────────────────────────────────────

function abrir(aberto) {
    if (!painel) return;
    aberta = aberto;
    painel.classList.toggle('is-aberto', aberto);
    painel.inert = !aberto;
    document.body.classList.toggle('grimorio-aberto', aberto);
    btn?.setAttribute('aria-expanded', String(aberto));
    if (aberto) {
        detectarPergaminho();
        pintar();
    }
}

function trocarAba(id, focar) {
    aba = id;
    pendente = '';
    pintar();
    listaEl.scrollTop = 0;
    if (focar) abasEl.querySelector(`[data-aba="${id}"]`)?.focus();
}

function aoTeclarNasAbas(ev) {
    const abas = [...abasEl.querySelectorAll('[role="tab"]')];
    const i = abas.indexOf(document.activeElement);
    if (i < 0) return;
    let alvo = -1;
    if (ev.key === 'ArrowRight') alvo = (i + 1) % abas.length;
    else if (ev.key === 'ArrowLeft') alvo = (i - 1 + abas.length) % abas.length;
    else if (ev.key === 'Home') alvo = 0;
    else if (ev.key === 'End') alvo = abas.length - 1;
    if (alvo < 0) return;
    ev.preventDefault();
    trocarAba(abas[alvo].dataset.aba, true);
}

function agendarPintura() {
    if (!aberta) return;
    clearTimeout(temporizador);
    temporizador = setTimeout(pintar, 150);
}

function criarPainel() {
    painel = document.createElement('aside');
    painel.id = 'grimorio-panel';
    painel.className = 'grimorio';
    painel.setAttribute('aria-label', 'Grimório, assistente da ficha');
    painel.inert = true;
    bordaIrregular(painel);
    escrituras(painel);
    criarRunas(painel);

    const cab = el('header', 'grimorio__cab');
    cab.appendChild(el('h2', 'grimorio__titulo', 'Grimório'));
    contextoEl = el('p', 'grimorio__sub');
    cab.appendChild(contextoEl);
    const fechar = botao('grimorio__fechar', '×');
    fechar.setAttribute('aria-label', 'Fechar o Grimório');
    fechar.addEventListener('click', () => { abrir(false); btn?.focus(); });
    cab.appendChild(fechar);

    const campo = el('div', 'grimorio__busca');
    const rotulo = el('label', 'grimorio__sr', 'Buscar o que colocar na ficha');
    rotulo.htmlFor = 'grimorio-busca';
    buscaEl = el('input');
    buscaEl.id = 'grimorio-busca';
    buscaEl.type = 'search';
    buscaEl.placeholder = 'Buscar em tudo...';
    buscaEl.autocomplete = 'off';
    buscaEl.addEventListener('input', () => { busca = buscaEl.value; pintar(); });
    campo.append(rotulo, buscaEl);

    abasEl = el('nav', 'grimorio__abas');
    abasEl.setAttribute('role', 'tablist');
    abasEl.setAttribute('aria-label', 'O que o Grimório sugere');
    abasEl.addEventListener('click', ev => {
        const b = ev.target.closest('[data-aba]');
        if (b) trocarAba(b.dataset.aba, false);
    });
    abasEl.addEventListener('keydown', aoTeclarNasAbas);

    alvoEl = el('div', 'grimorio__alvo');
    alvoEl.hidden = true;
    listaEl = el('div', 'grimorio__lista');

    painel.append(cab, campo, abasEl, alvoEl, listaEl);
    // O que se digita aqui não é edição da ficha: não deve chegar ao salvamento.
    ['input', 'change'].forEach(tipo => painel.addEventListener(tipo, e => e.stopPropagation()));
    // Esc fecha só quando o foco está dentro do Grimório.
    painel.addEventListener('keydown', ev => {
        if (ev.key === 'Escape' && aberta) {
            ev.stopPropagation();
            abrir(false);
            btn?.focus();
        }
    });
    document.body.appendChild(painel);
}

export function initGrimorio() {
    btn = document.getElementById('grimorio-btn');
    if (!btn || painel) return;
    criarPainel();
    btn.addEventListener('click', () => abrir(!aberta));
    document.addEventListener('ficha:changed', agendarPintura);
    // Mudanças na ficha que não disparam ficha:changed (hierarquia, classe, nível...).
    ['input', 'change'].forEach(tipo => document.addEventListener(tipo, agendarPintura));
    document.addEventListener('ficha:tema-mudou', detectarPergaminho);
    window.addEventListener('resize', () => { if (aberta) medirRunas(); });
}
