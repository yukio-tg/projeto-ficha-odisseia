// wiki-auth.js — Authentication helpers for the wiki
import { initWikiFirebase, waitForAuth, checkIsAdmin } from './wiki-firebase.js';

let _authState = null; // { user, isAdmin } — cached after first resolution

/**
 * Resolves and caches the current auth state.
 * Returns { user: User|null, isAdmin: boolean }
 */
export async function getAuthState() {
    if (_authState) return _authState;
    initWikiFirebase();
    const user  = await waitForAuth();
    const admin = user ? await checkIsAdmin(user.uid) : false;
    _authState  = { user, isAdmin: admin };
    return _authState;
}

/**
 * Redirects to the given URL if the user is not authenticated.
 * Returns the user if authenticated, null otherwise.
 */
export async function requireAuth(redirectUrl = '/index.html') {
    const { user } = await getAuthState();
    if (!user) {
        window.location.href = redirectUrl;
        return null;
    }
    return user;
}

/** Renders a compact user chip (name/email + logout) into the given element. */
export function renderUserArea(container, user, onLogout) {
    if (!container) return;
    if (!user) {
        container.innerHTML = `<a href="/index.html" class="wiki-login-link">Entrar</a>`;
        return;
    }
    const label = user.email?.split('@')[0] || 'Usuário';
    container.innerHTML = `
        <span class="wiki-user-chip">
            <span class="material-symbols-outlined" style="font-size:16px">person</span>
            ${escapeHtml(label)}
        </span>
        <button class="wiki-btn wiki-btn-secondary" id="wiki-logout-btn" style="font-size:10px;padding:5px 10px">Sair</button>
    `;
    container.querySelector('#wiki-logout-btn')?.addEventListener('click', onLogout);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    )[m]);
}
