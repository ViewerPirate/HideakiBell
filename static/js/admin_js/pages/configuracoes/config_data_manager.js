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
            fetchFaqs()      // Função de api.js
        ]);

        if (!settings) {
            throw new Error("Os dados de configuração não foram recebidos.");
        }

        // --- INÍCIO DA MODIFICAÇÃO: Campos de perfil de artista foram removidos ---
        // Preenche os novos campos de modo do site
        if (settings.site_mode === 'studio') {
            document.getElementById('mode_studio').checked = true;
        } else {
            document.getElementById('mode_individual').checked = true;
        }
        document.getElementById('studio_name').value = settings.studio_name || '';
        // Dispara o evento 'change' para que o script no HTML atualize a UI
        document.getElementById('mode_studio').dispatchEvent(new Event('change'));

        // Preenche os campos de texto e inputs simples que restaram
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
        
        // As lógicas para carregar avatar, bio, especialidades, etc., foram removidas.
        
        // Usa as funções do módulo de UI para criar os elementos dinâmicos restantes
        if (settings.commission_types && Array.isArray(settings.commission_types)) {
            settings.commission_types.forEach(data => window.settingsUI.createCommissionTypeElement(data));
        }
        if (settings.commission_extras && Array.isArray(settings.commission_extras)) {
            settings.commission_extras.forEach(data => window.settingsUI.createExtraElement(data));
        }
        if (settings.support_contacts && Array.isArray(settings.support_contacts)) {
            settings.support_contacts.forEach(data => window.settingsUI.createSupportContactElement(data));
        }
        if (faqs && Array.isArray(faqs)) {
            faqs.forEach(data => window.settingsUI.createFaqElement(data));
        }
        // A lógica para popular as redes sociais foi removida.
        // --- FIM DA MODIFICAÇÃO ---

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

        // --- INÍCIO DA MODIFICAÇÃO: Campos de perfil de artista foram removidos do objeto de salvamento ---
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
            'commission_types': [], 'commission_extras': [], 'support_contacts': []
            // A chave 'social_links' foi removida daqui.
        };

        // A coleta de dados de perfil (avatar, bio, especialidades, etc.) foi removida.
        // --- FIM DA MODIFICAÇÃO ---

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