// src/router.js
import { initFinanceiroPage } from './page_financeiro.js';
import { initializeFilters, destroyFilters } from './financeiroFilters.js'; 
import { toggleFilterPanel } from './uiManager.js';

const routes = {
    // Adicionei algumas rotas de exemplo do seu script.js original
    '#painel-geral': { filePath: 'pages/_painel_geral_content.html', title: 'Painel Geral', description: 'Visão geral.', initFunction: null },
    '#financeiro': { 
        filePath: 'pages/_financeiro_content.html', 
        title: 'Resumo Financeiro', 
        description: 'Status.', 
        initFunction: () => initFinanceiroPage(initializeFilters) 
    },
    // Adicione suas outras rotas aqui...
};

export async function loadContentByHash(hash) {
    const dynamicContentArea = document.getElementById('dynamicContentArea');
    const filterToggleBtn = document.getElementById('filterToggle');
    // ✅ LÓGICA DE ATUALIZAÇÃO DO CABEÇALHO (DO SCRIPT.JS ORIGINAL)
    const pageHeaderTitleDiv = document.getElementById('pageHeaderTitle');
    
    if (window.location.hash !== '#financeiro') {
        destroyFilters(); 
        toggleFilterPanel(false);
        if (filterToggleBtn) filterToggleBtn.style.display = 'none';
    } else {
        if (filterToggleBtn) filterToggleBtn.style.display = 'block';
    }
    
    const currentRoute = routes[hash] || routes['#painel-geral'];
    
    try {
        if (dynamicContentArea) {
            dynamicContentArea.innerHTML = '<p style="text-align:center; padding:20px;">Carregando...</p>';
            const response = await fetch(currentRoute.filePath);
            if (!response.ok) throw new Error(`Não foi possível carregar o conteúdo da página.`);
            dynamicContentArea.innerHTML = await response.text();
        }

        // ✅ ATUALIZA O TÍTULO E A DESCRIÇÃO DA PÁGINA
        if (pageHeaderTitleDiv) {
            pageHeaderTitleDiv.querySelector('h1').textContent = currentRoute.title;
            pageHeaderTitleDiv.querySelector('p').textContent = currentRoute.description;
        }
        document.title = `${currentRoute.title} - Dashboard`;
        
        if (currentRoute.initFunction) {
            await currentRoute.initFunction();
        }
    } catch (error) {
        console.error(`Erro ao carregar a rota ${hash}:`, error);
        if (dynamicContentArea) {
            dynamicContentArea.innerHTML = `<p style="color:red;text-align:center;">${error.message}</p>`;
        }
    }
}

// ✅ FUNÇÃO ESSENCIAL QUE ESTAVA FALTANDO
export function setActiveNavLink(hash) {
    const navItemLinks = document.querySelectorAll('.sidebar-nav .nav-item a');
    const hashToUse = hash || '#painel-geral';

    navItemLinks.forEach(link => {
        const listItem = link.parentElement;
        if (listItem) {
            listItem.classList.remove('active');
            if (link.getAttribute('href') === hashToUse) {
                listItem.classList.add('active');
            }
        }
    });

    // Fecha o menu mobile após clicar em um link
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('open') && window.innerWidth <= 768) {
        sidebar.classList.remove('open');
    }
}