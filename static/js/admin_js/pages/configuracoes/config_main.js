// Arquivo: static/js/admin_js/pages/configuracoes/config_main.js
// Este é o arquivo principal que orquestra a página de configurações.

document.addEventListener('DOMContentLoaded', () => {
    // Verifica se estamos na página de configurações
    const form = document.getElementById('settings-form');
    if (!form) return;

    console.log("Módulo principal de configurações (config_main.js) iniciado.");

    // Inicializa os manipuladores de UI (botões de adicionar/remover)
    // Esta função virá do arquivo 'config_ui_handlers.js'
    initializeUIHandlers();

    // Carrega os dados existentes do servidor e preenche o formulário
    // Esta função virá do arquivo 'config_data_manager.js'
    loadAndPopulateSettings();

    // Anexa o listener para o evento de 'submit' do formulário
    // Esta função virá do arquivo 'config_data_manager.js'
    initializeFormSaver(form);
});