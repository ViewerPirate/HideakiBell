// Arquivo: static/js/admin_js/cms_core.js

class ModularCMS {
    constructor() {
        this.plugins = {}; // Armazena a instância dos plugins carregados
        this.api = this.getAPI(); // Cria a API que será passada para os plugins
        console.log("Sistema Modular CMS inicializado.");
    }

    /**
     * Ponto de entrada principal. Lê os plugins injetados e ativa cada um.
     */
    async init() {
        // window.INJECTED_PLUGINS é a variável que criamos no admin_layout.html
        const injectedPlugins = window.INJECTED_PLUGINS || [];
        console.log(`Encontrados ${injectedPlugins.length} plugins ativos para carregar.`);

        for (const pluginData of injectedPlugins) {
            try {
                await this.loadAndActivatePlugin(pluginData);
            } catch (error) {
                console.error(`Falha ao carregar o plugin '${pluginData.id}':`, error);
                // Usamos a API do próprio CMS para notificar sobre a falha
                this.api.ui.showNotification(`Erro ao carregar plugin: ${pluginData.id}`, 'error');
            }
        }
    }

    /**
     * Carrega o código de um plugin como um módulo dinâmico e chama sua função de ativação.
     * @param {object} pluginData - O objeto do plugin contendo {id, code}.
     */
    async loadAndActivatePlugin(pluginData) {
        // Cria um Módulo ES a partir do texto do código usando um Blob
        const blob = new Blob([pluginData.code], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const module = await import(url);
        URL.revokeObjectURL(url); // Libera a memória

        if (!module.activate || typeof module.activate !== 'function') {
            throw new Error("O plugin não exporta uma função 'activate'.");
        }

        // Armazena os metadados e as funções do módulo
        this.plugins[pluginData.id] = {
            id: module.id,
            name: module.name,
            ...module, // Inclui activate, deactivate, etc.
        };

        // Executa a função de ativação do plugin, passando a API controlada
        await module.activate(this.api);
        console.log(`Plugin '${this.plugins[pluginData.id].name}' ativado com sucesso.`);
    }

    /**
     * Define e retorna a API controlada que os plugins podem usar.
     * Isso garante que os plugins não tenham acesso irrestrito ao sistema.
     * @returns {object} A API do CMS.
     */
    getAPI() {
        return {
            ui: {
                showNotification: (message, type = 'info') => showNotification(message, type),
                
                addNavMenuItem: (id, name, iconHTML, onClick) => {
                    const menu = document.getElementById('plugin-nav-items');
                    if (!menu) return;
                    
                    const link = document.createElement('a');
                    link.id = `nav-plugin-${id}`;
                    link.className = 'nav-link'; // Usa a classe CSS existente do sidebar
                    link.href = '#';
                    link.innerHTML = `<span class="icon">${iconHTML}</span> <span>${name}</span>`;
                    link.onclick = (e) => {
                        e.preventDefault();
                        // Desativa outros links de menu
                        document.querySelectorAll('.sidebar-menu a.active').forEach(a => a.classList.remove('active'));
                        // Ativa este link
                        link.classList.add('active');
                        onClick();
                    };
                    menu.appendChild(link);
                },

                removeNavMenuItem: (id) => {
                    const link = document.getElementById(`nav-plugin-${id}`);
                    if (link) link.remove();
                },

                createView: (id, htmlContent) => {
                    const container = document.getElementById('plugin-view-container');
                    if (!container) return;

                    const view = document.createElement('div');
                    view.id = `view-plugin-${id}`;
                    // Adicionamos 'view-panel' para que a função showView possa gerenciá-lo
                    view.className = 'view-panel plugin-view hidden';
                    view.innerHTML = htmlContent;
                    container.appendChild(view);
                },

                removeView: (id) => {
                    const view = document.getElementById(`view-plugin-${id}`);
                    if (view) view.remove();
                }
            },
            core: {
                showView: (viewId) => {
                    // Esconde todas as views principais e de plugins
                    document.querySelectorAll('.main-content > div, .plugin-view').forEach(v => v.style.display = 'none');
                    
                    // Mostra a view solicitada (seja ela nativa ou de plugin)
                    const targetView = document.getElementById(`view-plugin-${viewId}`) || document.getElementById(viewId);
                    if(targetView) {
                        targetView.style.display = 'block';
                    }
                }
            },
            // Futuramente, podemos adicionar APIs de dados aqui, ex:
            // data: { getComissoes: () => fetchComissoes() }
        };
    }
}