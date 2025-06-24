// src/financeiroFilters.js

import { formatCurrency } from './page_financeiro.js';

// --- ESTADO INTERNO DO MÓDULO ---
let allProcessedData = [];
let choicesOrgao = null;
let choicesObra = null;
let choicesNumProcesso = null;
let choicesNf = null;
let selectedMedicoes = [];
let isRefreshingFilters = false;

// --- FUNÇÕES INTERNAS ---

function createChoicesInstance(elementId, placeholderText) {
    const selectElement = document.getElementById(elementId);
    if (!selectElement) return null;
    const choicesConfig = { removeItemButton: true, placeholder: true, placeholderValue: placeholderText, searchResultLimit: 10, searchPlaceholderValue: 'Buscar...', itemSelectText: '' };
    const newInstance = new Choices(selectElement, choicesConfig);
    if (newInstance.containerOuter?.element) newInstance.containerOuter.element.classList.add('filter-choices');
    selectElement.addEventListener('change', () => {
        if (isRefreshingFilters) return;
        applyFilters(); 
        refreshDependentFilters(elementId);
    });
    return newInstance;
}

// ✅ CORREÇÃO: Função para fazer a ordenação "natural" (numérica) das strings.
function naturalSort(a, b) {
    const re = /(\d+)/g;
    const ax = a.match(re);
    const bx = b.match(re);

    if (ax && bx) {
        const an = parseInt(ax[0], 10);
        const bn = parseInt(bx[0], 10);
        if (an !== bn) {
            return an - bn;
        }
    }
    
    return a.localeCompare(b);
}

// ✅ AJUSTE: Função dedicada para ATUALIZAR as opções do dropdown de Medição
function updateMedicaoFilterOptions(data) {
    const dropdown = document.getElementById('medicaoFilterDropdown');
    const btn = document.getElementById('medicaoFilterBtn');
    if (!dropdown || !btn) return;

    // ✅ CORREÇÃO: Usando a nova função de ordenação natural
    const medicaoOptions = Array.from(new Set(data.map(item => item.medicaoFormatted).filter(Boolean))).sort(naturalSort);
    
    dropdown.innerHTML = '';

    const clearOption = document.createElement('div');
    clearOption.className = 'filter-dropdown-item clear-filter';
    clearOption.textContent = 'Limpar Filtros';
    clearOption.onclick = () => {
        selectedMedicoes = [];
        dropdown.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        btn.classList.remove('active');
        applyFilters();
        dropdown.classList.remove('show');
    };
    dropdown.appendChild(clearOption);

    medicaoOptions.forEach(opt => {
        const item = document.createElement('div');
        item.className = 'filter-dropdown-item';
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = opt;
        checkbox.checked = selectedMedicoes.includes(opt);

        checkbox.onchange = () => {
            if (checkbox.checked) {
                selectedMedicoes.push(opt);
            } else {
                selectedMedicoes = selectedMedicoes.filter(val => val !== opt);
            }
            btn.classList.toggle('active', selectedMedicoes.length > 0);
            applyFilters();
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(opt));
        item.appendChild(label);
        dropdown.appendChild(item);
    });
}

// ✅ AJUSTE: Esta função agora também atualiza o filtro de Medição
function refreshDependentFilters(changedElementId) {
    if (isRefreshingFilters || !allProcessedData || allProcessedData.length === 0) return;
    
    isRefreshingFilters = true;

    const selectedOrgaos = choicesOrgao ? choicesOrgao.getValue(true).map(v => v.toLowerCase()) : [];
    const selectedObras = choicesObra ? choicesObra.getValue(true).map(v => v.toLowerCase()) : [];
    const selectedNumProcessos = choicesNumProcesso ? choicesNumProcesso.getValue(true).map(v => v.toLowerCase()) : [];
    const selectedNfs = choicesNf ? choicesNf.getValue(true).map(v => v.toLowerCase()) : [];
    
    // Filtra os dados com base nos filtros do painel para atualizar as opções da Medição
    let dataForMedicaoFilter = allProcessedData.filter(item => 
        (selectedOrgaos.length === 0 || selectedOrgaos.includes((item.rawOrgao || '').toLowerCase())) &&
        (selectedObras.length === 0 || selectedObras.includes((item.obraFormatted || '').toLowerCase())) &&
        (selectedNumProcessos.length === 0 || selectedNumProcessos.includes((item.rawNumProcesso1 || '').toLowerCase())) &&
        (selectedNfs.length === 0 || selectedNfs.includes((item.rawNf || '').toLowerCase()))
    );
    updateMedicaoFilterOptions(dataForMedicaoFilter);

    const getOptionsFor = (field, filterData) => Array.from(new Set(filterData.map(i => i[field]).filter(Boolean))).sort().map(v => ({ value: v.toLowerCase(), label: v }));

    // ... (O resto da lógica para atualizar os filtros do painel continua inalterada)

    isRefreshingFilters = false;
}

