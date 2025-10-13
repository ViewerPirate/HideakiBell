// static/js/admin_js/api.js

// Responsável por todas as comunicações com o backend (API).

async function fetchComissoes() {
    try {
        const response = await fetch('/admin/api/comissoes');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Erro ao buscar comissões:", error);
        return [];
    }
}

async function updateComissaoStatus(comissaoId, novoStatus) {
    try {
        const response = await fetch(`/admin/api/comissoes/${comissaoId}/update_status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: novoStatus }),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Erro ao atualizar status:", error);
        return { success: false, message: 'Erro de conexão.' };
    }
}

async function createComissao(comissaoData) {
    try {
        const response = await fetch('/admin/api/comissoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(comissaoData),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Erro ao criar comissão:", error);
        return { success: false, message: 'Erro de conexão.' };
    }
}

async function deleteComissao(comissaoId) {
    try {
        const response = await fetch(`/admin/api/comissoes/${comissaoId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Erro ao excluir comissão:", error);
        return { success: false, message: 'Erro de conexão.' };
    }
}

async function fetchSingleComissao(comissaoId) {
    try {
        const response = await fetch(`/admin/api/comissoes/${comissaoId}`);
        if (!response.ok) throw new Error('Comissão não encontrada');
        return await response.json();
    } catch (error) {
        console.error("Erro ao buscar comissão:", error);
        return null;
    }
}

async function updateComissao(comissaoId, comissaoData) {
    try {
        const response = await fetch(`/admin/api/comissoes/${comissaoId}/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(comissaoData)
        });
        if (!response.ok) throw new Error('Erro ao atualizar comissão');
        return await response.json();
    } catch (error) {
        console.error("Erro ao atualizar comissão:", error);
        return { success: false, message: 'Erro de conexão.' };
    }
}

async function adminConfirmPayment(comissaoId) {
    try {
        const response = await fetch(`/admin/api/comissoes/${comissaoId}/confirm_payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao confirmar pagamento');
        }
        return await response.json();
    } catch (error) {
        console.error("Erro ao confirmar pagamento:", error);
        return { success: false, message: error.message };
    }
}


async function fetchClients() {
    try {
        const response = await fetch('/admin/api/clients');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Erro ao buscar clientes:", error);
        return [];
    }
}

async function fetchSingleClient(clientId) {
    try {
        const response = await fetch(`/admin/api/clients/${clientId}`);
        if (!response.ok) throw new Error('Cliente não encontrado');
        return await response.json();
    } catch (error) {
        console.error("Erro ao buscar cliente:", error);
        return null;
    }
}

async function createClient(clientData) {
    try {
        const response = await fetch('/admin/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientData)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao criar cliente');
        }
        return await response.json();
    } catch (error) {
        console.error("Erro ao criar cliente:", error);
        return { success: false, message: error.message };
    }
}

// --- INÍCIO DA MODIFICAÇÃO ---
async function updateClientDetails(clientId, clientData) {
    try {
        const response = await fetch(`/admin/api/clients/${clientId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clientData)
        });
        return await response.json();
    } catch (error) {
        console.error("Erro ao atualizar cliente:", error);
        return { success: false, message: 'Erro de conexão.' };
    }
}

async function deleteClient(clientId) {
    try {
        const response = await fetch(`/admin/api/clients/${clientId}`, {
            method: 'DELETE'
        });
        return await response.json();
    } catch (error) {
        console.error("Erro ao excluir cliente:", error);
        return { success: false, message: 'Erro de conexão.' };
    }
}
// --- FIM DA MODIFICAÇÃO ---

async function updateClientPreferences(clientId, prefs) {
    try {
        const response = await fetch(`/admin/api/clients/${clientId}/update_prefs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(prefs)
        });
        if (!response.ok) throw new Error('Erro ao atualizar preferências');
        return await response.json();
    } catch (error) {
        console.error("Erro ao atualizar preferências:", error);
        return { success: false, message: 'Erro de conexão.' };
    }
}

async function toggleClientBlock(clientId) {
    try {
        const response = await fetch(`/admin/api/clients/${clientId}/toggle_block`, { method: 'POST' });
        if (!response.ok) throw new Error('Erro ao bloquear/desbloquear');
        return await response.json();
    } catch (error) {
        console.error("Erro ao bloquear/desbloquear cliente:", error);
        return { success: false, message: 'Erro de conexão.' };
    }
}

