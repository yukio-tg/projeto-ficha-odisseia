export function initPortrait() {
    const retratoImg = document.getElementById('retrato-img');
    const retratoUrlInput = document.getElementById('retrato-url');
    const limparRetratoBtn = document.getElementById('limpar-retrato');
    const retratoInputs = document.getElementById('retrato-inputs');
    const retratoArea = document.getElementById('retrato-area');

    function limparRetrato() {
        retratoImg.removeAttribute('src');
        retratoImg.style.display = 'none';
        retratoInputs.style.display = '';
        limparRetratoBtn.style.display = 'none';
        retratoUrlInput.value = '';
    }

    retratoImg.addEventListener('load', function () {
        if (!this.src || this.src === window.location.href) return;
        this.style.display = 'block';
        retratoInputs.style.display = 'none';
        limparRetratoBtn.style.display = 'inline-flex';
    });

    retratoImg.addEventListener('error', limparRetrato);

    retratoUrlInput.addEventListener('input', function () {
        const url = this.value.trim();
        if (url) {
            retratoImg.src = url;
        } else {
            limparRetrato();
        }
    });

    limparRetratoBtn.addEventListener('click', limparRetrato);
}