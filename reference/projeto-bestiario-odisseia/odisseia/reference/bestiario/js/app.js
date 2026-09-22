/* ============================================================
   CODEX BESTIARIUM v5 - Persistência automática com localStorage
   ============================================================ */
const STORAGE_KEY = 'bestiarium_v5';
const SELECTED_KEY = 'bestiarium_selected_id';

let creatures = [];
let selectedId = null;
let activeTypeFilter = null;
let currentView = 'detail';
let pendingImgCreatureId = null;

// ---------- UTILITÁRIOS ----------
function slugify(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
function genId(name) {
  const slug = name ? slugify(name) : '';
  const suffix = Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 5);
  return slug ? `c_${slug}_${suffix}` : `c_${suffix}`;
}
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
function parseTags(s) {
  return s ? s.split(',').map(x => x.trim()).filter(Boolean) : [];
}
function parseRefs(s) {
  if (!s) return {};
  s = s.trim();
  if (s.startsWith('{')) {
    try { return JSON.parse(s); } catch (e) { return {}; }
  }
  const out = {};
  s.split('\n').forEach(line => {
    const [t, u] = line.split('|').map(x => x.trim());
    if (t && u) out[t] = u;
  });
  return out;
}
function refsToStr(refs) {
  if (!refs || typeof refs !== 'object') return '';
  return Object.entries(refs).map(([t, u]) => `${t}|${u}`).join('\n');
}
function sanitize(d) {
  return {
    id: d.id || null,
    name: d.name || 'Criatura Sem Nome',
    latin: d.latin || '',
    image: d.image || '',
    region: d.region || 'Desconhecida',
    mainType: d.mainType || 'Indefinido',
    stats: {
      str: d.stats?.str ?? (d.str || '—'),
      def: d.stats?.def ?? (d.def || '—'),
      int: d.stats?.int ?? (d.int || '—'),
      per: d.stats?.per ?? (d.per || '★★☆☆☆'),
    },
    elements: Array.isArray(d.elements) ? d.elements : parseTags(d.elements),
    regionTags: Array.isArray(d.regionTags) ? d.regionTags : parseTags(d.regionTags),
    typeTags: Array.isArray(d.typeTags) ? d.typeTags : parseTags(d.typeTags),
    otherTags: Array.isArray(d.otherTags) ? d.otherTags : parseTags(d.otherTags),
    description: d.description || '',
    refs: (typeof d.refs === 'object' && d.refs !== null) ? d.refs : parseRefs(d.refs),
  };
}

// ---------- PERSISTÊNCIA (automática) ----------
function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(creatures));
    console.log(`💾 Salvo ${creatures.length} criaturas.`);
  } catch (e) {
    console.error('Erro ao salvar:', e);
    toast('Erro ao salvar dados!');
  }
}

function saveSelectedId() {
  if (selectedId) {
    localStorage.setItem(SELECTED_KEY, selectedId);
  } else {
    localStorage.removeItem(SELECTED_KEY);
  }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && raw !== 'undefined') {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        creatures = parsed.map(c => sanitize(c));
        // Garantir que todas tenham ID (caso alguma não tenha)
        creatures.forEach(c => { if (!c.id) c.id = genId(); });
        console.log(`📀 Carregado ${creatures.length} criaturas.`);
        return true;
      }
    }
  } catch (e) {
    console.warn('Falha ao ler localStorage:', e);
  }
  return false;
}

function loadSelectedId() {
  const saved = localStorage.getItem(SELECTED_KEY);
  if (saved && creatures.some(c => c.id === saved)) {
    selectedId = saved;
  } else {
    selectedId = creatures.length > 0 ? creatures[0].id : null;
  }
}

// ---------- DADOS INICIAIS (caso localStorage vazio) ----------
function getDefaultCreatures() {
  return [
  ];
}

// ---------- CRUD (com auto-save) ----------
function addCreature(data) {
  const newId = genId(data.name);
  const newCreature = { id: newId, ...sanitize(data) };
  creatures.push(newCreature);
  saveToLocalStorage();
  render();
  showCreature(newId);
  toast(`"${newCreature.name}" inscrita no Codex.`);
  return newCreature;
}

