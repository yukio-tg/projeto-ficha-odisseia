// ui/grimorio-ui.js — Assistente da ficha. A regra de quem aparece fica em grimorio-acesso.js.

import { normalizar } from '../core/utils.js';
import { getNivel, getAtributoBase } from '../core/radar-service.js';
import { getFontes } from '../core/item-effects.js';
import {
    avaliar,
    contarGastos,
    textoPrereq,
    MALS_MONSTRO,
} from '../core/grimorio-acesso.js';
import { getPoderesCatalogo, adicionarPoderCatalogo } from './powers.js';
import { getMagiasCatalogo, adicionarMagiaCatalogo } from './magias.js';
import { getItensCatalogo, adicionarItemCatalogo } from './inventory.js';
import { listarBestasConsulta, adicionarAspectoNaBesta } from './besta.js';
import { ASPECTOS_BIO, ASPECTOS_TREINO } from '../config/aspectos-besta.js';

const FILTROS = [
    { id: 'acesso', label: 'Pode receber' },
    { id: 'poderes', label: 'Poderes' },
    { id: 'magias', label: 'Magias' },
    { id: 'itens', label: 'Itens' },
    { id: 'aspectos', label: 'Aspectos' },
];

let painel = null;
let listaEl = null;
let chipsEl = null;
let contextoEl = null;
let buscaEl = null;
let bestaEl = null;
let vazioEl = null;
let filtro = 'acesso';
let busca = '';
let trilha = 'besta';
let bestaId = '';
let pendente = '';
let aberta = false;

const RARIDADE = ['banal', 'comum', 'incomum', 'raro', 'epico', 'lendario'];

const RUNA = {
    classe: 'runa-classe',
    ramo: 'runa-ramo',
    geral: 'runa-geral',
    habito: 'runa-habito',
    'magia-1': 'runa-magia-1',
    'magia-2': 'runa-magia-2',
    'magia-3': 'runa-magia-3',
    'magia-4': 'runa-magia-4',
    'magia-s': 'runa-magia-s',
    item: 'runa-item',
    bio: 'runa-bio',
    treino: 'runa-treino',
    monstro: 'runa-monstro',
};

const SPRITE = `
<svg id="grimorio-sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0">
  <style>
    path, circle { fill: none; stroke: currentColor; stroke-width: 1.7; }
  </style>
  <symbol id="runa-classe" viewBox="0 0 32 32"><path d="M16 3 V29 M8 9 H24 M10 23 H22"/></symbol>
  <symbol id="runa-ramo" viewBox="0 0 32 32"><path d="M16 4 V15 L7 28 M16 15 L25 28"/></symbol>
  <symbol id="runa-geral" viewBox="0 0 32 32"><path d="M4 16 H28 M20 16 L28 8"/></symbol>
  <symbol id="runa-habito" viewBox="0 0 32 32"><circle cx="16" cy="16" r="8"/></symbol>
  <symbol id="runa-magia-1" viewBox="0 0 32 32"><path d="M6 22 Q16 4 26 22 M16 8 V15"/></symbol>
  <symbol id="runa-magia-2" viewBox="0 0 32 32"><path d="M6 22 Q16 4 26 22 M12 12 V18 M20 12 V18"/></symbol>
  <symbol id="runa-magia-3" viewBox="0 0 32 32"><path d="M6 22 Q16 4 26 22 M10 11 V17 M16 8 V16 M22 11 V17"/></symbol>
  <symbol id="runa-magia-4" viewBox="0 0 32 32"><path d="M6 22 Q16 4 26 22 M9 13 V18 M13 10 V17 M19 10 V17 M23 13 V18"/></symbol>
  <symbol id="runa-magia-s" viewBox="0 0 32 32"><circle cx="16" cy="16" r="10"/><path d="M16 8 L22 16 L16 24 L10 16 Z"/></symbol>
  <symbol id="runa-item" viewBox="0 0 32 32"><path d="M8 13 H24 V26 H8 Z M8 13 L16 7 L24 13"/></symbol>
  <symbol id="runa-bio" viewBox="0 0 32 32"><path d="M7 24 L16 7 L25 24"/></symbol>
  <symbol id="runa-treino" viewBox="0 0 32 32"><path d="M7 24 L16 7 L25 24 M16 13 V24 M11 18 H21"/></symbol>
  <symbol id="runa-monstro" viewBox="0 0 32 32"><path d="M16 4 L28 16 L16 28 L4 16 Z"/></symbol>
  <symbol id="glifo-pt" viewBox="0 0 32 32"><path d="M3 16 H29 M20 9 L29 16 L20 23"/></symbol>
  <symbol id="glifo-habito" viewBox="0 0 32 32"><circle cx="16" cy="16" r="6"/></symbol>
  <symbol id="glifo-la" viewBox="0 0 32 32"><path d="M6 22 Q16 8 26 22"/></symbol>
  <symbol id="glifo-peso" viewBox="0 0 32 32"><path d="M6 16 H22"/></symbol>
  <symbol id="sigilo-aberto" viewBox="0 0 32 32"><path d="M16 5 A11 11 0 1 1 8 11"/></symbol>
  <symbol id="sigilo-fechado" viewBox="0 0 32 32"><circle cx="16" cy="16" r="10"/></symbol>
  <symbol id="sigilo-partido" viewBox="0 0 32 32"><circle cx="16" cy="16" r="10"/><path d="M8 8 L24 24"/></symbol>
  <symbol id="florao" viewBox="0 0 32 32"><path d="M16 4 L20 12 L28 16 L20 20 L16 28 L12 20 L4 16 L12 12 Z"/></symbol>
  <symbol id="canto" viewBox="0 0 32 32"><path d="M6 28 V8 H28 M10 28 V14 H28"/></symbol>
</svg>`;

