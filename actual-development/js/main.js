import './config/classes.js';
import './config/herancas.js';
import { initRadar } from './core/radar-service.js';
import { initAutocomplete } from './ui/autocomplete.js';
import { initBars } from './ui/vitals.js';
import { initPortrait } from './ui/portrait.js';
import { initSkills, atualizarPericias, setAfterSkillsUpdate } from './ui/skills.js';
import { initTabs } from './ui/tabs.js';
import { initHeaderSync, updateAuthHeader, updateOwnerHeader } from './ui/header.js';
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
import { initFirebase, waitForAuth, getSheetId, loadSheetDoc, saveSheetData, saveSheetDataOnly, ensureUserDoc, addToUserSharedSheets } from './core/firebase-service.js';
import { serializeSheet, deserializeSheet } from './core/sheet-serializer.js';
import { initSharePopup } from './ui/share.js';

// ── Estado global ────────────────────────────────────────────────────────────
let suppressSave = false;
let saveTimer = null;
let currentUser = null;
let currentSheetId = null;
let currentPermission = null; // 'owner' | 'edit' | 'read'

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
    saveTimer = setTimeout(performSave, 1500);
}

// ── Lógica de permissão ──────────────────────────────────────────────────────

function resolvePermission(sheetDoc, uid) {
    if (sheetDoc.owner === uid) return 'owner';
    const match = (sheetDoc.sharedWith || []).find(s => s.uid === uid);
    if (match) return match.permission; // 'read' ou 'edit'
    if (sheetDoc.isPublic) return sheetDoc.publicPermission || 'read';
    return null;
}

function applyReadOnlyMode(ownerEmail) {
    suppressSave = true;
    // Desabilita todos os inputs interativos
    document.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
    // Oculta controles de edição
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
    // Remove indicadores de save (não fazem sentido em modo leitura)
    document.getElementById('saved')?.style.setProperty('display', 'none');
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

    // Garante que o perfil do usuário existe (para lookup por email funcionar)
    ensureUserDoc(user.uid, user.email).catch(e => console.warn('[Auth] ensureUserDoc:', e));

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
        // Sem acesso — redireciona
        window.location.href = '/index.html';
        return;
    }
    currentPermission = perm;

    // Se não é dono e ainda não tem a ficha no dashboard, adiciona
    if (perm !== 'owner') {
        addToUserSharedSheets(user.uid, sheetId).catch(e => console.warn('[Share] track:', e));
    }

    await initAllModules();

    // Carrega dados sem disparar autosave
    suppressSave = true;
    try {
        if (sheetDoc.data) deserializeSheet(sheetDoc.data);
    } catch (e) {
        console.error('[Load] Erro ao deserializar:', e);
        showError('Erro ao carregar: ' + e.message);
    } finally {
        suppressSave = false;
    }

    wireCalculations();
    updateAuthHeader(user);

    // Preenche o nome do dono dinamicamente
    const ownerEmail = sheetDoc.ownerEmail || sheetDoc.owner || '—';
    updateOwnerHeader(ownerEmail);

    // Aplica UI de acordo com a permissão
    if (perm === 'read') {
        applyReadOnlyMode(ownerEmail);
        return; // não precisa das wires de edição
    }

    // Modo edit ou owner: exibe save e calcs
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
            atualizarPericias(true);
            performSave();
        });
    }

    // Auto-save: escuta qualquer mudança no documento
    document.addEventListener('input', triggerAutoSave);
    document.addEventListener('change', triggerAutoSave);
    document.addEventListener('ficha:changed', triggerAutoSave);
});
