// Arquivo: static/js/client/render/formHelpers.js

/**
 * Renderiza a pré-visualização dos arquivos selecionados para upload.
 */
function renderFilePreview() {
    DOM.filePreview.innerHTML = '';
    const uploadLabel = DOM.fileUploadArea.querySelector('.file-upload-label');
    if (state.selectedFiles.length === 0) {
        uploadLabel.innerHTML = `
            <i class="fas fa-cloud-upload-alt"></i>
            Arraste imagens ou clique para selecionar
            <div class="file-info">Formatos aceitos: JPG, PNG, PDF (até 10MB cada)</div>
        `;
        return;
    }
    
    uploadLabel.innerHTML = `
        <i class="fas fa-check-circle" style="color: var(--success);"></i>
        ${state.selectedFiles.length} arquivo(s) selecionado(s)
    `;
    state.selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-preview-item';
        
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                fileItem.style.backgroundImage = `url(${e.target.result})`;
            }; 
            reader.readAsDataURL(file);
        } else {
            fileItem.innerHTML = `<i class="fas fa-file-alt" style="font-size: 2em;"></i><span>${file.name}</span>`;
        }
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-file';
        removeBtn.innerHTML = '&times;';
        removeBtn.dataset.index = index; 
        fileItem.appendChild(removeBtn);

        DOM.filePreview.appendChild(fileItem);
    });
}

/**
 * Gera e exibe o resumo do pedido na aba de revisão.
 */
function generateOrderSummary() {
    const title = DOM.orderTitle.value.trim();
    const type = DOM.orderType.value; 
    const description = DOM.orderDescription.value.trim();
    const price = DOM.totalPrice.textContent;
    
    const deadlineValue = document.getElementById('orderDeadline').value;
    const deadline = deadlineValue ? formatDate(deadlineValue) : 'A definir pelo artista';
    const extrasSelect = document.getElementById('extrasSelect'); 
    let extra = null;
    if (extrasSelect && extrasSelect.value !== "0.00" && extrasSelect.selectedIndex > 0) {
        extra = extrasSelect.options[extrasSelect.selectedIndex].dataset.text;
    }

    DOM.orderSummary.innerHTML = `
        <h4 style="margin-bottom: 1rem;">${title || "Título do Pedido"}</h4> 
        <p style="white-space: pre-wrap;">${description || "Descrição não informada."}</p> 
        <hr style="margin: 1rem 0; border-color: var(--cor-borda);">
        <p><strong>Tipo de Arte:</strong> ${type}</p>
        <p><strong>Prazo Estimado:</strong> ${deadline}</p>
        ${extra ? `<p><strong>Extra:</strong> ${extra}</p>` : ''} 
        <p><strong>Arquivos:</strong> ${state.selectedFiles.length} anexado(s)</p>
        <hr style="margin: 1rem 0; border-color: var(--cor-borda);">
        <p style="font-size: 1.2em; font-weight: 700;"><strong>Total Estimado: ${price}</strong></p>
    `;
}

/**
 * Atualiza a interface das abas do formulário de novo pedido (botões e barra de progresso).
 */
function updateTabs() {
    const tabOrder = ['details', 'artist', 'references', 'options', 'review'];
    const currentTabIndex = tabOrder.indexOf(state.currentTab);

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    document.querySelector(`.tab-btn[data-tab="${state.currentTab}"]`)?.classList.add('active');
    document.getElementById(`${state.currentTab}-tab`)?.classList.add('active');

    DOM.prevTabBtn.style.display = currentTabIndex > 0 ? 'inline-flex' : 'none';
    DOM.nextTabBtn.style.display = currentTabIndex < tabOrder.length - 1 ? 'inline-flex' : 'none'; 
    DOM.submitOrderBtn.style.display = currentTabIndex === tabOrder.length - 1 ? 'inline-flex' : 'none'; 

    const progressLine = document.getElementById('form-progress-line');
    const steps = document.querySelectorAll('.progress-tracker .progress-step');
    const progressPercentage = (currentTabIndex / (steps.length - 1)) * 100;
    progressLine.style.width = `${progressPercentage}%`;
    steps.forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index < currentTabIndex) {
            step.classList.add('completed');
        } else if (index === currentTabIndex) {
            step.classList.add('active');
        }
    });
}