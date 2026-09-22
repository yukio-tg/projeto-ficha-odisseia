'use client';
import Link from 'next/link';
import { useEntityList } from '@/hooks/useEntity';

export default function AdminDashboard() {
  const { entidades: criaturas } = useEntityList('criaturas');
  const { entidades: espacos } = useEntityList('espacos');
  const { entidades: personagens } = useEntityList('personagens');

  const categorias = [
    { nome: 'Criaturas', total: criaturas.length, href: '/admin/criaturas', icon: '⚔️' },
    { nome: 'Espaços', total: espacos.length, href: '/admin/espacos', icon: '🏰' },
    { nome: 'Personagens', total: personagens.length, href: '/admin/personagens', icon: '👤' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {categorias.map(cat => (
        <Link key={cat.nome} href={cat.href} className="card-entity p-6 group">
          <div className="text-3xl mb-3">{cat.icon}</div>
          <h2 className="font-medieval text-lg text-odisseia-text group-hover:text-odisseia-gold transition-colors">
            {cat.nome}
          </h2>
          <p className="text-3xl font-bold text-odisseia-gold mt-2">{cat.total}</p>
          <p className="text-xs text-odisseia-muted mt-1">entidades cadastradas</p>
        </Link>
      ))}
    </div>
  );
}
