import { NextRequest, NextResponse } from "next/server";

// Função para calcular CPA (copiada do microserviço)
function calcularCPA(markdown: string): string {

  
  // Múltiplas estratégias para encontrar investimento e pedidos
  let investimento: number | null = null;
  let pedidos: number | null = null;
  
  // Buscar investimento e pedidos na tabela
  const investimentoLinha = markdown.match(/\|\s*Investimento\s+em\s+Ads\s*\|\s*R\$\s*([\d.,]+)\s*\|/i);
  if (investimentoLinha) {
    investimento = parseFloat(investimentoLinha[1].replace(/\./g, '').replace(',', '.'));
    console.log(' Investimento encontrado:', investimento);
  }
  
  const pedidosLinha = markdown.match(/\|\s*Pedidos\s+Pagos\s+Mês\s*\|\s*(\d+)\s*\|/i);
  if (pedidosLinha) {
    pedidos = parseInt(pedidosLinha[1]);
    console.log('Pedidos encontrados:', pedidos);
  }

  console.log('Investimento final:', investimento);
  console.log('Pedidos finais:', pedidos);

  if (investimento && pedidos && pedidos > 0 && !isNaN(investimento)) {
    const cpa = (investimento / pedidos).toFixed(2);
    const cpaFormatado = cpa.replace('.', ',');
    console.log(' CPA calculado:', cpaFormatado);
    
    let markdownAtualizado = markdown;
    
    // Limpar linha malformada do CPA primeiro (ex: | CPA | R$19,54 | CPA | 9,54 |)
    markdownAtualizado = markdownAtualizado.replace(
      /\|\s*CPA\s*\|\s*R\$[\d.,]+\s*\|\s*CPA\s*\|\s*[\d.,]+\s*\|/gi,
      '| CPA | Dado não informado |'
    );
    
    // Limpar RCPA em qualquer formato
    markdownAtualizado = markdownAtualizado.replace(/RCPA/g, 'Dado não informado');
    
    // Atualizar CPA na tabela
    markdownAtualizado = markdownAtualizado.replace(
      /(\|\s*CPA\s*\|\s*)(?:Dado não informado|R\$\s*[\d.,]+)(\s*\|)/gi,
      `$1${cpaFormatado}$2`
    );
    
    console.log(' CPA atualizado no markdown');
    return markdownAtualizado;
  } else {
    console.log(' Não foi possível calcular CPA');
    // Mesmo sem cálculo, limpar linha malformada
    let markdownLimpo = markdown.replace(
      /\|\s*CPA\s*\|\s*R\$[\d.,]+\s*\|\s*CPA\s*\|\s*[\d.,]+\s*\|/gi,
      '| CPA | Dado não informado |'
    );
    return markdownLimpo;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Testar com markdown malformado como exemplo
    const markdownMalformado = `## 📊 RELATÓRIO DE ANÁLISE DE CONTA – SHOPEE
Loja: naty_store  
Período Analisado: Último mês (19/04/2025 – 18/05/2025, comparativo mês anterior)  
Objetivo: Diagnóstico completo e orientações estratégicas para crescimento sustentável e aumento de vendas.

| Indicador             | Valor      |
|-----------------------|------------|
| Visitantes Mês        | 18.267     |
| CPA | R$19,54 | CPA | 9,54 |
| GMV Mês               | R$3.955,50 |
| Pedidos Pagos Mês     | 32         |
| Taxa de Conversão Mês | 0,17%      |
| Investimento em Ads   | R$625,20   |
| Ticket Médio Mês      | R$123,61   |
| ROAS                  | 5,61       |`;


    const markdownCorrigido = calcularCPA(markdownMalformado);
    
    return NextResponse.json({
      success: true,
      original: markdownMalformado,
      processed: markdownCorrigido,
      linhaMalformadaOriginal: markdownMalformado.includes('| CPA | R$19,54 | CPA | 9,54 |'),
      linhaMalformadaCorrigida: !markdownCorrigido.includes('| CPA | R$19,54 | CPA | 9,54 |'),
             cpaCorreto: markdownCorrigido.includes('| CPA | 19,54 |'),
      message: 'Teste de CPA malformado concluído'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { markdown } = await request.json();
    
    if (!markdown) {
      return NextResponse.json({ error: "Markdown é obrigatório" }, { status: 400 });
    }
    
    
    const markdownComCPA = calcularCPA(markdown);
    
         // Verificar se a linha malformada foi corrigida
     const linhaMalformada = markdownComCPA.includes('| CPA | R$19,54 | CPA | 9,54 |');
     const linhaCorreta = markdownComCPA.includes('| CPA | 19,54 |') && !linhaMalformada;
    
    return NextResponse.json({
      success: true,
      original: markdown.substring(0, 1000),
      processed: markdownComCPA.substring(0, 1000),
      linhaMalformada: linhaMalformada,
      linhaCorreta: linhaCorreta,
      rcpaRemovido: !markdownComCPA.includes('RCPA'),
      message: 'Teste de CPA com markdown real concluído'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 