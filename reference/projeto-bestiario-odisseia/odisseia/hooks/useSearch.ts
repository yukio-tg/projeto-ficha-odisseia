'use client';
import { useState, useCallback } from 'react';
import { buscarPorNome } from '@/lib/firestore';
import { EntidadeComColecao } from '@/lib/types';

export function useSearch() {
  const [resultados, setResultados] = useState<EntidadeComColecao[]>([]);
  const [loading, setLoading] = useState(false);
  const [termo, setTermo] = useState('');

  const buscar = useCallback(async (query: string) => {
    setTermo(query);
    if (query.length < 2) {
      setResultados([]);
      return;
    }

    setLoading(true);
    try {
      const res = await buscarPorNome(query);
      setResultados(res);
    } catch (err) {
      console.error('Erro na busca:', err);
      setResultados([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const limpar = useCallback(() => {
    setTermo('');
    setResultados([]);
  }, []);

  return { resultados, loading, termo, buscar, limpar };
}
