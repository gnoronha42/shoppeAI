import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Cache para armazenar resultados recentes
const resultsCache = new Map();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutos

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validar campos obrigatórios
    if (!body.clientId || !body.type || !body.results) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: clientId, type, results' },
        { status: 400 }
      );
    }
    
    // Criar a análise no banco de dados com tempo otimizado
    const analysis = await prisma.analyses.create({
      data: {
        client_id: body.clientId,
        type: body.type,
        title: body.title || `Análise de ${body.type === 'account' ? 'Conta' : 'Anúncios'}`
      },
    });
    
    // Paralelizar operações para melhorar desempenho
    const operations = [];
    
    // Preparar operação para salvar resultados de análise
    const resultsOperation = Promise.all(
      body.results.map(async (result: any) => {
        // Validar conteúdo antes de salvar
        if (!result.analysis) {
          console.warn('Conteúdo de análise vazio detectado');
          return null;
        }
        
        return prisma.analysis_results.create({
          data: {
            analysis_id: analysis.id,
            content: result.analysis,
            source_image_url: result.imageUrl || null,
            processed_by: 'openai' // Atualizado para utilizar OpenAI
          }
        });
      })
    );
    
    operations.push(resultsOperation);
    
    // Preparar operação para salvar imagens
    if (body.imageUrls && body.imageUrls.length > 0) {
      const imagesOperation = Promise.all(
        body.imageUrls.map(async (url: string, index: number) => {
          return prisma.images.create({
            data: {
              analysis_id: analysis.id,
              url: url,
              original_filename: body.results[index]?.filename || `image-${index + 1}.jpg`,
              mime_type: body.results[index]?.mimeType || 'image/jpeg'
            }
          });
        })
      );
      
      operations.push(imagesOperation);
    }
    
    // Executar todas as operações em paralelo
    const [analysisResults] = await Promise.all(operations);
    
    // Adicionar ao cache
    resultsCache.set(`analysis_${analysis.id}`, {
      data: { 
        id: analysis.id,
        results: analysisResults.filter(Boolean),
        message: 'Análise criada com sucesso'
      },
      timestamp: Date.now()
    });
    
    return NextResponse.json(
      { 
        id: analysis.id,
        results: analysisResults.filter(Boolean),
        message: 'Análise criada com sucesso'
      }, 
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Erro ao criar análise:', error);
    return NextResponse.json(
      { error: 'Erro ao processar a solicitação: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const analysisId = searchParams.get('id');
    
    console.log("GET /api/analises - Params:", { clientId, analysisId, url: request.url });
    
    // Verificar cache para análise específica
    if (analysisId) {
      const cacheKey = `analysis_${analysisId}`;
      const cachedData = resultsCache.get(cacheKey);
      
      if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
        return NextResponse.json(cachedData.data);
      }
    }
    
    // Verificar cache para análises do cliente
    if (clientId) {
      const cacheKey = `client_analyses_${clientId}`;
      const cachedData = resultsCache.get(cacheKey);
      
      if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
        return NextResponse.json(cachedData.data);
      }
    }
    
    // Construir consulta
    let where: any = {};
    
    if (analysisId) {
      where.id = analysisId;
    } else if (clientId) {
      where.client_id = clientId;
    }
    
    console.log("Database query where clause:", where);
    
    // Otimização de consulta: limitar a consulta a 100 registros recentes
    const analyses = await prisma.analyses.findMany({
      where,
      orderBy: {
        created_at: 'desc'
      },
      include: {
        analysis_results: true,
        images: true
      },
      take: 100
    });
    
    console.log(`Found ${analyses.length} analyses in database`);
    
    // Armazenar em cache
    if (analysisId) {
      resultsCache.set(`analysis_${analysisId}`, {
        data: analyses[0] || null,
        timestamp: Date.now()
      });
    } else if (clientId) {
      resultsCache.set(`client_analyses_${clientId}`, {
        data: analyses,
        timestamp: Date.now()
      });
    }
    
    return NextResponse.json(analyses);
  } catch (error) {
    console.error('Erro ao buscar análises:', error);
    return NextResponse.json(
      { error: 'Erro ao processar a solicitação: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    );
  }
}

// Nova rota para obter resultados de análise específicos para anúncios
export async function OPTIONS(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const clientId = searchParams.get('clientId');
    
    if (!type || !clientId) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: type, clientId' },
        { status: 400 }
      );
    }
    
    // Verificar cache
    const cacheKey = `client_${clientId}_${type}_stats`;
    const cachedData = resultsCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
      return NextResponse.json(cachedData.data);
    }
    
    // Buscar apenas as análises do tipo solicitado
    const analyses = await prisma.analyses.findMany({
      where: {
        client_id: clientId,
        type: type
      },
      orderBy: {
        created_at: 'desc'
      },
      include: {
        analysis_results: {
          select: {
            content: true,
            created_at: true
          }
        }
      },
      take: 10 // Apenas as 10 análises mais recentes
    });
    
    // Armazenar em cache
    const data = analyses.map(a => ({
      id: a.id,
      title: a.title,
      created_at: a.created_at,
      results_count: a.analysis_results.length
    }));
    
    resultsCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro ao buscar estatísticas de análise:', error);
    return NextResponse.json(
      { error: 'Erro ao processar a solicitação: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    );
  }
}

