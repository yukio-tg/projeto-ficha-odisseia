export function initCustomAutocomplete(inputElement, optionsList, onSelect) {
    const dropdown = document.createElement('ul');
    dropdown.className = 'custom-autocomplete-dropdown';
    inputElement.parentNode.appendChild(dropdown);

    inputElement.addEventListener('input', () => {
        const value = inputElement.value.toLowerCase();
        const filtered = optionsList.filter(opt => opt.toLowerCase().includes(value));
        renderDropdown(filtered);
    });

    function renderDropdown(items) {
        dropdown.innerHTML = '';
        items.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            li.addEventListener('click', () => {
                inputElement.value = item;
                dropdown.style.display = 'none';
                if (onSelect) onSelect(item);
            });
            dropdown.appendChild(li);
        });
        dropdown.style.display = items.length ? 'block' : 'none';
    }
}