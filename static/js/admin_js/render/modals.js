// --- Código do arquivo modificado: static/js/admin_js/render/modals.js ---

/**
 * Formata um timestamp ISO para uma string de data e hora local.
 * @param {string} isoString - O timestamp em formato ISO.
 * @returns {string} A data e hora formatadas.
 */
function formatLogTimestamp(isoString) {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

/**
 * Renderiza o componente de histórico de eventos para um pedido.
 * @param {object} order - O objeto da comissão.
 * @returns {string} O HTML do histórico de eventos.
 */
function renderEventLog(order) {
    const events = order.event_log || [];
    if (events.length === 0) {
        return '';
    }
    const sortedEvents = [...events].reverse();
    return `
        <div class="order-section">
            <h4 class="order-section-title">Histórico do Pedido</h4>
            <div class="event-log-container">
                ${sortedEvents.map(event => {
                    const iconClass = event.actor === 'Cliente' ? 'fa-user' : (event.actor === 'Artista' ? 'fa-palette' : 'fa-cogs');
                    const actorClass = event.actor.toLowerCase().replace(' ', '-');
                    return `
                    <div class="event-log-item">
                        <div class="event-log-icon actor-${actorClass}"><i class="fas ${iconClass}"></i></div>
                         <div class="event-log-content">
                            <p class="event-log-message"><strong>${event.actor}:</strong> ${event.message}</p>
                            <small class="event-log-timestamp">${formatLogTimestamp(event.timestamp)}</small>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
}

/**
 * Renderiza a seção de informações principais do pedido no modal do admin.
 * @param {object} comissao - O objeto da comissão.
 * @returns {string} O HTML da seção de informações.
 */
function renderAdminModalInfoSection(comissao) {
    const dataFormatada = new Date(comissao.date + 'T00:00:00').toLocaleDateString('pt-BR');
    const prazoFormatado = new Date(comissao.deadline + 'T00:00:00').toLocaleDateString('pt-BR');
    const precoFormatado = comissao.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return `
        <div class="order-section">
            <div class="order-section-title">Informações do Pedido</div>
            <div class="order-info"><div class="order-info-label">Cliente:</div><div>${comissao.client}</div></div>
            <div class="order-info"><div class="order-info-label">Tipo:</div><div>${comissao.type}</div></div>
            <div class="order-info"><div class="order-info-label">Data:</div><div>${dataFormatada}</div></div>
            <div class="order-info"><div class="order-info-label">Prazo:</div><div>${prazoFormatado}</div></div>
            <div class="order-info"><div class="order-info-label">Valor:</div><div>${precoFormatado}</div></div>
             <div class="order-info">
                <label for="modal-status-select" class="order-info-label">Status:</label>
                <div>
                    <select id="modal-status-select" class="form-input" style="padding: 8px; width: 100%;">
                        <option value="pending_payment" ${comissao.status === 'pending_payment' ? 'selected' : ''}>Aguardando Pagamento</option>
                        <option value="in_progress" ${comissao.status === 'in_progress' ? 'selected' : ''}>Em Progresso</option>
                        <option value="waiting_approval" ${comissao.status === 'waiting_approval' ? 'selected' : ''}>Aguardando Aprovação</option>
                        <option value="revisions" ${comissao.status === 'revisions' ? 'selected' : ''}>Revisões</option>
                        <option value="completed" ${comissao.status === 'completed' ? 'selected' : ''}>Concluído</option>
                        <option value="cancelled" ${comissao.status === 'cancelled' ? 'selected' : ''}>Cancelado</option>
                    </select>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renderiza APENAS a informação de status de pagamento.
 * @param {object} comissao - O objeto da comissão.
 * @returns {string} O HTML da seção de informação de pagamento.
 */
function renderAdminModalPaymentInfo(comissao) {
    const paymentStatusMap = {
        'unpaid': '<span style="color: var(--warning);">Não Pago</span>',
        'awaiting_confirmation': '<span style="color: var(--info);">Aguardando Confirmação</span>',
        'paid': '<span style="color: var(--success);">Pago</span>'
    };

    return `
        <div class="order-section">
            <div class="order-section-title">Informações de Pagamento</div>
            <div class="order-info">
                <div class="order-info-label">Status Pag.:</div>
                <div>${paymentStatusMap[comissao.payment_status] || 'Desconhecido'}</div>
            </div>
        </div>
    `;
}

/**
 * Renderiza APENAS o card de ação de pagamento, se necessário.
 * @param {object} comissao - O objeto da comissão.
 * @returns {string} O HTML do card de ação ou uma string vazia.
 */
function renderAdminModalPaymentAction(comissao) {
    if (comissao.payment_status === 'awaiting_confirmation') {
        return `
            <div class="card" style="margin-bottom: 20px;">
                <div class="order-section action-section" style="background-color: #dcfce7; border-color: var(--success);">
                    <h4 class="order-section-title">Ação Necessária</h4>
                    <p style="color: #15803d; text-align: center; margin-bottom: 1rem;">O cliente informou que realizou o pagamento. Por favor, confirme o recebimento.</p>
                    <div class="action-buttons" style="justify-content: center;">
                        <button class="btn btn-success" id="admin-confirm-payment-btn">
                            <i class="fas fa-check-circle"></i> Confirmar Recebimento
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    return '';
}


/**
 * Renderiza a seção de revisões do pedido no modal do admin.
 * @param {object} comissao - O objeto da comissão.
 * @returns {string} O HTML da seção de revisões.
 */
function renderAdminModalRevisionSection(comissao) {
    const phases = comissao.phases || [];
    const currentPhase = phases[comissao.current_phase_index];
    if (!currentPhase) return '';
    const revisionsUsed = comissao.revisions_used;
    const revisionsLimit = currentPhase.revisions_limit;
    const revisionsLeft = revisionsLimit - revisionsUsed;
    return `
        <div class="order-section">
            <div class="revision-counter" style="border-left-color: var(--info);">
                <i class="fas fa-info-circle" style="color: var(--info);"></i>
                <div>
                    <strong>Fase Atual: ${currentPhase.name}</strong>
                    <span>Cliente possui <strong>${revisionsLeft} de ${revisionsLimit}</strong> revisões restantes.</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Renderiza a seção de pré-visualizações do pedido no modal do admin.
 * @param {object} comissao - O objeto da comissão.
 * @returns {string} O HTML da seção de pré-visualizações.
 */
function renderAdminModalPreviewSection(comissao) {
    if (!comissao.preview || comissao.preview.length === 0) {
        return '<div class="art-preview empty"><span>Nenhuma prévia enviada.</span></div>';
    }

    const currentPreviewIndex = comissao.current_preview ?? comissao.preview.length - 1;
    const currentPreview = comissao.preview[currentPreviewIndex];
    if (!currentPreview) {
        return `<div class="art-preview empty"><div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div><div class="empty-message">Erro ao carregar prévia.</div></div>`;
    }
    
    const versionButtons = comissao.preview.length > 1 ? `
        <div class="version-selector">
            ${comissao.preview.map((preview, index) => `
                <button class="btn btn-sm btn-light version-btn ${index === currentPreviewIndex ? 'active' : ''}" data-version-index="${index}">
                    Versão ${preview.version}
                </button>
            `).join('')}
        </div>` : '';
    return `
        ${versionButtons}
        <div class="art-preview">
            <img src="${currentPreview.url}" alt="Prévia da Arte" class="preview-thumbnail-admin" data-full-src="${currentPreview.url}" referrerpolicy="no-referrer">
            <div class="preview-comment">${currentPreview.comment || `Versão ${currentPreview.version}`}</div>
        </div>
    `;
}

// ==========================================================
// INÍCIO DA MODIFICAÇÃO: Função de comentários removida
// ==========================================================
// A função renderAdminModalCommentsSection() foi completamente removida.
// ========================================================
// FIM DA MODIFICAÇÃO
// ========================================================

/**
 * Renderiza o conteúdo completo do modal de detalhes da comissão.
 * @param {object} comissao - O objeto da comissão.
 */
function renderModalDetails(comissao) {
    const modalBody = document.getElementById('modal-content-placeholder');
    if (!modalBody) return;

    document.getElementById('modal-save-button').dataset.id = comissao.id;
    document.getElementById('modal-title').textContent = `Detalhes da Comissão #${comissao.id}`;

    // ==========================================================
    // INÍCIO DA MODIFICAÇÃO: Remoção do card de comunicação
    // ==========================================================
    modalBody.innerHTML = `
        <div class="order-details-grid">
            <div>
                <div class="card" style="margin-bottom: 20px;">
                    ${renderAdminModalInfoSection(comissao)}
                    <hr style="border: 0; height: 1px; background-color: var(--cor-borda); margin: 1.5rem 25px;">
                    ${renderAdminModalPaymentInfo(comissao)}
                </div>

                ${renderAdminModalPaymentAction(comissao)}

                <div class="card" style="margin-bottom: 20px;">
                    ${renderAdminModalRevisionSection(comissao)}
                </div>

                <div class="card" style="margin-bottom: 20px;">
                    ${renderEventLog(comissao)}
                </div>
            </div>
            
            <div>
                <div class="card" style="margin-bottom: 20px;">
                    <div class="order-section">
                        <div class="order-section-title">Pré-visualizações</div>
                        <div id="modal-preview-container">${renderAdminModalPreviewSection(comissao)}</div>
                    </div>
                </div>
                
                <div class="card" style="margin-bottom: 20px;">
                    <div class="order-section">
                        <div class="order-section-title">Adicionar Nova Prévia</div>
                        <form id="add-preview-form">
                            <div class="form-group">
                                <label for="new-preview-url">URL da Imagem*</label>
                                <input type="url" id="new-preview-url" class="form-input" placeholder="https://i.imgur.com/..." required>
                            </div>
                            <div class="form-group">
                                <label for="new-preview-comment">Comentário (opcional)</label>
                                <textarea id="new-preview-comment" class="form-input" rows="2" placeholder="Ex: Versão com cores aplicadas."></textarea>
                            </div>
                            <button type="submit" class="btn btn-primary" style="width: 100%;">Enviar Prévia</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>`;
    // ========================================================
    // FIM DA MODIFICAÇÃO
    // ========================================================

    setupAdminModalHandlers(comissao);

    // ==========================================================
    // INÍCIO DA MODIFICAÇÃO: Adiciona botão de chat no cabeçalho
    // ==========================================================
    const modalHeader = document.querySelector('#orderDetailsModal .modal-header');
    
    // Remove qualquer botão de chat antigo para evitar duplicação
    const oldChatBtn = modalHeader.querySelector('.chat-trigger-btn');
    if(oldChatBtn) oldChatBtn.remove();

    if (modalHeader) {
        const chatBtn = document.createElement('button');
        chatBtn.className = 'btn chat-trigger-btn';
        chatBtn.dataset.id = comissao.id;
        chatBtn.title = 'Abrir Chat Rápido';
        chatBtn.innerHTML = '<i class="fas fa-comments"></i> Chat Rápido';
        chatBtn.style.marginLeft = 'auto';
        chatBtn.style.marginRight = '1rem';
        
        // Insere o botão de chat antes do botão de fechar
        modalHeader.insertBefore(chatBtn, modalHeader.querySelector('.close-modal'));
    }
    // ========================================================
    // FIM DA MODIFICAÇÃO
    // ========================================================

    document.getElementById('orderDetailsModal').style.display = 'flex';
}

/**
 * Renderiza o conteúdo do modal de gerenciamento de cliente.
 * @param {object} client - O objeto do cliente.
 */
function renderClientModal(client) {
    document.getElementById('client-modal-title').textContent = `Gerenciar ${client.name}`;
    document.getElementById('client-id-input').value = client.id;
    document.getElementById('client-modal-name').textContent = client.name;
    document.getElementById('client-modal-email').textContent = client.email;
    document.getElementById('client-modal-created-at').textContent = new Date(client.created_at).toLocaleDateString('pt-BR');
    document.getElementById('client-notify-on-site').checked = client.notify_on_site === 1;
    document.getElementById('client-notify-by-email').checked = client.notify_by_email === 1;

    const blockBtn = document.getElementById('client-block-btn');
    const banBtn = document.getElementById('client-ban-btn');
    
    blockBtn.textContent = client.is_blocked ? 'Desbloquear Pedidos' : 'Bloquear Pedidos';
    blockBtn.classList.toggle('btn-success', client.is_blocked);
    blockBtn.classList.toggle('btn-warning', !client.is_blocked);
    
    banBtn.textContent = client.is_banned ? 'Readmitir Usuário' : 'Banir Usuário';
    banBtn.classList.toggle('btn-success', client.is_banned);
    banBtn.classList.toggle('btn-danger', !client.is_banned);
    
    document.getElementById('client-details-modal').style.display = 'flex';
}