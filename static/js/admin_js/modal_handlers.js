// static/js/admin_js/modal_handlers.js

/**
 * Anexa os event listeners para o modal de CRIAÇÃO de comissão.
 */
function addCreateModalListeners() {
    const createModal = document.getElementById('createCommissionModal');
    const newCommissionBtn = document.getElementById('new-commission-btn');
    const createCommissionForm = document.getElementById('create-commission-form');
    if (newCommissionBtn) {
        newCommissionBtn.addEventListener('click', (event) => {
            event.preventDefault();
            if (createCommissionForm) createCommissionForm.reset();
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

    if (createCommissionForm) {
        createCommissionForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const novaComissao = {
                client: document.getElementById('create-client').value,
                type: document.getElementById('create-type').value,
                price: parseFloat(document.getElementById('create-price').value),
                deadline: document.getElementById('create-deadline').value,
                description: document.getElementById('create-description').value,
            };
            const result = await createComissao(novaComissao);
            if (result.success) {
                createModal.style.display = 'none';
                // Recarrega a página para exibir a nova comissão e atualizar todos os dados
                location.reload(); 
            } else {
                // Usa a função correta
                showNotification(`Erro ao criar comissão: ${result.message}`, 'error');
            }
        });
    }
}

/**
 * Anexa os event listeners para o modal de EDIÇÃO de comissão.
 */
function addEditModalListeners() {
    const editModal = document.getElementById('editCommissionModal');
    const editCommissionForm = document.getElementById('edit-commission-form');
    if (editModal) {
        editModal.addEventListener('click', (event) => {
            if (event.target === editModal || event.target.closest('.close-modal')) {
                editModal.style.display = 'none';
            }
        });
    }

    if (editCommissionForm) {
        editCommissionForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const comissaoId = document.getElementById('edit-id').value;
            
            const updatedData = {
                client: document.getElementById('edit-client').value,
                type: document.getElementById('edit-type').value,
                price: parseFloat(document.getElementById('edit-price').value),
                deadline: document.getElementById('edit-deadline').value,
                description: document.getElementById('edit-description').value,
            };

            const result = await updateComissao(comissaoId, updatedData);

            if (result.success) {
                editModal.style.display = 'none';
                location.reload();
            } else {
                showNotification(`Erro ao atualizar comissão: ${result.message}`, 'error');
            }
        });
    }
}

/**
 * Anexa os event listeners para os botões GLOBAIS do modal de detalhes.
 */
function addDetailsModalListeners() {
    const orderDetailsModal = document.getElementById('orderDetailsModal');
    const saveButton = document.getElementById('modal-save-button');
    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            const comissaoId = saveButton.dataset.id;
            const statusSelect = document.getElementById('modal-status-select');
            const novoStatus = statusSelect.value;
            
            const result = await updateComissaoStatus(comissaoId, novoStatus);
            
            if (result.success) {
                orderDetailsModal.style.display = 'none';
                location.reload();
            } else {
                showNotification(`Erro ao atualizar status: ${result.message}`, 'error');
            }
        });
    }

    if(orderDetailsModal) {
        orderDetailsModal.addEventListener('click', (event) => {
            if (event.target === orderDetailsModal || event.target.closest('.close-modal')) {
                orderDetailsModal.style.display = 'none';
            }
        });
    }
}

/**
 * Anexa os listeners para os formulários e botões DENTRO do modal de detalhes.
 * @param {object} comissao - O objeto da comissão atual.
 */
function setupAdminModalHandlers(comissao) {
    const addPreviewForm = document.getElementById('add-preview-form');
    const addCommentForm = document.getElementById('add-comment-form');
    const versionButtons = document.querySelectorAll('.version-btn');
    const confirmPaymentBtn = document.getElementById('admin-confirm-payment-btn');
    if (addPreviewForm) {
        addPreviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const url = document.getElementById('new-preview-url').value;
            const comment = document.getElementById('new-preview-comment').value;

            if (!url) {
                showNotification('A URL da imagem é obrigatória.', 'error');
                return;
            }

            const result = await adminAddPreview(comissao.id, { url, comment });
            if (result.success) {
                showNotification('Pré-visualização adicionada!', 'success');
                const updatedComissao = await fetchSingleComissao(comissao.id);
                renderModalDetails(updatedComissao); // Re-renderiza o modal com os novos dados
            } else {
                showNotification(result.message || 'Erro ao adicionar prévia.', 'error');
            }
        });
    }

    if (addCommentForm) {
        addCommentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const textInput = document.getElementById('new-comment-text');
            const text = textInput.value;

            if (!text.trim()) return;

            const result = await adminAddComment(comissao.id, text);
            if (result.success) {
                textInput.value = ''; // Limpa o campo após o envio
                const updatedComissao = await fetchSingleComissao(comissao.id);
                renderModalDetails(updatedComissao); // Re-renderiza o modal com o novo comentário
            } else {
                showNotification(result.message || 'Erro ao enviar mensagem.', 'error');
            }
        });
    }
    
    versionButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const index = e.currentTarget.dataset.versionIndex;
            // Cria uma cópia local para não precisar buscar novamente do servidor
            const comissaoParaRenderizar = { ...comissao };
            comissaoParaRenderizar.current_preview = parseInt(index);
            renderModalDetails(comissaoParaRenderizar);
        });
    });
    if (confirmPaymentBtn) {
        confirmPaymentBtn.addEventListener('click', async () => {
            if (confirm(`Tem certeza que deseja confirmar o recebimento do pagamento para o pedido #${comissao.id}? Esta ação iniciará a comissão.`)) {
                const result = await adminConfirmPayment(comissao.id);
                if (result.success) {
                    showNotification(result.message, 'success');
                    const updatedComissao = await fetchSingleComissao(comissao.id);
                    renderModalDetails(updatedComissao); // Re-renderiza o modal
                } else {
                    showNotification(result.message || 'Erro ao confirmar pagamento.', 'error');
                }
            }
        });
    }
}

// Inicializa todos os listeners de modais quando o script é carregado.
document.addEventListener('DOMContentLoaded', () => {
    addCreateModalListeners();
    addEditModalListeners();
    addDetailsModalListeners();
});