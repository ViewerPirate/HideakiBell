// static/js/client/helpers.js
// Contém funções utilitárias reutilizáveis.
/**
 * Formata uma string de data (YYYY-MM-DD) para o formato DD/MM/YYYY.
 * @param {string} dateString - A data no formato YYYY-MM-DD.
 * @returns {string} A data formatada.
 */
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    // Evita problemas de fuso horário
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

/**
 * Formata uma string de data e hora para o formato DD/MM/YYYY HH:mm.
 * @param {string} dateTimeString - A data e hora em formato ISO.
 * @returns {string} A data e hora formatadas.
 */
function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * MODIFICADO: Retorna o texto detalhado para um status de pedido, considerando as fases e o pagamento.
 * @param {object} order - O objeto do pedido.
 * @returns {string} O texto legível e detalhado do status.
 */
function getDetailedStatusText(order) {
    // Prioriza o status de pagamento, se relevante.
    if (order.status === 'pending_payment') {
        if (order.payment_status === 'awaiting_confirmation') {
            return 'Pagamento em Confirmação';
        }
        return 'Aguardando Pagamento';
    }

    const statusMap = {
        'pending': 'Pendente de Início',
        'completed': 'Finalizado e Aprovado',
        'cancelled': 'Cancelado'
    };
    if (statusMap[order.status]) {
        return statusMap[order.status];
    }
    
    // Se não for um status simples, analisa as fases
    const phases = order.phases || [];
    const currentPhaseIndex = order.current_phase_index;

    if (!phases[currentPhaseIndex]) {
        // Fallback para o status antigo se as fases não estiverem definidas
        return order.status.replace('_', ' ');
    }
    
    const currentPhaseName = phases[currentPhaseIndex].name;
    switch (order.status) {
        case 'in_progress':
            return `Artista trabalhando (${currentPhaseName})`;
        case 'waiting_approval':
            return `Aguardando sua aprovação (${currentPhaseName})`;
        case 'revisions':
            return `Em Revisão (${currentPhaseName})`;
        default:
            return 'Status Desconhecido';
    }
}


/**
 * Exibe um modal e bloqueia o scroll do corpo da página.
 * @param {HTMLElement} modal - O elemento do modal a ser exibido.
 */
function showModal(modal) {
    modal.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
}

/**
 * Esconde um modal e restaura o scroll do corpo da página.
 * @param {HTMLElement} modal - O elemento do modal a ser escondido.
 */
function hideModal(modal) {
    modal.classList.remove('is-visible');
    document.body.style.overflow = '';
}

/**
 * Fecha todos os modais abertos.
 */
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(hideModal);
}

/**
 * Exibe ou esconde a tela de carregamento.
 * @param {boolean} isLoading - True para exibir, false para esconder.
 */
function toggleLoading(isLoading) {
    DOM.loadingOverlay.style.display = isLoading ? 'flex' : 'none';
}