import './config/classes.js';
import './config/herancas.js';
import { initRadar } from './core/radar-service.js';
import { initAutocomplete } from './ui/autocomplete.js';
import { initBars } from './ui/vitals.js';
import { initPortrait, applyPortraitUrl } from './ui/portrait.js';
import { initSkills, atualizarPericias, setAfterSkillsUpdate } from './ui/skills.js';
import { initTabs } from './ui/tabs.js';
import { initHeaderSync, refreshHeader, updateAuthHeader, updateOwnerHeader } from './ui/header.js';
import { initCombat, atualizarAcoesPorNivel, atualizarAvisoReacoes, atualizarAtaquesAcerto, popularReacoesPreset } from './ui/combat.js';
import { initHerancaToggle } from './ui/heranca-toggle.js';
import { atualizarHeranca } from './core/heranca-logic.js';
import { autoCalcEnabled, setAutoCalcEnabled } from './core/state.js';
import { atualizarInertidao, calcStats, updateVisibilityByLevel, updateFeVisibility } from './core/calculation.js';
import { initPowers } from './ui/powers.js';
import { initMagias } from './ui/magias.js';
import { initInventory } from './ui/inventory.js';
import { initItemEffects } from './core/item-effects.js';
import { initBesta } from './ui/besta.js';
import { initAnotacoes } from './ui/anotacoes.js';
import {
    initFirebase, waitForAuth, getSheetId,
    loadSheetDoc, saveSheetData, saveSheetDataOnly,
    ensureUserDoc, addToUserSharedSheets,
    listenToSheet, listenToPresence, updatePresence, deletePresence
} from './core/firebase-service.js';
import { serializeSheet, deserializeSheet } from './core/sheet-serializer.js';
import { initSharePopup } from './ui/share.js';

// ── Estado global ────────────────────────────────────────────────────────────
let suppressSave = false;
let saveTimer = null;
let currentUser = null;
let currentSheetId = null;
let currentPermission = null; // 'owner' | 'edit' | 'read'

// Controle de realtime
let snapshotUnsubscribe = null;
let presenceUnsubscribe = null;
let presenceInterval = null;
let initialSnapshotDone = false; // ignora o primeiro disparo do onSnapshot

// ── Indicadores de save ──────────────────────────────────────────────────────

function showSaved() {
    document.getElementById('saved')?.style.setProperty('display', 'flex');
    document.getElementById('non-saved')?.style.setProperty('display', 'none');
    document.getElementById('problem-save')?.style.setProperty('display', 'none');
}

function showNonSaved() {
    document.getElementById('saved')?.style.setProperty('display', 'none');
    document.getElementById('non-saved')?.style.setProperty('display', 'flex');
    document.getElementById('problem-save')?.style.setProperty('display', 'none');
}

function showError(msg) {
    const el = document.getElementById('problem-save');
    if (el) {
        el.style.display = 'flex';
        const logEl = el.querySelector('.save-error-msg');
        if (logEl) logEl.textContent = msg || 'Erro desconhecido';
    }
    document.getElementById('saved')?.style.setProperty('display', 'none');
    document.getElementById('non-saved')?.style.setProperty('display', 'none');
}

async function performSave() {
    if (!currentUser || !currentSheetId) return;
    try {
        const data = serializeSheet();
        const name = data.fields?.['personagem-nome'] || 'Sem nome';
        if (currentPermission === 'owner') {
            await saveSheetData(currentSheetId, currentUser.uid, name, data);
        } else {
            await saveSheetDataOnly(currentSheetId, name, data);
        }
        showSaved();
    } catch (e) {
        console.error('[Save] Erro ao salvar:', e);
        if (e.code === 'permission-denied') {
            showError('Seu acesso a esta ficha foi revogado.');
        } else {
            showError(e.message);
        }
    }
}

function triggerAutoSave() {
    if (suppressSave) return;
    showNonSaved();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        saveTimer = null;
        performSave();
    }, 1500);
}

// ── Lógica de permissão ──────────────────────────────────────────────────────

