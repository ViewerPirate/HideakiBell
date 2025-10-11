// static/js/client/api.js

/**
 * Busca os pedidos do cliente logado na API.
 */
window.fetchOrders = async function() {
    try {
        const response = await fetch('/api/client/orders');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Pedidos do cliente carregados da API:", data);
        return data;
    } catch (error) {
        console.error("Erro ao buscar pedidos:", error);
        showNotification('Erro ao carregar seus pedidos.', 'error');
        return [];
    }
}

/**
 * Busca os itens da galeria do artista na API.
 */
window.fetchPortfolio = async function() {
    try {
        // CORREÇÃO: A rota genérica /api/client/gallery foi trocada pela rota específica do artista principal (ID 1)
        const response = await fetch('/api/client/artists/1/portfolio');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Portfólio carregado da API:", data);
        return data;
    } catch (error) {
        console.error("Erro ao buscar portfólio:", error);
        showNotification('Erro ao carregar o portfólio.', 'error');
        return [];
    }
}

/**
 * Busca as configurações de preços da API.
 */
window.fetchPricing = async function() {
    try {
        const response = await fetch('/api/client/pricing');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Preços carregados da API:", data);
        return data;
    } catch (error) {
        console.error("Erro ao buscar preços:", error);
        showNotification('Erro ao carregar informações de preços.', 'error');
        return { commission_types: [], commission_extras: [], refund_policy: '' };
    }
}

/**
 * Envia um novo pedido de comissão para a API.
 * @param {object} orderData - Os dados do novo pedido.
 */
window.createOrder = async function(orderData) {
    try {
        const response = await fetch('/api/client/commissions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData),
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Erro no servidor');
        }
        
        return result;
    } catch (error) {
        console.error("Erro ao criar pedido:", error);
        return { success: false, message: error.message };
    }
}

/**
 * Adiciona um novo comentário a um pedido.
 * @param {string} orderId - O ID do pedido.
 * @param {string} text - O texto do comentário.
 */
window.addComment = async function(orderId, text) {
    try {
        const response = await fetch(`/api/client/orders/${orderId}/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });
        return await response.json();
    } catch (error) {
        console.error("Erro ao adicionar comentário:", error);
        return { success: false, message: 'Erro de conexão.' };
    }
}

/**
 * MODIFICADO: Envia um pedido de revisão para a fase atual, incluindo o comentário.
 * @param {string} orderId - O ID do pedido.
 * @param {string} commentText - O comentário obrigatório da revisão.
 */
window.requestRevision = async function(orderId, commentText) {
    try {
        const response = await fetch(`/api/client/orders/${orderId}/request_revision`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment: commentText }) // Envia o comentário
        });
        return await response.json();
    } catch (error) {
        console.error("Erro ao solicitar revisão:", error);
        return { success: false, message: 'Erro de conexão.' };
    }
}

/**
 * Aprova a fase atual do pedido.
 * @param {string} orderId - O ID do pedido.
 */
window.approvePhase = async function(orderId) {
    try {
        const response = await fetch(`/api/client/orders/${orderId}/approve_phase`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        return await response.json();
    } catch (error) {
        console.error("Erro ao aprovar a fase:", error);
        return { success: false, message: 'Erro de conexão.' };
    }
}

/**
 * Informa ao backend que o cliente marcou o pagamento como concluído.
 * @param {string} orderId - O ID do pedido.
 */
window.confirmPaymentByClient = async function(orderId) {
    try {
        const response = await fetch(`/api/client/orders/${orderId}/payment_confirmed_by_client`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        return await response.json();
    } catch (error) {
        console.error("Erro ao confirmar pagamento:", error);
        return { success: false, message: 'Erro de conexão.' };
    }
}

/**
 * Envia uma solicitação para cancelar um pedido.
 * @param {string} orderId - O ID do pedido a ser cancelado.
 */
window.cancelOrder = async function(orderId) {
    try {
        const response = await fetch(`/api/client/orders/${orderId}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        return await response.json();
    } catch (error) {
        console.error("Erro ao cancelar o pedido:", error);
        return { success: false, message: 'Erro de conexão.' };
    }
}

// --- Funções de API para Notificações do Cliente ---

/**
 * Busca a contagem de notificações não lidas para o cliente.
 */
window.fetchClientUnreadCount = async function() {
    try {
        const response = await fetch('/api/client/notifications/unread_count');
        if (!response.ok) throw new Error('Erro ao buscar contagem de notificações');
        return await response.json();
    } catch (error) {
        console.error("Erro ao buscar contagem de notificações:", error);
        return { count: 0 };
    }
}

/**
 * Busca todas as notificações para o cliente.
 */
window.fetchAllClientNotifications = async function() {
    try {
        const response = await fetch('/api/client/notifications');
        if (!response.ok) throw new Error('Erro ao buscar notificações');
        return await response.json();
    } catch (error) {
        console.error("Erro ao buscar todas as notificações:", error);
        return [];
    }
}

/**
 * Marca as notificações do cliente como lidas.
 */
window.markClientNotificationsAsRead = async function() {
    try {
        const response = await fetch('/api/client/notifications/mark_read', { method: 'POST' });
        if (!response.ok) throw new Error('Erro ao marcar como lido');
        return await response.json();
    } catch (error) {
        console.error("Erro ao marcar notificações como lidas:", error);
        return { success: false };
    }
}


// --- INÍCIO DA CORREÇÃO (Funções de API de Conta e Artista) ---

/**
 * Busca a lista de artistas públicos.
 */
window.fetchArtists = async function() {
    try {
        const response = await fetch('/api/client/artists');
        // ROTA CORRIGIDA
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Artistas carregados da API:", data);
        return data;
    } catch (error) {
        console.error("Erro ao buscar artistas:", error);
        showNotification('Erro ao carregar a lista de artistas.', 'error');
        return [];
    }
}

/**
 * Busca o portfólio de um artista específico.
 * @param {number} artistId - O ID do artista.
 */
window.fetchArtistPortfolio = async function(artistId) {
    try {
        const response = await fetch(`/api/client/artists/${artistId}/portfolio`);
        // ROTA CORRIGIDA
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Erro ao buscar portfólio do artista ${artistId}:`, error);
        showNotification('Erro ao carregar o portfólio do artista.', 'error');
        return [];
    }
}

/**
 * Atualiza o perfil do usuário (nome de usuário, email e avatar).
 * @param {object} profileData - Objeto com { username, email, avatar_url }.
 */
window.updateUserProfile = async function(profileData) {
    try {
        const response = await fetch('/api/client/account/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData)
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: 'Erro de conexão.' };
    }
}

/**
 * Atualiza a senha do usuário.
 * @param {object} passwordData - Objeto com { current_password, new_password }.
 */
window.updateUserPassword = async function(passwordData) {
    try {
        const response = await fetch('/api/client/account/password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(passwordData)
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: 'Erro de conexão.' };
    }
}

/**
 * Solicita a exclusão da conta do usuário.
 * @param {string} password - A senha atual para confirmação.
 */
window.deleteUserAccount = async function(password) {
    try {
        const response = await fetch('/api/client/account/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password })
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: 'Erro de conexão.' };
    }
}
// --- FIM DA CORREÇÃO ---