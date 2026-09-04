// core/dom-helpers.js — Shared DOM interaction patterns
'use strict';

/**
 * Checks if a numeric "current" field exceeds a "total" field and toggles
 * an overflow CSS class on a container element.
 * Used by: inventory (inv-over-limit), magias (la-over-limit), powers (pt-over-limit)
 *
 * @param {string} containerSelector  CSS selector for the container to toggle class on
 * @param {string} currentSelector    CSS selector for the "current" input
 * @param {string} totalSelector      CSS selector for the "total" input
 * @param {string} overflowClass      CSS class to add/remove
 */
export function verificarOverflow(containerSelector, currentSelector, totalSelector, overflowClass) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const atualInput = document.querySelector(currentSelector);
    const totalInput = document.querySelector(totalSelector);
    if (!atualInput || !totalInput) return;
    const atual = parseFloat(atualInput.value) || 0;
    const total = parseFloat(totalInput.value) || 0;
    container.classList.toggle(overflowClass, atual > total);
}

/**
 * Syncs a display element's textContent with an input field's value, in real-time.
 * Listens to input, change, and MutationObserver for programmatic changes.
 *
 * @param {string} sourceSelector   CSS selector for the source input
 * @param {string} displayId        ID of the display element
 * @param {Function} [transform]    Optional transform function (value => displayText)
 * @returns {Function|null}         Cleanup function, or null if elements not found
 */
export function syncFieldToDisplay(sourceSelector, displayId, transform) {
    const source = document.querySelector(sourceSelector);
    const display = document.getElementById(displayId);
    if (!source || !display) return null;

    const update = () => {
        const val = source.value || '';
        display.textContent = transform ? transform(val) : val;
    };
    source.addEventListener('input', update);
    source.addEventListener('change', update);
    const observer = new MutationObserver(update);
    observer.observe(source, { attributes: true, attributeFilter: ['value'] });
    update();

    return () => {
        source.removeEventListener('input', update);
        source.removeEventListener('change', update);
        observer.disconnect();
    };
}

/**
 * Sets up a standard minimize/expand toggle for a card element.
 * Expects a button with a Material Symbols icon and a body element to show/hide.
 *
 * @param {HTMLElement} card         The card element
 * @param {string} btnSelector       Selector for the toggle button (within card)
 * @param {string} bodySelector      Selector for the body to show/hide (within card)
 * @param {boolean} [startMinimized] Whether to start minimized (default: false)
 */
export function setupCardMinimize(card, btnSelector, bodySelector, startMinimized = false) {
    const btn = card.querySelector(btnSelector);
    const body = card.querySelector(bodySelector);
    if (!btn || !body) return;

    let minimizado = startMinimized;
    if (startMinimized) {
        body.style.display = 'none';
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = 'expand_more';
    }

    btn.addEventListener('click', () => {
        minimizado = !minimizado;
        body.style.display = minimizado ? 'none' : '';
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = minimizado ? 'expand_more' : 'expand_less';
    });
}

/**
 * Sets up a standard accordion toggle (hidden attribute based) for combat-style cards.
 * Handles click delegation (ignoring delete buttons and name inputs) and keyboard.
 *
 * @param {HTMLElement} card           The card element
 * @param {object} [options]
 * @param {string[]} [options.ignoreSelectors]  Selectors to ignore clicks on
 * @returns {{ toggle: Function }}     Object with toggle function for programmatic control
 */
export function setupAccordion(card, options = {}) {
    const header = card.querySelector('.combat-card__header');
    const body = card.querySelector('.combat-card__body');
    const chevron = card.querySelector('.combat-card__chevron');
    if (!header || !body || !chevron) return { toggle: () => {} };

    const ignoreSelectors = options.ignoreSelectors || [
        '.combat-card__delete-btn',
        '.combat-card__name-input',
        '.bonus-tipo-select'
    ];

    function toggle(forceOpen) {
        const isOpen = forceOpen !== undefined ? forceOpen : body.hidden;
        body.hidden = !isOpen;
        header.setAttribute('aria-expanded', String(isOpen));
        chevron.textContent = isOpen ? 'expand_less' : 'expand_more';
        card.classList.toggle('combat-card--open', isOpen);
    }

    header.addEventListener('click', (e) => {
        if (ignoreSelectors.some(sel => e.target.closest(sel))) return;
        toggle();
    });
    header.addEventListener('keydown', (e) => {
        // Ignora Space/Enter se o foco estiver em um input, textarea ou select dentro do header
        // (evita que digitar espaço em campos de texto acione o toggle)
        if (ignoreSelectors.some(sel => e.target.closest(sel))) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });

    // Stop name-input click from bubbling to header
    const nameInput = card.querySelector('.combat-card__name-input');
    if (nameInput) nameInput.addEventListener('click', e => e.stopPropagation());

    return { toggle };
}
