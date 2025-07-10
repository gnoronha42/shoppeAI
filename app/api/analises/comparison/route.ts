import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/lib/generated/prisma";

// Inicializar o cliente Prisma (seguindo o padrão do seu projeto)
const prisma = new PrismaClient();

// 🧠 Função para preparar dados otimizados para o microserviço
const prepareAnalysesForComparison = (analysisResults: any[], maxAnalyses: number = 50) => {
  // Ordenar por relevância (insights primeiro, depois por data mais recente)
  const sortedResults = analysisResults.sort((a, b) => {
    // Priorizar insights estruturados
    if (a.processed_by === 'insights-extractor' && b.processed_by !== 'insights-extractor') return -1;
    if (b.processed_by === 'insights-extractor' && a.processed_by !== 'insights-extractor') return 1;
    
    // Depois ordenar por data (mais recente primeiro)
    const dateA = new Date(a.analyses?.created_at || a.created_at);
    const dateB = new Date(b.analyses?.created_at || b.created_at);
    return dateB.getTime() - dateA.getTime();
  });

  // Limitar número de análises para evitar overflow de tokens
  const limitedResults = sortedResults.slice(0, maxAnalyses);
  
  console.log(`📊 Processando ${limitedResults.length}/${analysisResults.length} análises (limite: ${maxAnalyses})`);

  return limitedResults.map((result, index) => {
    try {
      // Se temos insights estruturados, usar eles para otimizar
      if (result.processed_by === 'insights-extractor') {
        const insights = JSON.parse(result.content);
        
        // Reconstruir conteúdo otimizado baseado nos insights
        const optimizedContent = `
ANÁLISE ${index + 1} - RESUMO OTIMIZADO
Data: ${new Date(result.analyses?.created_at || result.created_at).toLocaleDateString('pt-BR')}

MÉTRICAS PRINCIPAIS:
- GMV: R$ ${insights.metrics?.gmv || 'N/D'}
- Pedidos: ${insights.metrics?.pedidos || 'N/D'}
- ROAS: ${insights.metrics?.roas || 'N/D'}
- Conversão: ${insights.metrics?.conversao || 'N/D'}%
- Ticket Médio: R$ ${insights.metrics?.ticketMedio || 'N/D'}
- CTR: ${insights.metrics?.ctr || 'N/D'}%
- CPA: R$ ${insights.metrics?.cpa || 'N/D'}

PRINCIPAIS RECOMENDAÇÕES:
${insights.recommendations?.map((rec: string, i: number) => `${i + 1}. ${rec}`).join('\n') || 'Nenhuma recomendação extraída'}

INSIGHTS CRÍTICOS:
${insights.keyPoints?.map((point: string, i: number) => `${i + 1}. ${point}`).join('\n') || 'Nenhum insight crítico extraído'}

TÍTULO ORIGINAL: ${insights.title || result.analyses?.title || 'Título não disponível'}
        `;

        return {
          id: result.id,
          title: result.analyses?.title || `Análise ${index + 1}`,
          content: optimizedContent,
          created_at: result.analyses?.created_at || result.created_at,
          type: result.analyses?.type || 'account',
          isOptimized: true,
          originalLength: result.content.length,
          optimizedLength: optimizedContent.length
        };
      } else {
        // Para análises completas, usar conteúdo original mas truncado se muito longo
        let content = result.content;
        
        // Truncamento mais agressivo para muitas análises
        const maxLength = limitedResults.length > 20 ? 2000 : 3000;
        
        if (content.length > maxLength) {
          const inicio = content.substring(0, Math.floor(maxLength * 0.7));
          const fim = content.substring(content.length - Math.floor(maxLength * 0.3));
          content = `${inicio}\n\n[... CONTEÚDO TRUNCADO PARA OTIMIZAÇÃO ...]\n\n${fim}`;
        }

        return {
          id: result.id,
          title: result.analyses?.title || `Análise ${index + 1}`,
          content: content,
          created_at: result.analyses?.created_at || result.created_at,
          type: result.analyses?.type || 'account',
          isOptimized: false,
          originalLength: result.content.length,
          optimizedLength: content.length
        };
      }
    } catch (error) {
      console.warn(`Erro ao processar análise ${index + 1}:`, error);
      
      // Fallback para conteúdo truncado
      const content = result.content.substring(0, 1500) + '\n\n[ANÁLISE TRUNCADA POR ERRO DE PROCESSAMENTO]';
      
      return {
        id: result.id,
        title: result.analyses?.title || `Análise ${index + 1}`,
        content: content,
        created_at: result.analyses?.created_at || result.created_at,
        type: result.analyses?.type || 'account',
        isOptimized: false,
        hasError: true
      };
    }
  });
};

