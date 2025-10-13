// --- Código Unificado e Otimizado: static/js/client/main.js ---

/**
 * Busca a contagem de notificações não lidas do cliente e atualiza o badge.
 */
window.updateClientNotificationBadge = async function() {
    try {
        const data = await window.fetchClientUnreadCount();
        if (DOM.clientNotificationBadge) {
            if (data.count > 0) {
                DOM.clientNotificationBadge.textContent = data.count;
                DOM.clientNotificationBadge.style.display = 'flex';
            } else {
                DOM.clientNotificationBadge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error("Erro ao atualizar o badge de notificações do cliente:", error);
    }
}

/**
 * Renderiza a lista de notificações no dropdown do cliente.
 * @param {Array} notifications - A lista de notificações.
 */
window.renderClientNotifications = function(notifications) {
    if (!DOM.clientNotificationList) return;
    DOM.clientNotificationList.innerHTML = '';
    if (notifications.length === 0) {
        DOM.clientNotificationList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--cor-texto-secundario);">Nenhuma notificação recente.</div>';
        return;
    }

    notifications.forEach(notif => {
        const notifItem = document.createElement('a');
        notifItem.href = "#";
        notifItem.className = 'notification-item';
        notifItem.style.backgroundColor = notif.is_read ? 'transparent' : 'var(--cor-fundo)';
        
        if (notif.related_commission_id) {
            notifItem.addEventListener('click', (e) => {
                 e.preventDefault();
                closeAllModals();
                handleViewDetails(notif.related_commission_id);
            });
        }
        
        notifItem.innerHTML = `
            <div class="notification-icon"><i class="fas fa-info-circle"></i></div>
            <div class="notification-content">
                 <p>${notif.message}</p>
                 <small>${new Date(notif.timestamp).toLocaleString('pt-BR')}</small>
            </div>`;
        DOM.clientNotificationList.appendChild(notifItem);
    });
}

/**
 * Função para configurar o Socket.IO no lado do cliente.
 */
function setupSocketIOListeners() {
    const socket = io();
    socket.on('connect', () => {
        console.log('Conectado ao servidor de tempo real (Painel do Cliente).');
    });
    socket.on('commission_updated', async (data) => {
        console.log('Evento de atualização de comissão recebido:', data);

        if (data.message_for_client) {
            showNotification(data.message_for_client, 'info');
        }

        window.updateClientNotificationBadge();

        if (DOM.orderList) {
            const updatedOrders = await window.fetchOrders();
            state.orders = updatedOrders;
            renderOrders();
        }
        
        const isModalVisible = DOM.orderDetailsModal.classList.contains('is-visible');
        if (isModalVisible && state.currentOrder && state.currentOrder.id === data.commission_id) {
            if (data.deleted) {
                closeAllModals();
            } else {
                renderOrderDetails(data.commission_id);
            }
        }
    });
}


// --- LÓGICA DO NOVO MODAL (STEPPER) ---
function initializeStepperModal() {
    const modal = document.getElementById('newOrderModal');
    if (!modal || !DOM.newOrderBtn) return;

    const stepperContainer = modal.querySelector('.stepper-modal-stepper');
    const btnNext = document.getElementById('stepper-next');
    const btnPrev = document.getElementById('stepper-prev');
    const btnSubmit = document.getElementById('stepper-submit');
    const form = document.getElementById('stepper-order-form');

    const state = { services: [], extras: [], artists: [], totalPrice: 0 };
    const steps = [
        { id: 'artist', label: 'Artista' },
        { id: 'details', label: 'Detalhes' },
        { id: 'options', label: 'Opções' },
        { id: 'review', label: 'Revisão' }
    ];
    let currentStepIndex = 0;
    let completedSteps = new Set();

    function renderStepper() {
        stepperContainer.innerHTML = steps.map((step, index) => `
            <div class="stepper-modal-step ${currentStepIndex === index ? 'active' : ''} ${completedSteps.has(index) ? 'completed' : ''}" data-index="${index}">
                <div class="stepper-modal-step-number">${completedSteps.has(index) ? '<i class="fas fa-check"></i>' : index + 1}</div>
                 <span class="stepper-modal-step-label">${step.label}</span>
            </div>`).join('');
    }

    async function navigateToStep(index) {
        if (index < 0 || index >= steps.length) return;

        // Ao sair da etapa de Artista, carrega os serviços
        if (steps[currentStepIndex].id === 'artist' && index > currentStepIndex) {
            const selectedArtistRadio = modal.querySelector('input[name="stepper-artist-selection"]:checked');
            if (!selectedArtistRadio) return; // Não avança se ninguém for selecionado
            
            toggleLoading(true);
            const artistIds = JSON.parse(selectedArtistRadio.value);
            // Por simplicidade, se for colaboração (múltiplos IDs), busca os serviços do primeiro artista (que pode conter os preços de colaboração)
            await loadServicesForArtist(artistIds[0]);
            toggleLoading(false);
        }

        // Ao sair da etapa de Opções, renderiza o resumo
        if (steps[currentStepIndex].id === 'options' && index > currentStepIndex) {
            renderReviewSummary();
        }

        currentStepIndex = index;
        renderStepper();
        modal.querySelectorAll('.stepper-modal-pane').forEach(pane => pane.classList.remove('active'));
        modal.querySelector(`.stepper-modal-pane[data-pane-id="${steps[index].id}"]`).classList.add('active');
        btnPrev.style.display = index > 0 ? 'inline-flex' : 'none';
        btnNext.style.display = index < steps.length - 1 ? 'inline-flex' : 'none';
        btnSubmit.style.display = index === steps.length - 1 ? 'inline-flex' : 'none';
    }

    function validateStep() {
        const currentStepId = steps[currentStepIndex].id;
        if (currentStepId === 'artist') {
            if (!modal.querySelector(`input[name="stepper-artist-selection"]:checked`)) {
                showNotification('Por favor, selecione um artista ou a opção de colaboração.', 'error'); return false;
            }
        }
        if (currentStepId === 'details') {
            if (!modal.querySelector(`#stepper-title`).value.trim()) {
                showNotification('O título do pedido é obrigatório.', 'error'); return false;
            }
            if (!modal.querySelector(`#stepper-type`).value) {
                showNotification('O tipo de arte é obrigatório.', 'error'); return false;
            }
        }
        completedSteps.add(currentStepIndex);
        return true;
    }

    async function loadServicesForArtist(artistId) {
        try {
            const response = await fetch(`/api/client/artist_services/${artistId}`);
            if (!response.ok) throw new Error('Falha ao buscar serviços do artista.');
            
            const services = await response.json();
            state.services = services;
            
            // Popula o dropdown de serviços (Tipo de Arte)
            const typeSelect = modal.querySelector(`#stepper-type`);
            typeSelect.innerHTML = '<option value="">Selecione o tipo de arte</option>';
            services.forEach(service => {
                const priceF = parseFloat(service.price).toFixed(2).replace('.', ',');
                const deadlineText = service.deadline_days ? `(${service.deadline_days} dias)` : '';
                const option = document.createElement('option');
                option.value = service.service_name;
                option.textContent = `${service.service_name} - R$ ${priceF} ${deadlineText}`;
                
                option.dataset.price = service.price;
                option.dataset.deadline = service.deadline_days || 0;
                typeSelect.appendChild(option);
            });
            
            // Popula os extras (ainda vem das configurações globais, como fallback)
            const globalSettings = await window.fetchPricing();
            state.extras = globalSettings.commission_extras || [];
            const extrasSelect = modal.querySelector(`#stepper-extras`);
            extrasSelect.innerHTML = '<option value="0.00" data-price="0">Nenhum extra</option>';
            state.extras.forEach(e => extrasSelect.innerHTML += `<option value="${e.price}" data-price="${e.price}">${e.name} - (+ R$ ${e.price.toFixed(2).replace('.',',')})</option>`);

        } catch (error) {
            console.error(error);
            showNotification('Não foi possível carregar os serviços deste artista.', 'error');
        }
    }

    function updatePrice() {
        let total = 0;
        const typeSelect = modal.querySelector(`#stepper-type`);
        const extrasSelect = modal.querySelector(`#stepper-extras`);
        if (typeSelect.value && typeSelect.selectedIndex > 0) total += parseFloat(typeSelect.options[typeSelect.selectedIndex].dataset.price);
        if (extrasSelect.value && extrasSelect.selectedIndex > 0) total += parseFloat(extrasSelect.options[extrasSelect.selectedIndex].dataset.price);
        state.totalPrice = total;
        modal.querySelector(`#stepper-total-price`).textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    
    function renderReviewSummary() {
        const summaryContainer = modal.querySelector(`#stepper-summary-container`);
        const title = modal.querySelector(`#stepper-title`).value;
        const type = modal.querySelector(`#stepper-type`).value;
        const description = modal.querySelector(`#stepper-description`).value;
        const artistName = modal.querySelector(`input[name="stepper-artist-selection"]:checked`)?.parentElement.querySelector('.artist-name').textContent || 'N/A';
        summaryContainer.innerHTML = `
            <div class="card" style="background-color: var(--cor-fundo);">
                <div class="order-section">
                    <h4 class="order-section-title">${title}</h4>
                    <p style="white-space: pre-wrap; font-size: 0.9em; color: var(--cor-texto-secundario);">${description}</p>
                    <hr style="margin: 1rem 0;">
                    <p><strong>Tipo:</strong> ${type}</p>
                    <p><strong>Artista(s):</strong> ${artistName}</p>
                    <div class="price-total" style="margin-top: 1rem;">
                        <span>Total Estimado:</span>
                        <span>${state.totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                </div>
            </div>`;
    }

    async function openModal() {
        form.reset();
        showNotification('Carregando artistas...', 'info');
        toggleLoading(true);
        
        try {
            const artists = await window.fetchArtists();
            state.artists = artists;
            
            const artistContainer = modal.querySelector(`#stepper-artist-container`);
            let artistCardsHTML = artists.map(artist => `
                <div class="artist-card" data-artist-id="${artist.id}">
                    <input type="radio" name="stepper-artist-selection" value='[${artist.id}]'>
                    <img src="${artist.artist_avatar}" class="artist-avatar" referrerpolicy="no-referrer">
                    <div class="artist-name">${artist.username}</div>
                    <div style="margin-top: 1rem;">
                        <button type="button" class="btn btn-sm btn-light view-artist-portfolio-btn" data-artist-id="${artist.id}" data-artist-name="${artist.username}">
                            <i class="fas fa-images"></i> Ver Portfólio
                        </button>
                    </div>
                </div>`).join('');

            if (artists.length > 1) {
                // O valor aqui será um array JSON com todos os IDs
                const allArtistIds = JSON.stringify(artists.map(a => a.id));
                artistCardsHTML += `
                    <div class="artist-card" data-artist-id="all">
                        <input type="radio" name="stepper-artist-selection" value='${allArtistIds}'>
                        <div class="stepper-modal-avatar-icon"><i class="fas fa-users"></i></div>
                        <div class="artist-name">Colaboração</div>
                    </div>`;
            }
            artistContainer.innerHTML = artistCardsHTML;
            
            currentStepIndex = 0;
            completedSteps.clear();
            navigateToStep(0);
            showModal(modal);
        } catch (e) {
            showNotification('Erro ao carregar dados do formulário.', 'error');
        } finally {
            toggleLoading(false);
        }
    }

    async function submitOrder() {
        if (!modal.querySelector(`#stepper-terms`).checked) {
            return showNotification('Você deve aceitar os termos de serviço.', 'error');
        }
        toggleLoading(true);
        const orderData = {
            title: modal.querySelector(`#stepper-title`).value,
            type: modal.querySelector(`#stepper-type`).value,
            description: modal.querySelector(`#stepper-description`).value,
            price: state.totalPrice,
            assigned_artist_ids: JSON.parse(modal.querySelector(`input[name="stepper-artist-selection"]:checked`).value),
            deadline: null
        };
        
        const result = await window.createOrder(orderData);
        toggleLoading(false);
        
        if (result.success) {
            showNotification('Pedido criado com sucesso!', 'success');
            hideModal(modal);
            location.reload();
        } else {
            showNotification(result.message || 'Erro ao criar pedido.', 'error');
        }
    }

    DOM.newOrderBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(); });
    if(DOM.createFirstOrderBtn) DOM.createFirstOrderBtn.addEventListener('click', (e) => { e.preventDefault(); openModal(); });

    modal.querySelector('.close-modal').addEventListener('click', () => hideModal(modal));
    btnNext.addEventListener('click', () => { if (validateStep()) navigateToStep(currentStepIndex + 1); });
    btnPrev.addEventListener('click', () => navigateToStep(currentStepIndex - 1));
    form.addEventListener('submit', (e) => { e.preventDefault(); submitOrder(); });
    
    modal.querySelector(`#stepper-type`).addEventListener('change', updatePrice);
    modal.querySelector(`#stepper-extras`).addEventListener('change', updatePrice);
    
    stepperContainer.addEventListener('click', (e) => {
        const stepEl = e.target.closest('.stepper-modal-step');
        if (stepEl) {
            const index = parseInt(stepEl.dataset.index);
            if (completedSteps.has(index) || index < currentStepIndex) {
                // Permite voltar, mas não pular etapas
                navigateToStep(index);
            }
        }
    });

    const artistContainer = modal.querySelector('#stepper-artist-container');
    if(artistContainer) {
        artistContainer.addEventListener('click', async (e) => {
            const card = e.target.closest('.artist-card');
            if (card) {
                const radio = card.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
                document.querySelectorAll('.artist-card.selected').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            }

            const portfolioBtn = e.target.closest('.view-artist-portfolio-btn');
            if (portfolioBtn) {
                e.stopPropagation(); 
                const artistId = portfolioBtn.dataset.artistId;
                const artistName = portfolioBtn.dataset.artistName;
                
                toggleLoading(true);
                try {
                    const portfolioData = await window.fetchArtistPortfolio(artistId);
                    window.state.portfolio = portfolioData;

                    renderPortfolio(state.artists);
                    
                    const portfolioArtistFilter = document.getElementById('portfolioArtistFilter');
                    if (portfolioArtistFilter) portfolioArtistFilter.value = artistId;
                    
                    const portfolioModalTitle = document.querySelector('#portfolioModal .modal-title');
                    if (portfolioModalTitle) {
                        portfolioModalTitle.textContent = `Portfólio de ${artistName}`;
                    }
                    showModal(DOM.portfolioModal);
                } catch (err) {
                    showNotification('Não foi possível carregar o portfólio.', 'error');
                } finally {
                    toggleLoading(false);
                }
            }
        });
    }

    renderStepper();
}


