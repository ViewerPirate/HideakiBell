// Arquivo: static/js/client/render/otherModals.js

/**
 * Renderiza a galeria de portfólio dentro do modal, aplicando os filtros selecionados.
 * @param {Array} artists - A lista de artistas para popular o filtro.
 */
function renderPortfolio(artists = []) {
    if (!DOM.portfolioGallery) return;

    const artistFilter = document.getElementById('portfolioArtistFilter');
    
    // Popula o filtro de artistas apenas uma vez
    if (artistFilter && artistFilter.options.length <= 1 && artists.length > 0) {
        artists.forEach(artist => {
            const option = document.createElement('option');
            option.value = artist.id;
            option.textContent = artist.username;
            artistFilter.appendChild(option);
        });
    }
    
    DOM.portfolioGallery.innerHTML = '';
    
    const selectedArtistId = artistFilter.value;
    const selectedType = DOM.portfolioFilter.value;

    // Filtra o portfólio com base nos dois filtros
    let filteredPortfolio = state.portfolio;

    if (selectedArtistId !== 'all') {
        filteredPortfolio = filteredPortfolio.filter(item => item.artist_id == selectedArtistId);
    }

    if (selectedType !== 'all') {
        filteredPortfolio = filteredPortfolio.filter(item => item.type === selectedType);
    }


    if (filteredPortfolio.length === 0) {
        DOM.portfolioGallery.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; padding: 2rem;">Nenhum item encontrado para esta combinação de filtros.</p>`;
    } else {
        filteredPortfolio.forEach(item => {
            const artCard = document.createElement('div');
            artCard.className = 'art-card'; 
            
            artCard.dataset.imgSrc = item.image;
            artCard.dataset.title = item.title;
            artCard.dataset.description = item.description || '';

            artCard.innerHTML = `
                <img src="${item.image}" alt="${item.title}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='https://placehold.co/220x180/ff0000/ffffff?text=Erro!';">
                <div class="art-card-info">
                    <h3>${item.title}</h3>
                    ${item.description ? `<p>${item.description}</p>` : ''}
                </div>
            `;
            DOM.portfolioGallery.appendChild(artCard);
        });
    }
}


/**
 * Preenche o conteúdo do modal de preços com os dados da API.
 * @param {object} pricingData - Os dados de preços (tipos de comissão, extras, política).
 */
function renderPricingModal(pricingData) {
    const tableBody = document.querySelector('#pricingModal .pricing-table tbody');
    const extrasList = document.querySelector('#pricingModal .extras-list');
    const policyBox = document.querySelector('#pricingModal .policy-box p');

    if (tableBody) {
        tableBody.innerHTML = '';
        if (pricingData.commission_types && pricingData.commission_types.length > 0) {
            pricingData.commission_types.forEach(type => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="item-name">${type.name}</td>
                    <td>${type.description}</td>
                    <td class="price">R$ ${type.price.toFixed(2).replace('.', ',')}</td> 
                    <td class="deadline">${type.deadline || '-'} dias</td>
                `;
                tableBody.appendChild(row);
            });
        }
    }

    if (extrasList) {
        extrasList.innerHTML = '';
        if (pricingData.commission_extras && pricingData.commission_extras.length > 0) {
            pricingData.commission_extras.forEach(extra => {
                const item = document.createElement('li');
                item.innerHTML = `
                    <span>${extra.name}</span>
                    <span>+ R$ ${extra.price.toFixed(2).replace('.', ',')}</span>
                `;
                extrasList.appendChild(item); 
            });
        }
    }

    if (policyBox) {
        policyBox.textContent = pricingData.refund_policy;
    }
}