export async function POST(request: NextRequest) {
  try {
    const { clientId, startDate, endDate, analysisType, maxAnalyses = 50 } = await request.json();

    console.log('🔍 Iniciando busca de análises para comparação');
    console.log(`📊 Cliente ID: ${clientId}`);
    console.log(`📅 Período: ${startDate} a ${endDate}`);
    console.log(`📈 Tipo: ${analysisType}`);
    console.log(`🔢 Limite máximo: ${maxAnalyses} análises`);

    // 1. Buscar INSIGHTS estruturados primeiro (prioridade)
    const insightResults = await prisma.analysis_results.findMany({
      where: {
        processed_by: 'insights-extractor',
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

    console.log(`💡 Encontrados ${insightResults.length} insights estruturados`);

    // 2. Buscar análises completas para complementar
    const fullAnalysisResults = await prisma.analysis_results.findMany({
      where: {
        processed_by: 'markdown-pdf',
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

    console.log(`📋 Encontradas ${fullAnalysisResults.length} análises completas`);

    // 3. Combinar resultados, priorizando insights quando disponíveis
    const combinedResults: any[] = [];
    const datesProcessed = new Set<string>();

    // Primeiro, adicionar insights estruturados
    insightResults.forEach(insight => {
      const createdAt = insight.analyses?.created_at || insight.created_at;
      const date = createdAt ? new Date(createdAt).toDateString() : new Date().toDateString();
      combinedResults.push(insight);
      datesProcessed.add(date);
    });

    // Depois, adicionar análises completas que não têm insights correspondentes
    fullAnalysisResults.forEach(analysis => {
      const createdAt = analysis.analyses?.created_at || analysis.created_at;
      const date = createdAt ? new Date(createdAt).toDateString() : new Date().toDateString();
      if (!datesProcessed.has(date)) {
        combinedResults.push(analysis);
      }
    });

    if (combinedResults.length < 2) {
      return NextResponse.json({
        error: 'São necessárias pelo menos 2 análises do mesmo tipo no período selecionado',
        found: combinedResults.length,
        period: `${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`
      }, { status: 400 });
    }

    // 4. Buscar dados do cliente
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { name: true }
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    // 5. Preparar dados otimizados para o microserviço COM LIMITE
    const period = `${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`;
    const optimizedAnalyses = prepareAnalysesForComparison(combinedResults, maxAnalyses);

    // Validação de tokens estimados
    const estimatedTokens = optimizedAnalyses.reduce((sum, analysis) => sum + Math.ceil(analysis.optimizedLength / 4), 0);
    const maxTokensAllowed = 100000; // Margem de segurança para GPT-4 Turbo
    
    if (estimatedTokens > maxTokensAllowed) {
      console.warn(`⚠️ Tokens estimados (${estimatedTokens}) excedem limite seguro (${maxTokensAllowed})`);
      
      // Reduzir ainda mais o número de análises se necessário
      const safeLimit = Math.floor(maxTokensAllowed / (estimatedTokens / optimizedAnalyses.length));
      const safeAnalyses = prepareAnalysesForComparison(combinedResults, safeLimit);
      
      console.log(`🔄 Reduzindo para ${safeLimit} análises por segurança de tokens`);
      
             return NextResponse.json({
         error: 'Muitas análises para processar',
         warning: `Número de análises reduzido para ${safeLimit} devido ao limite de tokens. Use períodos menores para análises mais detalhadas.`,
         tokenLimitReached: true,
         estimatedTokens,
         maxTokensAllowed,
         suggestedLimit: safeLimit
       });
    }

    // Log de otimização melhorado
    const totalOriginalSize = optimizedAnalyses.reduce((sum, analysis) => sum + (analysis.originalLength || 0), 0);
    const totalOptimizedSize = optimizedAnalyses.reduce((sum, analysis) => sum + (analysis.optimizedLength || 0), 0);
    const optimizedCount = optimizedAnalyses.filter(a => a.isOptimized).length;

    console.log(`🚀 Otimização realizada:`);
    console.log(`📊 ${optimizedCount}/${optimizedAnalyses.length} análises otimizadas via insights`);
    console.log(`📉 Redução de tamanho: ${totalOriginalSize} → ${totalOptimizedSize} chars (${Math.round((1 - totalOptimizedSize/totalOriginalSize) * 100)}% reduzido)`);
    console.log(`🔢 Tokens estimados: ${estimatedTokens} (limite: ${maxTokensAllowed})`);

    // 6. Preparar payload para o microserviço
    const requestBody = {
      clientName: client.name,
      analysisType: analysisType,
      startDate: startDate,
      endDate: endDate,
      period: period,
      analyses: optimizedAnalyses
    };

    console.log('🚀 Enviando para microserviço de comparação...');

    // 7. Chamar microserviço de comparação
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
        error: 'Erro no microserviço de comparação',
        details: errorData.error || 'Erro desconhecido'
      }, { status: 500 });
    }

    const { comparison, metadata } = await microserviceResponse.json();

    // 8. Salvar resultado da comparação
    console.log('💾 Salvando resultado da comparação...');
    
    const savedAnalysis = await prisma.analyses.create({
      data: {
        client_id: clientId,
        type: analysisType,
        title: `COMPARAÇÃO ${analysisType.toUpperCase()} - ${period}`
      }
    });

    const savedAnalysisResult = await prisma.analysis_results.create({
      data: {
        analysis_id: savedAnalysis.id,
        content: comparison,
        processed_by: "comparison-microservice-optimized"
      }
    });

    // 9. Tentar salvar na tabela reports
    let savedReport = null;
      try {
        savedReport = await prisma.reports.create({
          data: {
            client_id: clientId,
          type: "comparison",
            title: `COMPARAÇÃO ${analysisType.toUpperCase()} - ${period}`,
            status: "completed",
            url: null
          }
        });
      } catch (error) {
      console.log('⚠️ Não foi possível salvar o report:', error);
    }

    console.log('✅ Comparação concluída com sucesso');
    
    return NextResponse.json({
      comparison,
      reportId: savedReport?.id || null,
      analysisResultId: savedAnalysisResult.id,
      analysesCount: optimizedAnalyses.length,
      totalAnalysesFound: combinedResults.length,
      insightsUsed: optimizedCount,
      fullAnalysesUsed: optimizedAnalyses.length - optimizedCount,
      period,
      optimization: {
        originalSize: totalOriginalSize,
        optimizedSize: totalOptimizedSize,
        reductionPercentage: Math.round((1 - totalOptimizedSize/totalOriginalSize) * 100),
        tokensSaved: Math.round((totalOriginalSize - totalOptimizedSize) / 4),
        estimatedTokens,
        maxTokensAllowed
      },
      metadata: {
        ...metadata,
        savedAnalysisId: savedAnalysis.id,
        analysisResultId: savedAnalysisResult.id,
        reportSaved: !!savedReport,
        processingMethod: 'microservice-optimized',
        limitApplied: optimizedAnalyses.length < combinedResults.length
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