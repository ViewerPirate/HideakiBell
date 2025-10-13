// Arquivo: static/js/admin_js/pages/configuracoes/config_ui_handlers.js
// Responsável por toda a lógica de manipulação da UI (adicionar/remover elementos dinâmicos).

function initializeUIHandlers() {
    
    // --- 1. Referências aos Elementos do DOM ---
    const typesContainer = document.getElementById('commission-types-container');
    const addTypeBtn = document.getElementById('add-type-btn');
    const commissionTemplate = document.getElementById('commission-type-template');
    
    const phaseItemTemplate = document.getElementById('phase-item-template');

    const extrasContainer = document.getElementById('commission-extras-container');
    const addExtraBtn = document.getElementById('add-extra-btn');
    const extraTemplate = document.getElementById('commission-extra-template');

    const socialLinksContainer = document.getElementById('social-links-container');
    const addSocialBtn = document.getElementById('add-social-btn');
    const socialTemplate = document.getElementById('social-link-template');

    // --- INÍCIO DA MODIFICAÇÃO (Novas referências) ---
    const contactsContainer = document.getElementById('support-contacts-container');
    const addContactBtn = document.getElementById('add-contact-btn');
    const contactTemplate = document.getElementById('support-contact-template');

    const faqContainer = document.getElementById('faq-container');
    const addFaqBtn = document.getElementById('add-faq-btn');
    const faqTemplate = document.getElementById('faq-template');
    // --- FIM DA MODIFICAÇÃO ---

    const SUPPORTED_SOCIAL_NETWORKS = [
        { name: 'Instagram', icon: 'fab fa-instagram' }, { name: 'Twitter', icon: 'fab fa-twitter' },
        { name: 'ArtStation', icon: 'fab fa-artstation' }, { name: 'Facebook', icon: 'fab fa-facebook' },
        { name: 'Behance', icon: 'fab fa-behance' }, { name: 'LinkedIn', icon: 'fab fa-linkedin' },
        { name: 'Pinterest', icon: 'fab fa-pinterest' }, { name: 'YouTube', icon: 'fab fa-youtube' },
        { name: 'Website', icon: 'fas fa-globe' }, { name: 'Outro', icon: 'fas fa-link' }
    ];

    // --- 2. Funções de Criação de Elementos ---

    function updateSocialIcon(selectElement) {
        const selectedNetworkName = selectElement.value;
        const iconElement = selectElement.closest('.social-link-item').querySelector('.social-icon-display i');
        const network = SUPPORTED_SOCIAL_NETWORKS.find(n => n.name === selectedNetworkName);
        if (iconElement && network) {
            iconElement.className = network.icon;
        } else if (iconElement) {
            iconElement.className = 'fas fa-link';
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

    function createExtraElement(data = {}) {
        const clone = extraTemplate.content.cloneNode(true);
        const item = clone.querySelector('.commission-type-item');
        item.querySelector('.type-input').value = data.name || '';
        item.querySelector('.price-input').value = data.price || '';
        item.querySelector('.remove-type-btn').addEventListener('click', () => item.remove());
        extrasContainer.appendChild(clone);
    }
    
    function createPhaseElement(data = {}, container) {
        const clone = phaseItemTemplate.content.cloneNode(true);
        const phaseItem = clone.querySelector('.phase-item');
        phaseItem.querySelector('.phase-name').value = data.name || '';
        phaseItem.querySelector('.phase-revisions').value = data.revisions_limit ?? '';
        container.appendChild(clone);
    }

    function createCommissionTypeElement(data = {}) {
        const clone = commissionTemplate.content.cloneNode(true);
        const wrapper = clone.querySelector('.commission-type-item-wrapper');
        const serviceItem = wrapper.querySelector('.commission-type-item');
        
        serviceItem.querySelector('.type-input').value = data.name || '';
        serviceItem.querySelector('.description-input').value = data.description || '';
        serviceItem.querySelector('.price-input').value = data.price || '';
        serviceItem.querySelector('.deadline-input').value = data.deadline || '';
        
        const phasesListContainer = wrapper.querySelector('.phases-list');
        if (data.phases && Array.isArray(data.phases)) {
            data.phases.forEach(phaseData => createPhaseElement(phaseData, phasesListContainer));
        }
        
        typesContainer.appendChild(clone);
    }

    // --- INÍCIO DA MODIFICAÇÃO (Novas Funções de Criação) ---
    function createSupportContactElement(data = {}) {
        const clone = contactTemplate.content.cloneNode(true);
        const item = clone.querySelector('.commission-type-item');
        item.querySelector('.contact-method').value = data.method || '';
        item.querySelector('.contact-value').value = data.value || '';
        item.querySelector('.remove-item-btn').addEventListener('click', () => item.remove());
        contactsContainer.appendChild(clone);
    }

    function createFaqElement(data = {}) {
        const clone = faqTemplate.content.cloneNode(true);
        const wrapper = clone.querySelector('.commission-type-item-wrapper');
        // Adiciona um ID único para futuras manipulações (como salvar)
        if (data.id) {
            wrapper.dataset.id = data.id;
        }
        wrapper.querySelector('.faq-question').value = data.question || '';
        wrapper.querySelector('.faq-answer').value = data.answer || '';
        wrapper.querySelector('.remove-item-btn').addEventListener('click', () => {
            if (confirm('Tem certeza que deseja remover este FAQ?')) {
                wrapper.remove();
            }
        });
        faqContainer.appendChild(clone);
    }
    // --- FIM DA MODIFICAÇÃO ---

    // --- 3. Anexando os Event Listeners ---

    if(addTypeBtn) addTypeBtn.addEventListener('click', () => createCommissionTypeElement());
    if(addExtraBtn) addExtraBtn.addEventListener('click', () => createExtraElement());
    if(addSocialBtn) addSocialBtn.addEventListener('click', () => createSocialElement());

    // --- INÍCIO DA MODIFICAÇÃO (Novos Listeners) ---
    if(addContactBtn) addContactBtn.addEventListener('click', () => createSupportContactElement());
    if(addFaqBtn) addFaqBtn.addEventListener('click', () => createFaqElement());
    // --- FIM DA MODIFICAÇÃO ---


    if(typesContainer) typesContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-phase-btn')) {
            const phasesList = e.target.previousElementSibling;
            createPhaseElement({}, phasesList);
        }
        
        const removeButton = e.target.closest('.remove-type-btn, .remove-phase-btn');
        if (removeButton) {
            if (removeButton.closest('.phase-item')) {
                 removeButton.closest('.phase-item').remove();
            } else if (removeButton.closest('.commission-type-item-wrapper')) {
                removeButton.closest('.commission-type-item-wrapper').remove();
            }
        }
    });

    // Expondo as funções de criação para que o data_manager possa usá-las
    window.settingsUI = {
        createCommissionTypeElement,
        createExtraElement,
        createSocialElement,
        // --- INÍCIO DA MODIFICAÇÃO (Novas Funções Expostas) ---
        createSupportContactElement,
        createFaqElement
        // --- FIM DA MODIFICAÇÃO ---
    };
}