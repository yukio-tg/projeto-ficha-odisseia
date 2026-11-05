import './config/classes.js';
import './config/herancas.js';
import { initRadar, updateRadarTheme, adjustRadarMaxPoints } from './core/radar-service.js';
import { initAutocomplete } from './ui/autocomplete.js';
import { initBars } from './ui/vitals.js';
import { initPortrait, applyPortraitUrl } from './ui/portrait.js';
import { initSkills, atualizarPericias, setAfterSkillsUpdate } from './ui/skills.js';
import { initTabs } from './ui/tabs.js';
import { initHeaderSync, refreshHeader, updateAuthHeader, updateOwnerHeader, syncModoUi } from './ui/header.js';
import { initCombat, atualizarAcoesPorNivel, atualizarAvisoReacoes, atualizarAtaquesAcerto, popularReacoesPreset, checkMorrendoCondition } from './ui/combat.js';
import { initHerancaToggle } from './ui/heranca-toggle.js';
import { atualizarHeranca, herancaAttrBonusAplicado } from './core/heranca-logic.js';
import { autoCalcEnabled, setSheetMode, isModoRegras, MODO_LIVRE, MODO_REGRAS, addManualOverride, isHydrating, consumeSheetRestored, beginExplicitRecalc, endExplicitRecalc, liberarDerivadosParaRecalculo } from './core/state.js';
import { atualizarInertidao, calcStats, updateVisibilityByLevel, updateFeVisibility, atualizarDtSab } from './core/calculation.js';
import { initPowers } from './ui/powers.js';
import { initMagias } from './ui/magias.js';
import { initInventory } from './ui/inventory.js';
import { initItemEffects, reaplicarBonusProtecao } from './core/item-effects.js';
import { initBesta } from './ui/besta.js';
import { initAnotacoes } from './ui/anotacoes.js';
import { initClassCrest, refreshCrest } from './ui/class-crest.js';
import {
    initFirebase, waitForAuth, getSheetId,
    loadSheetDoc, saveSheetData, saveSheetDataOnly,
    ensureUserDoc, addToUserSharedSheets,
    listenToSheet, listenToPresence, updatePresence, deletePresence,
    saveSheetTheme, extractSheetTheme
} from './core/firebase-service.js';
import { serializeSheet, deserializeSheet } from './core/sheet-serializer.js';
import { shouldApplyRemoteSnapshot, fingerprintSheet } from './core/save-guard.js';
import { initSharePopup } from './ui/share.js';
import { initThemePanel, applyRemoteTheme, setThemeSaveFn, setThemeUpdateFn } from './ui/theme.js';
import { initConfiguracoes, updateEvoTable, definirAoIncrementar } from './ui/configuracoes.js';

// ── Estado global ────────────────────────────────────────────────────────────
let suppressSave = false;
let autoSaveEnabled = true;
let saveTimer = null;
let saveInFlight = false;
let pendingSaves = 0;
let saveChain = Promise.resolve();
const sentFingerprints = new Set();
let currentUser = null;
let currentSheetId = null;
let currentPermission = null; // 'owner' | 'edit' | 'read'
let hasActiveCollaborators = false;
// Flag explícita de alterações pendentes — mais confiável que checar o DOM
let _hasUnsavedChanges = false;
// Flag para suprimir o aviso beforeunload quando navegando programaticamente
let _suppressBeforeUnload = false;

const AUTO_SAVE_IDLE_MS = 30_000;
const AUTO_SAVE_COLLABORATIVE_MS = 1_500;

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

/**
 * Recursively converts any nested arrays (arrays inside arrays) into plain objects.
 * Firestore does not support nested arrays; this is a defensive sanitizer.
 * Also logs warnings to the console so the root cause can be identified.
 */
function sanitizeForFirestore(value, path = '') {
    if (Array.isArray(value)) {
        // Detect nested arrays (arrays containing arrays)
        if (value.some(item => Array.isArray(item))) {
            const firstItem = value[0];
            // If it looks like Map.entries() → [[key, val], ...], convert to object
            if (Array.isArray(firstItem) && firstItem.length === 2 && typeof firstItem[0] === 'string') {
                console.warn(`[Save] Nested array (Map-entries format) at "${path}", converting to object.`);
                return Object.fromEntries(value.map(([k, v]) => [k, sanitizeForFirestore(v, `${path}.${k}`)]));
            }
            // Generic nested array: convert to indexed object
            console.warn(`[Save] Nested array at "${path}", converting to indexed object.`);
            return Object.fromEntries(value.map((item, i) => [String(i), sanitizeForFirestore(item, `${path}[${i}]`)]));
        }
        return value.map((item, i) => sanitizeForFirestore(item, `${path}[${i}]`));
    }
    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
        const result = {};
        for (const [k, v] of Object.entries(value)) {
            result[k] = sanitizeForFirestore(v, path ? `${path}.${k}` : k);
        }
        return result;
    }
    return value;
}

