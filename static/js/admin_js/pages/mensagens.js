document.addEventListener('DOMContentLoaded', () => {
    // Estado da página
    let allMessages = [];
    let selectedMessageId = null;

    // Elementos do DOM
    const listContainer = document.getElementById('message-list-container');
    const viewerPanel = document.getElementById('message-viewer');
    const placeholder = document.getElementById('message-viewer-placeholder');
    const contentWrapper = document.getElementById('message-content-wrapper');

    // Funções de API
    async function fetchMessages() {
        try {
            const response = await fetch('/admin/api/messages');
            if (!response.ok) throw new Error('Falha ao buscar mensagens');
            return await response.json();
        } catch (error) {
            console.error(error);
            listContainer.innerHTML = '<p style="padding: 20px; text-align: center;">Erro ao carregar mensagens.</p>';
            return [];
        }
    }

    async function markAsRead(id) {
        try {
            await fetch(`/admin/api/messages/${id}/read`, { method: 'POST' });
        } catch (error) {
            console.error('Falha ao marcar mensagem como lida:', error);
        }
    }

    async function deleteMessage(id) {
        try {
            const response = await fetch(`/admin/api/messages/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Falha ao excluir mensagem');
            return await response.json();
        } catch (error) {
            console.error('Falha ao excluir mensagem:', error);
            return { success: false, message: 'Erro de conexão.' };
        }
    }

    // Funções de Renderização
    function renderMessageList() {
        listContainer.innerHTML = '';
        if (allMessages.length === 0) {
            listContainer.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--cor-texto-secundario);">Nenhuma mensagem na caixa de entrada.</p>';
            return;
        }

        allMessages.forEach(msg => {
            const item = document.createElement('a');
            item.href = '#';
            item.className = 'message-item';
            item.dataset.id = msg.id;
            if (!msg.is_read) {
                item.classList.add('unread');
            }
            if (msg.id === selectedMessageId) {
                item.classList.add('active');
            }

            const receivedDate = new Date(msg.received_at);
            const formattedDate = receivedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

            item.innerHTML = `
                <div class="sender-name">${msg.sender_name}</div>
                <div class="message-timestamp">${formattedDate}</div>
            `;
            listContainer.appendChild(item);
        });
    }

    function renderMessageViewer(message) {
        if (!message) {
            placeholder.style.display = 'flex';
            contentWrapper.style.display = 'none';
            selectedMessageId = null;
            return;
        }

        selectedMessageId = message.id;
        placeholder.style.display = 'none';
        
        const receivedDate = new Date(message.received_at);
        const formattedDateTime = receivedDate.toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });

        contentWrapper.innerHTML = `
            <div class="message-viewer-content">
                <div class="message-header">
                    <h2>De: ${message.sender_name}</h2>
                    <div class="message-meta">
                        <span>&lt;${message.sender_email}&gt;</span> - <span>${formattedDateTime}</span>
                    </div>
                </div>
                <div class="message-body">
                    ${message.message_content}
                </div>
            </div>
            <div class="message-actions">
                <button class="btn btn-danger" id="delete-message-btn" data-id="${message.id}"><i class="fas fa-trash"></i> Excluir</button>
            </div>
        `;
        contentWrapper.style.display = 'flex';
        contentWrapper.style.flexDirection = 'column';
        contentWrapper.style.height = '100%';
    }

    // Event Listeners
    listContainer.addEventListener('click', async (e) => {
        e.preventDefault();
        const targetItem = e.target.closest('.message-item');
        if (!targetItem) return;

        const messageId = parseInt(targetItem.dataset.id);
        const message = allMessages.find(m => m.id === messageId);
        if (!message) return;
        
        renderMessageViewer(message);
        
        if (targetItem.classList.contains('unread')) {
            await markAsRead(messageId);
            const msgInState = allMessages.find(m => m.id === messageId);
            if (msgInState) msgInState.is_read = 1;
        }
        
        renderMessageList();
    });
    
    viewerPanel.addEventListener('click', async (e) => {
        if (e.target.closest('#delete-message-btn')) {
            const button = e.target.closest('#delete-message-btn');
            const messageId = parseInt(button.dataset.id);
            if (confirm('Tem certeza que deseja excluir esta mensagem permanentemente?')) {
                const result = await deleteMessage(messageId);
                if (result.success) {
                    allMessages = allMessages.filter(m => m.id !== messageId);
                    renderMessageViewer(null); // Limpa o visualizador
                    renderMessageList();
                    showNotification('Mensagem excluída.', 'success');
                } else {
                    showNotification(result.message || 'Não foi possível excluir a mensagem.', 'error');
                }
            }
        }
    });

    // Carregamento Inicial
    async function init() {
        allMessages = await fetchMessages();
        renderMessageList();
    }

    init();
});