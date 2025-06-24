// src/financeiroFilters.js

import { formatCurrency } from './page_financeiro.js';

// --- ESTADO INTERNO DO MÓDULO (Variáveis "Privadas") ---

// Armazena todos os dados recebidos da API para re-filtragem
let allProcessedData = [];

// Instâncias da biblioteca Choices.js para os dropdowns
let choicesOrgao = null;
let choicesObra = null;
let choicesNumProcesso = null;
let choicesNf = null;

// Flag para evitar loops de eventos durante a atualização dos filtros
let isRefreshingFilters = false;

// --- FUNÇÕES INTERNAS (Não exportadas) ---

/**
 * Cria e configura uma instância da biblioteca Choices.js para um elemento select.
 * @param {string} elementId - O ID do elemento <select> no HTML.
 * @param {string} placeholderText - O texto a ser exibido como placeholder.
 * @returns {Choices|null} - A nova instância do Choices ou nulo se o elemento não for encontrado.
 */
function createChoicesInstance(elementId, placeholderText = 'Selecione...') {
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
    
    // Adiciona uma classe customizada para estilização
    if (newInstance.containerOuter?.element) {
        newInstance.containerOuter.element.classList.add('filter-choices');
    }

    // Adiciona o listener que dispara a filtragem e atualização
    selectElement.addEventListener('change', () => {
        if (isRefreshingFilters) return;
        applyFilters(); // Aplica os filtros principais
        refreshDependentFilters(elementId); // Atualiza as opções dos outros filtros
    });

    return newInstance;
}

/**
 * Atualiza as opções disponíveis nos outros filtros com base em uma seleção atual.
 * @param {string} changedElementId - O ID do filtro que acabou de ser alterado.
 */
function refreshDependentFilters(changedElementId = null) {
    if (isRefreshingFilters || !allProcessedData || allProcessedData.length === 0) return;
    
    isRefreshingFilters = true;

    // Obtém os valores atualmente selecionados em todos os filtros
    const selectedOrgaos = choicesOrgao ? choicesOrgao.getValue(true).map(v => v.toLowerCase()) : [];
    const selectedObras = choicesObra ? choicesObra.getValue(true).map(v => v.toLowerCase()) : [];
    const selectedNumProcessos = choicesNumProcesso ? choicesNumProcesso.getValue(true).map(v => v.toLowerCase()) : [];
    const selectedNfs = choicesNf ? choicesNf.getValue(true).map(v => v.toLowerCase()) : [];

    // Função auxiliar para gerar opções
    const getOptionsFor = (field, filterData) => 
        Array.from(new Set(filterData.map(i => i[field]).filter(Boolean)))
             .sort()
             .map(v => ({ value: v.toLowerCase(), label: v }));

    // Filtra os dados base para cada dropdown
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
    // ... e assim por diante para cada filtro ...
    
    // Atualiza cada dropdown (exceto o que foi alterado)
    if (changedElementId !== 'filterOrgao' && choicesOrgao) {
        const opts = getOptionsFor('rawOrgao', orgaoFilterData);
        choicesOrgao.setChoices(opts, 'value', 'label', false);
        choicesOrgao.setValue(selectedOrgaos.filter(v => opts.some(opt => opt.value === v)));
    }
    if (changedElementId !== 'filterObra' && choicesObra) {
        const opts = getOptionsFor('obraFormatted', obraFilterData);
        choicesObra.setChoices(opts, 'value', 'label', false);
        choicesObra.setValue(selectedObras.filter(v => opts.some(opt => opt.value === v)));
    }
     if (changedElementId !== 'filterNf' && choicesNf) {
        const data = allProcessedData.filter(i => 
            (selectedOrgaos.length === 0 || selectedOrgaos.includes(i.rawOrgao.toLowerCase())) &&
            (selectedObras.length === 0 || selectedObras.includes(i.obraFormatted.toLowerCase())) &&
            (selectedNumProcessos.length === 0 || selectedNumProcessos.includes(i.rawNumProcesso1.toLowerCase()))
        );
        const opts = getOptionsFor('rawNf', data);
        choicesNf.setChoices(opts, 'value', 'label', false);
        choicesNf.setValue(selectedNfs.filter(v => opts.some(opt => opt.value === v)));
    }

    if (changedElementId !== 'filterNumProcesso1Select' && choicesNumProcesso) {
        const data = allProcessedData.filter(i => 
            (selectedOrgaos.length === 0 || selectedOrgaos.includes(i.rawOrgao.toLowerCase())) &&
            (selectedObras.length === 0 || selectedObras.includes(i.obraFormatted.toLowerCase())) &&
            (selectedNfs.length === 0 || selectedNfs.includes(i.rawNf.toLowerCase()))
        );
        const opts = getOptionsFor('rawNumProcesso1', data);
        choicesNumProcesso.setChoices(opts, 'value', 'label', false);
        choicesNumProcesso.setValue(selectedNumProcessos.filter(v => opts.some(opt => opt.value === v)));
    }

    isRefreshingFilters = false;
}