function modoDock() {
    return window.matchMedia('(min-width: 960px)').matches;
}

function prefereParado() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function leitura() {
    return document.body.classList.contains('mode-readonly');
}

function num(seletor) {
    const el = document.querySelector(seletor);
    const n = parseInt(el?.value, 10);
    return Number.isFinite(n) ? n : 0;
}

function aplicarModo() {
    if (!painel) return;
    painel.classList.toggle('grimorio--overlay', !modoDock());
    document.body.classList.toggle('grimorio-overlay', aberta && !modoDock());
}

function nomesDos(seletor, ler) {
    return [...document.querySelectorAll(seletor)].map(ler).map(s => (s || '').trim()).filter(Boolean);
}

function perfilAtual() {
    const poderes = getPoderesCatalogo();
    const cards = [...document.querySelectorAll('.powers-container .card-power')];
    const nomes = [];
    const owned = [];
    for (const card of cards) {
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
    const nomesMagia = nomesDos('.magic-card .magic-nome', el => el.textContent);
    const bestas = listarBestasConsulta();
    if (!bestaId || !bestas.some(b => b.id === bestaId)) bestaId = bestas[0]?.id || '';
    const besta = bestas.find(b => b.id === bestaId) || null;
    const cotasUsadas = { banal: 0, comum: 0, incomum: 0, raro: 0, epico: 0, lendario: 0 };
    document.querySelectorAll('.item-card').forEach(card => {
        const estado = card.querySelector('.item-estado-select')?.value;
        if (estado && estado !== 'padrao') return;
        const chave = normalizar(card.dataset.raridade || '');
        if (chave in cotasUsadas) cotasUsadas[chave] += 1;
    });
    const base = {
        nivel: getNivel(),
        classe: document.querySelector('[data-field="classe-nome"]')?.value?.trim() || '',
        ramo: document.querySelector('[data-field="ramo-nome"]')?.value?.trim() || '',
        alinhamento: document.querySelector('[data-field="alinhamento-nome"]')?.value?.trim() || '',
        sabedoria: getAtributoBase('SAB'),
        monstro: document.querySelector('[data-field="monstro"]')?.checked ?? false,
        hierarquia: document.querySelector('[data-field="hierarquia"]')?.value || 'pobre',
        ptRestante: num('[data-field="pt-total"]') - num('[data-field="pt-atual"]'),
        laRestante: num('[data-field="la-total"]') - num('[data-field="la-atual"]'),
        pesoAtual: num('[data-field="inv-atual"]'),
        pesoLimite: num('[data-field="inv-total"]'),
        cotasUsadas,
        nomes,
        nomesMagia,
        fontes: getFontes().map(f => ({
            deusa: f.deusa,
            grauMax: f.grauMax,
            laMax: f.laMax,
            usedLa: f.usedLa,
            raridade: f.raridade,
        })),
        besta,
        malsLivres: MALS_MONSTRO.filter(m => !nomes.some(n => normalizar(n) === normalizar(`Mal: ${m.nome}`))).length,
    };
    base.gastos = contarGastos(owned, base);
    return base;
}

function descricaoMagia(m) {
    const partes = [];
    if (m.descricao) partes.push(m.descricao);
    if (m.descricao_geral) partes.push(m.descricao_geral);
    if (m.descricao_sucesso) partes.push('Sucesso: ' + m.descricao_sucesso);
    if (m.descricao_fracasso) partes.push('Fracasso: ' + m.descricao_fracasso);
    (m.aprimoramentos || []).forEach(a => {
        partes.push(`${a.custo || ''} ${a.descricao || ''}`.trim());
    });
    return partes.filter(Boolean).join('\n\n');
}

function entradaPoder(p, perfil) {
    const resultado = avaliar({ kind: 'poder', ...p }, perfil);
    return {
        key: `poder:${normalizar(p.nome)}:${p.ptCost}:${p.classe || ''}:${p.ramo || ''}`,
        kind: 'poder',
        nome: p.nome,
        custo: p.origem === 'habito' ? (p.otherCosts || 'Hábito') : `${Number(p.ptCost) || 0} PT${p.otherCosts ? ' ' + p.otherCosts : ''}`,
        descricao: p.descricao || '',
        prereq: textoPrereq(p.prereq),
        filtros: p.origem === 'habito'
            ? { subtipo: p.habito === 'luta' ? 'Luta' : p.habito === 'magia' ? 'Magia' : 'Gerais' }
            : { ramo: p.origem === 'ramo' ? p.ramo : (p.origem === 'geral' ? 'Geral' : 'Classe') },
        raw: p,
        ...resultado,
    };
}

function entradaMagia(m, perfil) {
    const grau = m.grau === 'S' ? 'S' : (parseInt(m.grau, 10) || 1);
    const la = m.fe || m.la || 1;
    const entrada = {
        kind: 'magia',
        nome: m.nome,
        tradicao: m.tipo,
        grau,
        la,
        divindade: m.divindade || '',
    };
    return {
        key: `magia:${normalizar(m.nome)}:${m.tipo}`,
        kind: 'magia',
        nome: m.nome,
        custo: `${m.tipo || ''} · ${grau}° · LA ${la}${m.divindade ? ' · ' + m.divindade : ''}`,
        descricao: descricaoMagia(m),
        prereq: '',
        filtros: {
            grau: grau === 'S' ? 'S' : `${grau}°`,
            deusa: m.divindade || '',
        },
        raw: m,
        ...avaliar(entrada, perfil),
    };
}

function entradaItem(item, perfil) {
    return {
        key: `item:${normalizar(item.nome)}`,
        kind: 'item',
        nome: item.nome,
        custo: `${item.raridade || ''} · ${item.categoria || ''} · peso ${item.peso || 0}`,
        descricao: item.descricao || '',
        prereq: '',
        filtros: { raridade: item.raridade || '', categoria: item.categoria || '' },
        raw: item,
        ...avaliar({ kind: 'item', nome: item.nome, raridade: item.raridade, peso: item.peso }, perfil),
    };
}

function entradaAspecto(item, perfil) {
    const grupo = item.grupo;
    const entrada = {
        kind: 'aspecto',
        grupo,
        nome: item.nome,
        nivel: item.nivel,
        custo: item.custo,
    };
    const custo = grupo === 'treino' ? `${item.custo} PT` : (grupo === 'monstro' ? '2 PT' : item.nivel);
    return {
        key: `aspecto:${grupo}:${normalizar(item.nome)}`,
        kind: 'aspecto',
        grupo,
        nome: item.nome,
        custo,
        descricao: item.desc || item.descricao || '',
        prereq: '',
        filtros: { subtipo: item.subtipo || (grupo === 'treino' ? 'Treino' : '') },
        raw: item,
        ...avaliar(entrada, perfil),
    };
}

function aspectosDaTrilha(perfil) {
    const bestas = listarBestasConsulta();
    const temBesta = bestas.length > 0;
    const temMonstro = perfil.monstro;
    if (trilha === 'monstro' && !temMonstro) trilha = temBesta ? 'besta' : 'monstro';
    if (trilha === 'besta' && !temBesta) trilha = temMonstro ? 'monstro' : 'besta';
    if (trilha === 'monstro') {
        return ASPECTOS_BIO.map(a => ({ ...a, grupo: 'monstro', custo: 2 }));
    }
    return [
        ...ASPECTOS_BIO.map(a => ({ ...a, grupo: 'bio' })),
        ...ASPECTOS_TREINO.map(a => ({ ...a, grupo: 'treino', subtipo: 'Treino' })),
    ];
}

function listaBruta(perfil) {
    const poderes = getPoderesCatalogo()
        .filter(p => ['classe', 'ramo', 'geral', 'habito'].includes(p.origem))
        .map(p => entradaPoder(p, perfil));
    const magias = getMagiasCatalogo().map(m => entradaMagia(m, perfil));
    if (filtro === 'poderes') return poderes;
    if (filtro === 'magias') return magias;
    if (filtro === 'itens') return getItensCatalogo().map(item => entradaItem(item, perfil));
    if (filtro === 'aspectos') return aspectosDaTrilha(perfil).map(a => entradaAspecto(a, perfil));
    return poderes.concat(magias);
}

function aplicarBusca(lista) {
    const q = normalizar(busca);
    if (!q) return lista;
    return lista.filter(e => normalizar(e.nome).includes(q) || normalizar(e.descricao).includes(q));
}

function travarLeitura(entrada) {
    if (!leitura() || !entrada.podeAdicionar) return entrada;
    return { ...entrada, podeAdicionar: false, motivo: 'modo leitura' };
}

function secaoDe(entrada, perfil) {
    if (entrada.kind === 'poder') {
        const origem = entrada.raw?.origem;
        if (origem === 'classe') return 'Habilidades de classe';
        if (origem === 'ramo') return `Ramo ${entrada.raw?.ramo || ''}`.trim();
        if (origem === 'geral') return 'Poderes gerais';
        if (origem === 'habito') return 'Hábito';
    }
    if (entrada.kind === 'magia') {
        const trad = String(entrada.raw?.tipo || '');
        const nome = trad ? trad.charAt(0).toUpperCase() + trad.slice(1) : 'Magia';
        return `${nome} · ${entrada.filtros.grau || ''}`.trim();
    }
    if (entrada.kind === 'item') return entrada.filtros.raridade || 'Itens';
    if (entrada.grupo === 'monstro') return 'Aspectos de monstro';
    if (entrada.grupo === 'treino') return 'Treino';
    return entrada.filtros.subtipo || 'Biológico';
}

function igualRamo(a, b) {
    return normalizar(a) === normalizar(b);
}

function ordemSecao(nome, perfil) {
    if (nome === 'Habilidades de classe') return '0';
    if (nome.startsWith('Ramo ')) {
        const ramo = nome.slice(5);
        return igualRamo(ramo, perfil.ramo) ? '1a' + ramo : '1b' + ramo;
    }
    if (nome === 'Poderes gerais') return '2';
    if (nome === 'Hábito') return '3';
    if (nome.startsWith('Arcanismo')) return '4' + nome;
    if (nome.startsWith('Feromancia')) return '5' + nome;
    if (nome.startsWith('Teurgia')) return '6' + nome;
    return '7' + nome;
}

function agrupar(lista, perfil) {
    const mapa = new Map();
    lista.forEach(entrada => {
        const nome = secaoDe(entrada, perfil);
        if (!mapa.has(nome)) mapa.set(nome, []);
        mapa.get(nome).push(entrada);
    });
    return [...mapa.entries()].sort((a, b) => ordemSecao(a[0], perfil).localeCompare(ordemSecao(b[0], perfil), 'pt'));
}

function textoContexto(perfil) {
    const quem = perfil.classe
        ? `${perfil.classe} · nv ${perfil.nivel || 0}`
        : `Nível ${perfil.nivel || 0}`;
    const ramo = perfil.ramo ? ` · ${perfil.ramo}` : '';
    const sem = !perfil.alinhamento || normalizar(perfil.alinhamento) === 'nenhum';
    const alin = sem ? '' : ` · ${perfil.alinhamento}`;
    return `${quem}${ramo}${alin}`;
}

function pintar() {
    if (!painel || !aberta) return;
    const perfil = perfilAtual();
    const visiveis = listaBruta(perfil).filter(e => e.visivel).map(travarLeitura);
    const finais = aplicarBusca(visiveis);
    if (contextoEl) contextoEl.textContent = textoContexto(perfil);
    pintarChips();
    pintarBesta(perfil);
    listaEl.innerHTML = '';
    agrupar(finais, perfil).forEach(([nome, itens]) => {
        listaEl.appendChild(criarSecao(nome, itens.length));
        itens.forEach(entrada => listaEl.appendChild(criarCard(entrada)));
    });
    vazioEl.hidden = finais.length > 0;
    vazioEl.textContent = visiveis.length === 0
        ? 'Nada desta lista cabe nesta ficha agora.'
        : 'Nada com essa busca. Tente outro nome.';
}

function pintarChips() {
    chipsEl.innerHTML = '';
    FILTROS.forEach(f => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'grimorio__chip' + (filtro === f.id ? ' is-on' : '');
        btn.textContent = f.label;
        btn.addEventListener('click', () => {
            filtro = f.id;
            pendente = '';
            pintar();
        });
        chipsEl.appendChild(btn);
    });
}

