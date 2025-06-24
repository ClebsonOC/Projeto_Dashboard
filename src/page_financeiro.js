// src/page_financeiro.js

// ✅ 1. IMPORTAÇÃO CORRIGIDA
import { CSV_HEADERS } from './config.js';

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

function getStatusClass(statusText = '') {
    const status = String(statusText).toLowerCase();
    if (status.includes('recebido')) return 'status-recebido';
    if (status.includes('aguardando pagamento')) return 'status-aguardando';
    if (status.includes('aguardando liberação')) return 'status-perigo';
    return '';
}

function parseTsvData(tsvText, skipHeader = true) {
    if (!tsvText || typeof tsvText !== 'string') return [];
    const lines = tsvText.trim().split('\n');
    const dataLines = skipHeader ? lines.slice(1) : lines;
    return dataLines.map(line => line.split('\t').map(cell => cell.trim()));
}

// ✅ 2. ASSINATURA DA FUNÇÃO SIMPLIFICADA
export async function initFinanceiroPage(initializeFiltersCallback) {
    console.log("Página Financeiro: Iniciando carregamento de dados do backend...");

    const backendDataUrl = "/api/financeiro-data";
    const tableBody = document.getElementById('financeiroTableBody');
    const kpiRecebimentoLiquidoEl = document.getElementById('kpiRecebimentoLiquido');
    const kpiAguardandoPagamentoEl = document.getElementById('kpiAguardandoPagamento');
    const kpiAguardandoLiberacaoEl = document.getElementById('kpiAguardandoLiberacao');
    const totalExecutadoCell = document.getElementById('financeiroTotalExecutado');
    const progressBar = document.getElementById('financeiroProgressBar');

    // ... (lógica inicial de 'Carregando...' nos KPIs e tabela)

    try {
        const response = await fetch(backendDataUrl);
        if (!response.ok) throw new Error(`Erro ao buscar dados do backend: ${response.status}`);
        
        const tsvText = await response.text();
        const lines = tsvText.trim().split('\n');

        if (lines.length <= 1) {
             // ... (Lógica para tratar TSV vazio)
             if (typeof initializeFiltersCallback === 'function') {
                initializeFiltersCallback([]);
            }
            return;
        }

        const headerRow = lines[0].split('\t').map(h => h.trim());
        const headerMap = new Map(headerRow.map((header, index) => [header, index]));
        const dataRows = parseTsvData(tsvText, true);

        let totalExecutado = 0, recebimentoLiquidoCalc = 0, aguardandoPagamentoCalc = 0, aguardandoLiberacaoCalc = 0;
        const processedRowsData = [];

        dataRows.forEach(row => {
            const medicaoOriginal = row[headerMap.get(CSV_HEADERS.MEDICAO)];
            if (!medicaoOriginal || medicaoOriginal.trim() === '') {
                return; // Pula linhas sem medição
            }
            
            // ... (Toda a sua lógica de processamento de cada linha da planilha)
            const orgao = row[headerMap.get(CSV_HEADERS.ORGAO)] || '';
            const centro_de_custo = row[headerMap.get(CSV_HEADERS.CENTRO_DE_CUSTO)] || '';
            const objeto = row[headerMap.get(CSV_HEADERS.OBJETO)] || '';
            const obra = `${centro_de_custo.trim()} - ${objeto.trim()}`;
            const medicao = medicaoOriginal;
            const periodo = row[headerMap.get(CSV_HEADERS.PERIODO)] || '';
            const executadoStr = row[headerMap.get(CSV_HEADERS.EXECUTADO_R$)] || '0';
            const nf = row[headerMap.get(CSV_HEADERS.NF)] || '';
            const dataProtocolo = row[headerMap.get(CSV_HEADERS.DATA_PROTOCOLO)] || '';
            const numProcesso = row[headerMap.get(CSV_HEADERS.N_PROCESSO1)] || '';
            const statusCol = row[headerMap.get(CSV_HEADERS.STATUS2)] || '';
            const dataPagtStr = row[headerMap.get(CSV_HEADERS.DATA_PAGT)] || '';
            const valorPagtStr = row[headerMap.get(CSV_HEADERS.VALOR_PAGO)] || '0';
            const legenda = row[headerMap.get(CSV_HEADERS.LEGENDA)] || '';
            const executadoValor = parseCurrency(executadoStr);
            const valorPagoReal = parseCurrency(valorPagtStr);

            totalExecutado += executadoValor;
            if (legenda === '1') recebimentoLiquidoCalc += valorPagoReal;
            else if (legenda === '2') aguardandoPagamentoCalc += executadoValor;
            else if (legenda === '3') aguardandoLiberacaoCalc += executadoValor;

            processedRowsData.push({
                orgaoFormatted: orgao, obraFormatted: obra, medicaoFormatted: medicao, periodoFormatted: periodo,
                executadoFormatted: formatCurrency(executadoStr), nfFormatted: nf,
                dataProtocoloFormatted: dataProtocolo, numProcessoFormatted: numProcesso, statusFormatted: statusCol,
                dataPagtFormatted: dataPagtStr, valorPagtFormatted: formatCurrency(valorPagtStr), statusClass: getStatusClass(statusCol),
                rawLegenda: legenda, rawOrgao: orgao, rawObraConcatenated: obra, rawDatePagt: dataPagtStr,
                rawNf: nf, rawNumProcesso1: numProcesso, rawExecutadoValor: executadoValor, rawValorPagoReal: valorPagoReal
            });
        });
        
        // ✅ CHAMADA ÚNICA E CORRETA PARA O CALLBACK
        if (typeof initializeFiltersCallback === 'function') {
            initializeFiltersCallback(processedRowsData);
        }
        
        // ... (Atualização final dos KPIs e da barra de progresso)
        if (totalExecutadoCell) totalExecutadoCell.innerHTML = `<strong>${formatCurrency(totalExecutado)}</strong>`;
        if (kpiRecebimentoLiquidoEl) kpiRecebimentoLiquidoEl.textContent = formatCurrency(recebimentoLiquidoCalc);
        // ... etc

    } catch (error) {
        console.error('Erro ao processar dados financeiros:', error);
        // ... (Tratamento de erro na UI)

        // ✅ GARANTE QUE O CALLBACK SEJA CHAMADO MESMO COM ERRO PARA LIMPAR A TELA
        if (typeof initializeFiltersCallback === 'function') {
            initializeFiltersCallback([]);
        }
    }
}