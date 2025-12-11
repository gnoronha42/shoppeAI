import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/middleware';

// Função para extrair insights chave da análise
const extractKeyInsights = (markdown: string, analysisType: string) => {
  try {
    // Regex patterns para extrair métricas específicas
    const patterns = {
      gmv: /GMV[:\s]*R?\$?\s*([\d.,]+)/gi,
      pedidos: /pedidos?[:\s]*([\d.,]+)/gi,
      roas: /ROAS[:\s]*([\d.,]+)/gi,
      conversao: /conversão[:\s]*([\d.,]+)%?/gi,
      ticketMedio: /ticket[^:]*médio[:\s]*R?\$?\s*([\d.,]+)/gi,
      produtos: /produtos?[:\s]*([\d.,]+)/gi,
      ctr: /CTR[:\s]*([\d.,]+)%?/gi,
      cpa: /CPA[:\s]*R?\$?\s*([\d.,]+)/gi,
    };

    const insights: any = {
      type: analysisType,
      extractedAt: new Date().toISOString(),
      metrics: {},
      recommendations: [],
      keyPoints: []
    };

    // Extrair métricas usando regex
    Object.entries(patterns).forEach(([key, pattern]) => {
      const matches = markdown.match(pattern);
      if (matches && matches.length > 0) {
        // Pegar a primeira ocorrência e limpar
        const value = matches[0].replace(/[^\d.,]/g, '').replace(',', '.');
        insights.metrics[key] = parseFloat(value) || matches[0];
      }
    });

    // Extrair recomendações (seções que começam com -, •, ou números)
    const recommendationSection = markdown.match(/(?:recomenda|sugest|ação|próximos passos)(.*?)(?:\n\n|\n#|$)/gi);
    if (recommendationSection) {
      const recommendations = recommendationSection[0]
        .split(/[-•\d+\.]/)
        .filter(item => item.trim().length > 10)
        .slice(0, 5) // Máximo 5 recomendações
        .map(item => item.trim().substring(0, 200)); // Máximo 200 chars cada
      
      insights.recommendations = recommendations;
    }

    // Extrair pontos-chave (parágrafos importantes)
    const keyPointsRegex = /(?:principal|importante|crítico|destaque|insight)(.*?)(?:\n\n|\n-|\n•|$)/gi;
    const keyPointsMatches = markdown.match(keyPointsRegex);
    if (keyPointsMatches) {
      insights.keyPoints = keyPointsMatches
        .slice(0, 3) // Máximo 3 pontos-chave
        .map(point => point.trim().substring(0, 300)); // Máximo 300 chars cada
    }

    // Extrair título e período se houver
    const titleMatch = markdown.match(/^#\s*(.+)/m);
    if (titleMatch) {
      insights.title = titleMatch[1].trim();
    }

    return insights;
  } catch (error) {
    console.error('Erro ao extrair insights:', error);
    return {
      type: analysisType,
      extractedAt: new Date().toISOString(),
      metrics: {},
      recommendations: [],
      keyPoints: [],
      error: 'Falha na extração'
    };
  }
};

export async function POST(request: Request) {
  try {
    
    // Obter usuário logado
    const authResult = await getCurrentUser(request);
    const userId = 'user' in authResult ? authResult.user.id : null;
    
    const body = await request.json();
    console.log('Dados recebidos:', {
      hasMarkdown: !!body.markdown,
      markdownLength: body.markdown?.length,
      clientId: body.clientId,
      clientName: body.clientName,
      analysisType: body.analysisType,
      userId: userId
    });
    
    // Validar campos obrigatórios
    if (!body.markdown) {
      console.log('❌ Erro: Campo markdown obrigatório não fornecido');
      return NextResponse.json(
        { error: 'Campo obrigatório: markdown' },
        { status: 400 }
      );
    }
    
    // Verificar se temos o clientId ou o clientName
    let clientId = body.clientId;
    
    // Se não tiver o ID mas tiver o nome, buscar o cliente pelo nome
    if (!clientId && body.clientName) {
      console.log(' Buscando cliente pelo nome:', body.clientName);
      const client = await prisma.clients.findFirst({
        where: {
          name: body.clientName
        }
      });
      
      if (!client) {
        console.log(' Cliente não encontrado:', body.clientName);
        return NextResponse.json(
          { error: 'Cliente não encontrado' },
          { status: 404 }
        );
      }
      
      clientId = client.id;
      console.log(' Cliente encontrado:', clientId);
    }
    
    // Se ainda não tiver o ID do cliente, retornar erro
    if (!clientId) {
      console.log('❌ Erro: ID do cliente não fornecido');
      return NextResponse.json(
        { error: 'É necessário fornecer o ID ou o nome do cliente' },
        { status: 400 }
      );
    }
    
    // Criar a análise no banco de dados
    // Mapear 'express' para 'account' pois o banco não aceita 'express'
    const originalAnalysisType = body.analysisType || 'account';
    const analysisType = originalAnalysisType === 'express' ? 'account' : originalAnalysisType;
    const title = `Análise de ${originalAnalysisType === 'account' ? 'Conta' : originalAnalysisType === 'ads' ? 'Anúncios' : 'Express'} - ${new Date().toLocaleDateString('pt-BR')}`;

    console.log(' Criando análise no banco:', {
      clientId,
      originalAnalysisType,
      analysisType,
      title,
      userId
    });

    const analysis = await prisma.analyses.create({
      data: {
        client_id: clientId,
        type: analysisType,
        title: title,
        created_by: userId, // Associar ao usuário logado
      },
    });

    console.log('Análise criada:', analysis.id);

    // 🧠 NOVO: Extrair insights chave para comparações futuras
    const keyInsights = extractKeyInsights(body.markdown, originalAnalysisType);
    
    // Salvar o conteúdo markdown como resultado de análise
    const analysisResult = await prisma.analysis_results.create({
      data: {
        analysis_id: analysis.id,
        content: body.markdown,
        processed_by: 'markdown-pdf'
      }
    });

    console.log('Resultado salvo:', analysisResult.id);

    // 🧠 NOVO: Salvar insights como um registro separado para facilitar comparações
    try {
      
      // Criar uma análise "resumo" para os insights
      const insightsAnalysis = await prisma.analyses.create({
        data: {
          client_id: clientId,
          type: analysisType,
          title: `Insights - ${title}`,
          created_by: userId, // Associar ao usuário logado
        },
      });

      // Salvar os insights como conteúdo JSON estruturado
      await prisma.analysis_results.create({
        data: {
          analysis_id: insightsAnalysis.id,
          content: JSON.stringify(keyInsights, null, 2),
          processed_by: 'insights-extractor'
        }
      });

      console.log(' Insights salvos para comparações futuras');
      
    } catch (insightsError) {
      console.warn(' Erro ao salvar insights (não crítico):', insightsError);
    }

    // Retornar os IDs da análise e do resultado
    return NextResponse.json({
      analysisId: analysis.id,
      resultId: analysisResult.id,
      message: 'Análise salva com sucesso'
    });

  } catch (error) {
    console.error(' Erro ao salvar análise:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar análise' },
      { status: 500 }
    );
  }
}

// Novo endpoint para excluir uma análise
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID da análise é obrigatório' },
        { status: 400 }
      );
    }
    
    // Primeiro excluir os resultados da análise (devido à restrição de chave estrangeira)
    await prisma.analysis_results.deleteMany({
      where: {
        analysis_id: id
      }
    });
    
    // Depois excluir a análise
    await prisma.analyses.delete({
      where: {
        id: id
      }
    });
    
    return NextResponse.json(
      { message: 'Análise excluída com sucesso' },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Erro ao excluir análise:', error);
    return NextResponse.json(
      { error: 'Erro ao processar a solicitação: ' + (error instanceof Error ? error.message : 'Erro desconhecido') },
      { status: 500 }
    );
  }
} 