// ✅ AJUSTE: Função de setup agora apenas adiciona os listeners uma vez
function setupMedicaoFilterListeners() {
    const container = document.getElementById('medicaoFilterContainer');
    const btn = document.getElementById('medicaoFilterBtn');
    const dropdown = document.getElementById('medicaoFilterDropdown');
    if (!btn || !dropdown || !container) return;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
            return;
        }
        
        const rect = btn.getBoundingClientRect();
        dropdown.style.left = 'auto';
        dropdown.style.top = `${rect.bottom + 5}px`;
        dropdown.style.right = `${window.innerWidth - rect.right - rect.width}px`;
        
        dropdown.classList.add('show');
    });

    document.addEventListener('click', (e) => {
        if (dropdown.classList.contains('show') && !container.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });
}

function populateFilterDropdowns(data) {
    if (!data || data.length === 0) return;

    choicesOrgao = createChoicesInstance('filterOrgao', 'Órgão(s)');
    choicesObra = createChoicesInstance('filterObra', 'Obra(s)');
    choicesNumProcesso = createChoicesInstance('filterNumProcesso1Select', 'Nº Processo(s)');
    choicesNf = createChoicesInstance('filterNf', 'NF(s)');
    
    updateMedicaoFilterOptions(data); // Popula o filtro de medição com os dados iniciais

    const getChoicesArray = (field) => Array.from(new Set(data.map(item => item[field]).filter(Boolean))).sort().map(val => ({ value: val.toLowerCase(), label: val }));

    if (choicesOrgao) { choicesOrgao.setChoices(getChoicesArray('rawOrgao'), 'value', 'label', true); }
    if (choicesObra) { choicesObra.setChoices(getChoicesArray('obraFormatted'), 'value', 'label', true); }
    if (choicesNumProcesso) { choicesNumProcesso.setChoices(getChoicesArray('rawNumProcesso1'), 'value', 'label', true); }
    if (choicesNf) { choicesNf.setChoices(getChoicesArray('rawNf'), 'value', 'label', true); }
}


// --- API PÚBLICA DO MÓDULO (Funções Exportadas) ---

