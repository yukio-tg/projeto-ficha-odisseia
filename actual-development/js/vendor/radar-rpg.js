const RadarRPG = (() => {
  let styleInjected = false;

  const DEFAULT_THEME = {
    gold: '#c4892a',
    goldLight: '#f5d878',
    goldDim: '#8a5e10',
    crimson: '#b52418',
    ink: '#2a1e08',
    inkDim: '#7a5c28',
    levelColor: '#b52418',
    parchment: '#f4e8c8',
    parchmentDark: '#eedcb2',
  };

  // ─── CSS ────────────────────────────────────────────────────────────────────
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;600;700&family=IM+Fell+English:ital@0;1&display=swap');

    .radar-rpg {
      --gold:            var(--gold1, ${DEFAULT_THEME.gold});
      --gold-light:      var(--gold3, ${DEFAULT_THEME.goldLight});
      --gold-dim:        var(--gold0, ${DEFAULT_THEME.goldDim});
      --crimson:         var(--blood2, ${DEFAULT_THEME.crimson});
      --ink:             var(--ink1,  ${DEFAULT_THEME.ink});
      --ink-dim:         var(--ink3,  ${DEFAULT_THEME.inkDim});
      --level-color:     var(--blood2, ${DEFAULT_THEME.levelColor});
      --parchment:       var(--sheet-bg, ${DEFAULT_THEME.parchment});
      --parchment-dark:  var(--p1, ${DEFAULT_THEME.parchmentDark});
      font-family: 'IM Fell English', Georgia, serif;
      color: var(--ink);
      width: 100%;
      background: transparent;
    }
    .radar-rpg *, .radar-rpg *::before, .radar-rpg *::after {
      box-sizing: border-box; margin: 0; padding: 0;
    }

    /* ── Card shell ── */
    .radar-rpg .card {
      background: transparent;
      border: none;
      padding: 0.5rem 0 0.25rem;
      width: 100%;
      position: relative;
    }

    /* ── Mode switch row ── */
    .radar-rpg .mode-switch-wrap {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      font-family: 'Cinzel', serif;
      font-size: 0.58rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--ink-dim);
    }
    .radar-rpg .mode-switch {
      position: relative; display: inline-block; width: 32px; height: 16px;
    }
    .radar-rpg .mode-switch input { opacity: 0; width: 0; height: 0; }
    .radar-rpg .slider {
      position: absolute; cursor: pointer; inset: 0;
      background: color-mix(in srgb, var(--gold) 15%, transparent);
      border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
      transition: 0.25s; border-radius: 16px;
    }
    .radar-rpg .slider::before {
      position: absolute; content: "";
      height: 10px; width: 10px; left: 2px; bottom: 2px;
      background: var(--gold-light);
      box-shadow: 0 0 4px rgba(196,137,42,0.5);
      transition: 0.25s; border-radius: 50%;
    }
    .radar-rpg input:checked + .slider {
      background: color-mix(in srgb, var(--gold) 35%, transparent);
    }
    .radar-rpg input:checked + .slider::before {
      transform: translateX(16px);
    }

    /* ── Radar container ── */
    .radar-rpg .radar-container {
      position: relative; width: 100%;
    }
    .radar-rpg .radar-canvas {
      display: block; width: 100%; height: auto;
    }

    /* ── Attribute wraps (positioned absolutely over canvas) ── */
    .radar-rpg .attr-wrap {
      position: absolute;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 5;
    }

    /* Attr label */
    .radar-rpg .attr-label {
      font-family: 'Cinzel', serif;
      font-size: clamp(0.46rem, 1.2vw, 0.64rem);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      white-space: nowrap;
      pointer-events: none;
      font-weight: 700;
      text-shadow:
        0 0 6px #f4e8c8,
        0 0 12px #f4e8c8,
        1px  1px 0 #f4e8c8,
       -1px -1px 0 #f4e8c8,
        1px -1px 0 #f4e8c8,
       -1px  1px 0 #f4e8c8,
        0 2px 5px rgba(0,0,0,0.75);
    }

    /* Attr input — wax-seal medallion */
    .radar-rpg .attr-input {
      pointer-events: all;
      width:  clamp(34px, 7.5vw, 46px);
      height: clamp(34px, 7.5vw, 46px);
      background: radial-gradient(circle at 38% 35%, #2a1a06 0%, #0e0905 100%);
      border: 2px solid;
      border-radius: 50%;
      box-shadow: inset 0 1px 6px rgba(0,0,0,0.8);
      color: var(--gold-light);
      font-family: 'Cinzel', serif;
      font-size: clamp(0.75rem, 1.7vw, 0.95rem);
      font-weight: 700;
      text-align: center;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
      -moz-appearance: textfield; appearance: textfield;
      cursor: pointer;
    }
    .radar-rpg .attr-input::-webkit-inner-spin-button,
    .radar-rpg .attr-input::-webkit-outer-spin-button { -webkit-appearance: none; }
    .radar-rpg .attr-input:hover {
      transform: scale(1.08);
    }
    .radar-rpg .attr-input:focus {
      transform: scale(1.12);
      box-shadow:
        inset 0 1px 6px rgba(0,0,0,0.8),
        0 0 12px var(--glow-color, rgba(196,137,42,0.5));
    }

    /* ── Modifier sub-inputs ── */
    .radar-rpg .mod-wrap {
      pointer-events: all;
      display: flex; flex-direction: column; align-items: center; gap: 1px;
    }
    .radar-rpg .mod-label {
      font-family: 'Cinzel', serif;
      font-size: clamp(0.40rem, 1vw, 0.52rem);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--ink-dim);
      opacity: 0.85;
      pointer-events: none;
      white-space: nowrap;
      text-shadow: 0 0 4px var(--parchment), 0 1px 2px rgba(0,0,0,0.4);
    }
    .radar-rpg .mod-input {
      pointer-events: all;
      width: clamp(36px, 6vw, 46px);
      height: clamp(20px, 3.5vw, 26px);
      background: rgba(14, 9, 3, 0.9);
      border: 1px solid;
      border-radius: 3px;
      color: var(--gold-light);
      font-family: 'Cinzel', serif;
      font-size: clamp(0.54rem, 1.2vw, 0.70rem);
      font-weight: 700;
      text-align: center;
      outline: none;
      box-shadow: inset 0 0 4px rgba(0,0,0,0.7);
      transition: border-color 0.2s, box-shadow 0.2s;
      -moz-appearance: textfield; appearance: textfield;
      cursor: text; padding: 0;
    }
    .radar-rpg .mod-input::-webkit-inner-spin-button,
    .radar-rpg .mod-input::-webkit-outer-spin-button { -webkit-appearance: none; }
    .radar-rpg .mod-input:focus {
      box-shadow:
        0 0 0 1px var(--glow-color, rgba(196,137,42,0.5)),
        0 0 8px var(--glow-color, rgba(196,137,42,0.3)),
        inset 0 0 4px rgba(0,0,0,0.7);
    }

    /* ══════════════════════════════════════════════════════
       LEVEL CENTER — the focal jewel of the sheet
       ══════════════════════════════════════════════════════ */
    .radar-rpg .level-center {
      position: absolute;
      transform: translate(-50%, -50%);
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      filter: drop-shadow(0 0 18px rgba(196,137,42,0.30))
              drop-shadow(0 0 6px rgba(196,137,42,0.20));
    }

    .radar-rpg .hex-shell {
      position: relative;
      display: flex; align-items: center; justify-content: center;
      pointer-events: all;
    }

    .radar-rpg .hex-svg {
      position: absolute; top: 0; left: 0; pointer-events: none;
      filter: drop-shadow(0 0 5px color-mix(in srgb, var(--gold) 55%, transparent));
    }

    /* Level arc SVG — outside the hex, shows level 1-20 progress */
    .radar-rpg .level-arc-svg {
      position: absolute;
      pointer-events: none;
      /* Centered exactly on top of hex-shell */
      top: 50%; left: 50%;
    }

    /* "NÍVEL" label */
    .radar-rpg .level-label {
      font-family: 'Cinzel', serif;
      font-size: clamp(0.33rem, 0.9vw, 0.48rem);
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: color-mix(in srgb, var(--gold) 80%, transparent);
      position: absolute;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      pointer-events: none;
      white-space: nowrap;
      text-shadow: 0 0 8px rgba(196,137,42,0.6), 0 1px 3px rgba(0,0,0,0.8);
    }

    /* Level number — large, golden, unmissable */
    .radar-rpg .level-input {
      pointer-events: all;
      background: transparent;
      border: none;
      color: var(--gold-light);
      font-family: 'Cinzel Decorative', serif;
      font-size: clamp(1.2rem, 3.8vw, 1.9rem);
      font-weight: 700;
      text-align: center;
      outline: none;
      width: 100%;
      text-shadow:
        0 0 6px  rgba(245,216,120,0.9),
        0 0 18px rgba(196,137,42,0.7),
        0 0 40px rgba(196,137,42,0.3),
        0 2px 5px rgba(0,0,0,0.9);
      -moz-appearance: textfield; appearance: textfield;
      position: relative; z-index: 2;
      cursor: pointer;
      transition: text-shadow 0.2s;
    }
    .radar-rpg .level-input::-webkit-inner-spin-button,
    .radar-rpg .level-input::-webkit-outer-spin-button { -webkit-appearance: none; }
    .radar-rpg .level-input:focus {
      text-shadow:
        0 0 6px  rgba(245,216,120,1),
        0 0 22px rgba(196,137,42,0.9),
        0 0 50px rgba(196,137,42,0.5),
        0 2px 5px rgba(0,0,0,0.9);
    }

    /* ── Level step pips ring (DOM elements around center) ── */
    .radar-rpg .level-pips-svg {
      position: absolute;
      top: 50%; left: 50%;
      pointer-events: none;
      z-index: 6;
    }

    /* ── Totals row ── */
    .radar-rpg .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0 0;
      margin-top: 0.3rem;
      border-top: 1px solid color-mix(in srgb, var(--gold) 22%, transparent);
    }
    .radar-rpg .total-label {
      font-family: 'Cinzel', serif;
      font-size: 0.62rem;
      color: var(--ink-dim);
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .radar-rpg .total-value {
      font-family: 'Cinzel Decorative', serif;
      font-size: 0.95rem;
      color: var(--ink);
      text-shadow: none;
    }
    .radar-rpg .total-value.over-budget {
      color: var(--crimson);
      text-shadow: 0 0 8px color-mix(in srgb, var(--crimson) 30%, transparent);
    }

    /* ── Level legend below radar ── */
    .radar-rpg .level-legend {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
      font-family: 'Cinzel', serif;
      font-size: 0.55rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--ink-dim);
    }
    .radar-rpg .level-legend-tier {
      padding: 1px 6px;
      border: 1px solid currentColor;
      border-radius: 2px;
      opacity: 0.55;
      transition: opacity 0.3s, color 0.3s, border-color 0.3s, text-shadow 0.3s;
    }
    .radar-rpg .level-legend-tier.active {
      opacity: 1;
      color: var(--crimson);
      border-color: var(--crimson);
      text-shadow: 0 0 6px color-mix(in srgb, var(--crimson) 40%, transparent);
    }
  `;

  // ─── helpers ────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (styleInjected) return;
    const el = document.createElement('style');
    el.textContent = styles;
    document.head.appendChild(el);
    styleInjected = true;
  }

  function hexToRgba(hex, alpha) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function lerpColor(hexA, hexB, t) {
    const parse = h => {
      h = h.replace('#', '');
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    };
    const [ar, ag, ab] = parse(hexA);
    const [br, bg, bb] = parse(hexB);
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const b = Math.round(ab + (bb - ab) * t);
    return '#' + [r, g, b].map(v => Math.min(255, v).toString(16).padStart(2, '0')).join('');
  }

  let idCounter = 0;

  // ─── Main class ─────────────────────────────────────────────────────────────
  class RadarInstance {
    constructor(container, options = {}) {
      this.container = container;
      this.id = `rpg${++idCounter}`;
      container.classList.add('radar-rpg');
      container.innerHTML = '';

      this.theme = { ...DEFAULT_THEME, ...(options.theme || {}) };

      // Push theme vars into CSS custom properties
      container.style.setProperty('--gold', this.theme.gold);
      container.style.setProperty('--gold-light', this.theme.goldLight);
      container.style.setProperty('--gold-dim', this.theme.goldDim);
      container.style.setProperty('--crimson', this.theme.crimson);
      container.style.setProperty('--ink', this.theme.ink);
      container.style.setProperty('--ink-dim', this.theme.inkDim);
      container.style.setProperty('--level-color', this.theme.levelColor);
      container.style.setProperty('--parchment', this.theme.parchment || DEFAULT_THEME.parchment);
      container.style.setProperty('--parchment-dark', this.theme.parchmentDark || DEFAULT_THEME.parchmentDark);

      // Attribute definitions
      this.attrs = options.attrs || [
        { abbr: 'FOR', color: '#b52418' },   // blood red
        { abbr: 'DES', color: '#4a7cb5' },   // steel blue
        { abbr: 'CAR', color: '#8a4ab5' },   // violet
        { abbr: 'SAB', color: '#3a8a5c' },   // forest green
        { abbr: 'INT', color: '#d4a800' },   // bright gold-yellow
        { abbr: 'CON', color: '#d4620a' },   // clear burnt orange
      ];
      this.N = this.attrs.length;
      this.MAX = options.max || 20;
      this.TICKS = options.ticks || 4;
      this.PADDING = options.padding || 76;
      this.INPUT_OFFSET = options.inputOffset || 44;
      this.minRadiusFactor = options.minRadiusFactor || 0.15;
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
      this.arcSvgEl = null;
      this.pipsSvgEl = null;
      this.levelInput = null;
      this.modeToggle = null;
      this.legendTiers = [];

      this.buildDOM();
      this.initCanvas();
      this.attachEvents();
    }

    // ── DOM skeleton ──────────────────────────────────────────────────────────
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
      this.legendTiers = Array.from(cont.querySelectorAll('.level-legend-tier'));

      this.modeToggle.addEventListener('change', () => {
        this.mode = this.modeToggle.checked ? 'percent' : 'raw';
        this.draw();
        this.updateTotal();
      });
      this.updateTotal();
    }

    // ── Canvas init ──────────────────────────────────────────────────────────
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

    // ── Main draw ─────────────────────────────────────────────────────────────
    draw() {
      const { ctx, canvas, DPR, N, TICKS, PADDING, MAX, attrs, theme, minRadiusFactor } = this;
      const dv = this.getDisplayValues();
      const W = canvas.width / DPR;
      const H = canvas.height / DPR;
      const cx = W / 2;
      const cy = H / 2;
      const R = Math.min(W, H) / 2 - PADDING;
      const minR = R * minRadiusFactor;

      ctx.clearRect(0, 0, W, H);

      // ── Grid rings ────────────────────────────────────────────────────────
      for (let t = 1; t <= TICKS; t++) {
        const r = R * t / TICKS;
        const isOuter = t === TICKS;
        ctx.beginPath();
        for (let i = 0; i < N; i++) {
          const v = this.vertex(cx, cy, r, i);
          i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y);
        }
        ctx.closePath();
        if (isOuter) {
          ctx.fillStyle = 'rgba(238,220,178,0.15)';
          ctx.fill();
          ctx.strokeStyle = hexToRgba(theme.gold, 0.55);
          ctx.lineWidth = 1.5;
        } else {
          ctx.strokeStyle = hexToRgba(theme.gold, 0.14);
          ctx.lineWidth = 0.7;
        }
        ctx.stroke();
      }

      // ── Axis lines ────────────────────────────────────────────────────────
      for (let i = 0; i < N; i++) {
        const v = this.vertex(cx, cy, R, i);
        const axGrad = ctx.createLinearGradient(cx, cy, v.x, v.y);
        axGrad.addColorStop(0, hexToRgba(attrs[i].color, 0.0));
        axGrad.addColorStop(0.35, hexToRgba(attrs[i].color, 0.15));
        axGrad.addColorStop(1, hexToRgba(attrs[i].color, 0.55));
        ctx.beginPath();
        ctx.moveTo(cx, cy); ctx.lineTo(v.x, v.y);
        ctx.strokeStyle = axGrad;
        ctx.lineWidth = 1.3;
        ctx.stroke();

        // Tick marks
        for (let t = 1; t < TICKS; t++) {
          const tr = R * t / TICKS;
          const tv = this.vertex(cx, cy, tr, i);
          const perp = this.angleOf(i) + Math.PI / 2;
          const tLen = 3;
          ctx.beginPath();
          ctx.moveTo(tv.x + Math.cos(perp) * tLen, tv.y + Math.sin(perp) * tLen);
          ctx.lineTo(tv.x - Math.cos(perp) * tLen, tv.y - Math.sin(perp) * tLen);
          ctx.strokeStyle = hexToRgba(attrs[i].color, 0.28);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // ── Ring value labels ────────────────────────────────────────────────
      ctx.font = '9px "Cinzel", serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (let t = 1; t < TICKS; t++) {
        const r = R * t / TICKS;
        const label = this.mode === 'percent'
          ? `${t * (100 / TICKS)}%`
          : `${t * (MAX / TICKS)}`;
        // Parchment knockout halo so label reads on both dark grid lines and light bg
        ctx.fillStyle = 'rgba(244,232,200,0.95)';
        ctx.fillText(label, cx + 5 - 0.5, cy - r + 0.5);
        ctx.fillStyle = 'rgba(80, 48, 14, 0.9)';
        ctx.fillText(label, cx + 5, cy - r);
      }

      // ── Data polygon ─────────────────────────────────────────────────────
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const r = minR + (R - minR) * (dv[i] / MAX);
        const v = this.vertex(cx, cy, r, i);
        i === 0 ? ctx.moveTo(v.x, v.y) : ctx.lineTo(v.x, v.y);
      }
      ctx.closePath();

      const polyGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      polyGrad.addColorStop(0, hexToRgba(theme.crimson, 0.30));
      polyGrad.addColorStop(0.6, hexToRgba(theme.crimson, 0.17));
      polyGrad.addColorStop(1, hexToRgba(theme.crimson, 0.05));
      ctx.fillStyle = polyGrad;
      ctx.fill();

      ctx.strokeStyle = hexToRgba(theme.crimson, 0.85);
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      ctx.strokeStyle = hexToRgba(theme.crimson, 0.20);
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // ── Data-point dots ───────────────────────────────────────────────────
      for (let i = 0; i < N; i++) {
        const r = minR + (R - minR) * (dv[i] / MAX);
        const v = this.vertex(cx, cy, r, i);
        const ac = attrs[i].color;

        ctx.beginPath(); ctx.arc(v.x, v.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = ac; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.20)';
        ctx.lineWidth = 1.2; ctx.stroke();
        ctx.beginPath(); ctx.arc(v.x - 1.3, v.y - 1.3, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.fill();
      }

      // ── Cache geometry ────────────────────────────────────────────────────
      this.cssVertices = [];
      for (let i = 0; i < N; i++) this.cssVertices.push(this.vertex(cx, cy, R, i));
      this.centerCSS = { x: cx, y: cy };
      this.outerR_CSS = R;

      this.placeInputs();
      this.placeLevelHex();
    }

    // ── Attribute inputs ──────────────────────────────────────────────────────
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
        inp.style.setProperty('--attr-ring', attr.color + '30');

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

        // Scroll wheel support on attr inputs// Scroll wheel support on attr inputs
        inp.addEventListener('wheel', (e) => {
          e.preventDefault();
          let v = this.values[i] + (e.deltaY < 0 ? 1 : -1);
          v = Math.max(0, Math.min(this.MAX, v));
          this.values[i] = v;
          inp.value = v;
          this.draw();
          this.updateTotal();
          // 👇 NOVA LINHA: dispara evento input para notificar a página
          inp.dispatchEvent(new Event('input', { bubbles: true }));
        }, { passive: false });

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
        modInp.addEventListener('input', () => { this.modValues[i] = modInp.value; });

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
        // Label above medallion when vertex is on top half, below when on bottom
        const sin = Math.sin(angle);
        wrap.style.flexDirection = sin > 0.1 ? 'column' : 'column-reverse';
      }
    }

    // ── Hex geometry helper ───────────────────────────────────────────────────
    hexPoints(cx, cy, r, flat = false) {
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = (flat ? 0 : -Math.PI / 6) + (Math.PI / 3) * i;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
      return pts;
    }

    // ── Update hex glow by level ──────────────────────────────────────────────
    updateHexGlow() {
      if (!this.hexSvgEl) return;
      const t = Math.max(0, Math.min(1, (this.levelVal - 1) / 19));
      const levelColor = lerpColor(this.theme.crimson, this.theme.goldLight, t * 0.7);

      const outer = this.hexSvgEl.querySelector('.hex-outer');
      const mid = this.hexSvgEl.querySelector('.hex-mid');
      const inner = this.hexSvgEl.querySelector('.hex-inner');
      const runes = this.hexSvgEl.querySelectorAll('.rune-dot');
      const glow = this.hexSvgEl.querySelector('.hex-glow');

      if (outer) outer.setAttribute('stroke', levelColor);
      if (mid) mid.setAttribute('stroke', levelColor + '66');
      if (inner) inner.setAttribute('stroke', levelColor + '33');

      runes.forEach(d => {
        d.setAttribute('fill', levelColor);
        d.setAttribute('opacity', (0.4 + t * 0.6).toFixed(2));
      });

      if (glow) glow.setAttribute('stdDeviation', (3 + t * 7).toFixed(1));

      const glowAlpha = (0.25 + t * 0.5).toFixed(2);
      const glowSize = Math.round(16 + t * 28);
      if (this.levelEl) {
        this.levelEl.style.filter =
          `drop-shadow(0 0 ${glowSize}px rgba(196,137,42,${glowAlpha})) ` +
          `drop-shadow(0 0 6px rgba(196,137,42,${Math.min(1, +glowAlpha + 0.15)}))`;
      }

      if (this.levelInput) {
        const numGlow = (0.6 + t * 0.4).toFixed(2);
        this.levelInput.style.textShadow =
          `0 0 6px rgba(245,216,120,${numGlow}),` +
          `0 0 ${18 + Math.round(t * 20)}px rgba(196,137,42,${numGlow}),` +
          `0 0 ${40 + Math.round(t * 30)}px rgba(196,137,42,${(+numGlow * 0.45).toFixed(2)}),` +
          `0 2px 5px rgba(0,0,0,0.9)`;
      }

      // Update the level-arc progress ring
      this.updateArcSvg(levelColor, t);

      // Update the legend tier highlights
      this.updateLegendTiers();
    }

    // ── Update the circular arc progress ring around the hex ─────────────────
    updateArcSvg(levelColor, t) {
      if (!this.arcSvgEl) return;
      const arc = this.arcSvgEl.querySelector('.arc-progress');
      const track = this.arcSvgEl.querySelector('.arc-track');
      if (!arc || !track) return;

      // Arc goes from -120° to +120° (bottom gap), full = 240° sweep
      const totalSweep = 300; // degrees
      const progress = (this.levelVal - 1) / 19; // 0..1
      const sweep = totalSweep * progress;

      const dim = parseFloat(this.arcSvgEl.getAttribute('width'));
      const r = dim / 2 - 4;
      const cx = dim / 2;
      const cy = dim / 2;
      const startDeg = -150 + 90; // starts at 7 o'clock (-150° from right = -60° from top)
      const startRad = (startDeg * Math.PI) / 180;

      // Helper: polar to cartesian
      const polarToCart = (angleDeg, radius) => {
        const rad = (angleDeg * Math.PI) / 180;
        return {
          x: cx + radius * Math.cos(rad),
          y: cy + radius * Math.sin(rad),
        };
      };

      // Track arc: full 300°
      const buildArcPath = (fromDeg, toDeg, rad) => {
        const from = polarToCart(fromDeg, rad);
        const to = polarToCart(toDeg, rad);
        const large = (toDeg - fromDeg) > 180 ? 1 : 0;
        return `M ${from.x} ${from.y} A ${rad} ${rad} 0 ${large} 1 ${to.x} ${to.y}`;
      };

      const fromDeg = -120; // 8 o'clock
      const fullEndDeg = fromDeg + totalSweep; // 4 o'clock

      track.setAttribute('d', buildArcPath(fromDeg, fullEndDeg, r));
      track.setAttribute('stroke', hexToRgba(levelColor, 0.14));

      if (sweep < 1) {
        arc.setAttribute('d', '');
        return;
      }
      const toProgressDeg = fromDeg + sweep;
      arc.setAttribute('d', buildArcPath(fromDeg, toProgressDeg, r));
      arc.setAttribute('stroke', levelColor);
    }

    // ── Update level legend tiers ─────────────────────────────────────────────
    updateLegendTiers() {
      this.legendTiers.forEach(tier => {
        const min = parseInt(tier.dataset.min, 10);
        const max = parseInt(tier.dataset.max, 10);
        if (this.levelVal >= min && this.levelVal <= max) {
          tier.classList.add('active');
        } else {
          tier.classList.remove('active');
        }
      });
    }

    // ── Build the Level hex element ───────────────────────────────────────────
    buildLevelEl() {
      const el = document.createElement('div');
      el.className = 'level-center';
      this.levelEl = el;

      const shell = document.createElement('div');
      shell.className = 'hex-shell';

      // Hex background SVG
      this.hexSvgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      this.hexSvgEl.classList.add('hex-svg');

      // Arc progress SVG (sits outside the hex shell, centered on it)
      this.arcSvgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      this.arcSvgEl.classList.add('level-arc-svg');

      const inp = document.createElement('input');
      inp.type = 'number';
      inp.className = 'level-input';
      inp.min = 1; inp.max = 20;
      inp.value = this.levelVal;
      inp.setAttribute('aria-label', 'Nível do personagem');
      inp.title = 'Clique para editar — ou use scroll';

      const onLevelChange = () => {
        let v = parseInt(inp.value, 10);
        if (isNaN(v) || v < 1) v = 1;
        if (v > 20) v = 20;
        this.levelVal = v;
        this.maxPoints = 10 + v;
        this.updateTotal();
        this.updateHexGlow();
      };

      inp.addEventListener('input', onLevelChange);
      inp.addEventListener('blur', () => { inp.value = this.levelVal; });

      // Scroll wheel on level input
      inp.addEventListener('wheel', (e) => {
        e.preventDefault();
        const v = Math.max(1, Math.min(20, this.levelVal + (e.deltaY < 0 ? 1 : -1)));
        inp.value = v;
        onLevelChange();
        
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }, { passive: false });

      this.levelInput = inp;

      const lbl = document.createElement('span');
      lbl.className = 'level-label';
      lbl.textContent = 'nível';

      shell.appendChild(this.hexSvgEl);
      shell.appendChild(inp);
      shell.appendChild(lbl);
      el.appendChild(this.arcSvgEl);
      el.appendChild(shell);
      this.radarContainer.appendChild(el);
    }

    // ── Size + paint the Level hex ────────────────────────────────────────────
    placeLevelHex() {
      if (!this.levelEl) this.buildLevelEl();

      const size = Math.max(30, this.outerR_CSS * 0.23);
      const dim = size * 2 + 16;

      const shell = this.levelEl.querySelector('.hex-shell');
      shell.style.width = dim + 'px';
      shell.style.height = dim + 'px';

      this.levelEl.style.left = this.centerCSS.x + 'px';
      this.levelEl.style.top = this.centerCSS.y + 'px';

      // ── Hex SVG ──────────────────────────────────────────────────────────
      const svg = this.hexSvgEl;
      const svgNS = 'http://www.w3.org/2000/svg';

      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.setAttribute('width', dim);
      svg.setAttribute('height', dim);
      svg.setAttribute('viewBox', `0 0 ${dim} ${dim}`);
      svg.style.width = dim + 'px';
      svg.style.height = dim + 'px';

      const hcx = dim / 2, hcy = dim / 2;

      // defs
      const defs = document.createElementNS(svgNS, 'defs');
      const filter = document.createElementNS(svgNS, 'filter');
      filter.setAttribute('id', `hglow-${this.id}`);
      filter.setAttribute('x', '-80%'); filter.setAttribute('y', '-80%');
      filter.setAttribute('width', '260%'); filter.setAttribute('height', '260%');
      const feBlur = document.createElementNS(svgNS, 'feGaussianBlur');
      feBlur.setAttribute('in', 'SourceGraphic');
      feBlur.setAttribute('stdDeviation', '5');
      feBlur.setAttribute('result', 'blur');
      feBlur.classList.add('hex-glow');
      const feMerge = document.createElementNS(svgNS, 'feMerge');
      ['blur', 'SourceGraphic'].forEach(ref => {
        const n = document.createElementNS(svgNS, 'feMergeNode');
        n.setAttribute('in', ref); feMerge.appendChild(n);
      });
      filter.appendChild(feBlur); filter.appendChild(feMerge);
      defs.appendChild(filter);

      const rg = document.createElementNS(svgNS, 'radialGradient');
      rg.setAttribute('id', `hfill-${this.id}`);
      rg.setAttribute('cx', '40%'); rg.setAttribute('cy', '38%'); rg.setAttribute('r', '60%');
      const stop1 = document.createElementNS(svgNS, 'stop');
      stop1.setAttribute('offset', '0%'); stop1.setAttribute('stop-color', '#2a1606');
      const stop2 = document.createElementNS(svgNS, 'stop');
      stop2.setAttribute('offset', '100%'); stop2.setAttribute('stop-color', '#080603');
      rg.appendChild(stop1); rg.appendChild(stop2);
      defs.appendChild(rg);
      svg.appendChild(defs);

      const pts = this.hexPoints(hcx, hcy, size, true);
      const ptsMid = this.hexPoints(hcx, hcy, size * 0.78, true);
      const ptsInner = this.hexPoints(hcx, hcy, size * 0.56, true);
      const toStr = p => p.map(v => v.join(',')).join(' ');

      const bg = document.createElementNS(svgNS, 'polygon');
      bg.setAttribute('points', toStr(pts));
      bg.setAttribute('fill', `url(#hfill-${this.id})`);
      svg.appendChild(bg);

      const inner = document.createElementNS(svgNS, 'polygon');
      inner.classList.add('hex-inner');
      inner.setAttribute('points', toStr(ptsInner));
      inner.setAttribute('fill', 'none');
      inner.setAttribute('stroke', this.theme.crimson + '33');
      inner.setAttribute('stroke-width', '0.7');
      svg.appendChild(inner);

      const mid = document.createElementNS(svgNS, 'polygon');
      mid.classList.add('hex-mid');
      mid.setAttribute('points', toStr(ptsMid));
      mid.setAttribute('fill', 'none');
      mid.setAttribute('stroke', this.theme.crimson + '66');
      mid.setAttribute('stroke-width', '0.9');
      svg.appendChild(mid);

      const outer = document.createElementNS(svgNS, 'polygon');
      outer.classList.add('hex-outer');
      outer.setAttribute('points', toStr(pts));
      outer.setAttribute('fill', 'none');
      outer.setAttribute('stroke', this.theme.crimson);
      outer.setAttribute('stroke-width', '2.2');
      outer.setAttribute('filter', `url(#hglow-${this.id})`);
      svg.appendChild(outer);

      pts.forEach(([px, py]) => {
        const dot = document.createElementNS(svgNS, 'circle');
        dot.classList.add('rune-dot');
        dot.setAttribute('cx', px); dot.setAttribute('cy', py);
        dot.setAttribute('r', '2.4');
        dot.setAttribute('fill', this.theme.gold);
        dot.setAttribute('opacity', '0.55');
        svg.appendChild(dot);
      });

      ptsMid.forEach(([px, py]) => {
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', hcx); line.setAttribute('y1', hcy);
        line.setAttribute('x2', px); line.setAttribute('y2', py);
        line.setAttribute('stroke', this.theme.gold + '18');
        line.setAttribute('stroke-width', '0.5');
        svg.appendChild(line);
      });

      const shine = document.createElementNS(svgNS, 'ellipse');
      shine.setAttribute('cx', hcx - size * 0.18);
      shine.setAttribute('cy', hcy - size * 0.22);
      shine.setAttribute('rx', size * 0.28);
      shine.setAttribute('ry', size * 0.16);
      shine.setAttribute('fill', 'rgba(255,255,255,0.04)');
      shine.setAttribute('transform', `rotate(-30, ${hcx}, ${hcy})`);
      svg.appendChild(shine);

      this.levelInput.style.fontSize = Math.max(14, size * 0.70) + 'px';
      this.levelInput.style.width = dim + 'px';

      // ── Arc SVG (progress ring around hex) ───────────────────────────────
      const arcPad = 10; // space between hex edge and arc
      const arcDim = dim + arcPad * 2;
      const arcSvg = this.arcSvgEl;
      while (arcSvg.firstChild) arcSvg.removeChild(arcSvg.firstChild);
      arcSvg.setAttribute('width', arcDim);
      arcSvg.setAttribute('height', arcDim);
      arcSvg.setAttribute('viewBox', `0 0 ${arcDim} ${arcDim}`);
      arcSvg.style.width = arcDim + 'px';
      arcSvg.style.height = arcDim + 'px';
      // Center the arc svg over the hex shell
      arcSvg.style.transform = `translate(-${arcDim / 2}px, -${arcDim / 2}px)`;

      // Defs: arc glow filter
      const aDefs = document.createElementNS(svgNS, 'defs');
      const aFilter = document.createElementNS(svgNS, 'filter');
      aFilter.setAttribute('id', `arcglow-${this.id}`);
      aFilter.setAttribute('x', '-40%'); aFilter.setAttribute('y', '-40%');
      aFilter.setAttribute('width', '180%'); aFilter.setAttribute('height', '180%');
      const aBlur = document.createElementNS(svgNS, 'feGaussianBlur');
      aBlur.setAttribute('in', 'SourceGraphic');
      aBlur.setAttribute('stdDeviation', '2.5');
      aBlur.setAttribute('result', 'blur');
      const aMerge = document.createElementNS(svgNS, 'feMerge');
      ['blur', 'SourceGraphic'].forEach(ref => {
        const mn = document.createElementNS(svgNS, 'feMergeNode');
        mn.setAttribute('in', ref); aMerge.appendChild(mn);
      });
      aFilter.appendChild(aBlur); aFilter.appendChild(aMerge);
      aDefs.appendChild(aFilter);
      arcSvg.appendChild(aDefs);

      // Track (background arc)
      const track = document.createElementNS(svgNS, 'path');
      track.classList.add('arc-track');
      track.setAttribute('fill', 'none');
      track.setAttribute('stroke-width', '2');
      track.setAttribute('stroke-linecap', 'round');
      arcSvg.appendChild(track);

      // Progress arc
      const arcProg = document.createElementNS(svgNS, 'path');
      arcProg.classList.add('arc-progress');
      arcProg.setAttribute('fill', 'none');
      arcProg.setAttribute('stroke-width', '2.5');
      arcProg.setAttribute('stroke-linecap', 'round');
      arcProg.setAttribute('filter', `url(#arcglow-${this.id})`);
      arcSvg.appendChild(arcProg);

      // Level pip markers (every 5 levels: 5, 10, 15, 20)
      const arcR = arcDim / 2 - 4;
      const arcCx = arcDim / 2;
      const arcCy = arcDim / 2;
      const fromDeg = -120;
      const sweepDeg = 300;
      [5, 10, 15, 20].forEach(lv => {
        const pct = (lv - 1) / 19;
        const deg = fromDeg + sweepDeg * pct;
        const rad = (deg * Math.PI) / 180;
        const px = arcCx + arcR * Math.cos(rad);
        const py = arcCy + arcR * Math.sin(rad);

        const pip = document.createElementNS(svgNS, 'circle');
        pip.setAttribute('cx', px); pip.setAttribute('cy', py);
        pip.setAttribute('r', '3');
        pip.setAttribute('fill', this.theme.goldDim);
        pip.setAttribute('opacity', '0.6');
        arcSvg.appendChild(pip);

        // Label (5, 10, 15, 20)
        const lblOffset = 10;
        const lx = arcCx + (arcR + lblOffset) * Math.cos(rad);
        const ly = arcCy + (arcR + lblOffset) * Math.sin(rad);
        const lvText = document.createElementNS(svgNS, 'text');
        lvText.setAttribute('x', lx); lvText.setAttribute('y', ly);
        lvText.setAttribute('text-anchor', 'middle');
        lvText.setAttribute('dominant-baseline', 'middle');
        lvText.setAttribute('font-family', '"Cinzel", serif');
        lvText.setAttribute('font-size', '6.5');
        lvText.setAttribute('fill', this.theme.goldDim);
        lvText.setAttribute('opacity', '0.65');
        lvText.textContent = lv;
        arcSvg.appendChild(lvText);
      });

      this.updateHexGlow();
    }

    // ── Totals ────────────────────────────────────────────────────────────────
    updateTotal() {
      const sum = this.values.reduce((a, b) => a + b, 0);
      const over = sum > this.maxPoints;
      this.totalEl.textContent = `${sum} / ${this.maxPoints}`;
      this.totalEl.style.color = '';
      this.totalEl.style.textShadow = '';
      this.totalEl.classList.toggle('over-budget', over);
    }

    // ── ResizeObserver ────────────────────────────────────────────────────────
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