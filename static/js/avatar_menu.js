// Arquivo: static/js/avatar_menu.js
// Lógica para o novo Header Unificado.
document.addEventListener('DOMContentLoaded', () => {
    
    // A função agora é global para poder ser chamada de outros scripts (como minha_conta.js)
    window.buildUnifiedHeader = function() {
        const actionsContainer = document.querySelector('.header-actions');
        if (!actionsContainer) return;

        // Pega os dados do usuário da tag body
        const bodyData = document.body.dataset;
        const isLoggedIn = !!bodyData.username && bodyData.username !== 'None';
        const isAdmin = bodyData.userRole === 'Admin';

        // Se o usuário não estiver logado, o HTML padrão já está correto.
        if (!isLoggedIn) {
            return;
        }

        // Se estiver logado, limpamos o container e construímos o menu dinâmico.
        actionsContainer.innerHTML = ''; 

        // Lógica para decidir o conteúdo do avatar
        const userInitial = (bodyData.username || 'U').charAt(0).toUpperCase();
        const avatarContent = bodyData.avatarUrl && bodyData.avatarUrl !== 'None' ?
            `<img src="${bodyData.avatarUrl}" alt="Avatar" referrerpolicy="no-referrer">` : userInitial;
        
        // Constrói os links específicos para Admin ou Cliente
        const roleSpecificLinks = isAdmin ?
            `<a href="/" target="_blank" class="avatar-menu-item"><i class="fas fa-eye"></i><span>Ver Site Público</span></a>
             <a href="/admin/configuracoes" class="avatar-menu-item"><i class="fas fa-user-cog"></i><span>Configurações</span></a>` :
            `<a href="/dashboard" class="avatar-menu-item"><i class="fas fa-shopping-cart"></i><span>Meus Pedidos</span></a>
             <a href="/minha-conta" class="avatar-menu-item"><i class="fas fa-user-cog"></i><span>Minha Conta</span></a>`;

        // Define o HTML do sino de notificação (apenas para clientes)
        const notificationBellHTML = !isAdmin ? `
            <div class="notification-bell" id="client-notification-bell-btn">
                <i class="fas fa-bell"></i>
                <span class="notification-badge" id="client-notification-badge" style="display: none;">0</span>
                <div class="dropdown-menu" id="client-notification-dropdown">
                    <div class="dropdown-header">Notificações</div>
                    <div id="client-notification-list"></div>
                </div>
            </div>` : '';

        // Monta o HTML final para as ações da direita no header
        const rightSideActions = `
            <button class="theme-switcher" aria-label="Mudar tema">
                <svg class="icon-sun" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.106a.75.75 0 010 1.06l-1.591 1.59a.75.75 0 11-1.06-1.06l1.59-1.591a.75.75 0 011.06 0zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5h2.25a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 01-1.06 0l-1.59-1.591a.75.75 0 111.06-1.06l1.591 1.59a.75.75 0 010 1.061zM12 18a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM5.106 17.834a.75.75 0 010-1.06l1.591-1.59a.75.75 0 111.06 1.06l-1.59 1.591a.75.75 0 01-1.06 0zM4.5 12a.75.75 0 01-.75.75H1.5a.75.75 0 010-1.5h2.25a.75.75 0 01.75.75zM6.106 5.106a.75.75 0 011.06 0l1.59 1.591a.75.75 0 11-1.06 1.06L6.106 6.166a.75.75 0 010-1.06z"/></svg>
                <svg class="icon-moon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 10.5c0 5.385 4.365 9.75 9.75 9.75 2.135 0 4.137-.69 5.808-1.846z"/></svg>
            </button>
            ${notificationBellHTML}
            <div class="avatar-menu-container">
                <button id="avatar-button" class="avatar-menu-button">${avatarContent}</button>
                <div id="avatar-menu" class="avatar-menu">
                    <div class="avatar-menu-header">
                        <div class="avatar-menu-username">${bodyData.username}</div>
                    </div>
                    ${roleSpecificLinks}
                    <a href="/ajuda" class="avatar-menu-item"><i class="fas fa-question-circle"></i><span>Ajuda & Suporte</span></a>
                    <div class="avatar-menu-separator"></div>
                    <a href="/logout" class="avatar-menu-item logout-link"><i class="fas fa-sign-out-alt"></i><span>Sair</span></a>
                </div>
            </div>`;
        
        // Adiciona as novas ações ao container
        actionsContainer.innerHTML = rightSideActions;
        
        // Reanexa os listeners aos novos elementos criados
        setupEventListeners();
    }


    /**
     * Adiciona os event listeners para os elementos interativos do header.
     */
    function setupEventListeners() {
        const themeSwitcher = document.querySelector('.theme-switcher');
        if (themeSwitcher) {
            themeSwitcher.addEventListener('click', toggleTheme);
        }

        const avatarButton = document.getElementById('avatar-button');
        const avatarMenu = document.getElementById('avatar-menu');
        if (avatarButton && avatarMenu) {
            const toggleMenu = (event) => {
                event.stopPropagation();
                const isVisible = avatarMenu.classList.toggle('visible');
                if (isVisible) {
                    document.addEventListener('click', function closeMenu(e) {
                        if (!avatarMenu.contains(e.target) && !avatarButton.contains(e.target)) {
                            avatarMenu.classList.remove('visible');
                            document.removeEventListener('click', closeMenu);
                        }
                    });
                }
            };
            avatarButton.addEventListener('click', toggleMenu);
        }

        const bellBtn = document.getElementById('client-notification-bell-btn');
        const dropdown = document.getElementById('client-notification-dropdown');
        if (bellBtn && dropdown) {
            const toggleDropdown = async (event) => {
                event.stopPropagation();
                const isVisible = dropdown.classList.toggle('visible');
                if (isVisible) {
                    document.addEventListener('click', function closeDropdown(e) {
                         if (!dropdown.contains(e.target) && !bellBtn.contains(e.target)) {
                            dropdown.classList.remove('visible');
                            document.removeEventListener('click', closeDropdown);
                        }
                    });
                    if (typeof window.fetchAllClientNotifications === 'function') {
                        const notifications = await window.fetchAllClientNotifications();
                        window.renderClientNotifications(notifications);
                        await window.markClientNotificationsAsRead();
                        setTimeout(window.updateClientNotificationBadge, 1500);
                    }
                }
            };
            bellBtn.addEventListener('click', toggleDropdown);
        }
    }
    
    // --- ATIVAÇÃO ---
    buildUnifiedHeader(); // Constrói o header inicial com base nos dados do body
    
    // A lógica de notificação do admin já está no main.js do admin

    // Atualiza o contador de notificações se o usuário for um cliente
    if (document.body.dataset.userRole === 'Cliente' && typeof window.updateClientNotificationBadge === 'function') {
        window.updateClientNotificationBadge();
    }
});