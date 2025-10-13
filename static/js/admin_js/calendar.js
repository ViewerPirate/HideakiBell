// Arquivo: calendar.js
// Responsável por toda a lógica de renderização do calendário.

function renderCalendar(month, year, comissoes) {
    const calendarDays = document.getElementById('calendar-days');
    const calendarMonthYear = document.getElementById('calendar-month-year');
    
    // --- VERIFICAÇÃO DE SEGURANÇA ADICIONADA ---
    // Se os elementos do calendário não existirem nesta página, a função para aqui.
    if (!calendarDays || !calendarMonthYear) {
        return; 
    }

    calendarDays.innerHTML = ''; // Limpa o calendário antes de redesenhar

    const today = new Date();
    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingDay = firstDayOfMonth.getDay(); // 0 (Dom) - 6 (Sáb)

    // Atualiza o título do calendário (ex: "Julho 2025")
    const monthName = firstDayOfMonth.toLocaleString('pt-BR', { month: 'long' });
    calendarMonthYear.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

    // Extrai apenas os dias de prazo para facilitar a verificação
    const deadlines = comissoes.map(c => {
        const deadlineDate = new Date(c.deadline + 'T00:00:00');
        // Retorna um objeto simples para comparação
        return {
            day: deadlineDate.getDate(),
            month: deadlineDate.getMonth(),
            year: deadlineDate.getFullYear()
        };
    });

    // Cria as células vazias para os dias antes do início do mês
    for (let i = 0; i < startingDay; i++) {
        const emptyCell = document.createElement('div');
        calendarDays.appendChild(emptyCell);
    }

    // Cria as células para cada dia do mês
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        dayCell.textContent = day;

        // Verifica se o dia atual é um prazo
        const isDeadline = deadlines.some(d => d.day === day && d.month === month && d.year === year);
        if (isDeadline) {
            dayCell.classList.add('event'); // Adiciona a bolinha indicadora
        }

        // Verifica se é o dia de hoje
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayCell.classList.add('today');
        }
        
        calendarDays.appendChild(dayCell);
    }
}