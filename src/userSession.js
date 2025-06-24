// src/userSession.js

/**
 * Busca as informações do usuário no backend e ajusta a UI de acordo.
 * @param {NodeListOf<Element>} navItemLinks - Links da navegação para aplicar restrições de acesso.
 * @returns {Promise<object|null>} - Os dados do usuário ou nulo em caso de falha.
 */
export async function fetchAndSetupUserUI(navItemLinks) {
    try {
        const response = await fetch('/api/userinfo');
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.location.href = '/login';
            }
            throw new Error(`Falha ao buscar informações do usuário: ${response.status}`);
        }
        
        const userInfo = await response.json();
        
        const userNameElement = document.querySelector('.main-header .user-profile .user-name');
        if (userNameElement) {
            userNameElement.textContent = userInfo.username || 'Usuário';
        }

        // Restrição do menu da barra lateral
        if (userInfo.orgao && userInfo.orgao.toUpperCase() !== "ADMINISTRATIVO") {
            navItemLinks.forEach(linkElement => {
                const href = linkElement.getAttribute('href');
                const listItem = linkElement.closest('.nav-item');
                if (listItem) {
                    listItem.style.display = (href === "#financeiro") ? '' : 'none';
                }
            });
        }
        
        return userInfo; // Retorna os dados do usuário

    } catch (error) {
        console.error('Erro ao configurar UI específica do usuário:', error);
        return null;
    }
}