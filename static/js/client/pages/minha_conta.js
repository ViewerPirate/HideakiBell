// Arquivo: static/js/client/pages/minha_conta.js
// Lógica para a página "Minha Conta" do cliente.
document.addEventListener('DOMContentLoaded', () => {
    // Formulários e elementos da página
    const profileForm = document.getElementById('profile-form');
    if (!profileForm) return; // Garante que o script só rode na página correta

    const passwordForm = document.getElementById('password-form');
    const deleteForm = document.getElementById('delete-form');
    
    const accUsername = document.getElementById('acc-username');
    
    const accAvatarUrl = document.getElementById('acc-avatar-url');
    const avatarPreview = document.getElementById('avatar-preview');

    const currentPass = document.getElementById('acc-current-pass');
    const newPass = document.getElementById('acc-new-pass');
    const confirmPass = document.getElementById('acc-confirm-pass');

    const initiateDeleteBtn = document.getElementById('initiate-delete-btn');
    const deleteSection = document.getElementById('delete-confirmation-section');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const deleteConfirmPass = document.getElementById('delete-confirm-pass');

    // Adiciona um listener para atualizar a pré-visualização do avatar em tempo real
    if (accAvatarUrl && avatarPreview) {
        accAvatarUrl.addEventListener('input', () => {
            const newUrl = accAvatarUrl.value.trim();
            // Se o campo estiver vazio, mostra a imagem placeholder
            if (newUrl) {
                avatarPreview.src = newUrl;
            } else {
                avatarPreview.src = 'https://placehold.co/150x150/1e1e1e/ffffff?text=Preview';
            }
        });
        // Garante que o preview não mostre uma imagem quebrada se a URL for inválida
        avatarPreview.onerror = () => {
            avatarPreview.src = 'https://placehold.co/150x150/ff0000/ffffff?text=Inválido';
        };
    }

    // 1. Lógica para o formulário de Perfil
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = accUsername.value.trim();
        const avatar_url = accAvatarUrl.value.trim();

        if (!username) {
            showNotification('O nome de usuário é obrigatório.', 'error');
            return;
        }

        toggleLoading(true);
        // Envia apenas o nome de usuário e avatar para a API
        const result = await updateUserProfile({ username, avatar_url });
        toggleLoading(false);

        if (result.success) {
            showNotification(result.message, 'success');
            // Atualiza o nome de usuário e o avatar no menu do cabeçalho
            const body = document.body;
            body.dataset.username = result.newUsername;
            body.dataset.avatarUrl = result.newAvatar;
            // Força a reconstrução do menu do header com os novos dados
            if (typeof buildUnifiedHeader === 'function') {
                buildUnifiedHeader();
            }
        } else {
            showNotification(result.message || 'Ocorreu um erro ao atualizar o perfil.', 'error');
        }
    });

    // 2. Lógica para o formulário de Senha
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const current_password = currentPass.value;
        const new_password = newPass.value;
        const confirm_password = confirmPass.value;

        if (new_password.length < 6) {
            showNotification('A nova senha deve ter pelo menos 6 caracteres.', 'error');
            return;
        }

        if (new_password !== confirm_password) {
            showNotification('As novas senhas não coincidem.', 'error');
            return;
        }

        toggleLoading(true);
        const result = await updateUserPassword({ current_password, new_password });
        toggleLoading(false);

        if (result.success) {
            showNotification(result.message, 'success');
            passwordForm.reset(); // Limpa os campos de senha
        } else {
            showNotification(result.message || 'Ocorreu um erro ao alterar a senha.', 'error');
        }
    });

    // 3. Lógica para a Zona de Perigo (Excluir Conta)
    initiateDeleteBtn.addEventListener('click', () => {
        deleteSection.style.display = 'block';
        initiateDeleteBtn.style.display = 'none';
    });
    cancelDeleteBtn.addEventListener('click', () => {
        deleteSection.style.display = 'none';
        initiateDeleteBtn.style.display = 'inline-flex';
        deleteForm.reset();
    });
    deleteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = deleteConfirmPass.value;
        
        if (!password) {
            showNotification('Por favor, digite sua senha para confirmar.', 'error');
            return;
        }

        toggleLoading(true);
        const result = await deleteUserAccount(password);
        toggleLoading(false);

        if (result.success) {
            // A notificação pode não ser visível se o redirecionamento for muito rápido,
            // mas é bom ter um fallback.
            showNotification(result.message, 'success');
            // Redireciona para a URL de login enviada pelo backend
            window.location.href = result.redirectUrl;
        } else {
            showNotification(result.message || 'Ocorreu um erro ao excluir a conta.', 'error');
        }
    });
});