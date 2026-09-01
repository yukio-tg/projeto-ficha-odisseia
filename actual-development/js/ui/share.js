// ui/share.js — Popup de gerenciamento de compartilhamento de fichas

import {
    getUserByEmail,
    updateSheetSharing,
    addToUserSharedSheets,
    removeFromUserSharedSheets,
    transferSheetOwnership
} from '../core/firebase-service.js';

// Estado local do popup
let _sheetId = null;
let _user = null;
let _sharedWith = [];
let _isPublic = false;
let _publicPermission = 'read';

/**
 * Inicializa o popup de compartilhamento.
 * Deve ser chamado apenas para o dono da ficha.
 */
export function initSharePopup(sheetId, user, sheetDoc) {
    _sheetId = sheetId;
    _user = user;
    _sharedWith = sheetDoc.sharedWith ? [...sheetDoc.sharedWith] : [];
    _isPublic = sheetDoc.isPublic || false;
    _publicPermission = sheetDoc.publicPermission || 'read';

    document.getElementById('share-btn')
        ?.addEventListener('click', openSharePopup);

    document.getElementById('share-close-btn')
        ?.addEventListener('click', closeSharePopup);

    document.getElementById('share-overlay')
        ?.addEventListener('click', (e) => {
            if (e.target.id === 'share-overlay') closeSharePopup();
        });

    document.getElementById('share-public-toggle')
        ?.addEventListener('change', handlePublicToggle);

    document.getElementById('share-public-permission')
        ?.addEventListener('change', handlePublicPermissionChange);

    document.getElementById('share-add-btn')
        ?.addEventListener('click', handleAddUser);

    document.getElementById('copy-link-btn')
        ?.addEventListener('click', handleCopyLink);

    document.getElementById('share-transfer-btn')
        ?.addEventListener('click', handleTransferOwnership);
}

function openSharePopup() {
    renderSharePopup();
    document.getElementById('share-overlay').style.display = 'flex';
    document.getElementById('share-email-input').focus();
}

function closeSharePopup() {
    document.getElementById('share-overlay').style.display = 'none';
    document.getElementById('share-add-status').textContent = '';
}

