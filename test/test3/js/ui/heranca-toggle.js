export function initHerancaToggle() {
    const btn = document.getElementById('heranca-options-btn');
    const lista = document.querySelector('ol.heranca-options');
    if (!btn || !lista) return;
    
    const arrowRight = btn.querySelector('span:first-child');
    const arrowDown = btn.querySelector('span:last-child');
    
    btn.addEventListener('click', () => {
        if (lista.style.display === 'none' || lista.style.display === '') {
            lista.style.display = 'block';
            arrowRight.style.display = 'none';
            arrowDown.style.display = 'inline-block';
        } else {
            lista.style.display = 'none';
            arrowRight.style.display = 'inline-block';
            arrowDown.style.display = 'none';
        }
    });
}