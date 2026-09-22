'use client';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('AdminLayout useEffect - loading:', loading, 'role:', role);
    if (!loading && role !== 'admin') {
      console.log('Redirecionando para /login - role:', role);
      router.push('/login');
    }
  }, [loading, role, router]);

  console.log('AdminLayout render - loading:', loading, 'role:', role);

  if (loading) {
    return <LoadingSpinner className="py-20" />;
  }
  
  if (role !== 'admin') {
    console.log('Role não é admin, renderizando null. Role atual:', role);
    return null;
  }
  
  console.log('Renderizando conteúdo admin');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-8">
        <span className="text-xs px-2 py-1 bg-odisseia-gold/20 text-odisseia-gold rounded">ADMIN</span>
        <h1 className="text-2xl font-medieval text-odisseia-gold">Painel de Administração</h1>
      </div>
      {children}
    </div>
  );
}
