//
// Arquivo: static/js/admin_js/pages/financeiro.js (Substitua o seu por este)
//

document.addEventListener('DOMContentLoaded', () => {
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const filterBtn = document.getElementById('filter-btn');

    const kpiReceita = document.getElementById('kpi-receita-total');
    const kpiComissoes = document.getElementById('kpi-comissoes-pagas');
    const kpiTicketMedio = document.getElementById('kpi-ticket-medio');
    const transactionsTableBody = document.querySelector('#transactions-table-body');
    
    const chartCanvas = document.getElementById('revenueChart');
    let revenueChart = null; 

    const formatCurrency = (value) => {
        // Adiciona uma verificação para garantir que o valor não é nulo ou indefinido
        if (value === null || typeof value === 'undefined') {
            // Retorna 'R$ 0,00' se o valor for inválido, evitando o erro
            return (0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    async function loadFinancialData(inicio, fim) {
        const kpisContainer = document.querySelector('.dashboard-cards');
        kpisContainer.style.opacity = '0.5';
        transactionsTableBody.innerHTML = '<tr><td colspan="2"><div class="loading-overlay" style="display: flex; position: relative; background: none;"><div class="spinner"></div></div></td></tr>';
        try {
            // CAMINHO CORRIGIDO: Adicionado '/admin' antes de '/api'
            const response = await fetch(`/admin/api/financeiro/dados?inicio=${inicio}&fim=${fim}`);
            if (!response.ok) throw new Error('Falha ao carregar dados financeiros');
            
            const data = await response.json();
            
            kpiReceita.textContent = formatCurrency(data.kpis.total_receita);
            kpiComissoes.textContent = data.kpis.total_comissoes;
            kpiTicketMedio.textContent = formatCurrency(data.kpis.ticket_medio);

            transactionsTableBody.innerHTML = '';
            if (data.transacoes.length === 0) {
                transactionsTableBody.innerHTML = '<tr><td colspan="2" style="text-align:center;">Nenhuma transação no período.</td></tr>';
            } else {
                data.transacoes.forEach(transacao => {
                    const row = `
                        <tr>
                            <td>${new Date(transacao.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                             <td>${formatCurrency(transacao.price)}</td>
                        </tr>
                    `;
                    transactionsTableBody.innerHTML += row;
                });
            }

            updateChart(data.grafico_data);
        } catch (error) {
            console.error("Erro:", error);
            transactionsTableBody.innerHTML = '<tr><td colspan="2" style="text-align:center; color: var(--danger);">Erro ao carregar dados.</td></tr>';
        } finally {
            kpisContainer.style.opacity = '1';
        }
    }

    function updateChart(graficoData) {
        if (revenueChart) {
            revenueChart.destroy();
        }

        revenueChart = new Chart(chartCanvas, {
            type: 'bar',
            data: {
                labels: graficoData.labels,
                datasets: [{
                    label: 'Receita Mensal',
                    data: graficoData.data,
                    backgroundColor: 'rgba(20, 184, 166, 0.6)',
                    borderColor: 'rgba(20, 184, 166, 1)',
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                     y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                               return formatCurrency(value);
                            }
                        }
                     }
                },
                plugins: {
                    legend: {
                        display: false
                     },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                 return `Receita: ${formatCurrency(context.parsed.y)}`;
                            }
                        }
                    }
                }
            }
        });
    }

    function setDefaultDates() {
        const hoje = new Date();
        const primeiroDiaDoAno = new Date(hoje.getFullYear(), 0, 1);

        startDateInput.value = primeiroDiaDoAno.toISOString().split('T')[0];
        endDateInput.value = hoje.toISOString().split('T')[0];
    }

    filterBtn.addEventListener('click', () => {
        loadFinancialData(startDateInput.value, endDateInput.value);
    });

    setDefaultDates();
    loadFinancialData(startDateInput.value, endDateInput.value);
});