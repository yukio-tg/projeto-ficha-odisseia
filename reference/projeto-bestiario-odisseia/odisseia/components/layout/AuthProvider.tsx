'use client';
import { AuthContext, useAuthProvider } from '@/hooks/useAuth';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const authState = useAuthProvider();
  return <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>;
}
