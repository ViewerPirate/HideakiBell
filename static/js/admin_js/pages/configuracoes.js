document.addEventListener('DOMContentLoaded', () => {
    // O script só deve rodar se encontrar a estrutura da página de configurações
    const settingsWrapper = document.querySelector('.settings-wrapper');
    if (!settingsWrapper) {
        return;
    }

    const navLinks = settingsWrapper.querySelectorAll('.settings-nav a');
    const panes = settingsWrapper.querySelectorAll('.settings-pane');

    // Adiciona o evento de clique a cada link do menu lateral
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Pega o ID do painel alvo a partir do atributo 'data-target' do link
            const targetId = `pane-${link.dataset.target}`;
            const targetPane = document.getElementById(targetId);

            // Remove a classe 'active' de todos os links e painéis
            navLinks.forEach(l => l.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));

            // Adiciona a classe 'active' ao link clicado e ao painel correspondente
            link.classList.add('active');
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });
});