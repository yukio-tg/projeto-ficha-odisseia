import { CLASSES_PADRAO, CLASSE_RAMOS, TODOS_RAMOS } from '../config/classes.js';
import { HERANCAS_PADRAO } from '../config/herancas.js';

function criarDatalist(id, opcoes) {
    let dl = document.getElementById(id);
    if (!dl) {
        dl = document.createElement('datalist');
        dl.id = id;
        document.body.appendChild(dl);
    }
    dl.innerHTML = '';
    opcoes.forEach(op => {
        const opt = document.createElement('option');
        opt.value = op;
        dl.appendChild(opt);
    });
}

export function atualizarDatalistRamos() {
    const classeInput = document.querySelector('[data-field="classe-nome"]');
    if (!classeInput) return;
    const classeDigitada = classeInput.value.trim();
    const classeChave = CLASSES_PADRAO.find(c => c.toLowerCase() === classeDigitada.toLowerCase());
    const opcoes = classeChave ? CLASSE_RAMOS[classeChave] : TODOS_RAMOS;
    criarDatalist('lista-ramos', opcoes);
}

export function initAutocomplete() {
    criarDatalist('lista-classes', CLASSES_PADRAO);
    criarDatalist('lista-herancas', HERANCAS_PADRAO);
    atualizarDatalistRamos();

    const classeInput = document.querySelector('[data-field="classe-nome"]');
    if (classeInput) {
        classeInput.setAttribute('list', 'lista-classes');
        classeInput.addEventListener('input', atualizarDatalistRamos);
        classeInput.addEventListener('change', atualizarDatalistRamos);
    }
    const ramoInput = document.querySelector('[data-field="ramo-nome"]');
    if (ramoInput) ramoInput.setAttribute('list', 'lista-ramos');
    const herancaInput = document.querySelector('[data-field="heranca-nome"]');
    if (herancaInput) herancaInput.setAttribute('list', 'lista-herancas');
}