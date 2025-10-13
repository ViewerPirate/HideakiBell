// Arquivo: static/js/admin_js/pages/comissoes.js
// Script específico para a página de gerenciamento de comissões.

document.addEventListener('DOMContentLoaded', async () => {
    // Declara e busca a variável 'allComissoes' no escopo desta página.
    let allComissoes = [];
    
    console.log("Buscando comissões para a página de comissões.");
    allComissoes = await fetchComissoes();
    
    // A função renderComissoesTable (de render.js) já anexa os listeners aos botões da tabela.
    // Passamos a lista completa de comissões para ela.
    renderComissoesTable(allComissoes);

    // Adiciona listener para o campo de busca
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value.toLowerCase().trim();
            if (!allComissoes) return;
            
            const comissoesFiltradas = allComissoes.filter(comissao => {
                const id = String(comissao.id).toLowerCase();
                const client = comissao.client.toLowerCase();
                const type = comissao.type.toLowerCase();
                return id.includes(searchTerm) || client.includes(searchTerm) || type.includes(searchTerm);
            });
            // Renderiza a tabela novamente com a lista filtrada
            renderComissoesTable(comissoesFiltradas);
        });
    }
});
