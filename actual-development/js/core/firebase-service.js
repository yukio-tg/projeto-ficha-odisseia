// core/firebase-service.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import {
    getFirestore,
    doc, getDoc, setDoc, updateDoc,
    collection, query, where, limit, getDocs,
    arrayUnion, arrayRemove,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyD0GKHekJIBroBaQbbKIagcaZ52ljsgT6A",
    authDomain: "fichas-odisseia.firebaseapp.com",
    projectId: "fichas-odisseia",
    storageBucket: "fichas-odisseia.firebasestorage.app",
    messagingSenderId: "438632062292",
    appId: "1:438632062292:web:68e9584cf8f5ffcf2e3cc1"
};

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

// ── Perfil de usuário ────────────────────────────────────────────────────────

/** Cria ou atualiza o perfil do usuário (chamado após login/cadastro). */
export async function ensureUserDoc(uid, email) {
    const ref = doc(db, 'users', uid);
    await setDoc(ref, { email }, { merge: true });
}

/** Retorna o perfil do usuário ou null. */
export async function getUserDoc(uid) {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
}

/** Busca um usuário pelo email. Retorna { uid, email } ou null. */
export async function getUserByEmail(email) {
    const colRef = collection(db, 'users');
    const q = query(colRef, where('email', '==', email), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { uid: d.id, email: d.data().email };
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

export function getAuth_() { return auth; }
export function getDb_() { return db; }
