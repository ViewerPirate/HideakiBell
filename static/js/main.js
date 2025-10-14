// Arquivo: static/js/main.js
// Lógica GERAL para o site (público e admin).
/**
 * Exibe uma notificação flutuante (toast) padronizada.
 * Esta função agora é global e deve ser usada em todo o site.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo de notificação ('success', 'error', 'warning', 'info').
 */
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notificationMessage');
    const icon = document.getElementById('notificationIcon');

    if (!notification || !notificationMessage || !icon) {
        console.error('Elementos de notificação não encontrados no DOM.');
        return;
    }

    // Reseta as classes de tipo e ícone
    notification.className = 'notification';
    icon.className = 'fas';

    // Adiciona as classes corretas com base no tipo
    notification.classList.add(type);
    const iconMap = {
        'success': 'fa-check-circle',
        'error': 'fa-times-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    icon.classList.add(iconMap[type] || 'fa-info-circle');

    notificationMessage.textContent = message;

    // Força a re-exibição e reinício da animação
    notification.style.display = 'flex';
    notification.style.animation = 'none';
    requestAnimationFrame(() => {
        notification.style.animation = '';
    });

    // Esconde a notificação após um tempo
    setTimeout(() => {
        if (notification) {
            notification.style.display = 'none';
        }
    }, 3500);
}

// INÍCIO DA MODIFICAÇÃO: Funções de controle de modal
/**
 * Exibe um modal e bloqueia o scroll do corpo da página.
 * @param {HTMLElement} modal - O elemento do modal a ser exibido.
 */
function showModal(modal) {
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

/**
 * Esconde um modal e restaura o scroll do corpo da página.
 * @param {HTMLElement} modal - O elemento do modal a ser escondido.
 */
function hideModal(modal) {
    if (!modal) return;
    modal.style.display = 'none';
    // Só restaura o scroll se nenhum outro modal estiver visível
    if (document.querySelectorAll('.modal[style*="display: flex"]').length === 0) {
        document.body.style.overflow = '';
    }
}
// FIM DA MODIFICAÇÃO

/**
 * Verifica o sessionStorage por uma notificação pendente, a exibe e a remove.
 * Útil para mostrar feedback de uma ação após um redirecionamento ou recarga de página.
 */
function processSessionNotification() {
    const notificationKey = 'plugin_action_notification';
    const pendingNotificationJSON = sessionStorage.getItem(notificationKey);
    if (pendingNotificationJSON) {
        try {
            // Se existir, extrai os dados
            const { message, type } = JSON.parse(pendingNotificationJSON);
            // Usa a função global para mostrar a notificação
            showNotification(message, type);
            // CRUCIAL: Remove a chave para não exibir novamente.
            sessionStorage.removeItem(notificationKey);
        } catch (error) {
            console.error('Erro ao processar notificação da sessão:', error);
            // Limpa em caso de erro para evitar problemas futuros.
            sessionStorage.removeItem(notificationKey);
        }
    }
}


/**
 * Aplica um tema ao elemento raiz do documento (<html>).
 * @param {string} theme - O tema a ser aplicado ('light' ou 'dark').
 */
function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
    }
}

/**
 * Alterna entre o tema claro e escuro, salva a preferência no localStorage
 * e aplica o novo tema.
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
}

/**
 * Inicializa a galeria com layout Masonry.
 */
function initMasonryGallery() {
    const grid = document.querySelector('.gallery-grid');
    if (!grid) return;
    imagesLoaded(grid, function() {
        new Masonry(grid, {
            itemSelector: '.art-card',
            columnWidth: '.art-card',
            gutter: 20,
            percentPosition: true
        });
    });
}

/**
 * Orquestra toda a funcionalidade do filtro NSFW.
 */
function initializeNSFWFilter() {
    const nsfwCards = document.querySelectorAll('.art-card[data-nsfw="true"]');
    const ageGateModal = document.getElementById('nsfw-age-gate');

    if (nsfwCards.length === 0 || !ageGateModal) {
        return; // Se não há conteúdo NSFW ou modal, não faz nada
    }

    const confirmBtn = document.getElementById('nsfw-confirm-btn');
    const cancelBtn = document.getElementById('nsfw-cancel-btn');
    const isVerified = sessionStorage.getItem('isAgeVerified') === 'true';

    // Função para ativar os botões de toggle em cada card
    const enableNSFWToggle = () => {
        nsfwCards.forEach(card => {
            const toggleBtn = card.querySelector('.nsfw-toggle-icon-btn');
            
            if (toggleBtn) {
                const icon = toggleBtn.querySelector('i');
                // Garante que o ícone inicial esteja correto
                icon.className = card.classList.contains('revealed') ? 'fas fa-eye' : 'fas fa-eye-slash';

                toggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Impede que o clique no botão abra o viewer de imagem
                    e.preventDefault();
                    
                    card.classList.toggle('revealed');
                    // Alterna o ícone com base na classe 'revealed'
                    icon.className = card.classList.contains('revealed') ? 'fas fa-eye' : 'fas fa-eye-slash';
                });
            }
        });
    };

    // Função para lidar com a necessidade de verificação
    const promptForAgeVerification = () => {
        // Mostra o modal ao clicar em qualquer card NSFW
        nsfwCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Se a idade ainda não foi verificada, mostra o modal em vez de abrir o viewer
                if (sessionStorage.getItem('isAgeVerified') !== 'true') {
                    e.stopPropagation();
                    e.preventDefault();
                    ageGateModal.style.display = 'flex';
                }
            }, true); // Usa captura para impedir o viewer de abrir
        });
    };

    // Lógica principal
    if (isVerified) {
        enableNSFWToggle();
    } else {
        promptForAgeVerification();
    }

    // Listeners do modal
    confirmBtn.addEventListener('click', () => {
        sessionStorage.setItem('isAgeVerified', 'true');
        ageGateModal.style.display = 'none';
        enableNSFWToggle();
    });

    cancelBtn.addEventListener('click', () => {
        window.history.back(); // Volta para a página anterior
    });
}