function resolvePermission(sheetDoc, uid) {
    if (sheetDoc.owner === uid) return 'owner';
    const match = (sheetDoc.sharedWith || []).find(s => s.uid === uid);
    if (match) return match.permission; // 'read' ou 'edit'
    if (sheetDoc.isPublic) return sheetDoc.publicPermission || 'read';
    return null;
}

/**
 * Aplica o modo de leitura: bloqueia toda interação no conteúdo da ficha
 * via CSS pointer-events, impede qualquer save, e exibe o banner de leitura.
 * Botões .btn-summarize, .btn-magic-minimize e .besta-collapse-toggle
 * continuam funcionando (ver share.css).
 */
function applyReadOnlyMode(ownerEmail) {
    suppressSave = true;
    document.body.classList.add('mode-readonly');

    // Desabilita o editor de anotações (contenteditable não é bloqueado por pointer-events)
    const anotEditor = document.getElementById('anot-editor');
    if (anotEditor) anotEditor.contentEditable = 'false';

    // Oculta controles de edição no header
    document.getElementById('manual-save')?.closest('.header-save')?.style.setProperty('display', 'none');
    document.getElementById('autocalc-switch')?.closest('.header-autocalc')?.style.setProperty('display', 'none');
    document.getElementById('share-btn-wrapper')?.style.setProperty('display', 'none');

    // Exibe banner de leitura
    const banner = document.getElementById('readonly-banner');
    if (banner) {
        banner.style.display = 'flex';
        const emailEl = document.getElementById('owner-email-banner');
        if (emailEl) emailEl.textContent = ownerEmail;
    }

    // Remove indicadores de save (irrelevantes em leitura)
    document.getElementById('saved')?.style.setProperty('display', 'none');
}

// ── Realtime sync ─────────────────────────────────────────────────────────────

/**
 * Configura o listener de sincronização em tempo real.
 * - Leitores: aplicam sempre (sem edições locais)
 * - Editores/donos: aplicam apenas quando não há alterações locais pendentes
 */
function setupRealtimeSync(sheetId) {
    snapshotUnsubscribe = listenToSheet(
        sheetId,
        (snap) => {
            // Ignora o primeiro disparo (dados já carregados manualmente)
            if (!initialSnapshotDone) {
                initialSnapshotDone = true;
                return;
            }
            if (!snap.exists()) return;

            // Ignora snapshots com escrita local pendente (nosso próprio dado sendo refletido)
            if (snap.metadata.hasPendingWrites) return;

            // Para editores/donos: aguarda não haver salvamento local em curso
            if (currentPermission !== 'read' && saveTimer !== null) return;

            const remoteData = snap.data()?.data;
            if (!remoteData) return;

            // Aplica dados remotos sem disparar autosave
            suppressSave = true;
            try {
                deserializeSheet(remoteData);
                refreshHeader();
                applyPortraitUrl(remoteData?.fields?.['retrato-url'] || '');
                if (currentPermission !== 'read') showSaved();
            } finally {
                // setTimeout garante que eventos síncronos do deserialize sejam
                // absorvidos antes de reativar o autosave
                setTimeout(() => { suppressSave = false; }, 50);
            }
        },
        (err) => {
            console.error('[Realtime] Listener error:', err);
            if (err.code === 'permission-denied') {
                showError('Acesso revogado. Recarregue a página.');
            }
        }
    );
}

// ── Presença ──────────────────────────────────────────────────────────────────

const PRESENCE_HEARTBEAT_MS = 30_000; // 30s de heartbeat
const PRESENCE_TTL_MS       = 70_000; // considera offline após 70s sem heartbeat

