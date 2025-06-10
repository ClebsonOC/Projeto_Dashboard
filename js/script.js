// script.js
import { initFinanceiroPage, formatCurrency, parseCurrency } from './page_financeiro.js';

let allProcessedFinanceiroData = [];
let choicesOrgao = null;
let choicesObra = null;
let choicesNumProcesso = null;
let choicesNf = null; // Adicionado
let isRefreshingFilters = false;

document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.getElementById('sidebar');
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mainContent = document.getElementById('mainContent');
  const dynamicContentArea = document.getElementById('dynamicContentArea');
  const pageHeaderTitleDiv = document.getElementById('pageHeaderTitle');
  const navItemLinks = document.querySelectorAll('.sidebar-nav .nav-item a'); // Links da navegação

  const filterPanel = document.getElementById('filterPanel');
  const filterToggleBtn = document.getElementById('filterToggle');
  const closeFilterPanelBtn = document.getElementById('closeFilterPanel');
  const clearFiltersBtn = document.getElementById('clearFilters');
  
  const standardFilterInputs = [
    document.getElementById('filterDataPagtInicio'),
    document.getElementById('filterDataPagtFim'),
    document.getElementById('filterLegenda'),
    // document.getElementById('filterNf') // Removido daqui
  ];

  const routes = { /* ... Seu objeto routes ... */ 
    '#painel-geral': { filePath: 'pages/_painel_geral_content.html', title: 'Painel Geral', description: 'Visão geral.', initFunction: null },
    '#dados-contrato': { filePath: 'pages/_dados_contrato_content.html', title: 'Dados do Contrato', description: 'Informações.', initFunction: null },
    '#obra': { filePath: 'pages/_obra_content.html', title: 'Detalhes da Obra', description: 'Acompanhamento.', initFunction: function() { /* ... */ } },
    '#resumo-contrato': { filePath: 'pages/_resumo_contrato_content.html', title: 'Resumo do Contrato', description: 'Visualização.', initFunction: null },
    '#custos': { filePath: 'pages/_custos_content.html', title: 'Análise de Custos', description: 'Detalhamento.', initFunction: null },
    '#financeiro': { filePath: 'pages/_financeiro_content.html', title: 'Resumo Financeiro', description: 'Status.', initFunction: initFinanceiroPage }
  };

  function toggleSidebar() { /* ... Sua função ... */ 
    const isMobile = window.innerWidth <= 768;
    if (isMobile) { sidebar.classList.toggle('open'); } 
    else { sidebar.classList.toggle('collapsed'); mainContent.classList.toggle('full-width'); sidebar.classList.remove('open'); }
  }
  if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
  if (mobileMenuToggle) mobileMenuToggle.addEventListener('click', toggleSidebar);

  const currentYearSpan = document.getElementById('currentYear');
  if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();

  async function loadContent(hash) { /* ... Sua função loadContent, com destroy de Choices ... */ 
      const currentRoute = routes[hash] || routes['#painel-geral'];
      if (hash !== '#financeiro') {
          if (choicesOrgao) { choicesOrgao.destroy(); choicesOrgao = null; }
          if (choicesObra) { choicesObra.destroy(); choicesObra = null; }
          if (choicesNumProcesso) { choicesNumProcesso.destroy(); choicesNumProcesso = null; }
          if (choicesNf) { choicesNf.destroy(); choicesNf = null; } // Adicionado
          if (filterPanel) filterPanel.classList.remove('open');
          if (filterToggleBtn) filterToggleBtn.style.display = 'none';
          if (mainContent && window.innerWidth > 768) mainContent.classList.remove('filter-panel-open');
      } else if (filterToggleBtn) {
          filterToggleBtn.style.display = 'block';
      }
      if (dynamicContentArea) {
        try {
          dynamicContentArea.innerHTML = '<p style="text-align:center; padding:20px;">Carregando...</p>';
          const response = await fetch(currentRoute.filePath);
          if (!response.ok) throw new Error(`Não encontrado: ${currentRoute.filePath}`);
          const htmlContent = await response.text();
          dynamicContentArea.innerHTML = htmlContent;
          if (pageHeaderTitleDiv) {
            pageHeaderTitleDiv.querySelector('h1').textContent = currentRoute.title;
            pageHeaderTitleDiv.querySelector('p').textContent = currentRoute.description;
          }
          document.title = `${currentRoute.title} - Dashboard`;
          if (currentRoute.initFunction) {
            await currentRoute.initFunction(applyFiltersToTable, populateFilterDropdowns); 
          }
        } catch (error) {
          console.error('Erro rota:', hash, error);
          dynamicContentArea.innerHTML = `<p style="color:red;text-align:center;">Erro: ${error.message}.</p>`;
        }
      }
      setActiveNavLink(hash);
  }
  function setActiveNavLink(currentHash) { /* ... Sua função ... */ 
    const hashToUse = currentHash || (window.location.hash || '#painel-geral');
    navItemLinks.forEach(link => {
      link.parentElement.classList.remove('active');
      if (link.getAttribute('href') === hashToUse) link.parentElement.classList.add('active');
    });
    if (sidebar.classList.contains('open') && window.innerWidth <= 768) sidebar.classList.remove('open');
  }
  
  window.addEventListener('hashchange', handleHashChange);
  function handleHashChange() { loadContent(window.location.hash || '#painel-geral'); }
  navItemLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href?.startsWith('#') && routes[href]) link.addEventListener('click', () => {/* handled by hashchange */});
  });

  // Lógica Painel de Filtros
  if (filterToggleBtn) filterToggleBtn.addEventListener('click', () => { /* ... */ 
    filterPanel.classList.toggle('open');
    if (mainContent && window.innerWidth > 768) mainContent.classList.toggle('filter-panel-open');
  });
  if (closeFilterPanelBtn) closeFilterPanelBtn.addEventListener('click', () => { /* ... */ 
    filterPanel.classList.remove('open');
    if (mainContent && window.innerWidth > 768) mainContent.classList.remove('filter-panel-open');
  });
  
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
        isRefreshingFilters = true; 
        if (choicesOrgao) choicesOrgao.removeActiveItems();
        if (choicesObra) choicesObra.removeActiveItems();
        if (choicesNumProcesso) choicesNumProcesso.removeActiveItems();
        if (choicesNf) choicesNf.removeActiveItems(); // Adicionado
        standardFilterInputs.forEach(input => { if (input) input.value = ''; });
        if (allProcessedFinanceiroData?.length > 0) {
            const fullOpts = (getter) => Array.from(new Set(allProcessedFinanceiroData.map(getter).filter(Boolean))).sort().map(v => ({ value: v.toLowerCase(), label: v }));
            if (choicesOrgao) choicesOrgao.setChoices(fullOpts(item => item.rawOrgao), 'value', 'label', true);
            if (choicesObra) choicesObra.setChoices(fullOpts(item => item.obraFormatted), 'value', 'label', true);
            if (choicesNumProcesso) choicesNumProcesso.setChoices(fullOpts(item => item.rawNumProcesso1), 'value', 'label', true);
            if (choicesNf) choicesNf.setChoices(fullOpts(item => item.rawNf), 'value', 'label', true); // Adicionado
        }
        isRefreshingFilters = false;
        applyFiltersToTable(); 
    });
  }

  standardFilterInputs.forEach(input => {
    if (input) {
        const eventType = (input.tagName === 'SELECT' || input.type === 'date') ? 'change' : 'input';
        input.addEventListener(eventType, () => { // MODIFICADO: Standard filters também podem precisar atualizar dependentes
            applyFiltersToTable();
        });
    }
  });

  // Listener global para fechar dropdowns do Choices.js
  document.addEventListener('mousedown', function(event) { /* ... Sua função ... */ 
    const instances = [choicesOrgao, choicesObra, choicesNumProcesso, choicesNf]; // Adicionado choicesNf
    for (const instance of instances) {
        if (instance?.dropdown.isActive) {
            const choicesContainer = instance.containerOuter.element;
            if (choicesContainer && !choicesContainer.contains(event.target)) {
                instance.hideDropdown();
            }
        }
    }
  });
  window.addEventListener('resize', () => { /* ... Sua função de ajuste de layout ... */ 
    if (filterPanel && mainContent) {
        if (filterPanel.classList.contains('open')) {
            const isMobile = window.innerWidth <= 768;
            if (!isMobile) mainContent.classList.add('filter-panel-open');
            else mainContent.classList.remove('filter-panel-open');
        } else {
            mainContent.classList.remove('filter-panel-open');
        }
    }
  });

  // --- FUNÇÕES DE FILTRO, ATUALIZAÇÃO DE DROPDOWNS, INFO USUÁRIO ---

  // ✅ FUNÇÃO MODIFICADA PARA RETORNAR OS DADOS DO USUÁRIO
  async function setupUserSpecificUI() {
    try {
        const response = await fetch('/api/userinfo');
        if (!response.ok) {
            console.error('Falha ao buscar informações do usuário para UI:', response.status);
            if (response.status === 401 || response.status === 403) {
                window.location.href = '/login';
            }
            return null; // Retorna nulo em caso de erro
        }
        
        const userInfo = await response.json();
        
        const userNameElement = document.querySelector('.main-header .user-profile .user-name');
        if (userNameElement) {
            userNameElement.textContent = userInfo.username || 'Usuário';
        }

        // Restrição do menu da barra lateral
        if (userInfo.orgao && userInfo.orgao.toUpperCase() !== "ADMINISTRATIVO") {
            navItemLinks.forEach(linkElement => {
                const href = linkElement.getAttribute('href');
                const listItem = linkElement.closest('.nav-item');
                if (listItem) {
                    listItem.style.display = (href === "#financeiro") ? '' : 'none';
                }
            });
        } else {
            navItemLinks.forEach(linkElement => {
                const listItem = linkElement.closest('.nav-item');
                if (listItem) listItem.style.display = '';
            });
        }
        
        return userInfo; // Retorna os dados do usuário no sucesso

    } catch (error) {
        console.error('Erro ao configurar UI específica do usuário:', error);
        return null; // Retorna nulo em caso de erro
    }
  }

  function applyFiltersToTable(processedData) { /* ... Sua função applyFiltersToTable (sem alterações na lógica interna) ... */ 
    const tableBody = document.getElementById('financeiroTableBody');
    const kpiRecebimentoLiquidoEl = document.getElementById('kpiRecebimentoLiquido');
    const kpiAguardandoPagamentoEl = document.getElementById('kpiAguardandoPagamento');
    const kpiAguardandoLiberacaoEl = document.getElementById('kpiAguardandoLiberacao');
    const totalExecutadoCell = document.getElementById('financeiroTotalExecutado');
    const progressBar = document.getElementById('financeiroProgressBar');

    if (!tableBody) return;

    if (Array.isArray(processedData) && processedData.length > 0) {
      allProcessedFinanceiroData = processedData;
    } else if (Array.isArray(processedData) && processedData.length === 0 && allProcessedFinanceiroData.length > 0) {
        // Não sobrescreve
    } else if (!allProcessedFinanceiroData || allProcessedFinanceiroData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="11" class="text-center p-3">Nenhum dado financeiro carregado.</td></tr>';
        if (kpiRecebimentoLiquidoEl) kpiRecebimentoLiquidoEl.textContent = formatCurrency(0);
        if (kpiAguardandoPagamentoEl) kpiAguardandoPagamentoEl.textContent = formatCurrency(0);
        if (kpiAguardandoLiberacaoEl) kpiAguardandoLiberacaoEl.textContent = formatCurrency(0);
        if (totalExecutadoCell) totalExecutadoCell.innerHTML = `<strong>${formatCurrency(0)}</strong>`;
        if (progressBar) progressBar.style.width = '0%';
        return;
    }
    
    const filterDataPagtInicio = document.getElementById('filterDataPagtInicio')?.value || '';
    const filterDataPagtFim = document.getElementById('filterDataPagtFim')?.value || '';
    const filterLegenda = document.getElementById('filterLegenda')?.value || '';

    const selectedOrgaos = choicesOrgao ? choicesOrgao.getValue(true).map(v => v.toLowerCase()) : [];
    const selectedObras = choicesObra ? choicesObra.getValue(true).map(v => v.toLowerCase()) : [];
    const selectedNumProcessos = choicesNumProcesso ? choicesNumProcesso.getValue(true).map(v => v.toLowerCase()) : [];
    const selectedNfs = choicesNf ? choicesNf.getValue(true).map(v => v.toLowerCase()) : []; // Adicionado

    let filteredRows = allProcessedFinanceiroData.filter(item => {
        let showRow = true;
        if (filterDataPagtInicio || filterDataPagtFim) { /* ... filtro data ... */ 
            if (item.rawDatePagt) { const parts = item.rawDatePagt.split('/'); let cellDateYyyyMmDd = ''; if (parts.length === 3) { const day = parts[0].padStart(2, '0'); const month = parts[1].padStart(2, '0'); let year = parts[2]; if (year.length === 2) year = (parseInt(year, 10) < 70 ? '20' : '19') + year; cellDateYyyyMmDd = `${year}-${month}-${day}`; } if (filterDataPagtInicio && cellDateYyyyMmDd && cellDateYyyyMmDd < filterDataPagtInicio) showRow = false; if (showRow && filterDataPagtFim && cellDateYyyyMmDd && cellDateYyyyMmDd > filterDataPagtFim) showRow = false; } else { showRow = false; }
        }
        if (showRow && filterLegenda && item.rawLegenda !== filterLegenda) showRow = false;
        if (showRow && selectedOrgaos.length > 0 && (!item.rawOrgao || !selectedOrgaos.includes(item.rawOrgao.toLowerCase()))) showRow = false;
        if (showRow && selectedObras.length > 0 && (!item.obraFormatted || !selectedObras.includes(item.obraFormatted.toLowerCase()))) showRow = false;
        if (showRow && selectedNfs.length > 0 && (!item.rawNf || !selectedNfs.includes(item.rawNf.toLowerCase()))) showRow = false; // Adicionado
        if (showRow && selectedNumProcessos.length > 0 && (!item.rawNumProcesso1 || !selectedNumProcessos.includes(item.rawNumProcesso1.toLowerCase()))) showRow = false;
        return showRow;
    });

    tableBody.innerHTML = '';
    if (filteredRows.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="11" class="text-center p-3">Nenhum dado encontrado.</td></tr>';
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
    let novoTotalExecutado = 0, novoRecebimentoLiquido = 0, novoAguardandoPagamento = 0, novoAguardandoLiberacao = 0;
    filteredRows.forEach(item => { /* ... cálculo KPIs ... */ 
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

  function createChoicesInstance(elementId, placeholderText = 'Selecione...') { /* ... Sua função createChoicesInstance ... */ 
    const selectElement = document.getElementById(elementId);
    if (!selectElement) return null;
    const choicesConfig = { removeItemButton: true, placeholder: true, placeholderValue: placeholderText, searchResultLimit: 10, searchPlaceholderValue: 'Buscar...', itemSelectText: '' };
    const newInstance = new Choices(selectElement, choicesConfig);
    if (newInstance.containerOuter?.element) newInstance.containerOuter.element.classList.add('filter-choices');
    selectElement.addEventListener('change', () => {
        if (isRefreshingFilters) return;
        applyFiltersToTable();
        refreshDependentFilters(elementId);
    });
    return newInstance;
  }
  
  function populateFilterDropdowns(dataToUseForOptions) { /* ... Sua função populateFilterDropdowns ... */ 
    if (!dataToUseForOptions || dataToUseForOptions.length === 0) {
        console.warn("Dropdowns: sem dados para opções.");
        if (choicesOrgao) { choicesOrgao.clearStore(); choicesOrgao.disable(); }
        if (choicesObra) { choicesObra.clearStore(); choicesObra.disable(); }
        if (choicesNumProcesso) { choicesNumProcesso.clearStore(); choicesNumProcesso.disable(); }
        if (choicesNf) { choicesNf.clearStore(); choicesNf.disable(); } // Adicionado
        return;
    }
    const uniqueOrgaos = new Set(dataToUseForOptions.map(item => item.rawOrgao).filter(Boolean));
    const uniqueObras = new Set(dataToUseForOptions.map(item => item.obraFormatted).filter(Boolean));
    const uniqueNumProcesso1 = new Set(dataToUseForOptions.map(item => item.rawNumProcesso1).filter(Boolean));
    const uniqueNfs = new Set(dataToUseForOptions.map(item => item.rawNf).filter(Boolean)); // Adicionado

    if (choicesOrgao) { choicesOrgao.destroy(); choicesOrgao = null; } choicesOrgao = createChoicesInstance('filterOrgao', 'Órgão(s)');
    if (choicesObra) { choicesObra.destroy(); choicesObra = null; } choicesObra = createChoicesInstance('filterObra', 'Obra(s)');
    if (choicesNumProcesso) { choicesNumProcesso.destroy(); choicesNumProcesso = null; } choicesNumProcesso = createChoicesInstance('filterNumProcesso1Select', 'Nº Processo(s)');
    if (choicesNf) { choicesNf.destroy(); choicesNf = null; } choicesNf = createChoicesInstance('filterNf', 'NF(s)'); // Adicionado

    const orgaoChoicesArray = Array.from(uniqueOrgaos).sort().map(val => ({ value: val.toLowerCase(), label: val }));
    const obraChoicesArray = Array.from(uniqueObras).sort().map(val => ({ value: val.toLowerCase(), label: val }));
    const numProcessoChoicesArray = Array.from(uniqueNumProcesso1).sort().map(val => ({ value: val.toLowerCase(), label: val }));
    const nfChoicesArray = Array.from(uniqueNfs).sort().map(val => ({ value: val.toLowerCase(), label: val })); // Adicionado

    isRefreshingFilters = true; 
    if (choicesOrgao) { choicesOrgao.enable(); choicesOrgao.setChoices(orgaoChoicesArray, 'value', 'label', true); }
    if (choicesObra) { choicesObra.enable(); choicesObra.setChoices(obraChoicesArray, 'value', 'label', true); }
    if (choicesNumProcesso) { choicesNumProcesso.enable(); choicesNumProcesso.setChoices(numProcessoChoicesArray, 'value', 'label', true); }
    if (choicesNf) { choicesNf.enable(); choicesNf.setChoices(nfChoicesArray, 'value', 'label', true); } // Adicionado
    isRefreshingFilters = false;
    if (dataToUseForOptions.length === 0) { const di = document.getElementById('filterDataPagtInicio'), df = document.getElementById('filterDataPagtFim'); if (di) di.value = ''; if (df) df.value = ''; }
  }

  function refreshDependentFilters(changedElementId = null) { /* ... Sua função refreshDependentFilters ... */ 
    if (isRefreshingFilters || !allProcessedFinanceiroData || allProcessedFinanceiroData.length === 0) return;
    isRefreshingFilters = true;
    const currentSelectedOrgaos = choicesOrgao ? choicesOrgao.getValue(true).map(v => v.toLowerCase()) : [];
    const currentSelectedObras = choicesObra ? choicesObra.getValue(true).map(v => v.toLowerCase()) : [];
    const currentSelectedNumProcessos = choicesNumProcesso ? choicesNumProcesso.getValue(true).map(v => v.toLowerCase()) : [];
    const currentSelectedNfs = choicesNf ? choicesNf.getValue(true).map(v => v.toLowerCase()) : []; // Adicionado

    // Atualiza Órgão
    if (changedElementId !== 'filterOrgao' && choicesOrgao) {
        let data = allProcessedFinanceiroData;
        if (currentSelectedObras.length > 0) data = data.filter(i => i.obraFormatted && currentSelectedObras.includes(i.obraFormatted.toLowerCase()));
        if (currentSelectedNumProcessos.length > 0) data = data.filter(i => i.rawNumProcesso1 && currentSelectedNumProcessos.includes(i.rawNumProcesso1.toLowerCase()));
        if (currentSelectedNfs.length > 0) data = data.filter(i => i.rawNf && currentSelectedNfs.includes(i.rawNf.toLowerCase())); // Adicionado
        const opts = Array.from(new Set(data.map(i => i.rawOrgao).filter(Boolean))).sort().map(v => ({ value: v.toLowerCase(), label: v }));
        const prevSel = choicesOrgao.getValue(true).map(v => v.toLowerCase());
        choicesOrgao.setChoices(opts, 'value', 'label', true);
        const validReSel = prevSel.filter(v => opts.some(opt => opt.value === v));
        if (validReSel.length > 0) choicesOrgao.setValue(validReSel);
    }
    // Atualiza Obra
    if (changedElementId !== 'filterObra' && choicesObra) {
        let data = allProcessedFinanceiroData;
        if (currentSelectedOrgaos.length > 0) data = data.filter(i => i.rawOrgao && currentSelectedOrgaos.includes(i.rawOrgao.toLowerCase()));
        if (currentSelectedNumProcessos.length > 0) data = data.filter(i => i.rawNumProcesso1 && currentSelectedNumProcessos.includes(i.rawNumProcesso1.toLowerCase()));
        if (currentSelectedNfs.length > 0) data = data.filter(i => i.rawNf && currentSelectedNfs.includes(i.rawNf.toLowerCase())); // Adicionado
        const opts = Array.from(new Set(data.map(i => i.obraFormatted).filter(Boolean))).sort().map(v => ({ value: v.toLowerCase(), label: v }));
        const prevSel = choicesObra.getValue(true).map(v => v.toLowerCase());
        choicesObra.setChoices(opts, 'value', 'label', true);
        const validReSel = prevSel.filter(v => opts.some(opt => opt.value === v));
        if (validReSel.length > 0) choicesObra.setValue(validReSel);
    }
    // Atualiza Nº Processo
    if (changedElementId !== 'filterNumProcesso1Select' && choicesNumProcesso) {
        let data = allProcessedFinanceiroData;
        if (currentSelectedOrgaos.length > 0) data = data.filter(i => i.rawOrgao && currentSelectedOrgaos.includes(i.rawOrgao.toLowerCase()));
        if (currentSelectedObras.length > 0) data = data.filter(i => i.obraFormatted && currentSelectedObras.includes(i.obraFormatted.toLowerCase()));
        if (currentSelectedNfs.length > 0) data = data.filter(i => i.rawNf && currentSelectedNfs.includes(i.rawNf.toLowerCase())); // Adicionado
        const opts = Array.from(new Set(data.map(i => i.rawNumProcesso1).filter(Boolean))).sort().map(v => ({ value: v.toLowerCase(), label: v }));
        const prevSel = choicesNumProcesso.getValue(true).map(v => v.toLowerCase());
        choicesNumProcesso.setChoices(opts, 'value', 'label', true);
        const validReSel = prevSel.filter(v => opts.some(opt => opt.value === v));
        if (validReSel.length > 0) choicesNumProcesso.setValue(validReSel);
    }
    // Atualiza NF
    if (changedElementId !== 'filterNf' && choicesNf) {
        let data = allProcessedFinanceiroData;
        if (currentSelectedOrgaos.length > 0) data = data.filter(i => i.rawOrgao && currentSelectedOrgaos.includes(i.rawOrgao.toLowerCase()));
        if (currentSelectedObras.length > 0) data = data.filter(i => i.obraFormatted && currentSelectedObras.includes(i.obraFormatted.toLowerCase()));
        if (currentSelectedNumProcessos.length > 0) data = data.filter(i => i.rawNumProcesso1 && currentSelectedNumProcessos.includes(i.rawNumProcesso1.toLowerCase()));
        const opts = Array.from(new Set(data.map(i => i.rawNf).filter(Boolean))).sort().map(v => ({ value: v.toLowerCase(), label: v }));
        const prevSel = choicesNf.getValue(true).map(v => v.toLowerCase());
        choicesNf.setChoices(opts, 'value', 'label', true);
        const validReSel = prevSel.filter(v => opts.some(opt => opt.value === v));
        if (validReSel.length > 0) choicesNf.setValue(validReSel);
    }
    isRefreshingFilters = false;
  }

  function checkLayout() { /* ... Sua função ... */ 
    const isMobile = window.innerWidth <= 768;
    const isTablet = window.innerWidth > 768 && window.innerWidth <= 992;
    if (isMobile) { sidebar.classList.remove('collapsed'); mainContent.classList.remove('full-width'); } 
    else if (isTablet) { sidebar.classList.remove('open'); if (!sidebar.classList.contains('collapsed')) { sidebar.classList.add('collapsed'); mainContent.classList.add('full-width'); } } 
    else { sidebar.classList.remove('open'); }
  }

  // --- INICIALIZAÇÃO ---

  // ✅ NOVA LÓGICA DE INICIALIZAÇÃO PARA EVITAR LOOP
  async function initializeApp() {
    // 1. Busca os dados do usuário e ajusta a UI (menu, nome)
    const userInfo = await setupUserSpecificUI();

    // 2. Verifica se devemos redirecionar o usuário ANTES de carregar o conteúdo
    if (userInfo && userInfo.orgao && userInfo.orgao.toUpperCase() !== "ADMINISTRATIVO") {
        // Se o usuário é do financeiro e está na página raiz, mude o hash para #financeiro
        const currentHash = window.location.hash;
        if (currentHash === "" || currentHash === "#" || currentHash === "#painel-geral") {
            window.location.hash = '#financeiro';
        }
    }

    // 3. Agora, carregue o conteúdo da rota correta (seja a padrão ou a que acabamos de definir)
    handleHashChange(); 
    
    // 4. Ajusta o layout inicial
    checkLayout(); 
    window.addEventListener('resize', checkLayout);
  }

  initializeApp(); // Inicia a aplicação com a nova lógica!


}); // Fim do DOMContentLoaded principal