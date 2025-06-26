import { NextRequest, NextResponse } from "next/server";
import puppeteerCore from "puppeteer-core";
import { marked } from "marked";
import path from "path";
import fs from "fs";

export async function POST(request: NextRequest) {
  let browser = null;

  try {
    const { markdown, clientName } = await request.json();

    if (!markdown || !clientName) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Converte markdown para HTML
    let htmlContent = await marked(markdown);
    
    // Pré-processamento para melhorar a formatação
    htmlContent = htmlContent
      // Adiciona classes para seções específicas
      .replace(/<h1>(.*?)🟨(.*?)🚀(.*?)<\/h1>/gi, '<h1 class="titulo-principal">$1🟨$2🚀$3</h1>')
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
      .replace(/☐ (.*?)(?=☐|Observações:|$)/gs, (match, content) => {
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

    // Monta o HTML final
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório - ${clientName}</title>
        <style>
          body {
            font-family: 'Inter', Arial, sans-serif;
            color: #222;
            margin: 0;
            padding: 0;
            font-size: 12px;
          }
          #content {
            max-width: 180mm;
            margin: 0 auto;
            padding: 0 0 16mm 0;
            background: transparent;
            box-sizing: border-box;
            min-height: calc(297mm - 60mm);
            display: block;
            text-align: left;
          }
          
          /* Títulos principais centralizados */
          h1 {
            color: #ff6b35;
            font-weight: bold;
            font-size: 1.4rem;
            text-align: center;
            margin-top: 0;
            margin-bottom: 20px;
            text-transform: uppercase;
            page-break-inside: avoid;
            page-break-after: avoid;
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            padding: 10px 0;
          }
          
          /* Seções principais */
          h2 {
            color: #1976d2;
            font-weight: bold;
            font-size: 1.1rem;
            margin-top: 18px;
            margin-bottom: 10px;
            border-bottom: 2px solid #1976d2;
            padding-bottom: 3px;
            page-break-inside: avoid;
            page-break-after: avoid;
            text-align: center;
          }
          
          h3 {
            color: #1976d2;
            font-weight: bold;
            font-size: 1rem;
            margin-top: 12px;
            margin-bottom: 6px;
            page-break-inside: avoid;
            page-break-after: avoid;
          }
          
          /* Parágrafos e listas */
          p, ul, ol {
            text-align: justify;
            font-size: 0.9rem;
            line-height: 1.5;
            margin-bottom: 10px;
            page-break-inside: avoid;
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
          
          /* Tabelas centralizadas e bem formatadas */
          table {
            border-collapse: collapse;
            font-size: 0.8rem;
            background: #fff;
            width: 100%;
            margin: 20px auto;
            page-break-inside: avoid;
            border: 2px solid #1976d2;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          th {
            background: linear-gradient(135deg, #1976d2, #1565c0);
            color: #fff;
            text-align: center;
            font-weight: bold;
            padding: 10px 6px;
            border: 1px solid #0d47a1;
            font-size: 0.75rem;
          }
          
          td {
            border: 1px solid #bbdefb;
            padding: 8px 6px;
            text-align: left;
            vertical-align: top;
            font-size: 0.75rem;
          }
          
          /* Zebra striping para tabelas */
          tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          
          tr:hover {
            background-color: #e3f2fd;
          }
          
          /* Células numéricas alinhadas à direita */
          td:contains("R$"), td:contains("%"), td:contains("↑"), td:contains("↓") {
            text-align: right;
            font-weight: 500;
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
          
          /* Cabeçalho da loja */
          .loja-info {
            text-align: center;
            margin-bottom: 20px;
            page-break-after: avoid;
          }
          
          .loja-info p {
            margin: 5px 0;
            font-size: 1rem;
            color: #666;
          }
          
          /* Título principal customizado */
          .titulo-principal {
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-size: 1.5rem !important;
            font-weight: 900;
            text-align: center;
            margin: 20px 0 30px 0;
            padding: 15px 0;
            border-bottom: 3px solid #ff6b35;
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
            margin: 15px 0;
            page-break-inside: avoid;
            overflow-x: auto;
          }
          
          .tabela-analise {
            width: 100%;
            margin: 0 auto;
            border: 2px solid #1976d2;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 3px 6px rgba(25, 118, 210, 0.1);
          }
          
          .tabela-analise th {
            background: linear-gradient(135deg, #1976d2, #1565c0);
            color: white;
            font-weight: 600;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            padding: 8px 4px;
            text-align: center;
            line-height: 1.2;
          }
          
          .tabela-analise td {
            padding: 6px 4px;
            font-size: 0.65rem;
            border-bottom: 1px solid #e0e0e0;
            vertical-align: top;
            line-height: 1.3;
            word-wrap: break-word;
            max-width: 120px;
          }
          
          .tabela-analise tr:nth-child(even) {
            background: #f8f9fa;
          }
          
          .tabela-analise tr:hover {
            background: #e3f2fd;
            transition: background-color 0.2s ease;
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
          
          /* Layout responsivo para tabelas grandes */
          @media print {
            table {
              font-size: 0.7rem;
            }
            th, td {
              padding: 6px 4px;
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

    // Conecta ao Browserless via WebSocket
    browser = await puppeteerCore.connect({
      browserWSEndpoint: `wss://production-sfo.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`,
      defaultViewport: { width: 1200, height: 800 },
    });

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(60000);
    await page.setDefaultTimeout(60000);

    await page.setContent(fullHtml, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    // Gera o PDF com headerTemplate para o papel timbrado
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "60px",
        right: "16mm",
        bottom: "18mm",
        left: "16mm",
      },
      displayHeaderFooter: true,
      footerTemplate: "<span></span>",
      preferCSSPageSize: true,
      timeout: 60000,
    });

    await browser.disconnect();

    // Sanitizar o nome do cliente para o nome do arquivo (somente ASCII)
    const sanitizedClientName = clientName
      .replace(/ã/g, 'a').replace(/á/g, 'a').replace(/à/g, 'a').replace(/â/g, 'a')
      .replace(/é/g, 'e').replace(/ê/g, 'e').replace(/è/g, 'e')
      .replace(/í/g, 'i').replace(/î/g, 'i').replace(/ì/g, 'i')
      .replace(/ó/g, 'o').replace(/ô/g, 'o').replace(/õ/g, 'o').replace(/ò/g, 'o')
      .replace(/ú/g, 'u').replace(/û/g, 'u').replace(/ù/g, 'u')
      .replace(/ñ/g, 'n').replace(/ç/g, 'c')
      .replace(/Ã/g, 'A').replace(/Á/g, 'A').replace(/À/g, 'A').replace(/Â/g, 'A')
      .replace(/É/g, 'E').replace(/Ê/g, 'E').replace(/È/g, 'E')
      .replace(/Í/g, 'I').replace(/Î/g, 'I').replace(/Ì/g, 'I')
      .replace(/Ó/g, 'O').replace(/Ô/g, 'O').replace(/Õ/g, 'O').replace(/Ò/g, 'O')
      .replace(/Ú/g, 'U').replace(/Û/g, 'U').replace(/Ù/g, 'U')
      .replace(/Ñ/g, 'N').replace(/Ç/g, 'C')
      .replace(/[()]/g, '') // Remover parênteses
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remover outros caracteres especiais
      .replace(/\s+/g, '_') // Substituir espaços por underscore
      .substring(0, 50) // Limitar tamanho
      .trim();

    const response = new NextResponse(pdfBuffer);
    response.headers.set("Content-Type", "application/pdf");
    response.headers.set(
      "Content-Disposition",
      `attachment; filename="relatorio_${sanitizedClientName}.pdf"`
    );

    return response;
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json(
      { message: "Error generating PDF", error: String(error) },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.disconnect();
    }
  }
}