function updateCreature(id, data) {
  const index = creatures.findIndex(c => c.id === id);
  if (index === -1) return null;
  creatures[index] = { ...creatures[index], ...sanitize(data), id };
  saveToLocalStorage();
  render();
  showCreature(id);
  toast(`"${creatures[index].name}" atualizada.`);
  return creatures[index];
}

function removeCreature(id) {
  const creature = creatures.find(c => c.id === id);
  if (!creature) return false;
  if (!confirm(`Remover "${creature.name}" do Codex?`)) return false;

  // Remove do array
  creatures = creatures.filter(c => c.id !== id);
  saveToLocalStorage();

  // Ajusta o selectedId se a criatura removida era a que estava sendo exibida
  if (selectedId === id) {
    selectedId = null;
    if (creatures.length > 0) {
      selectedId = creatures[0].id;
    }
    saveSelectedId();
  }

  // Atualiza completamente a interface (lista lateral e grid)
  render();

  // Reexibe a criatura selecionada (ou estado vazio) na view de detalhe
  if (currentView === 'detail') {
    if (selectedId) {
      showCreature(selectedId);
    } else {
      showEmpty();
    }
  }

  toast(`"${creature.name}" removida.`);
  return true;
}

function getCreature(id) {
  return creatures.find(c => c.id === id) || null;
}

// ---------- SALVAR EDIÇÕES INLINE ----------
function saveInlineEdits(id) {
  const creature = getCreature(id);
  if (!creature) return;
  const page = document.getElementById('creaturePage');
  const getNameEl = () => page.querySelector('.creature-name');
  const getLatinEl = () => page.querySelector('.creature-latin');
  const getDescEl = () => page.querySelector('.desc-body');
  const getStrEl = () => page.querySelector('.stat-str');
  const getDefEl = () => page.querySelector('.stat-def');
  const getIntEl = () => page.querySelector('.stat-int');
  const getPerEl = () => page.querySelector('.stat-per');

  const updated = { ...creature };
  if (getNameEl()) updated.name = getNameEl().innerText.trim() || creature.name;
  if (getLatinEl()) updated.latin = getLatinEl().innerText.trim();
  if (getDescEl()) updated.description = getDescEl().innerText.trim();
  updated.stats = {
    str: getStrEl() ? getStrEl().innerText.trim() : creature.stats.str,
    def: getDefEl() ? getDefEl().innerText.trim() : creature.stats.def,
    int: getIntEl() ? getIntEl().innerText.trim() : creature.stats.int,
    per: getPerEl() ? getPerEl().innerText.trim() : creature.stats.per,
  };
  const index = creatures.findIndex(c => c.id === id);
  if (index !== -1) {
    creatures[index] = updated;
    saveToLocalStorage();
    renderList();
    toast('Alterações salvas.');
  }
}

// ---------- IMAGEM ----------
function openImgModal(id) {
  pendingImgCreatureId = id;
  const creature = getCreature(id);
  document.getElementById('imgUrlInput').value = creature?.image || '';
  document.getElementById('imgModal').classList.add('open');
}
function applyImageChange() {
  const url = document.getElementById('imgUrlInput').value.trim();
  const creature = getCreature(pendingImgCreatureId);
  if (!creature || !url) return;
  creature.image = url;
  saveToLocalStorage();
  renderList();
  const img = document.querySelector('#creaturePage .creature-img-panel img');
  if (img) img.src = url;
  document.getElementById('imgModal').classList.remove('open');
  toast('Imagem atualizada.');
}

// ---------- EXPORT PÁGINA STANDALONE ----------
function exportPage(id) {
  const creature = getCreature(id);
  if (!creature) return;
  const html = buildStandalonePage(creature);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = creature.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') + '.html';
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`Página de "${creature.name}" exportada.`);
}

// ---------- RENDERIZAÇÃO ----------
function render() {
  renderFilters();
  renderList();
  if (currentView === 'grid') renderGrid();
}

