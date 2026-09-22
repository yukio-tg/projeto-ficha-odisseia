'use client';
import { useState, useEffect, createContext, useContext } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange, verificarRole } from '@/lib/auth';

interface AuthState {
  user: User | null;
  role: 'admin' | 'user' | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthState>({
  user: null,
  role: null,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthProvider() {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    loading: true,
  });

  useEffect(() => {
    return onAuthChange(async (user) => {
      if (user) {
        const role = await verificarRole(user.uid);
        setState({ user, role, loading: false });
      } else {
        setState({ user: null, role: null, loading: false });
      }
    });
  }, []);

  return state;
}
