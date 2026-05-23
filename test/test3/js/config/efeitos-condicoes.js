// efeitos-condicoes.js
// Cada efeito tem dois vetores:
//   filter   → aplicado em .sheet  (afeta a folha inteira)
//   background → aplicado no #dynamic-overlay / #global-effect-overlay
//
// Filosofia: o efeito deve passar a *sensação* da condição,
// não apenas sua cor temática. Efeitos sutis são mais imersivos
// do que efeitos pesados que tornam a ficha ilegível.

export const EFEITOS_CONDICOES = {

  // ─── FÍSICAS ──────────────────────────────────────────────────────────

  "Asfixiado": {
    // Visão que fecha, dessatura como o cérebro começando a desligar.
    // Vinheta escura nas bordas, roxo-azulado de hipóxia.
    background: `
      radial-gradient(ellipse 60% 55% at 50% 50%, transparent 30%, rgba(20, 10, 40, 0.55) 100%),
      radial-gradient(ellipse 90% 85% at 50% 50%, transparent 60%, rgba(40, 0, 60, 0.4) 100%)
    `,
    filter: "saturate(0.5) brightness(0.88) contrast(1.1) blur(1px)"
  },

  "Caído": {
    // Leve inclinação perceptual — não literal, mas o contraste muda
    // como se o foco estivesse numa posição estranha.
    background: `
      linear-gradient(175deg, rgba(80, 50, 10, 0.12) 0%, transparent 50%, rgba(0, 0, 0, 0.18) 100%)
    `,
    filter: "brightness(0.93) contrast(1.06) saturate(0.85)"
  },

  "Debilitado": {
    // Exaustão muscular: tudo parece mais pesado, cores murchas,
    // leve névoa amarelo-acinzentada.
    background: `
      radial-gradient(ellipse 80% 70% at 50% 30%, rgba(160, 140, 80, 0.1) 0%, transparent 70%),
      linear-gradient(to bottom, transparent 60%, rgba(0, 0, 0, 0.22) 100%)
    `,
    filter: "saturate(0.55) brightness(0.9) sepia(0.2)"
  },

  "Desprevenido": {
    // Borramento de campo — como não estar prestando atenção,
    // foco suavizado nas bordas.
    background: `
      radial-gradient(ellipse 50% 45% at 50% 50%, transparent 100%, rgba(0, 0, 0, 0.0) 100%),
      radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(30, 20, 10, 0.35) 100%)
    `,
    filter: "blur(0.3px) brightness(0.95) contrast(0.92)"
  },

  "Doente": {
    // Febre e mal-estar: tons esverdeados-amarelados nauseantes,
    // leve perda de saturação nos azuis.
    background: `
      radial-gradient(ellipse 70% 60% at 40% 30%, rgba(100, 150, 30, 0.14) 0%, transparent 65%),
      radial-gradient(ellipse 60% 50% at 70% 80%, rgba(60, 100, 20, 0.1) 0%, transparent 60%)
    `,
    filter: "hue-rotate(18deg) saturate(0.7) brightness(0.93) sepia(0.15)"
  },

  "Em Chamas": {
    // Calor distorcendo o ar: vermelho-laranja pulsante nas bordas,
    // contraste brutal como olhar para o fogo.
    background: `
      radial-gradient(ellipse 100% 100% at 50% 100%, rgba(220, 80, 0, 0.45) 0%, rgba(180, 30, 0, 0.2) 40%, transparent 70%),
      radial-gradient(ellipse 70% 50% at 30% 80%, rgba(255, 120, 0, 0.25) 0%, transparent 60%),
      radial-gradient(ellipse 70% 50% at 70% 90%, rgba(200, 60, 0, 0.3) 0%, transparent 55%)
    `,
    filter: "saturate(1.5) contrast(1.15) brightness(1.05) sepia(0.2) hue-rotate(-10deg)"
  },

  "Enjoado": {
    // Náusea: verde-bile fraco, dessaturação fria,
    // como a ficha estivesse sob luz fluorescente doentia.
    background: `
      radial-gradient(ellipse 80% 60% at 50% 20%, rgba(80, 160, 60, 0.13) 0%, transparent 55%),
      radial-gradient(ellipse 90% 70% at 50% 90%, rgba(60, 120, 40, 0.1) 0%, transparent 60%)
    `,
    filter: "hue-rotate(32deg) saturate(0.6) brightness(0.92) contrast(1.05) blur(1px)"
  },

  "Envenenado": {
    // Veneno no sangue: verde-amarelado tóxico nas bordas,
    // cores naturais ficam levemente podres.
    background: `
      radial-gradient(ellipse 100% 100% at 0% 0%, rgba(80, 180, 40, 0.18) 0%, transparent 50%),
      radial-gradient(ellipse 100% 100% at 100% 100%, rgba(100, 200, 20, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse 60% 60% at 50% 50%, transparent 50%, rgba(30, 60, 10, 0.2) 100%)
    `,
    filter: "hue-rotate(42deg) saturate(0.75) brightness(0.91) sepia(0.1)"
  },

  "Fraco": {
    // Força drenada: desbotado, como aquarela molhada demais.
    background: `
      linear-gradient(to bottom, rgba(200, 190, 160, 0.1) 0%, transparent 40%),
      linear-gradient(to top, rgba(0, 0, 0, 0.15) 0%, transparent 50%)
    `,
    filter: "saturate(0.45) brightness(0.92) contrast(0.9)"
  },

  "Inconsciente": {
    // Apagão total: escuridão quase completa, vinheta total,
    // como os olhos fechando.
    background: `
      radial-gradient(ellipse 50% 40% at 50% 50%, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.8) 100%)
    `,
    filter: "brightness(0.4) saturate(0.2) contrast(0.8) blur(1px)"
  },

  "Indefeso": {
    // Vulnerabilidade total: tudo parece exposto e frio,
    // azul-gelo desumanizador.
    background: `
      radial-gradient(ellipse 100% 100% at 50% 0%, rgba(140, 180, 220, 0.18) 0%, transparent 60%),
      radial-gradient(ellipse 100% 100% at 50% 100%, rgba(0, 0, 0, 0.3) 0%, transparent 60%)
    `,
    filter: "saturate(0.5) brightness(0.88) hue-rotate(-18deg) contrast(1.08)"
  },

  "Machucado": {
    // Ferido mas ainda de pé: vermelho quente sutil nas bordas,
    // contraste ligeiramente alterado como adrenalina.
    background: `
      radial-gradient(ellipse 100% 100% at 50% 50%, transparent 50%, rgba(100, 10, 10, 0.28) 100%)
    `,
    filter: "saturate(0.85) contrast(1.08) brightness(0.95) sepia(0.08) blur(.5px)"
  },

  "Morrendo": {
    // Beira da morte: tudo quase monocromático, vinheta total,
    // vermelho escuro pulsando como um coração fraco.
    background: `
      radial-gradient(ellipse 40% 35% at 50% 50%, rgba(80, 0, 0, 0.15) 0%, transparent 100%),
      radial-gradient(ellipse 100% 100% at 50% 50%, transparent 20%, rgba(20, 0, 0, 0.75) 100%)
    `,
    filter: "saturate(0.2) brightness(0.7) contrast(1.1) sepia(0.3) blur(1px)"
  },

  "Petrificado": {
    // Textura de pedra simulada com SVG dataURI
    background: `
        radial-gradient(ellipse 100% 100% at 50% 50%, transparent 30%, rgba(60, 55, 50, 0.6) 100%),
        url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" opacity="0.15"><path d="M10 10 L190 10 M10 30 L190 30 M10 50 L190 50" stroke="%23806020" stroke-width="0.5" fill="none"/><circle cx="50" cy="100" r="2" fill="%23806020"/><circle cx="150" cy="150" r="1.5" fill="%23806020"/><path d="M30 170 L170 30" stroke="%23604010" stroke-width="0.3"/></svg>')
    `,
    filter: "saturate(0.0) brightness(0.82) contrast(1.22) sepia(0.25)"
  },

  "Sangrando": {
    // Sangue: vermelho vivo nas bordas, como a visão pulsando
    // com cada batimento que desperdiça sangue.
    background: `
      radial-gradient(ellipse 100% 100% at 50% 50%, transparent 35%, rgba(140, 0, 10, 0.38) 100%),
      radial-gradient(ellipse 30% 20% at 80% 15%, rgba(200, 20, 20, 0.2) 0%, transparent 60%)
    `,
    filter: "saturate(1.2) contrast(1.1) brightness(0.93) hue-rotate(-12deg) blur(.5px)"
  },

  "Surpreendido": {
    // Susto: superexposto por um momento, bordas estouradas,
    // como o flash de uma explosão nos olhos.
    background: `
      radial-gradient(ellipse 60% 55% at 50% 50%, rgba(255, 240, 200, 0.2) 0%, transparent 70%),
      radial-gradient(ellipse 100% 100% at 50% 50%, transparent 50%, rgba(30, 20, 0, 0.35) 100%)
    `,
    filter: "brightness(1.12) contrast(1.18) saturate(0.8)"
  },

  "Vulnerável à dano": {
    // Armadura rompida: como se a pele estivesse fina,
    // brilho levemente dourado-perigoso.
    background: `
      radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(180, 100, 0, 0.25) 100%),
      linear-gradient(145deg, rgba(220, 160, 20, 0.1) 0%, transparent 40%, transparent 60%, rgba(200, 100, 0, 0.1) 100%)
    `,
    filter: "saturate(1.1) contrast(1.12) brightness(0.97) hue-rotate(8deg)"
  },

  // ─── FADIGA ───────────────────────────────────────────────────────────

  "Fatigado": {
    // Cansaço acumulando: cores murchas, como fim de dia pesado.
    background: `
      linear-gradient(to bottom, transparent 40%, rgba(40, 30, 10, 0.25) 100%)
    `,
    filter: "saturate(0.65) brightness(0.91) sepia(0.12) contrast(0.95)"
  },

  "Exausto": {
    // Exaustão profunda: quase desmaiando, vinheta pesada,
    // tudo amarelo-acinzentado como suor frio.
    background: `
      radial-gradient(ellipse 55% 50% at 50% 50%, transparent 20%, rgba(30, 20, 0, 0.5) 100%),
      linear-gradient(to bottom, rgba(150, 130, 80, 0.08) 0%, transparent 30%)
    `,
    filter: "saturate(0.4) brightness(0.82) sepia(0.25) contrast(1.05) blur(1px)"
  },

  // ─── PARALISIA ────────────────────────────────────────────────────────

  "Agarrado": {
    // Preso: sensação de compressão, as bordas fecham levemente,
    // tom quente de esforço muscular.
    background: `
      radial-gradient(ellipse 100% 100% at 50% 50%, transparent 45%, rgba(80, 40, 10, 0.32) 100%)
    `,
    filter: "saturate(0.8) contrast(1.1) brightness(0.94)"
  },

  "Enredado": {
    // Preso em rede ou cipó: verde-marrom orgânico nas bordas,
    // como sombra de folhagem fechando.
    background: `
      radial-gradient(ellipse 100% 100% at 0% 100%, rgba(40, 80, 20, 0.22) 0%, transparent 55%),
      radial-gradient(ellipse 100% 100% at 100% 0%, rgba(60, 90, 30, 0.18) 0%, transparent 55%),
      radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(20, 40, 10, 0.25) 100%)
    `,
    filter: "hue-rotate(20deg) saturate(0.7) brightness(0.9) contrast(1.05)"
  },

  "Imóvel": {
    // Raízes nos pés: azul-gelo rígido em torno das bordas inferiores,
    // quase congelado.
    background: `
      radial-gradient(ellipse 100% 50% at 50% 100%, rgba(180, 210, 240, 0.2) 0%, transparent 70%),
      radial-gradient(ellipse 100% 100% at 50% 50%, transparent 50%, rgba(10, 20, 50, 0.28) 100%)
    `,
    filter: "saturate(0.6) hue-rotate(-25deg) brightness(0.9) contrast(1.08)"
  },

  "Lento": {
    // Movimento em câmera lenta: leve borramento direcional,
    // azul-lavanda frio e cansativo.
    background: `
      linear-gradient(to right, rgba(100, 100, 160, 0.12) 0%, transparent 40%, transparent 60%, rgba(100, 100, 160, 0.12) 100%)
    `,
    filter: "saturate(0.7) brightness(0.93) hue-rotate(-12deg) contrast(0.97)"
  },

  "Paralisado": {
    // Congelamento absoluto: azul profundo cristalino, sem movimento,
    // dessaturado como uma fotografia antiga.
    background: `
      radial-gradient(ellipse 60% 55% at 50% 50%, rgba(150, 180, 240, 0.12) 0%, transparent 70%),
      radial-gradient(ellipse 100% 100% at 50% 50%, transparent 30%, rgba(10, 20, 80, 0.5) 100%)
    `,
    filter: "saturate(0.25) brightness(0.8) hue-rotate(-30deg) contrast(1.18)"
  },

  // ─── SENTIDOS ─────────────────────────────────────────────────────────

  "Cego": {
    // Escuridão: vinheta que fecha completamente até o centro,
    // só um ponto de luz quase nulo.
    background: `
      radial-gradient(rgba(30, 20, 10, 0.08), rgba(0, 0, 0, 0.74))
    `,
    filter: "brightness(0.5) saturate(0.6) contrast(0.9)"
  },

  "Ofuscado": {
    // Flash ou luz forte: superexposto no centro, bordas normais,
    // como olhar direto para o sol.
    background: `
      radial-gradient(ellipse 55% 50% at 50% 40%, rgba(255, 250, 220, 0.45) 0%, transparent 65%)
    `,
    filter: "brightness(1.22) contrast(0.82) saturate(0.65) blur(1px)"
  },

  "Surdo": {
    // Perda auditiva: efeito visual de dissociação sensorial,
    // leve dessaturação e borramento como tinnitus em imagem.
    background: `
      repeating-linear-gradient(
        90deg,
        transparent 0px, transparent 18px,
        rgba(200, 190, 180, 0.03) 18px, rgba(200, 190, 180, 0.03) 19px
      )
    `,
    filter: "saturate(0.72) brightness(0.96) contrast(1.04) blur(0.2px)"
  },

  // ─── MENTAIS ──────────────────────────────────────────────────────────

  "Abalado": {
    // Tremor psicológico: contraste nervoso, leve vibração perceptual
    // simulada pelo padrão fino.
    background: `
      repeating-linear-gradient(
        85deg,
        transparent 0px, transparent 22px,
        rgba(100, 80, 60, 0.05) 22px, rgba(100, 80, 60, 0.05) 23px
      ),
      radial-gradient(ellipse 100% 100% at 50% 50%, transparent 50%, rgba(60, 30, 10, 0.22) 100%)
    `,
    filter: "contrast(1.12) saturate(0.8) brightness(0.95)"
  },

  "Alquebrado": {
    // PM custando mais do que pode pagar: esgotamento espiritual,
    // azul-roxo frio e vazio nas bordas.
    background: `
      radial-gradient(ellipse 100% 100% at 50% 50%, transparent 35%, rgba(30, 10, 60, 0.38) 100%),
      linear-gradient(to bottom, rgba(60, 40, 100, 0.08) 0%, transparent 50%)
    `,
    filter: "saturate(0.5) brightness(0.87) hue-rotate(40deg) contrast(1.06)"
  },

  "Apavorado": {
    // Terror absoluto: bordas escuríssimas, centro ligeiramente claro
    // como olhos arregalados — o que está no escuro aterroriza.
    background: `
      radial-gradient(ellipse 35% 30% at 50% 50%, rgba(10, 5, 20, 0.0) 0%, rgba(0, 0, 0, 0.85) 100%)
    `,
    filter: "saturate(0.3) brightness(0.72) contrast(1.3) hue-rotate(200deg)"
  },

  "Atordoado": {
    // Pancada na cabeça: borrão central, brilho estourado no meio,
    // como estrelas na frente dos olhos.
    background: `
      radial-gradient(ellipse 45% 40% at 50% 45%, rgba(255, 255, 160, 0.22) 0%, transparent 60%),
      radial-gradient(ellipse 100% 100% at 50% 50%, transparent 50%, rgba(20, 10, 0, 0.4) 100%)
    `,
    filter: "blur(0.5px) brightness(1.06) saturate(0.7) contrast(1.14)"
  },

  "Confuso": {
    // Loucura aleatória: hue-rotate leve e irregularidade visual,
    // como tentar focar em algo que não para.
    background: `
      radial-gradient(ellipse 40% 35% at 25% 30%, rgba(200, 100, 200, 0.12) 0%, transparent 60%),
      radial-gradient(ellipse 40% 35% at 75% 70%, rgba(100, 200, 200, 0.1) 0%, transparent 60%),
      radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(40, 10, 60, 0.28) 100%)
    `,
    filter: "hue-rotate(45deg) saturate(1.1) brightness(0.94) contrast(1.08)"
  },

  "Esmorecido": {
    // Mente apagada: dessaturação intensa, como pensar através de lã,
    // azul-acinzentado frio e embotado.
    background: `
      linear-gradient(to bottom, rgba(140, 150, 170, 0.14) 0%, transparent 35%),
      radial-gradient(ellipse 100% 100% at 50% 50%, transparent 45%, rgba(20, 25, 50, 0.3) 100%)
    `,
    filter: "saturate(0.45) brightness(0.9) hue-rotate(-20deg) contrast(0.92)"
  },

  "Fascinado": {
    // Hipnose: vinheta extrema deixando só o centro claro,
    // dourado-âmbar cálido como chama de vela hipnótica.
    background: `
      radial-gradient(ellipse 28% 25% at 50% 48%, rgba(255, 220, 120, 0.2) 0%, transparent 100%),
      radial-gradient(ellipse 100% 100% at 50% 50%, transparent 18%, rgba(20, 10, 0, 0.82) 100%)
    `,
    filter: "brightness(0.78) saturate(0.6) contrast(1.2) sepia(0.25)"
  },

  "Frustrado": {
    // Raiva contida: vermelho-laranja difuso, como sangue subindo à cabeça,
    // contraste elevado e tensão visual.
    background: `
      radial-gradient(ellipse 80% 40% at 50% 0%, rgba(180, 60, 20, 0.18) 0%, transparent 70%),
      radial-gradient(ellipse 100% 100% at 50% 50%, transparent 50%, rgba(80, 20, 0, 0.2) 100%)
    `,
    filter: "saturate(1.15) hue-rotate(-15deg) contrast(1.12) brightness(0.96)"
  },

  "Pasmo": {
    // Mente em branco: tudo fica branco-lavado como overexposure,
    // sem cor, sem decisão.
    background: `
      radial-gradient(ellipse 70% 65% at 50% 50%, rgba(240, 235, 220, 0.28) 0%, transparent 80%)
    `,
    filter: "brightness(1.16) saturate(0.3) contrast(0.85)"
  }

};

// ─── Efeito vazio ──────────────────────────────────────────────────────────
export const EFEITO_PADRAO = {
  background: "none",
  filter: "none"
};

// ─── Combina múltiplos efeitos ativos ──────────────────────────────────────
export function combinarEfeitos(efeitosAtivos) {
  if (efeitosAtivos.length === 0) return EFEITO_PADRAO;

  const backgrounds = [];
  const filters = [];

  efeitosAtivos.forEach(e => {
    if (e.background && e.background !== "none") backgrounds.push(e.background);
    if (e.filter && e.filter !== "none") filters.push(e.filter);
  });

  return {
    background: backgrounds.length ? backgrounds.join(", ") : "none",
    filter: filters.length ? filters.join(" ") : "none"
  };
}