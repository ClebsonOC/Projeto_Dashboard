// page_financeiro.js
import { CSV_HEADERS } from './csv_column_headers.js'; // Verifique se este arquivo está correto e necessário

// ... (parseCurrency, formatCurrency, getStatusClass, parseTsvData - sem alterações) ...
export function parseCurrency(value) { 
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;
    const clean = value.replace(/R\$\s*/g, '').replace(/\./g, '').replace(/,/g, '.').trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
}
export function formatCurrency(value) { 
    const number = parseCurrency(value);
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function getStatusClass(statusText = '') { /* ... sua função ... */ 
    const status = String(statusText).toLowerCase();
    if (status.includes('recebido')) return 'status-recebido';
    if (status.includes('aguardando pagamento')) return 'status-aguardando';
    if (status.includes('aguardando liberação')) return 'status-perigo';
    return '';
}
function parseTsvData(tsvText, skipHeader = true) { /* ... sua função ... */ 
    if (!tsvText || typeof tsvText !== 'string') return [];
    const lines = tsvText.trim().split('\n');
    const dataLines = skipHeader ? lines.slice(1) : lines;
    return dataLines.map(line => line.split('\t').map(cell => cell.trim()));
}


export async function initFinanceiroPage(applyFiltersCallback, populateFilterDropdownsCallback) {
    console.log("Página Financeiro: Iniciando carregamento de dados do backend...");

    // ALTERADO: Busca do novo endpoint do backend
    const backendDataUrl = "/api/financeiro-data"; 

    const kpiRecebimentoLiquidoEl = document.getElementById('kpiRecebimentoLiquido');
    const kpiAguardandoPagamentoEl = document.getElementById('kpiAguardandoPagamento');
    const kpiAguardandoLiberacaoEl = document.getElementById('kpiAguardandoLiberacao');
    const tableBody = document.getElementById('financeiroTableBody');
    const totalExecutadoCell = document.getElementById('financeiroTotalExecutado');
    const progressBar = document.getElementById('financeiroProgressBar');

    if (tableBody) tableBody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding: 20px;">Buscando dados...</td></tr>';
    // ... (reset de KPIs) ...
    if (kpiRecebimentoLiquidoEl) kpiRecebimentoLiquidoEl.textContent = 'Carregando...';
    if (kpiAguardandoPagamentoEl) kpiAguardandoPagamentoEl.textContent = 'Carregando...';
    if (kpiAguardandoLiberacaoEl) kpiAguardandoLiberacaoEl.textContent = 'Carregando...';

    try {
        const response = await fetch(backendDataUrl); // Busca do novo endpoint
        if (!response.ok) {
            let errorText = `Erro ao buscar dados do backend: ${response.status} ${response.statusText}`;
            try { const errorData = await response.text(); errorText += ` - ${errorData}`; } catch (e) {}
            throw new Error(errorText);
        }
        const tsvText = await response.text(); // O backend envia o TSV filtrado

        // O restante desta função para processar o tsvText permanece igual
        // pois o formato dos dados recebidos (TSV) não mudou.
        const lines = tsvText.trim().split('\n');
        if (lines.length <= 1 && !lines[0]) { // Verifica se o TSV está vazio ou só tem cabeçalho vazio
            console.warn("TSV Vazio ou apenas com cabeçalho recebido do backend.");
            if (tableBody) tableBody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding: 20px;">Nenhum dado disponível para este usuário.</td></tr>';
            if (totalExecutadoCell) totalExecutadoCell.innerHTML = `<strong>${formatCurrency(0)}</strong>`;
            if (progressBar) progressBar.style.width = '0%';
            if (kpiRecebimentoLiquidoEl) kpiRecebimentoLiquidoEl.textContent = formatCurrency(0);
            if (kpiAguardandoPagamentoEl) kpiAguardandoPagamentoEl.textContent = formatCurrency(0);
            if (kpiAguardandoLiberacaoEl) kpiAguardandoLiberacaoEl.textContent = formatCurrency(0);
            // Chama callbacks com dados vazios para limpar os filtros
            if (typeof applyFiltersCallback === 'function') applyFiltersCallback([]);
            if (typeof populateFilterDropdownsCallback === 'function') populateFilterDropdownsCallback([]);
            return;
        }
        
        const headerRow = lines[0].split('\t').map(h => h.trim());
        const headerMap = new Map();
        headerRow.forEach((header, index) => headerMap.set(header, index));
        const dataRows = parseTsvData(tsvText, true);

        if (tableBody) tableBody.innerHTML = '';

        if (dataRows.length === 0) {
            if (tableBody) tableBody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding: 20px;">Nenhum dado disponível para este usuário.</td></tr>';
             // ... (resetar KPIs e totais para zero) ...
            if (totalExecutadoCell) totalExecutadoCell.innerHTML = `<strong>${formatCurrency(0)}</strong>`;
            if (progressBar) progressBar.style.width = '0%';
            if (kpiRecebimentoLiquidoEl) kpiRecebimentoLiquidoEl.textContent = formatCurrency(0);
            if (kpiAguardandoPagamentoEl) kpiAguardandoPagamentoEl.textContent = formatCurrency(0);
            if (kpiAguardandoLiberacaoEl) kpiAguardandoLiberacaoEl.textContent = formatCurrency(0);
            if (typeof applyFiltersCallback === 'function') applyFiltersCallback([]);
            if (typeof populateFilterDropdownsCallback === 'function') populateFilterDropdownsCallback([]);
            return;
        }

        let totalExecutado = 0;
        let recebimentoLiquidoCalc = 0;
        let aguardandoPagamentoCalc = 0;
        let aguardandoLiberacaoCalc = 0;
        const processedRowsData = [];
        
        dataRows.forEach(row => {
            const orgao = row[headerMap.get(CSV_HEADERS.ORGAO)] || '';
            const centro_de_custo = row[headerMap.get(CSV_HEADERS.CENTRO_DE_CUSTO)] || '';
            const objeto = row[headerMap.get(CSV_HEADERS.OBJETO)] || '';
            const obra = `${centro_de_custo.trim()} - ${objeto.trim()}`;
            const medicao = row[headerMap.get(CSV_HEADERS.MEDICAO)] || '';
            const periodoCompleto = row[headerMap.get(CSV_HEADERS.PERIODO)] || '';
            const partesDoPeriodo = periodoCompleto.split('A');
            const periodoString = partesDoPeriodo[0]?.trim() || ''; 
            let periodoFormatado = '';
            if (periodoString) { /* ... lógica de formatação de período ... */ 
                let dateObject; const partsDate = periodoString.split('/');
                if (partsDate.length === 3) { const day = parseInt(partsDate[0], 10); const month = parseInt(partsDate[1], 10) - 1; let year = parseInt(partsDate[2], 10); if (year < 100) year = (year < 70) ? (2000 + year) : (1900 + year); dateObject = new Date(year, month, day); if (!isNaN(dateObject) && dateObject.getDate() === day && dateObject.getMonth() === month && dateObject.getFullYear() === year) periodoFormatado = new Intl.DateTimeFormat('pt-BR').format(dateObject); }
                else if (partsDate.length === 2) { const month = parseInt(partsDate[0], 10) - 1; const year = parseInt(partsDate[1], 10); dateObject = new Date(year, month, 1); if (!isNaN(dateObject) && dateObject.getMonth() === month && dateObject.getFullYear() === year) periodoFormatado = `${(month + 1).toString().padStart(2, '0')}/${year}`; }
            }
            const periodo = periodoFormatado || periodoString;
            const executadoStr = row[headerMap.get(CSV_HEADERS.EXECUTADO_R$)] || '0';
            const nf = row[headerMap.get(CSV_HEADERS.NF)] || ''; // Mantém original para nfFormatted
            const dataProtocolo = row[headerMap.get(CSV_HEADERS.DATA_PROTOCOLO)] || '';
            const numProcesso = row[headerMap.get(CSV_HEADERS.N_PROCESSO1)] || '';
            const statusCol = row[headerMap.get(CSV_HEADERS.STATUS2)] || '';
            const dataPagtStr = row[headerMap.get(CSV_HEADERS.DATA_PAGT)] || '';
            const valorPagtStr = row[headerMap.get(CSV_HEADERS.VALOR_PAGO)] || '0';
            const legenda = row[headerMap.get(CSV_HEADERS.LEGENDA)] || '';
            const numProcesso1Raw = row[headerMap.get(CSV_HEADERS.N_PROCESSO1)] || '';
            let dataPagtFormatada = '';
            if (dataPagtStr) { /* ... lógica de formatação de dataPagt ... */ 
                 let dateObjectPagt; const partsPagtDate = dataPagtStr.split('/');
                 if (partsPagtDate.length === 3) { const day = parseInt(partsPagtDate[0], 10); const month = parseInt(partsPagtDate[1], 10) - 1; let year = parseInt(partsPagtDate[2], 10); if (year < 100) year = (year < 70) ? (2000 + year) : (1900 + year); dateObjectPagt = new Date(year, month, day); if (!isNaN(dateObjectPagt) && dateObjectPagt.getDate() === day && dateObjectPagt.getMonth() === month && dateObjectPagt.getFullYear() === year) dataPagtFormatada = new Intl.DateTimeFormat('pt-BR').format(dateObjectPagt); }
            }
            const dataPagt = dataPagtFormatada || dataPagtStr;
            const executadoValor = parseCurrency(executadoStr);
            const valorPagoReal = parseCurrency(valorPagtStr);
            totalExecutado += executadoValor;
            if (legenda === '1') recebimentoLiquidoCalc += valorPagoReal;
            else if (legenda === '2') aguardandoPagamentoCalc += executadoValor;
            else if (legenda === '3') aguardandoLiberacaoCalc += executadoValor;

            processedRowsData.push({
                orgaoFormatted: orgao, obraFormatted: obra, medicaoFormatted: medicao, periodoFormatted: periodo,
                executadoFormatted: formatCurrency(executadoStr), nfFormatted: nf, // NF original
                dataProtocoloFormatted: dataProtocolo, numProcessoFormatted: numProcesso, statusFormatted: statusCol,
                dataPagtFormatted: dataPagt, valorPagtFormatted: formatCurrency(valorPagtStr), statusClass: getStatusClass(statusCol),
                rawLegenda: legenda, rawOrgao: orgao, rawObraConcatenated: obra, rawDatePagt: dataPagtStr, 
                rawCentroCusto: row[headerMap.get(CSV_HEADERS.CENTRO_DE_CUSTO)] || '', rawObjeto: row[headerMap.get(CSV_HEADERS.OBJETO)] || '',
                rawNf: nf, rawNumProcesso1: numProcesso1Raw, rawExecutadoValor: executadoValor, rawValorPagoReal: valorPagoReal
            });
        });

        if (typeof applyFiltersCallback === 'function') applyFiltersCallback(processedRowsData);
        if (typeof populateFilterDropdownsCallback === 'function') populateFilterDropdownsCallback(processedRowsData);

        if (totalExecutadoCell) totalExecutadoCell.innerHTML = `<strong>${formatCurrency(totalExecutado)}</strong>`;
        if (kpiRecebimentoLiquidoEl) kpiRecebimentoLiquidoEl.textContent = formatCurrency(recebimentoLiquidoCalc);
        if (kpiAguardandoPagamentoEl) kpiAguardandoPagamentoEl.textContent = formatCurrency(aguardandoPagamentoCalc);
        if (kpiAguardandoLiberacaoEl) kpiAguardandoLiberacaoEl.textContent = formatCurrency(aguardandoLiberacaoCalc);
        if (progressBar && totalExecutado > 0) {
            const progressoPercentual = Math.min((recebimentoLiquidoCalc / totalExecutado) * 100, 100);
            progressBar.style.width = progressoPercentual.toFixed(2) + '%';
        } else if (progressBar) { progressBar.style.width = '0%'; }

    } catch (error) {
        console.error('Erro ao processar dados financeiros:', error);
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="11" style="text-align:center; color:red; padding: 20px;">Erro ao carregar ou processar dados: ${error.message}.</td></tr>`;
        // ... (resetar KPIs para zero em caso de erro) ...
        if (kpiRecebimentoLiquidoEl) kpiRecebimentoLiquidoEl.textContent = formatCurrency(0);
        if (kpiAguardandoPagamentoEl) kpiAguardandoPagamentoEl.textContent = formatCurrency(0);
        if (kpiAguardandoLiberacaoEl) kpiAguardandoLiberacaoEl.textContent = formatCurrency(0);
        if (totalExecutadoCell) totalExecutadoCell.innerHTML = `<strong>${formatCurrency(0)}</strong>`;
        if (progressBar) progressBar.style.width = '0%';
        if (typeof applyFiltersCallback === 'function') applyFiltersCallback([]); // Limpa a tabela
        if (typeof populateFilterDropdownsCallback === 'function') populateFilterDropdownsCallback([]); // Limpa os filtros
    }
}