function pintarBesta(perfil) {
    bestaEl.hidden = filtro !== 'aspectos';
    bestaEl.innerHTML = '';
    if (filtro !== 'aspectos') return;
    const bestas = listarBestasConsulta();
    if (perfil.monstro) {
        const troca = document.createElement('div');
        troca.className = 'grimorio__sub';
        ['besta', 'monstro'].forEach(id => {
            if (id === 'besta' && !bestas.length) return;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'grimorio__chip' + (trilha === id ? ' is-on' : '');
            btn.textContent = id === 'besta' ? 'Besta' : 'Monstro';
            btn.addEventListener('click', () => { trilha = id; pendente = ''; pintar(); });
            troca.appendChild(btn);
        });
        if (troca.childElementCount > 1) bestaEl.appendChild(troca);
    }
    if (trilha === 'besta' && bestas.length > 1) {
        const sel = document.createElement('select');
        sel.className = 'grimorio__besta';
        sel.setAttribute('aria-label', 'Besta');
        bestas.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.textContent = b.nome || 'Besta';
            if (b.id === bestaId) opt.selected = true;
            sel.appendChild(opt);
        });
        sel.addEventListener('change', () => { bestaId = sel.value; pintar(); });
        bestaEl.appendChild(sel);
    } else if (trilha === 'besta' && bestas.length === 1) {
        const nome = document.createElement('p');
        nome.className = 'grimorio__besta-nome';
        nome.textContent = bestas[0].nome || 'Besta';
        bestaEl.appendChild(nome);
    } else if (trilha === 'besta' && !bestas.length && !perfil.monstro) {
        const nome = document.createElement('p');
        nome.className = 'grimorio__besta-nome';
        nome.textContent = 'Nenhuma besta na ficha.';
        bestaEl.appendChild(nome);
    }
}