function setupPresence(sheetId, user) {
    // Registra presença inicial
    updatePresence(sheetId, user.uid, user.email).catch(() => {});

    // Heartbeat periódico
    presenceInterval = setInterval(
        () => updatePresence(sheetId, user.uid, user.email).catch(() => {}),
        PRESENCE_HEARTBEAT_MS
    );

    // Escuta outros usuários presentes
    presenceUnsubscribe = listenToPresence(sheetId, (snap) => {
        const now = Date.now();
        const others = [];
        snap.forEach(d => {
            if (d.id === user.uid) return; // pula o próprio usuário
            const lastSeen = d.data().lastSeen?.toMillis?.() ?? 0;
            if (now - lastSeen < PRESENCE_TTL_MS) {
                others.push(d.data().email || d.id);
            }
        });
        renderPresenceIndicator(others);
    });

    // Limpa presença ao fechar a página (best-effort)
    window.addEventListener('beforeunload', () => {
        clearInterval(presenceInterval);
        if (presenceUnsubscribe) presenceUnsubscribe();
        // Tenta remover presença de forma síncrona (sendBeacon seria ideal, mas
        // deleteDoc é assíncrono; na prática, o TTL resolve em ~70s)
        deletePresence(sheetId, user.uid).catch(() => {});
    });
}

function renderPresenceIndicator(emails) {
    const indicator = document.getElementById('presence-indicator');
    const list = document.getElementById('presence-list');
    if (!indicator || !list) return;

    if (emails.length === 0) {
        indicator.style.display = 'none';
        return;
    }

    const MAX_SHOW = 2;
    let text = emails.slice(0, MAX_SHOW).join(', ');
    if (emails.length > MAX_SHOW) text += ` +${emails.length - MAX_SHOW}`;
    list.textContent = text;
    indicator.style.display = 'flex';
}

// ── Inicialização dos módulos ────────────────────────────────────────────────

async function initAllModules() {
    initRadar('secao-radar');
    initAutocomplete();
    initBars();
    initPortrait();
    initSkills();
    setAfterSkillsUpdate(() => {
        atualizarAtaquesAcerto(true);
        document.dispatchEvent(new Event('reacoes:atualizar-stats'));
    });
    initTabs();
    initHeaderSync();
    initCombat();
    popularReacoesPreset();
    initHerancaToggle();
    initItemEffects();
    await Promise.all([initPowers(), initMagias(), initInventory(), initBesta()]);
    initAnotacoes();
}