function renderSharePopup() {
    // --- Toggle público ---
    const toggle = document.getElementById('share-public-toggle');
    toggle.checked = _isPublic;
    const publicOptions = document.getElementById('share-public-options');
    const linkRow = document.getElementById('share-link-row');

    if (_isPublic) {
        publicOptions.style.display = 'flex';
        linkRow.style.display = 'flex';
        document.getElementById('share-public-permission').value = _publicPermission;
        const origin = window.location.origin;
        document.getElementById('share-link-text').textContent =
            `${origin}/ficha.html?sheetId=${_sheetId}`;
    } else {
        publicOptions.style.display = 'none';
        linkRow.style.display = 'none';
    }

    // --- Lista de usuários com acesso ---
    const list = document.getElementById('share-users-list');
    list.innerHTML = '';

    if (_sharedWith.length === 0) {
        list.innerHTML = '<span class="share-no-users">Nenhuma pessoa adicionada ainda.</span>';
    } else {
        _sharedWith.forEach(entry => {
            const row = document.createElement('div');
            row.className = 'share-user-row';

            const iconSpan = document.createElement('span');
            iconSpan.className = 'share-user-icon material-symbols-outlined';
            iconSpan.textContent = entry.permission === 'edit' ? 'edit' : 'visibility';
            iconSpan.title = entry.permission === 'edit' ? 'Edição' : 'Leitura';

            const emailSpan = document.createElement('span');
            emailSpan.className = 'share-user-email';
            emailSpan.textContent = entry.email;

            const permSel = document.createElement('select');
            permSel.className = 'share-user-perm-select';
            permSel.dataset.uid = entry.uid;
            permSel.innerHTML = `
                <option value="read"  ${entry.permission === 'read'  ? 'selected' : ''}>Leitura</option>
                <option value="edit"  ${entry.permission === 'edit'  ? 'selected' : ''}>Edição</option>
            `;
            permSel.addEventListener('change', (e) =>
                handlePermissionChange(entry.uid, e.target.value));

            const removeBtn = document.createElement('button');
            removeBtn.className = 'share-remove-btn';
            removeBtn.title = 'Remover acesso';
            removeBtn.innerHTML = '<span class="material-symbols-outlined">person_remove</span>';
            removeBtn.addEventListener('click', () =>
                handleRemoveUser(entry.uid, entry.email));

            row.appendChild(iconSpan);
            row.appendChild(emailSpan);
            row.appendChild(permSel);
            row.appendChild(removeBtn);
            list.appendChild(row);
        });
    }

    // Limpa mensagem de status
    document.getElementById('share-add-status').textContent = '';
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handlePublicToggle(e) {
    const isPublic = e.target.checked;
    try {
        await updateSheetSharing(_sheetId, { isPublic, publicPermission: _publicPermission });
        _isPublic = isPublic;
        renderSharePopup();
    } catch (err) {
        console.error('[Share] Erro ao alterar visibilidade:', err);
        e.target.checked = !isPublic; // reverte toggle visual
    }
}

async function handlePublicPermissionChange(e) {
    const perm = e.target.value;
    try {
        await updateSheetSharing(_sheetId, { publicPermission: perm });
        _publicPermission = perm;
    } catch (err) {
        console.error('[Share] Erro ao alterar permissão pública:', err);
    }
}

async function handleAddUser() {
    const emailInput = document.getElementById('share-email-input');
    const permSelect = document.getElementById('share-perm-select');
    const status = document.getElementById('share-add-status');

    const email = emailInput.value.trim().toLowerCase();
    const permission = permSelect.value;

    status.className = 'share-status-msg';
    if (!email) { status.textContent = 'Digite um e-mail.'; return; }

    if (email === (_user.email || '').toLowerCase()) {
        status.textContent = 'Você já é o dono desta ficha.';
        return;
    }
    if (_sharedWith.some(s => s.email.toLowerCase() === email)) {
        status.textContent = 'Este usuário já tem acesso.';
        return;
    }

    status.textContent = 'Buscando usuário…';
    document.getElementById('share-add-btn').disabled = true;

    try {
        const found = await getUserByEmail(email);
        if (!found) {
            status.textContent =
                'Usuário não encontrado. O usuário precisa ter acessado o site pelo menos uma vez.';
            return;
        }

        const newEntry = { uid: found.uid, email: found.email, permission };
        const newSharedWith = [..._sharedWith, newEntry];
        const newSharedUids = newSharedWith.map(s => s.uid);
        const newSharedUidsEdit = newSharedWith.filter(s => s.permission === 'edit').map(s => s.uid);

        await updateSheetSharing(_sheetId, {
            sharedWith: newSharedWith,
            sharedUids: newSharedUids,
            sharedUidsEdit: newSharedUidsEdit
        });
        await addToUserSharedSheets(found.uid, _sheetId);

        _sharedWith = newSharedWith;
        emailInput.value = '';
        status.className = 'share-status-msg share-status-ok';
        status.textContent = `${found.email} adicionado com acesso de ${permission === 'edit' ? 'edição' : 'leitura'}.`;
        renderSharePopup();
    } catch (err) {
        console.error('[Share] Erro ao adicionar:', err);
        const msg = err?.message || '';
        if (msg.includes('permissão') || msg.includes('permission')) {
            status.textContent = 'Sem permissão para realizar esta operação.';
        } else if (msg.includes('índice') || msg.includes('index')) {
            status.textContent = 'Erro de configuração do servidor. Contate o suporte.';
        } else if (msg.includes('Falha ao buscar')) {
            status.textContent = `Não foi possível verificar o e-mail. ${msg}`;
        } else {
            status.textContent = `Erro: ${msg || 'Tente novamente em instantes.'}`;
        }
    } finally {
        document.getElementById('share-add-btn').disabled = false;
    }
}

async function handlePermissionChange(uid, newPermission) {
    const updated = _sharedWith.map(s =>
        s.uid === uid ? { ...s, permission: newPermission } : s
    );
    const newSharedUids = updated.map(s => s.uid);
    const newSharedUidsEdit = updated.filter(s => s.permission === 'edit').map(s => s.uid);

    try {
        await updateSheetSharing(_sheetId, {
            sharedWith: updated,
            sharedUids: newSharedUids,
            sharedUidsEdit: newSharedUidsEdit
        });
        _sharedWith = updated;
        renderSharePopup();
    } catch (err) {
        console.error('[Share] Erro ao alterar permissão:', err);
    }
}

async function handleRemoveUser(uid, email) {
    if (!confirm(`Remover o acesso de ${email}?`)) return;
    const updated = _sharedWith.filter(s => s.uid !== uid);
    const newSharedUids = updated.map(s => s.uid);
    const newSharedUidsEdit = updated.filter(s => s.permission === 'edit').map(s => s.uid);

    try {
        await updateSheetSharing(_sheetId, {
            sharedWith: updated,
            sharedUids: newSharedUids,
            sharedUidsEdit: newSharedUidsEdit
        });
        await removeFromUserSharedSheets(uid, _sheetId);
        _sharedWith = updated;
        renderSharePopup();
    } catch (err) {
        console.error('[Share] Erro ao remover:', err);
    }
}

async function handleTransferOwnership() {
    const emailInput = document.getElementById('share-transfer-email');
    const status = document.getElementById('share-transfer-status');
    const btn = document.getElementById('share-transfer-btn');

    const email = emailInput.value.trim().toLowerCase();
    status.className = 'share-status-msg';

    if (!email) { status.textContent = 'Digite o e-mail do novo dono.'; return; }
    if (email === (_user.email || '').toLowerCase()) {
        status.textContent = 'Você já é o dono desta ficha.';
        return;
    }

    const confirmado = confirm(
        `Transferir a propriedade desta ficha para "${email}"?\n\nVocê passará a ser colaborador com permissão de edição. Esta ação não pode ser desfeita facilmente.`
    );
    if (!confirmado) return;

    status.textContent = 'Buscando usuário…';
    btn.disabled = true;

    try {
        const found = await getUserByEmail(email);
        if (!found) {
            status.textContent = 'Usuário não encontrado. O usuário precisa ter acessado o site pelo menos uma vez.';
            return;
        }

        await transferSheetOwnership(_sheetId, found.uid, found.email, {
            uid: _user.uid,
            email: _user.email
        });

        status.className = 'share-status-msg share-status-ok';
        status.textContent = 'Propriedade transferida com sucesso! Recarregando…';
        setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
        console.error('[Share] Erro ao transferir propriedade:', err);
        status.textContent = 'Erro ao transferir. Tente novamente.';
    } finally {
        btn.disabled = false;
    }
}

function handleCopyLink() {
    const link = `${window.location.origin}/ficha.html?sheetId=${_sheetId}`;
    const btn = document.getElementById('copy-link-btn');
    navigator.clipboard.writeText(link).then(() => {
        btn.innerHTML = '<span class="material-symbols-outlined">check</span> Copiado!';
        setTimeout(() => {
            btn.innerHTML = '<span class="material-symbols-outlined">content_copy</span> Copiar link';
        }, 2000);
    }).catch(() => {
        // Fallback para browsers que bloqueiam clipboard
        prompt('Copie o link:', link);
    });
}
