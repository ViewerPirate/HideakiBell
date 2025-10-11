// Arquivo: static/js/admin_js/render/tables.js

/**
 * Retorna o texto e a classe CSS para o status da comissão no painel do admin.
 * @param {object} comissao O objeto da comissão.
 * @returns {{text: string, className: string}}
 */
function getAdminStatusInfo(comissao) {
    if (comissao.status === 'pending_payment') {
        if (comissao.payment_status === 'awaiting_confirmation') {
            return { text: 'Aguardando Confirmação Pag.', className: 'status-revisions' };
        }
        return { text: 'Aguardando Pagamento', className: 'status-pending' };
    }
    return {
        text: comissao.status.replace('_', ' '),
        className: `status-${comissao.status.replace('_', '-')}`
    };
}

/**
 * Renderiza a tabela de comissões.
 * @param {Array} comissoes - A lista de comissões a ser renderizada.
 */
function renderComissoesTable(comissoes) {
    const tableBody = document.getElementById('comissoes-table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    if (comissoes.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Nenhuma comissão encontrada.</td></tr>';
        return;
    }

    comissoes.forEach(comissao => {
        const precoFormatado = comissao.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const dataFormatada = new Date(comissao.date + 'T00:00:00').toLocaleDateString('pt-BR');
        const prazoFormatado = new Date(comissao.deadline + 'T00:00:00').toLocaleDateString('pt-BR');
        const statusInfo = getAdminStatusInfo(comissao);

        const row = document.createElement('tr');
        // ==========================================================
        // INÍCIO DA MODIFICAÇÃO: Adição do botão de chat
        // ==========================================================
        row.innerHTML = `
            <td>${comissao.id}</td>
            <td>${comissao.client}</td>
            <td>${comissao.type}</td>
            <td>${dataFormatada}</td>
            <td>${prazoFormatado}</td>
            <td>${precoFormatado}</td>
            <td><span class="status ${statusInfo.className}">${statusInfo.text}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-light chat-trigger-btn" data-id="${comissao.id}" title="Abrir Chat Rápido">
                        <i class="fas fa-comments"></i>
                    </button>
                    <button class="btn btn-sm btn-light view-btn" data-id="${comissao.id}" title="Ver Detalhes">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-light edit-btn" data-id="${comissao.id}" title="Editar Comissão">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${comissao.id}" title="Excluir Comissão">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        // ========================================================
        // FIM DA MODIFICAÇÃO
        // ========================================================
        tableBody.appendChild(row);
    });

    addTableButtonListeners(comissoes);
}

/**
 * Adiciona os event listeners para os botões de ação na tabela de comissões.
 * @param {Array} comissoes - A lista de comissões (usada para referência).
 */
function addTableButtonListeners(comissoes) {
    document.querySelectorAll('.view-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const comissaoId = event.currentTarget.getAttribute('data-id');
            const comissaoData = await fetchSingleComissao(comissaoId);
            if (comissaoData) renderModalDetails(comissaoData);
        });
    });
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const comissaoId = event.currentTarget.getAttribute('data-id');
            if (confirm(`Você tem certeza que deseja excluir a comissão #${comissaoId}?`)) {
                const result = await deleteComissao(comissaoId);
                if (result.success) {
                    showNotification('Comissão excluída com sucesso!', 'success');
                    location.reload();
                } else {
                    showNotification(result.message, 'error');
                }
            }
        });
    });
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const comissaoId = event.currentTarget.getAttribute('data-id');
            const comissaoData = await fetchSingleComissao(comissaoId);
            if (comissaoData) {
                document.getElementById('edit-modal-title').textContent = `Editar Comissão #${comissaoData.id}`;
                document.getElementById('edit-id').value = comissaoData.id;
                document.getElementById('edit-client').value = comissaoData.client;
                document.getElementById('edit-type').value = comissaoData.type;
                document.getElementById('edit-price').value = comissaoData.price;
                document.getElementById('edit-deadline').value = comissaoData.deadline;
                document.getElementById('edit-description').value = comissaoData.description;
                document.getElementById('editCommissionModal').style.display = 'flex';
            }
        });
    });
}

/**
 * Renderiza os cards de clientes na página de clientes.
 * @param {Array} clients - A lista de clientes.
 */
function renderClientCards(clients) {
    const clientListContainer = document.getElementById('client-list');
    if (!clientListContainer) return;
    clientListContainer.innerHTML = '';
    if (clients.length === 0) {
        clientListContainer.innerHTML = '<p>Nenhum cliente encontrado.</p>';
        return;
    }

    clients.forEach(client => {
        let statusBadge = '';
        if (client.is_banned) {
            statusBadge = '<span class="status status-cancelled" style="font-size: 0.7rem;">Banido</span>';
        } else if (client.is_blocked) {
            statusBadge = '<span class="status status-pending" style="font-size: 0.7rem;">Bloqueado</span>';
        }

        const clientCard = document.createElement('div');
        clientCard.className = 'card';
        clientCard.innerHTML = `
            <div class="card-header">
                <div class="card-title" style="font-weight: bold; color: var(--cor-texto-principal);">
                    ${client.name} ${statusBadge}
                </div>
                <div class="card-icon primary"><i class="fas fa-user"></i></div>
            </div>
            <p style="font-size: 0.9em; margin: 0 0 15px 0; color: var(--cor-texto-secundario);">${client.email}</p>
            <div class="action-buttons" style="justify-content: flex-end;">
                <button class="btn btn-sm btn-light manage-client-btn" data-id="${client.id}">
                    <i class="fas fa-cog"></i> Gerenciar
                </button>
            </div>`;
        clientListContainer.appendChild(clientCard);
    });

    addClientCardButtonListeners();
}

/**
 * Adiciona listeners aos botões "Gerenciar" dos cards de cliente.
 */
function addClientCardButtonListeners() {
    document.querySelectorAll('.manage-client-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const clientId = event.currentTarget.dataset.id;
            const clientData = await fetchSingleClient(clientId);
            if (clientData) renderClientModal(clientData);
        });
    });
}