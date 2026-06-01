import { NextRequest, NextResponse } from "next/server";

// Função para calcular CPA (copiada do microserviço)
function calcularCPA(markdown: string): string {
 
  console.log(' Markdown recebido (primeiros 300 chars):', markdown.substring(0, 300));
  
  // Múltiplas estratégias para encontrar investimento e pedidos
  let investimento: number | null = null;
  let pedidos: number | null = null;
  
  // Estratégia 1: Buscar na tabela de indicadores
  const tabelaMatch = markdown.match(/\|\s*Investimento\s+em\s+Ads\s*\|\s*R\$\s*([\d.,]+)\s*\|[\s\S]*?\|\s*Pedidos\s+Pagos\s+Mês\s*\|\s*(\d+)\s*\|/i);
  if (tabelaMatch) {
    investimento = parseFloat(tabelaMatch[1].replace(/\./g, '').replace(',', '.'));
    pedidos = parseInt(tabelaMatch[2]);
  
  }
  
  // Estratégia 2: Buscar por padrões de texto mais flexíveis
  if (!investimento || !pedidos) {
    // Buscar investimento em Ads
    const investimentoMatch = markdown.match(/(?:Investimento\s+(?:em\s+)?Ads?|Investimento\s+total\s+em\s+Ads?)\s*[:|]\s*R\$\s*([\d.,]+)/i);
    if (investimentoMatch) {
      investimento = parseFloat(investimentoMatch[1].replace(/\./g, '').replace(',', '.'));
     
    }
    
    // Buscar pedidos pagos
    const pedidosMatch = markdown.match(/(?:Pedidos\s+Pagos(?:\s+Mês)?|Pedidos\s+via\s+Ads?|Pedidos\s+Pagos\s+Mês)\s*[:|]\s*(\d+)/i);
    if (pedidosMatch) {
      pedidos = parseInt(pedidosMatch[1]);
     
    }
  }
  
  // Estratégia 3: Buscar por valores na tabela de forma mais genérica
  if (!investimento || !pedidos) {
    // Buscar qualquer valor R$ na linha do investimento
    const investimentoLinha = markdown.match(/\|\s*Investimento\s+em\s+Ads\s*\|\s*R\$\s*([\d.,]+)\s*\|/i);
    if (investimentoLinha) {
      investimento = parseFloat(investimentoLinha[1].replace(/\./g, '').replace(',', '.'));
    
    }
    
    // Buscar qualquer número na linha dos pedidos
    const pedidosLinha = markdown.match(/\|\s*Pedidos\s+Pagos\s+Mês\s*\|\s*(\d+)\s*\|/i);
    if (pedidosLinha) {
      pedidos = parseInt(pedidosLinha[1]);
      
    }
  }

  console.log('Investimento final:', investimento);
  console.log(' Pedidos finais:', pedidos);

  if (investimento && pedidos && pedidos > 0 && !isNaN(investimento)) {
    const cpa = (investimento / pedidos).toFixed(2);
    const cpaFormatado = `R$${cpa.replace('.', ',')}`;
   

    
    let markdownAtualizado = markdown;
    
    // Limpar RCPA em qualquer formato
    markdownAtualizado = markdownAtualizado.replace(/RCPA/g, 'Dado não informado');
    
    // Limpar CPA malformado em qualquer formato
    markdownAtualizado = markdownAtualizado.replace(
      /\|\s*CPA\s*\|\s*[^|]*R[^|]*\|/gi,
      '| CPA | Dado não informado |'
    );
    
    // Atualizar CPA na tabela se existir
    markdownAtualizado = markdownAtualizado.replace(
      /(\|\s*CPA\s*\|\s*)(?:Dado não informado|R\$\s*[\d.,]+|R?CPA\s*\|\s*[\d.,]+)(\s*\|)/gi,
      `$1${cpaFormatado}$2`
    );
    
    // Substituição específica para tabelas markdown
    markdownAtualizado = markdownAtualizado.replace(
      /\|\s*CPA\s*\|\s*[^|]*\|/gi,
      `| CPA | ${cpaFormatado} |`
    );
    
    console.log('CPA atualizado no markdown');
    
    // Verificação final: confirmar que o CPA foi atualizado
    if (markdownAtualizado.includes(cpaFormatado)) {
      console.log(' Verificação: CPA encontrado no markdown final');
      
      // Verificar se ainda há RCPA no resultado
      if (markdownAtualizado.includes('RCPA')) {
        console.log(' ATENÇÃO: RCPA ainda presente! Tentando limpeza final...');
        markdownAtualizado = markdownAtualizado.replace(/RCPA/g, cpaFormatado);
        console.log('Limpeza final aplicada');
      }
    } else {
      console.log('Verificação: CPA NÃO encontrado no markdown final');
    }
    
    return markdownAtualizado;
  } else {
    console.log(' Não foi possível calcular CPA - dados insuficientes ou inválidos');
    console.log('Investimento:', investimento, 'Pedidos:', pedidos);
    
    // Mesmo sem cálculo, limpar RCPA
    let markdownLimpo = markdown.replace(/RCPA/g, 'Dado não informado');
    return markdownLimpo;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { markdown } = await request.json();
    
    if (!markdown) {
      return NextResponse.json({ error: "Markdown é obrigatório" }, { status: 400 });
    }
    

    const markdownComCPA = calcularCPA(markdown);
    
    // CPA esperado: R$625,20 ÷ 32 = 19,54
    const cpaEsperado = '19,54';
    const cpaCalculado = markdownComCPA.includes(cpaEsperado);
    
    // Verificar se a linha malformada foi corrigida
    const linhaMalformada = markdownComCPA.includes('| CPA | R$19,54 | CPA | 9,54 |');
    const linhaCorreta = markdownComCPA.includes('| CPA | R$19,54 |') && !linhaMalformada;
    
    return NextResponse.json({
      success: true,
      original: markdown.substring(0, 1000),
      processed: markdownComCPA.substring(0, 1000),
      cpaEsperado: cpaEsperado,
      cpaCalculado: cpaCalculado,
      rcpaRemovido: !markdownComCPA.includes('RCPA'),
      linhaMalformada: linhaMalformada,
      linhaCorreta: linhaCorreta,
      message: 'Teste de CPA na rota interna concluído'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 
export const dynamic = 'force-dynamic';