// Função para limpar texto de símbolos estranhos
function cleanReportText(text: string): string {
  if (!text) return text;
  
  return text
    // Remover símbolos estranhos específicos detectados
    .replace(/Ø=Ý|Ø>Ýî|Ø=ÜÉ|Ø=Üæ|Ø=ÜÍ|Ø=ßâ|Ø=ÜÌ|Ø=ÜÈ|Ø=ÜÐ|Ø=ÜÊ|Ø>Ýí|&\s?þ/g, '')
    // Remover outros caracteres especiais ou não-ASCII
    .replace(/[^\x20-\x7E\n#\-*>:.,'"\[\](){}|]/g, '')
    // Corrigir formatação de números (remover espaços extras)
    .replace(/(\d+)\s*,\s*(\d+)/g, '$1,$2')
    // Corrigir formatação de valores monetários
    .replace(/R\$\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g, 'R$ $1.$2,$3')
    // Corrigir formatação de porcentagens
    .replace(/(\d+)\s*,\s*(\d+)\s*\.\s*0+%/g, '$1,$2%')
    .replace(/(\d+)\s*\.\s*(\d+)%/g, '$1,$2%');
}

// Nova rota para limpar textos
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    if (!body.analysisId) {
      return NextResponse.json(
        { error: 'Campo obrigatório: analysisId' },
        { status: 400 }
      );
    }
    
    // Buscar análise existente
    const analysis = await prisma.analyses.findUnique({
      where: { id: body.analysisId },
      include: { analysis_results: true }
    });
    
    if (!analysis) {
      return NextResponse.json(
        { error: 'Análise não encontrada' },
        { status: 404 }
      );
    }
    
    // Processar cada resultado de análise e limpar o texto
    const updatedResults = await Promise.all(
      analysis.analysis_results.map(async (result) => {
        // Limpar o texto
        const cleanedContent = cleanReportText(result.content);
        
        if (cleanedContent !== result.content) {
          // Atualizar apenas se o conteúdo foi alterado
          return prisma.analysis_results.update({
            where: { id: result.id },
            data: { content: cleanedContent }
          });
        }
        
        return result;
      })
    );
    
    // Limpar cache
    const cacheKey = `analysis_${body.analysisId}`;
    resultsCache.delete(cacheKey);
    
    return NextResponse.json({
      message: 'Análise limpa com sucesso',
      analysisId: body.analysisId,
      resultsUpdated: updatedResults.length
    });
    
  } catch (error) {
    console.error('Erro ao limpar análise:', error);
    return NextResponse.json(
      { error: 'Erro ao processar a solicitação: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    );
  }
}

// Atualização para a função PATCH para também limpar o texto
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    
    // Validar campos obrigatórios
    if (!body.clientId || !body.analysisId) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: clientId, analysisId' },
        { status: 400 }
      );
    }
    
    // Verificar cache
    const cacheKey = `ads_report_${body.analysisId}`;
    const cachedData = resultsCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
      return NextResponse.json(cachedData.data);
    }
    
    // Buscar análise específica com resultados completos
    const analysis = await prisma.analyses.findFirst({
      where: {
        id: body.analysisId,
        client_id: body.clientId,
        type: 'ads'  // Garantir que é uma análise de anúncios
      },
      include: {
        analysis_results: true,
        images: true
      }
    });
    
    if (!analysis) {
      return NextResponse.json(
        { error: 'Análise não encontrada' },
        { status: 404 }
      );
    }
    
    // Processar dados para o relatório, limpando o texto
    const reportData = {
      id: analysis.id,
      title: analysis.title,
      created_at: analysis.created_at,
      client_id: analysis.client_id,
      type: analysis.type,
      results: analysis.analysis_results.map(result => ({
        id: result.id,
        content: cleanReportText(result.content),
        created_at: result.created_at,
        // Extrair métricas relevantes do texto de análise
        metrics: extractAdsMetrics(cleanReportText(result.content))
      })),
      images: analysis.images.map(img => ({
        id: img.id,
        url: img.url,
        filename: img.original_filename
      }))
    };
    
    // Salvar em cache
    resultsCache.set(cacheKey, {
      data: reportData,
      timestamp: Date.now()
    });
    
    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Erro ao gerar relatório de ADS:', error);
    return NextResponse.json(
      { error: 'Erro ao processar a solicitação: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    );
  }
}

