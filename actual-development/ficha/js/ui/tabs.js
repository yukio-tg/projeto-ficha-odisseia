import { checkBestaTabVisibility } from './besta.js';
import { initPlayView } from './play.js';

const MORE_TABS = new Set(['pericias', 'habilidades', 'inventario', 'besta', 'configuracoes']);

export function initTabs() {
    const tabs = document.querySelectorAll('#tabs li');
    const mobileTabs = document.querySelectorAll('#mobile-tabs li');
    const moreButtons = document.querySelectorAll('#mobile-more-sheet [data-tab]');
    const moreSheet = document.getElementById('mobile-more-sheet');
    const moreBtn = document.getElementById('mobile-more-btn');
    const pages = document.querySelectorAll('.page');
    const wrap = document.querySelector('.page-wrap');
    const mobileQuery = window.matchMedia('(max-width: 600px)');
    const play = initPlayView({ openTab: (tabId) => switchTab(tabId) });

    function closeMore() {
        moreSheet?.classList.remove('is-open');
        moreBtn?.setAttribute('aria-expanded', 'false');
    }

    function toggleMore() {
        const open = moreSheet?.classList.toggle('is-open');
        moreBtn?.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function highlightMobile(tabId) {
        mobileTabs.forEach(t => t.classList.remove('active'));
        moreButtons.forEach(b => b.classList.remove('active'));
        if (tabId === 'mesa' || tabId === 'geral') {
            document.querySelector('#mobile-tabs li[data-tab="mesa"]')?.classList.add('active');
            return;
        }
        if (MORE_TABS.has(tabId)) {
            moreBtn?.classList.add('active');
            document.querySelector(`#mobile-more-sheet [data-tab="${tabId}"]`)?.classList.add('active');
            return;
        }
        document.querySelector(`#mobile-tabs li[data-tab="${tabId}"]`)?.classList.add('active');
    }

    function switchTab(tabId) {
        if (!tabId || tabId === 'mais') return;
        closeMore();
        tabs.forEach(t => t.classList.remove('active'));
        pages.forEach(p => p.classList.remove('active'));

        const activeTab = document.querySelector(`#tabs li[data-tab="${tabId}"]`);
        if (activeTab) activeTab.classList.add('active');
        highlightMobile(tabId);

        const activePage = document.getElementById(`tab-${tabId}`);
        if (activePage) {
            activePage.classList.add('active');
            if (wrap) wrap.scrollTop = 0;
        }
        if (tabId === 'mesa') play.refresh();
    }

    tabs.forEach(tab => tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab');
        if (tabId) switchTab(tabId);
    }));

    mobileTabs.forEach(tab => tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab');
        if (tabId === 'mais') {
            toggleMore();
            return;
        }
        if (tabId) switchTab(tabId);
    }));

    moreButtons.forEach(btn => btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        if (tabId) switchTab(tabId);
    }));

    document.addEventListener('click', (event) => {
        if (!moreSheet?.classList.contains('is-open')) return;
        if (event.target.closest('#mobile-nav')) return;
        closeMore();
    });

    if (mobileQuery.matches) {
        switchTab('mesa');
    } else {
        const currentActive = document.querySelector('#tabs li.active');
        switchTab(currentActive?.getAttribute('data-tab') || 'geral');
    }

    mobileQuery.addEventListener('change', (event) => {
        if (!event.matches && document.getElementById('tab-mesa')?.classList.contains('active')) {
            switchTab('geral');
        }
    });

    checkBestaTabVisibility();
}
