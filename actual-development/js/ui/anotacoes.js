let _currentState = { html: '', galeria: [] };

function loadState() {
    return _currentState;
}

function saveState(state) {
    _currentState = state;
    document.dispatchEvent(new CustomEvent('ficha:changed'));
}

export function getAnotacoesState() {
    return { html: _currentState.html || '', galeria: [...(_currentState.galeria || [])] };
}

export function setAnotacoesState(data) {
    if (!data) return;
    _currentState = { html: data.html || '', galeria: data.galeria || [] };
    const editor = document.getElementById('anot-editor');
    if (editor) editor.innerHTML = _currentState.html;
    const page = document.getElementById('tab-anotacoes');
    if (!page) return;
    const gallerySection = page.querySelector('.anot-gallery-section');
    if (gallerySection) {
        const grid = gallerySection.querySelector('.anot-gallery-grid');
        if (grid) {
            const state = _currentState;
            const count = gallerySection.querySelector('.anot-gallery-count');
            if (count) count.textContent = state.galeria.length ? `${state.galeria.length} imagem(ns)` : '';
            renderGallery(gallerySection, state);
        }
    }
}

// ─── Toolbar ───────────────────────────────────────────────────────────────

const TOOLBAR_ACTIONS = [
    { cmd: 'bold',          icon: 'format_bold',          title: 'Negrito' },
    { cmd: 'italic',        icon: 'format_italic',        title: 'Itálico' },
    { cmd: 'underline',     icon: 'format_underlined',    title: 'Sublinhado' },
    { cmd: 'strikeThrough', icon: 'format_strikethrough', title: 'Tachado' },
    { sep: true },
    { cmd: 'insertUnorderedList', icon: 'format_list_bulleted', title: 'Lista' },
    { cmd: 'insertOrderedList',   icon: 'format_list_numbered', title: 'Lista numerada' },
    { sep: true },
    { cmd: 'justifyLeft',   icon: 'format_align_left',   title: 'Alinhar à esquerda' },
    { cmd: 'justifyCenter', icon: 'format_align_center', title: 'Centralizar' },
    { cmd: 'justifyRight',  icon: 'format_align_right',  title: 'Alinhar à direita' },
    { sep: true },
    { cmd: 'paragraph', icon: 'subject',       title: 'Texto padrão' },
    { cmd: 'heading1',  icon: 'title',         title: 'Título' },
    { cmd: 'heading2',  icon: 'text_fields',   title: 'Subtítulo' },
    { sep: true },
    { cmd: 'undo',   icon: 'undo',   title: 'Desfazer' },
    { cmd: 'redo',   icon: 'redo',   title: 'Refazer' },
    { sep: true },
    { cmd: 'removeFormat', icon: 'format_clear', title: 'Limpar formatação' },
];

function buildToolbar(editor) {
    const bar = document.createElement('div');
    bar.className = 'anot-toolbar';

    TOOLBAR_ACTIONS.forEach(item => {
        if (item.sep) {
            const s = document.createElement('span');
            s.className = 'anot-toolbar-sep';
            bar.appendChild(s);
            return;
        }

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'anot-toolbar-btn';
        btn.title = item.title;
        btn.setAttribute('data-cmd', item.cmd);
        btn.innerHTML = `<span class="material-symbols-outlined">${item.icon}</span>`;

        btn.addEventListener('mousedown', e => {
            e.preventDefault();
            if (item.cmd === 'paragraph') {
                document.execCommand('formatBlock', false, 'p');
            } else if (item.cmd === 'heading1') {
                document.execCommand('formatBlock', false, 'h3');
            } else if (item.cmd === 'heading2') {
                document.execCommand('formatBlock', false, 'h4');
            } else {
                document.execCommand(item.cmd, false, null);
            }
            editor.focus();
            updateToolbarState(bar, editor);
        });

        bar.appendChild(btn);
    });

    editor.addEventListener('keyup', () => updateToolbarState(bar, editor));
    editor.addEventListener('mouseup', () => updateToolbarState(bar, editor));
    editor.addEventListener('selectionchange', () => updateToolbarState(bar, editor));

    return bar;
}

function updateToolbarState(bar, editor) {
    const STATE_CMDS = ['bold', 'italic', 'underline', 'strikeThrough',
        'insertUnorderedList', 'insertOrderedList',
        'justifyLeft', 'justifyCenter', 'justifyRight'];
    STATE_CMDS.forEach(cmd => {
        const btn = bar.querySelector(`[data-cmd="${cmd}"]`);
        if (btn) btn.classList.toggle('active', document.queryCommandState(cmd));
    });
}

// ─── Gallery ───────────────────────────────────────────────────────────────

function renderGallery(container, state) {
    const grid = container.querySelector('.anot-gallery-grid');
    grid.innerHTML = '';

    if (!state.galeria.length) {
        const empty = document.createElement('div');
        empty.className = 'anot-gallery-empty';
        empty.textContent = 'Nenhuma imagem adicionada ainda.';
        grid.appendChild(empty);
        return;
    }

    state.galeria.forEach((item, idx) => {
        const card = document.createElement('div');
        card.className = 'anot-gallery-card';

        const img = document.createElement('img');
        img.className = 'anot-gallery-img';
        img.src = item.url;
        img.alt = item.caption || '';
        img.title = item.caption || item.url;
        img.loading = 'lazy';
        img.addEventListener('error', () => {
            img.classList.add('anot-gallery-img-broken');
            img.removeAttribute('src');
        });

        img.addEventListener('click', () => openLightbox(item.url, item.caption));

        const actions = document.createElement('div');
        actions.className = 'anot-gallery-card-actions';

        const captionEl = document.createElement('span');
        captionEl.className = 'anot-gallery-caption';
        captionEl.textContent = item.caption || '';

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'anot-gallery-del';
        delBtn.title = 'Remover imagem';
        delBtn.innerHTML = '<span class="material-symbols-outlined">delete</span>';
        delBtn.addEventListener('click', () => {
            state.galeria.splice(idx, 1);
            saveState(state);
            renderGallery(container, state);
        });

        actions.appendChild(captionEl);
        actions.appendChild(delBtn);
        card.appendChild(img);
        card.appendChild(actions);
        grid.appendChild(card);
    });
}

