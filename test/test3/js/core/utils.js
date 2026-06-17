// core/utils.js — Shared utility functions
'use strict';

/**
 * Normalizes a string for accent-insensitive, case-insensitive comparison.
 * Used across inventory, powers, magias for search/autocomplete matching.
 */
export function normalizar(str) {
    return (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

/**
 * Escapes HTML special characters to prevent XSS in template literals.
 * Covers &, <, >, ", ' — the full set needed for attribute and content contexts.
 */
export function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
}

/**
 * Generates a compact, collision-resistant unique ID for persistence keys.
 * Format: base36-timestamp + random suffix (e.g. "lxyz1234_ab3kf")
 */
export function uid() {
    return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}
