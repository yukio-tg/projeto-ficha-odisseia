// wiki-wikilinks.js — Processes [[Wiki Link]] syntax in document content.
//
// Syntax: [[Document Title]] is replaced with a link to that document.
// If the document is not found, the brackets are removed and only the text remains.
// All resolved links are collected for a "References" section.

import { getDocByTitle } from './wiki-firebase.js';
import { escapeHtml } from './wiki-utils.js';

/** Regex that matches [[any text here]] */
const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

/**
 * Extracts all unique wiki-link names from text.
 * @param {string} text
 * @returns {string[]} — array of unique names found
 */
export function extractWikiLinkNames(text) {
    if (!text) return [];
    const names = new Set();
    for (const m of text.matchAll(WIKILINK_RE)) names.add(m[1].trim());
    return [...names].filter(Boolean);
}

/**
 * Extracts all wiki-link names from an entire document's content array.
 * @param {Array<{body:string}>} contentSections
 * @returns {string[]}
 */
export function extractAllWikiLinks(contentSections) {
    const names = new Set();
    for (const section of (contentSections || [])) {
        for (const name of extractWikiLinkNames(section.body || '')) {
            names.add(name);
        }
    }
    return [...names];
}

/**
 * Resolves a list of wiki-link names to their documents.
 * @param {string[]} names — unique list of names to look up
 * @returns {Promise<Map<string, {id:string, title:string, type:string}>>}
 */
export async function resolveWikiLinks(names) {
    const map = new Map();
    if (!names.length) return map;
    const results = await Promise.all(names.map(name => getDocByTitle(name)));
    names.forEach((name, i) => {
        if (results[i]) map.set(name, results[i]);
    });
    return map;
}

/**
 * Processes [[Name]] in text, returning safe HTML with links or plain text.
 *
 * Uses escapeHtml for all user-supplied text.
 * [[Name]] → <a class="wiki-inline-link" href="/wiki/doc?id=ID">Name</a>
 * [[Unknown]] → Name (no link, no brackets)
 *
 * @param {string} text — raw body text (may contain [[...]]) 
 * @param {Map<string, {id:string, title:string}>} resolvedMap
 * @returns {string} — safe HTML string
 */
export function renderBodyWithLinks(text, resolvedMap) {
    if (!text?.trim()) return '';
    // Split on [[...]] while keeping the match
    const parts = text.split(WIKILINK_RE);
    // text.split(regex) with a capture group gives: [before, match1, after, match2, ...]
    // So even indices are plain text, odd indices are captured link names
    return parts
        .map((part, idx) => {
            if (idx % 2 === 0) {
                // Plain text — split into paragraphs + escape
                return processParagraphs(part);
            } else {
                // Wiki-link name
                const name = part.trim();
                const resolved = resolvedMap.get(name);
                if (resolved) {
                    return `<a class="wiki-inline-link" href="/wiki/doc?id=${encodeURIComponent(resolved.id)}">${escapeHtml(name)}</a>`;
                }
                return escapeHtml(name); // not found — just the name
            }
        })
        .join('');
}

/**
 * Turns plain text paragraphs into <p> elements.
 * Double newline = paragraph break; single newline = <br>.
 */
function processParagraphs(text) {
    if (!text) return '';
    return text
        .split(/\n\n+/)
        .map(p => {
            const safe = escapeHtml(p.trim()).replace(/\n/g, '<br>');
            return safe ? `<p>${safe}</p>` : '';
        })
        .filter(Boolean)
        .join('');
}