function buildGallerySection(state) {
    const section = document.createElement('div');
    section.className = 'anot-gallery-section';

    const header = document.createElement('div');
    header.className = 'anot-gallery-header';
    header.innerHTML = `
        <span class="material-symbols-outlined anot-gallery-icon">photo_library</span>
        <span class="anot-gallery-title">Galeria de Imagens</span>
        <span class="anot-gallery-count"></span>
    `;

    const addRow = document.createElement('div');
    addRow.className = 'anot-gallery-add-row';

    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.className = 'anot-gallery-url-input';
    urlInput.placeholder = 'URL da imagem (https://...)';

    const captionInput = document.createElement('input');
    captionInput.type = 'text';
    captionInput.className = 'anot-gallery-caption-input';
    captionInput.placeholder = 'Legenda (opcional)';
    captionInput.maxLength = 80;

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'anot-gallery-add-btn';
    addBtn.innerHTML = '<span class="material-symbols-outlined">add_photo_alternate</span> Adicionar';

    const errorEl = document.createElement('span');
    errorEl.className = 'anot-gallery-error';

    function tryAdd() {
        const url = urlInput.value.trim();
        if (!url) { showError('Insira uma URL válida.'); return; }
        try { new URL(url); } catch { showError('URL inválida.'); return; }

        state.galeria.push({ url, caption: captionInput.value.trim() });
        saveState(state);
        renderGallery(section, state);
        updateCount();
        urlInput.value = '';
        captionInput.value = '';
        errorEl.textContent = '';
    }

    function showError(msg) {
        errorEl.textContent = msg;
        setTimeout(() => { errorEl.textContent = ''; }, 2500);
    }

    function updateCount() {
        const c = section.querySelector('.anot-gallery-count');
        if (c) c.textContent = state.galeria.length ? `${state.galeria.length} imagem(ns)` : '';
    }

    addBtn.addEventListener('click', tryAdd);
    urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryAdd(); });

    addRow.appendChild(urlInput);
    addRow.appendChild(captionInput);
    addRow.appendChild(addBtn);
    addRow.appendChild(errorEl);

    const grid = document.createElement('div');
    grid.className = 'anot-gallery-grid';

    section.appendChild(header);
    section.appendChild(addRow);
    section.appendChild(grid);

    renderGallery(section, state);
    updateCount();

    return section;
}

// ─── Lightbox ──────────────────────────────────────────────────────────────

function openLightbox(url, caption) {
    const existing = document.getElementById('anot-lightbox');
    if (existing) existing.remove();

    const lb = document.createElement('div');
    lb.id = 'anot-lightbox';
    lb.className = 'anot-lightbox';
    lb.innerHTML = `
        <div class="anot-lightbox-backdrop"></div>
        <div class="anot-lightbox-content">
            <button class="anot-lightbox-close" title="Fechar">
                <span class="material-symbols-outlined">close</span>
            </button>
            <img class="anot-lightbox-img" src="${url}" alt="${caption || ''}">
            ${caption ? `<div class="anot-lightbox-caption">${caption}</div>` : ''}
        </div>
    `;

    const close = () => lb.remove();
    lb.querySelector('.anot-lightbox-backdrop').addEventListener('click', close);
    lb.querySelector('.anot-lightbox-close').addEventListener('click', close);
    document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });

    document.body.appendChild(lb);
}

// ─── Init ──────────────────────────────────────────────────────────────────

export function initAnotacoes() {
    const page = document.getElementById('tab-anotacoes');
    if (!page) return;

    const state = loadState();

    // ── Editor section ──
    const editorSection = document.createElement('div');
    editorSection.className = 'anot-editor-section';

    const editorHeader = document.createElement('div');
    editorHeader.className = 'anot-editor-header';
    editorHeader.innerHTML = `
        <span class="material-symbols-outlined anot-editor-icon">edit_note</span>
        <span class="anot-editor-title">Anotações</span>
    `;

    const editor = document.createElement('div');
    editor.id = 'anot-editor';
    editor.className = 'anot-editor';
    editor.contentEditable = 'true';
    editor.spellcheck = true;
    editor.setAttribute('data-placeholder', 'Comece a escrever suas anotações aqui...');
    if (state.html) editor.innerHTML = state.html;

    const toolbar = buildToolbar(editor);

    editor.addEventListener('paste', e => {
        e.preventDefault();
        const text = e.clipboardData?.getData('text/plain') || '';
        document.execCommand('insertText', false, text);
    });

    let saveTimer = null;
    editor.addEventListener('input', () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            state.html = editor.innerHTML;
            saveState(state);
        }, 600);
    });

    editorSection.appendChild(editorHeader);
    editorSection.appendChild(toolbar);
    editorSection.appendChild(editor);

    // ── Gallery section ──
    const gallerySection = buildGallerySection(state);

    page.appendChild(editorSection);
    page.appendChild(gallerySection);
}
