// Arquivo: static/js/viewer.js
// Lógica para o Visualizador de Mídia Avançado e Global

function initializeAdvancedViewer() {
    // Seletores de imagens que devem ativar o visualizador
    const IMAGE_SELECTORS = '.art-card, .preview-thumbnail, .preview-thumbnail-admin, .preview-card img';

    const viewer = document.getElementById('widget-adv-viewer');
    // Se o elemento do visualizador não existir no HTML, interrompe a execução
    if (!viewer) {
        return;
    }

    // --- Elementos do DOM ---
    const imageContainer = viewer.querySelector('.viewer-image-container');
    const imageEl = document.getElementById('viewer-image');
    const closeBtn = document.getElementById('viewer-close');
    const nextBtn = document.getElementById('viewer-next');
    const prevBtn = document.getElementById('viewer-prev');
    const titleEl = document.getElementById('viewer-title');
    const descriptionEl = document.getElementById('viewer-description');
    const creditsEl = document.getElementById('viewer-credits');
    const zoomInBtn = document.getElementById('viewer-zoom-in');
    const zoomOutBtn = document.getElementById('viewer-zoom-out');
    const zoomLevelEl = document.getElementById('viewer-zoom-level');
    const fullscreenBtn = document.getElementById('viewer-fullscreen');
    const resetBtn = document.getElementById('viewer-reset');

    // --- Estado do Visualizador ---
    let state = {
        gallery: [],
        currentIndex: 0,
        scale: 1,
        posX: 0,
        posY: 0,
        isDragging: false,
        dragStart: { x: 0, y: 0 },
        isPinching: false,
        initialPinchDistance: 0
    };

    // --- Funções de Lógica ---

    const updateImageTransform = () => {
        imageEl.style.transform = `translate(${state.posX}px, ${state.posY}px) scale(${state.scale})`;
    };

    const resetZoomAndPan = () => {
        state.scale = 1;
        state.posX = 0;
        state.posY = 0;
        zoomLevelEl.textContent = '100%';
        updateImageTransform();
    };

    const showImage = (index) => {
        if (index < 0 || index >= state.gallery.length) return;
        
        resetZoomAndPan();
        state.currentIndex = index;
        const item = state.gallery[index];

        imageEl.src = item.src;
        titleEl.textContent = item.title;
        descriptionEl.textContent = item.description;
        
        // Constrói a legenda de créditos
        let creditsHTML = '';
        const lineartArtist = item.lineartArtist;
        const colorArtist = item.colorArtist;

        if (lineartArtist && lineartArtist === colorArtist) {
            creditsHTML = `<p>Arte e Cores por: <strong>${lineartArtist}</strong></p>`;
        } else {
            if (lineartArtist) {
                creditsHTML += `<p>Arte por: <strong>${lineartArtist}</strong></p>`;
            }
            if (colorArtist) {
                creditsHTML += `<p>Cores por: <strong>${colorArtist}</strong></p>`;
            }
        }
        creditsEl.innerHTML = creditsHTML;
        
        prevBtn.style.display = state.gallery.length > 1 ? 'flex' : 'none';
        nextBtn.style.display = state.gallery.length > 1 ? 'flex' : 'none';
    };

    const openViewer = (clickedElement) => {
        const allPotentialImages = Array.from(document.querySelectorAll(IMAGE_SELECTORS));
        state.gallery = allPotentialImages.map(el => {
            let item = { 
                src: null, 
                title: 'Arte', 
                description: '',
                lineartArtist: el.dataset.lineartArtist || null,
                colorArtist: el.dataset.colorArtist || null
            };
            // Adapta a busca de dados para diferentes tipos de cards
            if (el.matches('.preview-card img')) {
                const card = el.closest('.preview-card');
                item.src = el.src;
                item.title = card.querySelector('.chat-bubble-meta')?.textContent || 'Prévia';
                item.description = card.querySelector('p')?.textContent || '';
            } else {
                item.src = el.dataset.imgSrc || el.dataset.fullSrc || el.querySelector('img')?.src;
                item.title = el.dataset.title || 'Arte';
                item.description = el.dataset.description || '';
            }
            return item;
        }).filter(item => item.src); // Garante que apenas itens com 'src' válido entrem na galeria

        const clickedSrc = clickedElement.src || clickedElement.dataset.imgSrc || clickedElement.dataset.fullSrc || clickedElement.querySelector('img')?.src;
        state.currentIndex = state.gallery.findIndex(item => item.src === clickedSrc);

        if (state.currentIndex === -1) return;

        showImage(state.currentIndex);
        viewer.classList.add('visible');
        document.body.style.overflow = 'hidden';
    };

    const closeViewer = () => {
        viewer.classList.remove('visible');
        if (document.fullscreenElement) document.exitFullscreen();
        document.body.style.overflow = '';
    };

    const nextImage = () => showImage((state.currentIndex + 1) % state.gallery.length);
    const prevImage = () => showImage((state.currentIndex - 1 + state.gallery.length) % state.gallery.length);

    const zoom = (delta) => {
        const newScale = Math.max(0.5, Math.min(5, state.scale + delta));
        state.scale = newScale;
        zoomLevelEl.textContent = `${Math.round(state.scale * 100)}%`;
        updateImageTransform();
    };

    const getPinchDistance = (touches) => {
        return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    };

    // --- Event Listeners ---
    
    // Listener principal que ativa o viewer
    document.body.addEventListener('click', (e) => {
        if (e.target.closest('.social-icons a')) {
            return;
        }

        const clickedImage = e.target.closest(IMAGE_SELECTORS);
        if (clickedImage) {
            if (clickedImage.classList.contains('nsfw-blur') && !clickedImage.classList.contains('revealed')) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            openViewer(clickedImage);
        }
    });

    // Listeners dos controles do viewer
    closeBtn.addEventListener('click', closeViewer);
    nextBtn.addEventListener('click', nextImage);
    prevBtn.addEventListener('click', prevImage);
    zoomInBtn.addEventListener('click', () => zoom(0.2));
    zoomOutBtn.addEventListener('click', () => zoom(-0.2));
    resetBtn.addEventListener('click', resetZoomAndPan);
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            viewer.requestFullscreen().catch(console.error);
        } else {
            document.exitFullscreen();
        }
    });

    // Zoom com o scroll do mouse
    imageContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        zoom(e.deltaY > 0 ? -0.1 : 0.1);
    }, { passive: false });

    // Lógica para arrastar (pan) com MOUSE
    imageContainer.addEventListener('mousedown', (e) => {
        if (state.scale > 1) {
            e.preventDefault();
            state.isDragging = true;
            state.dragStart.x = e.clientX - state.posX;
            state.dragStart.y = e.clientY - state.posY;
            imageContainer.classList.add('grabbing');
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (state.isDragging) {
            e.preventDefault();
            const newPosX = e.clientX - state.dragStart.x;
            const newPosY = e.clientY - state.dragStart.y;
            state.posX = newPosX;
            state.posY = newPosY;
            updateImageTransform();
        }
    });

    window.addEventListener('mouseup', () => {
        state.isDragging = false;
        imageContainer.classList.remove('grabbing');
    });
    
    // Lógica para arrastar e zoom com TOQUE
    imageContainer.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1 && state.scale > 1) {
            state.isDragging = true;
            state.dragStart.x = e.touches[0].clientX - state.posX;
            state.dragStart.y = e.touches[0].clientY - state.posY;
            imageContainer.classList.add('grabbing');
        } else if (e.touches.length === 2) {
            state.isPinching = true;
            state.isDragging = false; // Impede o arraste durante a pinça
            state.initialPinchDistance = getPinchDistance(e.touches);
        }
    }, { passive: false });
    
    window.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (state.isPinching && e.touches.length === 2) {
            const newPinchDistance = getPinchDistance(e.touches);
            const zoomFactor = newPinchDistance / state.initialPinchDistance;
            const newScale = Math.max(0.5, Math.min(5, state.scale * zoomFactor));
            state.scale = newScale;
            zoomLevelEl.textContent = `${Math.round(state.scale * 100)}%`;
            updateImageTransform();
            state.initialPinchDistance = newPinchDistance; // Atualiza para o próximo movimento
        } else if (state.isDragging && e.touches.length === 1) {
            const newPosX = e.touches[0].clientX - state.dragStart.x;
            const newPosY = e.touches[0].clientY - state.dragStart.y;
            state.posX = newPosX;
            state.posY = newPosY;
            updateImageTransform();
        }
    }, { passive: false });
    
    window.addEventListener('touchend', (e) => {
        state.isDragging = false;
        state.isPinching = false;
        imageContainer.classList.remove('grabbing');
    });

    // Atalhos de teclado
    document.addEventListener('keydown', (e) => {
        if (!viewer.classList.contains('visible')) return;
        if (e.key === 'Escape') closeViewer();
        if (e.key === 'ArrowRight') nextImage();
        if (e.key === 'ArrowLeft') prevImage();
    });
}

// Inicia o script quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initializeAdvancedViewer);