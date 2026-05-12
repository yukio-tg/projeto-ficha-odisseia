import './config/classes.js';
import './config/herancas.js';
import { initRadar } from './core/radar-service.js';
import { initAutocomplete } from './ui/autocomplete.js';
import { initBars } from './ui/vitals.js';
import { initPortrait } from './ui/portrait.js';
import { initSkills, atualizarPericias } from './ui/skills.js';
import { initTabs } from './ui/tabs.js';
import { initHeaderSync } from './ui/header.js';
import { initCombatExtras } from './ui/combat.js';
import { initHerancaToggle } from './ui/heranca-toggle.js';   // <-- novo
import { atualizarHeranca, removerBonusAtuais, aplicarNovoBonus } from './core/heranca-logic.js';
import { autoCalcEnabled, setAutoCalcEnabled } from './core/state.js';
import { atualizarInertidao, calcStats, updateVisibilityByLevel, updateFeVisibility } from './core/calculation.js';

document.addEventListener('DOMContentLoaded', () => {
    initRadar('secao-radar');
    initAutocomplete();
    initBars();
    initPortrait();
    initSkills();
    initTabs();
    initHeaderSync();
    initCombatExtras();
    initHerancaToggle();   // <-- ativa o toggle

    // Botão autocalc
    const autocalcBtn = document.getElementById('autocalc-switch');
    if (autocalcBtn) {
        autocalcBtn.addEventListener('click', () => {
            setAutoCalcEnabled(!autoCalcEnabled);
            autocalcBtn.classList.toggle('active', autoCalcEnabled);
            if (autoCalcEnabled) {
                atualizarHeranca();
                atualizarPericias(true);
            }
        });
    }

    // Botão de salvamento manual
    const manualSaveBtn = document.getElementById('manual-save');
    if (manualSaveBtn) {
        manualSaveBtn.addEventListener('click', () => {
            atualizarPericias(true);
            const savedDiv = document.getElementById('saved');
            const nonSavedDiv = document.getElementById('non-saved');
            if (savedDiv && nonSavedDiv) {
                savedDiv.style.display = 'flex';
                nonSavedDiv.style.display = 'none';
                setTimeout(() => {
                    savedDiv.style.display = 'none';
                    nonSavedDiv.style.display = 'flex';
                }, 2000);
            }
        });
    }

    // Eventos de nível, herança, tamanho, escolha (após radar pronto)
    setTimeout(() => {
        const levelInput = document.querySelector('#secao-radar .level-input');
        // Após a definição do levelInput...
        if (levelInput) {
            levelInput.addEventListener('input', () => {
                if (autoCalcEnabled) {
                    atualizarInertidao();
                    atualizarHeranca();
                    updateVisibilityByLevel();  // NOVO
                    calcStats();
                }
            });
        }

        // Campo de alinhamento
        const alinhamentoInput = document.querySelector('[data-field="alinhamento-nome"]');
        if (alinhamentoInput) {
            alinhamentoInput.addEventListener('input', () => {
                if (autoCalcEnabled) updateFeVisibility();
            });
            alinhamentoInput.addEventListener('change', () => {
                if (autoCalcEnabled) updateFeVisibility();
            });
        }

        const herancaInput = document.querySelector('[data-field="heranca-nome"]');
        if (herancaInput) {
            herancaInput.addEventListener('input', atualizarHeranca);
            herancaInput.addEventListener('change', atualizarHeranca);
        }

        const checkboxes = [
            document.querySelector('[data-field="aumentoDeFortuna"]'),
            document.querySelector('[data-field="aprendizadoDaVida"]'),
            document.querySelector('[data-field="habilidadeAdquirida"]')
        ];
        checkboxes.forEach(cb => cb?.addEventListener('change', atualizarHeranca));

        const tamanhoSelect = document.querySelector('[data-field="tamanho"]');
        if (tamanhoSelect) {
            tamanhoSelect.addEventListener('change', () => {
                if (autoCalcEnabled) atualizarInertidao();
            });
        }

        const escolhaSelect = document.querySelector('[data-field="aprendizadoEscolha"]');
        if (escolhaSelect) {
            escolhaSelect.addEventListener('change', () => {
                if (autoCalcEnabled) {
                    removerBonusAtuais();
                    aplicarNovoBonus();
                }
            });
        }

        // Classe input
        const classeInput = document.querySelector('[data-field="classe-nome"]');
        if (classeInput) {
            classeInput.addEventListener('input', () => {
                if (autoCalcEnabled) {
                    atualizarHeranca();   // se houver dependência, mas herança não depende de classe
                    calcStats();
                }
            });
            classeInput.addEventListener('change', () => {
                if (autoCalcEnabled) {
                    calcStats();
                }
            });
        }

        // Inicializa cálculos
        atualizarInertidao();
        atualizarHeranca();
        updateVisibilityByLevel();
        calcStats();
        updateFeVisibility();
    }, 600);
});