'use client';
import { useParams } from 'next/navigation';
import { useEntity } from '@/hooks/useEntity';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ImageGallery from '@/components/ui/ImageGallery';
import RadarChart from '@/components/radar/RadarChart';
import PowerTree from '@/components/powers/PowerTree';
import Link from 'next/link';

function OrnamentalRule({ glyph = '✦' }: { glyph?: string }) {
  return (
    <div className="ornamental-rule">
      <span>{glyph}</span>
    </div>
  );
}

export default function CriaturaDetalhePage() {
  const params = useParams();
  const { entidade: criatura, loading, error } = useEntity('criaturas', params.id as string);

  if (loading) return <LoadingSpinner className="py-20" />;
  if (error || !criatura) {
    return <p className="text-center text-odisseia-bloodLight py-20 font-italic italic">{error || 'Criatura não encontrada no Bestiário.'}</p>;
  }

  return (
    <div className="detail-page">
      <div className="max-w-5xl mx-auto px-4 py-10">

      {/* ── VOLTAR ── */}
      <Link href="/criaturas" className="inline-flex items-center gap-2 font-medieval text-[0.6rem] tracking-[0.22em] uppercase transition-colors mb-8" style={{ color: '#5a3e10' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#2a1a06')}
        onMouseLeave={e => (e.currentTarget.style.color = '#5a3e10')}
      >
        ← Voltar ao Bestiário
      </Link>

      {/* ── HERO: info + imagem ── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] border border-odisseia-border mb-0">

        {/* Parchment info panel */}
        <div className="parch-section p-8 relative">
          {/* Corner ornament */}
          <span className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-odisseia-borderDark/60 pointer-events-none" style={{ borderColor: '#5a3e10' }} />
          <span className="absolute top-2 left-2 text-[#9a7832]/30 text-xs pointer-events-none">✦</span>

          <div className="flex flex-wrap gap-2 mb-4">
            {criatura.categoria && (
              <span className="font-medieval text-[0.55rem] tracking-[0.28em] uppercase px-3 py-0.5 border border-[#9a7832]/40 text-[#5a3e20] bg-[#d8c898]/60">
                {criatura.categoria}
              </span>
            )}
            {criatura.raridade && (
              <span className="font-medieval text-[0.55rem] tracking-[0.28em] uppercase px-3 py-0.5 border border-[#601010]/40 text-[#7a1818] bg-[#f6eeee]">
                {criatura.raridade}
              </span>
            )}
          </div>

          <h1
            className="font-display text-4xl md:text-5xl mb-2 leading-tight"
            style={{ color: '#5c0f0f', textShadow: '1px 1px 0 rgba(200,160,80,0.12)' }}
          >
            {criatura.nome}
          </h1>

          {criatura.subtitulo && (
            <p className="font-italic italic text-lg mb-6" style={{ color: '#5a3e20' }}>
              {criatura.subtitulo}
            </p>
          )}

          {criatura.narrativa?.resumo && (
            <p className="font-body leading-relaxed text-base" style={{ color: '#2a1a0a', textAlign: 'justify' }}>
              {criatura.narrativa.resumo}
            </p>
          )}

          {(criatura.narrativa?.habitat || criatura.narrativa?.comportamento) && (
            <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-[#9a7832]/20">
              {criatura.narrativa?.habitat && (
                <div>
                  <span className="block font-medieval text-[0.55rem] tracking-[0.25em] uppercase mb-1" style={{ color: '#5a3e20' }}>Habitat</span>
                  <p className="font-body text-sm" style={{ color: '#2a1a0a' }}>{criatura.narrativa.habitat}</p>
                </div>
              )}
              {criatura.narrativa?.comportamento && (
                <div>
                  <span className="block font-medieval text-[0.55rem] tracking-[0.25em] uppercase mb-1" style={{ color: '#5a3e20' }}>Comportamento</span>
                  <p className="font-body text-sm" style={{ color: '#2a1a0a' }}>{criatura.narrativa.comportamento}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Image panel */}
        {criatura.imagens?.length > 0 && (
          <div className="relative bg-odisseia-bgMid border-t md:border-t-0 md:border-l border-odisseia-border overflow-hidden min-h-[280px]">
            <img
              src={criatura.imagens[0].url}
              alt={criatura.nome}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: 'sepia(12%) contrast(1.06) brightness(0.97)' }}
            />
            <div className="absolute inset-0 border border-odisseia-borderGold/15 pointer-events-none z-10" />
            <span className="absolute top-2 left-2 text-odisseia-gold/30 text-xs pointer-events-none z-10">◆</span>
            <span className="absolute bottom-2 right-2 text-odisseia-gold/30 text-xs pointer-events-none z-10">◆</span>
          </div>
        )}
      </div>
      
      {/* ── LORE / DESCRIÇÃO LONGA ── */}
      {(criatura.narrativa?.descricao_longa || criatura.narrativa?.lore) && (
        <>
          <OrnamentalRule glyph="◈" />
          <section className="mb-10">
            <h2 className="section-title">Lore & Narrativa</h2>
            {criatura.narrativa?.descricao_longa && (
              <div className="parch-section desc-drop-cap p-8 mb-4 leading-relaxed font-italic text-base whitespace-pre-line"
                style={{ textAlign: 'justify', fontSize: '1.08rem', lineHeight: '1.9' }}>
                {criatura.narrativa.descricao_longa}
              </div>
            )}
            {criatura.narrativa?.lore && (
              <div className="parch-section p-6 border-l-4 mt-4" style={{ borderLeftColor: '#9a7832' }}>
                <h3 className="font-medieval text-[0.6rem] tracking-[0.28em] uppercase mb-3" style={{ color: '#5a3e20' }}>Lore</h3>
                <p className="font-italic italic leading-relaxed" style={{ color: '#1c1008' }}>{criatura.narrativa.lore}</p>
              </div>
            )}
          </section>
        </>
      )}

      {/* ── GALERIA DE IMAGENS (adicional) ── */}
      {criatura.imagens?.length > 1 && (
        <>
          <OrnamentalRule />
          <section className="mb-10">
            <h2 className="section-title">Galeria</h2>
            <ImageGallery imagens={criatura.imagens} />
          </section>
        </>
      )}

      {/* ── PODERES ── */}
      {criatura.tatico?.poderes?.length > 0 && (
        <>
          <OrnamentalRule glyph="✦" />
          <section className="mb-10">
            <h2 className="section-title">Poderes & Habilidades</h2>
            <PowerTree poderes={criatura.tatico.poderes} />
          </section>
        </>
      )}

      {/* ── RELAÇÕES ── */}
      {(criatura.relacoes?.espacos?.length > 0 || criatura.relacoes?.personagens?.length > 0) && (
        <>
          <OrnamentalRule />
          <section className="mb-10">
            <h2 className="section-title">Relações</h2>
            <div className="flex flex-wrap gap-3">
              {criatura.relacoes.espacos?.map((id: string) => (
                <Link key={id} href={`/espacos/${id}`}
                  className="font-medieval text-[0.6rem] tracking-[0.15em] uppercase px-4 py-1.5 border border-odisseia-borderGold text-odisseia-gold hover:bg-odisseia-gold hover:text-odisseia-bg transition-all">
                  ⛩ {id}
                </Link>
              ))}
              {criatura.relacoes.personagens?.map((id: string) => (
                <Link key={id} href={`/personagens/${id}`}
                  className="font-medieval text-[0.6rem] tracking-[0.15em] uppercase px-4 py-1.5 border border-odisseia-border text-odisseia-muted hover:border-odisseia-borderGold hover:text-odisseia-gold transition-all">
                  ◈ {id}
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
      </div>
    </div>
  );
}