/**
 * Popula os dropdowns de filtro pela primeira vez com todas as opções possíveis.
 * @param {Array} data - O conjunto completo de dados processados.
 */
function populateFilterDropdowns(data) {
    if (!data || data.length === 0) return;

    // Cria as instâncias de Choices.js
    choicesOrgao = createChoicesInstance('filterOrgao', 'Órgão(s)');
    choicesObra = createChoicesInstance('filterObra', 'Obra(s)');
    choicesNumProcesso = createChoicesInstance('filterNumProcesso1Select', 'Nº Processo(s)');
    choicesNf = createChoicesInstance('filterNf', 'NF(s)');

    // Gera as opções únicas para cada campo
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

/**
 * Inicializa todo o sistema de filtros.
 * Esta função é o ponto de entrada principal para este módulo.
 * @param {Array} processedData - O conjunto de dados vindo da API.
 */
export function initializeFilters(processedData) {
    // Armazena os dados localmente no módulo
    allProcessedData = processedData || [];
    
    // Popula os dropdowns com as opções iniciais
    populateFilterDropdowns(allProcessedData);

    // Liga os eventos para os filtros que não são do tipo Choices.js
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

    // Aplica os filtros uma vez para renderizar a tabela inicial
    applyFilters();
}

/**
 * Filtra os dados com base nos valores atuais dos inputs e atualiza a tabela e os KPIs.
 */
export function applyFilters() {
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
        // ... (toda a lógica de filtragem de `script.js` vem aqui) ...
        // Exemplo:
        if (filterLegenda && item.rawLegenda !== filterLegenda) return false;
        if (selectedOrgaos.length > 0 && !selectedOrgaos.includes(item.rawOrgao.toLowerCase())) return false;
        // ...etc para todos os outros filtros
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
    let novoTotalExecutado = 0, novoRecebimentoLiquido = 0, novoAguardandoPagamento = 0, novoAguardandoLiberacao = 0;
    filteredRows.forEach(item => {
        novoTotalExecutado += item.rawExecutadoValor || 0;
        if (item.rawLegenda === '1') novoRecebimentoLiquido += item.rawValorPagoReal || 0;
        else if (item.rawLegenda === '2') novoAguardandoPagamento += item.rawExecutadoValor || 0;
        else if (item.rawLegenda === '3') novoAguardandoLiberacao += item.rawExecutadoValor || 0;
    });
    if (kpiRecebimentoLiquidoEl) kpiRecebimentoLiquidoEl.textContent = formatCurrency(novoRecebimentoLiquido);
    if (kpiAguardandoPagamentoEl) kpiAguardandoPagamentoEl.textContent = formatCurrency(novoAguardandoPagamento);
    if (kpiAguardandoLiberacaoEl) kpiAguardandoLiberacaoEl.textContent = formatCurrency(novoAguardandoLiberacao);
    if (totalExecutadoCell) totalExecutadoCell.innerHTML = `<strong>${formatCurrency(novoTotalExecutado)}</strong>`;
    if (progressBar) progressBar.style.width = (novoTotalExecutado > 0) ? `${Math.min((novoRecebimentoLiquido / novoTotalExecutado) * 100, 100).toFixed(2)}%` : '0%';
}

/**
 * Limpa todos os filtros aplicados e re-renderiza a visualização.
 */
export function clearFilters() {
    isRefreshingFilters = true;
    
    // Limpa os dropdowns do Choices.js
    if (choicesOrgao) choicesOrgao.removeActiveItems();
    if (choicesObra) choicesObra.removeActiveItems();
    if (choicesNumProcesso) choicesNumProcesso.removeActiveItems();
    if (choicesNf) choicesNf.removeActiveItems();
    
    // Limpa os inputs padrão
    document.getElementById('filterDataPagtInicio').value = '';
    document.getElementById('filterDataPagtFim').value = '';
    document.getElementById('filterLegenda').value = '';

    isRefreshingFilters = false;

    // Re-renderiza a tabela com todos os dados
    applyFilters();
    // Re-popula todos os filtros para garantir que todas as opções estão disponíveis
    refreshDependentFilters(); 
}

/**
 * Destrói as instâncias de Choices.js para limpar a memória ao sair da página.
 */
export function destroyFilters() {
    if (choicesOrgao) { choicesOrgao.destroy(); choicesOrgao = null; }
    if (choicesObra) { choicesObra.destroy(); choicesObra = null; }
    if (choicesNumProcesso) { choicesNumProcesso.destroy(); choicesNumProcesso = null; }
    if (choicesNf) { choicesNf.destroy(); choicesNf = null; }
    allProcessedData = []; // Limpa os dados
}