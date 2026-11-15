// ui/grimorio-ui.js — Assistente da ficha. A regra de quem aparece fica em grimorio-acesso.js.

import { escapeHtml, normalizar } from '../core/utils.js';
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

function modoDock() {
    return window.matchMedia('(min-width: 960px)').matches;
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
    const dock = modoDock();
    painel.classList.toggle('grimorio--dock', dock);
    painel.classList.toggle('grimorio--overlay', !dock);
    painel.style.left = '';
    painel.style.top = '';
    painel.style.right = '';
    painel.style.bottom = '';
    painel.style.width = '';
    painel.style.height = '';
    painel.style.maxHeight = '';
    document.body.classList.toggle('grimorio-dock', aberta && dock);
    document.body.classList.toggle('grimorio-overlay', aberta && !dock);
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
    if (!painel || painel.hidden) return;
    const perfil = perfilAtual();
    const visiveis = listaBruta(perfil).filter(e => e.visivel).map(travarLeitura);
    const finais = aplicarBusca(visiveis);
    if (contextoEl) contextoEl.textContent = textoContexto(perfil);
    pintarChips();
    pintarBesta(perfil);
    listaEl.innerHTML = '';
    agrupar(finais, perfil).forEach(([nome, itens]) => {
        const titulo = document.createElement('h3');
        titulo.className = 'grimorio__secao';
        titulo.textContent = `${nome} · ${itens.length}`;
        listaEl.appendChild(titulo);
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

function criarCard(entrada) {
    const card = document.createElement('article');
    card.className = 'grimorio__card' + (entrada.podeAdicionar ? '' : ' is-mudo');
    const head = document.createElement('button');
    head.type = 'button';
    head.className = 'grimorio__card-head';
    head.innerHTML = `<span class="grimorio__nome">${escapeHtml(entrada.nome)}</span><span class="grimorio__custo">${escapeHtml(entrada.custo)}</span>`;
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
        aviso.textContent = entrada.aviso;
        card.appendChild(aviso);
    }

    if (pendente === entrada.key && entrada.grupo === 'monstro' && entrada.podeAdicionar) {
        const mals = document.createElement('div');
        mals.className = 'grimorio__mals';
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
        acao.textContent = entrada.grupo === 'monstro' ? 'Colocar e escolher mal' : 'Colocar na ficha';
        acao.addEventListener('click', () => adicionar(entrada));
        card.appendChild(acao);
    } else if (entrada.motivo) {
        const motivo = document.createElement('p');
        motivo.className = 'grimorio__motivo';
        motivo.textContent = entrada.motivo;
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
    aberta = aberto;
    painel.hidden = !aberto;
    marcarAbertura(aberto);
    aplicarModo();
    if (aberto) pintar();
}

function criarPainel() {
    painel = document.createElement('aside');
    painel.id = 'grimorio-panel';
    painel.className = 'grimorio';
    painel.setAttribute('aria-label', 'Assistente da ficha');
    painel.hidden = true;

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

    listaEl = document.createElement('div');
    listaEl.className = 'grimorio__lista';
    vazioEl = document.createElement('p');
    vazioEl.className = 'grimorio__vazio';
    vazioEl.hidden = true;

    painel.append(head, contextoEl, buscaEl, chipsEl, bestaEl, listaEl, vazioEl);
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
    fab.addEventListener('click', () => abrir(painel.hidden));
    document.body.appendChild(fab);
}

export function initGrimorio() {
    const btn = document.getElementById('grimorio-btn');
    if (!btn || painel) return;
    criarPainel();
    btn.addEventListener('click', () => abrir(painel.hidden));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && aberta) abrir(false);
    });
    document.addEventListener('ficha:changed', () => { if (aberta) pintar(); });
    window.addEventListener('resize', () => { if (aberta) aplicarModo(); });
}
