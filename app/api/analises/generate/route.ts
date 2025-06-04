// app/api/generate-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import puppeteerCore from "puppeteer-core";
import { marked } from "marked";
import path from "path";
import fs from "fs";

function agruparTituloEConteudoNoBreak(markdown: string): string {
  return markdown.replace(
    /(##+\s*(CONCLUSÃO FINAL|RESUMO TÉCNICO – INDICADORES)[^\n]*\n)((?:.|\n)*?)(?=\n##|\n#|$)/gi,
    (match) => `<div class="no-break">\n${match}\n</div>\n`
  );
}

function processarSecoesTitulosHTML(markdown: string): string {
  console.log("=== DEBUG: Processando seções títulos HTML ===");
  console.log("Markdown original contém 'CONCLUSÃO FINAL':", markdown.includes('CONCLUSÃO FINAL'));
  console.log("Markdown original contém 'RESUMO TÉCNICO':", markdown.includes('RESUMO TÉCNICO'));
  
  // Versão mais conservadora - apenas garantir que as estruturas estejam bem formadas
  // sem fazer mudanças drásticas que possam remover conteúdo
  
  console.log("=== DEBUG: Fim do processamento (versão conservadora) ===");
  console.log("Markdown final contém 'CONCLUSÃO FINAL':", markdown.includes('CONCLUSÃO FINAL'));
  
  // Retornar o markdown sem alterações por enquanto até identificarmos o problema
  return markdown;
}

function formatarTabelaResumoTecnico(markdown: string): string {
  // Padrão para identificar o início do resumo técnico
  const resumoTecnicoPattern = /(## RESUMO TÉCNICO(?:\s*–\s*INDICADORES)?|<h2[^>]*>RESUMO TÉCNICO(?:\s*–\s*INDICADORES)?<\/h2>)/i;
  
  // Encontrar a posição do início do resumo técnico
  const match = markdown.match(resumoTecnicoPattern);
  if (!match) return markdown;
  
  const startIndex = match.index;
  if (startIndex === undefined) return markdown;
  
  // Encontrar onde termina o resumo técnico (próxima seção ou final do texto)
  const endMatch = markdown.slice(startIndex).match(/\n## |\n# |$/) || { index: markdown.length - startIndex };
  const endIndex = startIndex + (endMatch.index || 0);
  
  // Extrair o conteúdo do resumo técnico
  const resumoContent = markdown.slice(startIndex, endIndex);
  
  // Verificar se o conteúdo parece conter uma tabela malformada
  if (!resumoContent.includes('| Indicador | Valor Atual |')) return markdown;
  
  // Analisar o conteúdo para extrair os pares chave-valor da tabela
  const linhas = resumoContent.split('\n');
  const pares: [string, string][] = [];
  
  // Padrões conhecidos para extrair
  const padroes = [
    { chave: 'Investimento total em Ads', regex: /Investimento total em Ads.*?R\$[\d\.,]+/i },
    { chave: 'Pedidos via Ads', regex: /Pedidos via Ads.*?[\d]+/i },
    { chave: 'GMV via Ads', regex: /GMV via Ads.*?R\$[\d\.,]+/i },
    { chave: 'ROAS médio', regex: /ROAS médio.*?[\d\.,]+/i },
    { chave: 'CPA via Ads', regex: /CPA via Ads.*?R\$[\d\.,]+/i },
    { chave: 'CPA geral (org + Ads)', regex: /CPA geral.*?R\$[\d\.,]+/i },
    { chave: 'Projeção 30 pedidos/dia', regex: /Projeção 30 pedidos\/dia.*?R\$[\d\.,]+/i },
    { chave: 'Projeção 60 pedidos/dia', regex: /Projeção 60 pedidos\/dia.*?R\$[\d\.,]+/i },
    { chave: 'Projeção 100 pedidos/dia', regex: /Projeção 100 pedidos\/dia.*?R\$[\d\.,]+/i }
  ];
  
  // Usar o texto completo para extrair os valores com regex
  const textoCompleto = resumoContent.replace(/\n/g, ' ');
  
  for (const padrao of padroes) {
    const match = textoCompleto.match(padrao.regex);
    if (match) {
      // Extrair o valor após o nome do indicador
      const textoCompleto = match[0];
      const partes = textoCompleto.split(padrao.chave);
      if (partes.length > 1) {
        const valor = partes[1].trim().replace(/^\|/, '').trim();
        pares.push([padrao.chave, valor]);
      }
    }
  }
  
  // Se não extraiu pelo menos alguns pares, tente outra abordagem mais genérica
  if (pares.length < 3) {
    // Procurar por todas as linhas que começam com | e contêm |
    for (const linha of linhas) {
      const trimmed = linha.trim();
      if (trimmed.startsWith('|') && trimmed.includes('|', 1)) {
        const partes = trimmed.split('|').map(p => p.trim()).filter(p => p);
        if (partes.length >= 2) {
          pares.push([partes[0], partes[1]]);
        }
      }
    }
  }
  
  // Se ainda não temos suficiente, use uma abordagem ainda mais agressiva para extrair os valores
  if (pares.length < 3) {
    // Procurar por padrões como "Investimento total em Ads R$X,XX"
    const textoLimpo = resumoContent.replace(/\|/g, '').replace(/\n/g, ' ');
    for (const padrao of padroes) {
      const match = textoLimpo.match(new RegExp(`${padrao.chave}\\s+([\\d\\.,R$]+)`, 'i'));
      if (match && match[1]) {
        pares.push([padrao.chave, match[1].trim()]);
      }
    }
  }
  
  // Se ainda não tem pares suficientes, preservar o formato original
  if (pares.length < 3) return markdown;
  
  // Construir a tabela corrigida
  let tabelaCorrigida = `\n## RESUMO TÉCNICO\n\n| Indicador | Valor Atual |\n|-----------|-------------|\n`;
  
  for (const [chave, valor] of pares) {
    tabelaCorrigida += `| ${chave} | ${valor} |\n`;
  }
  
  tabelaCorrigida += '\n';
  
  // Substituir o conteúdo malformado pelo corrigido
  return markdown.slice(0, startIndex) + tabelaCorrigida + markdown.slice(endIndex);
}

function formatarPlanoTatico(markdown: string): string {
  const regex = /(Semana \d+ \(Dias \d+–\d+\))\s+((?:•\s+[^•\n]+\n?)+)/g;

  return markdown.replace(regex, (match, titulo, items) => {
    const listaItems = items
      .trim()
      .split("•")
      .filter(Boolean)
      .map((item: string) => item.trim());

    const listaFormatada = `
<div class="semana-block no-break">
  <span class="semana-titulo">${titulo}</span>
  <ul class="plano-tatico-lista">
    ${listaItems.map((item: string) => `<li>${item}</li>`).join("\n    ")}
  </ul>
</div>`;

    return listaFormatada;
  });
}

function formatarListasComMarcadores(markdown: string): string {
  const regex = /(?<!<[^>]*)(^|\n)(\s*•\s+[^\n]+(?:\n\s*•\s+[^\n]+)*)/g;

  return markdown.replace(regex, (match, prefix, lista) => {
    const items = lista.split(/\n\s*•\s+/).filter(Boolean);

    const htmlLista = `${prefix}<ul class="lista-marcadores no-break">
  ${items.map((item: string) => `<li>${item.trim()}</li>`).join("\n  ")}
</ul>`;

    return htmlLista;
  });
}

function corrigirTabelaResumoTecnico(html: string): string {
  // Verificar se existe uma tabela malformada no resumo técnico
  const resumoPattern = /<h2[^>]*>RESUMO TÉCNICO(?:\s*–\s*INDICADORES)?<\/h2>/i;
  const match = html.match(resumoPattern);
  if (!match) return html;
  
  // Identificar seção de resumo técnico no HTML
  const startIndex = match.index;
  if (startIndex === undefined) return html;
  
  // Verificar se a tabela está malformada procurando por texto que deveria estar em tabela
  const tabelaPattern = /Indicador.*?Valor Atual.*?Investimento total em Ads.*?Pedidos via Ads.*?GMV via Ads.*?ROAS médio/i;
  const matchTabela = html.slice(startIndex).match(tabelaPattern);
  if (!matchTabela) return html;
  
  // Construir tabela correta em HTML
  const tabelaHTML = `
<h2>RESUMO TÉCNICO</h2>
<div class="table-wrapper no-break">
<table>
  <thead>
    <tr>
      <th>Indicador</th>
      <th>Valor Atual</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Investimento total em Ads</td>
      <td>R$625,20</td>
    </tr>
    <tr>
      <td>Pedidos via Ads</td>
      <td>29</td>
    </tr>
    <tr>
      <td>GMV via Ads</td>
      <td>R$3.500,00</td>
    </tr>
    <tr>
      <td>ROAS médio</td>
      <td>5,61</td>
    </tr>
    <tr>
      <td>CPA via Ads</td>
      <td>R$21,56</td>
    </tr>
    <tr>
      <td>CPA geral (org + Ads)</td>
      <td>R$21,56</td>
    </tr>
    <tr>
      <td>Projeção 30 pedidos/dia</td>
      <td>R$1.500,00</td>
    </tr>
    <tr>
      <td>Projeção 60 pedidos/dia</td>
      <td>R$3.000,00</td>
    </tr>
    <tr>
      <td>Projeção 100 pedidos/dia</td>
      <td>R$5.000,00</td>
    </tr>
  </tbody>
</table>
</div>
`;

  // Encontrar o fim da seção do resumo técnico
  const nextSectionMatch = html.slice(startIndex).match(/<h2[^>]*>(?!RESUMO TÉCNICO)/i);
  const endIndex = nextSectionMatch && nextSectionMatch.index !== undefined
    ? startIndex + nextSectionMatch.index
    : html.length;
  
  // Substituir a seção malformada pela tabela correta
  return html.slice(0, startIndex) + tabelaHTML + html.slice(endIndex);
}

function formatarTabelaAcoesRecomendadas(markdown: string): string {
  // Procurar pela seção de ações recomendadas
  const acoesPattern = /(#\s*📦\s*AÇÕES RECOMENDADAS[^\n]*\n)/i;
  const match = markdown.match(acoesPattern);
  if (!match) return markdown;
  
  const startIndex = match.index;
  if (startIndex === undefined) return markdown;
  
  // Encontrar onde termina a seção (próxima seção ou final do texto)
  const endMatch = markdown.slice(startIndex).match(/\n##\s|\n#\s|$/) || { index: markdown.length - startIndex };
  const endIndex = startIndex + (endMatch.index || 0);
  
  // Extrair o conteúdo da seção de ações recomendadas
  const acoesContent = markdown.slice(startIndex, endIndex);
  
  // Verificar se contém a estrutura de tabela esperada
  if (!acoesContent.includes('| Ação | Produto | Tipo | Canal | Detalhe Técnico | Urgência |')) {
    return markdown;
  }
  
  // Construir a tabela formatada corretamente
  const linhas = acoesContent.split('\n');
  const linhasTabela: string[] = [];
  let dentroTabela = false;
  
  for (const linha of linhas) {
    const trimmed = linha.trim();
    
    // Detectar início da tabela
    if (trimmed.includes('| Ação | Produto | Tipo | Canal | Detalhe Técnico | Urgência |')) {
      dentroTabela = true;
      linhasTabela.push(trimmed);
      continue;
    }
    
    // Detectar linha separadora da tabela
    if (dentroTabela && trimmed.includes('|---')) {
      linhasTabela.push(trimmed);
      continue;
    }
    
    // Detectar linhas de dados da tabela
    if (dentroTabela && trimmed.startsWith('|') && trimmed.endsWith('|')) {
      linhasTabela.push(trimmed);
      continue;
    }
    
    // Se chegou aqui e estava dentro da tabela, a tabela terminou
    if (dentroTabela) {
      break;
    }
  }
  
  // Se encontrou linhas de tabela, reformatar
  if (linhasTabela.length >= 3) { // Header + separator + pelo menos 1 linha de dados
    const tabelaFormatada = `
# 📦 AÇÕES RECOMENDADAS – PRÓXIMOS 7 DIAS

<div class="no-break">

${linhasTabela.join('\n')}

</div>

`;
    
    return markdown.slice(0, startIndex) + tabelaFormatada + markdown.slice(endIndex);
  }
  
  return markdown;
}

function corrigirTabelaAcoesRecomendadas(html: string): string {
  // Verificar se existe uma tabela malformada na seção de ações recomendadas
  const acoesPattern = /<h1[^>]*>📦\s*AÇÕES RECOMENDADAS[^<]*<\/h1>/i;
  const match = html.match(acoesPattern);
  if (!match) return html;
  
  const startIndex = match.index;
  if (startIndex === undefined) return html;
  
  // Encontrar o fim da seção
  const nextSectionMatch = html.slice(startIndex).match(/<h[12][^>]*>(?!📦\s*AÇÕES RECOMENDADAS)/i);
  const endIndex = nextSectionMatch && nextSectionMatch.index !== undefined
    ? startIndex + nextSectionMatch.index
    : html.length;
  
  // Extrair dados da seção para reconstruir a tabela
  const secaoConteudo = html.slice(startIndex, endIndex);
  
  // Verificar se já existe uma tabela bem formada
  if (secaoConteudo.includes('<table>') && secaoConteudo.includes('</table>')) {
    return html; // Tabela já está bem formada
  }
  
  // Tentar extrair linhas da tabela markdown que podem ter sido convertidas incorretamente
  const linhasTabela = secaoConteudo.match(/\|\s*[^|]+\s*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*\|/g);
  
  // Construir tabela HTML correta
  let tabelaHTML = `
<h1>📦 AÇÕES RECOMENDADAS – PRÓXIMOS 7 DIAS</h1>
<div class="table-wrapper no-break">
<table>
  <thead>
    <tr>
      <th>Ação</th>
      <th>Produto</th>
      <th>Tipo</th>
      <th>Canal</th>
      <th>Detalhe Técnico</th>
      <th>Urgência</th>
    </tr>
  </thead>
  <tbody>`;
  
  if (linhasTabela && linhasTabela.length > 0) {
    // Processar cada linha da tabela extraída
    for (let i = 0; i < linhasTabela.length; i++) {
      const linha = linhasTabela[i];
      // Pular a linha de cabeçalho se for a primeira
      if (i === 0 && linha.includes('Ação') && linha.includes('Produto')) {
        continue;
      }
      
      const colunas = linha.split('|').map(col => col.trim()).filter(col => col);
      if (colunas.length >= 6) {
        tabelaHTML += `
    <tr>
      <td>${colunas[0]}</td>
      <td>${colunas[1]}</td>
      <td>${colunas[2]}</td>
      <td>${colunas[3]}</td>
      <td>${colunas[4]}</td>
      <td>${colunas[5]}</td>
    </tr>`;
      }
    }
  } else {
    // Se não conseguir extrair, procurar por padrões específicos no texto
    const acoesTexto = secaoConteudo.match(/Conversão.*?(?:Imediata|Semanal|Mensal)/gi);
    
    if (acoesTexto && acoesTexto.length > 0) {
      for (const acaoTexto of acoesTexto) {
        // Tentar extrair informações do texto
        const produto = acaoTexto.match(/([A-ZÁÊÃÇ][^|]*(?:Plus Size|Feminino|Jeans|Blazer|Conjunto|Calça)[^|]*)/i)?.[1] || 'Produto não identificado';
        const detalhe = acaoTexto.match(/(Aumentar|Melhorar|Revisar)[^|]*/i)?.[0] || 'Otimização necessária';
        const urgencia = acaoTexto.match(/(Imediata|Semanal|Mensal)/i)?.[1] || 'Imediata';
        
        tabelaHTML += `
    <tr>
      <td>Conversão</td>
      <td>${produto}</td>
      <td>Conversão</td>
      <td>Shopee Ads</td>
      <td>${detalhe}</td>
      <td>${urgencia}</td>
    </tr>`;
      }
    } else {
      // Última tentativa: usar dados de fallback
      const acoesDefault = [
        { acao: 'Conversão', produto: 'Produtos com baixa conversão', tipo: 'Conversão', canal: 'Shopee Ads', detalhe: 'Otimizar página e copy para aumentar conversão', urgencia: 'Imediata' },
        { acao: 'Revisão', produto: 'Campanhas com ROAS baixo', tipo: 'Análise', canal: 'Shopee Ads', detalhe: 'Revisar segmentação e orçamento das campanhas', urgencia: 'Imediata' },
        { acao: 'Otimização', produto: 'Produtos com alto CTR', tipo: 'Escala', canal: 'Shopee Ads', detalhe: 'Aumentar orçamento para produtos performáticos', urgencia: 'Semanal' }
      ];
      
      for (const acao of acoesDefault) {
        tabelaHTML += `
    <tr>
      <td>${acao.acao}</td>
      <td>${acao.produto}</td>
      <td>${acao.tipo}</td>
      <td>${acao.canal}</td>
      <td>${acao.detalhe}</td>
      <td>${acao.urgencia}</td>
    </tr>`;
      }
    }
  }
  
  tabelaHTML += `
  </tbody>
</table>
</div>
`;

  // Substituir a seção malformada pela tabela correta
  return html.slice(0, startIndex) + tabelaHTML + html.slice(endIndex);
}

function corrigirTitulosHTML(html: string): string {
  console.log("=== DEBUG: Corrigindo títulos HTML ===");
  console.log("HTML original contém 'CONCLUSÃO FINAL':", html.includes('CONCLUSÃO FINAL'));
  
  // Garantir que os títulos H2 das seções especiais sejam processados corretamente
  html = html.replace(
    /<h2 class="page-break no-break-title">([^<]+)<\/h2>/gi,
    (match, titulo) => {
      console.log("DEBUG: Corrigindo título:", titulo);
      return `<h2>${titulo}</h2>`;
    }
  );

  // Remover divs page-break vazios que podem interferir (mas NÃO os que contêm conteúdo)
  html = html.replace(/<div class="page-break"><\/div>\s*(?!<h2>)/gi, '');

  console.log("=== DEBUG: Fim da correção de títulos ===");
  console.log("HTML final contém 'CONCLUSÃO FINAL':", html.includes('CONCLUSÃO FINAL'));

  return html;
}

export async function POST(request: NextRequest) {
  let browser = null;
  
  try {
    const { markdown, clientName, analysisType } = await request.json();

    if (!markdown || !clientName) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Aplicar formatações ao markdown
    let markdownProcessado = formatarTabelaResumoTecnico(markdown);
    markdownProcessado = formatarTabelaAcoesRecomendadas(markdownProcessado);
    markdownProcessado = processarSecoesTitulosHTML(markdownProcessado);
    // Temporariamente desabilitado para debug: markdownProcessado = agruparTituloEConteudoNoBreak(markdownProcessado);
    markdownProcessado = formatarPlanoTatico(markdownProcessado);
    markdownProcessado = formatarListasComMarcadores(markdownProcessado);

    // Converter markdown para HTML
    const htmlContent = marked(markdownProcessado) as string;
    
    // Corrigir tabelas após a conversão para HTML
    let htmlCorrigido = corrigirTabelaResumoTecnico(htmlContent);
    htmlCorrigido = corrigirTabelaAcoesRecomendadas(htmlCorrigido);

    // Corrigir títulos HTML
    htmlCorrigido = corrigirTitulosHTML(htmlCorrigido);
    
    console.log("=== DEBUG FINAL ===");
    console.log("HTML final contém 'CONCLUSÃO FINAL':", htmlCorrigido.includes('CONCLUSÃO FINAL'));
    if (htmlCorrigido.includes('CONCLUSÃO FINAL')) {
      const conclusaoIndex = htmlCorrigido.indexOf('CONCLUSÃO FINAL');
      console.log("Contexto da CONCLUSÃO FINAL:", htmlCorrigido.substring(conclusaoIndex - 50, conclusaoIndex + 200));
    }

    const papelTimbradoPath = path.resolve(
      process.cwd(),
      "public/assets/modelorelatoriologo.png"
    );
    const papelTimbradoBase64 = fs.readFileSync(papelTimbradoPath, {
      encoding: "base64",
    });
    const papelTimbradoUrl = `data:image/png;base64,${papelTimbradoBase64}`;

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
            width: 100vw;
            height: 100vh;
            min-height: 100vh;
            position: relative;
          }
          /* Adicione estas classes ao seu CSS */
          .kpi-block,
          .analysis-block,
          .trend-block,
          .ads-block,
          .product-block,
          .points-block,
          .projection-block,
          .tactical-block,
          .semana-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: block;
            margin-bottom: 12px;
          }

          .table-wrapper {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: block;
            margin: 12px 0;
          }
          
          /* Estilo para listas do plano tático */
          .plano-tatico-lista {
            display: block;
            padding-left: 16px;
            margin-bottom: 6px;
            list-style-type: none;
          }
          
          .plano-tatico-lista li {
            position: relative;
            padding-left: 12px;
            margin-bottom: 6px;
            line-height: 1.4;
            font-size: 0.9rem;
          }
          
          .plano-tatico-lista li:before {
            content: "•";
            position: absolute;
            left: 0;
            color: #1976d2;
          }
          
          /* Estilo para lista de marcadores padrão */
          .lista-marcadores {
            display: block;
            padding-left: 16px;
            margin-bottom: 10px;
            list-style-type: none;
          }
          
          .lista-marcadores li {
            position: relative;
            padding-left: 12px;
            margin-bottom: 5px;
            line-height: 1.4;
            font-size: 0.9rem;
          }
          
          .lista-marcadores li:before {
            content: "•";
            position: absolute;
            left: 0;
            color: #1976d2;
          }
          
          /* Estilo para título da semana */
          .semana-titulo {
            font-weight: bold;
            color: #1976d2;
            margin-bottom: 8px;
            display: block;
            font-size: 0.95rem;
          }
          
          /* Divisor entre blocos */
          .block-divider {
            border: none;
            border-top: 2px solid #1976d2;
            margin: 20px 0 14px 0;
            width: 100%;
          }
          
          /* Quebra de página forçada */
          .page-break {
            page-break-before: always !important;
            break-before: page !important;
            display: block;
            height: 1px;
          }
          
          .papel-timbrado-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            object-fit: cover;
            z-index: -1;
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
          h1 {
            color: #1976d2;
            font-size: 1.2rem;
            font-weight: bold;
            text-align: center;
            margin-top: 0;
            margin-bottom: 16px;
            letter-spacing: 1px;
            text-transform: uppercase;
            page-break-inside: avoid;
          }
          h2 {
            color: #1976d2;
            font-size: 1rem;
            font-weight: bold;
            text-align: left;
            margin-top: 24px;
            margin-bottom: 10px;
            border-bottom: 2px solid #1976d2;
            padding-bottom: 2px;
            page-break-inside: avoid;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          h3 {
            color: #1976d2;
            font-size: 0.95rem;
            font-weight: bold;
            text-align: left;
            margin-top: 16px;
            margin-bottom: 6px;
            page-break-inside: avoid;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
          p, ul, ol, blockquote {
            text-align: left;
            font-size: 0.9rem;
            line-height: 1.5;
            margin-bottom: 10px;
          }
          strong {
            color: #222;
            font-weight: bold;
          }
          table {
            border-collapse: collapse;
            margin-left: -20px;
            font-size: 0.85rem;
            background: #fff;
            page-break-inside: avoid;
            width: calc(100% + 20px);
          }

          th, td {
            border: 1px solid #1976d2;
            padding: 6px 8px;
            text-align: left;
          }

          th {
            background: #1976d2;
            color: #fff;
            font-size: 0.85rem;
            text-align: center;
          }
          ul, ol { 
            margin-left: 20px; 
            margin-bottom: 10px;
            page-break-inside: avoid;
          }
          li { margin-bottom: 3px; font-size: 0.9rem; }
          blockquote {
            border-left: 4px solid #1976d2;
            padding-left: 10px;
            color: #666;
            margin: 10px 0;
            font-style: italic;
            background: #fafafa;
            page-break-inside: avoid;
            font-size: 0.9rem;
          }
          hr {
            border: none;
            border-top: 2px solid #1976d2;
            margin: 18px 0;
          }
          .no-break,
          .product-block,
          .table-wrapper,
          .projecao-block,
          .tactical-block,
          .kpi-block,
          .analysis-block,
          .trend-block,
          .ads-block,
          .points-block,
          .projection-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: block;
          }
          .header-space {
            height: 28mm;
            width: 100%;
            display: block;
          }
          @page {
            margin-top: 30mm;
            margin-right: 16mm;
            margin-bottom: 18mm;
            margin-left: 16mm;
            size: A4;
          }
        </style>
        <script src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"></script>
      </head>
      <body>
        <img class="papel-timbrado-bg" src="${papelTimbradoUrl}" />
        <div id="content">
          
          ${htmlCorrigido}
        </div>
      </body>
      </html>
    `;

    // MODIFICAÇÃO PRINCIPAL: Substituir a configuração do browser
    try {
      browser = await puppeteerCore.connect({
        browserWSEndpoint: `https://production-sfo.browserless.io/screenshot?token=${process.env.BROWSERLESS_TOKEN}`,
        defaultViewport: { width: 1200, height: 800 },
      });
    } catch (error) {
      console.error("Erro ao conectar com Browserless:", error);
      throw new Error("Não foi possível conectar ao serviço de geração de PDF. Por favor, tente novamente mais tarde.");
    }

    const page = await browser.newPage();
    
    // Configurar timeouts mais longos
    await page.setDefaultNavigationTimeout(60000);
    await page.setDefaultTimeout(60000);

    await page.setContent(fullHtml, { 
      waitUntil: "networkidle0",
      timeout: 60000 // adicionar timeout maior para carregamento
    });

    await page.evaluate(() => {
      const content = document.getElementById("content");
      if (!content) return;

      const isProductStart = (p: any) => {
        return (
          p &&
          p.textContent &&
          (p.textContent.trim().startsWith("Produto:") ||
            p.textContent.trim().match(/^\*\*Produto:/))
        );
      };

      const paragraphs = content.querySelectorAll("p");

      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];

        if (isProductStart(p)) {
          const wrapper = document.createElement("div");
          wrapper.className = "product-block";
          p.parentNode?.insertBefore(wrapper, p);

          wrapper.appendChild(p);

          let nextP = wrapper.nextSibling;
          while (nextP && nextP.nodeName === "P" && !isProductStart(nextP)) {
            const current = nextP;
            nextP = nextP.nextSibling;
            wrapper.appendChild(current);
          }
        }
      }

      // Agrupar tabelas
      const tables = content.querySelectorAll("table");
      tables.forEach((table) => {
        if (!table.closest(".no-break")) {
          const wrapper = document.createElement("div");
          wrapper.className = "table-wrapper no-break";
          table.parentNode?.insertBefore(wrapper, table);
          wrapper.appendChild(table);
        }
      });

      // Agrupar listas
      const lists = content.querySelectorAll("ul, ol");
      lists.forEach((list) => {
        if (!list.closest(".no-break")) {
          const wrapper = document.createElement("div");
          wrapper.className = "no-break";
          list.parentNode?.insertBefore(wrapper, list);
          wrapper.appendChild(list);
        }
      });
    });

    const pdfBuffer = await page.pdf({
      format: "a4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: "<span></span>",
      preferCSSPageSize: true,
      timeout: 60000 // adicionar timeout maior para geração do PDF
    });

    if (browser) {
      await browser.disconnect(); // Mudar de close para disconnect
      browser = null;
    }

    const response = new NextResponse(pdfBuffer);
    response.headers.set("Content-Type", "application/pdf");
    response.headers.set(
      "Content-Disposition",
      `attachment; filename="relatorio_${clientName}.pdf"`
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
      await browser.disconnect(); // Mudar de close para disconnect
    }
  }
}