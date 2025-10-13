// Arquivo: static/js/admin_js/pages/plugins.js

document.addEventListener('DOMContentLoaded', () => {
    const pluginsListContainer = document.getElementById('plugins-list-container');
    if (!pluginsListContainer) {
        return;
    }

    const addPluginBtn = document.getElementById('add-plugin-btn');
    const pluginModal = document.getElementById('plugin-modal');
    const closeModalBtns = pluginModal.querySelectorAll('.close-modal');
    const savePluginBtn = document.getElementById('save-plugin-btn');
    const pluginCodeTextarea = document.getElementById('plugin-code-textarea');
    const errorMessage = document.getElementById('plugin-error-message');
    const pluginScopeSelect = document.getElementById('plugin-scope');

    const api = {
        async getPlugins() {
            const response = await fetch('/admin/api/plugins');
            if (!response.ok) throw new Error('Falha ao buscar plugins.');
            return response.json();
        },
        async addPlugin(code, scope) {
            const response = await fetch('/admin/api/plugins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, scope })
            });
            return response.json();
        },
        async togglePlugin(id) {
            const response = await fetch(`/admin/api/plugins/${id}/toggle`, { method: 'POST' });
            return response.json();
        },
        async deletePlugin(id) {
            const response = await fetch(`/admin/api/plugins/${id}`, { method: 'DELETE' });
            return response.json();
        }
    };

    function renderPlugins(plugins) {
        pluginsListContainer.innerHTML = '';
        if (plugins.length === 0) {
            pluginsListContainer.innerHTML = '<p style="text-align:center; color: var(--cor-texto-secundario);">Nenhum plugin instalado.</p>';
            return;
        }

        plugins.forEach(plugin => {
            const card = document.createElement('div');
            card.className = 'plugin-card';
            
            const scopeBadge = plugin.scope === 'public'
                ? `<span class="status status-revisions" style="font-size: 0.7rem; vertical-align: middle; margin-left: 10px;">Público</span>`
                : `<span class="status status-pending" style="font-size: 0.7rem; vertical-align: middle; margin-left: 10px;">Admin</span>`;

            card.innerHTML = `
                <h4>${plugin.name} ${scopeBadge} <small>v${plugin.version}</small></h4>
                <p>${plugin.description}</p>
                <div class="plugin-actions">
                    <button class="btn btn-sm ${plugin.is_active ? 'btn-light' : 'btn-primary'}" data-action="toggle" data-id="${plugin.id}" data-name="${plugin.name}">
                        <i class="fas fa-power-off"></i> ${plugin.is_active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button class="btn btn-sm btn-danger" data-action="delete" data-id="${plugin.id}" data-name="${plugin.name}">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </div>
            `;
            pluginsListContainer.appendChild(card);
        });
    }

    async function loadAndRenderPlugins() {
        try {
            pluginsListContainer.innerHTML = '<div class="spinner"></div>';
            const plugins = await api.getPlugins();
            renderPlugins(plugins);
        } catch (error) {
            pluginsListContainer.innerHTML = `<p style="color: var(--danger);">${error.message}</p>`;
        }
    }

    function handleModalOpen() {
        pluginCodeTextarea.value = '';
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
        pluginModal.style.display = 'flex';
    }

    function handleModalClose() {
        pluginModal.style.display = 'none';
    }

    async function handleSavePlugin() {
        const code = pluginCodeTextarea.value.trim();
        const scope = pluginScopeSelect.value;

        if (!code) {
            errorMessage.textContent = 'O campo de código não pode estar vazio.';
            errorMessage.style.display = 'block';
            return;
        }

        savePluginBtn.disabled = true;
        savePluginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

        try {
            const result = await api.addPlugin(code, scope);
            if (result.success) {
                // INÍCIO DA MODIFICAÇÃO
                sessionStorage.setItem('plugin_action_notification', JSON.stringify({
                    message: result.message,
                    type: 'success'
                }));
                location.reload(); // Recarrega para aplicar o novo estado
                // FIM DA MODIFICAÇÃO
            } else {
                errorMessage.textContent = result.message;
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            errorMessage.textContent = 'Erro de conexão com o servidor.';
            errorMessage.style.display = 'block';
        } finally {
            savePluginBtn.disabled = false;
            savePluginBtn.textContent = 'Salvar Plugin';
        }
    }

    async function handleListClick(event) {
        const button = event.target.closest('button');
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;
        const name = button.dataset.name;

        if (action === 'toggle') {
            const result = await api.togglePlugin(id);
            if (result.success) {
                // INÍCIO DA MODIFICAÇÃO
                const isActive = button.textContent.includes('Ativar');
                const message = `Plugin '${name}' ${isActive ? 'ativado' : 'desativado'}. Recarregue para ver os efeitos.`;
                const type = isActive ? 'success' : 'warning';

                sessionStorage.setItem('plugin_action_notification', JSON.stringify({ message, type }));
                location.reload();
                // FIM DA MODIFICAÇÃO
            }
        } else if (action === 'delete') {
            if (confirm(`Tem certeza que deseja excluir permanentemente o plugin "${name}"?`)) {
                const result = await api.deletePlugin(id);
                if (result.success) {
                    sessionStorage.setItem('plugin_action_notification', JSON.stringify({
                        message: result.message,
                        type: 'success'
                    }));
                    location.reload();
                }
            }
        }
    }

    addPluginBtn.addEventListener('click', handleModalOpen);
    closeModalBtns.forEach(btn => btn.addEventListener('click', handleModalClose));
    pluginModal.addEventListener('click', (e) => {
        if (e.target === pluginModal) handleModalClose();
    });
    savePluginBtn.addEventListener('click', handleSavePlugin);
    pluginsListContainer.addEventListener('click', handleListClick);

    loadAndRenderPlugins();
    
    // --- CÓDIGO DO PLUGIN ADICIONADO ABAIXO ---
    initializePluginViewer();
});


