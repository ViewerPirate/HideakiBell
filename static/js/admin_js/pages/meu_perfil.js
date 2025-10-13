// Arquivo: static/js/admin_js/pages/meu_perfil.js

document.addEventListener('DOMContentLoaded', () => {
    // Garante que o script só rode na página "Meu Perfil"
    const profileForm = document.getElementById('profile-form');
    if (!profileForm) {
        return;
    }

    // --- Referências aos Elementos do DOM ---
    const socialLinksContainer = document.getElementById('social-links-container');
    const addSocialBtn = document.getElementById('add-social-btn');
    const socialTemplate = document.getElementById('social-link-template');
    
    const servicesContainer = document.getElementById('artist-services-container');
    const addServiceBtn = document.getElementById('add-artist-service-btn');
    const serviceTemplate = document.getElementById('artist-service-template');
    const phaseTemplate = document.getElementById('phase-item-template');

    const avatarInput = document.getElementById('artist_avatar');
    const avatarPreview = document.getElementById('avatar-preview');

    const SUPPORTED_SOCIAL_NETWORKS = [
        { name: 'Instagram', icon: 'fab fa-instagram' },
        { name: 'Twitter', icon: 'fab fa-twitter' },
        { name: 'ArtStation', icon: 'fab fa-artstation' },
        { name: 'Facebook', icon: 'fab fa-facebook' },
        { name: 'Behance', icon: 'fab fa-behance' },
        { name: 'Discord', icon: 'fab fa-discord' },
        { name: 'Email', icon: 'fas fa-envelope' },
        { name: 'LinkedIn', icon: 'fab fa-linkedin' },
        { name: 'Pinterest', icon: 'fab fa-pinterest' },
        { name: 'YouTube', icon: 'fab fa-youtube' },
        { name: 'Website', icon: 'fas fa-globe' },
        { name: 'WhatsApp', icon: 'fab fa-whatsapp' },
        { name: 'Telegram', icon: 'fab fa-telegram' },
        { name: 'Ko-fi', icon: 'fas fa-coffee' },
        { name: 'Outro', icon: 'fas fa-link' }
    ];

    // --- INÍCIO DA MODIFICAÇÃO: API expandida para dados de configuração individuais ---
    const api = {
        async getProfile() {
            const response = await fetch('/admin/api/profile');
            if (!response.ok) throw new Error('Falha ao carregar dados do perfil.');
            return response.json();
        },
        async saveProfile(data) {
            const response = await fetch('/admin/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.json();
        },
        async getProfileServices() {
            const response = await fetch('/admin/api/profile/services');
            if (!response.ok) throw new Error('Falha ao carregar serviços.');
            return response.json();
        },
        async syncProfileServices(servicesData) {
            const response = await fetch('/admin/api/profile/services/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(servicesData)
            });
            return response.json();
        },
        // Novas funções para salvar e carregar dados genéricos do artista (pagamentos, textos, etc.)
        async getArtistSettings() {
            // Usamos um "plugin_id" genérico para agrupar as configurações do perfil
            const response = await fetch(`/admin/api/plugin_data/artist_profile_settings/all_settings`);
            if (!response.ok) return { success: true, value: {} }; // Retorna objeto vazio se não houver dados
            const data = await response.json();
            return data.value || {};
        },
        async saveArtistSettings(settingsData) {
            const response = await fetch('/admin/api/plugin_data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plugin_id: 'artist_profile_settings',
                    key: 'all_settings',
                    value: settingsData
                })
            });
            return response.json();
        }
    };
    // --- FIM DA MODIFICAÇÃO ---

    // --- Funções de UI (sem alterações na lógica interna) ---

    function updateSocialIcon(selectElement) {
        const selectedNetworkName = selectElement.value;
        const iconElement = selectElement.closest('.social-link-item').querySelector('.social-icon-display i');
        const network = SUPPORTED_SOCIAL_NETWORKS.find(n => n.name === selectedNetworkName);
        if (iconElement) {
            iconElement.className = network ? network.icon : 'fas fa-link';
        }
    }

    function createSocialElement(data = {}) {
        const clone = socialTemplate.content.cloneNode(true);
        const item = clone.querySelector('.social-link-item');
        const select = item.querySelector('.network-input');
        const urlInput = item.querySelector('.url-input');

        SUPPORTED_SOCIAL_NETWORKS.forEach(network => {
            const option = document.createElement('option');
            option.value = network.name;
            option.textContent = network.name;
            if (data.network === network.name) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        urlInput.value = data.url || '';
        select.addEventListener('change', () => updateSocialIcon(select));
        item.querySelector('.remove-type-btn').addEventListener('click', () => item.remove());
        socialLinksContainer.appendChild(clone);
        updateSocialIcon(select);
    }

    function createPhaseElement(data = {}, container) {
        const clone = phaseTemplate.content.cloneNode(true);
        const phaseItem = clone.querySelector('.phase-item');
        phaseItem.querySelector('.phase-name').value = data.name || '';
        phaseItem.querySelector('.phase-revisions').value = data.revisions_limit ?? '';
        phaseItem.querySelector('.remove-phase-btn').addEventListener('click', () => phaseItem.remove());
        container.appendChild(clone);
    }

    function createServiceElement(data = {}) {
        const clone = serviceTemplate.content.cloneNode(true);
        const wrapper = clone.querySelector('.commission-type-item-wrapper');
        
        if (data.id) {
            wrapper.dataset.id = data.id;
        }

        wrapper.querySelector('.service-name').value = data.service_name || '';
        wrapper.querySelector('.service-description').value = data.description || '';
        wrapper.querySelector('.service-price').value = data.price || '';
        wrapper.querySelector('.service-deadline').value = data.deadline_days || '';
        wrapper.querySelector('.service-is-active').checked = data.is_active !== false;

        const phasesListContainer = wrapper.querySelector('.service-phases-list');
        if (data.phases && Array.isArray(data.phases)) {
            data.phases.forEach(phaseData => createPhaseElement(phaseData, phasesListContainer));
        }

        wrapper.querySelector('.add-service-phase-btn').addEventListener('click', () => createPhaseElement({}, phasesListContainer));
        wrapper.querySelector('.remove-service-btn').addEventListener('click', () => wrapper.remove());
        
        servicesContainer.appendChild(clone);
    }

    // --- INÍCIO DA MODIFICAÇÃO: Função de preenchimento expandida ---
    function populateForm(profileData, servicesData, artistSettings) {
        // Popula perfil principal (tabela 'users')
        profileForm.querySelector('#artist_name').value = profileData.artist_name || '';
        profileForm.querySelector('#artist_avatar').value = profileData.artist_avatar || '';
        profileForm.querySelector('#artist_portfolio_description').value = profileData.artist_portfolio_description || '';
        profileForm.querySelector('#artist_specialties').value = (profileData.artist_specialties || []).join(', ');
        profileForm.querySelector('#is_public_artist').checked = profileData.is_public_artist === 1 || profileData.is_public_artist === true;
        profileForm.querySelector('#artist_bio').value = profileData.artist_bio || '';
        avatarPreview.src = profileData.artist_avatar || 'https://placehold.co/150x150/1e1e1e/ffffff?text=Preview';

        // Popula contatos (tabela 'users', coluna 'social_links')
        socialLinksContainer.innerHTML = '';
        (profileData.social_links || []).forEach(link => createSocialElement(link));

        // Popula serviços (tabela 'artist_services')
        servicesContainer.innerHTML = '';
        (servicesData || []).forEach(service => createServiceElement(service));
        
        // Popula configurações adicionais (salvas de forma genérica)
        profileForm.querySelector('#artist_process').value = artistSettings.artist_process || '';
        profileForm.querySelector('#artist_inspirations').value = artistSettings.artist_inspirations || '';
        profileForm.querySelector('#profile_pix_key').value = artistSettings.pix_key || '';
        profileForm.querySelector('#profile_payment_currency_code').value = artistSettings.payment_currency_code || 'BRL';
        profileForm.querySelector('#profile_paypal_email').value = artistSettings.paypal_email || '';
    }
    // --- FIM DA MODIFICAÇÃO ---

    // --- INÍCIO DA MODIFICAÇÃO: Função de salvamento reescrita ---
    async function handleFormSubmit(event) {
        event.preventDefault();
        const saveButton = profileForm.querySelector('button[type="submit"]');
        const originalButtonHTML = saveButton.innerHTML;
        saveButton.disabled = true;
        saveButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Salvando...`;

        // 1. Coleta dados do Perfil Principal (para tabela 'users')
        const specialtiesInput = profileForm.querySelector('#artist_specialties').value.trim();
        const socialLinks = Array.from(socialLinksContainer.querySelectorAll('.social-link-item')).map(item => ({
            network: item.querySelector('.network-input').value,
            url: item.querySelector('.url-input').value.trim()
        })).filter(link => link.network && link.url);

        const profileDataToSave = {
            artist_name: profileForm.querySelector('#artist_name').value.trim(),
            artist_avatar: profileForm.querySelector('#artist_avatar').value.trim(),
            artist_portfolio_description: profileForm.querySelector('#artist_portfolio_description').value.trim(),
            artist_specialties: specialtiesInput ? specialtiesInput.split(',').map(s => s.trim()) : [],
            is_public_artist: profileForm.querySelector('#is_public_artist').checked.toString(),
            artist_bio: profileForm.querySelector('#artist_bio').value.trim(),
            social_links: socialLinks,
        };

        // 2. Coleta dados dos Serviços (para tabela 'artist_services')
        const servicesDataToSave = Array.from(servicesContainer.querySelectorAll('.commission-type-item-wrapper')).map(wrapper => {
            const phases = Array.from(wrapper.querySelectorAll('.phase-item')).map(phaseRow => ({
                name: phaseRow.querySelector('.phase-name').value.trim(),
                revisions_limit: parseInt(phaseRow.querySelector('.phase-revisions').value, 10) || 0
            }));
            return {
                id: wrapper.dataset.id ? parseInt(wrapper.dataset.id) : null,
                service_name: wrapper.querySelector('.service-name').value.trim(),
                description: wrapper.querySelector('.service-description').value.trim(),
                price: parseFloat(wrapper.querySelector('.service-price').value) || 0,
                deadline_days: parseInt(wrapper.querySelector('.service-deadline').value) || null,
                is_active: wrapper.querySelector('.service-is-active').checked,
                phases: phases
            };
        }).filter(svc => svc.service_name);

        // 3. Coleta dados de Configurações Adicionais (para armazenamento genérico)
        const artistSettingsToSave = {
            artist_process: profileForm.querySelector('#artist_process').value.trim(),
            artist_inspirations: profileForm.querySelector('#artist_inspirations').value.trim(),
            pix_key: profileForm.querySelector('#profile_pix_key').value.trim(),
            payment_currency_code: profileForm.querySelector('#profile_payment_currency_code').value.trim(),
            paypal_email: profileForm.querySelector('#profile_paypal_email').value.trim(),
        };

        // Envia todas as requisições em paralelo
        try {
            const [profileResult, servicesResult, settingsResult] = await Promise.all([
                api.saveProfile(profileDataToSave),
                api.syncProfileServices(servicesDataToSave),
                api.saveArtistSettings(artistSettingsToSave)
            ]);

            if (profileResult.success && servicesResult.success && settingsResult.success) {
                showNotification('Perfil salvo com sucesso!', 'success');
                // Atualiza o menu do header
                const body = document.body;
                body.dataset.username = profileDataToSave.artist_name;
                body.dataset.avatarUrl = profileDataToSave.artist_avatar;
                if (typeof buildUnifiedHeader === 'function') {
                    buildUnifiedHeader();
                }
            } else {
                throw new Error(profileResult.message || servicesResult.message || settingsResult.message || 'Erro desconhecido ao salvar.');
            }
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            saveButton.disabled = false;
            saveButton.innerHTML = originalButtonHTML;
        }
    }
    // --- FIM DA MODIFICAÇÃO ---

    // --- INÍCIO DA MODIFICAÇÃO: Função de inicialização expandida ---
    async function init() {
        try {
            const [profileData, servicesData, artistSettings] = await Promise.all([
                api.getProfile(),
                api.getProfileServices(),
                api.getArtistSettings()
            ]);
            populateForm(profileData, servicesData, artistSettings);
        } catch (error) {
            showNotification(error.message, 'error');
        }

        // Adiciona os event listeners
        addSocialBtn.addEventListener('click', () => createSocialElement());
        addServiceBtn.addEventListener('click', () => createServiceElement());
        profileForm.addEventListener('submit', handleFormSubmit);

        // Listener do preview do avatar
        avatarInput.addEventListener('input', () => {
            const newUrl = avatarInput.value.trim();
            avatarPreview.src = newUrl || 'https://placehold.co/150x150/1e1e1e/ffffff?text=Preview';
        });
        avatarPreview.onerror = () => {
            avatarPreview.src = 'https://placehold.co/150x150/ff0000/ffffff?text=Inválido';
        };
    }
    // --- FIM DA MODIFICAÇÃO ---

    init();
});