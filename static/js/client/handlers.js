// static/js/client/handlers.js

function populatePricingOptions(pricingData) {
    const orderTypeSelect = document.getElementById('orderType');
    const extrasSelect = document.getElementById('extrasSelect');
    if (orderTypeSelect) {
        orderTypeSelect.innerHTML = '<option value="">Selecione um tipo de arte...</option>';
        if (pricingData.commission_types && pricingData.commission_types.length > 0) {
            pricingData.commission_types.forEach(type => {
                const option = document.createElement('option');
                option.value = type.name;
                option.textContent = `${type.name} - R$ ${type.price.toFixed(2).replace('.', ',')} (${type.deadline || 'N/A'} dias)`;
                option.dataset.price = type.price;
                option.dataset.deadline = type.deadline || 0;
                orderTypeSelect.appendChild(option);
            });
        }
    }

    if (extrasSelect) {
        extrasSelect.innerHTML = '<option value="0.00" data-deadline="0" data-text="Nenhum" selected>Nenhum extra</option>';
        if (pricingData.commission_extras && pricingData.commission_extras.length > 0) {
            pricingData.commission_extras.forEach(extra => {
                const option = document.createElement('option');
                option.value = extra.price;
                const deadlineText = extra.deadline ? ` (+${extra.deadline} dias)` : '';
                option.textContent = `${extra.name} - (+ R$ ${extra.price.toFixed(2).replace('.', ',')})${deadlineText}`;
                option.dataset.text = extra.name;
                option.dataset.deadline = extra.deadline || 0;
                extrasSelect.appendChild(option);
            });
        }
    }
}


function showConfirmModal(title, message, confirmCallback) {
    DOM.confirmModalTitle.textContent = title;
    DOM.confirmModalMessage.innerHTML = '';
    const messageP = document.createElement('p');
    messageP.textContent = message;
    DOM.confirmModalMessage.appendChild(messageP);

    const newConfirmBtn = DOM.confirmModalConfirm.cloneNode(true);
    DOM.confirmModalConfirm.parentNode.replaceChild(newConfirmBtn, DOM.confirmModalConfirm);
    DOM.confirmModalConfirm = newConfirmBtn;
    DOM.confirmModalConfirm.addEventListener('click', () => {
        hideModal(DOM.confirmModal);
        if (confirmCallback) confirmCallback();
    });
    showModal(DOM.confirmModal);
}

function showRevisionModal(orderId, confirmCallback) {
    DOM.confirmModalTitle.textContent = 'Solicitar Revisão';
    DOM.confirmModalMessage.innerHTML = `
        <p>Por favor, descreva as alterações que você gostaria de ver. Seu comentário será enviado ao artista.</p>
        <div class="form-group" style="margin-top: 1rem;">
            <textarea id="revisionCommentText" class="form-input" rows="4" placeholder="Ex: Gostaria que o cabelo fosse um pouco mais longo..."></textarea>
        </div>
    `;
    const newConfirmBtn = DOM.confirmModalConfirm.cloneNode(true);
    DOM.confirmModalConfirm.parentNode.replaceChild(newConfirmBtn, DOM.confirmModalConfirm);
    DOM.confirmModalConfirm = newConfirmBtn;
    
    const revisionTextarea = document.getElementById('revisionCommentText');
    DOM.confirmModalConfirm.disabled = true;
    revisionTextarea.addEventListener('input', () => {
        DOM.confirmModalConfirm.disabled = revisionTextarea.value.trim() === '';
    });
    DOM.confirmModalConfirm.addEventListener('click', () => {
        const commentText = revisionTextarea.value.trim();
        if (commentText) {
            hideModal(DOM.confirmModal);
            if (confirmCallback) confirmCallback(commentText);
        }
    });
    showModal(DOM.confirmModal);
}

