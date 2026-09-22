'use client';
import EntityForm from '@/components/admin/EntityForm';

export default function NovoPersonagemPage() {
  return (
    <div>
      <h2 className="text-xl font-medieval text-odisseia-text mb-6">Novo Personagem</h2>
      <EntityForm colecao="personagens" />
    </div>
  );
}