function etapaDe(entrada) {
    if (entrada.kind === 'poder') {
        const origem = entrada.raw?.origem;
        if (origem === 'classe' || origem === 'ramo' || origem === 'geral' || origem === 'habito') return origem;
    }
    if (entrada.kind === 'magia') {
        if (entrada.grau === 'S') return 'magia-s';
        const grau = parseInt(entrada.grau, 10) || 1;
        return 'magia-' + Math.min(4, Math.max(1, grau));
    }
    if (entrada.kind === 'item') return 'item';
    if (entrada.grupo === 'monstro' || entrada.grupo === 'treino') return entrada.grupo;
    return 'bio';
}

function glifosDe(entrada) {
    if (entrada.kind === 'poder') {
        return [{ simbolo: entrada.raw?.origem === 'habito' ? 'glifo-habito' : 'glifo-pt' }];
    }
    if (entrada.kind === 'magia') {
        if (entrada.grau === 'S') return [{ simbolo: 'runa-magia-s' }, { simbolo: 'glifo-la' }];
        return [{ pontos: parseInt(entrada.grau, 10) || 1 }, { simbolo: 'glifo-la' }];
    }
    if (entrada.kind === 'item') {
        const chave = normalizar(entrada.filtros?.raridade || '').replace(/\s+/g, '');
        const n = RARIDADE.indexOf(chave);
        return [{ pontas: n < 0 ? 1 : n + 1 }, { simbolo: 'glifo-peso' }];
    }
    if (entrada.grupo === 'treino') return [{ simbolo: 'glifo-pt' }];
    return [{ simbolo: 'glifo-peso' }];
}

