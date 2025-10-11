// assets/js/templates.js
function loadTemplate(url, elementId, callback) {
  fetch(url)
    .then(response => response.ok ? response.text() : Promise.reject('Template não encontrado.'))
    .then(data => {
      document.getElementById(elementId).innerHTML = data;
      if (callback) callback();
    })
    .catch(error => console.error('Erro ao carregar template:', error));
}

document.addEventListener("DOMContentLoaded", function() {
    // Carrega o header e, APÓS carregar, executa a lógica do main.js
    loadTemplate('_templates/_header.html', 'header-placeholder', () => {
        // Inicializa o script principal DEPOIS que o header estiver na página
        loadMainScript();
    });
    // Carrega o footer e, APÓS carregar, executa a lógica do main.js
    loadTemplate('_templates/_footer.html', 'footer-placeholder', () => {
        // Inicializa o script principal DEPOIS que o footer estiver na página
        loadMainScript();
    });
});

function loadMainScript() {
    // Evita carregar o main.js múltiplas vezes
    if (document.querySelector('script[src="assets/js/main.js"]')) return;

    const script = document.createElement('script');
    script.src = 'assets/js/main.js';
    document.body.appendChild(script);
}