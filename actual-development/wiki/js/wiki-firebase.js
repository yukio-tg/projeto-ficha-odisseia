// wiki-firebase.js — Firebase service for the Odisseia Wiki
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import {
    getFirestore,
    collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
    query, where, serverTimestamp, orderBy, limit
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { FIREBASE_CONFIG } from '../../firebase-config.js';

let _app = null, _auth = null, _db = null;

export function initWikiFirebase() {
    if (_app) return;
    _app  = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    _auth = getAuth(_app);
    _db   = getFirestore(_app);
}

export function waitForAuth() {
    return new Promise(resolve => {
        const unsub = onAuthStateChanged(_auth, user => { unsub(); resolve(user); });
    });
}

export function getCurrentUser() { return _auth?.currentUser ?? null; }

/** Checks if uid is in /admins collection */
export async function checkIsAdmin(uid) {
    if (!uid) return false;
    try {
        const snap = await getDoc(doc(_db, 'admins', uid));
        return snap.exists();
    } catch { return false; }
}

/** Lists all wiki docs, optionally filtered by type. Returns sorted: canonical first, then by updatedAt desc. */
export async function listWikiDocs(type = null) {
    try {
        let q = type
            ? query(collection(_db, 'wiki_docs'), where('type', '==', type))
            : query(collection(_db, 'wiki_docs'));
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort: canonical first, then by updatedAt descending
        docs.sort((a, b) => {
            if (a.status === 'canonical' && b.status !== 'canonical') return -1;
            if (b.status === 'canonical' && a.status !== 'canonical') return  1;
            const ta = a.updatedAt?.toMillis?.() ?? 0;
            const tb = b.updatedAt?.toMillis?.() ?? 0;
            return tb - ta;
        });
        return docs;
    } catch (e) {
        console.error('[Wiki] listWikiDocs error:', e);
        return [];
    }
}

/** Gets a single wiki document by ID */
export async function getWikiDoc(id) {
    try {
        const snap = await getDoc(doc(_db, 'wiki_docs', id));
        if (!snap.exists()) return null;
        return { id: snap.id, ...snap.data() };
    } catch (e) {
        console.error('[Wiki] getWikiDoc error:', e);
        return null;
    }
}

/** Gets multiple wiki docs by IDs (for related docs) */
export async function getRelatedDocs(ids) {
    if (!ids?.length) return [];
    const results = await Promise.all(ids.map(id => getWikiDoc(id)));
    return results.filter(Boolean);
}

/** Creates a new wiki document. Returns the new document ID. */
export async function createWikiDoc(data) {
    const ref = await addDoc(collection(_db, 'wiki_docs'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    return ref.id;
}

/** Updates an existing wiki document. */
export async function updateWikiDoc(id, data) {
    await updateDoc(doc(_db, 'wiki_docs', id), {
        ...data,
        updatedAt: serverTimestamp()
    });
}

/** Deletes a wiki document. */
export async function deleteWikiDoc(id) {
    await deleteDoc(doc(_db, 'wiki_docs', id));
}