function renderFilters() {
  const types = new Map();
  creatures.forEach(c => {
    if (c.mainType) types.set(c.mainType, (types.get(c.mainType) || 0) + 1);
    c.typeTags.forEach(t => types.set(t, (types.get(t) || 0)));
  });
  const container = document.getElementById('typeFilters');
  container.innerHTML = '';
  const colors = ['#7a2020', '#2d4a1e', '#7a5c0a', '#385888', '#6a2a6a', '#2a6a5a'];
  const allBtn = document.createElement('button');
  allBtn.className = `filter-btn ${!activeTypeFilter ? 'active' : ''}`;
  allBtn.innerHTML = `<span class="filter-dot" style="background:#4a3010"></span>Todas (${creatures.length})`;
  allBtn.onclick = () => { activeTypeFilter = null; render(); };
  container.appendChild(allBtn);
  let colorIdx = 0;
  for (let [type, count] of types.entries()) {
    const btn = document.createElement('button');
    btn.className = `filter-btn ${activeTypeFilter === type ? 'active' : ''}`;
    btn.innerHTML = `<span class="filter-dot" style="background:${colors[colorIdx % colors.length]}"></span>${cap(type)}`;
    btn.onclick = () => { activeTypeFilter = type; render(); };
    container.appendChild(btn);
    colorIdx++;
  }
}

function getFiltered() {
  const query = document.getElementById('searchInput')?.value.toLowerCase().trim() || '';
  return creatures.filter(c => {
    const matchSearch = !query || 
      c.name.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query) ||
      c.region.toLowerCase().includes(query);
    const matchType = !activeTypeFilter || 
      c.mainType === activeTypeFilter || 
      c.typeTags.includes(activeTypeFilter);
    return matchSearch && matchType;
  });
}

function renderList() {
  const listUl = document.getElementById('creatureList');
  const filtered = getFiltered();
  document.getElementById('listCount').textContent = `${filtered.length}/${creatures.length}`;
  listUl.innerHTML = '';
  const fallbackImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36'%3E%3Crect width='36' height='36' fill='%231a1408'/%3E%3Ctext x='18' y='24' font-size='18' text-anchor='middle' fill='%234a3518'%3E☽%3C/text%3E%3C/svg%3E";
  filtered.forEach(c => {
    const li = document.createElement('li');
    li.className = `creature-list-item ${c.id === selectedId ? 'selected' : ''}`;
    li.innerHTML = `
      <img class="creature-list-thumb" src="${esc(c.image || fallbackImg)}" alt="${esc(c.name)}" onerror="this.src='${fallbackImg}'">
      <div>
        <div class="creature-list-name">${esc(c.name)}</div>
        <div class="creature-list-type">${esc(c.mainType)}</div>
      </div>
    `;
    li.onclick = () => showCreature(c.id);
    listUl.appendChild(li);
  });
}

function renderGrid() {
  const grid = document.getElementById('gridView');
  const filtered = getFiltered();
  grid.innerHTML = '';
  const fallbackImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='170'%3E%3Crect width='200' height='170' fill='%231a1408'/%3E%3Ctext x='100' y='95' font-size='48' text-anchor='middle' fill='%234a3518'%3E☽%3C/text%3E%3C/svg%3E";
  filtered.forEach(c => {
    const card = document.createElement('div');
    card.className = 'grid-card';
    card.innerHTML = `
      <div class="grid-card-corner">✦</div>
      <img class="grid-card-img" src="${esc(c.image || fallbackImg)}" alt="${esc(c.name)}" onerror="this.src='${fallbackImg}'">
      <div class="grid-card-body">
        <div class="grid-card-name">${esc(c.name)}</div>
        <div class="grid-card-type">${esc(c.mainType)}</div>
      </div>
    `;
    card.onclick = () => { setView('detail'); showCreature(c.id); };
    grid.appendChild(card);
  });
}

function showCreature(id) {
  selectedId = id;
  saveSelectedId();
  const creature = getCreature(id);
  if (!creature) return;
  document.querySelectorAll('.creature-list-item').forEach(el => el.classList.remove('selected'));
  const filtered = getFiltered();
  const idx = filtered.findIndex(c => c.id === id);
  if (idx !== -1) {
    const items = document.querySelectorAll('.creature-list-item');
    if (items[idx]) items[idx].classList.add('selected');
  }
  if (currentView !== 'detail') setView('detail', false);
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('gridView').style.display = 'none';
  const pageDiv = document.getElementById('creaturePage');
  pageDiv.style.display = 'block';
  pageDiv.innerHTML = buildCreaturePage(creature);
}

