// src/uiManager.js

let sidebar, mainContent, filterPanel;

/**
 * Inicializa os elementos de UI e adiciona os event listeners.
 */
export function initUIManager() {
    sidebar = document.getElementById('sidebar');
    mainContent = document.getElementById('mainContent');
    filterPanel = document.getElementById('filterPanel');
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const filterToggleBtn = document.getElementById('filterToggle');
    const closeFilterPanelBtn = document.getElementById('closeFilterPanel');

    if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
    if (mobileMenuToggle) mobileMenuToggle.addEventListener('click', toggleSidebar);
    if (filterToggleBtn) filterToggleBtn.addEventListener('click', toggleFilterPanel);
    if (closeFilterPanelBtn) closeFilterPanelBtn.addEventListener('click', () => toggleFilterPanel(false));
    
    window.addEventListener('resize', checkLayout);
    checkLayout(); // Chamada inicial
}

function toggleSidebar() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        sidebar.classList.toggle('open');
    } else {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('full-width');
        sidebar.classList.remove('open');
    }
}

/**
 * Mostra ou esconde o painel de filtros.
 * @param {boolean} [forceOpen] - Força o painel a abrir ou fechar.
 */
export function toggleFilterPanel(forceOpen = null) {
    const isOpen = forceOpen !== null ? forceOpen : !filterPanel.classList.contains('open');
    filterPanel.classList.toggle('open', isOpen);
    if (mainContent && window.innerWidth > 768) {
        mainContent.classList.toggle('filter-panel-open', isOpen);
    }
}

/**
 * Ajusta o layout com base no tamanho da tela.
 */
export function checkLayout() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        sidebar.classList.remove('collapsed');
        mainContent.classList.remove('full-width');
    } else {
        sidebar.classList.remove('open');
    }
     if (filterPanel && mainContent) {
        if (filterPanel.classList.contains('open') && window.innerWidth <= 768) {
             mainContent.classList.remove('filter-panel-open');
        } else if (filterPanel.classList.contains('open')) {
             mainContent.classList.add('filter-panel-open');
        }
    }
}