// Função para extrair métricas específicas de anúncios do conteúdo da análise
function extractAdsMetrics(content: string) {
  // Valores padrão
  const metrics:any = {
    roas: null,
    ctr: null,
    cpa: null,
    investimento: null,
    conversao: null,
    classificacao: null,
  };
  
  try {
    // Extrair ROAS
    const roasMatch = content.match(/ROAS:?\s*([\d,]+)/i);
    if (roasMatch && roasMatch[1]) {
      metrics.roas = parseFloat(roasMatch[1].replace(',', '.'));
    }
    
    // Extrair CTR
    const ctrMatch = content.match(/CTR:?\s*([\d,]+)%/i);
    if (ctrMatch && ctrMatch[1]) {
      metrics.ctr = parseFloat(ctrMatch[1].replace(',', '.'));
    }
    
    // Extrair CPA
    const cpaMatch = content.match(/CPA:?\s*R\$\s*([\d.,]+)/i);
    if (cpaMatch && cpaMatch[1]) {
      metrics.cpa = parseFloat(cpaMatch[1].replace('.', '').replace(',', '.'));
    }
    
    // Extrair Investimento
    const investimentoMatch = content.match(/Investimento:?\s*R\$\s*([\d.,]+)/i);
    if (investimentoMatch && investimentoMatch[1]) {
      metrics.investimento = parseFloat(investimentoMatch[1].replace('.', '').replace(',', '.'));
    }
    
    // Extrair Taxa de Conversão
    const conversaoMatch = content.match(/Conversão:?\s*([\d,]+)%/i);
    if (conversaoMatch && conversaoMatch[1]) {
      metrics.conversao = parseFloat(conversaoMatch[1].replace(',', '.'));
    }
    
    // Extrair classificação da conta
    if (content.includes('PERFIL ESCALÁVEL')) {
      metrics.classificacao = 'escalável';
    } else if (content.includes('PERFIL RENTABILIDADE')) {
      metrics.classificacao = 'rentabilidade';
    } else if (content.includes('PERFIL CORTE')) {
      metrics.classificacao = 'corte';
    }
    
  } catch (e) {
    console.warn('Erro ao extrair métricas:', e);
  }
  
  return metrics;
} 