// --- Código Unificado e Otimizado: static/js/admin_js/main.js ---

// Lógica principal e unificada do painel de administração.
let allComissoesParaCalendario = [];

/**
 * Prepara e ativa a lógica de responsividade para o painel de admin.
 * Esta função contém a lógica que antes estava no plugin.
 */
function initializeAdminResponsiveness() {
    const hamburgerButton = document.getElementById('admin-hamburger-btn');
    const overlay = document.getElementById('admin-responsive-overlay');
    const sidebar = document.querySelector('.sidebar');

    if (!hamburgerButton || !overlay || !sidebar) {
        return;
    }

    // Esconde o footer da sidebar em telas menores, pois não é essencial
    const sidebarFooter = document.querySelector('.sidebar-footer');
    if (sidebarFooter) {
        sidebarFooter.style.display = 'none';
    }

    // Envolve o texto dos botões com ícones em um <span> para poder escondê-lo via CSS
    document.querySelectorAll('.btn').forEach(btn => {
        const childNodes = Array.from(btn.childNodes);
        const hasIcon = childNodes.some(node => node.nodeType === Node.ELEMENT_NODE && (node.tagName === 'I' || node.tagName === 'SVG'));
        const textNodes = childNodes.filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '');

        if (hasIcon && textNodes.length > 0) {
            textNodes.forEach(textNode => {
                const span = document.createElement('span');
                span.className = 'btn-text';
                span.textContent = textNode.textContent;
                btn.replaceChild(span, textNode);
            });
        }
    });

    const openSidebar = () => {
        sidebar.classList.add('is-open');
        overlay.classList.add('is-visible');
    };

    const closeSidebar = () => {
        sidebar.classList.remove('is-open');
        overlay.classList.remove('is-visible');
    };

    hamburgerButton.addEventListener('click', openSidebar);
    overlay.addEventListener('click', closeSidebar);
    sidebar.addEventListener('click', (e) => {
        // Fecha a sidebar se um link for clicado
        if (e.target.closest('a')) {
            closeSidebar();
        }
    });

    // Prepara as tabelas para o layout de card em telas pequenas
    document.querySelectorAll('.table-responsive table').forEach(table => {
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
        table.querySelectorAll('tbody tr').forEach(row => {
            row.querySelectorAll('td').forEach((td, index) => {
                if (headers[index]) {
                    td.setAttribute('data-label', headers[index]);
                }
            });
        });
    });
}


/**
 * Busca a contagem de notificações não lidas e atualiza o badge.
 */
