// Arquivo: static/js/client/render/orders.js

/**
 * Renderiza a lista de pedidos na página, aplicando os filtros atuais.
 */
function renderOrders() {
    DOM.orderList.innerHTML = '';
    
    let filteredOrders = [...state.orders];
    // Aplica filtro de status
    if (state.currentFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => order.status === state.currentFilter);
    }
    
    // Aplica filtro de busca por texto
    if (state.currentSearch) {
        const search = state.currentSearch.toLowerCase();
        filteredOrders = filteredOrders.filter(order => 
            (order.title && order.title.toLowerCase().includes(search)) || 
            (order.id && order.id.toLowerCase().includes(search))
        );
    }

    // Ordena do mais recente para o mais antigo
    filteredOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
    // Exibe o estado de "vazio" ou a lista de pedidos
    if (filteredOrders.length === 0) {
        DOM.emptyState.style.display = 'block';
        DOM.orderList.style.display = 'none';
    } else {
        DOM.emptyState.style.display = 'none';
        DOM.orderList.style.display = 'grid';
        filteredOrders.forEach(order => {
            const orderCard = createOrderCard(order);
            DOM.orderList.appendChild(orderCard);
        });
    }
}

/**
 * Cria o elemento HTML para um único card de pedido.
 * @param {object} order - O objeto do pedido.
 * @returns {HTMLElement} O elemento do card de pedido.
 */
function createOrderCard(order) {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.dataset.id = order.id;
    const statusClass = order.status.replace('_', '-');
    const statusText = getDetailedStatusText(order);

    // Lógica da barra de progresso
    const progressSteps = ['pending_payment', 'in_progress', 'revisions', 'waiting_approval', 'completed'];
    const currentStatusIndex = progressSteps.indexOf(order.status);
    const progress = progressSteps.map((step, index) => {
        if (index < currentStatusIndex) return 'completed';
        if (index === currentStatusIndex) return 'active';
        return 'pending';
    });
    const progressPercentage = currentStatusIndex > 0 ? (currentStatusIndex / (progressSteps.length - 1)) * 100 : 0;
    const progressLabels = ["Pagamento", "Criação", "Revisão", "Aprovação", "Finalizado"];

    card.innerHTML = `
        <div class="order-header">
            <div>
                <h3 class="order-title">${order.title || 'Pedido sem Título'}</h3>
                <span class="order-id">#${order.id}</span>
            </div>
            <span class="order-status status-${statusClass}">${statusText}</span>
        </div>
 
        <div class="order-meta"> 
            <div class="meta-item"><i class="fas fa-calendar-alt"></i> <strong>Data:</strong> ${formatDate(order.date)}</div>
            ${order.deadline ? `<div class="meta-item"><i class="fas fa-flag-checkered"></i> <strong>Prazo:</strong> ${formatDate(order.deadline)}</div>` : ''} 
            <div class="meta-item"><i class="fas fa-dollar-sign"></i> <strong>Valor:</strong> ${order.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
        </div>
        
        <div class="progress-tracker">
            <div class="progress-steps">
                <div class="progress-line" style="width: ${progressPercentage}%;"></div>
                ${progress.map((step, index) => `<div class="progress-step ${step}" title="${progressLabels[index]}"><i class="fas fa-check"></i></div>`).join('')} 
            </div>
            <div class="progress-labels">
                ${progressLabels.map((label, index) => `<div class="progress-label ${progress[index]}">${label}</div>`).join('')}
            </div>
        </div>
        
        <div class="order-actions">
            <button class="btn btn-sm chat-trigger-btn" data-id="${order.id}">
                <i class="fas fa-comments"></i> Abrir Chat
            </button>
            <button class="btn btn-light btn-sm view-details-btn"><i class="fas fa-eye"></i> Ver Detalhes</button> 
            ${order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'pending_payment' ? `<button class="btn btn-danger btn-sm cancel-btn"><i class="fas fa-times"></i> Cancelar</button>` : ''} 
        </div>
    `;
    return card; 
}