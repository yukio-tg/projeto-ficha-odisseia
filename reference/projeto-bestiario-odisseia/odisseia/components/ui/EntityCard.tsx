import Link from 'next/link';

interface EntityCardProps {
  id: string;
  nome: string;
  subtitulo?: string;
  resumo?: string;
  imagemUrl?: string;
  colecao: 'criaturas' | 'espacos' | 'personagens';
  categoria?: string;
  raridade?: string;
}

const RARIDADE_STYLE: Record<string, string> = {
  lendario: 'border-odisseia-blood text-odisseia-bloodLight bg-odisseia-blood/10',
  raro:     'border-odisseia-borderGold text-odisseia-gold bg-odisseia-gold/10',
  comum:    'border-odisseia-border text-odisseia-muted',
};

export default function EntityCard({ id, nome, subtitulo, resumo, imagemUrl, colecao, categoria, raridade }: EntityCardProps) {
  const rarStyle = raridade ? (RARIDADE_STYLE[raridade.toLowerCase()] ?? RARIDADE_STYLE.comum) : '';

  return (
    <Link
      href={`/${colecao}/${id}`}
      className="group relative block overflow-hidden transition-all duration-300
                 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.75)]"
      style={{ border: '1px solid #3a2810' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#d4a828')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#3a2810')}
    >
      {/* Image panel — dark, sepia */}
      {imagemUrl ? (
        <div className="relative h-44 overflow-hidden bg-odisseia-bgMid">
          <img
            src={imagemUrl}
            alt={nome}
            className="w-full h-full object-cover transition-filter duration-500"
            style={{ filter: 'sepia(18%) contrast(1.04)', transition: 'filter 0.35s' }}
            onMouseEnter={e => (e.currentTarget.style.filter = 'sepia(3%) contrast(1)')}
            onMouseLeave={e => (e.currentTarget.style.filter = 'sepia(18%) contrast(1.04)')}
          />
          {/* Corner glyph */}
          <span className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-[0.65rem] z-10 pointer-events-none"
            style={{ background: 'rgba(8,5,2,0.72)', border: '1px solid rgba(184,136,42,0.3)', color: 'rgba(184,136,42,0.55)' }}>
            ◆
          </span>
          {raridade && (
            <span className={`absolute top-2 left-2 font-medieval text-[0.52rem] tracking-[0.18em] uppercase px-2 py-0.5 border z-10 ${rarStyle}`}>
              {raridade}
            </span>
          )}
        </div>
      ) : (
        <div className="h-44 bg-odisseia-bgMid flex items-center justify-center relative">
          <span className="font-display text-5xl text-odisseia-border/40">Ω</span>
          {raridade && (
            <span className={`absolute top-2 left-2 font-medieval text-[0.52rem] tracking-[0.18em] uppercase px-2 py-0.5 border z-10 ${rarStyle}`}>
              {raridade}
            </span>
          )}
        </div>
      )}

      {/* Body — pergaminho com tinta escura (padrão do bestiário beta) */}
      <div className="grid-card-body">
        {categoria && (
          <p className="font-medieval text-[0.52rem] tracking-[0.32em] uppercase mb-1" style={{ color: 'var(--od-ink-label)' }}>
            {categoria}
          </p>
        )}
        <h3 className="grid-card-name group-hover:opacity-80 transition-opacity leading-tight">
          {nome}
        </h3>
        {subtitulo && (
          <p className="grid-card-type mt-0.5 leading-snug">{subtitulo}</p>
        )}
        {resumo && (
          <p className="font-body text-[0.88rem] mt-2 line-clamp-2 leading-relaxed" style={{ color: 'var(--od-ink-mid)' }}>{resumo}</p>
        )}
      </div>
    </Link>
  );
}