function showEmpty() {
  document.getElementById('emptyState').style.display = 'flex';
  document.getElementById('creaturePage').style.display = 'none';
  document.getElementById('gridView').style.display = 'none';
}

function buildCreaturePage(c) {
  const tagHtml = (tags, cls) => tags.map(t => `<span class="tag ${cls}">${esc(cap(t))}</span>`).join('');
  const refsHtml = Object.entries(c.refs || {}).map(([title, url]) =>
    `<li><a class="ref-link" href="${esc(url)}" target="_blank" rel="noopener">↗ ${esc(title)}</a></li>`
  ).join('');
  const fallbackImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='340'%3E%3Crect width='320' height='340' fill='%230a0804'/%3E%3Ctext x='160' y='185' font-size='80' text-anchor='middle' fill='%233a2810'%3E☽%3C/text%3E%3C/svg%3E";
  const stats = c.stats || {};
  return `
  <div class="creature-page">
    <div class="creature-hero">
      <div class="creature-info-main">
        <h1 class="creature-name" contenteditable="true" spellcheck="false">${esc(c.name)}</h1>
        <div class="creature-latin" contenteditable="true" spellcheck="false">${esc(c.latin)}</div>
        ${c.elements.length ? `<div class="tag-group"><span class="tag-group-label">⚡ Elementos</span><div class="tag-wrap">${tagHtml(c.elements, 'tag-element')}</div></div>` : ''}
        ${c.regionTags.length ? `<div class="tag-group"><span class="tag-group-label">🗺 Biomas</span><div class="tag-wrap">${tagHtml(c.regionTags, 'tag-region')}</div></div>` : ''}
        ${c.typeTags.length ? `<div class="tag-group"><span class="tag-group-label">⚔ Tipo</span><div class="tag-wrap">${tagHtml(c.typeTags, 'tag-type')}</div></div>` : ''}
        ${c.otherTags.length ? `<div class="tag-group"><span class="tag-group-label">✧ Outras</span><div class="tag-wrap">${tagHtml(c.otherTags, 'tag-other')}</div></div>` : ''}
        <div class="region-badge">
          <span class="region-badge-icon">⚑</span>
          <div>
            <div class="region-badge-label">Região</div>
            <div class="region-badge-name">${esc(c.region)}</div>
          </div>
        </div>
      </div>
      <div class="creature-img-panel">
        <img src="${esc(c.image || fallbackImg)}" alt="${esc(c.name)}" onerror="this.src='${fallbackImg}'">
        <div class="img-frame"></div>
        <button class="img-change-btn" data-id="${c.id}">🖼 Alterar Imagem</button>
      </div>
    </div>
    <div class="stats-panel">
      <div class="stat-block"><span class="stat-label">Força</span><div class="stat-value stat-str" contenteditable="true" spellcheck="false">${esc(stats.str)}</div></div>
      <div class="stat-block"><span class="stat-label">Defesa</span><div class="stat-value stat-def" contenteditable="true" spellcheck="false">${esc(stats.def)}</div></div>
      <div class="stat-block"><span class="stat-label">Inteligência</span><div class="stat-value stat-int" contenteditable="true" spellcheck="false">${esc(stats.int)}</div></div>
      <div class="stat-block"><span class="stat-label">Perigo</span><div class="stat-value stat-per" contenteditable="true" spellcheck="false">${esc(stats.per)}</div></div>
    </div>
    <div class="ornamental-divider">⸸</div>
    <div class="creature-description">
      <div class="desc-body" contenteditable="true" spellcheck="false">${esc(c.description).replace(/\n+/g, '<br><br>')}</div>
    </div>
    ${refsHtml ? `<div class="creature-refs"><div class="refs-title">Fontes &amp; Inspirações</div><ul class="refs-list">${refsHtml}</ul></div>` : ''}
    <div class="creature-actions">
      <button class="action-btn btn-save-inline" data-id="${c.id}">💾 Salvar Edições</button>
      <button class="action-btn btn-edit" data-id="${c.id}">✎ Editar Completo</button>
      <button class="action-btn btn-export-page" data-id="${c.id}">📄 Exportar Página</button>
      <button class="action-btn btn-export-json" data-id="${c.id}">{ } JSON</button>
      <button class="action-btn btn-delete" data-id="${c.id}">✕ Remover</button>
      <span class="edit-hint">Clique nos campos para editar</span>
    </div>
  </div>`;
}

