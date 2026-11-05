// Vista de jogo no celular: espelha PV/PM, condições e ataques.
// Os nós usam data-mirror (não data-field) para ficar fora do serializeFields.

const MIRROR_FIELDS = ['pv-atual', 'pv-total', 'mana-atual', 'mana-total'];

function fieldValue(field) {
    const el = document.querySelector(`[data-field="${field}"]`);
    if (!el || !('value' in el)) return '';
    return String(el.value ?? '').trim();
}

function syncMirrors() {
    MIRROR_FIELDS.forEach(field => {
        const value = fieldValue(field);
        document.querySelectorAll(`[data-mirror="${field}"]`).forEach(node => {
            node.textContent = value === '' ? '0' : value;
        });
    });
}

function emptyItem(text) {
    const li = document.createElement('li');
    li.className = 'play-empty';
    li.textContent = text;
    return li;
}

function syncConditions() {
    const root = document.getElementById('play-condicoes');
    if (!root) return;
    const cards = document.querySelectorAll('#condicoes-container .combat-card--condicao');
    const items = [];
    cards.forEach(card => {
        const id = card.dataset.condicaoId;
        if (!id) return;
        const nome = fieldValue(`condicao-nome-${id}`);
        const qtd = fieldValue(`condicao-duracao-qtd-${id}`);
        const tipo = fieldValue(`condicao-duracao-tipo-${id}`);
        const desc = fieldValue(`condicao-desc-${id}`);
        if (!nome && !desc) return;

        const li = document.createElement('li');
        li.className = 'play-condition';

        const title = document.createElement('div');
        title.className = 'play-condition-name';
        title.textContent = nome || 'Condição';

        const meta = document.createElement('div');
        meta.className = 'play-condition-meta';
        if (tipo === 'indefinido') meta.textContent = 'Indefinido';
        else if (qtd || tipo) meta.textContent = [qtd, tipo].filter(Boolean).join(' ');

        li.append(title, meta);
        if (desc) {
            const note = document.createElement('div');
            note.className = 'play-condition-desc';
            note.textContent = desc;
            li.appendChild(note);
        }
        items.push(li);
    });
    root.replaceChildren(...(items.length ? items : [emptyItem('Nenhuma condição ativa.')]));
}

function syncAttacks() {
    const root = document.getElementById('play-ataques');
    if (!root) return;
    const cards = document.querySelectorAll('#ataques-container .combat-card--ataque');
    const items = [];
    cards.forEach(card => {
        const id = card.dataset.ataqueId;
        if (!id) return;
        const nome = fieldValue(`ataque-nome-${id}`);
        const acerto = fieldValue(`ataque-acerto-${id}`);
        const dano = fieldValue(`ataque-dano-${id}`);
        const tipo = fieldValue(`ataque-tipo-${id}`);

        const li = document.createElement('li');
        li.className = 'play-attack';

        const title = document.createElement('div');
        title.className = 'play-attack-name';
        title.textContent = nome || 'Ataque';

        const nums = document.createElement('div');
        nums.className = 'play-attack-nums';

        const hit = document.createElement('span');
        hit.className = 'play-attack-acerto';
        hit.textContent = acerto || '—';

        const dmg = document.createElement('span');
        dmg.className = 'play-attack-dano';
        dmg.textContent = dano || '—';

        nums.append(hit, dmg);
        li.append(title, nums);
        if (tipo) {
            const kind = document.createElement('div');
            kind.className = 'play-attack-tipo';
            kind.textContent = tipo;
            li.appendChild(kind);
        }
        items.push(li);
    });
    root.replaceChildren(...(items.length ? items : [emptyItem('Nenhum ataque na ficha.')]));
}

function refreshPlayView() {
    syncMirrors();
    syncConditions();
    syncAttacks();
}

function watchSources() {
    let frame = 0;
    const schedule = () => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
            frame = 0;
            refreshPlayView();
        });
    };

    const onField = (event) => {
        const field = event.target?.getAttribute?.('data-field');
        if (!field) return;
        if (field.startsWith('ataque-') || field.startsWith('condicao-') || MIRROR_FIELDS.includes(field)) {
            schedule();
        }
    };
    document.addEventListener('input', onField);
    document.addEventListener('change', onField);
    document.addEventListener('ficha:loaded', refreshPlayView);

    ['ataques-container', 'condicoes-container'].forEach(id => {
        const node = document.getElementById(id);
        if (!node) return;
        new MutationObserver(schedule).observe(node, { childList: true, subtree: true });
    });
}

function disableCrestShortcut() {
    const crest = document.querySelector('.header-crest');
    if (!crest) return;
    crest.addEventListener('click', (event) => {
        if (!window.matchMedia('(max-width: 600px)').matches) return;
        event.preventDefault();
        event.stopImmediatePropagation();
    }, true);
}

export function initPlayView({ openTab }) {
    watchSources();
    disableCrestShortcut();
    document.getElementById('play-open-geral')?.addEventListener('click', () => openTab('geral'));
    document.getElementById('geral-open-mesa')?.addEventListener('click', () => openTab('mesa'));
    refreshPlayView();
    return { refresh: refreshPlayView };
}
