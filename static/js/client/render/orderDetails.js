// Arquivo: static/js/client/render/orderDetails.js

/**
 * Retorna a classe do ícone Font Awesome para um determinado nome de rede.
 * @param {string} networkName - O nome da rede (ex: "Instagram").
 * @returns {string} A classe CSS do ícone.
 */
function getIconClassForNetwork(networkName) {
    if (!networkName) return 'fas fa-link';
    const name = networkName.toLowerCase();
    const iconMap = {
        'instagram': 'fab fa-instagram',
        'twitter': 'fab fa-twitter',
        'artstation': 'fab fa-artstation',
        'facebook': 'fab fa-facebook',
        'behance': 'fab fa-behance',
        'discord': 'fab fa-discord',
        'email': 'fas fa-envelope',
        'linkedin': 'fab fa-linkedin',
        'pinterest': 'fab fa-pinterest',
        'youtube': 'fab fa-youtube',
        'website': 'fas fa-globe',
        'whatsapp': 'fab fa-whatsapp',
        'telegram': 'fab fa-telegram',
        'ko-fi': 'fas fa-coffee',
        'kofi': 'fas fa-coffee'
    };
    return iconMap[name] || 'fas fa-link';
}

/**
 * Formata um timestamp ISO para uma string de data e hora local.
 * @param {string} isoString - O timestamp em formato ISO.
 * @returns {string} A data e hora formatadas.
 */