function rememberSent(data) {
    const fp = fingerprintSheet(data);
    sentFingerprints.add(fp);
    while (sentFingerprints.size > 8) {
        const oldest = sentFingerprints.values().next().value;
        sentFingerprints.delete(oldest);
    }
    return fp;
}

async function writeSheetOnce() {
    const rawData = serializeSheet();
    const data = sanitizeForFirestore(rawData); // defensive: removes any remaining nested arrays
    rememberSent(data);
    const name = data.fields?.['personagem-nome'] || 'Sem nome';
    if (currentPermission === 'owner') {
        await saveSheetData(currentSheetId, currentUser.uid, name, data);
    } else {
        await saveSheetDataOnly(currentSheetId, name, data);
    }
    showSaved();
    _hasUnsavedChanges = false;
}

function performSave() {
    if (!currentUser || !currentSheetId) return Promise.resolve();
    pendingSaves += 1;
    saveInFlight = true;
    const run = saveChain.then(writeSheetOnce, writeSheetOnce);
    saveChain = run.then(() => {
        pendingSaves -= 1;
        if (pendingSaves === 0) saveInFlight = false;
    }, (e) => {
        pendingSaves -= 1;
        if (pendingSaves === 0) saveInFlight = false;
        console.error('[Save] Erro ao salvar:', e);
        if (e?.code === 'permission-denied') {
            showError('Seu acesso a esta ficha foi revogado.');
        } else {
            showError(e?.message);
        }
    });
    return saveChain;
}

function triggerAutoSave() {
    if (suppressSave || isHydrating() || !autoSaveEnabled) return;
    _hasUnsavedChanges = true;
    showNonSaved();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        saveTimer = null;
        performSave();
    }, hasActiveCollaborators ? AUTO_SAVE_COLLABORATIVE_MS : AUTO_SAVE_IDLE_MS);
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

    // Prevent scroll-wheel from changing number input values.
    // We check document.activeElement (focused element) because the browser changes the FOCUSED
    // number input on wheel, not necessarily the one under the cursor (e.target).
    document.addEventListener('wheel', (e) => {
        const focused = document.activeElement;
        if (focused instanceof HTMLInputElement && focused.type === 'number') {
            e.preventDefault();
            focused.blur();
        }
        // Also block direct hover-scroll on number inputs
        if (e.target instanceof HTMLInputElement && e.target.type === 'number') {
            e.preventDefault();
        }
    }, { passive: false, capture: true });

    // Remove tabindex from all focusable form elements so TAB-navigation can't reach them
    // (focused elements can still be scrolled to change their value)
    document.querySelectorAll('input, select, textarea, button').forEach(el => {
        el.setAttribute('tabindex', '-1');
    });

    // Desabilita o editor de anotações (contenteditable não é bloqueado por pointer-events)
    const anotEditor = document.getElementById('anot-editor');
    if (anotEditor) anotEditor.contentEditable = 'false';

    // Oculta controles de edição no header
    document.getElementById('manual-save')?.closest('.header-save')?.style.setProperty('display', 'none');
    document.getElementById('autocalc-switch')?.closest('.header-autocalc')?.style.setProperty('display', 'none');
    document.getElementById('autosave-switch')?.closest('.header-autosave')?.style.setProperty('display', 'none');
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

            // Escrita local ainda não confirmada: o eco chega de novo com hasPendingWrites false.
            if (snap.metadata.hasPendingWrites && currentPermission !== 'read') return;

            const remoteData = snap.data()?.data;
            if (!remoteData) return;

            const applyRemote = shouldApplyRemoteSnapshot({
                permission: currentPermission,
                saveInFlight,
                saveTimerActive: saveTimer !== null,
                remoteFingerprint: fingerprintSheet(remoteData),
                knownSentFingerprints: sentFingerprints,
            });
            if (!applyRemote) return;

            // deserializeSheet segura a hidratação até os timers de 0 ms e 60 ms.
            deserializeSheet(remoteData);
            refreshHeader();
            applyPortraitUrl(remoteData?.fields?.['retrato-url'] || '');
            refreshCrest(); // atualiza crest com a classe recebida remotamente
            checkMorrendoCondition(); // re-check after remote sync
            if (currentPermission !== 'read') showSaved();
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
        const presenceChanged = hasActiveCollaborators !== (others.length > 0);
        hasActiveCollaborators = others.length > 0;
        if (presenceChanged && saveTimer !== null) triggerAutoSave();
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
    setThemeUpdateFn(updateRadarTheme); // radar redesenha ao mudar o tema
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
    initClassCrest();
    initConfiguracoes();
}

