// wiki-format.js — Renders the formatting markup used in document bodies.
//
// Block syntax (at the start of a line):
//   "# texto"   → subtítulo
//   "- texto"   → item de lista não ordenada
//   "1. texto"  → item de lista ordenada
//   "> texto"   → citação (parágrafos > seguidos formam uma só)
//   ">> nome"   → assinatura da citação; também separa citações seguidas
//   linha vazia → quebra de parágrafo
//
// Inline syntax:
//   **texto**             → negrito
//   *texto*               → itálico
//   [[Rótulo]].(url)      → link mostrando apenas o rótulo
//
// Every piece of author-supplied text passes through escapeHtml before any tag
// is inserted, so bodies can never inject markup of their own.

import { escapeHtml } from './wiki-utils.js';

const LINK_RE    = /\[\[([^[\]]+)\]\]\.\(([^()\s]+)\)/g;
const HEADING_RE = /^#\s+(.*)$/;
const UL_RE      = /^-\s+(.*)$/;
const OL_RE      = /^\d+\.\s+(.*)$/;

// Used only to parse relative hrefs; never for building links.
const URL_BASE       = 'https://fichas-odisseia.web.app';
const WIKI_DOC_PATHS = ['/wiki/doc', '/wiki/doc.html'];

/** Returns the URL if it is safe to link to, otherwise null (blocks javascript: etc). */
function safeUrl(url) {
    const raw = (url || '').trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) return raw;
    return null;
}

/** Returns the wiki document id a URL points to, or null when it points elsewhere. */
export function docIdFromUrl(url) {
    const raw = safeUrl(url);
    if (!raw) return null;
    try {
        const parsed = new URL(raw, URL_BASE);
        if (!WIKI_DOC_PATHS.includes(parsed.pathname)) return null;
        return parsed.searchParams.get('id');
    } catch { return null; }
}

/** Collects the ids of wiki documents linked from a content array. */
export function extractLinkedDocIds(contentSections) {
    const ids = new Set();
    for (const section of (contentSections || [])) {
        for (const [, , url] of String(section?.body || '').matchAll(LINK_RE)) {
            const id = docIdFromUrl(url);
            if (id) ids.add(id);
        }
    }
    return [...ids];
}

/** Applies **bold** and *italic* to already-escaped text. */
function applyEmphasis(safeText) {
    return safeText
        .replace(/\*\*\*(?=\S)([\s\S]*?\S)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(?=\S)([^*\n]*?\S)\*/g, '<em>$1</em>');
}

/** A [[Rótulo]] without a `.(url)` is not a link — only the label is shown. */
function stripBareBrackets(safeText) {
    return safeText.replace(/\[\[([^[\]]+)\]\]/g, '$1');
}

function renderLink(label, url) {
    const text = applyEmphasis(escapeHtml(label.trim()));
    const href = safeUrl(url);
    if (!href) return text;
    return `<a class="wiki-content-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">`
         + `<span class="material-symbols-outlined wiki-content-link-icon" aria-hidden="true">open_in_new</span>`
         + `<span class="wiki-content-link-text">${text}</span></a>`;
}

/** Renders inline markup of a single line into safe HTML. */
function renderInline(line) {
    // split() with two capture groups yields [text, label, url, text, label, url, ...]
    const parts = String(line).split(LINK_RE);
    return parts
        .map((part, i) => {
            const slot = i % 3;
            if (slot === 1) return renderLink(part, parts[i + 1]);
            if (slot === 2) return '';  // url — already consumed alongside its label
            return stripBareBrackets(applyEmphasis(escapeHtml(part)));
        })
        .join('');
}

/** A run of non-blank lines whose first line opens a citation. */
/** ">>" opens an attribution when a space or the end of the line follows it. */
function attrMarkerAt(line) {
    const match = />>(?=\s|$)/.exec(line);
    return match ? match.index : -1;
}

function isAttrLine(line) {
    return attrMarkerAt(line) === 0;
}

function isQuoteParagraph(lines) {
    const first = lines[0] || '';
    return isAttrLine(first) || first.startsWith('> ');
}

/**
 * Splits one citation paragraph into body lines and the attribution that
 * follows the first ">> ". Repeating ">" at the start of a continuation line
 * is stripped, so both markdown-style and single-marker paragraphs work.
 */
