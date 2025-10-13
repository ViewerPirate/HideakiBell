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

    // --- INÍCIO DA MODIFICAÇÃO: Novas redes adicionadas à lista ---
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
    // --- FIM DA MODIFICAÇÃO ---

    // --- API Funções ---
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
        }
    };

    // --- Funções de UI ---

    // UI para Contatos
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

    // UI para Serviços
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

    // Funções de preenchimento e salvamento
    function populateForm(profileData, servicesData) {
        // Popula perfil principal
        profileForm.querySelector('#artist_name').value = profileData.artist_name || '';
        profileForm.querySelector('#artist_avatar').value = profileData.artist_avatar || '';
        profileForm.querySelector('#artist_portfolio_description').value = profileData.artist_portfolio_description || '';
        profileForm.querySelector('#artist_specialties').value = (profileData.artist_specialties || []).join(', ');
        profileForm.querySelector('#is_public_artist').checked = profileData.is_public_artist === 1 || profileData.is_public_artist === true;
        profileForm.querySelector('#artist_bio').value = profileData.artist_bio || '';
        avatarPreview.src = profileData.artist_avatar || 'https://placehold.co/150x150/1e1e1e/ffffff?text=Preview';

        // Popula contatos
        socialLinksContainer.innerHTML = '';
        (profileData.social_links || []).forEach(link => createSocialElement(link));

        // Popula serviços
        servicesContainer.innerHTML = '';
        (servicesData || []).forEach(service => createServiceElement(service));
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        const saveButton = profileForm.querySelector('button[type="submit"]');
        const originalButtonHTML = saveButton.innerHTML;
        saveButton.disabled = true;
        saveButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Salvando...`;

        // Coleta dados do perfil
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

        // Coleta dados dos serviços
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
        }).filter(svc => svc.service_name); // Salva apenas se tiver nome

        // Envia ambos para a API em paralelo
        try {
            const [profileResult, servicesResult] = await Promise.all([
                api.saveProfile(profileDataToSave),
                api.syncProfileServices(servicesDataToSave)
            ]);

            if (profileResult.success && servicesResult.success) {
                showNotification('Perfil e serviços salvos com sucesso!', 'success');
                // Atualiza o menu do header
                const body = document.body;
                body.dataset.username = profileDataToSave.artist_name;
                body.dataset.avatarUrl = profileDataToSave.artist_avatar;
                if (typeof buildUnifiedHeader === 'function') {
                    buildUnifiedHeader();
                }
            } else {
                throw new Error(profileResult.message || servicesResult.message || 'Erro desconhecido');
            }
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            saveButton.disabled = false;
            saveButton.innerHTML = originalButtonHTML;
        }
    }

    // --- Inicialização ---
    async function init() {
        try {
            const [profileData, servicesData] = await Promise.all([
                api.getProfile(),
                api.getProfileServices()
            ]);
            populateForm(profileData, servicesData);
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

    init();
});