function recalcularSobDemanda() {
    if (isHydrating()) return;
    beginExplicitRecalc();
    liberarDerivadosParaRecalculo();
    try {
        atualizarHeranca();
        atualizarPericias(true);
        atualizarInertidao();
        calcStats();
        atualizarDtSab();
        reaplicarBonusProtecao();
        atualizarAcoesPorNivel();
        atualizarAvisoReacoes();
        document.dispatchEvent(new Event('reacoes:atualizar-stats'));
    } finally {
        endExplicitRecalc();
    }
    document.dispatchEvent(new Event('ficha:changed', { bubbles: true }));
}

function wireCalculations() {
    setTimeout(() => {
        const levelInput = document.querySelector('#secao-radar .level-input');
        if (levelInput) {
            levelInput.addEventListener('input', () => {
                updateVisibilityByLevel();
                if (autoCalcEnabled) {
                    atualizarInertidao();
                    atualizarHeranca();
                    // Após mudança de nível, o RadarRPG reseta maxPoints para o valor base.
                    // atualizarHeranca faz remove + re-apply (net 0 em maxPoints).
                    // É necessário re-adicionar o bônus de herança ao novo maxPoints de nível.
                    const herancaBonus = Object.values(herancaAttrBonusAplicado).reduce((a, b) => a + b, 0);
                    if (herancaBonus > 0) adjustRadarMaxPoints(herancaBonus);
                    calcStats();
                    atualizarAcoesPorNivel();
                    atualizarAvisoReacoes();
                    document.dispatchEvent(new Event('reacoes:atualizar-stats'));
                }
            });
        }

        const alinhamentoInput = document.querySelector('[data-field="alinhamento-nome"]');
        if (alinhamentoInput) {
            alinhamentoInput.addEventListener('input', () => updateFeVisibility());
            alinhamentoInput.addEventListener('change', () => updateFeVisibility());
        }

        document.querySelector('#secao-radar')?.addEventListener('input', (e) => {
            if (e.target.classList.contains('attr-input') || e.target.classList.contains('mod-input')) {
                document.dispatchEvent(new Event('reacoes:atualizar-stats'));
                if (autoCalcEnabled) atualizarDtSab();
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
            checkMorrendoCondition();
        });

        document.querySelector('[data-field="tamanho"]')?.addEventListener('change', () => {
            if (autoCalcEnabled) atualizarInertidao();
        });

        const classeInput = document.querySelector('[data-field="classe-nome"]');
        if (classeInput) {
            classeInput.addEventListener('input', () => {
                if (autoCalcEnabled) { atualizarHeranca(); calcStats(); atualizarAcoesPorNivel(); atualizarAvisoReacoes(); }
                checkMorrendoCondition();
            });
            classeInput.addEventListener('change', () => {
                if (autoCalcEnabled) calcStats();
                checkMorrendoCondition();
            });
        }

        // Detect when user manually edits auto-calculated/auto-protected fields → preserve their values
        const CALC_FIELDS = [
            'pv-total', 'pv-atual', 'mana-total', 'mana-atual',
            'pt-total', 'la-total', 'la-atual', 'inv-total',
            'fe-total', 'fe-atual', 'inertidao-base', 'dt-sab',
            // Protection-affected fields (overwritten by recalcProtectionBonuses)
            'defesa', 'rd', 'deslocamento',
            'acoes-protagonistas', 'acoes-coesao', 'acoes-reacoes',
        ];
        CALC_FIELDS.forEach(field => {
            document.querySelectorAll(`[data-field="${field}"]`).forEach(el => {
                el.addEventListener('input', (e) => {
                    // e.isTrusted = true only for real user interactions (not programmatic dispatches)
                    if (e.isTrusted) addManualOverride(field);
                });
            });
        });

        // Auto-Morrendo: listen for pv-atual / mana-atual changes
        ['pv-atual', 'mana-atual'].forEach(field => {
            document.querySelectorAll(`[data-field="${field}"]`).forEach(el => {
                el.addEventListener('input',  checkMorrendoCondition);
                el.addEventListener('change', checkMorrendoCondition);
            });
        });

        // Ficha restaurada: os listeners acima valem para a próxima edição.
        // Esta rodada não recalcula por cima do que acabou de ser salvo.
        const restored = consumeSheetRestored();
        if (!restored) {
            atualizarInertidao();
            atualizarHeranca();
            updateVisibilityByLevel();
            calcStats();
            updateFeVisibility();
            atualizarAcoesPorNivel();
            atualizarAvisoReacoes();
            atualizarAtaquesAcerto(false);
            checkMorrendoCondition();
        } else {
            updateVisibilityByLevel();
            const alinhamento = document.querySelector('[data-field="alinhamento-nome"]')?.value.trim().toLowerCase() || 'nenhum';
            const feCard = document.querySelector('.vital-card-fe');
            if (feCard) feCard.style.display = alinhamento === 'nenhum' ? 'none' : '';
            atualizarAvisoReacoes();
            checkMorrendoCondition();
        }
    }, 600);
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    // Aplica o tema salvo antes de qualquer carregamento para evitar flash
    initThemePanel(new URLSearchParams(window.location.search).get('sheetId'));

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

    definirAoIncrementar(() => {
        calcStats();
        atualizarInertidao();
        atualizarDtSab();
        reaplicarBonusProtecao();
    });

    await initAllModules();

    // Carrega dados sem disparar autosave. A hidratação cobre os eventos
    // síncronos e os timers de 0 ms / 60 ms; o autocalc de 600 ms é pulado.
    try {
        if (sheetDoc.data) deserializeSheet(sheetDoc.data);
        refreshHeader(); // atualiza header-title e header-eyebrow com os dados carregados
        // Aplica a imagem do retrato (o campo foi preenchido mas nenhum evento input foi disparado)
        applyPortraitUrl(sheetDoc.data?.fields?.['retrato-url'] || '');
        refreshCrest(); // atualiza crest com a classe carregada (deserialize não dispara eventos)
        // Notifica módulos que precisam reagir ao carregamento da ficha
        setTimeout(() => document.dispatchEvent(new Event('ficha:loaded')), 60);
    } catch (e) {
        console.error('[Load] Erro ao deserializar:', e);
        showError('Erro ao carregar: ' + e.message);
    }

    // Aplica o tema salvo no Firestore (sobrepõe o cache local se houver)
    const remoteTheme = extractSheetTheme(sheetDoc);
    if (remoteTheme) applyRemoteTheme(remoteTheme);

    wireCalculations();
    updateAuthHeader(user);

    // Preenche o nome do dono dinamicamente
    const ownerEmail = sheetDoc.ownerEmail || sheetDoc.owner || '—';
    updateOwnerHeader(ownerEmail);

    // Inicia realtime sync e presença (para todos os usuários)
    setupRealtimeSync(sheetId);
    setupPresence(sheetId, user);

    // ── Crest mobile: clique redireciona para index.html apenas em telas pequenas ─
    document.querySelector('.header-crest')?.addEventListener('click', () => {
        if (window.matchMedia('(max-width: 600px)').matches) {
            _suppressBeforeUnload = true;
            window.location.href = '/index.html';
        }
    });

    // ── Atalhos de troca de aba (todos os usuários, incluindo leitura) ───────
    document.addEventListener('keydown', (e) => {
        if (!e.ctrlKey) return;
        const tabKeys = ['1','2','3','4','5','6','7','8'];
        if (!tabKeys.includes(e.key)) return;
        e.preventDefault();
        if (e.key === '7') {
            const bestaTab = document.querySelector('#tabs li[data-tab="besta"]');
            const bestaVisible = bestaTab && bestaTab.style.display !== 'none';
            const tabId = bestaVisible ? 'besta' : 'anotacoes';
            document.querySelector(`#tabs li[data-tab="${tabId}"]`)?.click();
            return;
        }
        const tabMap = {
            '1': 'geral', '2': 'pericias', '3': 'combate', '4': 'habilidades',
            '5': 'magias', '6': 'inventario', '8': 'anotacoes'
        };
        const targetTab = tabMap[e.key];
        if (targetTab) document.querySelector(`#tabs li[data-tab="${targetTab}"]`)?.click();
    });

    if (!document.documentElement.dataset.exportBound) {
        document.documentElement.dataset.exportBound = '1';
        document.addEventListener('ficha:export-json', () => {
            const data = serializeSheet();
            const nome = String(data.fields?.['personagem-nome'] || 'ficha').trim() || 'ficha';
            const safe = nome.replace(/[^\w\u00C0-\u024f\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'ficha';
            const file = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(file);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${safe}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        });
    }

    // Aplica UI de acordo com a permissão
    if (perm === 'read') {
        applyReadOnlyMode(ownerEmail);
        return; // sem wires de edição
    }

    // Habilita o save de tema no Firestore (apenas para editores/donos)
    setThemeSaveFn((theme) => {
        if (!currentSheetId) return;
        saveSheetTheme(currentSheetId, theme).catch(e =>
            console.warn('[Theme] Erro ao salvar tema:', e)
        );
    });

    // Modo edit ou owner: exibe botão de share apenas para o dono
    if (perm === 'owner') {
        document.getElementById('share-btn-wrapper')?.style.setProperty('display', 'flex');
        initSharePopup(sheetId, user, sheetDoc);
    }

    // Modo Regras / Livre. Trocar não recalcula e não apaga o que está escrito.
    const autocalcBtn = document.getElementById('autocalc-switch');
    if (autocalcBtn && autocalcBtn.dataset.modoBound !== '1') {
        autocalcBtn.dataset.modoBound = '1';
        autocalcBtn.addEventListener('click', () => {
            setSheetMode(isModoRegras() ? MODO_LIVRE : MODO_REGRAS);
            syncModoUi();
            document.dispatchEvent(new Event('ficha:changed', { bubbles: true }));
        });
    }
    document.addEventListener('ficha:recalcular', () => recalcularSobDemanda());

    // Botão de toggle de auto-save
    const autoSaveBtn = document.getElementById('autosave-switch');
    if (autoSaveBtn) {
        autoSaveBtn.addEventListener('click', () => {
            autoSaveEnabled = !autoSaveEnabled;
            autoSaveBtn.classList.toggle('active', autoSaveEnabled);
            autoSaveBtn.title = autoSaveEnabled ? 'Auto-save ativado' : 'Auto-save desativado';
        });
    }

    // Botão de salvamento manual
    const manualSaveBtn = document.getElementById('manual-save');
    if (manualSaveBtn) {
        manualSaveBtn.addEventListener('click', () => {
            clearTimeout(saveTimer);
            saveTimer = null;
            if (autoCalcEnabled) atualizarPericias(true);
            performSave();
        });
    }

    // Auto-save: escuta qualquer mudança no documento
    document.addEventListener('input', triggerAutoSave);
    document.addEventListener('change', triggerAutoSave);
    document.addEventListener('ficha:changed', triggerAutoSave);

    // ── Atalho ctrl+s → salvar manualmente (apenas editores/donos) ───────────
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            clearTimeout(saveTimer);
            saveTimer = null;
            if (autoCalcEnabled) atualizarPericias(true);
            performSave();
        }
    });

    // ── Aviso antes de fechar aba com alterações não salvas ─────────────────
    window.addEventListener('beforeunload', (e) => {
        if (_suppressBeforeUnload) return; // navegação programática, não avisa
        if (_hasUnsavedChanges || saveTimer !== null) {
            e.preventDefault();
            e.returnValue = 'Há alterações não salvas. Deseja sair sem salvar?';
        }
    });

    // ── Salvar ao clicar no link para index.html ────────────────────────────
    document.querySelectorAll('a[href="/index.html"], a[href="index.html"]').forEach(link => {
        link.addEventListener('click', async (e) => {
            // Só intercepta se houver alterações pendentes
            if (!_hasUnsavedChanges && saveTimer === null) return;
            e.preventDefault();
            clearTimeout(saveTimer);
            saveTimer = null;
            _suppressBeforeUnload = true; // suprime o dialog de "não salvo"
            try {
                if (autoCalcEnabled) atualizarPericias(true);
                await performSave();
            } catch { /* ignora erros de save — navega mesmo assim */ }
            window.location.href = '/index.html';
        });
    });
});
