// src/financeiroFilters.js

import { formatCurrency } from './page_financeiro.js';

// --- ESTADO INTERNO DO MÓDULO (Variáveis "Privadas") ---
let allProcessedData = [];
let choicesOrgao = null;
let choicesObra = null;
let choicesNumProcesso = null;
let choicesNf = null;
let isRefreshingFilters = false;

// --- FUNÇÕES INTERNAS (Não exportadas) ---

function createChoicesInstance(elementId, placeholderText = 'Selecione...') {
    // ... (esta função não precisa de alterações)
    const selectElement = document.getElementById(elementId);
    if (!selectElement) return null;

    const choicesConfig = {
        removeItemButton: true,
        placeholder: true,
        placeholderValue: placeholderText,
        searchResultLimit: 10,
        searchPlaceholderValue: 'Buscar...',
        itemSelectText: '',
    };
    
    const newInstance = new Choices(selectElement, choicesConfig);
    
    if (newInstance.containerOuter?.element) {
        newInstance.containerOuter.element.classList.add('filter-choices');
    }

    selectElement.addEventListener('change', () => {
        if (isRefreshingFilters) return;
        applyFilters(); 
        refreshDependentFilters(elementId);
    });

    return newInstance;
}

function refreshDependentFilters(changedElementId = null) {
    // ... (esta função já foi corrigida na etapa anterior e está correta)
    if (isRefreshingFilters || !allProcessedData || allProcessedData.length === 0) return;
    
    isRefreshingFilters = true;

    const selectedOrgaos = choicesOrgao ? choicesOrgao.getValue(true).map(v => v.toLowerCase()) : [];
    const selectedObras = choicesObra ? choicesObra.getValue(true).map(v => v.toLowerCase()) : [];
    const selectedNumProcessos = choicesNumProcesso ? choicesNumProcesso.getValue(true).map(v => v.toLowerCase()) : [];
    const selectedNfs = choicesNf ? choicesNf.getValue(true).map(v => v.toLowerCase()) : [];

    const getOptionsFor = (field, filterData) => 
        Array.from(new Set(filterData.map(i => i[field]).filter(Boolean)))
             .sort()
             .map(v => ({ value: v.toLowerCase(), label: v }));

    let orgaoFilterData = allProcessedData.filter(i => 
        (selectedObras.length === 0 || selectedObras.includes(i.obraFormatted.toLowerCase())) &&
        (selectedNumProcessos.length === 0 || selectedNumProcessos.includes(i.rawNumProcesso1.toLowerCase())) &&
        (selectedNfs.length === 0 || selectedNfs.includes(i.rawNf.toLowerCase()))
    );
    let obraFilterData = allProcessedData.filter(i => 
        (selectedOrgaos.length === 0 || selectedOrgaos.includes(i.rawOrgao.toLowerCase())) &&
        (selectedNumProcessos.length === 0 || selectedNumProcessos.includes(i.rawNumProcesso1.toLowerCase())) &&
        (selectedNfs.length === 0 || selectedNfs.includes(i.rawNf.toLowerCase()))
    );
    
    if (changedElementId !== 'filterOrgao' && choicesOrgao) {
        const opts = getOptionsFor('rawOrgao', orgaoFilterData);
        choicesOrgao.setChoices(opts, 'value', 'label', true);
        choicesOrgao.setValue(selectedOrgaos.filter(v => opts.some(opt => opt.value === v)));
    }
    if (changedElementId !== 'filterObra' && choicesObra) {
        const opts = getOptionsFor('obraFormatted', obraFilterData);
        choicesObra.setChoices(opts, 'value', 'label', true);
        choicesObra.setValue(selectedObras.filter(v => opts.some(opt => opt.value === v)));
    }
     if (changedElementId !== 'filterNf' && choicesNf) {
        const data = allProcessedData.filter(i => 
            (selectedOrgaos.length === 0 || selectedOrgaos.includes(i.rawOrgao.toLowerCase())) &&
            (selectedObras.length === 0 || selectedObras.includes(i.obraFormatted.toLowerCase())) &&
            (selectedNumProcessos.length === 0 || selectedNumProcessos.includes(i.rawNumProcesso1.toLowerCase()))
        );
        const opts = getOptionsFor('rawNf', data);
        choicesNf.setChoices(opts, 'value', 'label', true);
        choicesNf.setValue(selectedNfs.filter(v => opts.some(opt => opt.value === v)));
    }

    if (changedElementId !== 'filterNumProcesso1Select' && choicesNumProcesso) {
        const data = allProcessedData.filter(i => 
            (selectedOrgaos.length === 0 || selectedOrgaos.includes(i.rawOrgao.toLowerCase())) &&
            (selectedObras.length === 0 || selectedObras.includes(i.obraFormatted.toLowerCase())) &&
            (selectedNfs.length === 0 || selectedNfs.includes(i.rawNf.toLowerCase()))
        );
        const opts = getOptionsFor('rawNumProcesso1', data);
        choicesNumProcesso.setChoices(opts, 'value', 'label', true);
        choicesNumProcesso.setValue(selectedNumProcessos.filter(v => opts.some(opt => opt.value === v)));
    }

    isRefreshingFilters = false;
}