export function initializeFilters(processedData) {
    allProcessedData = processedData || [];
    
    populateFilterDropdowns(allProcessedData);
    setupMedicaoFilterListeners(); // Adiciona os listeners do filtro de medição uma única vez

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

export function applyFilters() {
    const tableBody = document.getElementById('financeiroTableBody');
    const kpiRecebimentoLiquidoEl = document.getElementById('kpiRecebimentoLiquido');
    const kpiAguardandoPagamentoEl = document.getElementById('kpiAguardandoPagamento');
    const totalExecutadoCell = document.getElementById('financeiroTotalExecutado');
    const progressBar = document.getElementById('financeiroProgressBar');
    
    if (!tableBody) return;

    const filterDataPagtInicio = document.getElementById('filterDataPagtInicio')?.value || '';
    const filterDataPagtFim = document.getElementById('filterDataPagtFim')?.value || '';
    const filterLegenda = document.getElementById('filterLegenda')?.value || '';
    const selectedOrgaos = choicesOrgao ? choicesOrgao.getValue(true).map(v => v.toLowerCase()) : [];
    const selectedObras = choicesObra ? choicesObra.getValue(true).map(v => v.toLowerCase()) : [];
    const selectedNumProcessos = choicesNumProcesso ? choicesNumProcesso.getValue(true).map(v => v.toLowerCase()) : [];
    const selectedNfs = choicesNf ? choicesNf.getValue(true).map(v => v.toLowerCase()) : [];

    const activeMedicaoFilters = selectedMedicoes;

    const filteredRows = allProcessedData.filter(item => {
        if (filterDataPagtInicio && item.rawDatePagt) {
            const parts = item.rawDatePagt.split('/');
            if (parts.length === 3) {
                const cellDateYyyyMmDd = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                if (cellDateYyyyMmDd < filterDataPagtInicio) return false;
            }
        }
        if (filterDataPagtFim && item.rawDatePagt) {
            const parts = item.rawDatePagt.split('/');
            if (parts.length === 3) {
                const cellDateYyyyMmDd = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                if (cellDateYyyyMmDd > filterDataPagtFim) return false;
            }
        }
        if (filterLegenda && item.rawLegenda !== filterLegenda) return false;
        if (selectedOrgaos.length > 0 && !selectedOrgaos.includes((item.rawOrgao || '').toLowerCase())) return false;
        if (selectedObras.length > 0 && !selectedObras.includes((item.obraFormatted || '').toLowerCase())) return false;
        if (selectedNfs.length > 0 && !selectedNfs.includes((item.rawNf || '').toLowerCase())) return false;
        if (selectedNumProcessos.length > 0 && !selectedNumProcessos.includes((item.rawNumProcesso1 || '').toLowerCase())) return false;
        if (activeMedicaoFilters.length > 0 && !activeMedicaoFilters.includes(item.medicaoFormatted || '')) return false;

        return true;
    });

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

    let novoTotalExecutado = 0, novoRecebimentoLiquido = 0, novoAguardandoPagamento = 0;
    filteredRows.forEach(item => {
        novoTotalExecutado += item.rawExecutadoValor || 0;
        if (item.rawLegenda === '1') novoRecebimentoLiquido += item.rawValorPagoReal || 0;
        else if (item.rawLegenda === '2') novoAguardandoPagamento += item.rawExecutadoValor || 0;
    });
    
    if (kpiRecebimentoLiquidoEl) kpiRecebimentoLiquidoEl.textContent = formatCurrency(novoRecebimentoLiquido);
    if (kpiAguardandoPagamentoEl) kpiAguardandoPagamentoEl.textContent = formatCurrency(novoAguardandoPagamento);
    if (totalExecutadoCell) totalExecutadoCell.innerHTML = `<strong>${formatCurrency(novoTotalExecutado)}</strong>`;
    if (progressBar) progressBar.style.width = (novoTotalExecutado > 0) ? `${Math.min((novoRecebimentoLiquido / novoTotalExecutado) * 100, 100).toFixed(2)}%` : '0%';
}

export function clearFilters() {
    isRefreshingFilters = true;
    
    if (choicesOrgao) choicesOrgao.removeActiveItems();
    if (choicesObra) choicesObra.removeActiveItems();
    if (choicesNumProcesso) choicesNumProcesso.removeActiveItems();
    if (choicesNf) choicesNf.removeActiveItems();
    
    const btn = document.getElementById('medicaoFilterBtn');
    if (btn) btn.classList.remove('active');
    selectedMedicoes = [];
    updateMedicaoFilterOptions(allProcessedData);
    
    document.getElementById('filterDataPagtInicio').value = '';
    document.getElementById('filterDataPagtFim').value = '';
    document.getElementById('filterLegenda').value = '';

    isRefreshingFilters = false;
    applyFilters();
    refreshDependentFilters(); 
}

export function destroyFilters() {
    if (choicesOrgao) { choicesOrgao.destroy(); choicesOrgao = null; }
    if (choicesObra) { choicesObra.destroy(); choicesObra = null; }
    if (choicesNumProcesso) { choicesNumProcesso.destroy(); choicesNumProcesso = null; }
    if (choicesNf) { choicesNf.destroy(); choicesNf = null; }

    selectedMedicoes = [];
    allProcessedData = [];
}