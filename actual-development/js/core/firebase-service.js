// core/firebase-service.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import {
    getFirestore,
    doc, collection,
    getDoc, setDoc, updateDoc, deleteDoc,
    query, where, limit, getDocs,
    onSnapshot,
    arrayUnion, arrayRemove,
    serverTimestamp, deleteField
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { FIREBASE_CONFIG } from '../../firebase-config.js';

let app = null;
let auth = null;
let db = null;

export function initFirebase() {
    if (app) return;
    app = initializeApp(FIREBASE_CONFIG);
    auth = getAuth(app);
    db = getFirestore(app);
}

/** Resolve com o User atual (ou null) assim que o estado de auth é conhecido. */
export function waitForAuth() {
    return new Promise((resolve) => {
        const unsub = onAuthStateChanged(auth, (user) => {
            unsub();
            resolve(user);
        });
    });
}

/** Lê o sheetId do parâmetro de URL. */
export function getSheetId() {
    return new URLSearchParams(window.location.search).get('sheetId');
}

/** Carrega o documento COMPLETO de uma ficha (metadados + dados). */
export async function loadSheetDoc(sheetId) {
    const ref = doc(db, 'sheets', sheetId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

/** @deprecated Use loadSheetDoc. Mantido por compatibilidade. */
export async function loadSheetData(sheetId) {
    const snap = await loadSheetDoc(sheetId);
    return snap ? (snap.data || null) : null;
}

/** Salva (merge) os dados de uma ficha no Firestore. Somente para o dono. */
export async function saveSheetData(sheetId, uid, name, data) {
    const ref = doc(db, 'sheets', sheetId);
    await setDoc(ref, {
        owner: uid,
        name: name || 'Sem nome',
        updatedAt: serverTimestamp(),
        data
    }, { merge: true });
}

/** Salva apenas os campos de conteúdo (para editores que não são donos). */
export async function saveSheetDataOnly(sheetId, name, data) {
    const ref = doc(db, 'sheets', sheetId);
    await updateDoc(ref, {
        name: name || 'Sem nome',
        updatedAt: serverTimestamp(),
        data
    });
}

/**
 * Salva o tema de cores da ficha no Firestore (campo separado, sem sobrescrever data).
 * Qualquer usuário com permissão de edição pode alterar o tema.
 * @param {string} sheetId
 * @param {{ fundo: string, metalico: string, pergaminho: string }} theme
 */
export async function saveSheetTheme(sheetId, theme) {
    const ref = doc(db, 'sheets', sheetId);
    // theme === null significa reset: remove o campo do documento
    await updateDoc(ref, { theme: theme ?? deleteField() });
}

/**
 * Lê apenas o campo `theme` de uma ficha já carregada.
 * Recebe o sheetDoc (objeto já obtido via loadSheetDoc) para evitar uma leitura extra.
 * @param {{ theme?: object }} sheetDoc
 * @returns {{ fundo: string, metalico: string, pergaminho: string } | null}
 */
export function extractSheetTheme(sheetDoc) {
    return sheetDoc?.theme ?? null;
}

// ── Perfil de usuário ────────────────────────────────────────────────────────

/** Cria ou atualiza o perfil do usuário (chamado após login/cadastro). */
export async function ensureUserDoc(uid, email) {
    const ref = doc(db, 'users', uid);
    await setDoc(ref, { email: (email || '').trim().toLowerCase() }, { merge: true });
}

/** Retorna o perfil do usuário ou null. */
export async function getUserDoc(uid) {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
}

/** Busca um usuário pelo email (case-insensitive via normalização no cliente).
 *  Retorna { uid, email } ou null se não encontrado.
 *  Lança erro descritivo se a query falhar. */
export async function getUserByEmail(email) {
    const normalized = email.trim().toLowerCase();
    const colRef = collection(db, 'users');
    try {
        // Busca pela versão normalizada armazenada
        const q = query(colRef, where('email', '==', normalized), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
            const d = snap.docs[0];
            return { uid: d.id, email: d.data().email };
        }
        // Fallback: busca pelo email sem normalização (contas criadas antes da padronização)
        const q2 = query(colRef, where('email', '==', email.trim()), limit(1));
        const snap2 = await getDocs(q2);
        if (!snap2.empty) {
            const d = snap2.docs[0];
            return { uid: d.id, email: d.data().email };
        }
        return null;
    } catch (err) {
        console.error('[Firebase] getUserByEmail error:', err);
        if (err.code === 'permission-denied') {
            throw new Error('Sem permissão para buscar usuários. Verifique as regras do Firestore.');
        }
        if (err.message && err.message.includes('requires an index')) {
            throw new Error('Índice de busca não configurado. Contate o administrador do sistema.');
        }
        throw new Error(`Falha ao buscar usuário: ${err.message || err.code || 'erro desconhecido'}`);
    }
}

/** Adiciona um sheetId à lista de fichas compartilhadas do usuário (idempotente). */
export async function addToUserSharedSheets(uid, sheetId) {
    const ref = doc(db, 'users', uid);
    await setDoc(ref, { sharedSheetIds: arrayUnion(sheetId) }, { merge: true });
}

/** Remove um sheetId da lista de fichas compartilhadas do usuário. */
export async function removeFromUserSharedSheets(uid, sheetId) {
    const ref = doc(db, 'users', uid);
    await updateDoc(ref, { sharedSheetIds: arrayRemove(sheetId) });
}

// ── Compartilhamento ─────────────────────────────────────────────────────────

/** Atualiza metadados de compartilhamento de uma ficha (exclusivo do dono). */
export async function updateSheetSharing(sheetId, updates) {
    const ref = doc(db, 'sheets', sheetId);
    await updateDoc(ref, updates);
}

/**
 * Transfere a propriedade de uma ficha para outro usuário.
 * O dono atual é adicionado como colaborador com permissão de edição.
 * @param {string} sheetId
 * @param {string} newOwnerUid
 * @param {string} newOwnerEmail
 * @param {{ uid: string, email: string }} oldOwner
 */
export async function transferSheetOwnership(sheetId, newOwnerUid, newOwnerEmail, oldOwner) {
    const ref = doc(db, 'sheets', sheetId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Ficha não encontrada.');

    const sheetData = snap.data();
    let sharedWith = [...(sheetData.sharedWith || [])];

    // Remove o novo dono da lista de compartilhados (ele passa a ser dono)
    sharedWith = sharedWith.filter(s => s.uid !== newOwnerUid);

    // Adiciona o dono anterior como colaborador com edição (se ainda não estiver)
    if (!sharedWith.some(s => s.uid === oldOwner.uid)) {
        sharedWith.push({ uid: oldOwner.uid, email: (oldOwner.email || '').toLowerCase(), permission: 'edit' });
    }

    const sharedUids = sharedWith.map(s => s.uid);
    const sharedUidsEdit = sharedWith.filter(s => s.permission === 'edit').map(s => s.uid);

    await updateDoc(ref, {
        owner: newOwnerUid,
        ownerEmail: newOwnerEmail,
        sharedWith,
        sharedUids,
        sharedUidsEdit,
        updatedAt: serverTimestamp()
    });

    // Dono anterior entra na lista de fichas compartilhadas
    await addToUserSharedSheets(oldOwner.uid, sheetId);
    // Novo dono sai da lista de fichas compartilhadas (agora é dono)
    await removeFromUserSharedSheets(newOwnerUid, sheetId);
}

// ── Realtime ─────────────────────────────────────────────────────────────────

/**
 * Escuta mudanças em tempo real na ficha.
 * Retorna a função de cancelamento (unsubscribe).
 */
export function listenToSheet(sheetId, callback, onError) {
    const ref = doc(db, 'sheets', sheetId);
    return onSnapshot(ref, { includeMetadataChanges: true }, callback, onError || (() => {}));
}

// ── Presença ─────────────────────────────────────────────────────────────────

/** Registra ou atualiza a presença do usuário na ficha. */
export async function updatePresence(sheetId, uid, email) {
    const ref = doc(db, 'sheets', sheetId, 'presence', uid);
    await setDoc(ref, { email, lastSeen: serverTimestamp() }, { merge: true });
}

/** Remove a presença do usuário (ao sair da página). */
export async function deletePresence(sheetId, uid) {
    try {
        const ref = doc(db, 'sheets', sheetId, 'presence', uid);
        await deleteDoc(ref);
    } catch { /* best-effort */ }
}

/** Escuta a subcoleção de presença em tempo real. Retorna unsubscribe. */
export function listenToPresence(sheetId, callback) {
    const colRef = collection(db, 'sheets', sheetId, 'presence');
    return onSnapshot(colRef, callback, () => {});
}

export function getAuth_() { return auth; }
export function getDb_() { return db; }
