// src/main.js

import { initUIManager } from './uiManager.js';
import { fetchAndSetupUserUI } from './userSession.js';
import { loadContentByHash, setActiveNavLink } from './router.js';
import { clearFilters } from './financeiroFilters.js';

document.addEventListener('DOMContentLoaded', () => {
    // A função principal que orquestra o início da aplicação.
    async function initializeApp() {
        
        // 1. Inicializa os componentes de UI (sidebar, painel de filtro, etc.)
        initUIManager();

        // 2. Busca dados do usuário, ajusta o menu e retorna os dados do usuário
        const navItemLinks = document.querySelectorAll('.sidebar-nav .nav-item a');
        const userInfo = await fetchAndSetupUserUI(navItemLinks);

        // 3. Lógica de redirecionamento do usuário (essencial para usuários não-admin)
        if (userInfo && userInfo.orgao && userInfo.orgao.toUpperCase() !== "ADMINISTRATIVO") {
            const currentHash = window.location.hash;
            if (currentHash === "" || currentHash === "#" || currentHash === "#painel-geral") {
                // Força a navegação para a página financeira, o que vai disparar o 'hashchange'
                window.location.hash = '#financeiro';
            }
        }
        
        // 4. Configura o listener para mudanças de rota (navegação entre páginas)
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash || '#painel-geral';
            loadContentByHash(hash);
            setActiveNavLink(hash);
        });

        // 5. Carrega o conteúdo inicial com base no hash que já está na URL
        // (Isso garante que a página carregue corretamente se o usuário chegar via /#financeiro)
        const initialHash = window.location.hash || '#painel-geral';
        loadContentByHash(initialHash);
        setActiveNavLink(initialHash);

        // 6. Liga o evento do botão "Limpar Filtros" à sua função no módulo de filtros
        const clearFiltersBtn = document.getElementById('clearFilters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', clearFilters);
        }

        // 7. Atualiza o ano no rodapé
        const currentYearSpan = document.getElementById('currentYear');
        if (currentYearSpan) {
            currentYearSpan.textContent = new Date().getFullYear();
        }
    }

    // Inicia a aplicação!
    initializeApp();
});