// Arquivo: static/js/admin_js/pages/clientes.js

document.addEventListener('DOMContentLoaded', () => {
    const crmView = document.getElementById('crm-view');
    if (!crmView) {
        return;
    }
    
    const loggedInAdminId = parseInt(document.body.dataset.userId, 10);

    async function initializeCRM() {
        const tableBody = document.getElementById('crm-clients-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;"><div class="spinner"></div></td></tr>';

        try {
            const clients = await fetchClients(); 

            if (clients.length === 0) {
                document.getElementById('kpi-total-clients').textContent = 0;
                document.getElementById('kpi-new-clients').textContent = 0;
                tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum cliente encontrado.</td></tr>';
                return;
            }

            renderKPIs(clients);
            renderCRMTable(clients);

        } catch (error) {
            console.error("Erro ao carregar dados dos clientes:", error);
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--danger);">${error.message}</td></tr>`;
        }
    }

    function renderKPIs(clients) {
        document.getElementById('kpi-total-clients').textContent = clients.length;
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newClientsCount = clients.filter(c => new Date(c.created_at) > thirtyDaysAgo).length;
        document.getElementById('kpi-new-clients').textContent = newClientsCount;
    }

    function renderCRMTable(clients) {
        const tableBody = document.getElementById('crm-clients-table-body');
        tableBody.innerHTML = '';

        clients.forEach(client => {
            const row = document.createElement('tr');
            
            const isAdminText = client.is_admin ? 'Admin' : 'Usuário';
            const isAdminClass = client.is_admin ? 'status-completed' : 'status-cancelled';
            
            const actionText = client.is_admin ? 'Rebaixar' : 'Promover';
            const actionClass = client.is_admin ? 'btn-warning' : 'btn-success';
            const isDisabled = client.id === loggedInAdminId ? 'disabled' : '';
            const creationDate = new Date(client.created_at).toLocaleDateString('pt-BR');

            row.innerHTML = `
                <td><strong>${client.name}</strong></td>
                <td><span class="status ${isAdminClass}">${isAdminText}</span></td>
                <td>${creationDate}</td>
                <td>
                    <label class="switch">
                        <input type="checkbox" class="toggle-block" data-id="${client.id}" ${client.is_blocked ? 'checked' : ''} aria-label="Bloquear ou desbloquear cliente">
                        <span class="slider"></span>
                    </label>
                </td>
                <td>
                    <label class="switch">
                        <input type="checkbox" class="toggle-ban" data-id="${client.id}" ${client.is_banned ? 'checked' : ''} aria-label="Banir ou readmitir cliente">
                        <span class="slider"></span>
                    </label>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm ${actionClass} admin-toggle-btn" data-id="${client.id}" ${isDisabled}>${actionText}</button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

        addTableActionListeners();
    }
    
    function addTableActionListeners() {
        document.querySelectorAll('.admin-toggle-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const btn = e.currentTarget;
                const clientId = btn.dataset.id;
                const currentAction = btn.textContent.trim();
                const confirmationText = `${currentAction === 'Promover' ? 'promover' : 'rebaixar'} o usuário '${btn.closest('tr').querySelector('strong').textContent}'`;

                if (confirm(`Tem certeza que deseja ${confirmationText}?`)) {
                    const result = await toggleAdminStatus(clientId);
                    if (result.success) {
                        showNotification('Status de administrador alterado com sucesso!', 'success');
                        const statusCell = btn.closest('tr').querySelector('td:nth-child(2) span');
                        if (result.is_admin) {
                            btn.textContent = 'Rebaixar';
                            btn.classList.remove('btn-success');
                            btn.classList.add('btn-warning');
                            statusCell.textContent = 'Admin';
                            statusCell.className = 'status status-completed';
                        } else {
                            btn.textContent = 'Promover';
                            btn.classList.remove('btn-warning');
                            btn.classList.add('btn-success');
                            statusCell.textContent = 'Usuário';
                            statusCell.className = 'status status-cancelled';
                        }
                    } else {
                        showNotification(result.message || 'Ocorreu um erro.', 'error');
                    }
                }
            });
        });
        
        document.querySelectorAll('.toggle-block').forEach(toggle => {
            toggle.addEventListener('change', async (e) => {
                await toggleClientBlock(e.target.dataset.id);
                showNotification('Status de bloqueio alterado.', 'success');
            });
        });

        document.querySelectorAll('.toggle-ban').forEach(toggle => {
            toggle.addEventListener('change', async (e) => {
                await toggleClientBan(e.target.dataset.id);
                showNotification('Status de banimento alterado.', 'success');
            });
        });
    }
    
    function setupCreateClientModal() {
        const createClientModal = document.getElementById('create-client-modal');
        const newClientBtn = document.getElementById('crm-add-client-btn');
        const createClientForm = document.getElementById('create-client-form');

        if (newClientBtn) {
            newClientBtn.addEventListener('click', () => {
                createClientForm.reset();
                createClientModal.style.display = 'flex';
            });
        }
    
        if (createClientModal) {
            createClientModal.addEventListener('click', (event) => {
                if (event.target === createClientModal || event.target.closest('.close-modal')) {
                    createClientModal.style.display = 'none';
                }
            });
        }
    
        if (createClientForm) {
            createClientForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const clientData = {
                    name: document.getElementById('new-client-name').value,
                };
    
                const result = await createClient(clientData); 
    
                if (result.success) {
                    createClientModal.style.display = 'none';
                    showNotification('Cliente criado com sucesso!', 'success');
                    initializeCRM(); 
                } else {
                    alert(`Erro: ${result.message}`);
                }
            });
        }
    }

    initializeCRM();
    setupCreateClientModal();
});