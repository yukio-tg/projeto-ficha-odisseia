// core/autocomplete.js — Generic autocomplete dropdown engine
'use strict';

import { normalizar } from './utils.js';

/**
 * Creates a reusable autocomplete dropdown attached to a search input.
 * Replaces the 3 near-identical implementations in inventory.js, powers.js, and magias.js.
 *
 * @param {object} config
 * @param {HTMLInputElement} config.input           The search input element
 * @param {string}           config.containerSelector  CSS selector for the parent container (for positioning)
 * @param {string}           config.dropdownClass   CSS class for the dropdown element
 * @param {string}           config.itemClass       CSS class for each dropdown item
 * @param {string}           config.activeClass     CSS class for the keyboard-selected item
 * @param {Function}         config.getItems        () => Array — returns the current dataset to search
 * @param {Function}         config.filterFn        (item, normalizedQuery) => boolean
 * @param {Function}         config.renderItem      (item) => string — returns innerHTML for each dropdown item
 * @param {Function}         config.onSelect        (item) => void — called when user clicks an item
 * @param {Function}         [config.onEnter]       () => void — called when Enter is pressed without selection
 * @param {number}           [config.maxResults=8]  Maximum number of results to show
 * @returns {{ close: Function, open: Function }}
 */
export function createAutocomplete(config) {
    const {
        input, containerSelector, dropdownClass, itemClass, activeClass,
        getItems, filterFn, renderItem, onSelect, onEnter, maxResults = 8
    } = config;

    let dropdown = null;
    let currentIndex = -1;

    function getOrCreateDropdown() {
        if (dropdown) return dropdown;
        dropdown = document.createElement('div');
        dropdown.className = dropdownClass;
        const container = input.closest(containerSelector);
        if (container) {
            container.style.position = 'relative';
            container.appendChild(dropdown);
        }
        return dropdown;
    }

    function close() {
        if (dropdown) dropdown.style.display = 'none';
        currentIndex = -1;
    }

    function show(query) {
        const dd = getOrCreateDropdown();
        if (!query || query.trim() === '') {
            close();
            return;
        }

        const items = getItems();
        if (!items || items.length === 0) {
            close();
            return;
        }

        const qNorm = normalizar(query);
        const results = items.filter(item => filterFn(item, qNorm)).slice(0, maxResults);
        if (results.length === 0) {
            close();
            return;
        }

        dd.innerHTML = '';
        results.forEach(item => {
            const div = document.createElement('div');
            div.className = itemClass;
            div.innerHTML = renderItem(item);
            div.addEventListener('click', () => {
                onSelect(item);
                close();
            });
            dd.appendChild(div);
        });

        dd.style.display = 'block';
        dd.style.width = input.offsetWidth + 'px';
        currentIndex = -1;
    }

    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
        const dd = dropdown;
        const isVisible = dd && dd.style.display === 'block';
        const items = isVisible ? dd.querySelectorAll(`.${itemClass}`) : [];

        if (isVisible && items.length) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                currentIndex = (currentIndex + 1) % items.length;
                items.forEach((item, i) => item.classList.toggle(activeClass, i === currentIndex));
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                currentIndex = (currentIndex - 1 + items.length) % items.length;
                items.forEach((item, i) => item.classList.toggle(activeClass, i === currentIndex));
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (currentIndex >= 0 && items[currentIndex]) {
                    items[currentIndex].click();
                    return;
                }
            }
            if (e.key === 'Escape') {
                close();
                return;
            }
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            if (onEnter) onEnter();
        }
    });

    // Auto-show on input
    input.addEventListener('input', (e) => show(e.target.value));
    input.addEventListener('blur', () => setTimeout(close, 200));

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown?.contains(e.target)) {
            close();
        }
    });

    return { close, open: show };
}
