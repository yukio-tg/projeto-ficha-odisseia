'use client';
import EntityForm from '@/components/admin/EntityForm';

export default function NovoEspacoPage() {
  return (
    <div>
      <h2 className="text-xl font-medieval text-odisseia-text mb-6">Novo Espaço</h2>
      <EntityForm colecao="espacos" />
    </div>
  );
}
