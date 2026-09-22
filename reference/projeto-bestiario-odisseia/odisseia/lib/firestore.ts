import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { Colecao, EntidadeComColecao } from './types';

export async function listarEntidades(col: Colecao, cursor?: DocumentSnapshot) {
  let q = query(
    collection(db, col),
    where('meta.publicado', '==', true),
    orderBy('nome'),
    limit(50)
  );
  if (cursor) q = query(q, startAfter(cursor));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function listarTodasEntidades(col: Colecao) {
  const q = query(collection(db, col), orderBy('nome'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function buscarEntidade(col: Colecao, id: string) {
  const snap = await getDoc(doc(db, col, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function buscarPorNome(termo: string): Promise<EntidadeComColecao[]> {
  const colecoes: Colecao[] = ['criaturas', 'espacos', 'personagens'];
  const termoLower = termo.toLowerCase();
  const resultados = await Promise.all(
    colecoes.map(async col => {
      const todos = await listarEntidades(col);
      return todos
        .filter(e => (e as any).nome?.toLowerCase().includes(termoLower))
        .map(e => ({ ...e, _colecao: col } as EntidadeComColecao));
    })
  );
  return resultados.flat();
}

export async function criarEntidade(col: Colecao, dados: Record<string, any>) {
  const docData = {
    ...dados,
    meta: {
      ...dados.meta,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      versao: 1,
      publicado: dados.meta?.publicado ?? true,
    },
  };
  return addDoc(collection(db, col), docData);
}

export async function atualizarEntidade(col: Colecao, id: string, dados: Record<string, any>) {
  const docRef = doc(db, col, id);
  return updateDoc(docRef, {
    ...dados,
    'meta.atualizadoEm': new Date().toISOString(),
    'meta.versao': increment(1),
  });
}

export async function deletarEntidade(col: Colecao, id: string) {
  return deleteDoc(doc(db, col, id));
}
