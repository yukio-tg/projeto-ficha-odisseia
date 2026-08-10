// core/firebase-service.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

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

/** Carrega os dados de uma ficha do Firestore. Retorna `null` se não existir. */
export async function loadSheetData(sheetId) {
    const ref = doc(db, 'sheets', sheetId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data().data || null;
}

/** Salva (merge) os dados de uma ficha no Firestore. */
export async function saveSheetData(sheetId, uid, name, data) {
    const ref = doc(db, 'sheets', sheetId);
    await setDoc(ref, {
        owner: uid,
        name: name || 'Sem nome',
        updatedAt: serverTimestamp(),
        data
    }, { merge: true });
}

export function getAuth_() { return auth; }
