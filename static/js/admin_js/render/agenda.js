// Arquivo: static/js/admin_js/render/agenda.js

/**
 * Renderiza a timeline de comissões na página da Agenda.
 * @param {Array} comissoes - A lista de comissões a ser exibida.
 * @param {string} filtro - O filtro atualmente aplicado (informativo).
 */
function renderAgenda(comissoes, filtro) {
    const timelineContainer = document.getElementById('agenda-timeline');
    if (!timelineContainer) return;
    timelineContainer.innerHTML = '';

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (comissoes.length === 0) { 
        timelineContainer.innerHTML = '<div class="card" style="text-align: center; padding: 40px; color: var(--cor-texto-secundario);">Nenhuma comissão encontrada para este filtro.</div>';
        return; 
    }

    // Ordena as comissões por prazo para a visualização de timeline
    const comissoesOrdenadas = [...comissoes].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    comissoesOrdenadas.forEach(comissao => {
        const prazo = new Date(comissao.deadline + 'T00:00:00');
        const dia = prazo.getDate();
        const mes = prazo.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
        const diffEmDias = Math.ceil((prazo - hoje) / (1000 * 60 * 60 * 24));
        
        let statusClass = '';
        let statusTexto = `Faltam ${diffEmDias} dias`;
          
        if (diffEmDias < 0) { 
            statusClass = 'status-overdue'; 
            statusTexto = `Atrasado há ${Math.abs(diffEmDias)} dia(s)`; 
        } else if (diffEmDias <= 7) { 
            statusClass = 'status-due-soon'; 
        }

        if (diffEmDias === 0) statusTexto = 'O prazo é hoje!';
        if (diffEmDias === 1) statusTexto = 'O prazo é amanhã!';
        
        const itemHTML = `
            <div class="timeline-item">
                <div class="timeline-date-marker">
                    <div class="timeline-day">${dia}</div>
                    <div class="timeline-month">${mes}</div>
                </div> 
                <div class="timeline-card ${statusClass}">
                    <div class="timeline-card-header">
                        <div class="timeline-card-title">${comissao.type}</div>
                        <span class="status status-${comissao.status.replace('_', '-')}">${comissao.status.replace('_', ' ')}</span>
                    </div>
                    <div class="timeline-card-client"><i class="fas fa-user"></i> Cliente: ${comissao.client}</div>
                    <div class="timeline-card-footer">
                        <span style="font-size: 0.9em; color: var(--cor-texto-secundario);"><i class="fas fa-clock"></i> ${statusTexto}</span>
                        <button class="btn btn-sm btn-primary view-btn" data-id="${comissao.id}"><i class="fas fa-eye"></i> Detalhes</button>
                    </div> 
                </div>
            </div>`;
        timelineContainer.innerHTML += itemHTML;
    });

    // Adiciona listeners aos novos botões de "Detalhes"
    addTableButtonListeners();
}