'use client';
import { useParams } from 'next/navigation';
import { useEntity } from '@/hooks/useEntity';
import EntityForm from '@/components/admin/EntityForm';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function EditarCriaturaPage() {
  const params = useParams();
  const { entidade, loading, error } = useEntity('criaturas', params.id as string);

  if (loading) return <LoadingSpinner className="py-10" />;
  if (error || !entidade) return <p className="text-red-400">{error || 'Não encontrado'}</p>;

  return (
    <div>
      <h2 className="text-xl font-medieval text-odisseia-text mb-6">Editar: {entidade.nome}</h2>
      <EntityForm colecao="criaturas" dados={entidade} entityId={params.id as string} />
    </div>
  );
}
