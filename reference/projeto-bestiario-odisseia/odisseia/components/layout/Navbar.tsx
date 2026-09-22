'use client';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const NAV_LINKS = [
  { href: '/criaturas',   label: 'Criaturas',   glyph: '⚔' },
  { href: '/espacos',     label: 'Espaços',      glyph: '⛩' },
  { href: '/personagens', label: 'Personagens',  glyph: '◈' },
];

export default function Navbar() {
  const { user, role } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-50">
      <div className="h-px bg-gradient-to-r from-transparent via-odisseia-gold to-transparent opacity-50" />

      <nav
        className="bg-odisseia-bgMid border-b border-odisseia-border backdrop-blur-sm"
        style={{ background: 'linear-gradient(180deg, #100a03 0%, #120b04 100%)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            <Link href="/" className="flex items-center gap-3 group shrink-0">
              <span
                className="font-display text-lg text-odisseia-gold group-hover:text-odisseia-goldLight transition-colors"
                style={{ textShadow: '0 0 30px rgba(212,168,40,0.35)' }}
              >
                Odisseia
              </span>
              <span className="hidden md:block w-px h-4 bg-odisseia-border" />
              <span className="hidden md:block font-medieval text-[0.52rem] tracking-[0.32em] uppercase text-odisseia-muted/70">
                Bestiário & Enciclopédia
              </span>
            </Link>

            <div className="hidden md:flex items-center">
              {NAV_LINKS.map(({ href, label, glyph }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-1.5 px-5 py-5 font-medieval text-[0.62rem] tracking-[0.22em] uppercase
                             text-odisseia-muted hover:text-odisseia-gold
                             border-b-2 border-transparent hover:border-odisseia-gold/50
                             transition-all duration-200"
                >
                  <span className="opacity-50 text-[0.7rem]">{glyph}</span>
                  {label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {role === 'admin' && (
                <Link
                  href="/admin"
                  className="font-medieval text-[0.58rem] tracking-[0.22em] uppercase px-4 py-1.5
                             border border-odisseia-borderGold text-odisseia-gold
                             hover:bg-odisseia-gold hover:text-odisseia-bg
                             transition-all duration-200"
                >
                  ✦ Admin
                </Link>
              )}
              {user ? (
                <button
                  onClick={handleLogout}
                  className="font-medieval text-[0.58rem] tracking-[0.18em] uppercase text-odisseia-muted hover:text-odisseia-text transition-colors"
                >
                  Sair
                </button>
              ) : (
                <Link
                  href="/login"
                  className="font-medieval text-[0.58rem] tracking-[0.18em] uppercase text-odisseia-muted hover:text-odisseia-text transition-colors"
                >
                  ⊹ Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="h-px bg-gradient-to-r from-transparent via-odisseia-borderGold to-transparent opacity-25" />
    </header>
  );
}