function populateFilterDropdowns(data) {
    // ... (esta função não precisa de alterações)
    if (!data || data.length === 0) return;

    choicesOrgao = createChoicesInstance('filterOrgao', 'Órgão(s)');
    choicesObra = createChoicesInstance('filterObra', 'Obra(s)');
    choicesNumProcesso = createChoicesInstance('filterNumProcesso1Select', 'Nº Processo(s)');
    choicesNf = createChoicesInstance('filterNf', 'NF(s)');

    const orgaoChoicesArray = Array.from(new Set(data.map(item => item.rawOrgao).filter(Boolean))).sort().map(val => ({ value: val.toLowerCase(), label: val }));
    const obraChoicesArray = Array.from(new Set(data.map(item => item.obraFormatted).filter(Boolean))).sort().map(val => ({ value: val.toLowerCase(), label: val }));
    const numProcessoChoicesArray = Array.from(new Set(data.map(item => item.rawNumProcesso1).filter(Boolean))).sort().map(val => ({ value: val.toLowerCase(), label: val }));
    const nfChoicesArray = Array.from(new Set(data.map(item => item.rawNf).filter(Boolean))).sort().map(val => ({ value: val.toLowerCase(), label: val }));

    isRefreshingFilters = true;
    if (choicesOrgao) { choicesOrgao.enable(); choicesOrgao.setChoices(orgaoChoicesArray, 'value', 'label', true); }
    if (choicesObra) { choicesObra.enable(); choicesObra.setChoices(obraChoicesArray, 'value', 'label', true); }
    if (choicesNumProcesso) { choicesNumProcesso.enable(); choicesNumProcesso.setChoices(numProcessoChoicesArray, 'value', 'label', true); }
    if (choicesNf) { choicesNf.enable(); choicesNf.setChoices(nfChoicesArray, 'value', 'label', true); }
    isRefreshingFilters = false;
}


// --- API PÚBLICA DO MÓDULO (Funções Exportadas) ---

export function initializeFilters(processedData) {
    // ... (esta função não precisa de alterações)
    allProcessedData = processedData || [];
    
    populateFilterDropdowns(allProcessedData);

    const standardFilterInputs = [
        document.getElementById('filterDataPagtInicio'),
        document.getElementById('filterDataPagtFim'),
        document.getElementById('filterLegenda'),
    ];
    standardFilterInputs.forEach(input => {
        if (input) {
            const eventType = (input.tagName === 'SELECT' || input.type === 'date') ? 'change' : 'input';
            input.addEventListener(eventType, applyFilters);
        }
    });

    applyFilters();
}

/**
 * Filtra os dados com base nos valores atuais dos inputs e atualiza a tabela e os KPIs.
 */
