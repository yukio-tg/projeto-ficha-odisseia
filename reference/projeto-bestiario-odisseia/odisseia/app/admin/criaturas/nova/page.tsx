'use client';
import EntityForm from '@/components/admin/EntityForm';

export default function NovaCriaturaPage() {
  return (
    <div>
      <h2 className="text-xl font-medieval text-odisseia-text mb-6">Nova Criatura</h2>
      <EntityForm colecao="criaturas" />
    </div>
  );
}