async function toggleClientBan(clientId) {
    try {
        const response = await fetch(`/admin/api/clients/${clientId}/toggle_ban`, { method: 'POST' });
        if (!response.ok) throw new Error('Erro ao banir/readmitir');
        return await response.json();
    } catch (error) {
        console.error("Erro ao banir/readmitir cliente:", error);
        return { success: false, message: 'Erro de conexão.' };
    }
}

async function toggleAdminStatus(clientId) {
    try {
        const response = await fetch(`/admin/api/clients/${clientId}/toggle_admin`, { method: 'POST' });
        return await response.json();
    } catch (error) {
        console.error("Erro ao alterar status de admin:", error);
        return { success: false, message: 'Erro de conexão.' };
    }
}

async function fetchUnreadCount() {
    try {
        const response = await fetch('/admin/api/notifications/unread_count');
        if (!response.ok) throw new Error('Erro ao buscar contagem');
        return await response.json();
    } catch (error) {
        console.error("Erro ao buscar contagem de notificações:", error);
        return { count: 0 };
    }
}

async function fetchAllNotifications() {
    try {
        const response = await fetch('/admin/api/notifications');
        if (!response.ok) throw new Error('Erro ao buscar notificações');
        return await response.json();
    } catch (error) {
        console.error("Erro ao buscar todas as notificações:", error);
        return [];
    }
}

async function markNotificationsAsRead() {
    try {
        const response = await fetch('/admin/api/notifications/mark_read', { method: 'POST' });
        if (!response.ok) throw new Error('Erro ao marcar como lido');
        return await response.json();
    } catch (error) {
        console.error("Erro ao marcar notificações como lidas:", error);
        return { success: false };
    }
}

async function fetchAgendaComissoes() {
    try {
        const response = await fetch('/admin/api/agenda/comissoes');
        if (!response.ok) throw new Error('Falha ao carregar dados da agenda');
        return await response.json();
    } catch (error) {
        console.error("Erro ao buscar dados para a agenda:", error);
        return [];
    }
}

async function fetchFinancialData(inicio, fim) {
    try {
        const response = await fetch(`/admin/api/financeiro/dados?inicio=${inicio}&fim=${fim}`);
        if (!response.ok) throw new Error('Falha ao carregar dados financeiros');
        return await response.json();
    } catch (error) {
        console.error("Erro ao carregar dados financeiros:", error);
        return null;
    }
}

async function fetchSettings() {
    try {
        const response = await fetch('/admin/api/settings');
        if (!response.ok) throw new Error('Falha ao carregar configurações');
        return await response.json();
    } catch (error) {
        console.error("Erro ao carregar configurações:", error);
        return {};
    }
}

async function saveSettings(settingsData) {
    try {
        const response = await fetch('/admin/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settingsData)
        });
        if (!response.ok) {
             const errorData = await response.json();
             throw new Error(errorData.message || 'Erro desconhecido');
        }
        return await response.json();
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        return { success: false, message: error.message };
    }
}

async function adminAddComment(comissaoId, text) {
    try {
        const response = await fetch(`/admin/api/comissoes/${comissaoId}/comment`, {
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

async function adminAddPreview(comissaoId, previewData) {
    try {
        const response = await fetch(`/admin/api/comissoes/${comissaoId}/preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(previewData)
        });
        return await response.json();
    } catch (error) {
        console.error("Erro ao adicionar pré-visualização:", error);
        return { success: false, message: 'Erro de conexão.' };
    }
}

async function fetchMessages() {
    try {
        const response = await fetch('/admin/api/messages');
        if (!response.ok) throw new Error('Falha ao buscar mensagens');
        return await response.json();
    } catch (error) {
        console.error("Erro ao buscar mensagens:", error);
        showNotification('Não foi possível carregar as mensagens.', 'error');
        return [];
    }
}

async function fetchFaqs() {
    try {
        const response = await fetch('/admin/api/faqs');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Erro ao buscar FAQs:", error);
        showNotification('Não foi possível carregar os FAQs.', 'error');
        return [];
    }
}

async function syncFaqs(faqsData) {
    try {
        const response = await fetch('/admin/api/faqs/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(faqsData)
        });
        return await response.json();
    } catch (error) {
        console.error('Erro ao sincronizar FAQs:', error);
        return { success: false, message: 'Erro de conexão ao salvar FAQs.' };
    }
}