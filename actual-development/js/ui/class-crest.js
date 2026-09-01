// ui/class-crest.js
// Substitui o ⚜ do header-crest pelo ícone SVG da classe escolhida.
// O SVG é carregado inline com fill="currentColor" para herdar var(--gold2)
// do .header-crest e receber o mesmo glow/efeito do símbolo original.

/** Mapeia slug normalizado da classe → nome do arquivo SVG (sem extensão). */
const CLASS_SVG_MAP = {
    coracao:      'coracao',
    arcanista:    'arcanista',
    certeiro:     'certeiro',
    terrivel:     'terrivel',
    feromantico:  'feromantico',
    teurgista:    'teurgista',
    engenhoso:    'engenhoso',
    treinador:    'treinador',
};

const SVG_BASE_PATH = '/image/';
const FALLBACK_HTML = '⚜';

/** Cache de conteúdo SVG já transformado, indexado pelo slug. */
const _cache = {};

/** Remove acentos e converte para minúsculas (igual ao normalizar() de utils.js). */
function slug(str) {
    return (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

/**
 * Busca o SVG, substitui fill branco por currentColor e remove o fundo
 * transparente, retornando o HTML do elemento <svg> transformado.
 */
async function carregarSVG(nome) {
    if (_cache[nome] !== undefined) return _cache[nome];
    try {
        const res = await fetch(`${SVG_BASE_PATH}${nome}.svg`);
        if (!res.ok) { _cache[nome] = null; return null; }
        let text = await res.text();
        // Fundo opacidade quase nula → sem fill
        text = text.replace(/fill="#000000"\s+fill-opacity="0\.01"/gi, 'fill="none"');
        // Ícone branco → herda cor do elemento pai (currentColor)
        text = text.replace(/fill="#fff"/gi, 'fill="currentColor"');
        text = text.replace(/fill="#ffffff"/gi, 'fill="currentColor"');
        // Remove dimensões fixas do atributo style para que o CSS controle o tamanho
        text = text.replace(/\s*style="[^"]*height:\s*\d+px[^"]*width:\s*\d+px[^"]*"/gi, '');
        text = text.replace(/\s*style="[^"]*width:\s*\d+px[^"]*height:\s*\d+px[^"]*"/gi, '');
        _cache[nome] = text;
        return text;
    } catch {
        _cache[nome] = null;
        return null;
    }
}

/**
 * Atualiza o .header-crest com o SVG da classe ou volta ao ⚜ se vazio/inválido.
 */
async function atualizarCrest(crest, nomeClasse) {
    const key = slug(nomeClasse);
    const nome = CLASS_SVG_MAP[key];

    if (!nome) {
        crest.innerHTML = FALLBACK_HTML;
        return;
    }

    const svgHTML = await carregarSVG(nome);
    if (!svgHTML) {
        crest.innerHTML = FALLBACK_HTML;
        return;
    }

    crest.innerHTML = svgHTML;
}

/**
 * Inicializa o sistema de ícone de classe no header-crest.
 * Deve ser chamado após o DOM estar pronto.
 */
export function initClassCrest() {
    const crest = document.querySelector('.header-crest');
    const classeInput = document.querySelector('[data-field="classe-nome"]');
    if (!crest || !classeInput) return;

    const update = () => atualizarCrest(crest, classeInput.value);

    classeInput.addEventListener('input',  update);
    classeInput.addEventListener('change', update);
}

/**
 * Lê o valor atual do campo classe-nome e atualiza o crest.
 * Chamar após deserializeSheet, que preenche o campo sem disparar eventos DOM.
 */
export function refreshCrest() {
    const crest = document.querySelector('.header-crest');
    const classeInput = document.querySelector('[data-field="classe-nome"]');
    if (!crest || !classeInput) return;
    atualizarCrest(crest, classeInput.value);
}