function ico(id) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'grimorio__ico');
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#' + id);
    svg.appendChild(use);
    return svg;
}

function pontas(quantidade, raridade) {
    const faixa = document.createElement('span');
    faixa.className = 'grimorio__pontas' + (raridade ? ' grimorio__pontas--raridade' : '');
    faixa.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < quantidade; i += 1) faixa.appendChild(document.createElement('i'));
    return faixa;
}

function filete() {
    const linha = document.createElement('span');
    linha.className = 'grimorio__filete';
    linha.setAttribute('aria-hidden', 'true');
    return linha;
}

function canto(lado) {
    const el = ico('canto');
    el.classList.add('grimorio__canto', 'grimorio__canto--' + lado);
    return el;
}

function criarSecao(nome, quantidade) {
    const titulo = document.createElement('h3');
    titulo.className = 'grimorio__secao';
    const rotulo = document.createElement('span');
    rotulo.className = 'grimorio__secao-nome';
    rotulo.textContent = `${nome} · ${quantidade}`;
    titulo.append(rotulo, filete(), ico('florao'), filete());
    return titulo;
}

function criarCard(entrada) {
    const etapa = etapaDe(entrada);
    const card = document.createElement('article');
    card.className = 'grimorio__card grimorio__card--' + etapa + (entrada.podeAdicionar ? '' : ' is-mudo');
    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'grimorio__card-head';
    const nome = document.createElement('span');
    nome.className = 'grimorio__nome';
    nome.textContent = entrada.nome;
    const valor = document.createElement('span');
    valor.className = 'grimorio__valor';
    glifosDe(entrada).forEach(glifo => {
        if (glifo.simbolo) valor.appendChild(ico(glifo.simbolo));
        else if (glifo.pontos) valor.appendChild(pontas(glifo.pontos, false));
        else if (glifo.pontas) valor.appendChild(pontas(glifo.pontas, true));
    });
    const custo = document.createElement('span');
    custo.className = 'grimorio__custo';
    custo.textContent = entrada.custo;
    valor.appendChild(custo);
    head.append(ico(RUNA[etapa] || 'runa-geral'), nome, valor);
    const body = document.createElement('div');
    body.className = 'grimorio__card-body';
    body.hidden = true;
    const desc = document.createElement('p');
    desc.className = 'grimorio__desc';
    desc.textContent = entrada.descricao || '';
    body.appendChild(desc);
    if (entrada.prereq) {
        const pre = document.createElement('p');
        pre.className = 'grimorio__prereq';
        pre.textContent = 'Pré-requisito: ' + entrada.prereq;
        body.appendChild(pre);
    }
    head.addEventListener('click', () => { body.hidden = !body.hidden; });
    card.append(head, body);

    if (entrada.aviso) {
        const aviso = document.createElement('p');
        aviso.className = 'grimorio__aviso';
        aviso.append(ico('sigilo-aberto'), document.createTextNode(entrada.aviso));
        card.appendChild(aviso);
    }

    if (pendente === entrada.key && entrada.grupo === 'monstro' && entrada.podeAdicionar) {
        const mals = document.createElement('div');
        mals.className = 'grimorio__mals';
        mals.appendChild(ico('sigilo-partido'));
        const perfil = perfilAtual();
        const livres = MALS_MONSTRO.filter(m => !perfil.nomes.some(n => normalizar(n) === normalizar(`Mal: ${m.nome}`)));
        livres.forEach(mal => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'grimorio__add';
            btn.textContent = mal.nome;
            btn.addEventListener('click', () => confirmarMal(entrada, mal));
            mals.appendChild(btn);
        });
        card.appendChild(mals);
        return card;
    }

    if (entrada.podeAdicionar) {
        const acao = document.createElement('button');
        acao.type = 'button';
        acao.className = 'grimorio__add';
        acao.append(ico('sigilo-aberto'), document.createTextNode(entrada.grupo === 'monstro' ? 'Colocar e escolher mal' : 'Colocar na ficha'));
        acao.addEventListener('click', () => adicionar(entrada));
        card.appendChild(acao);
    } else if (entrada.motivo) {
        const motivo = document.createElement('p');
        motivo.className = 'grimorio__motivo';
        motivo.append(ico('sigilo-fechado'), document.createTextNode(entrada.motivo));
        card.appendChild(motivo);
    }
    return card;
}

