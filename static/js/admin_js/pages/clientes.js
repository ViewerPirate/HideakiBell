// Arquivo: static/js/admin_js/pages/clientes.js

document.addEventListener('DOMContentLoaded', () => {
    const crmView = document.getElementById('crm-view');
    if (!crmView) return;
    
    // Pega o ID do admin logado para evitar auto-ações destrutivas
    const loggedInAdminId = parseInt(document.body.dataset.userId, 10);
    let currentManagingClientId = null; // Armazena o ID do cliente sendo editado no modal

    /**
     * Função principal que busca os dados e inicia a renderização da página.
     */
    async function initializeCRM() {
        const tableBody = document.getElementById('crm-clients-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;"><div class="spinner"></div></td></tr>';

        try {
            const clients = await fetchClients(); 

            renderKPIs(clients);
            renderCRMTable(clients);

        } catch (error) {
            console.error("Erro ao carregar dados dos clientes:", error);
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--danger);">${error.message}</td></tr>`;
        }
    }

    /**
     * Renderiza os cards de indicadores (KPIs).
     * @param {Array} clients - A lista de clientes.
     */
    function renderKPIs(clients) {
        document.getElementById('kpi-total-clients').textContent = clients.length;
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newClientsCount = clients.filter(c => new Date(c.created_at) > thirtyDaysAgo).length;
        document.getElementById('kpi-new-clients').textContent = newClientsCount;
    }

    /**
     * Renderiza a tabela principal de clientes.
     * @param {Array} clients - A lista de clientes.
     */
    function renderCRMTable(clients) {
        const tableBody = document.getElementById('crm-clients-table-body');
        tableBody.innerHTML = '';
        if (clients.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum cliente encontrado.</td></tr>';
            return;
        }

        clients.forEach(client => {
            const row = document.createElement('tr');
            const isAdminText = client.is_admin ? 'Admin' : 'Usuário';
            const isAdminClass = client.is_admin ? 'status-completed' : 'status-cancelled';
            const creationDate = new Date(client.created_at).toLocaleDateString('pt-BR');
            const statusIndicator = client.is_banned ? '<span class="status status-cancelled">Banido</span>' : (client.is_blocked ? '<span class="status status-pending">Bloqueado</span>' : '<span class="status status-in-progress">Ativo</span>');
            
            row.innerHTML = `
                <td><strong>${client.username}</strong></td>
                <td><span class="status ${isAdminClass}">${isAdminText}</span></td>
                <td>${creationDate}</td>
                <td>${statusIndicator}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary manage-client-btn" data-id="${client.id}">
                            <i class="fas fa-cog"></i> Gerenciar
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Adiciona o listener para os novos botões "Gerenciar"
        document.querySelectorAll('.manage-client-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const clientId = e.currentTarget.dataset.id;
                const clientData = await fetchSingleClient(clientId);
                if (clientData) {
                    openManageClientModal(clientData);
                } else {
                    showNotification('Não foi possível carregar os dados do cliente.', 'error');
                }
            });
        });
    }

    /**
     * Abre e preenche o novo modal de gerenciamento de cliente.
     * @param {object} client - Os dados do cliente a ser gerenciado.
     */
    function openManageClientModal(client) {
        currentManagingClientId = client.id;
        
        const modal = document.getElementById('manage-client-modal');
        modal.querySelector('#manage-client-modal-title').textContent = `Gerenciar: ${client.username}`;
        modal.querySelector('#manage-client-id').value = client.id;
        
        modal.querySelector('#manage-client-username').value = client.username;
        modal.querySelector('#manage-client-password').value = ''; 
        
        const adminToggle = modal.querySelector('#manage-client-is-admin');
        adminToggle.checked = client.is_admin;
        adminToggle.disabled = client.id === loggedInAdminId;
        
        modal.querySelector('#manage-client-is-blocked').checked = client.is_blocked;
        modal.querySelector('#manage-client-is-banned').checked = client.is_banned;
        
        modal.style.display = 'flex';
    }

    /**
     * Configura todos os listeners de eventos para o modal de gerenciamento.
     * É chamada apenas uma vez, no carregamento da página.
     */
    function setupManageClientModalListeners() {
        const modal = document.getElementById('manage-client-modal');
        if (!modal) return;

        const form = modal.querySelector('#manage-client-form');
        const deleteBtn = modal.querySelector('#delete-client-btn');
        const adminToggle = modal.querySelector('#manage-client-is-admin');
        const blockToggle = modal.querySelector('#manage-client-is-blocked');
        const banToggle = modal.querySelector('#manage-client-is-banned');

        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.closest('.close-modal')) {
                modal.style.display = 'none';
                currentManagingClientId = null;
                initializeCRM(); // Recarrega a tabela para garantir que os dados estejam atualizados
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const clientId = currentManagingClientId;
            if (!clientId) return;
            
            const newUsername = document.getElementById('manage-client-username').value;
            const newPassword = document.getElementById('manage-client-password').value;
            
            const dataToUpdate = {};
            if (newUsername) {
                dataToUpdate.username = newUsername;
            }
            if (newPassword) {
                dataToUpdate.password = newPassword;
            }
            
            // Só envia a requisição se houver algo para atualizar
            if (Object.keys(dataToUpdate).length > 0) {
                const result = await updateClientDetails(clientId, dataToUpdate);
                if (result.success) {
                    showNotification('Dados do cliente salvos!', 'success');
                } else {
                    showNotification(result.message || 'Erro ao salvar dados.', 'error');
                }
            }
        });
        
        adminToggle.addEventListener('change', async () => {
             if (!currentManagingClientId) return;
             const result = await toggleAdminStatus(currentManagingClientId);
             showNotification(result.message, result.success ? 'success' : 'error');
             if (!result.success) adminToggle.checked = !adminToggle.checked;
        });
        
        blockToggle.addEventListener('change', async () => {
            if (!currentManagingClientId) return;
            await toggleClientBlock(currentManagingClientId);
            showNotification('Status de bloqueio alterado.', 'success');
        });

        banToggle.addEventListener('change', async () => {
            if (!currentManagingClientId) return;
            await toggleClientBan(currentManagingClientId);
            showNotification('Status de banimento alterado.', 'success');
        });

        deleteBtn.addEventListener('click', async () => {
            const clientId = currentManagingClientId;
            if (!clientId) return;
            
            const clientUsername = document.getElementById('manage-client-username').value;
            if (confirm(`ATENÇÃO: Tem certeza que deseja excluir permanentemente o cliente "${clientUsername}"?\n\nEsta ação não pode ser desfeita.`)) {
                const result = await deleteClient(clientId);
                if (result.success) {
                    showNotification(result.message, 'success');
                    modal.style.display = 'none';
                    initializeCRM(); // Refresh table
                } else {
                    showNotification(result.message, 'error');
                }
            }
        });
    }

    /**
     * Configura os listeners para o modal de criação de cliente.
     */
    function setupCreateClientModal() {
        const createModal = document.getElementById('create-client-modal');
        const newClientBtn = document.getElementById('crm-add-client-btn');
        const createForm = document.getElementById('create-client-form');

        if (newClientBtn) {
            newClientBtn.addEventListener('click', () => {
                if (createForm) createForm.reset();
                if (createModal) createModal.style.display = 'flex';
            });
        }
    
        if (createModal) {
            createModal.addEventListener('click', (event) => {
                if (event.target === createModal || event.target.closest('.close-modal')) {
                    createModal.style.display = 'none';
                }
            });
        }
    
        if (createForm) {
            createForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const clientData = {
                    username: document.getElementById('new-client-name').value,
                };
    
                const result = await createClient(clientData); 
    
                if (result.success) {
                    createModal.style.display = 'none';
                    showNotification('Cliente criado com sucesso!', 'success');
                    initializeCRM(); 
                } else {
                    showNotification(`Erro: ${result.message}`, 'error');
                }
            });
        }
    }

    // Chamadas iniciais
    initializeCRM();
    setupManageClientModalListeners();
    setupCreateClientModal();
});