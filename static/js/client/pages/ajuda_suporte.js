// Arquivo: static/js/client/pages/ajuda_suporte.js
// Lógica para a página de FAQ "Ajuda & Suporte" do cliente.

document.addEventListener('DOMContentLoaded', () => {
    // Procura pelo container do FAQ para garantir que o script só rode na página certa
    const faqContainer = document.querySelector('.faq-container');
    if (!faqContainer) {
        return;
    }

    const faqItems = faqContainer.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const questionButton = item.querySelector('.faq-question');

        questionButton.addEventListener('click', () => {
            // Verifica se o item clicado já está ativo
            const wasActive = item.classList.contains('active');

            // Opcional: Fecha todos os outros itens abertos para ter apenas um aberto por vez
            // Comente a linha abaixo se quiser permitir múltiplos itens abertos simultaneamente
            faqItems.forEach(i => i.classList.remove('active'));

            // Se o item clicado não estava ativo, abre ele
            if (!wasActive) {
                item.classList.add('active');
            }
        });
    });
});