// static/js/client/dom.js
// Centraliza o estado da aplicação e as referências aos elementos do DOM.
window.state = {
    currentUser: {
        name: 'João Silva', // No futuro, isso virá da sessão do Flask
        avatar: 'JS'
    },
    orders: [], // Armazenará os pedidos carregados
    portfolio: [], // Armazenará o portfólio carregado
    currentTab: 'details',
    selectedFiles: [],
    currentOrder: null,
    currentFilter: 'all',
    currentSearch: ''
};
// Objeto para referenciar todos os elementos do DOM que serão usados
const DOM = {
    // Listagem e Filtros
    orderList: document.getElementById('orderList'),
    emptyState: document.getElementById('emptyState'),
    statusFilter: document.getElementById('statusFilter'),
    searchOrders: document.getElementById('searchOrders'),
    applyFiltersBtn: document.getElementById('applyFiltersBtn'),
    
    // Botões Principais
    newOrderBtn: document.getElementById('newOrderBtn'),
    createFirstOrderBtn: document.getElementById('createFirstOrderBtn'),
    viewPortfolioBtn: document.getElementById('viewPortfolioBtn'),
    pricingBtn: document.getElementById('pricingBtn'),

    // Modal de Novo Pedido
    newOrderModal: document.getElementById('newOrderModal'),
    orderForm: document.getElementById('orderForm'),
    tabButtons: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    prevTabBtn: document.getElementById('prevTabBtn'),
    nextTabBtn: document.getElementById('nextTabBtn'),
    submitOrderBtn: document.getElementById('submitOrderBtn'),
    orderTitle: document.getElementById('orderTitle'),
    orderType: document.getElementById('orderType'),
    orderDescription: document.getElementById('orderDescription'),
    orderDeadline: document.getElementById('orderDeadline'),
    fileUploadArea: document.getElementById('fileUploadArea'),
    filePreview: document.getElementById('filePreview'),
    referenceFiles: document.getElementById('referenceFiles'),
    totalPrice: document.getElementById('totalPrice'),
    orderSummary: document.getElementById('orderSummary'),

    // Modal de Detalhes do Pedido
    orderDetailsModal: document.getElementById('orderDetailsModal'),
    orderDetailsContent: document.getElementById('orderDetailsContent'),
    detailOrderId: document.getElementById('detailOrderId'),

    // Modal do Portfólio
    portfolioModal: document.getElementById('portfolioModal'),
    portfolioGallery: document.getElementById('portfolioGallery'),
    portfolioFilter: document.getElementById('portfolioFilter'),

    // Modal de Preços
    pricingModal: document.getElementById('pricingModal'),

    // Modal de Confirmação
    confirmModal: document.getElementById('confirmModal'),
    confirmModalTitle: document.getElementById('confirmModalTitle'),
    confirmModalMessage: document.getElementById('confirmModalMessage'),
    confirmModalCancel: document.getElementById('confirmModalCancel'),
    confirmModalConfirm: document.getElementById('confirmModalConfirm'),

    // --- INÍCIO DA MODIFICAÇÃO ---
    // Top Bar (Avatar e Notificações)
    clientUserAvatar: document.getElementById('client-user-avatar'),
    clientUserMenu: document.getElementById('client-user-menu'),
    clientNotificationBell: document.getElementById('client-notification-bell-btn'),
    clientNotificationBadge: document.getElementById('client-notification-badge'),
    clientNotificationDropdown: document.getElementById('client-notification-dropdown'),
    clientNotificationList: document.getElementById('client-notification-list'),

    // Overlays
    notification: document.getElementById('notification'),
    notificationMessage: document.getElementById('notificationMessage'),
    notificationIcon: document.getElementById('notificationIcon'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    // --- FIM DA MODIFICAÇÃO ---
};