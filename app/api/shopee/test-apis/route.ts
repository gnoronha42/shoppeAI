import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { shopeeFetch } from '@/lib/shopee';

export const dynamic = 'force-dynamic';

/**
 * 🧪 TESTE COMPLETO DAS APIs SHOPEE
 * 
 * Testa todas as APIs que usamos para garantir que retornam dados reais
 * Uso: GET /api/shopee/test-apis?client_id=xxx
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');

    if (!clientId) {
      return NextResponse.json({ error: 'client_id é obrigatório' }, { status: 400 });
    }

    // Buscar integração
    const integration = await prisma.client_integrations.findUnique({
      where: { client_id_provider: { client_id: clientId, provider: 'shopee' } },
    });

    if (!integration || !integration.access_token) {
      return NextResponse.json({ 
        error: 'Integração não encontrada ou token ausente',
        reconnect_required: true 
      }, { status: 404 });
    }

    const { access_token, shop_id } = integration;
    const results = {
      client_id: clientId,
      shop_id,
      timestamp: new Date().toISOString(),
      apis_tested: [] as any[],
      summary: {
        total_apis: 0,
        successful: 0,
        failed: 0,
        with_data: 0,
        empty_responses: 0
      }
    };

    // Lista de APIs para testar
    const apisToTest = [
      {
        name: 'Shop Info',
        path: '/api/v2/shop/get_shop_info',
        description: 'Informações básicas da loja',
        expectedFields: ['shop_name', 'shop_id', 'region']
      },
      {
        name: 'Item List',
        path: '/api/v2/product/get_item_list',
        description: 'Lista de produtos da loja',
        expectedFields: ['item'],
        query: { page_size: 10, offset: 0 }
      },
      {
        name: 'Order List (30 days)',
        path: '/api/v2/order/get_order_list',
        description: 'Lista de pedidos dos últimos 30 dias',
        expectedFields: ['order_list'],
        query: {
          time_range_field: 'create_time',
          time_from: Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000),
          time_to: Math.floor(Date.now() / 1000),
          page_size: 10
        }
      },
      {
        name: 'Order List (7 days)',
        path: '/api/v2/order/get_order_list',
        description: 'Lista de pedidos dos últimos 7 dias',
        expectedFields: ['order_list'],
        query: {
          time_range_field: 'create_time',
          time_from: Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000),
          time_to: Math.floor(Date.now() / 1000),
          page_size: 10
        }
      },
      {
        name: 'Shop Performance',
        path: '/api/v2/shop/get_shop_performance',
        description: 'Performance da loja (visitantes, conversão)',
        expectedFields: ['performance'],
        query: {
          time_from: Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000),
          time_to: Math.floor(Date.now() / 1000)
        }
      },
      {
        name: 'Ads Performance',
        path: '/api/v2/ads/get_ads_performance',
        description: 'Dados de campanhas publicitárias',
        expectedFields: ['data'],
        query: {
          time_from: Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000),
          time_to: Math.floor(Date.now() / 1000),
          granularity: 'daily'
        }
      },
      {
        name: 'Shop Analytics',
        path: '/api/v2/shop/get_shop_analytics',
        description: 'Analytics da loja (tráfego, conversão)',
        expectedFields: ['analytics'],
        query: {
          time_from: Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000),
          time_to: Math.floor(Date.now() / 1000)
        }
      },
      {
        name: 'Traffic Analytics',
        path: '/api/v2/analytics/get_traffic_analytics',
        description: 'Dados de tráfego detalhados',
        expectedFields: ['traffic'],
        query: {
          time_from: Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000),
          time_to: Math.floor(Date.now() / 1000)
        }
      }
    ];

    // Testar cada API
    for (const api of apisToTest) {
      console.log(`\n🧪 Testando: ${api.name} (${api.path})`);
      
      const testResult = {
        name: api.name,
        path: api.path,
        description: api.description,
        status: 'unknown' as 'success' | 'error' | 'empty',
        http_code: 0,
        response_time_ms: 0,
        has_data: false,
        data_summary: {} as any,
        error_message: null as string | null,
        raw_response: null as any
      };

      const startTime = Date.now();

      try {
        const response = await shopeeFetch<any>({
          path: api.path,
          access_token,
          shop_id: shop_id || '', // ✅ Garantir que shop_id não seja null
          query: api.query || {}
        });

        testResult.response_time_ms = Date.now() - startTime;
        testResult.http_code = 200;
        testResult.raw_response = response;

        // Analisar resposta
        if (response && response.response) {
          const data = response.response;
          testResult.status = 'success';
          
          // Verificar se tem dados úteis
          let hasData = false;
          const dataSummary: any = {};

          for (const field of api.expectedFields) {
            if (data[field] !== undefined) {
              dataSummary[field] = {
                exists: true,
                type: Array.isArray(data[field]) ? 'array' : typeof data[field],
                length: Array.isArray(data[field]) ? data[field].length : null,
                sample: Array.isArray(data[field]) && data[field].length > 0 
                  ? data[field][0] 
                  : data[field]
              };
              
              if (Array.isArray(data[field]) && data[field].length > 0) {
                hasData = true;
              } else if (!Array.isArray(data[field]) && data[field] !== null && data[field] !== '') {
                hasData = true;
              }
            } else {
              dataSummary[field] = { exists: false };
            }
          }

          testResult.has_data = hasData;
          testResult.data_summary = dataSummary;
          
          if (!hasData) {
            testResult.status = 'empty';
          }

        } else {
          testResult.status = 'empty';
          testResult.data_summary = { error: 'Resposta sem campo response' };
        }

        console.log(`✅ ${api.name}: ${testResult.status.toUpperCase()} (${testResult.response_time_ms}ms)`);
        if (testResult.has_data) {
          console.log(`   📊 Dados encontrados:`, Object.keys(testResult.data_summary));
        }

      } catch (error: any) {
        testResult.response_time_ms = Date.now() - startTime;
        testResult.status = 'error';
        testResult.error_message = error.message;
        
        // Extrair código HTTP se disponível
        if (error.message.includes('404')) testResult.http_code = 404;
        else if (error.message.includes('403')) testResult.http_code = 403;
        else if (error.message.includes('401')) testResult.http_code = 401;
        else testResult.http_code = 500;

        console.log(`❌ ${api.name}: ERRO - ${error.message}`);
      }

      results.apis_tested.push(testResult);
      
      // Pausa entre requests para não sobrecarregar
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Calcular resumo
    results.summary.total_apis = results.apis_tested.length;
    results.summary.successful = results.apis_tested.filter(r => r.status === 'success').length;
    results.summary.failed = results.apis_tested.filter(r => r.status === 'error').length;
    results.summary.with_data = results.apis_tested.filter(r => r.has_data).length;
    results.summary.empty_responses = results.apis_tested.filter(r => r.status === 'empty').length;

    // Recomendações baseadas nos resultados
    const recommendations = [];
    
    if (results.summary.with_data === 0) {
      recommendations.push('⚠️ Nenhuma API retornou dados úteis - a loja pode estar vazia ou sem histórico');
      recommendations.push('💡 Verifique se a loja tem produtos e pedidos no painel da Shopee');
    } else if (results.summary.with_data < 3) {
      recommendations.push('⚠️ Poucas APIs retornaram dados - funcionalidades limitadas');
      recommendations.push('💡 Algumas métricas podem não estar disponíveis nos relatórios');
    } else {
      recommendations.push('✅ Múltiplas APIs retornaram dados - integração funcional');
    }

    if (results.summary.failed > 0) {
      recommendations.push(`❌ ${results.summary.failed} APIs falharam - verifique permissões`);
    }

    // APIs críticas que devem funcionar
    const criticalApis = ['Shop Info', 'Item List', 'Order List (30 days)'];
    const criticalFailures = results.apis_tested.filter(r => 
      criticalApis.includes(r.name) && r.status === 'error'
    );

    if (criticalFailures.length > 0) {
      recommendations.push('🚨 APIs críticas falharam - relatórios podem estar incompletos');
    }

    return NextResponse.json({
      success: true,
      ...results,
      recommendations
    });

  } catch (err: any) {
    console.error('❌ Erro no teste de APIs:', err);
    return NextResponse.json({ 
      success: false,
      error: err.message || 'Erro interno',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}


