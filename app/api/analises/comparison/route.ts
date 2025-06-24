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
    const { clientId, startDate, endDate, analysisType } = await request.json();

    console.log('🔍 Iniciando busca de análises para comparação');
    console.log(`📊 Cliente ID: ${clientId}`);
    console.log(`📅 Período: ${startDate} a ${endDate}`);
    console.log(`📈 Tipo: ${analysisType}`);

    // 1. CORRIGIDO: Usar clientId como string (UUID)
    const analysisResults = await prisma.analysis_results.findMany({
      where: {
        analyses: {
          client_id: clientId,
          type: analysisType,
          created_at: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }
      },
      include: {
        analyses: {
          select: {
            title: true,
            type: true,
            created_at: true,
            client_id: true
          }
        }
      },
      orderBy: {
        created_at: 'asc'
      }
    });

    console.log(`📋 Encontradas ${analysisResults.length} análises para comparação`);

    if (analysisResults.length < 2) {
      return NextResponse.json({
        error: 'São necessárias pelo menos 2 análises do mesmo tipo no período selecionado',
        found: analysisResults.length,
        period: `${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`
      }, { status: 400 });
    }

    // 2. CORRIGIDO: Usar clientId como string
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { name: true }
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    // 3. Preparar dados para o microserviço
    const period = `${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`;
    
    const analyses = analysisResults.map(result => ({
      id: result.id,
      title: result.analyses?.title || 'Análise sem título',
      content: result.content,
      created_at: result.analyses?.created_at || result.created_at,
      type: result.analyses?.type || analysisType
    }));
    
    const requestBody = {
      clientName: client.name,
      analysisType: analysisType,
      startDate: startDate,
      endDate: endDate,
      period: period,
      analyses: analyses
    };

    console.log('🚀 Enviando para microserviço de comparação...');

    // 4. Chamar microserviço
    const microserviceResponse = await fetch('https://analysis-micro.onrender.com/comparison', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!microserviceResponse.ok) {
      const errorData = await microserviceResponse.json();
      console.error('❌ Erro do microserviço:', errorData);
      return NextResponse.json({
        error: 'Erro no microserviço de análise',
        details: errorData.error || 'Erro desconhecido'
      }, { status: 500 });
    }

    const { comparison, metadata } = await microserviceResponse.json();

    // 5. CORRIGIDO: Remover campos que não existem no schema
    console.log('💾 Salvando resultado da comparação...');
    
    // Primeiro criar o registro na tabela analyses (removido 'status')
    const savedAnalysis = await prisma.analyses.create({
      data: {
        client_id: clientId,
        type: analysisType,
        title: `Comparação ${analysisType.toUpperCase()} - ${period}`
      }
    });

    // Depois criar o resultado da análise
    const savedAnalysisResult = await prisma.analysis_results.create({
      data: {
        analysis_id: savedAnalysis.id,
        content: comparison,
        processed_by: "comparison-service"
      }
    });

    // Tentar salvar na tabela reports com diferentes tipos válidos
    let savedReport = null;
    const reportTypes = ["report", "comparison", "document", "analysis", "pdf"];
    
    for (const reportType of reportTypes) {
      try {
        savedReport = await prisma.reports.create({
          data: {
            client_id: clientId,
            type: reportType,
            title: `COMPARAÇÃO ${analysisType.toUpperCase()} - ${period}`,
            status: "completed",
            url: null
          }
        });
        console.log(`✅ Report salvo com tipo: ${reportType}`);
        break;
      } catch (error) {
        console.log(`❌ Falha ao salvar report com tipo '${reportType}':`, error instanceof Error ? error.message : 'Erro desconhecido');
        continue;
      }
    }

    if (!savedReport) {
      console.log('⚠️ Não foi possível salvar o report - continuando sem ele');
    }

    console.log('✅ Comparação salva com sucesso');
    
    return NextResponse.json({
      comparison,
      reportId: savedReport?.id || null,
      analysisResultId: savedAnalysisResult.id,
      analysesCount: analyses.length,
      period,
      metadata: {
        ...metadata,
        savedAnalysisId: savedAnalysis.id,
        analysisResultId: savedAnalysisResult.id,
        reportSaved: !!savedReport
      }
    });

  } catch (error) {
    console.error('❌ Erro na API de comparação:', error);
    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
} 