// wiki-consts.js — Shared constants for the Odisseia Wiki
// Defines controlled vocabularies, colors, and labels for structured tags.

// ── Document types ────────────────────────────────────────────────────────────
export const WIKI_TYPES = ['creature', 'place', 'person', 'concept', 'item', 'group'];
export const TYPE_LABELS = {
    creature: 'Monstro',
    place:    'Lugar',
    person:   'Pessoa',
    concept:  'Conceito',
    item:     'Item',
    group:    'Grupo',
};
export const TYPE_PLURALS = {
    creature: 'Monstros',
    place:    'Lugares',
    person:   'Pessoas',
    concept:  'Conceitos',
    item:     'Itens',
    group:    'Grupos',
};
// Material Symbols fallbacks (used in rarely-updated contexts)
export const TYPE_ICONS = {
    creature: 'pets',
    place:    'map',
    person:   'person',
    concept:  'auto_awesome',
    item:     'swords',
    group:    'groups',
};
// SVG icon paths (preferred — match filenames in /image/)
export const TYPE_SVG = {
    creature: '/image/monstro.svg',
    place:    '/image/lugar.svg',
    person:   '/image/pessoa.svg',
    concept:  '/image/conceitos.svg',
    item:     '/image/item.svg',
    group:    '/image/grupo.svg',
};

// ── Threat levels (Ameaça) — 20 levels, inoffensive → catastrophic ────────────
export const THREAT_LEVELS = [
    'Inferillus Inferior',
    'Inferillus Superior',
    'Vassallus Inferior',
    'Vassallus Superior',
    'Castellanos Inferior',
    'Castellanos Superior',
    'Baronia Inferior',
    'Baronia Superior',
    'Marchio Inferior',
    'Marchio Superior',
    'Dominius Inferior',
    'Dominius Superior',
    'Archon Inferior',
    'Archon Superior',
    'Sovereign Inferior',
    'Sovereign Superior',
    'Imperator Inferior',
    'Imperator Superior',
    'Tyrannus Inferior',
    'Tyrannus Superior',
];

// Light-mode colors: bg/text/border per threat level.
// Progress: light green → deep near-black purple.
export const THREAT_COLORS = {
    'Inferillus Inferior':  { bg: '#e8f5e9', text: '#1b5e20', border: '#66bb6a' },
    'Inferillus Superior':  { bg: '#c8e6c9', text: '#1b5e20', border: '#43a047' },
    'Vassallus Inferior':   { bg: '#f1f8e9', text: '#33691e', border: '#9ccc65' },
    'Vassallus Superior':   { bg: '#dcedc8', text: '#33691e', border: '#7cb342' },
    'Castellanos Inferior': { bg: '#fffde7', text: '#7b5800', border: '#fdd835' },
    'Castellanos Superior': { bg: '#fff9c4', text: '#7b5800', border: '#f9a825' },
    'Baronia Inferior':     { bg: '#fff8e1', text: '#6d3b00', border: '#ffb300' },
    'Baronia Superior':     { bg: '#ffe0b2', text: '#6d3b00', border: '#fb8c00' },
    'Marchio Inferior':     { bg: '#fbe9e7', text: '#7f1500', border: '#ff7043' },
    'Marchio Superior':     { bg: '#ffccbc', text: '#7f1500', border: '#f4511e' },
    'Dominius Inferior':    { bg: '#feeeee', text: '#7f0000', border: '#ef5350' },
    'Dominius Superior':    { bg: '#ffcdd2', text: '#7f0000', border: '#e53935' },
    'Archon Inferior':      { bg: '#f9f0fb', text: '#4a148c', border: '#ba68c8' },
    'Archon Superior':      { bg: '#e1bee7', text: '#4a148c', border: '#8e24aa' },
    'Sovereign Inferior':   { bg: '#ede7f6', text: '#311b92', border: '#7e57c2' },
    'Sovereign Superior':   { bg: '#d1c4e9', text: '#311b92', border: '#5e35b1' },
    'Imperator Inferior':   { bg: '#e8eaf6', text: '#1a237e', border: '#5c6bc0' },
    'Imperator Superior':   { bg: '#c5cae9', text: '#1a237e', border: '#3949ab' },
    'Tyrannus Inferior':    { bg: '#1e1a2e', text: '#cec0e8', border: '#5c4a8a' },
    'Tyrannus Superior':    { bg: '#0e0a1a', text: '#b0a0cc', border: '#3a2a5a' },
};

