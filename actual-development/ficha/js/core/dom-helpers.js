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

/** Notifies the auto-save that the sheet changed outside of a native input/change event. */
export function notifyFichaChanged() {
    document.dispatchEvent(new Event('ficha:changed', { bubbles: true }));
}

/**
 * Sets up a standard minimize/expand toggle for a card element.
 * Expects a button with a Material Symbols icon and a body element to show/hide.
 * The current state is mirrored on `card.dataset.collapsed` ("true" | "false").
 *
 * @param {HTMLElement} card         The card element
 * @param {string} btnSelector       Selector for the toggle button (within card)
 * @param {string} bodySelector      Selector for the body to show/hide (within card)
 * @param {boolean} [startMinimized] Whether to start minimized (default: false)
 * @param {object} [options]
 * @param {Function} [options.onUserToggle]  Called with (minimized) only when the user clicks
 * @returns {{ setMinimized: Function, isMinimized: Function }}
 */
export function setupCardMinimize(card, btnSelector, bodySelector, startMinimized = false, options = {}) {
    const btn = card.querySelector(btnSelector);
    const body = card.querySelector(bodySelector);
    if (!btn || !body) return { setMinimized: () => {}, isMinimized: () => false };

    let minimizado = false;
    function setMinimized(value) {
        minimizado = !!value;
        body.style.display = minimizado ? 'none' : '';
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = minimizado ? 'expand_more' : 'expand_less';
        card.dataset.collapsed = minimizado ? 'true' : 'false';
    }
    setMinimized(startMinimized);

    btn.addEventListener('click', () => {
        setMinimized(!minimizado);
        if (typeof options.onUserToggle === 'function') options.onUserToggle(minimizado);
    });

    return { setMinimized, isMinimized: () => minimizado };
}

/**
 * Sets up a standard accordion toggle (hidden attribute based) for combat-style cards.
 * Handles click delegation (ignoring delete buttons and name inputs) and keyboard.
 * The current state is mirrored on `card.dataset.open` ("true" | "false").
 *
 * @param {HTMLElement} card           The card element
 * @param {object} [options]
 * @param {string[]} [options.ignoreSelectors]  Selectors to ignore clicks on
 * @param {boolean} [options.open]              Initial state; omitted keeps the markup's `hidden`
 * @param {Function} [options.onUserToggle]     Called with (isOpen) only on user click/keyboard
 * @returns {{ toggle: Function, isOpen: Function }}  `toggle(forceOpen)` never calls onUserToggle
 */
export function setupAccordion(card, options = {}) {
    const header = card.querySelector('.combat-card__header');
    const body = card.querySelector('.combat-card__body');
    const chevron = card.querySelector('.combat-card__chevron');
    if (!header || !body || !chevron) return { toggle: () => {}, isOpen: () => false };

    const ignoreSelectors = options.ignoreSelectors || [
        '.combat-card__delete-btn',
        '.combat-card__name-input',
        '.bonus-tipo-select'
    ];

    function toggle(forceOpen) {
        applyAccordionState(card, header, body, chevron, forceOpen !== undefined ? !!forceOpen : body.hidden);
    }
    toggle(options.open !== undefined ? options.open : !body.hidden);

    function userToggle() {
        toggle();
        if (typeof options.onUserToggle === 'function') options.onUserToggle(!body.hidden);
    }

    header.addEventListener('click', (e) => {
        if (ignoreSelectors.some(sel => e.target.closest(sel))) return;
        userToggle();
    });
    header.addEventListener('keydown', (e) => {
        // Ignora Space/Enter se o foco estiver em um input, textarea ou select dentro do header
        // (evita que digitar espaço em campos de texto acione o toggle)
        if (ignoreSelectors.some(sel => e.target.closest(sel))) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); userToggle(); }
    });

    // Stop name-input click from bubbling to header
    const nameInput = card.querySelector('.combat-card__name-input');
    if (nameInput) nameInput.addEventListener('click', e => e.stopPropagation());

    return { toggle, isOpen: () => !body.hidden };
}

function applyAccordionState(card, header, body, chevron, isOpen) {
    body.hidden = !isOpen;
    header.setAttribute('aria-expanded', String(isOpen));
    chevron.textContent = isOpen ? 'expand_less' : 'expand_more';
    card.classList.toggle('combat-card--open', isOpen);
    card.dataset.open = String(isOpen);
}

/** Reads the open state of a card wired with setupAccordion. */
export function isAccordionOpen(card) {
    const body = card?.querySelector('.combat-card__body');
    return !!body && !body.hidden;
}

/** Applies an open/closed state to a setupAccordion card without notifying anyone. */
export function setAccordionOpen(card, open) {
    const header = card?.querySelector('.combat-card__header');
    const body = card?.querySelector('.combat-card__body');
    const chevron = card?.querySelector('.combat-card__chevron');
    if (!header || !body || !chevron) return;
    applyAccordionState(card, header, body, chevron, !!open);
}