function adicionar(entrada) {
    if (!entrada.podeAdicionar || leitura()) return;
    if (entrada.grupo === 'monstro') {
        pendente = entrada.key;
        pintar();
        return;
    }
    if (entrada.kind === 'poder') adicionarPoderCatalogo(entrada.raw);
    else if (entrada.kind === 'magia') adicionarMagiaCatalogo(entrada.raw);
    else if (entrada.kind === 'item') adicionarItemCatalogo(entrada.raw);
    else if (entrada.kind === 'aspecto') {
        const besta = bestaId || listarBestasConsulta()[0]?.id;
        if (!besta) return;
        adicionarAspectoNaBesta(besta, {
            _type: entrada.grupo === 'treino' ? 'treino' : 'bio',
            nome: entrada.raw.nome,
            desc: entrada.raw.desc,
            nivel: entrada.raw.nivel,
            subtipo: entrada.raw.subtipo,
            custo: entrada.raw.custo,
        });
    }
}

function confirmarMal(entrada, mal) {
    pendente = '';
    const aspecto = adicionarPoderCatalogo({
        nome: entrada.nome,
        ptCost: 2,
        otherCosts: '',
        descricao: entrada.descricao,
        cor: 'Roxo',
    });
    if (aspecto) aspecto.dataset.grimorioGrupo = 'monstro';
    const malCard = adicionarPoderCatalogo({
        nome: `Mal: ${mal.nome}`,
        ptCost: 0,
        otherCosts: '',
        descricao: mal.descricao,
        cor: 'Roxo',
    });
    if (malCard) malCard.dataset.grimorioGrupo = 'mal';
}

