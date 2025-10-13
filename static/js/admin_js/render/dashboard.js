// Arquivo: static/js/admin_js/render/dashboard.js

/**
 * Atualiza os cards de KPI na página do dashboard.
 * @param {Array} comissoes - A lista completa de comissões.
 */
function updateDashboardCards(comissoes) {
    const cardTotal = document.getElementById('card-total-comissoes');
    if (!cardTotal) return;

    const totalComissoes = comissoes.length;
    const emAndamento = comissoes.filter(c => c.status === 'in_progress').length;
    const aguardandoAprovacao = comissoes.filter(c => c.status === 'waiting_approval').length;
    
    const hoje = new Date(); 
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    
    const receitaMensal = comissoes
        .filter(c => {
            const dataComissao = new Date(c.date + 'T00:00:00');
            return c.status === 'completed' && dataComissao.getMonth() === mesAtual && dataComissao.getFullYear() === anoAtual;
        })
        .reduce((total, c) => total + c.price, 0);

    cardTotal.textContent = totalComissoes;
    document.getElementById('card-em-andamento').textContent = emAndamento; 
    document.getElementById('card-aguardando-aprovacao').textContent = aguardandoAprovacao;
    document.getElementById('card-receita-mensal').textContent = receitaMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Renderiza o feed de atividades recentes no dashboard.
 * @param {Array} notifications - A lista de notificações para exibir como atividades.
 */
function renderActivityFeed(notifications) {
    const feedList = document.getElementById('activity-feed-list');
    if (!feedList) return;
    feedList.innerHTML = '';

    if (notifications.length === 0) { 
        feedList.innerHTML = '<div class="activity-item"><div class="activity-content"><p>Nenhuma atividade recente.</p></div></div>';
        return;
    } 
    
    notifications.slice(0, 5).forEach(notif => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        let iconClass = 'fas fa-info-circle';
        
        if (notif.message.includes('criada') || notif.message.includes('recebido') || notif.message.includes('pedido')) iconClass = 'fas fa-plus';
        else if (notif.message.includes('alterado') || notif.message.includes('aprovada')) iconClass = 'fas fa-pencil-alt';
        else if (notif.message.includes('excluída') || notif.message.includes('cancelou')) iconClass = 'fas fa-trash-alt';
        else if (notif.message.includes('pagamento')) iconClass = 'fas fa-dollar-sign';
        else if (notif.message.includes('comentário') || notif.message.includes('mensagem')) iconClass = 'fas fa-comment';
        
        activityItem.innerHTML = `
            <div class="activity-icon"><i class="${iconClass}"></i></div> 
            <div class="activity-content">
                <div class="activity-title">${notif.message}</div>
                <div class="activity-time">${formatTimeAgo(notif.timestamp)}</div>
            </div>`;
        feedList.appendChild(activityItem);
    });
}

/**
 * Renderiza a lista de notificações no dropdown da barra de navegação.
 * @param {Array} notifications - A lista de notificações.
 */
function renderNotifications(notifications) {
    const notificationList = document.getElementById('notification-list');
    if (!notificationList) return;
    notificationList.innerHTML = '';
    
    if (notifications.length === 0) { 
        notificationList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--cor-texto-secundario);">Nenhuma notificação recente.</div>';
        return; 
    }

    notifications.forEach(notif => {
        const notifItem = document.createElement('a');
        notifItem.href = "#"; // Pode ser alterado para levar à comissão relevante no futuro
        notifItem.className = 'notification-item';
        notifItem.style.backgroundColor = notif.is_read ? 'transparent' : 'var(--cor-fundo)';
        notifItem.innerHTML = `
            <div class="notification-icon"><i class="fas fa-info-circle"></i></div>
            <div class="notification-content">
                <p>${notif.message}</p>
                <small>${new Date(notif.timestamp).toLocaleString('pt-BR')}</small>
            </div>`;
        notificationList.appendChild(notifItem);
    }); 
}

/**
 * Formata um timestamp para texto "há X tempo".
 * @param {string} timestamp - A data/hora em formato string.
 * @returns {string} O tempo formatado.
 */
function formatTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now - past) / 1000); 
    const minutes = Math.floor(diffInSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24); 
    
    if (minutes < 1) return "agora mesmo";
    if (minutes < 60) return `há ${minutes} minuto(s)`; 
    if (hours < 24) return `há ${hours} hora(s)`;
    if (days === 1) return "ontem"; 
    return `há ${days} dia(s)`;
}