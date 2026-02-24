import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { marked } from "marked";
import path from "path";
import fs from "fs";

// Função para calcular CPA (copiada do microserviço)
function calcularCPA(markdown: string): string {
 
  
  // Múltiplas estratégias para encontrar investimento e pedidos
  let investimento: number | null = null;
  let pedidos: number | null = null;
  
  // Estratégia 1: Buscar investimento e pedidos separadamente (mais robusto)
  const investimentoMatch = markdown.match(/\|\s*Investimento\s+em\s+Ads\s*\|\s*R\$\s*([\d.,]+)\s*\|/i);
  if (investimentoMatch) {
    investimento = parseFloat(investimentoMatch[1].replace(/\./g, '').replace(',', '.'));
  }
  
  const pedidosMatch = markdown.match(/\|\s*Pedidos\s+Pagos\s+Mês\s*\|\s*([\d.]+)\s*\|/i);
  if (pedidosMatch) {
    pedidos = parseInt(pedidosMatch[1].replace(/\./g, ''));
  }
  
  // Estratégia 2: Buscar por padrões de texto mais flexíveis
  if (!investimento) {
    // Buscar investimento em Ads
    const investimentoMatch2 = markdown.match(/(?:Investimento\s+(?:em\s+)?Ads?|Investimento\s+total\s+em\s+Ads?)\s*[:|]\s*R\$\s*([\d.,]+)/i);
    if (investimentoMatch2) {
      investimento = parseFloat(investimentoMatch2[1].replace(/\./g, '').replace(',', '.'));
    }
  }
  
  if (!pedidos) {
    // Buscar pedidos pagos
    const pedidosMatch2 = markdown.match(/(?:Pedidos\s+Pagos(?:\s+Mês)?|Pedidos\s+via\s+Ads?|Pedidos\s+Pagos\s+Mês)\s*[:|]\s*([\d.]+)/i);
    if (pedidosMatch2) {
      pedidos = parseInt(pedidosMatch2[1].replace(/\./g, ''));
    }
  }
  
  // Estratégia 3: Buscar por valores na tabela de forma mais genérica
  if (!investimento) {
    // Buscar qualquer valor R$ na linha do investimento
    const investimentoLinha = markdown.match(/\|\s*Investimento\s+em\s+Ads\s*\|\s*R\$\s*([\d.,]+)\s*\|/i);
    if (investimentoLinha) {
      investimento = parseFloat(investimentoLinha[1].replace(/\./g, '').replace(',', '.'));
    }
  }
  
  if (!pedidos) {
    // Buscar qualquer número na linha dos pedidos
    const pedidosLinha = markdown.match(/\|\s*Pedidos\s+Pagos\s+Mês\s*\|\s*([\d.]+)\s*\|/i);
    if (pedidosLinha) {
      pedidos = parseInt(pedidosLinha[1].replace(/\./g, ''));
    }
  }
  
  // Estratégia 4: Buscar por valores isolados no contexto
  if (!investimento) {
    // Buscar investimento próximo à palavra "Ads"
    const investimentoContexto = markdown.match(/R\$\s*([\d.,]+)(?=\s*[^|]*Ads)/i);
    if (investimentoContexto) {
      investimento = parseFloat(investimentoContexto[1].replace(/\./g, '').replace(',', '.'));
    }
  }
  
  if (!pedidos) {
    // Buscar pedidos próximo à palavra "Pedidos"
    const pedidosContexto = markdown.match(/([\d.]+)(?=\s*[^|]*Pedidos)/i);
    if (pedidosContexto) {
      pedidos = parseInt(pedidosContexto[1].replace(/\./g, ''));
    }
  }
  
  // Estratégia 5: Busca mais agressiva para dados
  if (!investimento) {
    // Buscar qualquer valor R$ na linha que contenha "Investimento"
    const investimentoAgressivo = markdown.match(/\|\s*[^|]*Investimento[^|]*\|\s*R\$\s*([\d.,]+)\s*\|/i);
    if (investimentoAgressivo) {
      investimento = parseFloat(investimentoAgressivo[1].replace(/\./g, '').replace(',', '.'));
    }
  }
  
  if (!pedidos) {
    // Buscar qualquer número na linha que contenha "Pedidos"
    const pedidosAgressivo = markdown.match(/\|\s*[^|]*Pedidos[^|]*\|\s*([\d.]+)\s*\|/i);
    if (pedidosAgressivo) {
      pedidos = parseInt(pedidosAgressivo[1].replace(/\./g, ''));
    }
  }


  if (investimento && pedidos && pedidos > 0 && !isNaN(investimento)) {
    const cpa = (investimento / pedidos).toFixed(2);
    const cpaFormatado = cpa.replace('.', ',');
    
    let markdownAtualizado = markdown;
    
    // Limpar linha malformada do CPA primeiro
    markdownAtualizado = markdownAtualizado.replace(
      /\|\s*CPA\s*\|\s*R\$[\d.,]+\s*\|\s*CPA\s*\|\s*[\d.,]+\s*\|/gi,
      '| CPA | Dado não informado |'
    );
    
    // Limpar qualquer CPA malformado primeiro (incluindo RCPA)
    markdownAtualizado = markdownAtualizado.replace(
      /\|\s*CPA\s*\|\s*R?CPA\s*\|\s*[\d.,]+\s*\|/gi,
      '| CPA | Dado não informado |'
    );
    
    // Limpar RCPA isolado
    markdownAtualizado = markdownAtualizado.replace(
      /\|\s*CPA\s*\|\s*RCPA\s*\|/gi,
      '| CPA | Dado não informado |'
    );
    
    // Limpar RCPA em qualquer formato
    markdownAtualizado = markdownAtualizado.replace(
      /RCPA/g,
      'Dado não informado'
    );
    
    // Limpar CPA malformado em qualquer formato
    markdownAtualizado = markdownAtualizado.replace(
      /\|\s*CPA\s*\|\s*[^|]*R[^|]*\|/gi,
      '| CPA | Dado não informado |'
    );
    
    // Atualizar CPA em todas as ocorrências possíveis
    markdownAtualizado = markdownAtualizado.replace(
      /(CPA\s*(?:Médio|via Ads|geral)?\s*[:|])\s*(?:Dado não informado|R\$\s*[\d.,]+|R?CPA\s*\|\s*[\d.,]+)/gi,
      `$1 ${cpaFormatado}`
    );
    
    // Atualizar CPA na tabela se existir
    markdownAtualizado = markdownAtualizado.replace(
      /(\|\s*CPA\s*\|\s*)(?:Dado não informado|R\$\s*[\d.,]+|R?CPA\s*\|\s*[\d.,]+)(\s*\|)/gi,
      `$1${cpaFormatado}$2`
    );
    
    // Forçar atualização de qualquer CPA existente (incluindo RCPA)
    markdownAtualizado = markdownAtualizado.replace(
      /(CPA\s*[:|]\s*)R?CPA/gi,
      `$1${cpaFormatado}`
    );
    
    // Forçar atualização de qualquer CPA existente
    markdownAtualizado = markdownAtualizado.replace(
      /(CPA\s*[:|]\s*)R\$\s*[\d.,]+/gi,
      `$1${cpaFormatado}`
    );
    
    // Substituição específica para tabelas markdown
    markdownAtualizado = markdownAtualizado.replace(
      /\|\s*CPA\s*\|\s*[^|]*\|/gi,
      `| CPA | ${cpaFormatado} |`
    );
    
    // Corrigir qualquer linha de tabela que contenha CPA
    markdownAtualizado = markdownAtualizado.replace(
      /\|\s*CPA\s*\|\s*.*?\|/gi,
      `| CPA | ${cpaFormatado} |`
    );
    
    // Remover colunas extras do CPA se existirem
    markdownAtualizado = markdownAtualizado.replace(
      /(\|\s*CPA\s*\|\s*R\$[\d.,]+\s*)\|\s*CPA\s*\|\s*[\d.,]+\s*\|/gi,
      '$1|'
    );
    
    // Adicionar CPA na tabela se não existir
    if (!markdownAtualizado.includes(`CPA | ${cpaFormatado}`)) {
      // Tentar adicionar após investimento
      markdownAtualizado = markdownAtualizado.replace(
        /(\|\s*Investimento\s+em\s+Ads\s*\|\s*R\$[\d.,]+\s*\|)/i,
        `$1\n| CPA | ${cpaFormatado} |`
      );
      
      // Se ainda não encontrou, tentar após ROAS
      if (!markdownAtualizado.includes(`CPA | ${cpaFormatado}`)) {
        markdownAtualizado = markdownAtualizado.replace(
          /(\|\s*ROAS\s*\|\s*[\d.,]+\s*\|)/i,
          `$1\n| CPA | ${cpaFormatado} |`
        );
      }
    }
    
    // Verificação final: forçar atualização de qualquer CPA restante
    const cpaEscaped = cpaFormatado.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    markdownAtualizado = markdownAtualizado.replace(
      new RegExp(`\\|\\s*CPA\\s*\\|\\s*(?!${cpaEscaped})[^|]*\\|`, 'gi'),
      `| CPA | ${cpaFormatado} |`
    );
    
    // Última verificação: substituir qualquer CPA restante
    markdownAtualizado = markdownAtualizado.replace(
      /\|\s*CPA\s*\|\s*(?!19,54)[^|]*\|/gi,
      `| CPA | ${cpaFormatado} |`
    );
    
    
    // Verificação final: confirmar que o CPA foi atualizado
    if (markdownAtualizado.includes(cpaFormatado)) {
      
      // Verificar se ainda há RCPA no resultado
      if (markdownAtualizado.includes('RCPA')) {
        markdownAtualizado = markdownAtualizado.replace(/RCPA/g, cpaFormatado);
      }
    } else {
    }
    
    return markdownAtualizado;
  } else {
    console.log(' Não foi possível calcular CPA - dados insuficientes ou inválidos');
    console.log('Investimento:', investimento, 'Pedidos:', pedidos);
    
    // Tentar encontrar os dados de forma mais agressiva
    const todosValores = markdown.match(/R\$\s*([\d.,]+)/g);
    const todosNumeros = markdown.match(/(\d+)/g);
    console.log('Todos os valores R$ encontrados:', todosValores);
    console.log('Todos os números encontrados:', todosNumeros);
  }
  
  return markdown;
}

