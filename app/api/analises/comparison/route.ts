import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/lib/generated/prisma";

// Inicializar o cliente Prisma (seguindo o padrão do seu projeto)
const prisma = new PrismaClient();

// Prompt específico para comparação (separado dos prompts base)
const COMPARISON_ANALYSIS_PROMPT = `
🧠 CONSULTOR SÊNIOR SHOPEE - ANÁLISE COMPARATIVA HISTÓRICA

Você é um analista sênior com PhD em E-commerce, especializado em análise comparativa de performance Shopee.
Sua função é comparar múltiplas análises históricas e gerar insights evolutivos.

ANÁLISES PARA COMPARAÇÃO:
{ANALYSES_DATA}

PERÍODO ANALISADO: {START_DATE} a {END_DATE}
CLIENTE: {CLIENT_NAME}
TOTAL DE ANÁLISES: {TOTAL_ANALYSES}
TIPO DE ANÁLISE: {ANALYSIS_TYPE}

# 📊 RELATÓRIO COMPARATIVO HISTÓRICO - {CLIENT_NAME}

## 🎯 RESUMO EXECUTIVO
Analise a evolução das métricas principais entre as análises, identificando:
- Tendências de crescimento ou declínio
- Padrões sazonais ou cíclicos
- Mudanças significativas na performance

## 📈 ANÁLISE EVOLUTIVA

### Métricas de Vendas
Compare GMV, pedidos, ticket médio entre as análises:
- Evolução do GMV: [análise da progressão]
- Crescimento de pedidos: [tendência identificada]
- Variação do ticket médio: [padrão observado]

### Performance de Marketing
Analise ROAS, conversão, tráfego:
- Evolução do ROAS: [tendência das campanhas]
- Mudanças na conversão: [padrões identificados]
- Eficiência dos anúncios: [otimização ao longo do tempo]

### Análise de Produtos
Identifique produtos que:
- Mantiveram performance consistente
- Apresentaram crescimento expressivo  
- Perderam relevância no período

## 🔍 INSIGHTS PRINCIPAIS

### 📈 Tendências Positivas
Liste 3-5 aspectos que melhoraram consistentemente:
1. [Insight específico com dados]
2. [Melhoria identificada]
3. [Evolução positiva]

### ⚠️ Pontos de Atenção  
Identifique 3-5 aspectos que pioraram ou estagnaram:
1. [Problema recorrente]
2. [Métrica em declínio]
3. [Oportunidade perdida]

### 💡 Oportunidades Identificadas
Base-se nos dados históricos para sugerir:
1. [Oportunidade baseada em padrão histórico]
2. [Gap identificado para melhoria]
3. [Estratégia não explorada]

## 🚀 RECOMENDAÇÕES ESTRATÉGICAS

### Ações Baseadas no Histórico
- **Escalar**: Produtos/estratégias que mostraram melhores resultados
- **Corrigir**: Pontos que apresentaram declínio consistente
- **Testar**: Novas abordagens baseadas nos gaps identificados

### Estratégias Comprovadas
Liste estratégias que funcionaram no período:
1. [Estratégia eficaz identificada]
2. [Ação que gerou resultados]
3. [Tática bem-sucedida]

### Próximos Passos Recomendados
1. [Ação específica baseada na análise]
2. [Implementação sugerida]
3. [Monitoramento recomendado]

## 📊 MÉTRICAS COMPARATIVAS

| Período | GMV | Pedidos | ROAS | Conversão | Ticket Médio |
|---------|-----|---------|------|-----------|--------------|
| Análise 1 | [dados] | [dados] | [dados] | [dados] | [dados] |
| Análise 2 | [dados] | [dados] | [dados] | [dados] | [dados] |
| [continuar para todas as análises] |

## 📋 CHECKLIST DE IMPLEMENTAÇÃO
- [ ] Implementar estratégias que mostraram melhores resultados
- [ ] Corrigir pontos que apresentaram declínio recorrente  
- [ ] Monitorar métricas críticas identificadas na análise
- [ ] Testar novas abordagens baseadas nos gaps
- [ ] Estabelecer KPIs de acompanhamento mensal

## 🎯 CONCLUSÃO E PRÓXIMOS PASSOS

Com base na análise comparativa, recomendo focar em [estratégia principal] 
devido ao padrão de [resultado observado] identificado ao longo do período.
A implementação deve priorizar [ação específica] para maximizar o retorno
baseado no histórico de performance da conta.

---
*Relatório comparativo gerado em {CURRENT_DATE}*
*Baseado em {TOTAL_ANALYSES} análises do período {START_DATE} a {END_DATE}*
`;

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Iniciando API de comparação...');
    
    const { clientId, startDate, endDate, analysisType } = await request.json();

    console.log('📝 Dados recebidos:', { clientId, startDate, endDate, analysisType });

    // 1. Buscar cliente
    console.log('🔍 Buscando cliente...');
    const client = await prisma.clients.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      console.error('❌ Cliente não encontrado:', clientId);
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    console.log('✅ Cliente encontrado:', client.name);

    // 2. Buscar análises no período
    console.log('🔍 Buscando análises no período...');
    const analyses = await prisma.analyses.findMany({
      where: {
        client_id: clientId,
        type: analysisType,
        created_at: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: {
        analysis_results: true
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    console.log(`📊 Encontradas ${analyses.length} análises para comparação`);

    if (analyses.length < 2) {
      console.warn('⚠️ Análises insuficientes para comparação');
      return NextResponse.json(
        { 
          error: "Necessário pelo menos 2 análises para comparação", 
          found: analyses.length,
          suggestion: "Crie mais análises para este cliente no período selecionado"
        },
        { status: 400 }
      );
    }

    // 3. Preparar dados RESUMIDOS para comparação
    console.log('📋 Preparando dados resumidos para comparação...');

    const analysesToCompare = analyses.map((analysis, index) => {
      const content = analysis.analysis_results[0]?.content || '';
      
      // Extrair apenas seções essenciais (primeiros 1000 chars de cada seção importante)
      const sectionsToExtract = [
        'MÉTRICAS-CHAVE',
        'RESUMO EXECUTIVO', 
        'VISÃO GERAL',
        'CONCLUSÃO'
      ];
      
      let resumedContent = '';
      for (const section of sectionsToExtract) {
        const regex = new RegExp(`(${section}[\\s\\S]*?)(?=\\n#+|$)`, 'i');
        const match = content.match(regex);
        if (match) {
          resumedContent += match[1].substring(0, 500) + '\n\n';
        }
      }
      
      return {
        index: index + 1,
        created_at: analysis.created_at?.toLocaleDateString('pt-BR') || 'Data não disponível',
        type: analysis.type,
        content: resumedContent || content.substring(0, 800) // Fallback para primeiros 800 chars
      };
    });

    // 4. Montar prompt de comparação
    const analysesData = analysesToCompare.map((analysis, index) => `
ANÁLISE ${analysis.index} (${analysis.created_at}):
${analysis.content}
---
`).join('\n');

    const prompt = COMPARISON_ANALYSIS_PROMPT
      .replace('{ANALYSES_DATA}', analysesData)
      .replace('{START_DATE}', new Date(startDate).toLocaleDateString('pt-BR'))
      .replace('{END_DATE}', new Date(endDate).toLocaleDateString('pt-BR'))
      .replace('{CLIENT_NAME}', client.name)
      .replace('{TOTAL_ANALYSES}', analyses.length.toString())
      .replace('{ANALYSIS_TYPE}', analysisType === 'account' ? 'Conta' : analysisType === 'ads' ? 'Anúncios' : 'Express')
      .replace('{CURRENT_DATE}', new Date().toLocaleString('pt-BR'));

    // 5. Enviar para microserviço
    console.log('🤖 Enviando para microserviço de comparação...');
    
    let response;
    try {
      response = await fetch("http://localhost:3001/comparison", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
          clientName: client.name,
          analysisType: analysisType,
          period: `${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`,
          totalAnalyses: analyses.length
        }),
      });
    } catch (fetchError) {
      console.error("❌ Erro na conexão com microserviço:", fetchError);
      return NextResponse.json(
        { 
          error: "Erro de conexão com o microserviço", 
          details: "Verifique se o microserviço está rodando na porta 3001",
          suggestion: "Execute: cd analysis-micro && npm start"
        },
        { status: 503 }
      );
    }

    console.log('📡 Status da resposta do microserviço:', response.status);

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      console.error(`❌ Erro HTTP ${response.status} do microserviço`);
      console.error('Content-Type:', contentType);
      
      let errorData;
      try {
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          const textResponse = await response.text();
          console.error('Resposta do microserviço (text):', textResponse.substring(0, 200));
          errorData = { 
            error: `Microserviço retornou ${response.status}`, 
            details: textResponse.substring(0, 200) 
          };
        }
      } catch (parseError) {
        console.error('❌ Erro ao parsear resposta do microserviço:', parseError);
        errorData = { 
          error: `Erro ${response.status} do microserviço`, 
          details: 'Resposta inválida do servidor' 
        };
      }
      
      return NextResponse.json(
        { 
          error: "Erro no microserviço de comparação", 
          details: errorData,
          suggestion: "Verifique os logs do microserviço para mais detalhes"
        },
        { status: response.status }
      );
    }

    let comparisonData;
    try {
      comparisonData = await response.json();
    } catch (jsonError) {
      console.error("❌ Erro ao parsear JSON da resposta:", jsonError);
      const textResponse = await response.text();
      console.error('Resposta recebida (text):', textResponse.substring(0, 200));
      
      return NextResponse.json(
        { 
          error: "Resposta inválida do microserviço", 
          details: "Microserviço não retornou JSON válido",
          response: textResponse.substring(0, 200)
        },
        { status: 502 }
      );
    }

    const { comparison } = comparisonData;
    
    if (!comparison) {
      console.error("❌ Comparação não encontrada na resposta");
      return NextResponse.json(
        { 
          error: "Resposta incompleta do microserviço", 
          details: "Campo 'comparison' não encontrado na resposta"
        },
        { status: 502 }
      );
    }

    console.log("✅ Análise comparativa recebida do microserviço");

    // 6. Salvar como report de análise com título identificador
    console.log('💾 Salvando relatório de comparação...');
    const savedReport = await prisma.reports.create({
      data: {
        client_id: clientId,
        type: "analysis", // Tipo existente
        title: `COMPARAÇÃO ${analysisType.toUpperCase()} - ${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`,
        status: "completed",
        url: null,
        analysis_id: null
      }
    });

    // 7. Salvar conteúdo com identificador de comparação
    await prisma.analysis_results.create({
      data: {
        analysis_id: savedReport.id,
        content: `<!-- ANÁLISE COMPARATIVA -->\n${comparison}`, // Prefixo para identificar
        processed_by: "comparison-service"
      }
    });

    console.log("✅ Relatório comparativo salvo com sucesso:", savedReport.id);

    return NextResponse.json({ 
      reportId: savedReport.id,
      comparison: comparison,
      analysesCount: analyses.length,
      period: `${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`
    });

  } catch (error: any) {
    console.error("❌ Erro ao gerar análise comparativa:", error);
    return NextResponse.json(
      { 
        error: "Erro ao gerar análise comparativa", 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 