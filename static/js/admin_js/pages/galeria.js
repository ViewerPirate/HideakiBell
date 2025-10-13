// static/js/admin_js/pages/galeria.js

document.addEventListener('DOMContentLoaded', () => {
    const addArtForm = document.getElementById('add-art-form');
    const galleryPreviewGrid = document.getElementById('gallery-preview-grid');

    // Função para carregar e preencher os dropdowns de artistas
    async function loadAndPopulateArtists() {
        const lineartSelect = document.getElementById('art-lineart-artist');
        const colorSelect = document.getElementById('art-color-artist');

        try {
            const response = await fetch('/admin/api/artists');
            if (!response.ok) throw new Error('Falha ao buscar lista de artistas');
            const artists = await response.json();

            // Limpa as opções placeholder
            lineartSelect.innerHTML = '<option value="">Selecione um artista...</option>';
            // Adiciona as opções padrão e a nova opção "O mesmo"
            colorSelect.innerHTML = `
                <option value="">Nenhum (opcional)</option>
                <option value="same">O mesmo da Arte/Linhas</option>
            `;

            // Popula os dropdowns com os artistas
            artists.forEach(artist => {
                const option = document.createElement('option');
                option.value = artist.id;
                option.textContent = artist.username;
                lineartSelect.appendChild(option.cloneNode(true));
                colorSelect.appendChild(option.cloneNode(true));
            });

        } catch (error) {
            console.error("Erro ao carregar artistas:", error);
            lineartSelect.innerHTML = '<option value="">Erro ao carregar</option>';
            colorSelect.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }


    // Função para buscar e renderizar as artes existentes
    async function loadGallery() {
        galleryPreviewGrid.innerHTML = '<div class="loading-overlay" style="display: flex; position: relative; background: none; grid-column: 1 / -1;"><div class="spinner"></div></div>';
        try {
            const response = await fetch('/admin/api/gallery');
            if (!response.ok) throw new Error('Falha ao carregar a galeria');
            
            const arts = await response.json();
            renderGallery(arts);

        } catch (error) {
            console.error("Erro ao carregar galeria:", error);
            galleryPreviewGrid.innerHTML = '<p>Não foi possível carregar as artes.</p>';
        }
    }

    // Função para desenhar as artes na grelha
    function renderGallery(arts) {
        galleryPreviewGrid.innerHTML = '';
        if (arts.length === 0) {
            galleryPreviewGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--cor-texto-secundario);">Nenhuma arte na galeria ainda. Adicione uma no formulário ao lado.</p>';
            return;
        }

        arts.forEach(art => {
            const artCard = document.createElement('div');
            artCard.className = 'gallery-item-card';
            
            const nsfwIndicatorHTML = art.is_nsfw 
                ? '<span class="nsfw-indicator" title="Conteúdo NSFW"><i class="fas fa-exclamation-triangle"></i></span>' 
                : '';

            artCard.innerHTML = `
                <img src="${art.image_url}" alt="${art.title}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='https://placehold.co/200x200/ff0000/ffffff?text=Erro!';">
                <div class="gallery-item-info">
                    <div class="gallery-item-title">
                        <span>${art.title}</span>
                        ${nsfwIndicatorHTML}
                    </div>
                </div>
                <button class="delete-art-btn" data-id="${art.id}" title="Excluir Arte"><i class="fas fa-trash-alt"></i></button>
            `;
            galleryPreviewGrid.appendChild(artCard);
        });
        // Adiciona listeners para os botões de apagar
        document.querySelectorAll('.delete-art-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const artId = e.currentTarget.dataset.id;
                if (confirm('Tem certeza que deseja excluir esta arte da galeria?')) {
                    await deleteArt(artId);
                }
            });
        });
    }

    // Função para adicionar uma nova arte
    addArtForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const lineart_artist_id = document.getElementById('art-lineart-artist').value;
        let color_artist_id = document.getElementById('art-color-artist').value;

        // Se a opção "O mesmo" for selecionada, copia o ID do primeiro artista
        if (color_artist_id === 'same') {
            color_artist_id = lineart_artist_id;
        }

        const newArt = {
            title: document.getElementById('art-title').value,
            image_url: document.getElementById('art-image-url').value,
            description: document.getElementById('art-description').value,
            lineart_artist_id: lineart_artist_id,
            color_artist_id: color_artist_id,
            is_nsfw: document.getElementById('art-is-nsfw').checked
        };

        try {
            const response = await fetch('/admin/api/gallery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newArt)
            });

            if (!response.ok) throw new Error('Falha ao adicionar arte');
            
            const result = await response.json();
            if (result.success) {
                showNotification('Arte adicionada com sucesso!', 'success');
                addArtForm.reset();
                loadGallery(); // Recarrega a galeria
            } else {
                showNotification(result.message || 'Ocorreu um erro.', 'error');
            }
        } catch (error) {
            console.error("Erro ao adicionar arte:", error);
            showNotification('Erro de conexão ao adicionar arte.', 'error');
        }
    });

    // Função para apagar uma arte
    async function deleteArt(artId) {
        try {
            const response = await fetch(`/admin/api/gallery/${artId}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('Falha ao excluir arte');

            const result = await response.json();
            if (result.success) {
                showNotification('Arte excluída com sucesso!', 'success');
                loadGallery(); // Recarrega a galeria
            } else {
                showNotification(result.message || 'Ocorreu um erro.', 'error');
            }
        } catch (error) {
            console.error("Erro ao excluir arte:", error);
            showNotification('Erro de conexão ao excluir arte.', 'error');
        }
    }

    // Carregamento inicial
    loadAndPopulateArtists();
    loadGallery();
});