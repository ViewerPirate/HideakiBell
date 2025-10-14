// Arquivo: static/js/admin_js/pages/configuracoes/config_data_manager.js
// Responsável por carregar os dados da API para o formulário e coletar os dados do formulário para salvar.

/**
 * Busca as configurações do servidor e preenche todos os campos do formulário.
 */
async function loadAndPopulateSettings() {
    console.log("Carregando e populando configurações...");
    try {
        const [settings, faqs] = await Promise.all([
            fetchSettings(), // Função de api.js
            fetchFaqs()       // Função de api.js
        ]);

        if (!settings) {
            throw new Error("Os dados de configuração não foram recebidos.");
        }

        // Preenche os campos de modo do site
        if (settings.site_mode === 'studio') {
            document.getElementById('mode_studio').checked = true;
        } else {
            document.getElementById('mode_individual').checked = true;
        }
        document.getElementById('studio_name').value = settings.studio_name || '';
        document.getElementById('mode_studio').dispatchEvent(new Event('change'));

        // Preenche os campos de texto e inputs simples
        document.getElementById('artist_name').value = settings.artist_name || '';
        document.getElementById('artist_email').value = settings.artist_email || '';
        document.getElementById('artist_location').value = settings.artist_location || '';
        document.getElementById('home_headline').value = settings.home_headline || '';
        document.getElementById('home_subheadline').value = settings.home_subheadline || '';
        document.getElementById('refund_policy').value = settings.refund_policy || '';
        document.getElementById('revision_alert_text').value = settings.revision_alert_text || '';
        document.getElementById('custom_css_theme').value = settings.custom_css_theme || '';
        document.getElementById('pix_key').value = settings.pix_key || '';
        document.getElementById('payment_currency_code').value = settings.payment_currency_code || 'BRL';
        document.getElementById('paypal_email').value = settings.paypal_email || '';
        document.getElementById('paypal_hosted_button_id').value = settings.paypal_hosted_button_id || '';
        document.getElementById('TELEGRAM_ENABLED').checked = settings.TELEGRAM_ENABLED === 'true';
        document.getElementById('TELEGRAM_BOT_TOKEN').value = settings.TELEGRAM_BOT_TOKEN || '';
        document.getElementById('TELEGRAM_CHAT_ID').value = settings.TELEGRAM_CHAT_ID || '';
        document.getElementById('TELEGRAM_TEMPLATE_CONTACT').value = settings.TELEGRAM_TEMPLATE_CONTACT || '';
        
        document.getElementById('artist_bio').value = settings.artist_bio || '';
        document.getElementById('artist_process').value = settings.artist_process || '';
        document.getElementById('artist_inspirations').value = settings.artist_inspirations || '';

        document.getElementById('artist_avatar').value = settings.artist_avatar || '';
        document.getElementById('avatar-preview').src = settings.artist_avatar || 'https://placehold.co/150x150/1e1e1e/ffffff?text=Preview';
        
        // INÍCIO DA MODIFICAÇÃO: Popula os novos campos
        document.getElementById('terms_of_service').value = settings.terms_of_service || '';
        document.getElementById('privacy_policy').value = settings.privacy_policy || '';
        // FIM DA MODIFICAÇÃO

        // Usa as funções do módulo de UI para criar os elementos dinâmicos
        if (settings.commission_types && Array.isArray(settings.commission_types)) {
            settings.commission_types.forEach(data => window.settingsUI.createCommissionTypeElement(data));
        }
        if (settings.commission_extras && Array.isArray(settings.commission_extras)) {
            settings.commission_extras.forEach(data => window.settingsUI.createExtraElement(data));
        }
        if (settings.social_links && Array.isArray(settings.social_links)) {
            settings.social_links.forEach(data => window.settingsUI.createSocialElement(data));
        }
        if (settings.support_contacts && Array.isArray(settings.support_contacts)) {
            settings.support_contacts.forEach(data => window.settingsUI.createSupportContactElement(data));
        }
        if (faqs && Array.isArray(faqs)) {
            faqs.forEach(data => window.settingsUI.createFaqElement(data));
        }

    } catch (error) {
        console.error("Erro ao carregar configurações:", error);
        showNotification('Falha ao carregar as configurações do servidor.', 'error');
    }
}

/**
 * Inicializa o listener do formulário para salvar os dados.
 * @param {HTMLFormElement} form - O elemento do formulário.
 */