function buildStandalonePage(c) {
  const tagHtml = (tags, cls) => tags.map(t => `<span class="tag ${cls}">${t}</span>`).join('');
  const refsHtml = Object.entries(c.refs || {}).map(([title, url]) =>
    `<li><a class="ref-link" href="${url}" target="_blank" rel="noopener">↗ ${title}</a></li>`
  ).join('');
  const stats = c.stats || {};
  const descHtml = (c.description || '').split(/\n+/).filter(Boolean).map((p, i) =>
    `<p${i === 0 ? ' class="drop-cap"' : ''}>${p}</p>`
  ).join('');
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${c.name} — Codex Bestiarum</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=IM+Fell+English:ital@0;1&family=Cinzel:wght@400;600&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap" rel="stylesheet">
<style>
:root{--blood:#6b1010;--gold:#b8882a;--gold-s:#d4a83a;--parch:#f2e8cc;--parch-d:#ddc99a;--ink:#1c130a;--muted:#5a4228;--border:#9a7840;--border-d:#6a4e18;--moss:#253e18;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#0f0c07;font-family:'Crimson Pro',serif;color:var(--ink);display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem;}
.page{max-width:820px;width:100%;background:var(--parch);border:2px solid var(--border-d);box-shadow:0 20px 80px rgba(0,0,0,0.8);position:relative;overflow:hidden;}
.page::before{content:'';position:absolute;inset:0;background-image:repeating-linear-gradient(0deg,transparent,transparent 31px,rgba(154,120,64,0.08) 31px,rgba(154,120,64,0.08) 32px);pointer-events:none;z-index:0;}
.hero{display:grid;grid-template-columns:1fr 280px;position:relative;z-index:1;}
.info{padding:2.5rem 2.5rem 2rem;background:var(--parch);}
.name{font-family:'UnifrakturMaguntia',cursive;font-size:clamp(2rem,4vw,3rem);color:var(--blood);line-height:1.1;margin-bottom:.2rem;}
.latin{font-family:'IM Fell English',serif;font-style:italic;font-size:1rem;color:var(--muted);margin-bottom:1.4rem;}
.tag-group{margin-bottom:.9rem;}
.tag-label{font-family:'Cinzel',serif;font-size:.6rem;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:.4rem;}
.tag-wrap{display:flex;flex-wrap:wrap;gap:5px;}
.tag{font-family:'Cinzel',serif;font-size:.6rem;letter-spacing:.1em;padding:3px 10px;border:1px solid;text-transform:uppercase;}
.tag-e{background:#edf5e8;border-color:#5a8038;color:#1e4010;}
.tag-r{background:#f5e8e8;border-color:#8a3535;color:#5a1010;}
.tag-t{background:#f5f0e0;border-color:#8a7030;color:#5a4010;}
.tag-o{background:#e8ecf5;border-color:#385888;color:#1a3560;}
.region{display:inline-flex;align-items:center;gap:10px;background:var(--parch-d);border:1px solid var(--border);padding:6px 14px;margin-top:1rem;}
.region-icon{color:var(--blood);}
.region-label{font-family:'Cinzel',serif;font-size:.58rem;color:var(--muted);letter-spacing:.2em;text-transform:uppercase;}
.region-name{font-family:'Cinzel',serif;font-size:.8rem;color:var(--ink);font-weight:600;}
.img-panel{position:relative;background:#0a0804;overflow:hidden;}
.img-panel img{width:100%;height:100%;object-fit:cover;object-position:top;display:block;min-height:320px;filter:sepia(15%);}
.img-frame{position:absolute;inset:0;border:2px solid rgba(184,136,42,.2);pointer-events:none;}
.img-frame::before,.img-frame::after{content:'✦';position:absolute;color:rgba(184,136,42,.4);font-size:.8rem;}
.img-frame::before{top:8px;left:10px;}.img-frame::after{bottom:8px;right:10px;}
.stats{display:grid;grid-template-columns:repeat(4,1fr);background:var(--parch-d);border-top:2px solid var(--border-d);border-bottom:1px solid var(--border);padding:1.4rem 2.5rem;position:relative;z-index:1;}
.stat{text-align:center;}
.stat-l{font-family:'Cinzel',serif;font-size:.58rem;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:.3rem;}
.stat-v{font-family:'UnifrakturMaguntia',cursive;font-size:1.8rem;color:var(--blood);line-height:1;}
.divider{display:flex;align-items:center;gap:1rem;margin:1.6rem 2.5rem;color:var(--border);font-size:1rem;position:relative;z-index:1;}
.divider::before,.divider::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--border));}
.divider::after{background:linear-gradient(270deg,transparent,var(--border));}
.desc{padding:0 2.5rem 2.5rem;position:relative;z-index:1;}
.desc p{font-family:'IM Fell English',serif;font-size:1.06rem;line-height:1.85;color:#1e1408;text-align:justify;margin-bottom:1rem;}
.drop-cap::first-letter{font-family:'UnifrakturMaguntia',cursive;font-size:3.4rem;line-height:.75;float:left;margin-right:8px;margin-top:6px;color:var(--blood);}
.refs{border-top:1px solid var(--border);padding:1.3rem 2.5rem 1.8rem;background:var(--parch-d);position:relative;z-index:1;}
.refs-title{font-family:'Cinzel',serif;font-size:.6rem;letter-spacing:.25em;text-transform:uppercase;color:var(--muted);margin-bottom:.8rem;}
.refs-list{list-style:none;display:flex;flex-wrap:wrap;gap:6px;}
.ref-link{font-family:'Cinzel',serif;font-size:.65rem;color:var(--blood);text-decoration:none;border:1px solid rgba(107,16,16,.28);padding:4px 12px;}
.ref-link:hover{background:rgba(107,16,16,.1);}
.page-footer{text-align:center;padding:1rem;background:#0a0804;border-top:1px solid #2a1e08;}
.page-footer span{font-family:'Cinzel',serif;font-size:.6rem;color:#3a2810;letter-spacing:.2em;}
@media(max-width:650px){.hero{grid-template-columns:1fr;}.stats{grid-template-columns:1fr 1fr;}.img-panel{min-height:220px;}}
</style>
</head>
<body>
<div class="page">
  <div class="hero">
    <div class="info">
      <h1 class="name">${c.name}</h1>
      ${c.latin ? `<div class="latin">${c.latin}</div>` : ''}
      ${c.elements.length ? `<div class="tag-group"><span class="tag-label">⚡ Elementos</span><div class="tag-wrap">${tagHtml(c.elements, 'tag-e')}</div></div>` : ''}
      ${c.regionTags.length ? `<div class="tag-group"><span class="tag-label">🗺 Biomas</span><div class="tag-wrap">${tagHtml(c.regionTags, 'tag-r')}</div></div>` : ''}
      ${c.typeTags.length ? `<div class="tag-group"><span class="tag-label">⚔ Tipo</span><div class="tag-wrap">${tagHtml(c.typeTags, 'tag-t')}</div></div>` : ''}
      ${c.otherTags.length ? `<div class="tag-group"><span class="tag-label">✧ Outras</span><div class="tag-wrap">${tagHtml(c.otherTags, 'tag-o')}</div></div>` : ''}
      <div class="region"><span class="region-icon">⚑</span><div><div class="region-label">Região</div><div class="region-name">${c.region}</div></div></div>
    </div>
    <div class="img-panel">
      <img src="${c.image||''}" alt="${c.name}" onerror="this.style.display='none'">
      <div class="img-frame"></div>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><span class="stat-l">Força</span><span class="stat-v">${stats.str||'—'}</span></div>
    <div class="stat"><span class="stat-l">Defesa</span><span class="stat-v">${stats.def||'—'}</span></div>
    <div class="stat"><span class="stat-l">Inteligência</span><span class="stat-v">${stats.int||'—'}</span></div>
    <div class="stat"><span class="stat-l">Perigo</span><span class="stat-v">${stats.per||'—'}</span></div>
  </div>
  <div class="divider">⸸</div>
  <div class="desc">${descHtml}</div>
  ${refsHtml ? `<div class="refs"><div class="refs-title">Fontes &amp; Inspirações</div><ul class="refs-list">${refsHtml}</ul></div>` : ''}
  <div class="page-footer"><span>Codex Bestiarum — ${c.name}</span></div>
</div>
</body>
</html>`;
}

// ---------- MODAIS ----------
function openAddModal() {
  document.getElementById('editId').value = '';
  document.getElementById('modalTitle').textContent = 'Nova Criatura';
  ['fName', 'fLatin', 'fImage', 'fRegion', 'fMainType', 'fStr', 'fDef', 'fInt', 'fPer',
   'fElements', 'fRegionTags', 'fTypeTags', 'fOtherTags', 'fDesc', 'fRefs'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('editModal').classList.add('open');
}
function openEditModal(id) {
  const c = getCreature(id);
  if (!c) return;
  document.getElementById('editId').value = id;
  document.getElementById('modalTitle').textContent = 'Editar Criatura';
  document.getElementById('fName').value = c.name;
  document.getElementById('fLatin').value = c.latin;
  document.getElementById('fImage').value = c.image;
  document.getElementById('fRegion').value = c.region;
  document.getElementById('fMainType').value = c.mainType;
  document.getElementById('fStr').value = c.stats.str;
  document.getElementById('fDef').value = c.stats.def;
  document.getElementById('fInt').value = c.stats.int;
  document.getElementById('fPer').value = c.stats.per;
  document.getElementById('fElements').value = c.elements.join(', ');
  document.getElementById('fRegionTags').value = c.regionTags.join(', ');
  document.getElementById('fTypeTags').value = c.typeTags.join(', ');
  document.getElementById('fOtherTags').value = c.otherTags.join(', ');
  document.getElementById('fDesc').value = c.description;
  document.getElementById('fRefs').value = refsToStr(c.refs);
  document.getElementById('editModal').classList.add('open');
}
function closeModal() {
  document.getElementById('editModal').classList.remove('open');
}
function saveCreatureFromModal() {
  const name = document.getElementById('fName').value.trim();
  if (!name) {
    alert('O nome é obrigatório.');
    return;
  }
  const data = {
    name,
    latin: document.getElementById('fLatin').value.trim(),
    image: document.getElementById('fImage').value.trim(),
    region: document.getElementById('fRegion').value.trim() || 'Desconhecida',
    mainType: document.getElementById('fMainType').value.trim() || 'Indefinido',
    stats: {
      str: document.getElementById('fStr').value.trim() || '—',
      def: document.getElementById('fDef').value.trim() || '—',
      int: document.getElementById('fInt').value.trim() || '—',
      per: document.getElementById('fPer').value.trim() || '★★☆☆☆',
    },
    elements: document.getElementById('fElements').value,
    regionTags: document.getElementById('fRegionTags').value,
    typeTags: document.getElementById('fTypeTags').value,
    otherTags: document.getElementById('fOtherTags').value,
    description: document.getElementById('fDesc').value.trim(),
    refs: document.getElementById('fRefs').value.trim(),
  };
  const id = document.getElementById('editId').value;
  if (id) updateCreature(id, data);
  else addCreature(data);
  closeModal();
}

function openImportModal() {
  document.getElementById('importJson').value = '';
  document.getElementById('importModal').classList.add('open');
}
function doImport() {
  const json = document.getElementById('importJson').value.trim();
  if (!json) { alert('Cole o JSON.'); return; }
  let arr;
  try { arr = JSON.parse(json); } catch (e) { toast('JSON inválido.'); return; }
  if (!Array.isArray(arr)) { toast('Esperado um array.'); return; }
  let added = 0;
  for (const item of arr) {
    const existing = creatures.find(c => c.name.toLowerCase() === (item.name || '').toLowerCase());
    if (existing) {
      Object.assign(existing, sanitize(item), { id: existing.id });
    } else {
      creatures.push({ id: genId(item.name), ...sanitize(item) });
      added++;
    }
  }
  saveToLocalStorage();
  render();
  document.getElementById('importModal').classList.remove('open');
  toast(`${added} nova(s) criatura(s) importada(s).`);
}

function exportAll() {
  if (creatures.length === 0) {
    toast('Nenhuma criatura para exportar.');
    return;
  }
  document.getElementById('exportArea').textContent = JSON.stringify(creatures, null, 2);
  document.getElementById('exportModal').classList.add('open');
}
function exportOneJson(id) {
  const c = getCreature(id);
  if (c) {
    document.getElementById('exportArea').textContent = JSON.stringify([c], null, 2);
    document.getElementById('exportModal').classList.add('open');
  }
}
function copyExport() {
  const text = document.getElementById('exportArea').textContent;
  navigator.clipboard.writeText(text).then(() => toast('JSON copiado!'));
}

// ---------- VIEW ----------
function setView(view, doRender = true) {
  currentView = view;
  document.getElementById('navDetail').classList.toggle('active', view === 'detail');
  document.getElementById('navGrid').classList.toggle('active', view === 'grid');
  if (view === 'grid') {
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('creaturePage').style.display = 'none';
    document.getElementById('gridView').style.display = 'grid';
    renderGrid();
  } else {
    document.getElementById('gridView').style.display = 'none';
    if (selectedId) {
      showCreature(selectedId);
    } else if (creatures.length > 0) {
      showCreature(creatures[0].id);
    } else {
      showEmpty();
    }
  }
}

function filterCreatures() { render(); }

// ---------- TOAST ----------
function toast(msg, duration = 3000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._to);
  t._to = setTimeout(() => t.classList.remove('show'), duration);
}

// ---------- EVENTOS ----------
function bindGlobalEvents() {
  document.getElementById('navDetail').addEventListener('click', () => setView('detail'));
  document.getElementById('navGrid').addEventListener('click', () => setView('grid'));
  document.getElementById('importBtn').addEventListener('click', openImportModal);
  document.getElementById('exportAllBtn').addEventListener('click', exportAll);
  document.getElementById('addCreatureBtn').addEventListener('click', openAddModal);
  document.getElementById('searchInput').addEventListener('input', filterCreatures);
  
  // Removemos os botões de carregar/salvar JSON (não necessários)
  
  document.getElementById('closeEditModalBtn').addEventListener('click', closeModal);
  document.getElementById('cancelEditBtn').addEventListener('click', closeModal);
  document.getElementById('saveCreatureBtn').addEventListener('click', saveCreatureFromModal);
  document.getElementById('closeImgModalBtn').addEventListener('click', () => document.getElementById('imgModal').classList.remove('open'));
  document.getElementById('cancelImgBtn').addEventListener('click', () => document.getElementById('imgModal').classList.remove('open'));
  document.getElementById('applyImgBtn').addEventListener('click', applyImageChange);
  document.getElementById('closeImportModalBtn').addEventListener('click', () => document.getElementById('importModal').classList.remove('open'));
  document.getElementById('cancelImportBtn').addEventListener('click', () => document.getElementById('importModal').classList.remove('open'));
  document.getElementById('doImportBtn').addEventListener('click', doImport);
  document.getElementById('closeExportModalBtn').addEventListener('click', () => document.getElementById('exportModal').classList.remove('open'));
  document.getElementById('cancelExportBtn').addEventListener('click', () => document.getElementById('exportModal').classList.remove('open'));
  document.getElementById('copyExportBtn').addEventListener('click', copyExport);
  
  document.getElementById('contentArea').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-id]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    if (btn.classList.contains('img-change-btn')) openImgModal(id);
    else if (btn.classList.contains('btn-save-inline')) saveInlineEdits(id);
    else if (btn.classList.contains('btn-edit')) openEditModal(id);
    else if (btn.classList.contains('btn-export-page')) exportPage(id);
    else if (btn.classList.contains('btn-export-json')) exportOneJson(id);
    else if (btn.classList.contains('btn-delete')) removeCreature(id);
  });
}

// ---------- INICIALIZAÇÃO ----------
function start() {
  bindGlobalEvents();
  const hasData = loadFromLocalStorage();
  if (!hasData || creatures.length === 0) {
    creatures = getDefaultCreatures();
    saveToLocalStorage();
  }
  loadSelectedId();
  render();
  if (selectedId) {
    showCreature(selectedId);
  } else if (creatures.length > 0) {
    showCreature(creatures[0].id);
  } else {
    showEmpty();
  }
  toast('Codex Bestiarum pronto. Alterações são salvas automaticamente.');
}

start();