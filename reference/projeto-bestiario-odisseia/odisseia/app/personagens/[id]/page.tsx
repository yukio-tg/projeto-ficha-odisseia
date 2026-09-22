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

export default function PersonagemDetalhePage() {
  const params = useParams();
  const { entidade: personagem, loading, error } = useEntity('personagens', params.id as string);

  if (loading) return <LoadingSpinner className="py-20" />;
  if (error || !personagem) {
    return <p className="text-center text-odisseia-bloodLight py-20 font-italic italic">{error || 'Personagem não encontrado nas Crônicas.'}</p>;
  }

  return (
    <div className="detail-page">
      <div className="max-w-5xl mx-auto px-4 py-10">

      <Link href="/personagens" className="inline-flex items-center gap-2 font-medieval text-[0.6rem] tracking-[0.22em] uppercase transition-colors mb-8" style={{ color: '#5a3e10' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#2a1a06')}
        onMouseLeave={e => (e.currentTarget.style.color = '#5a3e10')}
      >
        ← Voltar às Crônicas
      </Link>

      {/* ── HERO: info + imagem ── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] border border-odisseia-border mb-0">

        <div className="parch-section p-8 relative">
          <span className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 pointer-events-none" style={{ borderColor: '#5a3e10' }} />
          <span className="absolute top-2 left-2 text-[#9a7832]/30 text-xs pointer-events-none">◈</span>

          <div className="flex flex-wrap gap-2 mb-4">
            {personagem.categoria && (
              <span className="font-medieval text-[0.55rem] tracking-[0.28em] uppercase px-3 py-0.5 border border-[#9a7832]/40 text-[#5a3e20] bg-[#d8c898]/60">
                {personagem.categoria}
              </span>
            )}
            {personagem.faccao && (
              <span className="font-medieval text-[0.55rem] tracking-[0.28em] uppercase px-3 py-0.5 border border-[#4a3278]/50 text-[#6b4c9a] bg-[#eeeaf6]">
                {personagem.faccao}
              </span>
            )}
          </div>

          <h1
            className="font-display text-4xl md:text-5xl mb-2 leading-tight"
            style={{ color: '#5c0f0f', textShadow: '1px 1px 0 rgba(200,160,80,0.12)' }}
          >
            {personagem.nome}
          </h1>

          {personagem.subtitulo && (
            <p className="font-italic italic text-lg mb-6" style={{ color: '#5a3e20' }}>
              {personagem.subtitulo}
            </p>
          )}

          {personagem.narrativa?.resumo && (
            <p className="font-body leading-relaxed text-base" style={{ color: '#2a1a0a', textAlign: 'justify' }}>
              {personagem.narrativa.resumo}
            </p>
          )}

          {(personagem.narrativa?.personalidade || personagem.narrativa?.objetivos) && (
            <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-[#9a7832]/20">
              {personagem.narrativa?.personalidade && (
                <div>
                  <span className="block font-medieval text-[0.55rem] tracking-[0.25em] uppercase mb-1" style={{ color: '#5a3e20' }}>Personalidade</span>
                  <p className="font-body text-sm" style={{ color: '#2a1a0a' }}>{personagem.narrativa.personalidade}</p>
                </div>
              )}
              {personagem.narrativa?.objetivos && (
                <div>
                  <span className="block font-medieval text-[0.55rem] tracking-[0.25em] uppercase mb-1" style={{ color: '#5a3e20' }}>Objetivos</span>
                  <p className="font-body text-sm" style={{ color: '#2a1a0a' }}>{personagem.narrativa.objetivos}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {personagem.imagens?.length > 0 && (
          <div className="relative bg-odisseia-bgMid border-t md:border-t-0 md:border-l border-odisseia-border overflow-hidden min-h-[280px]">
            <img
              src={personagem.imagens[0].url}
              alt={personagem.nome}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: 'sepia(12%) contrast(1.06) brightness(0.97)' }}
            />
            <div className="absolute inset-0 border border-odisseia-borderGold/15 pointer-events-none z-10" />
            <span className="absolute top-2 left-2 text-odisseia-gold/30 text-xs pointer-events-none z-10">◆</span>
            <span className="absolute bottom-2 right-2 text-odisseia-gold/30 text-xs pointer-events-none z-10">◆</span>
          </div>
        )}
      </div>

      {/* ── BIOGRAFIA ── */}
      {personagem.narrativa?.biografia && (
        <>
          <OrnamentalRule glyph="✦" />
          <section className="mb-10">
            <h2 className="section-title">Biografia</h2>
            <div className="parch-section desc-drop-cap p-8 leading-relaxed font-italic text-base whitespace-pre-line"
              style={{ textAlign: 'justify', fontSize: '1.08rem', lineHeight: '1.9' }}>
              {personagem.narrativa.biografia}
            </div>
          </section>
        </>
      )}

      {/* ── GALERIA EXTRA ── */}
      {personagem.imagens?.length > 1 && (
        <>
          <OrnamentalRule />
          <section className="mb-10">
            <h2 className="section-title">Galeria</h2>
            <ImageGallery imagens={personagem.imagens} />
          </section>
        </>
      )}

      {/* ── PODERES ── */}
      {personagem.tatico?.poderes?.length > 0 && (
        <>
          <OrnamentalRule glyph="✦" />
          <section className="mb-10">
            <h2 className="section-title">Poderes & Habilidades</h2>
            <PowerTree poderes={personagem.tatico.poderes} />
          </section>
        </>
      )}
      </div>
    </div>
  );
}
