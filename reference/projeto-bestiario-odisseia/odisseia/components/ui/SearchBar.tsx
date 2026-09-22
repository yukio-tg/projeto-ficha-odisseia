'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSearch } from '@/hooks/useSearch';

export default function SearchBar() {
  const { resultados, loading, termo, buscar, limpar } = useSearch();
  const [aberto, setAberto] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    buscar(valor);
    setAberto(valor.length >= 2);
  };

  const handleSelect = (colecao: string, id: string) => {
    setAberto(false);
    limpar();
    router.push(`/${colecao}/${id}`);
  };

  const colecaoLabel: Record<string, string> = {
    criaturas: 'Criatura',
    espacos: 'Espaço',
    personagens: 'Personagem',
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xl">
      <input
        type="text"
        value={termo}
        onChange={handleChange}
        onFocus={() => termo.length >= 2 && setAberto(true)}
        placeholder="Buscar criaturas, espaços, personagens..."
        className="input-field pl-10"
      />
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-odisseia-muted"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>

      {aberto && (
        <div className="absolute top-full mt-2 w-full bg-odisseia-surface border border-odisseia-border rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-odisseia-muted text-sm">Buscando...</div>
          )}
          {!loading && resultados.length === 0 && termo.length >= 2 && (
            <div className="p-4 text-center text-odisseia-muted text-sm">Nenhum resultado encontrado</div>
          )}
          {!loading && resultados.map((r) => (
            <button
              key={`${r._colecao}-${r.id}`}
              onClick={() => handleSelect(r._colecao, r.id)}
              className="w-full text-left px-4 py-3 hover:bg-odisseia-border/30 transition-colors flex items-center justify-between"
            >
              <span className="text-odisseia-text text-sm">{r.nome}</span>
              <span className="text-xs text-odisseia-muted">{colecaoLabel[r._colecao]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