function renderArtistSelection(artists) {
    const container = document.getElementById('artist-selection-container');
    if (!container) return;
    container.innerHTML = '';
    if (artists.length > 1) {
        const bothCard = document.createElement('div');
        bothCard.className = 'artist-card';
        const allArtistIds = JSON.stringify(artists.map(a => a.id));
        bothCard.innerHTML = `
            <input type="radio" name="artist-selection" value='${allArtistIds}' id="artist-both">
            <img src="https://i.imgur.com/b9csyEoL.png" alt="Ambos os Artistas" class="artist-avatar">
            <div class="artist-name">Ambos os Artistas</div>
            <div class="artist-description">Um projeto colaborativo combinando os talentos de todos os artistas disponíveis.</div>
        `;
        container.appendChild(bothCard);
    }

    artists.forEach(artist => {
        const artistCard = document.createElement('div');
        artistCard.className = 'artist-card';
        artistCard.innerHTML = `
            <input type="radio" name="artist-selection" value='[${artist.id}]' id="artist-${artist.id}">
            <img src="${artist.artist_avatar}" alt="Avatar de ${artist.username}" class="artist-avatar" referrerpolicy="no-referrer">
            <div class="artist-name">${artist.username}</div>
            <div class="artist-description">${artist.artist_portfolio_description || ''}</div>
            <div class="artist-specialties">
                ${(artist.artist_specialties || []).slice(0, 3).map(spec => `<span class="specialty-tag">${spec}</span>`).join('')}
            </div>
            <div style="margin-top: 1.5rem;">
                <button type="button" class="btn btn-sm btn-light view-artist-portfolio-btn" data-artist-id="${artist.id}" data-artist-name="${artist.username}">Ver Portfólio</button>
            </div>
         `;
        container.appendChild(artistCard);
    });

    container.addEventListener('click', async (e) => {
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
             const portfolioData = await window.fetchArtistPortfolio(artistId);
            toggleLoading(false);

            state.portfolio = portfolioData;
            renderPortfolio();
            const portfolioModalTitle = document.querySelector('#portfolioModal .modal-title');
            if (portfolioModalTitle) {
                portfolioModalTitle.textContent = `Portfólio de ${artistName}`;
            }
            showModal(DOM.portfolioModal);
        }
    });
}


function handleCancelOrder(orderId) {
    showConfirmModal(
        'Cancelar Pedido',
        'Tem certeza que deseja cancelar este pedido? Esta ação não pode ser desfeita.',
        async () => {
            toggleLoading(true);
            const result = await window.cancelOrder(orderId);
            toggleLoading(false);

            if (result.success) {
                state.orders = await window.fetchOrders();
                renderOrders();
                showNotification(result.message, 'success');
            } else {
                  showNotification(result.message || 'Não foi possível cancelar o pedido.', 'error');
            }
        }
    );
}

function handleViewDetails(orderId, focusComment = false) {
    renderOrderDetails(orderId, focusComment);
    showModal(DOM.orderDetailsModal);
}

async function handleSubmitOrder() {
    // Esta função será movida e recriada no main.js para o novo modal
}

function resetForm() {
    // Esta função será movida e recriada no main.js para o novo modal
}

function validateCurrentTab() {
    // Esta lógica de abas não é mais necessária
    return true;
}

function calculateTotal() {
    let total = 0;
    let totalDeadlineDays = 0;

    const orderTypeSelect = document.getElementById('orderType');
    if (orderTypeSelect && orderTypeSelect.value) {
        const selectedOption = orderTypeSelect.options[orderTypeSelect.selectedIndex];
        total += parseFloat(selectedOption.dataset.price || 0);
        totalDeadlineDays += parseInt(selectedOption.dataset.deadline || 0);
    }

    const extrasSelect = document.getElementById('extrasSelect');
    if (extrasSelect && extrasSelect.value) { 
        const selectedExtra = extrasSelect.options[extrasSelect.selectedIndex];
        total += parseFloat(selectedExtra.value || 0);
        totalDeadlineDays += parseInt(selectedExtra.dataset.deadline || 0);
    }

    if(DOM.totalPrice) DOM.totalPrice.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    const deadlineInput = document.getElementById('orderDeadline');
    const deadlineDisplay = document.getElementById('deadlineDisplay');
    if (totalDeadlineDays > 0) {
        const today = new Date();
        const finalDate = new Date(today.setDate(today.getDate() + totalDeadlineDays));
        const finalDateString = finalDate.toISOString().split('T')[0];
        
        if (deadlineInput) deadlineInput.value = finalDateString;
        if (deadlineDisplay) deadlineDisplay.textContent = `Prazo estimado: ${finalDate.toLocaleDateString('pt-BR')}`;
    } else {
        if (deadlineInput) deadlineInput.value = '';
        if (deadlineDisplay) deadlineDisplay.textContent = 'Prazo a definir pelo artista';
    }
}

