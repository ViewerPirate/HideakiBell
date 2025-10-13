//
// Arquivo: static/js/admin_js/pages/agenda.js (Substitua o seu por este)
//

document.addEventListener('DOMContentLoaded', () => {
    const timelineContainer = document.getElementById('agenda-timeline');
    const filters = document.getElementById('agenda-filters');

    if (!timelineContainer || !filters) return;

    let allCommissions = []; 

    async function carregarAgenda() {
        showLoadingState(true);
        try {
            const response = await fetch('/admin/api/agenda/comissoes');
            if (!response.ok) {
                throw new Error('Falha ao carregar dados da agenda');
            }
            allCommissions = await response.json();
            filtrarErenderizar('all');
        } catch (error) {
            console.error("Erro ao buscar dados para a agenda:", error);
            timelineContainer.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Não foi possível carregar a agenda.</p></div>';
        } finally {
            showLoadingState(false);
        }
    }

    function showLoadingState(isLoading) {
        if (isLoading) {
            timelineContainer.innerHTML = '<div class="loading-overlay" style="display: flex; position: relative; background: none;"><div class="spinner"></div></div>';
        }
    }

    function filtrarErenderizar(filtro) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); 
        let comissoesFiltradas = [];

        switch(filtro) {
            case 'week':
                const umaSemanaDepois = new Date(hoje);
                umaSemanaDepois.setDate(hoje.getDate() + 7);
                comissoesFiltradas = allCommissions.filter(c => new Date(c.deadline) >= hoje && new Date(c.deadline) <= umaSemanaDepois);
                break;
            case 'month':
                const fimDoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
                comissoesFiltradas = allCommissions.filter(c => new Date(c.deadline) >= hoje && new Date(c.deadline) <= fimDoMes);
                break;
            case 'overdue':
                comissoesFiltradas = allCommissions.filter(c => new Date(c.deadline) < hoje);
                break;
            default: // 'all'
                comissoesFiltradas = allCommissions;
        }

        // FUNÇÃO CORRIGIDA: de renderTimeline para renderAgenda
        renderAgenda(comissoesFiltradas, filtro);
    }

    filters.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            filters.querySelector('.active').classList.remove('active');
            e.target.classList.add('active');
            const filtro = e.target.dataset.filter;
            filtrarErenderizar(filtro);
        }
    });

    carregarAgenda();
});