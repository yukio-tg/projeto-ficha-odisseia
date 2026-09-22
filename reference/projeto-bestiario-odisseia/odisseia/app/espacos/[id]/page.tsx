'use client';
import { useParams } from 'next/navigation';
import { useEntity } from '@/hooks/useEntity';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ImageGallery from '@/components/ui/ImageGallery';
import Link from 'next/link';

function OrnamentalRule({ glyph = '✦' }: { glyph?: string }) {
  return (
    <div className="ornamental-rule">
      <span>{glyph}</span>
    </div>
  );
}

export default function EspacoDetalhePage() {
  const params = useParams();
  const { entidade: espaco, loading, error } = useEntity('espacos', params.id as string);

  if (loading) return <LoadingSpinner className="py-20" />;
  if (error || !espaco) {
    return <p className="text-center text-odisseia-bloodLight py-20 font-medieval italic">{error || 'Espaço não encontrado nas Crônicas.'}</p>;
  }

  return (
    <div className="detail-page">
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* ── VOLTAR ── */}
        <Link href="/espacos" className="inline-flex items-center gap-2 font-medieval text-[0.6rem] tracking-[0.22em] uppercase transition-colors mb-8" style={{ color: '#5a3e10' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#2a1a06')}
          onMouseLeave={e => (e.currentTarget.style.color = '#5a3e10')}
        >
          ← Voltar aos Espaços
        </Link>

        {/* ── HERO: info + imagem ── */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] border border-odisseia-border mb-0">

          {/* Parchment info panel */}
          <div className="parch-section p-8 relative">
            <span className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 pointer-events-none" style={{ borderColor: '#5a3e10' }} />
            <span className="absolute top-2 left-2 text-[#9a7832]/30 text-xs pointer-events-none">⛩</span>

            <div className="flex flex-wrap gap-2 mb-4">
              {espaco.categoria && (
                <span className="font-medieval text-[0.55rem] tracking-[0.28em] uppercase px-3 py-0.5 border border-[#9a7832]/40 text-[#5a3e20] bg-[#d8c898]/60">
                  {espaco.categoria}
                </span>
              )}
              {espaco.tags?.map((tag: string) => (
                <span key={tag} className="font-medieval text-[0.55rem] tracking-[0.28em] uppercase px-3 py-0.5 border border-[#4a3278]/50 text-[#6b4c9a] bg-[#eeeaf6]">
                  {tag}
                </span>
              ))}
            </div>

            <h1
              className="font-display text-4xl md:text-5xl mb-2 leading-tight"
              style={{ color: '#5c0f0f', textShadow: '1px 1px 0 rgba(200,160,80,0.12)' }}
            >
              {espaco.nome}
            </h1>

            {espaco.subtitulo && (
              <p className="font-italic italic text-lg mb-6" style={{ color: '#5a3e20' }}>
                {espaco.subtitulo}
              </p>
            )}

            {espaco.narrativa?.resumo && (
              <p className="font-body leading-relaxed text-base" style={{ color: '#2a1a0a', textAlign: 'justify' }}>
                {espaco.narrativa.resumo}
              </p>
            )}

            {espaco.dados_mecanicos && (
              <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t border-[#9a7832]/20">
                {espaco.dados_mecanicos.nivel_recomendado && (
                  <div>
                    <span className="block font-medieval text-[0.5rem] tracking-[0.25em] uppercase mb-0.5" style={{ color: '#5a3e20' }}>Nível</span>
                    <p className="font-body text-sm font-semibold" style={{ color: '#2a1a0a' }}>{espaco.dados_mecanicos.nivel_recomendado}</p>
                  </div>
                )}
                {espaco.dados_mecanicos.dificuldade && (
                  <div>
                    <span className="block font-medieval text-[0.5rem] tracking-[0.25em] uppercase mb-0.5" style={{ color: '#5a3e20' }}>Dificuldade</span>
                    <p className="font-body text-sm font-semibold" style={{ color: '#2a1a0a' }}>{espaco.dados_mecanicos.dificuldade}</p>
                  </div>
                )}
                {espaco.dados_mecanicos.tipo_terreno && (
                  <div>
                    <span className="block font-medieval text-[0.5rem] tracking-[0.25em] uppercase mb-0.5" style={{ color: '#5a3e20' }}>Terreno</span>
                    <p className="font-body text-sm font-semibold" style={{ color: '#2a1a0a' }}>{espaco.dados_mecanicos.tipo_terreno}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Image panel */}
          {espaco.imagens?.length > 0 && (
            <div className="relative bg-odisseia-bgMid border-t md:border-t-0 md:border-l border-odisseia-border overflow-hidden min-h-[280px]">
              <img
                src={espaco.imagens[0].url}
                alt={espaco.nome}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: 'sepia(12%) contrast(1.06) brightness(0.97)' }}
              />
              <div className="absolute inset-0 border border-odisseia-borderGold/15 pointer-events-none z-10" />
              <span className="absolute top-2 left-2 text-odisseia-gold/30 text-xs pointer-events-none z-10">◆</span>
              <span className="absolute bottom-2 right-2 text-odisseia-gold/30 text-xs pointer-events-none z-10">◆</span>
            </div>
          )}
        </div>

        {/* ── DESCRIÇÃO / HISTÓRIA ── */}
        {(espaco.narrativa?.descricao_longa || espaco.narrativa?.historia) && (
          <>
            <OrnamentalRule glyph="⛩" />
            <section className="mb-10">
              <h2 className="section-title">Lore & História</h2>
              {espaco.narrativa?.descricao_longa && (
                <div className="parch-section p-8 mb-4 leading-relaxed font-body text-base whitespace-pre-line"
                  style={{ textAlign: 'justify', fontSize: '1.05rem' }}>
                  {espaco.narrativa.descricao_longa}
                </div>
              )}
              {espaco.narrativa?.historia && (
                <div className="parch-section p-6 border-l-4 mt-4" style={{ borderLeftColor: '#9a7832' }}>
                  <h3 className="font-medieval text-[0.6rem] tracking-[0.28em] uppercase mb-3" style={{ color: '#5a3e20' }}>Crônicas</h3>
                  <p className="font-italic italic leading-relaxed" style={{ color: '#1c1008' }}>{espaco.narrativa.historia}</p>
                </div>
              )}
            </section>
          </>
        )}

        {/* ── PONTOS DE INTERESSE ── */}
        {espaco.narrativa?.pontos_de_interesse?.length > 0 && (
          <>
            <OrnamentalRule glyph="◈" />
            <section className="mb-10">
              <h2 className="section-title">Pontos de Interesse</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {espaco.narrativa.pontos_de_interesse.map((p: string, i: number) => (
                  <div key={i} className="dark-card p-4 flex items-start gap-3">
                    <span className="text-odisseia-gold mt-0.5 shrink-0">◆</span>
                    <p className="font-body text-sm" style={{ color: 'var(--od-text)' }}>{p}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ── MODIFICADORES AMBIENTAIS ── */}
        {espaco.dados_mecanicos?.modificadores_ambientais?.length > 0 && (
          <>
            <OrnamentalRule glyph="⚡" />
            <section className="mb-10">
              <h2 className="section-title">Modificadores Ambientais</h2>
              <div className="flex flex-col gap-2">
                {espaco.dados_mecanicos.modificadores_ambientais.map((m: string, i: number) => (
                  <div key={i} className="dark-card px-5 py-3 flex items-center gap-3">
                    <span className="text-odisseia-gold text-sm shrink-0">⚡</span>
                    <p className="font-body text-sm" style={{ color: 'var(--od-text)' }}>{m}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ── GALERIA ── */}
        {espaco.imagens?.length > 1 && (
          <>
            <OrnamentalRule />
            <section className="mb-10">
              <h2 className="section-title">Galeria</h2>
              <ImageGallery imagens={espaco.imagens} />
            </section>
          </>
        )}

      </div>
    </div>
  );
}
