export function initTabs() {
    const tabs = document.querySelectorAll('#tabs li');
    const mobileTabs = document.querySelectorAll('#mobile-tabs li');
    const pages = document.querySelectorAll('.page');
    const wrap = document.querySelector('.page-wrap');

    function switchTab(tabId) {
        tabs.forEach(t => t.classList.remove('active'));
        mobileTabs.forEach(t => t.classList.remove('active'));
        pages.forEach(p => p.classList.remove('active'));

        const activeTab = document.querySelector(`#tabs li[data-tab="${tabId}"]`);
        if (activeTab) activeTab.classList.add('active');

        const activeMobileTab = document.querySelector(`#mobile-tabs li[data-tab="${tabId}"]`);
        if (activeMobileTab) {
            activeMobileTab.classList.add('active');
            activeMobileTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }

        const activePage = document.getElementById(`tab-${tabId}`);
        if (activePage) {
            activePage.classList.add('active');
            wrap.scrollTop = 0;
        }
    }

    tabs.forEach(tab => tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab');
        if (tabId) switchTab(tabId);
    }));

    mobileTabs.forEach(tab => tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab');
        if (tabId) switchTab(tabId);
    }));

    const currentActive = document.querySelector('#tabs li.active');
    if (currentActive) {
        switchTab(currentActive.getAttribute('data-tab'));
    } else {
        switchTab('geral');
    }
}