function formatLogTimestamp(isoString) {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

/**
 * Renderiza o componente de histórico de eventos para um pedido.
 * @param {object} order - O objeto da comissão.
 * @returns {string} O HTML do histórico de eventos.
 */
function renderEventLog(order) {
    const events = order.event_log || [];
    if (events.length === 0) {
        return '<p style="text-align: center; color: var(--cor-texto-secundario);">Nenhum evento registrado.</p>';
    }

    const sortedEvents = [...events].reverse(); 
    return `
        <div class="event-log-container">
            ${sortedEvents.map(event => {
                const iconClass = event.actor === 'Cliente' ? 'fa-user' : (event.actor === 'Artista' ? 'fa-palette' : 'fa-cogs');
                const actorClass = event.actor.toLowerCase().replace(' ', '-'); 
                return `
                <div class="event-log-item">
                    <div class="event-log-icon actor-${actorClass}"><i class="fas ${iconClass}"></i></div>
                    <div class="event-log-content"> 
                        <p class="event-log-message"><strong>${event.actor}:</strong> ${event.message}</p>
                        <small class="event-log-timestamp">${formatLogTimestamp(event.timestamp)}</small>
                    </div>
                </div> 
                `;
            }).join('')}
        </div>
    `;
}

/**
 * Renderiza a seção de pagamento quando o pedido está com status 'pending_payment'.
 * @param {object} order - O objeto do pedido.
 * @returns {string} O HTML da seção de pagamento.
 */
function renderPaymentSection(order) {
    const { pix_key, paypal_hosted_button_id, payment_currency_code, paypal_email } = state.settings || {};
    const priceFormatted = order.price.toFixed(2);
    const priceDisplay = order.price.toLocaleString('pt-BR', { style: 'currency', currency: payment_currency_code || 'BRL' });
    let contactButtonsHTML = '';
    const assigned_artist_ids = order.assigned_artist_ids || [];

    // --- INÍCIO DA CORREÇÃO ---
    // Simplifica a lógica para sempre usar a lista de contatos unificada.
    let contactTitle = "Dúvidas? Entre em contato";
    
    // Define o título dinamicamente
    if (assigned_artist_ids.length === 1 && state.artists && state.artists.length > 0) {
        const artist = state.artists.find(a => a.id === assigned_artist_ids[0]);
        if (artist) {
            contactTitle = `Dúvidas? Converse com ${artist.username}`;
        }
    } else if (assigned_artist_ids.length > 1) {
        contactTitle = "Dúvidas? Fale com o estúdio";
    }

    // Usa SEMPRE a lista unificada de 'social_links' que vem da API /pricing.
    const contactsToShow = state.settings.social_links || [];

    if (contactsToShow.length > 0) {
        const linksHTML = contactsToShow.map(link => {
            const icon = getIconClassForNetwork(link.network);
            let url = link.url;
            if (link.network.toLowerCase() === 'email') {
                url = `mailto:${link.url}`;
            }
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="btn btn-light"><i class="${icon}"></i> ${link.network}</a>`;
        }).join('');

        contactButtonsHTML = `
            <div class="payment-confirmation-box" style="margin-top: 2rem; background-color: var(--cor-surface); border: 1px solid var(--cor-borda);">
                <h3 style="color: var(--cor-texto-principal) !important;">${contactTitle}</h3>
                <p style="color: var(--cor-texto-secundario) !important;">Sinta-se à vontade para entrar em contato antes de efetuar o pagamento.</p>
                <div class="action-buttons" style="justify-content: center; margin-top: 1rem;">
                    ${linksHTML}
                </div>
            </div>`;
    }
    // --- FIM DA CORREÇÃO ---

    let paymentContent;
    if (order.payment_status === 'awaiting_confirmation') {
        paymentContent = `
            <div class="payment-status-box" style="text-align: center; background-color: var(--cor-fundo); padding: 2rem; border-radius: var(--raio-borda);">
                <i class="fas fa-hourglass-half" style="font-size: 3em; color: var(--cor-principal); margin-bottom: 1rem;"></i>
                <h3 style="font-size: 1.5em;">Pagamento em Análise</h3>
                <p style="color: var(--cor-texto-secundario); margin-top: 0.5rem;">
                    Sua confirmação de pagamento foi recebida! O artista irá verificar e liberar o início do seu pedido em breve.
                </p>
            </div>
        `;
    } else { // 'unpaid'
        paymentContent = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
                <div class="payment-option-box">
                    <h4>Pagamento com PIX (Nacional)</h4>
                    <p>Use a chave abaixo para realizar o pagamento no valor de <strong>${priceDisplay}</strong>.</p>
                    <div class="pix-key-wrapper">
                        <input type="text" id="pixKeyInput" value="${pix_key || 'Chave PIX não configurada'}" readonly />
                        <button id="copyPixKeyBtn"><i class="fas fa-copy"></i> Copiar</button>
                    </div>
                    <small>Após o pagamento, não se esqueça de confirmar clicando no botão ao final da página.</small>
                </div>

                <div class="payment-option-box">
                    <h4>Pagamento com PayPal (Internacional)</h4>
                    <p>Clique no botão abaixo para pagar com PayPal no valor de <strong>${priceDisplay}</strong>.</p>
                    <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_blank">
                        <input type="hidden" name="cmd" value="_xclick">
                        <input type="hidden" name="business" value="${paypal_email || ''}">
                        <input type="hidden" name="currency_code" value="${payment_currency_code || 'BRL'}">
                        <input type="hidden" name="amount" value="${priceFormatted}">
                        <input type="hidden" name="item_name" value="Comissão de Arte - Pedido #${order.id}">
                        <button type="submit" class="paypal-btn">
                            <img src="https://www.paypalobjects.com/pt_BR/i/btn/btn_paynow_LG.gif" border="0" name="submit" alt="PayPal">
                        </button>
                    </form>
                </div>
            </div>

            ${contactButtonsHTML}

            <div class="payment-confirmation-box">
                <h3>Já efetuou o pagamento?</h3>
                <p>Após realizar o pagamento por um dos métodos acima, clique no botão abaixo para notificar o artista. Ele irá verificar e dar início à sua comissão.</p>
                <button class="btn btn-success" id="confirmPaymentBtn" data-id="${order.id}">
                   <i class="fas fa-check-circle"></i> Já Efetuei o Pagamento
                </button>
            </div>
        `;
    }
    
    return `
        <style>
            .payment-option-box, .payment-status-box { background-color: var(--cor-surface); border: 1px solid var(--cor-borda); border-radius: var(--raio-borda); padding: 1.5rem; }
            .payment-option-box h4 { margin-top: 0; font-size: 1.2em; color: var(--cor-principal); }
            .pix-key-wrapper { display: flex; margin: 1rem 0; }
            .pix-key-wrapper input { flex-grow: 1; border: 1px solid var(--cor-borda); background-color: var(--cor-fundo); padding: 0.75rem; border-radius: 8px 0 0 8px; color: var(--cor-texto-secundario); font-family: monospace; }
            .pix-key-wrapper button { border: 1px solid var(--cor-principal); background-color: var(--cor-principal); color: white; padding: 0 1rem; border-radius: 0 8px 8px 0; cursor: pointer; }
            .paypal-btn { background: none; border: none; padding: 0; cursor: pointer; }
            .payment-confirmation-box { text-align: center; background-color: var(--cor-fundo-claro); border-radius: var(--raio-borda); padding: 2rem; margin-top: 2rem; }
            .payment-confirmation-box h3,
            .payment-confirmation-box p {
                color: var(--cor-texto-escuro-fixo) !important;
            }
        </style>
        <div class="order-section">
            <h3 class="order-section-title" style="font-size:1.8em; text-align:center; border:0; margin-bottom:0;">Finalize seu Pedido</h3>
            <p style="text-align:center; color: var(--cor-texto-secundario); margin-bottom:2rem;">Escolha um dos métodos de pagamento abaixo para dar início à sua comissão.</p>
            ${paymentContent}
        </div>
    `;
}

/**
 * Renderiza a seção de pré-visualização no modal de detalhes.
 * @param {object} order - O objeto do pedido.
 * @returns {string} O HTML da seção de pré-visualização.
 */
function renderPreviewSection(order) {
    if (!order.preview || order.preview.length === 0) {
        return `<div class="art-preview empty"><div class="empty-icon"><i class="fas fa-paint-brush"></i></div><div class="empty-message">A pré-visualização ainda não está disponível</div></div>`;
    }
    
    const currentPreviewIndex = order.current_preview ?? order.preview.length - 1;
    const currentPreview = order.preview[currentPreviewIndex];
    if (!currentPreview) {
        return `<div class="art-preview empty"><div class="empty-icon"><i class="fas fa-exclamation-triangle"></i></div><div class="empty-message">Erro ao carregar prévia.</div></div>`;
    }

    return `
        ${order.preview.length > 1 ? `
        <div class="version-selector">
            ${order.preview.map((preview, index) => `
                <button class="btn btn-sm btn-light version-btn ${index === currentPreviewIndex ? 'active' : ''}" data-version-index="${index}">
                    Versão ${preview.version}
                </button>
            `).join('')}
        </div>` : ''} 
        <div class="art-preview">
            <img 
                src="${currentPreview.url}" 
                alt="Prévia da Arte" 
                class="preview-thumbnail"
                data-full-src="${currentPreview.url}" 
                referrerpolicy="no-referrer"
            >
            <div class="preview-comment">${currentPreview.comment || `Versão ${currentPreview.version}`}</div> 
        </div>
    `;
}

/**
 * Orquestra a renderização completa do modal de detalhes do pedido.
 * @param {string} orderId - O ID do pedido a ser renderizado.
 */
function renderOrderDetails(orderId) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return;
    state.currentOrder = order;
    DOM.detailOrderId.textContent = `#${order.id}`;

    if (order.status === 'pending_payment') {
        DOM.orderDetailsContent.innerHTML = renderPaymentSection(order);
        return;
    }
    
    let revisionInfoHTML = '';
    let actionButtonsHTML = '';
    const phases = order.phases || []; 
    const currentPhase = phases[order.current_phase_index];
    if (currentPhase) {
        const revisionsUsed = order.revisions_used;
        const revisionsLimit = currentPhase.revisions_limit;
        const revisionsLeft = revisionsLimit - revisionsUsed;

        const revisionTextTemplate = state.settings?.revision_alert_text || 'Você possui <strong>{revisions_left} de {revisions_limit}</strong> revisões restantes para esta fase.';
        const revisionText = revisionTextTemplate
            .replace(/{revisions_left}/g, revisionsLeft)
            .replace(/{revisions_limit}/g, revisionsLimit)
            .replace(/{phase_name}/g, currentPhase.name);

        revisionInfoHTML = `
            <div class="revision-counter">
                <i class="fas fa-info-circle"></i>
                <div>
                    <strong>Fase Atual: ${currentPhase.name}</strong>
                    <span>${revisionText}</span> 
                </div>
            </div>`;
        if (order.status === 'waiting_approval') {
            actionButtonsHTML = `
                <div class="card">
                    <div class="order-section action-section">
                        <h4 class="order-section-title">Sua Ação é Necessária</h4>
                        <div class="action-buttons">
                            <button class="btn btn-success approve-phase-btn" data-id="${order.id}"> 
                                <i class="fas fa-check"></i> Aprovar e Avançar
                            </button>
                            <button class="btn btn-warning request-revision-btn" data-id="${order.id}" ${revisionsLeft <= 0 ? 'disabled' : ''}> 
                                <i class="fas fa-redo"></i> Solicitar Revisão
                            </button>
                        </div>
                        ${revisionsLeft <= 0 ? '<p class="text-secondary" style="text-align:center; margin-top:10px;">Você atingiu o limite de revisões para esta fase.</p>' : ''} 
                    </div>
                </div>`;
        }
    }
    
    const leftColumnHTML = `
        <div class="card">
            <div class="order-section">
                <h4 class="order-section-title">Detalhes do Pedido</h4>
                <p><strong>Tipo de Arte:</strong> ${order.type}</p>
                <p><strong>Data do Pedido:</strong> ${formatDate(order.date)}</p>
                <p><strong>Prazo de Entrega:</strong> ${order.deadline ? formatDate(order.deadline) : 'A definir'}</p> 
                <p><strong>Valor:</strong> ${order.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                <p><strong>Status:</strong> ${getDetailedStatusText(order)}</p>
            </div>
            <div class="order-section">
                <h4 class="order-section-title">Descrição</h4>
                <p style="white-space: pre-wrap;">${order.description}</p>
            </div> 
        </div>
        ${revisionInfoHTML ? `<div class="card">${revisionInfoHTML}</div>` : ''}
        <div class="card">
            <h4 class="order-section-title">Histórico do Pedido</h4>
            ${renderEventLog(order)} 
        </div>
    `;
    const rightColumnHTML = `
        ${actionButtonsHTML}
        <div class="card">
            <h4 class="order-section-title">Pré-visualização da Arte</h4>
            ${renderPreviewSection(order)}
        </div>
    `;
    DOM.orderDetailsContent.innerHTML = `
        <div class="details-and-comments-grid">
            <div>${leftColumnHTML}</div>
            <div>${rightColumnHTML}</div>
        </div>
    `;
    setupOrderDetailsEventListeners(order);
    
    const modalHeader = document.querySelector('#orderDetailsModal .modal-header');
    const oldChatBtn = modalHeader.querySelector('.chat-trigger-btn');
    if(oldChatBtn) oldChatBtn.remove();
    
    if (modalHeader) {
        const chatBtn = document.createElement('button');
        chatBtn.className = 'btn chat-trigger-btn';
        chatBtn.dataset.id = order.id;
        chatBtn.innerHTML = '<i class="fas fa-comments"></i> Chat Rápido';
        chatBtn.style.marginLeft = 'auto';
        chatBtn.style.marginRight = '1rem';
        modalHeader.insertBefore(chatBtn, modalHeader.querySelector('.close-modal'));
    }
}