function marcarAbertura(aberto) {
    ['grimorio-btn', 'grimorio-fab'].forEach(id => {
        document.getElementById(id)?.setAttribute('aria-expanded', aberto ? 'true' : 'false');
    });
}

function abrir(aberto) {
    if (!painel) return;
    aberta = aberto;
    marcarAbertura(aberto);
    aplicarModo();
    if (aberto) pintar();

    if (prefereParado()) {
        painel.hidden = !aberto;
        painel.classList.toggle('is-aberto', aberto);
        painel.classList.toggle('is-lombada', aberto);
        return;
    }

    if (aberto) {
        const estavaFora = painel.hidden;
        painel.hidden = false;
        if (estavaFora) {
            painel.classList.remove('is-aberto', 'is-lombada');
            void painel.offsetWidth;
        }
        painel.classList.add('is-aberto');
        return;
    }

    painel.classList.remove('is-aberto', 'is-lombada');
}

function criarPainel() {
    painel = document.createElement('aside');
    painel.id = 'grimorio-panel';
    painel.className = 'grimorio';
    painel.setAttribute('aria-label', 'Assistente da ficha');
    painel.hidden = true;
    painel.insertAdjacentHTML('afterbegin', SPRITE);
    painel.addEventListener('transitionend', (e) => {
        if (e.target !== painel || e.propertyName !== 'transform') return;
        if (painel.classList.contains('is-aberto')) painel.classList.add('is-lombada');
        else painel.hidden = true;
    });

    const head = document.createElement('div');
    head.className = 'grimorio__head';
    head.innerHTML = '<span class="grimorio__marca"><span class="grimorio__title">Grimório</span><span class="grimorio__oficio">Assistente da ficha</span></span>';
    const fechar = document.createElement('button');
    fechar.type = 'button';
    fechar.className = 'grimorio__fechar';
    fechar.setAttribute('aria-label', 'Fechar o assistente');
    fechar.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">close</span>';
    fechar.addEventListener('click', () => abrir(false));
    head.appendChild(fechar);

    buscaEl = document.createElement('input');
    buscaEl.type = 'search';
    buscaEl.className = 'grimorio__busca';
    buscaEl.placeholder = 'O que colocar na ficha';
    buscaEl.setAttribute('aria-label', 'Buscar o que colocar na ficha');
    buscaEl.addEventListener('input', () => {
        busca = buscaEl.value;
        pintar();
    });

    contextoEl = document.createElement('p');
    contextoEl.className = 'grimorio__contexto';

    chipsEl = document.createElement('div');
    chipsEl.className = 'grimorio__chips';
    chipsEl.setAttribute('role', 'tablist');
    chipsEl.setAttribute('aria-label', 'O que o assistente lista');
    bestaEl = document.createElement('div');
    bestaEl.className = 'grimorio__besta-bar';

    const folha = document.createElement('div');
    folha.className = 'grimorio__folha';
    ['tl', 'tr', 'bl', 'br'].forEach(lado => folha.appendChild(canto(lado)));

    listaEl = document.createElement('div');
    listaEl.className = 'grimorio__lista';
    vazioEl = document.createElement('p');
    vazioEl.className = 'grimorio__vazio';
    vazioEl.hidden = true;

    folha.append(contextoEl, buscaEl, chipsEl, bestaEl, listaEl, vazioEl);
    painel.append(head, folha);
    ['input', 'change'].forEach(tipo => painel.addEventListener(tipo, e => e.stopPropagation()));
    document.body.appendChild(painel);

    const fab = document.createElement('button');
    fab.id = 'grimorio-fab';
    fab.type = 'button';
    fab.className = 'grimorio-fab';
    fab.setAttribute('aria-label', 'Abrir o assistente da ficha');
    fab.setAttribute('aria-expanded', 'false');
    fab.setAttribute('aria-controls', 'grimorio-panel');
    fab.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">menu_book</span><span class="grimorio-fab__rotulo">Grimório</span>';
    fab.addEventListener('click', () => abrir(!aberta));
    document.body.appendChild(fab);
}

export function initGrimorio() {
    const btn = document.getElementById('grimorio-btn');
    if (!btn || painel) return;
    criarPainel();
    btn.addEventListener('click', () => abrir(!aberta));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && aberta) abrir(false);
    });
    document.addEventListener('ficha:changed', () => { if (aberta) pintar(); });
    window.addEventListener('resize', () => { if (aberta) aplicarModo(); });
}
