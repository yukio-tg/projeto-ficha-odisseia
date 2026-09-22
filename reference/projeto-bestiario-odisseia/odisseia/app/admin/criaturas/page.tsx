'use client';
import Link from 'next/link';
import { useEntityList } from '@/hooks/useEntity';
import { deletarEntidade } from '@/lib/firestore';
import { useState } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function AdminCriaturasPage() {
  const { entidades, loading } = useEntityList('criaturas');
  const [deletando, setDeletando] = useState<string | null>(null);

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Deletar "${nome}"? Essa ação é irreversível.`)) return;
    setDeletando(id);
    try {
      await deletarEntidade('criaturas', id);
      window.location.reload();
    } catch (err) {
      alert('Erro ao deletar');
    } finally {
      setDeletando(null);
    }
  };

  if (loading) return <LoadingSpinner className="py-10" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medieval text-odisseia-text">Criaturas</h2>
        <Link href="/admin/criaturas/nova" className="btn-primary text-sm">+ Nova Criatura</Link>
      </div>

      {entidades.length === 0 ? (
        <p className="text-odisseia-muted">Nenhuma criatura cadastrada.</p>
      ) : (
        <div className="space-y-2">
          {entidades.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between p-4 bg-odisseia-surface border border-odisseia-border rounded">
              <div>
                <span className="text-odisseia-text font-medium">{c.nome}</span>
                <span className="text-xs text-odisseia-muted ml-2">{c.categoria}</span>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/criaturas/${c.id}/editar`} className="btn-secondary text-xs px-3 py-1">Editar</Link>
                <button
                  onClick={() => handleDelete(c.id, c.nome)}
                  disabled={deletando === c.id}
                  className="btn-danger text-xs px-3 py-1"
                >
                  {deletando === c.id ? '...' : 'Deletar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
