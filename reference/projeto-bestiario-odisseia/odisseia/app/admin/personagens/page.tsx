'use client';
import Link from 'next/link';
import { useEntityList } from '@/hooks/useEntity';
import { deletarEntidade } from '@/lib/firestore';
import { useState } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function AdminPersonagensPage() {
  const { entidades, loading } = useEntityList('personagens');
  const [deletando, setDeletando] = useState<string | null>(null);

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Deletar "${nome}"?`)) return;
    setDeletando(id);
    try {
      await deletarEntidade('personagens', id);
      window.location.reload();
    } catch { alert('Erro ao deletar'); }
    finally { setDeletando(null); }
  };

  if (loading) return <LoadingSpinner className="py-10" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medieval text-odisseia-text">Personagens</h2>
        <Link href="/admin/personagens/novo" className="btn-primary text-sm">+ Novo Personagem</Link>
      </div>
      {entidades.length === 0 ? (
        <p className="text-odisseia-muted">Nenhum personagem cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {entidades.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between p-4 bg-odisseia-surface border border-odisseia-border rounded">
              <div>
                <span className="text-odisseia-text font-medium">{p.nome}</span>
                <span className="text-xs text-odisseia-muted ml-2">{p.categoria}</span>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/personagens/${p.id}/editar`} className="btn-secondary text-xs px-3 py-1">Editar</Link>
                <button onClick={() => handleDelete(p.id, p.nome)} disabled={deletando === p.id} className="btn-danger text-xs px-3 py-1">
                  {deletando === p.id ? '...' : 'Deletar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