function setupEventListeners() {
    // Abre o modal do portfólio, busca artistas e o portfólio inicial
    if (DOM.viewPortfolioBtn) {
        DOM.viewPortfolioBtn.addEventListener('click', async () => {
            toggleLoading(true);
            try {
                // Busca a lista de artistas para popular o filtro
                const artists = await window.fetchArtists();
                state.artists = artists;

                // Busca o portfólio de todos os artistas para a visualização inicial
                const portfolioPromises = artists.map(artist => window.fetchArtistPortfolio(artist.id));
                const portfolioResults = await Promise.all(portfolioPromises);
                state.portfolio = portfolioResults.flat(); // Junta os resultados de todos os portfólios

                renderPortfolio(state.artists); // Renderiza o modal com os dados e a lista de artistas
                showModal(DOM.portfolioModal);
            } catch (error) {
                showNotification('Não foi possível carregar o portfólio.', 'error');
            } finally {
                toggleLoading(false);
            }
        });
    }

    // Listener para o NOVO filtro de artista
    const artistFilter = document.getElementById('portfolioArtistFilter');
    if (artistFilter) {
        artistFilter.addEventListener('change', async () => {
            const selectedArtistId = artistFilter.value;
            toggleLoading(true);
            try {
                if (selectedArtistId === 'all') {
                    // Se "Todos" for selecionado, busca o portfólio de todos novamente
                    const portfolioPromises = state.artists.map(artist => window.fetchArtistPortfolio(artist.id));
                    const portfolioResults = await Promise.all(portfolioPromises);
                    state.portfolio = portfolioResults.flat();
                } else {
                    // Se um artista específico for selecionado, busca apenas o dele
                    state.portfolio = await window.fetchArtistPortfolio(selectedArtistId);
                }
                renderPortfolio(state.artists); // Re-renderiza a galeria com os novos dados
            } catch (error) {
                showNotification('Não foi possível filtrar o portfólio.', 'error');
            } finally {
                toggleLoading(false);
            }
        });
    }

    // Listener para o filtro de TIPO (existente, agora só re-renderiza)
    if (DOM.portfolioFilter) {
        DOM.portfolioFilter.addEventListener('change', () => {
            renderPortfolio(state.artists); // Apenas re-renderiza com o state.portfolio atual
        });
    }

    if (DOM.pricingBtn) DOM.pricingBtn.addEventListener('click', async () => { const pricingData = await fetchPricing(); renderPricingModal(pricingData); showModal(DOM.pricingModal); });
    if (DOM.applyFiltersBtn) DOM.applyFiltersBtn.addEventListener('click', () => { state.currentFilter = DOM.statusFilter.value; state.currentSearch = DOM.searchOrders.value; renderOrders(); });
    if (DOM.orderList) DOM.orderList.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        const card = event.target.closest('.order-card');
        if (!card) return;
        const orderId = card.dataset.id;
        if (button.classList.contains('view-details-btn')) { handleViewDetails(orderId); } 
        else if (button.classList.contains('cancel-btn')) { handleCancelOrder(orderId); }
    });
    
    // --- INÍCIO DA CORREÇÃO ---
    // Botão 'X' (.close-modal) agora fecha apenas o modal pai
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalToClose = e.target.closest('.modal');
            if (modalToClose) {
                hideModal(modalToClose);
            }
        });
    });

    // Tecla 'Escape' agora fecha apenas o último modal aberto
    document.addEventListener('keydown', (e) => {
        if (e.key === "Escape") {
            const visibleModals = document.querySelectorAll('.modal.is-visible');
            if (visibleModals.length > 0) {
                // Fecha o último modal na lista, que é o que está visualmente por cima
                hideModal(visibleModals[visibleModals.length - 1]);
            }
        }
    });

    // Clique no fundo (backdrop) agora fecha apenas o modal clicado
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal(modal);
            }
        });
    });
    // --- FIM DA CORREÇÃO ---

    if (DOM.confirmModalCancel) DOM.confirmModalCancel.addEventListener('click', () => hideModal(DOM.confirmModal));
    document.querySelectorAll('.close-sub-modal').forEach(btn => { btn.addEventListener('click', (e) => { const subModal = e.target.closest('.modal'); if (subModal) hideModal(subModal); }); });
    
    if (DOM.referenceFiles) DOM.referenceFiles.addEventListener('change', (e) => { state.selectedFiles.push(...e.target.files); renderFilePreview(); });
    if (DOM.filePreview) DOM.filePreview.addEventListener('click', (e) => { if (e.target.classList.contains('remove-file')) { const index = parseInt(e.target.dataset.index); state.selectedFiles.splice(index, 1); renderFilePreview(); } });
    const orderTypeSelect = document.getElementById('orderType');
    if (orderTypeSelect) orderTypeSelect.addEventListener('change', calculateTotal);
    const extrasSelect = document.getElementById('extrasSelect');
    if (extrasSelect) extrasSelect.addEventListener('change', calculateTotal);
    
    const termsLink = document.getElementById('terms-link');
    const policyLink = document.getElementById('policy-link');
    const termsModal = document.getElementById('termsModal');
    const policyModal = document.getElementById('policyModal');
    if (termsLink && termsModal) { termsLink.addEventListener('click', (e) => { e.preventDefault(); showModal(termsModal); });
    }
    if (policyLink && policyModal) { policyLink.addEventListener('click', (e) => { e.preventDefault(); showModal(policyModal); });
    }
    
    if (DOM.orderDetailsContent) DOM.orderDetailsContent.addEventListener('click', async (event) => {
        const button = event.target.closest('button');
        if (!button) return;

        if (button.id === 'copyPixKeyBtn') {
            const pixInput = document.getElementById('pixKeyInput');
            if (pixInput) {
                navigator.clipboard.writeText(pixInput.value).then(() => {
                    showNotification('Chave PIX copiada!', 'success');
                });
            }
            return;
        }
        
        const orderId = button.dataset.id;
        if (!orderId) return;

         if (button.id === 'confirmPaymentBtn') {
            showConfirmModal('Confirmar Pagamento', 'Você confirma que já realizou o pagamento deste pedido?', async () => {
                toggleLoading(true);
                const result = await window.confirmPaymentByClient(orderId);
                if (result.success) {
                    showNotification(result.message, 'success');
                    const updatedOrders = await window.fetchOrders();
                    state.orders = updatedOrders;
                    renderOrders();
                    renderOrderDetails(orderId);
                } else {
                    showNotification(result.message || 'Erro ao confirmar o pagamento.', 'error');
                }
                toggleLoading(false);
            });
            return;
        }
        
        if (button.classList.contains('approve-phase-btn')) {
            showConfirmModal('Aprovar Fase', 'Você tem certeza que deseja aprovar a prévia atual e avançar para a próxima fase do projeto? Esta ação não pode ser desfeita.', async () => {
                toggleLoading(true);
                const result = await window.approvePhase(orderId);
                 if (result.success) {
                    showNotification('Fase aprovada com sucesso!', 'success');
                    state.orders = await window.fetchOrders();
                    renderOrders();
                    hideModal(DOM.orderDetailsModal);
                 } else {
                    showNotification(result.message || 'Erro ao aprovar a fase.', 'error');
                }
                toggleLoading(false);
             });
        } else if (button.classList.contains('request-revision-btn')) {
            showRevisionModal(orderId, async (commentText) => {
                toggleLoading(true);
                const result = await window.requestRevision(orderId, commentText);
                if (result.success) {
                    showNotification('Pedido de revisão enviado!', 'success');
                     const updatedOrders = await window.fetchOrders();
                    state.orders = updatedOrders;
                    renderOrders();
                    renderOrderDetails(orderId, true); 
                 } else {
                    showNotification(result.message || 'Erro ao solicitar revisão.', 'error');
                }
                toggleLoading(false);
            });
        }
    });
}

function setupOrderDetailsEventListeners(order) {
    const newCommentForm = document.getElementById('newCommentForm');
    if (newCommentForm) {
        const commentText = document.getElementById('commentText');
        const submitBtn = document.getElementById('submitCommentBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', async () => {
                const text = commentText.value.trim();
                if (text) {
                    toggleLoading(true);
                    const result = await window.addComment(order.id, text);
                    toggleLoading(false);
                    if (result.success) {
                        const updatedOrders = await window.fetchOrders();
                        state.orders = updatedOrders;
                        renderOrderDetails(order.id, true);
                    } else {
                        showNotification(result.message || 'Erro ao enviar comentário.', 'error');
                    }
                 }
            });
        }
    }
    document.querySelectorAll('.version-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const versionIndex = parseInt(this.dataset.versionIndex);
            const orderInState = state.orders.find(o => o.id === order.id);
            if (orderInState) { orderInState.current_preview = versionIndex; }
            renderOrderDetails(order.id);
        });
    });
}