'use client';
import { useEntityList } from '@/hooks/useEntity';
import EntityCard from '@/components/ui/EntityCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SearchFilter from '@/components/ui/SearchFilter';

export default function PersonagensPage() {
  const { entidades, loading } = useEntityList('personagens');

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <p className="font-medieval text-[0.58rem] tracking-[0.38em] uppercase text-odisseia-muted mb-2">Crônicas</p>
        <div className="flex items-center gap-4">
          <h1 className="font-display text-3xl md:text-4xl text-odisseia-gold" style={{ textShadow: '0 0 40px rgba(212,168,40,0.18)' }}>
            Personagens
          </h1>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, #9a7832, transparent)' }} />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner className="py-20" />
      ) : (
        <SearchFilter
          items={entidades}
          searchFields={(p: any) => [p.nome, p.subtitulo, p.categoria, p.faccao, p.narrativa?.resumo]}
          placeholder="Buscar por nome, facção, classe…"
          total={entidades.length}
        >
          {(filtered) => filtered.length === 0 ? (
            <p className="font-italic italic text-odisseia-muted text-center py-20">
              {entidades.length === 0 ? 'Nenhum personagem nas crônicas ainda.' : 'Nenhum personagem encontrado.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((p: any) => (
                <EntityCard
                  key={p.id}
                  id={p.id}
                  nome={p.nome}
                  subtitulo={p.subtitulo}
                  resumo={p.narrativa?.resumo}
                  imagemUrl={p.imagens?.[0]?.url}
                  colecao="personagens"
                  categoria={p.categoria}
                />
              ))}
            </div>
          )}
        </SearchFilter>
      )}
    </div>
  );
}