// Dark-mode overrides for threat (body.theme-dark-paper)
export const THREAT_COLORS_DARK = {
    'Inferillus Inferior':  { bg: '#1a3320', text: '#a5d6a7', border: '#388e3c' },
    'Inferillus Superior':  { bg: '#133020', text: '#81c784', border: '#2e7d32' },
    'Vassallus Inferior':   { bg: '#1c301a', text: '#aed581', border: '#558b2f' },
    'Vassallus Superior':   { bg: '#162a12', text: '#9ccc65', border: '#4a7c1f' },
    'Castellanos Inferior': { bg: '#2e2800', text: '#fff176', border: '#f9a825' },
    'Castellanos Superior': { bg: '#261f00', text: '#ffd54f', border: '#f57f17' },
    'Baronia Inferior':     { bg: '#2e2000', text: '#ffcc80', border: '#ef6c00' },
    'Baronia Superior':     { bg: '#261800', text: '#ffb74d', border: '#e65100' },
    'Marchio Inferior':     { bg: '#301000', text: '#ff8a65', border: '#e64a19' },
    'Marchio Superior':     { bg: '#280c00', text: '#ff7043', border: '#bf360c' },
    'Dominius Inferior':    { bg: '#300000', text: '#ef9a9a', border: '#c62828' },
    'Dominius Superior':    { bg: '#280000', text: '#e57373', border: '#b71c1c' },
    'Archon Inferior':      { bg: '#200030', text: '#ce93d8', border: '#7b1fa2' },
    'Archon Superior':      { bg: '#180028', text: '#ba68c8', border: '#6a1b9a' },
    'Sovereign Inferior':   { bg: '#180030', text: '#b39ddb', border: '#512da8' },
    'Sovereign Superior':   { bg: '#100020', text: '#9575cd', border: '#4527a0' },
    'Imperator Inferior':   { bg: '#0a1038', text: '#9fa8da', border: '#283593' },
    'Imperator Superior':   { bg: '#060c28', text: '#7986cb', border: '#1a237e' },
    'Tyrannus Inferior':    { bg: '#0a0818', text: '#cec0e8', border: '#3a2a5a' },
    'Tyrannus Superior':    { bg: '#050310', text: '#b0a0cc', border: '#2a1840' },
};

// ── Domain (Domínio) — 7 elemental domains ────────────────────────────────────
export const DOMAIN_TYPES = ['Céu', 'Água', 'Chamas', 'Terra', 'Luz', 'Trevas', 'Neutro'];

export const DOMAIN_COLORS = {
    'Céu':    { bg: '#fffde7', text: '#7b5800', border: '#fdd835' }, // yellow
    'Água':   { bg: '#e3f2fd', text: '#0d47a1', border: '#1e88e5' }, // blue
    'Chamas': { bg: '#feeeee', text: '#7f0000', border: '#e53935' }, // red
    'Terra':  { bg: '#e8f5e9', text: '#1b5e20', border: '#43a047' }, // green
    'Luz':    { bg: '#fafafa', text: '#424242', border: '#bdbdbd' }, // white/gray
    'Trevas': { bg: '#1a1a1a', text: '#e0e0e0', border: '#616161' }, // dark
    'Neutro': { bg: '#f5f5f5', text: '#616161', border: '#9e9e9e' }, // gray
};

export const DOMAIN_COLORS_DARK = {
    'Céu':    { bg: '#2e2800', text: '#fff176', border: '#f9a825' },
    'Água':   { bg: '#081d30', text: '#90caf9', border: '#1565c0' },
    'Chamas': { bg: '#2e0000', text: '#ef9a9a', border: '#c62828' },
    'Terra':  { bg: '#0a2010', text: '#a5d6a7', border: '#2e7d32' },
    'Luz':    { bg: '#2a2a2a', text: '#f5f5f5', border: '#9e9e9e' },
    'Trevas': { bg: '#050505', text: '#bdbdbd', border: '#424242' },
    'Neutro': { bg: '#1a1a1a', text: '#9e9e9e', border: '#616161' },
};

// ── Alignment (Alinhamento) — 3 moral alignments ─────────────────────────────
export const ALIGNMENT_TYPES = ['Maligno', 'Benigno', 'Neutro'];

export const ALIGNMENT_COLORS = {
    'Maligno': { bg: '#feeeee', text: '#7f0000', border: '#e53935' }, // red
    'Benigno': { bg: '#e3f2fd', text: '#0d47a1', border: '#1e88e5' }, // blue
    'Neutro':  { bg: '#e8f5e9', text: '#1b5e20', border: '#43a047' }, // green
};

export const ALIGNMENT_COLORS_DARK = {
    'Maligno': { bg: '#2e0000', text: '#ef9a9a', border: '#c62828' },
    'Benigno': { bg: '#081d30', text: '#90caf9', border: '#1565c0' },
    'Neutro':  { bg: '#0a2010', text: '#a5d6a7', border: '#2e7d32' },
};

// ── Helper: returns inline style string for a special tag ─────────────────────
// isDark = body.classList.contains('theme-dark-paper')
export function specialTagStyle(colorDef) {
    if (!colorDef) return '';
    return `background:${colorDef.bg};color:${colorDef.text};border-color:${colorDef.border};`;
}

export function getThreatStyle(level, isDark) {
    const map = isDark ? THREAT_COLORS_DARK : THREAT_COLORS;
    return specialTagStyle(map[level]);
}
export function getDomainStyle(domain, isDark) {
    const map = isDark ? DOMAIN_COLORS_DARK : DOMAIN_COLORS;
    return specialTagStyle(map[domain]);
}
export function getAlignmentStyle(alignment, isDark) {
    const map = isDark ? ALIGNMENT_COLORS_DARK : ALIGNMENT_COLORS;
    return specialTagStyle(map[alignment]);
}
