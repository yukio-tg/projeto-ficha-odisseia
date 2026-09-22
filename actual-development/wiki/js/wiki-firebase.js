// wiki-firebase.js — Firebase service for the Odisseia Wiki
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import {
    getFirestore,
    collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, setDoc,
    query, where, serverTimestamp, orderBy, limit, increment
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

/** Lists all wiki docs, optionally filtered by type. Sorted: canonical first, then updatedAt desc. */
export async function listWikiDocs(type = null) {
    try {
        let q = type
            ? query(collection(_db, 'wiki_docs'), where('type', '==', type))
            : query(collection(_db, 'wiki_docs'));
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

/** Gets a single wiki document by ID. */
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

/** Finds a wiki document by exact title. Returns the first match or null. */
export async function getDocByTitle(title) {
    if (!title?.trim()) return null;
    try {
        const q = query(collection(_db, 'wiki_docs'), where('title', '==', title.trim()), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        const d = snap.docs[0];
        return { id: d.id, ...d.data() };
    } catch (e) {
        console.error('[Wiki] getDocByTitle error:', e);
        return null;
    }
}

/**
 * Checks if a document with the given title already exists.
 * @param {string} title
 * @param {string|null} excludeId — if editing, exclude this document's own ID
 */
export async function titleExists(title, excludeId = null) {
    if (!title?.trim()) return false;
    try {
        const q = query(collection(_db, 'wiki_docs'), where('title', '==', title.trim()), limit(2));
        const snap = await getDocs(q);
        if (snap.empty) return false;
        if (!excludeId) return true;
        // Allow if the only match is the document being edited
        return snap.docs.some(d => d.id !== excludeId);
    } catch (e) {
        console.error('[Wiki] titleExists error:', e);
        return false;
    }
}

/** Gets multiple wiki docs by IDs (for related docs / wiki-links). */
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

// ── wiki_tags collection ──────────────────────────────────────────────────────

/** Returns all tag suggestions for a given category ("tipo" or "regiao"). */
export async function getTagSuggestions(category) {
    try {
        const q = query(collection(_db, 'wiki_tags'), where('category', '==', category));
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data().name).filter(Boolean).sort();
    } catch (e) {
        console.error('[Wiki] getTagSuggestions error:', e);
        return [];
    }
}

/**
 * Registers a tag in the wiki_tags collection (upsert with count).
 * @param {string} name — display name (e.g. "Dragão")
 * @param {'tipo'|'regiao'} category
 */
export async function registerTag(name, category) {
    if (!name?.trim()) return;
    const slug = name.trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (!slug) return;
    try {
        const ref = doc(_db, 'wiki_tags', `${category}-${slug}`);
        await setDoc(ref, { name: name.trim(), category, count: increment(1) }, { merge: true });
    } catch (e) {
        console.error('[Wiki] registerTag error:', e);
    }
}

/** Registers multiple tags at once. */
export async function registerTags(names, category) {
    await Promise.all((names || []).map(n => registerTag(n, category)));
}
