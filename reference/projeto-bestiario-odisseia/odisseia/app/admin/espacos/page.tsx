'use client';
import Link from 'next/link';
import { useEntityList } from '@/hooks/useEntity';
import { deletarEntidade } from '@/lib/firestore';
import { useState } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function AdminEspacosPage() {
  const { entidades, loading } = useEntityList('espacos');
  const [deletando, setDeletando] = useState<string | null>(null);

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Deletar "${nome}"?`)) return;
    setDeletando(id);
    try {
      await deletarEntidade('espacos', id);
      window.location.reload();
    } catch { alert('Erro ao deletar'); }
    finally { setDeletando(null); }
  };

  if (loading) return <LoadingSpinner className="py-10" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medieval text-odisseia-text">Espaços</h2>
        <Link href="/admin/espacos/novo" className="btn-primary text-sm">+ Novo Espaço</Link>
      </div>
      {entidades.length === 0 ? (
        <p className="text-odisseia-muted">Nenhum espaço cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {entidades.map((e: any) => (
            <div key={e.id} className="flex items-center justify-between p-4 bg-odisseia-surface border border-odisseia-border rounded">
              <div>
                <span className="text-odisseia-text font-medium">{e.nome}</span>
                <span className="text-xs text-odisseia-muted ml-2">{e.categoria}</span>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/espacos/${e.id}/editar`} className="btn-secondary text-xs px-3 py-1">Editar</Link>
                <button onClick={() => handleDelete(e.id, e.nome)} disabled={deletando === e.id} className="btn-danger text-xs px-3 py-1">
                  {deletando === e.id ? '...' : 'Deletar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
