document.addEventListener('DOMContentLoaded', () => {
    const yearFilter = document.getElementById('year-filter');
    const kpisContainer = document.getElementById('visao-geral-cards');
    const topClientesTbody = document.querySelector('#top-clientes-table tbody');

    if (!yearFilter) return;

    let servicosChartInstance = null;
    let produtividadeChartInstance = null;

    function populateYearFilter() {
        const currentYear = new Date().getFullYear();
        for (let year = currentYear; year >= currentYear - 5; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearFilter.appendChild(option);
        }
    }

    async function loadReportsData(year) {
        kpisContainer.innerHTML = '<div class="loading-overlay" style="display: flex; position: relative; background: none; height: 100px;"><div class="spinner"></div></div>';
        topClientesTbody.innerHTML = '<tr><td colspan="2"><div class="loading-overlay" style="display: flex; position: relative; background: none;"><div class="spinner"></div></div></td></tr>';
        
        try {
            // CAMINHO CORRIGIDO: Adicionado '/admin' antes de '/api'
            const response = await fetch(`/admin/api/relatorios/dados?ano=${year}`);
            if (!response.ok) {
                throw new Error('Falha ao carregar dados dos relatórios');
            }
            const data = await response.json();
            
            updateKpis(data.kpis);
            updateTopClientes(data.top_clientes);
            updateServicosChart(data.receita_por_tipo);
            updateProdutividadeChart(data.comissoes_por_mes);

        } catch (error) {
            console.error('Erro ao carregar relatórios:', error);
            kpisContainer.innerHTML = '<p>Erro ao carregar dados.</p>';
        }
    }
    
    // ... (O resto do arquivo permanece o mesmo) ...

    function updateKpis(kpis) {
        kpisContainer.innerHTML = `
            <div class="card kpi-card">
                <div class="kpi-icon" style="background-color: #e0f2fe;"><i class="fas fa-dollar-sign" style="color: #0ea5e9;"></i></div>
                <div class="kpi-content">
                    <div class="kpi-value">R$ ${kpis.receita_anual.toFixed(2).replace('.', ',')}</div>
                    <div class="kpi-label">Receita Anual</div>
                </div>
            </div>
            <div class="card kpi-card">
                <div class="kpi-icon" style="background-color: #dcfce7;"><i class="fas fa-shopping-cart" style="color: #22c55e;"></i></div>
                <div class="kpi-content">
                    <div class="kpi-value">${kpis.total_comissoes}</div>
                    <div class="kpi-label">Comissões Concluídas</div>
                </div>
            </div>
            <div class="card kpi-card">
                <div class="kpi-icon" style="background-color: #fefce8;"><i class="fas fa-users" style="color: #eab308;"></i></div>
                <div class="kpi-content">
                    <div class="kpi-value">${kpis.clientes_ativos}</div>
                    <div class="kpi-label">Clientes Ativos</div>
                </div>
            </div>
            <div class="card kpi-card">
                <div class="kpi-icon" style="background-color: #ffe4e6;"><i class="fas fa-receipt" style="color: #f43f5e;"></i></div>
                <div class="kpi-content">
                    <div class="kpi-value">R$ ${kpis.ticket_medio.toFixed(2).replace('.', ',')}</div>
                    <div class="kpi-label">Ticket Médio</div>
                </div>
            </div>
        `;
    }

    function updateTopClientes(clientes) {
        topClientesTbody.innerHTML = '';
        if (clientes.length === 0) {
            topClientesTbody.innerHTML = '<tr><td colspan="2" style="text-align:center;">Nenhum dado para este ano.</td></tr>';
            return;
        }
        clientes.forEach(cliente => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${cliente.client}</td>
                <td>R$ ${cliente.total.toFixed(2).replace('.', ',')}</td>
            `;
            topClientesTbody.appendChild(row);
        });
    }

    function updateServicosChart(data) {
        const ctx = document.getElementById('servicosChart').getContext('2d');
        if(servicosChartInstance) servicosChartInstance.destroy();
        servicosChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(data),
                datasets: [{
                    label: 'Receita por Tipo',
                    data: Object.values(data),
                    backgroundColor: ['#3b82f6', '#16a34a', '#ef4444', '#f97316', '#8b5cf6'],
                    borderColor: 'var(--dark)',
                    borderWidth: 2
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    function updateProdutividadeChart(data) {
        const ctx = document.getElementById('produtividadeChart').getContext('2d');
        if (produtividadeChartInstance) produtividadeChartInstance.destroy();
        produtividadeChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
                datasets: [{
                    label: 'Comissões Concluídas por Mês',
                    data: Object.values(data),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        });
    }
    
    yearFilter.addEventListener('change', () => {
        loadReportsData(yearFilter.value);
    });

    populateYearFilter();
    loadReportsData(yearFilter.value);
});