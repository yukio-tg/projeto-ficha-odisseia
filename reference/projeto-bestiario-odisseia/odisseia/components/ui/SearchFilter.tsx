'use client';
import { useState, useMemo } from 'react';

interface SearchFilterProps<T> {
  items: T[];
  searchFields: (item: T) => string[];
  children: (filtered: T[]) => React.ReactNode;
  placeholder?: string;
  total?: number;
}

export default function SearchFilter<T>({
  items,
  searchFields,
  children,
  placeholder = 'Buscar…',
  total,
}: SearchFilterProps<T>) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(item =>
      searchFields(item).some(field => field?.toLowerCase().includes(q))
    );
  }, [items, query, searchFields]);

  return (
    <div>
      {/* Search bar — estilo do bestiário de referência */}
      <div className="relative mb-6">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          className="search-input-medieval w-full font-italic italic text-base outline-none transition-all"
          style={{
            background: '#0e0905',
            border: '1px solid #261a08',
            borderBottomColor: '#3a2a10',
            color: '#c89828',
            padding: '0.55rem 2.5rem 0.55rem 0.85rem',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#d4a828'; e.currentTarget.style.boxShadow = '0 0 0 1px rgba(212,168,40,0.1) inset'; }}
          onBlur={e => { e.currentTarget.style.borderColor = '#261a08'; e.currentTarget.style.borderBottomColor = '#3a2a10'; e.currentTarget.style.boxShadow = 'none'; }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute inset-y-0 right-0 flex items-center pr-3 transition-colors"
            style={{ color: '#4a3215' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#c89828')}
            onMouseLeave={e => (e.currentTarget.style.color = '#4a3215')}
          >
            <span className="font-medieval text-xs">✕</span>
          </button>
        )}
      </div>

      {/* Result count — estilo sidebar-label */}
      {query && (
        <p className="font-medieval text-[0.58rem] tracking-[0.32em] uppercase mb-6" style={{ color: '#4a3215' }}>
          {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
          {total != null && ` de ${total}`}
        </p>
      )}

      {children(filtered)}
    </div>
  );
}