async function updateNotificationBadge() {
    try {
        const data = await fetchUnreadCount();
        const badge = document.getElementById('notification-badge');
        if (badge) {
            if (data.count > 0) {
                badge.textContent = data.count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error("Erro ao atualizar o badge de notificações:", error);
    }
}

/**
 * Configura os listeners do Socket.IO para o painel de administração.
 */
function setupSocketIOListeners() {
    const socket = io();
    socket.on('connect', () => {
        console.log('Conectado ao servidor de tempo real (Painel Admin).');
    });
    socket.on('commission_updated', async (data) => {
        console.log('Evento de atualização de comissão recebido no admin:', data);
        const notificationMessage = data.message_for_admin || `O pedido #${data.commission_id} foi atualizado.`;
        showNotification(notificationMessage, 'info');
        updateNotificationBadge();

        const comissoesData = await fetchComissoes();
        allComissoesParaCalendario = comissoesData;

        const comissoesTableBody = document.getElementById('comissoes-table-body');
        const dashboardCards = document.getElementById('card-total-comissoes');

        if (dashboardCards) {
            updateDashboardCards(comissoesData);
            renderComissoesTable(comissoesData.slice(0, 5));
        } else if (comissoesTableBody) {
            renderComissoesTable(comissoesData);
        }
        
        const orderDetailsModal = document.getElementById('orderDetailsModal');
        const isModalVisible = orderDetailsModal && orderDetailsModal.style.display === 'flex';
        const modalCommissionId = document.getElementById('modal-save-button')?.dataset.id;
        
        if (isModalVisible && modalCommissionId === data.commission_id) {
            if (data.deleted) {
                orderDetailsModal.style.display = 'none';
                renderComissoesTable(comissoesData);
            } else {
                const updatedData = await fetchSingleComissao(data.commission_id);
                if (updatedData) {
                    renderModalDetails(updatedData);
                }
            }
        }
    });
    socket.on('new_message', (data) => {
        console.log('Nova mensagem de contato recebida via Socket.IO:', data);

        if (data.message_for_admin) {
            showNotification(data.message_for_admin, 'info');
        }

        updateNotificationBadge();

        if (window.location.pathname.includes('/admin/mensagens')) {
            console.log("Na página de mensagens, recarregando para exibir a nova mensagem.");
            location.reload();
        }
    });
}


/**
 * Lógica executada quando o DOM do painel está pronto.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // CHAMA A NOVA FUNÇÃO DE RESPONSIVIDADE
    initializeAdminResponsiveness();

    if (!window.cms) {
        try {
            if (typeof ModularCMS !== 'undefined') {
                window.cms = new ModularCMS();
                await window.cms.init();
            } else {
                console.error("O núcleo do CMS (ModularCMS) não foi encontrado. Verifique a ordem de carregamento dos scripts.");
            }
        } catch (error) {
            console.error("Falha ao inicializar o sistema de plugins:", error);
        }
    }
  
    console.log("Painel Admin carregado.");
    
    // --- LÓGICA GLOBAL ---
    const bellBtn = document.getElementById('notification-bell-btn');
    const notificationDropdown = document.getElementById('notification-dropdown');
    if (bellBtn && notificationDropdown) {
        bellBtn.addEventListener('click', async (event) => {
            event.stopPropagation();
            const isVisible = notificationDropdown.style.display === 'block';
            if (isVisible) {
                notificationDropdown.style.display = 'none';
            } else {
                notificationDropdown.style.display = 'block';
                const notifications = await fetchAllNotifications();
                renderNotifications(notifications);
                await markNotificationsAsRead();
                setTimeout(updateNotificationBadge, 2000);
            }
        });
    }

    document.addEventListener('click', (event) => {
        if (notificationDropdown && bellBtn && !bellBtn.contains(event.target)) {
            notificationDropdown.style.display = 'none';
        }
    });

    setupSocketIOListeners();
    updateNotificationBadge();

    const isDashboardPage = document.getElementById('card-total-comissoes') && document.getElementById('calendar-days');
    if (isDashboardPage) {
        let currentDate = new Date();
        let currentMonth = currentDate.getMonth();
        let currentYear = currentDate.getFullYear();

        console.log("Página do Dashboard detetada. A carregar dados...");
        const [comissoesData, notificationsData] = await Promise.all([
            fetchComissoes(),
            fetchAllNotifications()
        ]);
        allComissoesParaCalendario = comissoesData;

        if (allComissoesParaCalendario) {
            renderComissoesTable(allComissoesParaCalendario.slice(0, 5));
            updateDashboardCards(allComissoesParaCalendario);
            renderCalendar(currentMonth, currentYear, allComissoesParaCalendario);
            renderActivityFeed(notificationsData);
        } else {
            console.log("Não foi possível carregar os dados do dashboard.");
        }

        const prevMonthBtn = document.getElementById('prev-month-btn');
        const nextMonthBtn = document.getElementById('next-month-btn');
        if (prevMonthBtn && nextMonthBtn) {
            prevMonthBtn.addEventListener('click', () => {
                currentMonth--;
                if (currentMonth < 0) {
                    currentMonth = 11;
                    currentYear--;
                }
                renderCalendar(currentMonth, currentYear, allComissoesParaCalendario);
            });
            nextMonthBtn.addEventListener('click', () => {
                currentMonth++;
                if (currentMonth > 11) {
                    currentMonth = 0;
                    currentYear++;
                }
                renderCalendar(currentMonth, currentYear, allComissoesParaCalendario);
            });
        }
    }
});