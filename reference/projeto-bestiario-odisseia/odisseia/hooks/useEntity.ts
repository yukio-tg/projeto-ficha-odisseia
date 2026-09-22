'use client';
import { useState, useEffect } from 'react';
import { buscarEntidade, listarEntidades } from '@/lib/firestore';
import { Colecao } from '@/lib/types';

export function useEntity(colecao: Colecao, id: string) {
  const [entidade, setEntidade] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const data = await buscarEntidade(colecao, id);
        if (!data) {
          setError('Entidade não encontrada');
        } else {
          setEntidade(data);
        }
      } catch (err) {
        setError('Erro ao carregar entidade');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (id) carregar();
  }, [colecao, id]);

  return { entidade, loading, error };
}

export function useEntityList(colecao: Colecao) {
  const [entidades, setEntidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const data = await listarEntidades(colecao);
        setEntidades(data);
      } catch (err) {
        console.error('Erro ao listar:', err);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [colecao]);

  return { entidades, loading };
}