/**
 * Event listener que é executado quando o DOM está completamente carregado.
 */
document.addEventListener('DOMContentLoaded', async () => {
    
    // Verifica se o CMS já não foi inicializado por outro script (admin/client)
    if (!window.cms) {
        try {
            if (typeof ModularCMS !== 'undefined' && window.INJECTED_PLUGINS) {
                window.cms = new ModularCMS();
        
                await window.cms.init();
            }
        } catch (error) {
            console.error("Falha ao inicializar o sistema de plugins na página pública:", error);
        }
    }

    // Processa qualquer notificação pendente armazenada na sessão.
    processSessionNotification();
    
    // --- LÓGICA DO BOTÃO DE TEMA ---
    const themeSwitchers = document.querySelectorAll('.theme-switcher');
    themeSwitchers.forEach(switcher => {
        switcher.addEventListener('click', toggleTheme);
    });

    // --- LÓGICA DO RODAPÉ ---
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    
    // --- LÓGICA DE NAVEGAÇÃO ATIVA (SITE PÚBLICO) ---
    const navLinks = document.querySelectorAll('.nav-links .nav-link');
    const currentPageUrl = window.location.pathname;
    navLinks.forEach(link => {
        const linkUrl = new URL(link.href).pathname;
        if (linkUrl === currentPageUrl || (currentPageUrl === '/' && link.getAttribute('href') === '/')) {
            link.classList.add('active');
        }
    });
    // --- INICIALIZAÇÃO DA GALERIA ---
    initMasonryGallery();
    
    // --- INICIALIZAÇÃO DO FILTRO NSFW ---
    initializeNSFWFilter();

    // INÍCIO DA MODIFICAÇÃO: Lógica para abrir e fechar os modais
    document.querySelectorAll('[data-modal-target]').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = trigger.dataset.modalTarget;
            const modal = document.getElementById(modalId);
            if (modal) {
                showModal(modal);
            }
        });
    });

    document.querySelectorAll('.modal .close-modal').forEach(button => {
        button.addEventListener('click', () => {
            hideModal(button.closest('.modal'));
        });
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modal);
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === "Escape") {
            document.querySelectorAll('.modal').forEach(hideModal);
        }
    });
    // FIM DA MODIFICAÇÃO

    // --- LÓGICA PARA O FORMULÁRIO DE CONTATO ---
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        const style = document.createElement('style');
        style.innerHTML = `
            .spinner-inline { 
                width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); 
                border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite;
            }
            @keyframes spin { 100% { transform: rotate(360deg); } }
        `;
        document.head.appendChild(style);
        contactForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalButtonHTML = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = `<span class="spinner-inline"></span> Enviando...`;

            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                message: document.getElementById('message').value,
            };

            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                });

                const result = await response.json();

                if (response.ok) {
                    showNotification(result.message, 'success');
                    contactForm.reset();
                } else {
                    showNotification(result.message || 'Ocorreu um erro.', 'error');
                }
            } catch (error) {
                console.error('Erro ao enviar formulário de contato:', error);
                showNotification('Erro de conexão. Tente novamente mais tarde.', 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonHTML;
            }
        });
    }

    initializeLogoResponsiveness();
});

/**
 * Converte um nome completo em suas iniciais.
 * Ex: "ArtByte Studio" -> "AS"
 * @param {string} fullName - O texto completo a ser convertido.
 * @returns {string} As iniciais em maiúsculas.
 */
function getInitials(fullName) {
    if (!fullName) return '';
    const words = fullName.trim().split(' ');
    if (words.length > 1) {
        return words.map(word => word[0]).join('').toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
}

/**
 * Aplica ou reverte a abreviação do logo.
 * @param {boolean} isMobile - True se a visualização for móvel.
 * @param {HTMLElement} logoElement - O elemento do logo.
 * @param {string} originalText - O texto original do logo.
 */
function applyLogoState(isMobile, logoElement, originalText) {
    if (!logoElement) return;

    if (isMobile) {
        logoElement.textContent = getInitials(originalText);
        logoElement.style.fontSize = '1.5rem'; // Ajusta o tamanho da fonte para as iniciais
    } else {
        logoElement.textContent = originalText;
        logoElement.style.fontSize = ''; // Remove o estilo inline
    }
}

/**
 * Inicializa a lógica que observa o tamanho da tela e ajusta o logo.
 */
function initializeLogoResponsiveness() {
    const logoElement = document.querySelector('.nav-logo');
    if (!logoElement) return;

    const originalLogoText = logoElement.textContent;
    const mobileMediaQuery = window.matchMedia('(max-width: 768px)');

    // Cria a função que será chamada quando a tela mudar de tamanho
    const mediaQueryListener = (e) => applyLogoState(e.matches, logoElement, originalLogoText);

    // Adiciona o listener
    mobileMediaQuery.addEventListener('change', mediaQueryListener);

    // Aplica o estado inicial assim que o script é executado
    applyLogoState(mobileMediaQuery.matches, logoElement, originalLogoText);
}