const TIMEOUT = 120000; // 2 minutos

const launchBrowser = async (retryCount = 0) => {
  const maxRetries = 3;
  try {
    return await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none'
      ]
    });
  } catch (error) {
    if (retryCount < maxRetries) {
      await delay(2000);
      return launchBrowser(retryCount + 1);
    }
    throw error;
  }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isPageHealthy = async (page: any) => {
  try {
    await page.evaluate(() => document.readyState);
    return true;
  } catch {
    return false;
  }
};

const PDF_MICRO_PATH = "/analisepdf";
const DEFAULT_PDF_MICRO_URL = "https://analysis-micro.onrender.com";

function getPdfMicroUrl(): string | null {
  const env = process.env.ANALYSIS_MICROSERVICE_URL;
  if (env && env.length > 0) return env.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return DEFAULT_PDF_MICRO_URL;
  return null;
}

async function generatePdfViaMicro(
  markdown: string,
  clientName: string,
  analysisType: string
): Promise<NextResponse> {
  const base = getPdfMicroUrl();
  if (!base) throw new Error("PDF micro URL not configured");
  const pdfUrl = `${base}${PDF_MICRO_PATH}`;
  const microRes = await fetch(pdfUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markdown, clientName, analysisType }),
  });
  if (!microRes.ok) {
    const errText = await microRes.text();
    console.error("PDF microservice error:", microRes.status, errText);
    return NextResponse.json(
      {
        message: "Error generating PDF",
        error: `Microservice returned ${microRes.status}: ${errText.slice(0, 200)}`,
      },
      { status: 500 }
    );
  }
  const pdfBuffer = Buffer.from(await microRes.arrayBuffer());
  const sanitizedClientName = clientName
    .replace(/[áàãâä]/gi, "a")
    .replace(/[éèêë]/gi, "e")
    .replace(/[íìîï]/gi, "i")
    .replace(/[óòõôö]/gi, "o")
    .replace(/[úùûü]/gi, "u")
    .replace(/[ç]/gi, "c")
    .replace(/[^a-z0-9]/gi, "_")
    .substring(0, 50)
    .trim();
  const response = new NextResponse(pdfBuffer);
  response.headers.set("Content-Type", "application/pdf");
  response.headers.set(
    "Content-Disposition",
    `attachment; filename="relatorio_${sanitizedClientName}.pdf"`
  );
  return response;
}

