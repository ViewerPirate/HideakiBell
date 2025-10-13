// Arquivo: static/js/chat_widget.js
// Lógica central para o widget de chat de comunicação.

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const isAdminPage = path.startsWith('/admin/');
    const isClientPage = path.includes('/dashboard') && !isAdminPage;

    // O script só executa nas páginas do admin ou do cliente
    if (!isAdminPage && !isClientPage) {
        return;
    }

    // --- Elementos do DOM do Widget ---
    const widget = document.getElementById('widget-quick-chat');
    if (!widget) return; // Se o HTML do widget não foi carregado, para a execução.

    const widgetTitle = document.getElementById('chat-widget-title');
    const bubblesContainer = document.getElementById('chat-bubbles-container');
    const widgetForm = document.getElementById('chat-widget-form');
    const widgetInput = document.getElementById('chat-widget-input');
    const widgetCloseBtn = document.getElementById('chat-widget-close');
    
    // --- Estado do Chat ---
    let currentChatCommissionId = null;
    let unreadNotifications = new Map();

    // --- Funções Auxiliares ---
    const formatChatTimestamp = (isoString) => new Date(isoString).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const closeChatWidget = () => {
        widget.classList.remove('visible');
        currentChatCommissionId = null; 
    };

    const openChatWidget = async (commissionId) => {
        currentChatCommissionId = commissionId;
        widget.classList.add('visible');
        widgetTitle.textContent = `Carregando #${commissionId}...`;
        bubblesContainer.innerHTML = '<div class="spinner" style="margin: auto;"></div>';
        
        // Se for cliente, marca as notificações como lidas ao abrir o chat
        if (isClientPage && unreadNotifications.has(commissionId)) {
            try {
                await fetch(`/api/client/notifications/mark_read/commission/${commissionId}`, { method: 'POST' });
                unreadNotifications.delete(commissionId);
                updateChatIconBadge(commissionId, 0);
            } catch (error) { console.error("Falha ao marcar notificações como lidas:", error); }
        }
        
        try {
            let commission = null;
            if (isAdminPage) {
                commission = await window.fetchSingleComissao(commissionId);
            } else {
                // No cliente, buscamos a comissão do estado global ou da API
                commission = state.orders.find(o => o.id === commissionId) || (await window.fetchOrders()).find(o => o.id === commissionId);
            }

            if (!commission) throw new Error("Comissão não encontrada");

            widgetTitle.textContent = `Chat: ${commission.title || commission.client}`;
            renderChatBubbles(commission);

        } catch (error) { 
            console.error("Erro ao abrir chat:", error);
            bubblesContainer.innerHTML = '<p style="text-align: center; color: var(--cor-texto-secundario); margin: auto;">Não foi possível carregar o chat.</p>';
        }
    };
    
    const renderChatBubbles = (commission) => {
        const comments = commission.comments || [];
        const previews = commission.preview || [];
        
        const chronologicalFeed = [
            ...comments.map(item => ({ ...item, type: 'comment' })),
            ...previews.map(item => ({ ...item, type: 'preview' }))
        ].sort((a, b) => new Date(a.date) - new Date(b.date));

        bubblesContainer.innerHTML = chronologicalFeed.map(item => {
            if (item.type === 'preview') {
                const isLastPreview = previews.length > 0 && item.date === previews[previews.length - 1].date;
                const canTakeAction = isClientPage && commission.status === 'waiting_approval' && isLastPreview;
                
                return `
                <div class="chat-bubble preview">
                    <div class="preview-card">
                        <small class="chat-bubble-meta">Artista enviou uma prévia em ${formatChatTimestamp(item.date)}</small>
                        <img src="${item.url}" alt="Prévia da arte" class="preview-thumbnail" data-full-src="${item.url}" referrerpolicy="no-referrer" />
                        <p>${item.comment || ''}</p>
                        ${canTakeAction ? `
                        <div class="preview-card-actions">
                            <button class="btn btn-sm btn-success" data-action="approve"><i class="fas fa-check"></i> Aprovar</button>
                            <button class="btn btn-sm btn-warning" data-action="revise"><i class="fas fa-redo"></i> Pedir Revisão</button>
                        </div>
                        ` : ''}
                    </div>
                </div>`;
            }
            
            const isRevisionRequest = item.is_revision_request;
            const isSentByCurrentUser = (isAdminPage && item.is_artist) || (isClientPage && !item.is_artist);
            const bubbleClass = isRevisionRequest ? 'revision-request' : (isSentByCurrentUser ? 'sent' : 'received');

            const revisionHeader = isRevisionRequest ? `
                <div class="revision-request-header">
                    <i class="fas fa-redo"></i>
                    <span>Pedido de Revisão - Fase: ${item.phase_name}</span>
                </div>` : '';

            return `
                <div class="chat-bubble ${bubbleClass}">
                    ${revisionHeader}
                    <div>${item.text.replace(/\n/g, '<br>')}</div>
                    <div class="chat-bubble-meta">${formatChatTimestamp(item.date)}</div>
                </div>`;
        }).join('');
    };

    const updateChatIconBadge = (commissionId, count) => {
        document.querySelectorAll(`.chat-trigger-btn[data-id="${commissionId}"]`).forEach(icon => {
            let badge = icon.querySelector('.chat-counter-badge');
            if (count > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'chat-counter-badge';
                    icon.appendChild(badge);
                }
                badge.textContent = count;
            } else {
                badge?.remove();
            }
        });
    };

    // --- Lógica de Eventos do Widget ---

    widgetInput.addEventListener('input', () => {
        widgetInput.style.height = 'auto';
        widgetInput.style.height = `${widgetInput.scrollHeight}px`;
    });

    widgetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = widgetInput.value.trim();
        if (!text || !currentChatCommissionId) return;
        widgetInput.disabled = true;
        try {
            const apiFunction = isAdminPage ? window.adminAddComment : window.addComment;
            const result = await apiFunction(currentChatCommissionId, text);
            if (result.success) {
                widgetInput.value = '';
                widgetInput.dispatchEvent(new Event('input')); // Recalcula altura
            } else {
                showNotification(result.message || 'Erro ao enviar mensagem.', 'error');
            }
        } finally {
            widgetInput.disabled = false;
            widgetInput.focus();
        }
    });
    
    widgetCloseBtn.addEventListener('click', closeChatWidget);

    // Event Delegation para os botões de Ação do Cliente dentro do chat
    bubblesContainer.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button || !currentChatCommissionId || !isClientPage) return;
        
        const action = button.dataset.action;
        if (action === 'approve') {
            window.showConfirmModal('Aprovar Fase', 'Você tem certeza que deseja aprovar a prévia atual e avançar para a próxima fase?', async () => {
                const result = await window.approvePhase(currentChatCommissionId);
                if (result.success) {
                    showNotification('Fase aprovada com sucesso!', 'success');
                    closeChatWidget();
                }
            });
        } else if (action === 'revise') {
            window.showRevisionModal(currentChatCommissionId, async (commentText) => {
                const result = await window.requestRevision(currentChatCommissionId, commentText);
                if (result.success) {
                    showNotification('Pedido de revisão enviado!', 'success');
                    closeChatWidget();
                }
            });
        }
    });

    // Event Delegation para os gatilhos de abrir o chat
    document.body.addEventListener('click', (e) => {
        const trigger = e.target.closest('.chat-trigger-btn');
        if (trigger) {
            e.preventDefault();
            e.stopPropagation();
            const commissionId = trigger.dataset.id;
            const isWidgetVisible = widget.classList.contains('visible');
            
            if (isWidgetVisible && currentChatCommissionId === commissionId) {
                closeChatWidget();
            } else {
                openChatWidget(commissionId);
            }
        }
    });

    // --- Inicialização e Socket.IO ---

    const initializeUnreadCount = async () => {
        if (isClientPage) {
            const notifications = await fetchAllClientNotifications();
            notifications.forEach(n => {
                if (!n.is_read && n.related_commission_id) {
                    const count = (unreadNotifications.get(n.related_commission_id) || 0) + 1;
                    unreadNotifications.set(n.related_commission_id, count);
                }
            });
            // Atualiza os badges para os cards que já estão na tela
            unreadNotifications.forEach((count, commissionId) => {
                updateChatIconBadge(commissionId, count);
            });
        }
    };
    
    const socket = window.io();
    socket.on('commission_updated', async (data) => {
        if (!data.commission_id) return;
        
        // Se o chat para esta comissão estiver aberto, atualiza o conteúdo
        if (widget.classList.contains('visible') && currentChatCommissionId === data.commission_id) {
            openChatWidget(data.commission_id);
        } 
        // Se for cliente e o chat estiver fechado, atualiza o contador de mensagens não lidas
        else if (isClientPage && data.message_for_client) {
            const count = (unreadNotifications.get(data.commission_id) || 0) + 1;
            unreadNotifications.set(data.commission_id, count);
            updateChatIconBadge(data.commission_id, count);
        }
    });

    initializeUnreadCount();
});