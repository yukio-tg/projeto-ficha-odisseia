import './config/classes.js';
import './config/herancas.js';
import { initRadar } from './core/radar-service.js';
import { initAutocomplete } from './ui/autocomplete.js';
import { initBars } from './ui/vitals.js';
import { initPortrait } from './ui/portrait.js';
import { initSkills, atualizarPericias, setAfterSkillsUpdate } from './ui/skills.js';
import { initTabs } from './ui/tabs.js';
import { initHeaderSync } from './ui/header.js';
import { initCombat, atualizarAcoesPorNivel, atualizarAvisoReacoes, atualizarAtaquesAcerto, popularReacoesPreset } from './ui/combat.js';
import { initHerancaToggle } from './ui/heranca-toggle.js';   // <-- novo
import { atualizarHeranca, removerBonusAtuais, aplicarNovoBonus } from './core/heranca-logic.js';
import { autoCalcEnabled, setAutoCalcEnabled } from './core/state.js';
import { atualizarInertidao, calcStats, updateVisibilityByLevel, updateFeVisibility } from './core/calculation.js';
import { initPowers } from './ui/powers.js';
import { initMagias } from './ui/magias.js';

document.addEventListener('DOMContentLoaded', () => {
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
    initPowers();
    initMagias();

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
                    updateVisibilityByLevel();
                    calcStats();
                    atualizarAcoesPorNivel();
                    atualizarAvisoReacoes();
                    document.dispatchEvent(new Event('reacoes:atualizar-stats'));
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

        // Atualiza stats bars de reação quando qualquer atributo do radar muda
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

        // Classe input
        const classeInput = document.querySelector('[data-field="classe-nome"]');
        if (classeInput) {
            classeInput.addEventListener('input', () => {
                if (autoCalcEnabled) {
                    atualizarHeranca();   // se houver dependência, mas herança não depende de classe
                    calcStats();
                    atualizarAcoesPorNivel();
                    atualizarAvisoReacoes();
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
        atualizarAcoesPorNivel();
        atualizarAvisoReacoes();
        atualizarAtaquesAcerto(false);
    }, 600);
});