import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { shopeeFetch } from '@/lib/shopee';

/**
 * 🔍 TESTE DE ENDPOINTS DE ADS - Descobre quais endpoints de Ads funcionam
 * 
 * Uso: GET /api/shopee/test-ads-endpoints?client_id=xxx
 * 
 * Testa diferentes endpoints de Ads da Shopee para encontrar os que funcionam:
 * - Diferentes versões da API
 * - Diferentes nomes de endpoints
 * - Diferentes estruturas de parâmetros
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');

    if (!clientId) {
      return NextResponse.json({ error: 'client_id é obrigatório' }, { status: 400 });
    }

    const integration = await prisma.client_integrations.findUnique({
      where: { client_id_provider: { client_id: clientId, provider: 'shopee' } },
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integração não encontrada' }, { status: 404 });
    }

    const { access_token, shop_id } = integration;
    const now = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60);

    // Lista de endpoints de Ads para testar
    const adsEndpoints = [
      // Endpoints v2
      { 
        name: 'ads/get_ads_performance', 
        path: '/api/v2/ads/get_ads_performance',
        params: { time_from: thirtyDaysAgo, time_to: now, granularity: 'daily' }
      },
      { 
        name: 'ads/get_campaign_list', 
        path: '/api/v2/ads/get_campaign_list',
        params: { page_size: 50, offset: 0 }
      },
      { 
        name: 'ads/get_campaign_performance', 
        path: '/api/v2/ads/get_campaign_performance',
        params: { time_from: thirtyDaysAgo, time_to: now }
      },
      { 
        name: 'marketing_solution/get_ads_performance', 
        path: '/api/v2/marketing_solution/get_ads_performance',
        params: { time_from: thirtyDaysAgo, time_to: now }
      },
      
      // Endpoints v1 (fallback)
      { 
        name: 'ads/get_ads_performance_v1', 
        path: '/api/v1/ads/get_ads_performance',
        params: { time_from: thirtyDaysAgo, time_to: now }
      },
      
      // Endpoints alternativos
      { 
        name: 'shop/get_ads_data', 
        path: '/api/v2/shop/get_ads_data',
        params: { time_from: thirtyDaysAgo, time_to: now }
      },
      { 
        name: 'marketing/get_performance', 
        path: '/api/v2/marketing/get_performance',
        params: { time_from: thirtyDaysAgo, time_to: now }
      },
      
      // Endpoints de campanha específicos
      { 
        name: 'ads/keyword/get_performance', 
        path: '/api/v2/ads/keyword/get_performance',
        params: { time_from: thirtyDaysAgo, time_to: now }
      }
    ];

    const results = [];

    for (const endpoint of adsEndpoints) {
      console.log(`\n🧪 [testAdsEndpoints] Testando: ${endpoint.name}`);
      
      try {
        const response = await shopeeFetch({
          path: endpoint.path,
          access_token: access_token!,
          shop_id: shop_id!,
          query: endpoint.params
        });

        results.push({
          endpoint: endpoint.name,
          path: endpoint.path,
          status: 'success',
          response_size: JSON.stringify(response).length,
          has_data: !!response?.response || !!response?.data,
          sample_response: JSON.stringify(response).substring(0, 500) + '...'
        });

        console.log(`✅ [testAdsEndpoints] ${endpoint.name}: SUCCESS`);
        
      } catch (error: any) {
        const errorMsg = error.message || 'Erro desconhecido';
        const status = errorMsg.includes('404') ? '404_not_found' : 
                     errorMsg.includes('403') ? '403_forbidden' : 
                     errorMsg.includes('401') ? '401_unauthorized' : 'error';

        results.push({
          endpoint: endpoint.name,
          path: endpoint.path,
          status,
          error: errorMsg,
          error_details: errorMsg.includes('404') ? 'Endpoint não existe' :
                        errorMsg.includes('403') ? 'Sem permissão para acessar' :
                        errorMsg.includes('401') ? 'Token inválido' : 'Erro desconhecido'
        });

        console.log(`❌ [testAdsEndpoints] ${endpoint.name}: ${status} - ${errorMsg}`);
      }

      // Pausa entre requisições para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Analisar resultados
    const workingEndpoints = results.filter(r => r.status === 'success');
    const notFoundEndpoints = results.filter(r => r.status === '404_not_found');
    const forbiddenEndpoints = results.filter(r => r.status === '403_forbidden');
    const errorEndpoints = results.filter(r => r.status === 'error');

    const summary = {
      total_tested: results.length,
      working: workingEndpoints.length,
      not_found: notFoundEndpoints.length,
      forbidden: forbiddenEndpoints.length,
      errors: errorEndpoints.length,
      recommendations: []
    };

    // Gerar recomendações
    if (workingEndpoints.length > 0) {
      summary.recommendations.push(`✅ Encontrados ${workingEndpoints.length} endpoints funcionando!`);
      summary.recommendations.push('💡 Use os endpoints que funcionam para buscar dados de Ads');
      workingEndpoints.forEach(ep => {
        summary.recommendations.push(`🔗 ${ep.endpoint}: ${ep.path}`);
      });
    } else {
      summary.recommendations.push('❌ Nenhum endpoint de Ads está funcionando');
      
      if (forbiddenEndpoints.length > 0) {
        summary.recommendations.push('🔐 Alguns endpoints existem mas você não tem permissão');
        summary.recommendations.push('💡 Verifique as permissões da sua aplicação no Shopee Partner Center');
      }
      
      if (notFoundEndpoints.length === results.length) {
        summary.recommendations.push('🤔 Todos os endpoints retornaram 404 - pode ser que a API mudou');
        summary.recommendations.push('📚 Verifique a documentação mais recente da Shopee');
      }
      
      summary.recommendations.push('🔄 Como fallback, use estimativas baseadas no GMV quando houver vendas');
    }

    return NextResponse.json({
      success: true,
      client_id: clientId,
      shop_id: shop_id,
      test_results: results,
      summary,
      tested_at: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('❌ Erro no teste de endpoints de Ads:', err);
    return NextResponse.json({ 
      success: false,
      error: err.message || 'Erro interno',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}