export function applyFilters() { // ✅ ESTA É A FUNÇÃO QUE FOI TOTALMENTE CORRIGIDA
    const tableBody = document.getElementById('financeiroTableBody');
    const kpiRecebimentoLiquidoEl = document.getElementById('kpiRecebimentoLiquido');
    const kpiAguardandoPagamentoEl = document.getElementById('kpiAguardandoPagamento');
    const kpiAguardandoLiberacaoEl = document.getElementById('kpiAguardandoLiberacao');
    const totalExecutadoCell = document.getElementById('financeiroTotalExecutado');
    const progressBar = document.getElementById('financeiroProgressBar');
    
    if (!tableBody) return;

    // Obtém os valores de todos os filtros
    const filterDataPagtInicio = document.getElementById('filterDataPagtInicio')?.value || '';
    const filterDataPagtFim = document.getElementById('filterDataPagtFim')?.value || '';
    const filterLegenda = document.getElementById('filterLegenda')?.value || '';
    const selectedOrgaos = choicesOrgao ? choicesOrgao.getValue(true).map(v => v.toLowerCase()) : [];
    const selectedObras = choicesObra ? choicesObra.getValue(true).map(v => v.toLowerCase()) : [];
    const selectedNumProcessos = choicesNumProcesso ? choicesNumProcesso.getValue(true).map(v => v.toLowerCase()) : [];
    const selectedNfs = choicesNf ? choicesNf.getValue(true).map(v => v.toLowerCase()) : [];

    // Filtra o array de dados principal
    const filteredRows = allProcessedData.filter(item => {
        // Filtro por Data de Pagamento
        if (filterDataPagtInicio || filterDataPagtFim) {
            if (!item.rawDatePagt) return false; // Se não tem data, não passa no filtro
            
            const parts = item.rawDatePagt.split('/');
            if (parts.length !== 3) return false; // Data inválida
            
            // Converte a data do formato DD/MM/AAAA para AAAA-MM-DD para comparação
            const cellDateYyyyMmDd = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            
            if (filterDataPagtInicio && cellDateYyyyMmDd < filterDataPagtInicio) return false;
            if (filterDataPagtFim && cellDateYyyyMmDd > filterDataPagtFim) return false;
        }

        // Filtro por Legenda
        if (filterLegenda && item.rawLegenda !== filterLegenda) return false;

        // Filtro por Órgão
        if (selectedOrgaos.length > 0 && !selectedOrgaos.includes(item.rawOrgao.toLowerCase())) return false;

        // ✅ LÓGICA DE FILTRO ADICIONADA
        // Filtro por Obra
        if (selectedObras.length > 0 && !selectedObras.includes(item.obraFormatted.toLowerCase())) return false;
        
        // ✅ LÓGICA DE FILTRO ADICIONADA
        // Filtro por NF
        if (selectedNfs.length > 0 && !selectedNfs.includes(item.rawNf.toLowerCase())) return false;

        // ✅ LÓGICA DE FILTRO ADICIONADA
        // Filtro por Nº do Processo
        if (selectedNumProcessos.length > 0 && !selectedNumProcessos.includes(item.rawNumProcesso1.toLowerCase())) return false;

        // Se passou por todos os filtros, retorna true
        return true;
    });

    // Limpa e redesenha a tabela com os dados filtrados
    tableBody.innerHTML = '';
    if (filteredRows.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="11" class="text-center p-3">Nenhum dado encontrado para os filtros selecionados.</td></tr>';
    } else {
        filteredRows.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="text-center">${item.orgaoFormatted}</td> <td>${item.obraFormatted}</td>
                <td>${item.medicaoFormatted}</td> <td>${item.periodoFormatted}</td>
                <td class="text-right">${item.executadoFormatted}</td>
                <td class="nf-cell-content">${item.nfFormatted}</td>
                <td>${item.dataProtocoloFormatted}</td> <td>${item.numProcessoFormatted}</td>
                <td class="status-text ${item.statusClass}">${item.statusFormatted}</td>
                <td>${item.dataPagtFormatted}</td> <td class="text-right">${item.valorPagtFormatted}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Recalcula e atualiza os KPIs
    let novoTotalExecutado = 0, novoRecebimentoLiquido = 0, novoAguardandoPagamento = 0;
    // Removido o `novoAguardandoLiberacao` pois a opção foi removida do filtro
    filteredRows.forEach(item => {
        novoTotalExecutado += item.rawExecutadoValor || 0;
        if (item.rawLegenda === '1') novoRecebimentoLiquido += item.rawValorPagoReal || 0;
        else if (item.rawLegenda === '2') novoAguardandoPagamento += item.rawExecutadoValor || 0;
    });
    
    // Atualiza KPIs (o `kpiAguardandoLiberacaoEl` ainda existe no HTML, mas não será atualizado aqui)
    if (kpiRecebimentoLiquidoEl) kpiRecebimentoLiquidoEl.textContent = formatCurrency(novoRecebimentoLiquido);
    if (kpiAguardandoPagamentoEl) kpiAguardandoPagamentoEl.textContent = formatCurrency(novoAguardandoPagamento);
    if (totalExecutadoCell) totalExecutadoCell.innerHTML = `<strong>${formatCurrency(novoTotalExecutado)}</strong>`;
    if (progressBar) progressBar.style.width = (novoTotalExecutado > 0) ? `${Math.min((novoRecebimentoLiquido / novoTotalExecutado) * 100, 100).toFixed(2)}%` : '0%';
}

export function clearFilters() {
    // ... (esta função não precisa de alterações)
    isRefreshingFilters = true;
    
    if (choicesOrgao) choicesOrgao.removeActiveItems();
    if (choicesObra) choicesObra.removeActiveItems();
    if (choicesNumProcesso) choicesNumProcesso.removeActiveItems();
    if (choicesNf) choicesNf.removeActiveItems();
    
    document.getElementById('filterDataPagtInicio').value = '';
    document.getElementById('filterDataPagtFim').value = '';
    document.getElementById('filterLegenda').value = '';

    isRefreshingFilters = false;

    applyFilters();
    refreshDependentFilters(); 
}

export function destroyFilters() {
    // ... (esta função não precisa de alterações)
    if (choicesOrgao) { choicesOrgao.destroy(); choicesOrgao = null; }
    if (choicesObra) { choicesObra.destroy(); choicesObra = null; }
    if (choicesNumProcesso) { choicesNumProcesso.destroy(); choicesNumProcesso = null; }
    if (choicesNf) { choicesNf.destroy(); choicesNf = null; }
    allProcessedData = [];
}