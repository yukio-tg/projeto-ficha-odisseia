import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import AuthProvider from '@/components/layout/AuthProvider';

export const metadata: Metadata = {
  title: 'ASCALON — Bestiário & Enciclopédia',
  description: 'Enciclopédia de Ascalon; Odisseia RPG: criaturas, espaços e personagens.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
