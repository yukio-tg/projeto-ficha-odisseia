import Link from 'next/link';

const CATEGORIAS = [
  {
    href:  '/criaturas',
    nome:  'Criaturas',
    glyph: '⚔',
    desc:  'Bestas, não-mortos, elementais e aberrações que habitam os confins do mundo de Odisseia.',
  },
  {
    href:  '/espacos',
    nome:  'Espaços',
    glyph: '⛩',
    desc:  'Dungeons, cidades em ruínas, reinos antigos e locais de poder a serem explorados.',
  },
  {
    href:  '/personagens',
    nome:  'Personagens',
    glyph: '◈',
    desc:  'Aliados, vilões e figuras históricas que moldam o destino do mundo.',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-odisseia-bg">
      {/* ── HERO ── */}
      <section className="relative overflow-hidden"
        style={{ background: 'radial-gradient(ellipse 70% 100% at 50% 0%, #2a1a04 0%, #0c0804 70%)', paddingBottom: '4rem' }}>

        {/* Linhas ornamentais laterais (ref: site-header::before/after) */}
        <div className="absolute top-0 bottom-0 left-10 w-px opacity-40 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, transparent 0%, #5a3e10 30%, #d4a828 50%, #5a3e10 70%, transparent 100%)' }} />
        <div className="absolute top-0 bottom-0 right-10 w-px opacity-40 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, transparent 0%, #5a3e10 30%, #d4a828 50%, #5a3e10 70%, transparent 100%)' }} />

        <div className="max-w-4xl mx-auto px-8 text-center pt-12">

          {/* header-rule com ◆ */}
          <div className="header-rule mb-8" />

          {/* Title */}
          <h1
            className="font-display text-6xl md:text-8xl text-odisseia-gold mb-3 px-4"
            style={{ textShadow: '0 0 60px rgba(212,168,40,0.3), 0 2px 4px rgba(0,0,0,0.9)' }}
          >
            ASCALON
          </h1>

          {/* Subtitle — estilo site-sub da referência */}
          <p className="font-medieval text-[0.68rem] tracking-[0.38em] uppercase mb-5 px-4 opacity-80"
            style={{ color: '#8a6510' }}>
            Bestiário do Reino — Arquivo de Criaturas &amp; Entidades
          </p>

          {/* Center divider com ⸸ — estilo header-divider */}
          <div className="flex items-center justify-center gap-5 mb-14 px-4">
            <div className="flex-1 max-w-[180px] h-px" style={{ background: 'linear-gradient(90deg, transparent, #d4a828)' }} />
            <span className="font-display text-odisseia-borderGold/60 text-lg">⸸</span>
            <div className="flex-1 max-w-[180px] h-px" style={{ background: 'linear-gradient(270deg, transparent, #d4a828)' }} />
          </div>

          {/* Category cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {CATEGORIAS.map(cat => (
              <Link
                key={cat.href}
                href={cat.href}
                className="group relative border border-odisseia-border hover:border-odisseia-borderGold
                           bg-odisseia-surface hover:bg-odisseia-bgPanel
                           transition-all duration-300 p-8 text-center overflow-hidden
                           hover:-translate-y-1 hover:shadow-[0_16px_50px_rgba(0,0,0,0.8)]"
              >
                {/* Corner ornaments */}
                <span className="absolute top-0 left-0 w-8 h-8 border-t border-l border-odisseia-borderGold/25 group-hover:border-odisseia-gold/60 transition-colors pointer-events-none" />
                <span className="absolute top-0 right-0 w-8 h-8 border-t border-r border-odisseia-borderGold/25 group-hover:border-odisseia-gold/60 transition-colors pointer-events-none" />
                <span className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-odisseia-borderGold/25 group-hover:border-odisseia-gold/60 transition-colors pointer-events-none" />
                <span className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-odisseia-borderGold/25 group-hover:border-odisseia-gold/60 transition-colors pointer-events-none" />

                <div className="font-display text-5xl mb-5 text-odisseia-borderGold/30 group-hover:text-odisseia-gold/50 transition-colors">
                  {cat.glyph}
                </div>

                <h2 className="font-medieval text-sm tracking-[0.2em] uppercase text-odisseia-text group-hover:text-odisseia-gold transition-colors mb-3">
                  {cat.nome}
                </h2>

                <p className="font-italic text-sm italic text-odisseia-muted leading-relaxed">
                  {cat.desc}
                </p>

                {/* Bottom shine on hover */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-px scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center"
                  style={{ background: 'linear-gradient(90deg, transparent, #d4a828, transparent)' }}
                />
              </Link>
            ))}
          </div>

          {/* Bottom header-rule */}
          <div className="header-rule mt-14 mb-2" />

        </div>
      </section>
    </div>
  );
}
