let _limparRetrato = null;
let _retratoImg = null;
let _retratoUrlInput = null;
let _retratoInputs = null;
let _limparRetratoBtn = null;

export function initPortrait() {
    _retratoImg = document.getElementById('retrato-img');
    _retratoUrlInput = document.getElementById('retrato-url');
    _limparRetratoBtn = document.getElementById('limpar-retrato');
    _retratoInputs = document.getElementById('retrato-inputs');

    _limparRetrato = function limparRetrato() {
        _retratoImg.removeAttribute('src');
        _retratoImg.style.display = 'none';
        _retratoInputs.style.display = '';
        _limparRetratoBtn.style.display = 'none';
        _retratoUrlInput.value = '';
    };

    _retratoImg.addEventListener('load', function () {
        if (!this.src || this.src === window.location.href) return;
        this.style.display = 'block';
        _retratoInputs.style.display = 'none';
        _limparRetratoBtn.style.display = 'inline-flex';
    });

    _retratoImg.addEventListener('error', _limparRetrato);

    _retratoUrlInput.addEventListener('input', function () {
        const url = this.value.trim();
        if (url) {
            _retratoImg.src = url;
        } else {
            _limparRetrato();
        }
    });

    _limparRetratoBtn.addEventListener('click', _limparRetrato);
}

/**
 * Aplica uma URL de retrato programaticamente (ex.: ao carregar ficha salva).
 * Deve ser chamado após initPortrait() e após preencher o campo retrato-url.
 */
export function applyPortraitUrl(url) {
    if (!_retratoImg || !_retratoUrlInput) return;
    const trimmed = (url || '').trim();
    _retratoUrlInput.value = trimmed;
    if (trimmed) {
        _retratoImg.src = trimmed;
    } else if (_limparRetrato) {
        _limparRetrato();
    }
}