function initializeFormSaver(form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        console.log("Coletando dados do formulário para salvar...");

        const settingsData = {
            'site_mode': document.querySelector('input[name="site_mode"]:checked').value,
            'studio_name': document.getElementById('studio_name').value,
            'artist_name': document.getElementById('artist_name').value,
            'artist_email': document.getElementById('artist_email').value,
            'artist_location': document.getElementById('artist_location').value,
            'home_headline': document.getElementById('home_headline').value,
            'home_subheadline': document.getElementById('home_subheadline').value,
            'custom_css_theme': document.getElementById('custom_css_theme').value,
            'refund_policy': document.getElementById('refund_policy').value,
            'revision_alert_text': document.getElementById('revision_alert_text').value,
            'pix_key': document.getElementById('pix_key').value,
            'payment_currency_code': document.getElementById('payment_currency_code').value,
            'paypal_email': document.getElementById('paypal_email').value,
            'paypal_hosted_button_id': document.getElementById('paypal_hosted_button_id').value,
            'TELEGRAM_ENABLED': document.getElementById('TELEGRAM_ENABLED').checked.toString(),
            'TELEGRAM_BOT_TOKEN': document.getElementById('TELEGRAM_BOT_TOKEN').value,
            'TELEGRAM_CHAT_ID': document.getElementById('TELEGRAM_CHAT_ID').value,
            'TELEGRAM_TEMPLATE_CONTACT': document.getElementById('TELEGRAM_TEMPLATE_CONTACT').value,
            'artist_bio': document.getElementById('artist_bio').value,
            'artist_process': document.getElementById('artist_process').value,
            'artist_inspirations': document.getElementById('artist_inspirations').value,
            'artist_avatar': document.getElementById('artist_avatar').value,
            
            // INÍCIO DA MODIFICAÇÃO: Coleta os dados dos novos campos
            'terms_of_service': document.getElementById('terms_of_service').value,
            'privacy_policy': document.getElementById('privacy_policy').value,
            // FIM DA MODIFICAÇÃO

            'social_links': [],
            'commission_types': [], 
            'commission_extras': [], 
            'support_contacts': []
        };
        
        document.querySelectorAll('#social-links-container .social-link-item').forEach(item => {
            const network = item.querySelector('.network-input').value.trim();
            const url = item.querySelector('.url-input').value.trim();
            if (network && url) {
                settingsData.social_links.push({ network, url });
            }
        });

        document.querySelectorAll('#commission-types-container .commission-type-item-wrapper').forEach(wrapper => {
            const serviceItem = wrapper.querySelector('.commission-type-item');
            const name = serviceItem.querySelector('.type-input').value.trim();
            const description = serviceItem.querySelector('.description-input').value.trim();
            const price = parseFloat(serviceItem.querySelector('.price-input').value);
            const deadline = parseInt(serviceItem.querySelector('.deadline-input').value);
            if (name && !isNaN(price)) {
                const phases = [];
                wrapper.querySelectorAll('.phase-item').forEach(phaseRow => {
                    const phaseName = phaseRow.querySelector('.phase-name').value.trim();
                    const revisionsLimit = parseInt(phaseRow.querySelector('.phase-revisions').value, 10);
                    if (phaseName && !isNaN(revisionsLimit)) {
                        phases.push({ name: phaseName, revisions_limit: revisionsLimit });
                    }
                });
                settingsData.commission_types.push({ name, description, price, deadline, phases });
            }
        });

        document.querySelectorAll('#commission-extras-container .commission-type-item').forEach(item => {
            const name = item.querySelector('.type-input').value.trim();
            const price = parseFloat(item.querySelector('.price-input').value);
            if (name && !isNaN(price)) { settingsData.commission_extras.push({ name, price }); }
        });

        document.querySelectorAll('#support-contacts-container .commission-type-item').forEach(item => {
            const method = item.querySelector('.contact-method').value.trim();
            const value = item.querySelector('.contact-value').value.trim();
            if (method && value) {
                settingsData.support_contacts.push({ method, value });
            }
        });

        const faqsData = [];
        document.querySelectorAll('#faq-container .commission-type-item-wrapper').forEach(wrapper => {
            const question = wrapper.querySelector('.faq-question').value.trim();
            const answer = wrapper.querySelector('.faq-answer').value.trim();
            const id = wrapper.dataset.id ? parseInt(wrapper.dataset.id) : null;
            if (question && answer) {
                faqsData.push({ id, question, answer });
            }
        });

        const [settingsResponse, faqsResponse] = await Promise.all([
            saveSettings(settingsData),
            syncFaqs(faqsData)
        ]);

        if(settingsResponse.success && faqsResponse.success) {
            showNotification('Configurações e FAQs salvos com sucesso!', 'success');
        } else {
            const errorMessage = `${settingsResponse.message || ''} ${faqsResponse.message || ''}`.trim();
            showNotification(errorMessage || 'Erro desconhecido ao salvar.', 'error');
        }
    });
}