export async function POST(request: NextRequest) {
  let browser = null;
  let page = null;

  try {
    const body = await request.json();
    const { markdown, clientName, analysisType = "account" } = body;
    const analysisTypeStr = typeof analysisType === "string" ? analysisType : "account";

    if (!markdown || typeof markdown !== 'string') {
      return NextResponse.json(
        { message: "Invalid markdown content" },
        { status: 400 }
      );
    }

    if (!clientName || typeof clientName !== 'string') {
      return NextResponse.json(
        { message: "Invalid client name" },
        { status: 400 }
      );
    }

    // Em produção não há Chrome. Usar microserviço (Browserless) quando a URL estiver definida ou em NODE_ENV=production.
    if (getPdfMicroUrl()) {
      return generatePdfViaMicro(markdown, clientName, analysisTypeStr);
    }

    // Calcular CPA antes de converter para HTML (fluxo local com Puppeteer)
    const markdownComCPA = calcularCPA(markdown);

    let htmlContent = await marked(markdownComCPA);
    
    // Seu código de pré-processamento HTML existente
    htmlContent = htmlContent
      .replace(/<h1>(.*?)🟨(.*?)🚀(.*?)<\/h1>/gi, '<h1 class="titulo-principal">$1��$2🚀$3</h1>')
      .replace(/<p>(Loja:.*?)<\/p>/gi, '<div class="loja-info"><p>$1</p></div>')
      .replace(/<p>(Período Analisado:.*?)<\/p>/gi, '<div class="loja-info"><p>$1</p></div>')
      
      // Seção de métricas (Express)
      .replace(/<h2>🔢 MÉTRICAS-CHAVE<\/h2>/gi, '<h2>🔢 MÉTRICAS-CHAVE</h2><div class="metricas-chave">')
      .replace(/<h2>📊 DIAGNÓSTICO TÉCNICO DO FUNIL<\/h2>/gi, '</div><h2>📊 DIAGNÓSTICO TÉCNICO DO FUNIL</h2>')
      
      // Seções específicas de ADS
      .replace(/<h1>🔍 <strong>VISÃO GERAL DO DESEMPENHO – ADS<\/strong><\/h1>/gi, '<h1 class="ads-titulo">🔍 VISÃO GERAL DO DESEMPENHO – ADS</h1><div class="ads-visao-geral">')
      .replace(/<h1>🔎 <strong>ANÁLISE SKU A SKU – CAMPANHAS DE ANÚNCIOS<\/strong><\/h1>/gi, '</div><h1 class="ads-titulo">🔎 ANÁLISE SKU A SKU – CAMPANHAS DE ANÚNCIOS</h1><div class="ads-analise-sku">')
      .replace(/<h2>CONCLUSÃO FINAL – PLANO RECOMENDADO<\/h2>/gi, '</div><div class="page-break-before"><h2 class="ads-conclusao-titulo">CONCLUSÃO FINAL – PLANO RECOMENDADO</h2><div class="ads-conclusao">')
      
      // Produtos ADS (evitar quebras)
      .replace(/<p><strong>Produto: (.*?)<\/strong><\/p>/gi, '</div><div class="produto-ads no-break"><strong>Produto: $1</strong>')
      
      // Alertas críticos
      .replace(/<p>(.*?📣.*?)<\/p>/gi, '<div class="alerta-critico"><p>$1</p></div>')
      
      // Tabelas com classe específica
      .replace(/<h2>🔍 DIAGNÓSTICO POR PRODUTO – TOP 5 MAIS RELEVANTES<\/h2>\s*<table>/gi, '<h2>🔍 DIAGNÓSTICO POR PRODUTO – TOP 5 MAIS RELEVANTES</h2><div class="table-container"><table class="tabela-analise diagnostico-produto">')
      .replace(/<table>/gi, '<div class="table-container"><table class="tabela-analise">')
      .replace(/<\/table>/gi, '</table></div>')
      
      // Seções de diagnóstico
      .replace(/<p>(.*?ANÁLISE FINALIZADA.*?)<\/p>/gi, '<div class="finalizacao"><p>$1</p></div>')

      // CHECKLIST: Remover ☐ do texto e substituir por div estruturada
      .replace(/✅ CHECKLIST OPERACIONAL SEMANAL/gi, '<h2>✅ CHECKLIST OPERACIONAL SEMANAL</h2><div class="checklist-container">')
      .replace(/☐ ([^☐]*?)(?=☐|Observações:|$)/gi, (match, content) => {
        // Remover o ☐ inicial e processar o conteúdo
        const cleanContent = content.trim();
        
        // Separar Status: ☐Sim ☐Não em checkboxes individuais
        const processedContent = cleanContent
          .replace(/Status:\s*☐Sim\s*☐Não/gi, 'Status: <span class="status-checkboxes"><label class="checkbox-sim"><input type="checkbox"> Sim</label><label class="checkbox-nao"><input type="checkbox"> Não</label></span>')
          .replace(/☐Sim/gi, '<label class="checkbox-sim"><input type="checkbox"> Sim</label>')
          .replace(/☐Não/gi, '<label class="checkbox-nao"><input type="checkbox"> Não</label>');
        
        return `<div class="checklist-item">${processedContent}</div>`;
      })
      .replace(/<p>Observações:<\/p>/gi, '</div><div class="observacoes-container"><p><strong>Observações:</strong></p>')

    // Lê o papel timbrado como base64
    let papelTimbradoBase64 = "";
    try {
      const papelTimbradoPath = path.resolve(
        process.cwd(),
        "public/assets/modelorelatoriologo.png"
      );
      papelTimbradoBase64 = fs.readFileSync(papelTimbradoPath, {
        encoding: "base64",
      });
    } catch (err) {
      console.error("Erro ao ler papel timbrado:", err);
      return NextResponse.json(
        { message: "Erro ao ler papel timbrado", error: String(err) },
        { status: 500 }
      );
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório - ${clientName}</title>
        <style>
          body {
            font-family: 'Inter', Arial, sans-serif;
            color: #1a1a1a;
            margin: 0;
            padding: 0;
            font-size: 12px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #content {
            max-width: 180mm;
            margin: 0 auto;
            padding: 0 0 24mm 0;
            background: transparent;
            box-sizing: border-box;
            min-height: 0;
            display: block;
            text-align: left;
          }
          #content p, #content li, #content td, #content th {
            color: #1a1a1a;
          }
          
          /* Títulos principais centralizados */
          h1 {
            color: #c2410c;
            font-weight: bold;
            font-size: 1.35rem;
            text-align: center;
            margin-top: 0;
            margin-bottom: 12px;
            page-break-inside: avoid;
            page-break-after: avoid;
            padding: 8px 0;
            border-bottom: 2px solid #ea580c;
          }
          
          /* Seções principais */
          h2 {
            color: #c2410c;
            font-weight: bold;
            font-size: 1.1rem;
            margin-top: 16px;
            margin-bottom: 8px;
            border-bottom: 2px solid #ea580c;
            padding-bottom: 4px;
            page-break-inside: avoid;
            page-break-after: avoid;
            text-align: left;
          }
          
          h3 {
            color: #9a3412;
            font-weight: bold;
            font-size: 1rem;
            margin-top: 12px;
            margin-bottom: 6px;
            page-break-inside: avoid;
            page-break-after: avoid;
          }
          
          /* Listas: cor consistente (evita azul só em alguns itens) */
          #content ul, #content ol {
            color: #1a1a1a;
          }
          #content ul li, #content ol li {
            color: #1a1a1a;
            margin-bottom: 4px;
          }
          
          /* Parágrafos e listas */
          p, ul, ol {
            text-align: justify;
            font-size: 0.9rem;
            line-height: 1.5;
            margin-bottom: 8px;
            page-break-inside: auto;
          }
          
          p:last-child, li:last-child {
            margin-bottom: 0;
          }
          
          /* Métricas em destaque */
          p:contains("Visitantes:"), p:contains("Pedidos Pagos:"), p:contains("Taxa de Conversão:") {
            font-weight: 500;
            color: #333;
          }
          
          /* Alertas críticos */
          p:contains("📣") {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-left: 4px solid #fdcb6e;
            padding: 10px;
            margin: 15px 0;
            border-radius: 4px;
            font-weight: 600;
            color: #856404;
            text-align: center;
            page-break-inside: avoid;
          }
          
          /* Tabelas: bordas visíveis em todas as células */
          table {
            border-collapse: collapse;
            font-size: 0.8rem;
            background: #fff;
            width: 100%;
            margin: 16px 0;
            page-break-inside: auto;
            border: 1px solid #64748b;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          }
          
          th {
            background: #ea580c;
            color: #fff;
            text-align: left;
            font-weight: bold;
            padding: 8px 10px;
            border: 1px solid #c2410c;
            font-size: 0.75rem;
          }
          
          td {
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            text-align: left;
            vertical-align: top;
            font-size: 0.75rem;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          
          /* Zebra suave para legibilidade */
          tbody tr:nth-child(even) {
            background-color: #f8fafc;
          }
          
          tbody tr:nth-child(odd) {
            background-color: #fff;
          }
          
          /* Células com "Dado não disponível" menos chamativas */
          td:not([class]) {
            color: #1a1a1a;
          }
          
          /* Seções de diagnóstico */
          blockquote {
            border-left: 4px solid #1976d2;
            padding-left: 15px;
            padding-right: 10px;
            padding-top: 10px;
            padding-bottom: 10px;
            color: #555;
            margin: 15px 0;
            font-style: italic;
            background: #f5f5f5;
            font-size: 0.9rem;
            border-radius: 0 4px 4px 0;
            page-break-inside: avoid;
          }
          
          /* Separadores */
          hr {
            border: none;
            border-top: 2px solid #1976d2;
            margin: 25px 0;
            width: 80%;
            margin-left: auto;
            margin-right: auto;
          }
          
          /* Evitar quebras de página indesejadas */
          .no-break {
            page-break-inside: avoid;
          }
          
          /* Cabeçalho da loja / Identificação */
          .loja-info {
            text-align: left;
            margin-bottom: 12px;
            page-break-after: avoid;
          }
          
          .loja-info p {
            margin: 4px 0;
            font-size: 0.95rem;
            color: #1a1a1a;
          }
          
          /* Título principal customizado */
          .titulo-principal {
            color: #c2410c;
            font-size: 1.4rem !important;
            font-weight: 800;
            text-align: center;
            margin: 12px 0 16px 0;
            padding: 10px 0;
            border-bottom: 2px solid #ea580c;
            page-break-after: avoid;
          }
          
          /* Seção de métricas */
          .metricas-chave {
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border: 2px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
            page-break-inside: avoid;
            box-shadow: 0 3px 5px rgba(0,0,0,0.08);
          }
          
          .metricas-chave p {
            margin: 6px 0;
            font-size: 0.9rem;
            font-weight: 500;
            color: #333;
            line-height: 1.6;
          }
          
          /* Alerta crítico */
          .alerta-critico {
            background: linear-gradient(135deg, #fff3cd, #ffeaa7);
            border: 2px solid #ffc107;
            border-left: 5px solid #fd7e14;
            padding: 12px;
            margin: 15px 0;
            border-radius: 6px;
            text-align: center;
            page-break-inside: avoid;
            box-shadow: 0 3px 6px rgba(253, 126, 20, 0.15);
          }
          
          .alerta-critico p {
            font-weight: 700;
            color: #856404 !important;
            font-size: 0.9rem;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            line-height: 1.4;
          }
          
          /* Container de tabelas */
          .table-container {
            margin: 12px 0;
            page-break-inside: auto;
            overflow-x: auto;
          }
          
          .tabela-analise {
            width: 100%;
            margin: 0 auto;
            border: 1px solid #64748b;
            border-collapse: collapse;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          }
          
          .tabela-analise th {
            background: #ea580c;
            color: #fff;
            font-weight: 600;
            font-size: 0.7rem;
            padding: 8px 10px;
            text-align: left;
            line-height: 1.2;
            border: 1px solid #c2410c;
          }
          
          .tabela-analise td {
            padding: 8px 10px;
            font-size: 0.75rem;
            border: 1px solid #cbd5e1;
            vertical-align: top;
            line-height: 1.35;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          
          .tabela-analise tbody tr:nth-child(even) {
            background: #f8fafc;
          }
          
          .tabela-analise tbody tr:nth-child(odd) {
            background: #fff;
          }
          
          /* Tabela específica para diagnóstico de produtos (mais compacta) */
          .tabela-analise.diagnostico-produto th {
            font-size: 0.6rem;
            padding: 6px 3px;
          }
          
          .tabela-analise.diagnostico-produto td {
            font-size: 0.6rem;
            padding: 5px 3px;
            max-width: 100px;
          }
          
          /* Finalização */
          .finalizacao {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: linear-gradient(135deg, #e8f5e8, #f1f8e9);
            border: 2px solid #4caf50;
            border-radius: 8px;
            page-break-inside: avoid;
          }
          
          .finalizacao p {
            font-weight: 700;
            color: #2e7d32;
            font-size: 1.1rem;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          /* ========== ESTILOS ESPECÍFICOS PARA ANÁLISE DE ADS ========== */
          
          /* Títulos da análise ADS */
          .ads-titulo {
            color: #1976d2 !important;
            font-size: 1.2rem !important;
            font-weight: 800;
            text-align: center;
            margin: 15px 0 12px 0 !important;
            padding: 10px 0;
            border-bottom: 3px solid #1976d2;
            page-break-after: avoid;
            background: linear-gradient(135deg, #e3f2fd, #bbdefb);
            border-radius: 6px;
          }
          
          /* Seção visão geral ADS */
          .ads-visao-geral {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 12px;
            margin: 10px 0;
            page-break-inside: avoid;
          }
          
          .ads-visao-geral ul, .ads-visao-geral li {
            font-size: 0.85rem;
            line-height: 1.4;
            margin: 4px 0;
          }
          
          /* Seção análise SKU ADS */
          .ads-analise-sku {
            margin: 10px 0;
            page-break-inside: avoid;
          }
          
          /* Produtos ADS - sem quebra de página */
          .produto-ads {
            background: #f5f5f5;
            border: 1px solid #ddd;
            border-left: 4px solid #1976d2;
            border-radius: 6px;
            padding: 12px;
            margin: 8px 0;
            page-break-inside: avoid !important;
            page-break-before: avoid;
            page-break-after: avoid;
          }
          
          .produto-ads strong {
            color: #1976d2;
            font-size: 0.95rem;
            display: block;
            margin-bottom: 8px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 4px;
          }
          
          .produto-ads p {
            font-size: 0.8rem;
            line-height: 1.4;
            margin: 4px 0;
            text-align: left;
          }
          
          .produto-ads ul, .produto-ads li {
            font-size: 0.8rem;
            line-height: 1.4;
            margin: 2px 0;
            text-align: left;
          }
          
          /* Conclusão ADS - página dedicada */
          .page-break-before {
            page-break-before: always !important;
            margin-top: 0;
          }
          
          .ads-conclusao-titulo {
            color: #1976d2 !important;
            font-size: 1.4rem !important;
            font-weight: 900;
            text-align: center;
            margin: 20px 0 25px 0 !important;
            padding: 15px 0;
            border-bottom: 4px solid #1976d2;
            background: linear-gradient(135deg, #e3f2fd, #bbdefb);
            border-radius: 8px;
          }
          
          .ads-conclusao {
            padding: 20px;
            background: #fafafa;
            border-radius: 8px;
            margin: 0;
            min-height: 400px;
            page-break-inside: avoid;
          }
          
          .ads-conclusao p {
            font-size: 0.95rem;
            line-height: 1.6;
            text-align: justify;
            margin-bottom: 15px;
            color: #333;
          }
          
          /* Tabelas ADS mais compactas */
          .ads-analise-sku table {
            font-size: 0.75rem;
            margin: 10px 0;
          }
          
          .ads-analise-sku th {
            font-size: 0.7rem;
            padding: 6px 4px;
          }
          
          .ads-analise-sku td {
            font-size: 0.7rem;
            padding: 5px 4px;
          }
          
          /* Classe geral para evitar quebras */
          .no-break {
            page-break-inside: avoid !important;
            page-break-before: avoid;
            page-break-after: avoid;
          }
          
          /* Snapshot e seções vazias: evitar espaço excessivo */
          h2 + p, h3 + p, h2 + ul, h3 + ul {
            margin-top: 0;
          }
          
          /* Plano tático: títulos de semana consistentes */
          #content strong {
            color: #1a1a1a;
          }
          
          /* Layout para impressão */
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            table {
              font-size: 0.75rem;
              border: 1px solid #64748b;
            }
            th, td {
              padding: 6px 8px;
              border: 1px solid #cbd5e1;
            }
            th {
              background: #ea580c !important;
              color: #fff !important;
            }
          }
          
          @page {
            margin-top: 60px;
            margin-right: 16mm;
            margin-bottom: 18mm;
            margin-left: 16mm;
            size: A4;
          }

          /* ========== CHECKLIST OPERACIONAL - ANÁLISE EXPRESS ========== */

          /* Container do checklist */
          .checklist-container {
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border: 2px solid #28a745;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            page-break-inside: avoid;
            box-shadow: 0 4px 8px rgba(40, 167, 69, 0.15);
          }

          /* Cada item do checklist */
          .checklist-item {
            display: block;
            margin: 12px 0;
            padding: 15px 20px;
            background: white;
            border: 1px solid #dee2e6;
            border-left: 5px solid #28a745;
            border-radius: 8px;
            font-size: 0.9rem;
            line-height: 1.7;
            page-break-inside: avoid;
            box-shadow: 0 2px 4px rgba(0,0,0,0.08);
            position: relative;
            transition: all 0.2s ease;
          }

          /* Checkbox principal do item */
          .checklist-item::before {
            content: "☐";
            font-size: 1.4rem;
            color: #28a745;
            font-weight: bold;
            margin-right: 12px;
            vertical-align: middle;
            line-height: 1;
          }

          /* Hover effect */
          .checklist-item:hover {
            background: #f8f9fa;
            transform: translateY(-1px);
            box-shadow: 0 3px 6px rgba(0,0,0,0.12);
          }

          /* Container para checkboxes de Status */
          .status-checkboxes {
            display: inline-block;
            margin-left: 10px;
            background: #f8f9fa;
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid #e9ecef;
          }

          /* Labels dos checkboxes Sim/Não */
          .checkbox-sim, .checkbox-nao {
            display: inline-block;
            margin: 0 8px;
            font-weight: 600;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all 0.2s ease;
          }

          /* Checkbox Sim */
          .checkbox-sim {
            color: #28a745;
            background: linear-gradient(135deg, #d4edda, #c3e6cb);
            border: 1px solid #28a745;
          }

          .checkbox-sim:hover {
            background: linear-gradient(135deg, #c3e6cb, #b1dfbb);
            transform: scale(1.05);
          }

          /* Checkbox Não */
          .checkbox-nao {
            color: #dc3545;
            background: linear-gradient(135deg, #f8d7da, #f5c6cb);
            border: 1px solid #dc3545;
          }

          .checkbox-nao:hover {
            background: linear-gradient(135deg, #f5c6cb, #f1b0b7);
            transform: scale(1.05);
          }

          /* Input checkboxes ocultos (para impressão) */
          .checkbox-sim input, .checkbox-nao input {
            margin-right: 5px;
            transform: scale(1.2);
            accent-color: #28a745;
          }

          .checkbox-nao input {
            accent-color: #dc3545;
          }

          /* Destaque para diferentes tipos de ferramentas */
          .checklist-item:contains("Oferta Relâmpago") {
            border-left-color: #ff6b35;
            background: linear-gradient(135deg, #fff, #fff8f5);
          }

          .checklist-item:contains("Shopee Ads") {
            border-left-color: #1976d2;
            background: linear-gradient(135deg, #fff, #f3f8ff);
          }

          .checklist-item:contains("Combo") {
            border-left-color: #9c27b0;
            background: linear-gradient(135deg, #fff, #faf5ff);
          }

          .checklist-item:contains("Live") {
            border-left-color: #f44336;
            background: linear-gradient(135deg, #fff, #fff5f5);
          }

          .checklist-item:contains("Afiliado") {
            border-left-color: #ff9800;
            background: linear-gradient(135deg, #fff, #fff8f0);
          }

          /* Container de observações */
          .observacoes-container {
            background: linear-gradient(135deg, #fff3cd, #ffeaa7);
            border: 2px solid #ffc107;
            border-radius: 8px;
            padding: 18px;
            margin: 20px 0;
            page-break-inside: avoid;
            box-shadow: 0 3px 6px rgba(255, 193, 7, 0.2);
          }

          .observacoes-container p {
            font-size: 0.9rem;
            color: #856404;
            margin: 8px 0;
            line-height: 1.6;
            background: transparent;
            border: none;
            padding: 0;
            box-shadow: none;
          }

          .observacoes-container strong {
            color: #856404;
            font-weight: 700;
            font-size: 1.1rem;
            display: block;
            margin-bottom: 10px;
            border-bottom: 1px solid #ffc107;
            padding-bottom: 5px;
          }

          /* Quebra de linha forçada para cada item */
          .checklist-item {
            display: block !important;
            width: 100%;
            clear: both;
          }

          /* Responsivo para impressão */
          @media print {
            .checklist-item {
              font-size: 0.85rem;
              padding: 12px 15px;
              margin: 8px 0;
            }
            
            .checklist-container {
              padding: 15px;
              margin: 15px 0;
            }
            
            .status-checkboxes {
              background: #f8f9fa !important;
              -webkit-print-color-adjust: exact;
            }
            
            .checkbox-sim, .checkbox-nao {
              -webkit-print-color-adjust: exact;
            }
          }

          /* Espaçamento específico */
          .checklist-container .checklist-item:first-child {
            margin-top: 0;
          }

          .checklist-container .checklist-item:last-child {
            margin-bottom: 10px;
          }
        </style>
      </head>
      <body>
        <div id="content">
          ${htmlContent}
        </div>
      </body>
      </html>
    `;

    // Inicia o browser com retry
    browser = await launchBrowser();
    
    // Configura a página
    page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 1 });
    await page.setDefaultNavigationTimeout(TIMEOUT);

    // Sistema de retry para renderização da página
    let pageContent = null;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries && !pageContent) {
      try {
        await page.setContent(fullHtml, {
          waitUntil: ['networkidle0', 'load', 'domcontentloaded'],
          timeout: TIMEOUT
        });

        await page.waitForSelector('#content', { timeout: TIMEOUT });
        await delay(2000);

        if (await isPageHealthy(page)) {
          pageContent = true;
        } else {
          throw new Error('Page not healthy after load');
        }
      } catch (error) {
        retryCount++;
        console.error(`Tentativa ${retryCount} de renderizar página falhou:`, error);
        if (retryCount === maxRetries) throw error;
        await delay(2000);
        
        // Tenta criar uma nova página se houver erro
        if (page) await page.close().catch(() => {});
        page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 1 });
      }
    }

    // Gera o PDF com retry
    let pdfBuffer:any = null;
    retryCount = 0;

    while (retryCount < maxRetries && !pdfBuffer) {
      try {
        pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '60px',
            right: '16mm',
            bottom: '18mm',
            left: '16mm'
          },
          displayHeaderFooter: true,
          footerTemplate: '<span></span>',
          preferCSSPageSize: true,
          timeout: TIMEOUT
        });
      } catch (error) {
        retryCount++;
        console.error(`Tentativa ${retryCount} de gerar PDF falhou:`, error);
        if (retryCount === maxRetries) throw error;
        await delay(2000);
      }
    }

    // Sanitiza o nome do arquivo
    const sanitizedClientName = clientName
      .replace(/[áàãâä]/gi, 'a')
      .replace(/[éèêë]/gi, 'e')
      .replace(/[íìîï]/gi, 'i')
      .replace(/[óòõôö]/gi, 'o')
      .replace(/[úùûü]/gi, 'u')
      .replace(/[ç]/gi, 'c')
      .replace(/[^a-z0-9]/gi, '_')
      .substring(0, 50)
      .trim();

    const response = new NextResponse(pdfBuffer);
    response.headers.set('Content-Type', 'application/pdf');
    response.headers.set(
      'Content-Disposition',
      `attachment; filename="relatorio_${sanitizedClientName}.pdf"`
    );

    return response;
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    const isChromeMissing = /Could not find Chrome|Chrome.*not found|executable path/i.test(errMessage);

    // Fallback: se Puppeteer falhou por falta de Chrome, tentar microserviço (ex.: em produção sem env).
    if (isChromeMissing && getPdfMicroUrl()) {
      try {
        const body = await request.clone().json() as { markdown?: string; clientName?: string; analysisType?: string };
        const md = body?.markdown;
        const name = body?.clientName;
        const type = body?.analysisType ?? "account";
        if (typeof md === "string" && typeof name === "string") {
          return generatePdfViaMicro(md, name, typeof type === "string" ? type : "account");
        }
      } catch (fallbackErr) {
        console.error("PDF fallback to micro failed:", fallbackErr);
      }
    }

    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { 
        message: 'Error generating PDF', 
        error: errMessage,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  } finally {
    try {
      if (page) await page.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
    } catch (closeError) {
      console.error('Error closing browser:', closeError);
    }
  }
}