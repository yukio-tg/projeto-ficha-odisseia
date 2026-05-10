const RadarRPG = (() => {
  let styleInjected = false;

  // Valores padrão (tema original) – serão usados como fallback caso nenhum tema seja informado
  const DEFAULT_THEME = {
    gold: '#c9a84c',
    goldLight: '#e8d48a',
    goldDim: '#7a6130',
    crimson: '#c0392b',
    ink: '#d4c89a',
    inkDim: '#7a7060',
    levelColor: '#c0392b'
  };

  // CSS base usando variáveis CSS com fallback para os valores padrão
  const styles = `
    .radar-rpg {
      --gold: ${DEFAULT_THEME.gold};
      --gold-light: ${DEFAULT_THEME.goldLight};
      --gold-dim: ${DEFAULT_THEME.goldDim};
      --crimson: ${DEFAULT_THEME.crimson};
      --ink: ${DEFAULT_THEME.ink};
      --ink-dim: ${DEFAULT_THEME.inkDim};
      --level-color: ${DEFAULT_THEME.levelColor};
      font-family: 'IM Fell English', Georgia, serif;
      color: var(--ink);
      width: 100%;
      background: transparent;
    }
    .radar-rpg *, .radar-rpg *::before, .radar-rpg *::after { box-sizing: border-box; margin: 0; padding: 0; }

    .radar-rpg .card {
      background: transparent;
      border: none;
      box-shadow: none;
      padding: 1.5rem 0 0.5rem;
      width: 100%;
      position: relative;
    }
    .radar-rpg .card::before, .radar-rpg .card::after,
    .radar-rpg .card-corner-br, .radar-rpg .card-corner-bl { display: none; }

    .radar-rpg .radar-container { position: relative; width: 100%; }
    .radar-rpg .radar-canvas    { display: block; width: 100%; height: auto; }

    .radar-rpg .mode-switch-wrap {
      display: flex; justify-content: flex-end; align-items: center; gap: 0.5rem;
      margin-bottom: 0.8rem; font-size: 0.7rem; color: var(--ink-dim);
      font-family: 'Cinzel', serif; text-transform: uppercase; letter-spacing: 0.06em;
    }
    .radar-rpg .mode-switch {
      position: relative; display: inline-block; width: 40px; height: 20px;
    }
    .radar-rpg .mode-switch input { opacity: 0; width: 0; height: 0; }
    .radar-rpg .slider {
      position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
      background-color: color-mix(in srgb, var(--gold) 25%, transparent);
      transition: 0.3s; border-radius: 20px;
    }
    .radar-rpg .slider:before {
      position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px;
      background-color: var(--gold-light); transition: 0.3s; border-radius: 50%;
    }
    .radar-rpg input:checked + .slider { background-color: var(--gold); }
    .radar-rpg input:checked + .slider:before { transform: translateX(20px); }

    .radar-rpg .attr-wrap {
      position: absolute; display: flex; flex-direction: column; align-items: center; gap: 3px;
      transform: translate(-50%, -50%); pointer-events: none; z-index: 5;
    }
    .radar-rpg .attr-label {
      font-family: 'Cinzel', serif; font-size: clamp(0.45rem, 1.2vw, 0.6rem);
      letter-spacing: 0.08em; text-transform: uppercase;
      text-shadow: 0 0 8px rgba(201,168,76,0.8), 0 1px 4px #000;
      white-space: nowrap; pointer-events: none;
    }
    .radar-rpg .attr-input {
      pointer-events: all; width: clamp(34px, 7.5vw, 44px); height: clamp(34px, 7.5vw, 44px);
      background: rgba(10,8,5,0.92); border: 2px solid; border-radius: 50%;
      color: var(--gold-light); font-family: 'Cinzel', serif;
      font-size: clamp(0.72rem, 1.7vw, 0.92rem); font-weight: 700; text-align: center; outline: none;
      box-shadow: 0 0 10px rgba(0,0,0,0.4), inset 0 0 8px rgba(0,0,0,0.7);
      transition: border-color 0.2s, box-shadow 0.2s;
      -moz-appearance: textfield; appearance: textfield;
    }
    .radar-rpg .attr-input::-webkit-inner-spin-button,
    .radar-rpg .attr-input::-webkit-outer-spin-button { -webkit-appearance: none; }
    .radar-rpg .attr-input:focus {
      box-shadow: 0 0 0 2px var(--glow-color, rgba(201,168,76,0.3)),
                  0 0 14px var(--glow-color, rgba(201,168,76,0.4)),
                  inset 0 0 8px rgba(0,0,0,0.7);
    }

    .radar-rpg .mod-wrap {
      pointer-events: all; display: flex; flex-direction: column; align-items: center; gap: 1px;
    }
    .radar-rpg .mod-label {
      font-family: 'Cinzel', serif; font-size: clamp(0.38rem, 0.9vw, 0.48rem);
      letter-spacing: 0.06em; text-transform: uppercase; color: color-mix(in srgb, var(--ink-dim) 55%, transparent);
      pointer-events: none; white-space: nowrap;
    }
    .radar-rpg .mod-input {
      pointer-events: all; width: clamp(28px, 5vw, 36px); height: clamp(16px, 3vw, 20px);
      background: rgba(10,8,5,0.85); border: 1px solid; border-radius: 3px;
      color: var(--gold-light); font-family: 'Cinzel', serif;
      font-size: clamp(0.48rem, 1.1vw, 0.6rem); font-weight: 700; text-align: center; outline: none;
      box-shadow: 0 0 6px rgba(0,0,0,0.5), inset 0 0 4px rgba(0,0,0,0.6);
      transition: border-color 0.2s, box-shadow 0.2s;
      -moz-appearance: textfield; appearance: textfield; cursor: pointer; padding: 0;
    }
    .radar-rpg .mod-input::-webkit-inner-spin-button,
    .radar-rpg .mod-input::-webkit-outer-spin-button { -webkit-appearance: none; }
    .radar-rpg .mod-input:focus {
      box-shadow: 0 0 0 1px var(--glow-color, rgba(201,168,76,0.3)),
                  0 0 8px var(--glow-color, rgba(201,168,76,0.3)),
                  inset 0 0 4px rgba(0,0,0,0.6);
    }

    .radar-rpg .level-center {
      position: absolute; transform: translate(-50%, -50%); z-index: 10;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      pointer-events: none;
    }
    .radar-rpg .hex-shell {
      position: relative; display: flex; align-items: center; justify-content: center; pointer-events: all;
    }
    .radar-rpg .hex-svg {
      position: absolute; top: 0; left: 0; pointer-events: none;
    }
    .radar-rpg .level-label {
      font-family: 'Cinzel', serif; font-size: clamp(0.38rem, 1vw, 0.52rem);
      letter-spacing: 0.14em; text-transform: uppercase; color: color-mix(in srgb, var(--gold) 65%, transparent);
      position: absolute; bottom: 18%; left: 50%; transform: translateX(-50%);
      pointer-events: none; white-space: nowrap;
    }
    .radar-rpg .level-input {
      pointer-events: all; background: transparent; border: none;
      color: var(--gold-light); font-family: 'Cinzel Decorative', serif;
      font-size: clamp(1.1rem, 3.5vw, 1.6rem); font-weight: 700; text-align: center; outline: none;
      width: 100%; text-shadow: 0 0 14px rgba(201,168,76,0.7), 0 2px 6px #000;
      -moz-appearance: textfield; appearance: textfield; position: relative; z-index: 2; padding-bottom: 8%;
    }
    .radar-rpg .level-input::-webkit-inner-spin-button,
    .radar-rpg .level-input::-webkit-outer-spin-button { -webkit-appearance: none; }

    .radar-rpg .divider { display: none; }

    .radar-rpg .total-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.4rem 0 0; margin-top: 0.4rem;
    }
    .radar-rpg .total-label {
      font-family: 'Cinzel', serif; font-size: 0.7rem; color: var(--ink-dim);
      letter-spacing: 0.12em; text-transform: uppercase;
    }
    .radar-rpg .total-value {
      font-family: 'Cinzel Decorative', serif; font-size: 1rem;
      color: var(--gold-light); text-shadow: 0 0 10px rgba(201,168,76,0.5);
    }
  `;

  function injectStyles() {
    if (styleInjected) return;
    const el = document.createElement('style');
    el.textContent = styles;
    document.head.appendChild(el);
    styleInjected = true;
  }

  // Converte cor hexadecimal (#RRGGBB) para string rgba
  function hexToRgba(hex, alpha) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    const r = parseInt(hex.substring(0,2), 16);
    const g = parseInt(hex.substring(2,4), 16);
    const b = parseInt(hex.substring(4,6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  let idCounter = 0;

  class RadarInstance {
    constructor(container, options = {}) {
      this.container = container;
      this.id = `rpg${++idCounter}`;
      container.classList.add('radar-rpg');
      container.innerHTML = '';

      // Tema personalizável — mescla com DEFAULT_THEME
      this.theme = { ...DEFAULT_THEME, ...(options.theme || {}) };

      // Aplica as variáveis CSS no container para que o CSS injetado as utilize
      container.style.setProperty('--gold', this.theme.gold);
      container.style.setProperty('--gold-light', this.theme.goldLight);
      container.style.setProperty('--gold-dim', this.theme.goldDim);
      container.style.setProperty('--crimson', this.theme.crimson);
      container.style.setProperty('--ink', this.theme.ink);
      container.style.setProperty('--ink-dim', this.theme.inkDim);
      container.style.setProperty('--level-color', this.theme.levelColor);

      this.attrs = options.attrs || [
        { abbr: 'FOR', color: '#c0392b' },
        { abbr: 'DES', color: '#3b82f6' },
        { abbr: 'CAR', color: '#a855f7' },
        { abbr: 'SAB', color: '#10b981' },
        { abbr: 'INT', color: '#eab308' },
        { abbr: 'CON', color: '#f97316' }
      ];
      this.N = this.attrs.length;
      this.MAX = options.max || 20;
      this.TICKS = options.ticks || 4;
      this.PADDING = options.padding || 76;
      this.INPUT_OFFSET = options.inputOffset || 42;
      // Fator de raio mínimo (zero começa a esta distância do centro)
      this.minRadiusFactor = options.minRadiusFactor || 0.18;
      this.levelVal = options.level || 1;
      this.maxPoints = 10 + this.levelVal;
      this.values = options.values || Array(this.N).fill(0);
      this.modValues = options.modValues || Array(this.N).fill('');

      this.mode = options.mode || 'percent';

      this.cssVertices = [];
      this.centerCSS = { x: 0, y: 0 };
      this.outerR_CSS = 0;
      this.inputWraps = [];

      this.levelEl = null;
      this.hexSvgEl = null;
      this.levelInput = null;
      this.modeToggle = null;

      this.buildDOM();
      this.initCanvas();
      this.attachEvents();
    }

    buildDOM() {
      const cont = this.container;
      cont.innerHTML = `
        <div class="card">
          <div class="mode-switch-wrap">
            <span>Escala:</span>
            <span>Absoluta</span>
            <label class="mode-switch">
              <input type="checkbox" id="${this.id}-mode" ${this.mode === 'percent' ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <span>%</span>
          </div>
          <div class="radar-container">
            <canvas class="radar-canvas"></canvas>
          </div>
          <div class="total-row">
            <span class="total-label">Total de Pontos</span>
            <span class="total-value">—</span>
          </div>
        </div>
      `;
      this.canvas = cont.querySelector('.radar-canvas');
      this.radarContainer = cont.querySelector('.radar-container');
      this.totalEl = cont.querySelector('.total-value');
      this.modeToggle = cont.querySelector(`#${this.id}-mode`);
      this.modeToggle.addEventListener('change', () => {
        this.mode = this.modeToggle.checked ? 'percent' : 'raw';
        this.draw();
        this.updateTotal();
      });
      this.updateTotal();
    }

    initCanvas() {
      this.ctx = this.canvas.getContext('2d');
      this.DPR = window.devicePixelRatio || 1;
      this.resize();
    }

    resize = () => {
      const side = this.radarContainer.clientWidth;
      if (side === 0) return;
      const canvas = this.canvas;
      canvas.style.width = side + 'px';
      canvas.style.height = side + 'px';
      canvas.width = Math.round(side * this.DPR);
      canvas.height = Math.round(side * this.DPR);
      this.ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
      this.draw();
    };

    angleOf(i) { return -Math.PI / 2 + (2 * Math.PI / this.N) * i; }

    vertex(cx, cy, r, i) {
      const a = this.angleOf(i);
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), angle: a };
    }

    getDisplayValues() {
      if (this.mode === 'percent') {
        const maxRaw = Math.max(...this.values, 1);
        return this.values.map(v => (v / maxRaw) * this.MAX);
      }
      return [...this.values];
    }

    draw() {
      const { ctx, canvas, DPR, N, TICKS, PADDING, MAX, attrs, theme, minRadiusFactor } = this;
      const displayValues = this.getDisplayValues();
      const W = canvas.width / DPR;
      const H = canvas.height / DPR;
      const cx = W / 2;
      const cy = H / 2;
      const R = Math.min(W, H) / 2 - PADDING;
      const minRadius = R * minRadiusFactor; // raio mínimo (zero do gráfico)

      ctx.clearRect(0, 0, W, H);

      // Cores derivadas do tema
      const goldAlpha30 = hexToRgba(theme.gold, 0.30);
      const goldAlpha11 = hexToRgba(theme.gold, 0.11);
      const crimsonAlpha18 = hexToRgba(theme.crimson, 0.18);

      // Grid
      for (let t = 1; t <= TICKS; t++) {
        const r = R * t / TICKS;
        ctx.beginPath();
        for (let i = 0; i < N; i++) {
          const v = this.vertex(cx, cy, r, i);
          i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y);
        }
        ctx.closePath();
        ctx.strokeStyle = t === TICKS ? goldAlpha30 : goldAlpha11;
        ctx.lineWidth = t === TICKS ? 1.5 : 1;
        ctx.stroke();
      }

      // Eixos
      for (let i = 0; i < N; i++) {
        const v = this.vertex(cx, cy, R, i);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(v.x, v.y);
        ctx.strokeStyle = attrs[i].color;
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }

      // Rótulos dos anéis – agora mais visíveis (ink0 com opacidade total)
      ctx.font = '10px "Cinzel", serif';
      ctx.fillStyle = theme.ink0 || '#120d04';    // cor bem escura / preta do pergaminho
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (let t = 1; t < TICKS; t++) {
        const r = R * t / TICKS;
        const label = this.mode === 'percent' ? `${t * (100 / TICKS)}%` : t * (MAX / TICKS);
        ctx.fillText(label, cx + 5, cy - r);
      }

      // Polígono de dados – começa no minRadius em vez do centro
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        // Mapeia 0..MAX para o intervalo [minRadius, R]
        const r = minRadius + (R - minRadius) * (displayValues[i] / MAX);
        const v = this.vertex(cx, cy, r, i);
        i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y);
      }
      ctx.closePath();
      ctx.fillStyle = crimsonAlpha18;
      ctx.fill();
      ctx.strokeStyle = theme.crimson;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Pontos nos vértices (também ajustados)
      for (let i = 0; i < N; i++) {
        const r = minRadius + (R - minRadius) * (displayValues[i] / MAX);
        const v = this.vertex(cx, cy, r, i);
        ctx.beginPath();
        ctx.arc(v.x, v.y, 4.8, 0, Math.PI * 2);
        ctx.fillStyle = attrs[i].color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff22';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      this.cssVertices = [];
      for (let i = 0; i < N; i++) this.cssVertices.push(this.vertex(cx, cy, R, i));
      this.centerCSS = { x: cx, y: cy };
      this.outerR_CSS = R;

      this.placeInputs();
      this.placeLevelHex();
    }

    createInputs() {
      const cont = this.radarContainer;
      this.attrs.forEach((attr, i) => {
        const wrap = document.createElement('div');
        wrap.className = 'attr-wrap';

        const lbl = document.createElement('span');
        lbl.className = 'attr-label';
        lbl.textContent = attr.abbr;
        lbl.style.color = attr.color;

        const inp = document.createElement('input');
        inp.type = 'number';
        inp.className = 'attr-input';
        inp.min = 0; inp.max = this.MAX;
        inp.value = this.values[i];
        inp.style.borderColor = attr.color;
        inp.style.setProperty('--glow-color', attr.color + '66');

        inp.addEventListener('input', () => {
          let v = parseInt(inp.value, 10);
          if (isNaN(v) || v < 0) v = 0;
          if (v > this.MAX) v = this.MAX;
          this.values[i] = v;
          inp.value = v;
          this.draw();
          this.updateTotal();
        });
        inp.addEventListener('blur', () => { inp.value = this.values[i]; });

        const modWrap = document.createElement('div');
        modWrap.className = 'mod-wrap';
        const modLbl = document.createElement('span');
        modLbl.className = 'mod-label';
        modLbl.textContent = 'mod';
        modLbl.style.color = attr.color + 'aa';
        const modInp = document.createElement('input');
        modInp.type = 'text';
        modInp.className = 'mod-input';
        modInp.value = this.modValues[i] || '';
        modInp.style.borderColor = attr.color + 'cc';
        modInp.style.setProperty('--glow-color', attr.color + '44');
        modInp.title = 'Modificador (livre)';
        modInp.addEventListener('input', () => {
          this.modValues[i] = modInp.value;
        });

        modWrap.appendChild(modLbl);
        modWrap.appendChild(modInp);
        wrap.appendChild(lbl);
        wrap.appendChild(inp);
        wrap.appendChild(modWrap);
        cont.appendChild(wrap);
        this.inputWraps.push({ wrap, modInp });
      });
    }

    placeInputs() {
      if (this.inputWraps.length === 0) this.createInputs();
      for (let i = 0; i < this.N; i++) {
        const { x, y, angle } = this.cssVertices[i];
        const fx = x + this.INPUT_OFFSET * Math.cos(angle);
        const fy = y + this.INPUT_OFFSET * Math.sin(angle);
        const { wrap } = this.inputWraps[i];
        wrap.style.left = fx + 'px';
        wrap.style.top = fy + 'px';
        const sin = Math.sin(angle);
        wrap.style.flexDirection = sin > 0.1 ? 'column' : 'column-reverse';
      }
    }

    hexPoints(cx, cy, r) {
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (Math.PI / 3) * i;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
      return pts;
    }

    updateHexGlow() {
      if (!this.hexSvgEl) return;
      const t   = (this.levelVal - 1) / 19;
      const baseColor = this.theme.levelColor;
      const baseHex = baseColor.replace('#', '');
      const r = Math.round(parseInt(baseHex.substring(0,2), 16) + t * (255 - parseInt(baseHex.substring(0,2), 16)));
      const g = Math.round(parseInt(baseHex.substring(2,4), 16) + t * (255 - parseInt(baseHex.substring(2,4), 16)));
      const b = Math.round(parseInt(baseHex.substring(4,6), 16) + t * (255 - parseInt(baseHex.substring(4,6), 16)));
      const hex = '#' + [r,g,b].map(x => Math.min(255, x).toString(16).padStart(2,'0')).join('');
      const outer = this.hexSvgEl.querySelector('.hex-outer');
      const inner = this.hexSvgEl.querySelector('.hex-inner');
      if (outer) outer.setAttribute('stroke', hex);
      if (inner) inner.setAttribute('stroke', hex + '55');
      const glow = this.hexSvgEl.querySelector('.hex-glow');
      if (glow) glow.setAttribute('stdDeviation', 4 + t * 6);
    }

    buildLevelEl() {
      const el = document.createElement('div');
      el.className = 'level-center';
      this.levelEl = el;

      const shell = document.createElement('div');
      shell.className = 'hex-shell';

      this.hexSvgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      this.hexSvgEl.classList.add('hex-svg');

      const inp = document.createElement('input');
      inp.type = 'number';
      inp.className = 'level-input';
      inp.min = 1; inp.max = 20;
      inp.value = this.levelVal;
      inp.setAttribute('aria-label', 'Nível do personagem');
      inp.addEventListener('input', () => {
        let v = parseInt(inp.value, 10);
        if (isNaN(v) || v < 1) v = 1;
        if (v > 20) v = 20;
        this.levelVal = v;
        this.maxPoints = 10 + v;
        this.updateTotal();
        this.updateHexGlow();
      });
      inp.addEventListener('blur', () => { inp.value = this.levelVal; });
      this.levelInput = inp;

      const lbl = document.createElement('span');
      lbl.className = 'level-label';
      lbl.textContent = 'nível';

      shell.appendChild(this.hexSvgEl);
      shell.appendChild(inp);
      shell.appendChild(lbl);
      el.appendChild(shell);
      this.radarContainer.appendChild(el);
    }

    placeLevelHex() {
      if (!this.levelEl) this.buildLevelEl();

      const size = Math.max(32, this.outerR_CSS * 0.20);
      const dim  = size * 2 + 12;

      const shell = this.levelEl.querySelector('.hex-shell');
      shell.style.width  = dim + 'px';
      shell.style.height = dim + 'px';

      this.levelEl.style.left = this.centerCSS.x + 'px';
      this.levelEl.style.top  = this.centerCSS.y + 'px';

      const svg = this.hexSvgEl;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      const svgNS = 'http://www.w3.org/2000/svg';
      svg.setAttribute('width',  dim);
      svg.setAttribute('height', dim);
      svg.setAttribute('viewBox', `0 0 ${dim} ${dim}`);
      svg.style.width  = dim + 'px';
      svg.style.height = dim + 'px';

      const hcx = dim / 2, hcy = dim / 2;

      const defs = document.createElementNS(svgNS, 'defs');
      const filter = document.createElementNS(svgNS, 'filter');
      filter.setAttribute('id', `hglow-${this.id}`);
      const fe = document.createElementNS(svgNS, 'feGaussianBlur');
      fe.setAttribute('stdDeviation', '6');
      fe.setAttribute('result', 'blur');
      fe.classList.add('hex-glow');
      filter.appendChild(fe);
      const feMerge = document.createElementNS(svgNS, 'feMerge');
      ['blur','SourceGraphic'].forEach(ref => {
        const n = document.createElementNS(svgNS, 'feMergeNode');
        n.setAttribute('in', ref);
        feMerge.appendChild(n);
      });
      filter.appendChild(feMerge);
      defs.appendChild(filter);
      svg.appendChild(defs);

      const bg = document.createElementNS(svgNS, 'polygon');
      bg.setAttribute('points', this.hexPoints(hcx, hcy, size).map(p => p.join(',')).join(' '));
      bg.setAttribute('fill', 'rgba(10,8,5,0.92)');
      svg.appendChild(bg);

      const inner = document.createElementNS(svgNS, 'polygon');
      inner.classList.add('hex-inner');
      inner.setAttribute('points', this.hexPoints(hcx, hcy, size * 0.72).map(p => p.join(',')).join(' '));
      inner.setAttribute('fill', 'none');
      inner.setAttribute('stroke', this.theme.crimson + '55');
      inner.setAttribute('stroke-width', '0.8');
      svg.appendChild(inner);

      const outer = document.createElementNS(svgNS, 'polygon');
      outer.classList.add('hex-outer');
      outer.setAttribute('points', this.hexPoints(hcx, hcy, size).map(p => p.join(',')).join(' '));
      outer.setAttribute('fill', 'none');
      outer.setAttribute('stroke', this.theme.crimson);
      outer.setAttribute('stroke-width', '2');
      outer.setAttribute('filter', `url(#hglow-${this.id})`);
      svg.appendChild(outer);

      this.hexPoints(hcx, hcy, size).forEach(([px, py]) => {
        const dot = document.createElementNS(svgNS, 'circle');
        dot.setAttribute('cx', px); dot.setAttribute('cy', py);
        dot.setAttribute('r', '2.2');
        dot.setAttribute('fill', this.theme.gold);
        dot.setAttribute('opacity', '0.7');
        svg.appendChild(dot);
      });

      this.levelInput.style.fontSize = Math.max(14, size * 0.72) + 'px';
      this.levelInput.style.width    = dim + 'px';

      this.updateHexGlow();
    }

    updateTotal() {
      const sum = this.values.reduce((a, b) => a + b, 0);
      this.totalEl.textContent = `${sum} / ${this.maxPoints}`;
    }

    attachEvents() {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(this.radarContainer);
    }
  }

  function create(container, options = {}) {
    injectStyles();
    return new RadarInstance(container, options);
  }

  return { create };
})();