/**
 * Função de inicialização principal.
 */
async function init() {
    try {
        if (typeof ModularCMS !== 'undefined' && window.INJECTED_PLUGINS) {
            window.cms = new ModularCMS();
            await window.cms.init();
        }
    } catch (error) {
        console.error("Falha ao inicializar o sistema de plugins na página do cliente:", error);
    }
    
    setupSocketIOListeners();
    window.updateClientNotificationBadge();
    
    if (DOM.orderList) {
        console.log("Página do Dashboard detectada. Carregando dados de pedidos e configurações...");
        toggleLoading(true);
        try {
            // MODIFICAÇÃO: Carrega os artistas em paralelo com os outros dados
            const [orders, settings, artists] = await Promise.all([
                window.fetchOrders(),
                window.fetchPricing(),
                window.fetchArtists()
            ]);
            
            state.orders = orders;
            state.settings = settings; 
            state.artists = artists; // Armazena os artistas no estado global
            
            renderOrders();
            setupEventListeners();
            initializeStepperModal();
        } catch (error) {
            console.error("Falha ao inicializar a aplicação:", error);
            if (DOM.orderList) {
                DOM.orderList.innerHTML = "<p>Ocorreu um erro ao carregar seus dados. Tente novamente mais tarde.</p>";
            }
        } finally {
            toggleLoading(false);
        }
    } else {
        setupEventListeners();
    }
}

document.addEventListener('DOMContentLoaded', init);