function wireCalculations() {
    setTimeout(() => {
        const levelInput = document.querySelector('#secao-radar .level-input');
        if (levelInput) {
            levelInput.addEventListener('input', () => {
                if (autoCalcEnabled) {
                    atualizarInertidao();
                    atualizarHeranca();
                    updateVisibilityByLevel();
                    calcStats();
                    atualizarAcoesPorNivel();
                    atualizarAvisoReacoes();
                    document.dispatchEvent(new Event('reacoes:atualizar-stats'));
                }
            });
        }

        const alinhamentoInput = document.querySelector('[data-field="alinhamento-nome"]');
        if (alinhamentoInput) {
            alinhamentoInput.addEventListener('input', () => { if (autoCalcEnabled) updateFeVisibility(); });
            alinhamentoInput.addEventListener('change', () => { if (autoCalcEnabled) updateFeVisibility(); });
        }

        document.querySelector('#secao-radar')?.addEventListener('input', (e) => {
            if (e.target.classList.contains('attr-input') || e.target.classList.contains('mod-input')) {
                document.dispatchEvent(new Event('reacoes:atualizar-stats'));
            }
        });

        const herancaInput = document.querySelector('[data-field="heranca-nome"]');
        if (herancaInput) {
            herancaInput.addEventListener('input', atualizarHeranca);
            herancaInput.addEventListener('change', atualizarHeranca);
        }

        [
            document.querySelector('[data-field="aumentoDeFortuna"]'),
            document.querySelector('[data-field="aprendizadoDaVida"]'),
            document.querySelector('[data-field="habilidadeAdquirida"]')
        ].forEach(cb => cb?.addEventListener('change', atualizarHeranca));

        document.querySelector('[data-field="monstro"]')?.addEventListener('change', () => {
            if (autoCalcEnabled) calcStats();
        });

        document.querySelector('[data-field="tamanho"]')?.addEventListener('change', () => {
            if (autoCalcEnabled) atualizarInertidao();
        });

        const classeInput = document.querySelector('[data-field="classe-nome"]');
        if (classeInput) {
            classeInput.addEventListener('input', () => {
                if (autoCalcEnabled) { atualizarHeranca(); calcStats(); atualizarAcoesPorNivel(); atualizarAvisoReacoes(); }
            });
            classeInput.addEventListener('change', () => { if (autoCalcEnabled) calcStats(); });
        }

        atualizarInertidao();
        atualizarHeranca();
        updateVisibilityByLevel();
        calcStats();
        updateFeVisibility();
        atualizarAcoesPorNivel();
        atualizarAvisoReacoes();
        atualizarAtaquesAcerto(false);
    }, 600);
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    initFirebase();

    const user = await waitForAuth();
    if (!user) {
        window.location.href = '/index.html';
        return;
    }
    currentUser = user;

    // Garante que o perfil do usuário existe com o email normalizado
    ensureUserDoc(user.uid, user.email.toLowerCase()).catch(e =>
        console.warn('[Auth] ensureUserDoc:', e)
    );

    const sheetId = getSheetId();
    if (!sheetId) {
        window.location.href = '/index.html';
        return;
    }
    currentSheetId = sheetId;

    // Carrega o documento completo da ficha
    let sheetDoc;
    try {
        sheetDoc = await loadSheetDoc(sheetId);
    } catch (e) {
        console.error('[Load] Erro ao carregar ficha:', e);
        window.location.href = '/index.html';
        return;
    }
    if (!sheetDoc) {
        window.location.href = '/index.html';
        return;
    }

    // Resolve a permissão do usuário atual
    const perm = resolvePermission(sheetDoc, user.uid);
    if (!perm) {
        window.location.href = '/index.html';
        return;
    }
    currentPermission = perm;

    // Se não é dono e ainda não tem a ficha no dashboard, registra
    if (perm !== 'owner') {
        addToUserSharedSheets(user.uid, sheetId).catch(e =>
            console.warn('[Share] track:', e)
        );
    }

    await initAllModules();

    // Carrega dados sem disparar autosave
    suppressSave = true;
    try {
        if (sheetDoc.data) deserializeSheet(sheetDoc.data);
        refreshHeader(); // atualiza header-title e header-eyebrow com os dados carregados
        // Aplica a imagem do retrato (o campo foi preenchido mas nenhum evento input foi disparado)
        applyPortraitUrl(sheetDoc.data?.fields?.['retrato-url'] || '');
    } catch (e) {
        console.error('[Load] Erro ao deserializar:', e);
        showError('Erro ao carregar: ' + e.message);
    } finally {
        setTimeout(() => { suppressSave = false; }, 50);
    }

    wireCalculations();
    updateAuthHeader(user);

    // Preenche o nome do dono dinamicamente
    const ownerEmail = sheetDoc.ownerEmail || sheetDoc.owner || '—';
    updateOwnerHeader(ownerEmail);

    // Inicia realtime sync e presença (para todos os usuários)
    setupRealtimeSync(sheetId);
    setupPresence(sheetId, user);

    // Aplica UI de acordo com a permissão
    if (perm === 'read') {
        applyReadOnlyMode(ownerEmail);
        return; // sem wires de edição
    }

    // Modo edit ou owner: exibe botão de share apenas para o dono
    if (perm === 'owner') {
        document.getElementById('share-btn-wrapper')?.style.setProperty('display', 'flex');
        initSharePopup(sheetId, user, sheetDoc);
    }

    // Botão autocalc
    const autocalcBtn = document.getElementById('autocalc-switch');
    if (autocalcBtn) {
        autocalcBtn.addEventListener('click', () => {
            setAutoCalcEnabled(!autoCalcEnabled);
            autocalcBtn.classList.toggle('active', autoCalcEnabled);
            if (autoCalcEnabled) { atualizarHeranca(); atualizarPericias(true); }
        });
    }

    // Botão de salvamento manual
    const manualSaveBtn = document.getElementById('manual-save');
    if (manualSaveBtn) {
        manualSaveBtn.addEventListener('click', () => {
            clearTimeout(saveTimer);
            saveTimer = null;
            atualizarPericias(true);
            performSave();
        });
    }

    // Auto-save: escuta qualquer mudança no documento
    document.addEventListener('input', triggerAutoSave);
    document.addEventListener('change', triggerAutoSave);
    document.addEventListener('ficha:changed', triggerAutoSave);
});