/**
 * Inicializa toda a lógica para o visualizador de código de plugins.
 * Esta função será chamada quando a página de plugins for carregada.
 */
function initializePluginViewer() {
    const triggerButton = document.getElementById('btn-plugin-viewer');
    const modal = document.getElementById('modal-plugin-viewer');
    
    // Se os elementos não existirem, não faz nada.
    if (!triggerButton || !modal) {
        return;
    }

    const select = document.getElementById('active-plugins-select');
    const textarea = document.getElementById('viewer-code-textarea');
    const copyBtn = document.getElementById('copy-code-btn');
    const closeBtns = modal.querySelectorAll('.close-modal');

    const openViewerModal = () => {
        select.innerHTML = ''; // Limpa opções antigas
        const activePlugins = window.INJECTED_PLUGINS || [];
        
        if (activePlugins.length === 0) {
            select.innerHTML = '<option disabled>Nenhum plugin ativo encontrado.</option>';
            textarea.value = '';
        } else {
            activePlugins.forEach(plugin => {
                const nameMatch = plugin.code.match(/export\s+const\s+name\s*=\s*['"]([^'"]+)['"]/);
                const pluginName = nameMatch ? nameMatch[1] : plugin.id;

                const option = document.createElement('option');
                option.value = plugin.id;
                option.textContent = pluginName;
                select.appendChild(option);
            });
            select.dispatchEvent(new Event('change'));
        }
        modal.style.display = 'flex';
    };

    const closeViewerModal = () => {
        modal.style.display = 'none';
    };

    triggerButton.addEventListener('click', openViewerModal);
    closeBtns.forEach(btn => btn.addEventListener('click', closeViewerModal));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeViewerModal();
    });

    select.addEventListener('change', () => {
        const selectedId = select.value;
        const activePlugins = window.INJECTED_PLUGINS || [];
        const plugin = activePlugins.find(p => p.id === selectedId);
        textarea.value = plugin ? plugin.code : 'Código não encontrado.';
    });

    copyBtn.addEventListener('click', () => {
        textarea.select();
        navigator.clipboard.writeText(textarea.value).then(() => {
            // Usa a função de notificação global do seu projeto
            showNotification('Código copiado para a área de transferência!', 'success');
        }).catch(err => {
            showNotification('Falha ao copiar o código.', 'error');
            console.error('Erro de cópia:', err);
        });
    });
}