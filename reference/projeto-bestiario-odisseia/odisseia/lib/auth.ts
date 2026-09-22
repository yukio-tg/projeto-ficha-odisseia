import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export async function login(email: string, senha: string) {
  return signInWithEmailAndPassword(auth, email, senha);
}

export async function logout() {
  return firebaseSignOut(auth);
}

export async function verificarRole(uid: string): Promise<'admin' | 'user'> {
  try {
    const snap = await getDoc(doc(db, 'usuarios', uid));
    if (snap.exists()) {
      const data = snap.data();
      console.log('Documento encontrado. Conteúdo completo:', JSON.stringify(data, null, 2));
      console.log('Role value:', data.role, 'Type:', typeof data.role);
      return data.role === 'admin' ? 'admin' : 'user';
    }
    console.log('Documento não encontrado para UID:', uid);
    return 'user';
  } catch (error) {
    console.error('Erro ao verificar role:', error);
    return 'user';
  }
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