function splitQuoteParagraph(lines) {
    const body = [];
    const attr = [];
    let inAttr = false;

    for (const raw of lines) {
        let line = raw;
        if (!inAttr && isAttrLine(line)) {
            inAttr = true;
            line = line.slice(2).trim();
            if (line) attr.push(line);
            continue;
        }
        if (!inAttr && line.startsWith('> ')) line = line.slice(2);

        if (!inAttr) {
            const at = attrMarkerAt(line);
            if (at >= 0) {
                const before = line.slice(0, at).trim();
                const after = line.slice(at + 2).trim();
                if (before) body.push(before);
                if (after) attr.push(after);
                inAttr = true;
                continue;
            }
            if (line.trim()) body.push(line.trim());
        } else {
            if (isAttrLine(line)) line = line.slice(2);
            if (line.trim()) attr.push(line.trim());
        }
    }
    return { body, attr, closed: inAttr };
}

function renderJoinedLines(lines) {
    return lines.map(renderInline).join('<br>');
}

/** Headings, lists and plain text for one paragraph (no blank lines inside). */
function renderPlainParagraph(lines) {
    const html = [];
    let paragraph = [];
    let list = null;

    const flushParagraph = () => {
        if (!paragraph.length) return;
        html.push(`<p>${paragraph.join('<br>')}</p>`);
        paragraph = [];
    };
    const flushList = () => {
        if (!list) return;
        const items = list.items.map(item => `<li>${item}</li>`).join('');
        html.push(`<${list.tag}>${items}</${list.tag}>`);
        list = null;
    };
    const pushListItem = (tag, content) => {
        flushParagraph();
        if (list?.tag !== tag) { flushList(); list = { tag, items: [] }; }
        list.items.push(renderInline(content));
    };

    for (const line of lines) {
        const heading = line.match(HEADING_RE);
        if (heading) {
            flushParagraph(); flushList();
            html.push(`<h3>${renderInline(heading[1])}</h3>`);
            continue;
        }
        const unordered = line.match(UL_RE);
        if (unordered) { pushListItem('ul', unordered[1]); continue; }
        const ordered = line.match(OL_RE);
        if (ordered) { pushListItem('ol', ordered[1]); continue; }
        flushList();
        paragraph.push(renderInline(line));
    }
    flushParagraph();
    flushList();
    return html.join('');
}

/**
 * Renders a section body into safe HTML.
 * @param {string} text — raw body as typed by the author
 * @returns {string} — safe HTML string
 */
export function renderContentBody(text) {
    if (!text?.trim()) return '';

    const paras = [];
    let buf = [];
    for (const raw of String(text).replace(/\r\n?/g, '\n').split('\n')) {
        const line = raw.trim();
        if (!line) {
            if (buf.length) { paras.push(buf); buf = []; }
        } else {
            buf.push(line);
        }
    }
    if (buf.length) paras.push(buf);

    const html = [];
    let quote = null; // { parts: string[], closed: boolean }

    const flushQuote = () => {
        if (quote?.parts.length) {
            html.push(`<blockquote class="wiki-quote">${quote.parts.join('')}</blockquote>`);
        }
        quote = null;
    };
    const pushAttr = (attrLines) => {
        if (!quote) quote = { parts: [], closed: false };
        if (!attrLines.length) { quote.closed = true; return; }
        const piece = renderJoinedLines(attrLines);
        const last = quote.parts[quote.parts.length - 1] || '';
        if (last.startsWith('<p class="wiki-quote-by">')) {
            quote.parts[quote.parts.length - 1] = last.replace(/<\/p>$/, `<br>${piece}</p>`);
        } else {
            quote.parts.push(`<p class="wiki-quote-by">${piece}</p>`);
        }
        quote.closed = true;
    };

    for (const para of paras) {
        if (!isQuoteParagraph(para)) {
            flushQuote();
            html.push(renderPlainParagraph(para));
            continue;
        }

        // ">> " keeps extending the citation it belongs to. A later "> "
        // starts another citation, because the attribution sits between them.
        const isAttr = isAttrLine(para[0]);
        if (isAttr) {
            const attrLines = para
                .map(line => (isAttrLine(line) ? line.slice(2).trim() : line))
                .filter(Boolean);
            pushAttr(attrLines);
            continue;
        }

        if (quote?.closed) flushQuote();
        if (!quote) quote = { parts: [], closed: false };

        const split = splitQuoteParagraph(para);
        if (split.body.length) quote.parts.push(`<p>${renderJoinedLines(split.body)}</p>`);
        if (split.closed) pushAttr(split.attr);
    }

    flushQuote();
    return html.join('');
}
