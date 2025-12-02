import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { shopeeFetch } from '@/lib/shopee';

/**
 * 🎯 DADOS REAIS DE ANALYTICS - Busca dados exatos do painel Shopee
 * 
 * Uso: GET /api/shopee/real-analytics?client_id=xxx&date_from=2025-11-25&date_to=2025-12-01
 * 
 * Tenta múltiplos endpoints para obter dados reais de:
 * - Visitantes (visitor_count)
 * - Visualizações de página (page_view)
 * - Taxa de conversão real
 * - Dados de tráfego
 * - Performance da loja
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const dateFromParam = searchParams.get('date_from');
    const dateToParam = searchParams.get('date_to');

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

    // Configurar período
    let timeFrom: number;
    let timeTo: number;

    if (dateFromParam && dateToParam) {
      timeFrom = Math.floor(new Date(dateFromParam).getTime() / 1000);
      timeTo = Math.floor(new Date(dateToParam).getTime() / 1000);
    } else {
      // Padrão: últimos 7 dias (como no painel)
      timeTo = Math.floor(Date.now() / 1000);
      timeFrom = timeTo - (7 * 24 * 60 * 60);
    }

    console.log(`\n🔍 ===== BUSCANDO DADOS REAIS DE ANALYTICS =====`);
    console.log(`📅 Período: ${new Date(timeFrom * 1000).toISOString()} até ${new Date(timeTo * 1000).toISOString()}`);

    const results = {
      success: false,
      period: {
        from: new Date(timeFrom * 1000).toISOString(),
        to: new Date(timeTo * 1000).toISOString(),
        days: Math.ceil((timeTo - timeFrom) / (24 * 60 * 60))
      },
      analytics: {
        visitors: 0,
        pageViews: 0,
        conversionRate: 0,
        bounceRate: 0,
        avgSessionDuration: 0
      },
      performance: {
        shopViews: 0,
        productViews: 0,
        addToCart: 0,
        orders: 0,
        revenue: 0
      },
      traffic: {
        organicTraffic: 0,
        paidTraffic: 0,
        socialTraffic: 0,
        directTraffic: 0
      },
      endpoints_tested: [] as any[],
      working_endpoints: [] as string[],
      failed_endpoints: [] as string[]
    };

    // Lista de endpoints para testar (baseados na documentação Shopee)
    const analyticsEndpoints = [
      {
        name: 'shop_performance',
        path: '/api/v2/shop/get_shop_performance',
        params: { time_from: timeFrom, time_to: timeTo, granularity: 'daily' }
      },
      {
        name: 'shop_analytics',
        path: '/api/v2/shop/get_shop_analytics',
        params: { time_from: timeFrom, time_to: timeTo }
      },
      {
        name: 'shop_insight',
        path: '/api/v2/shop/get_shop_insight',
        params: { time_from: timeFrom, time_to: timeTo }
      },
      {
        name: 'traffic_insight',
        path: '/api/v2/shop/get_traffic_insight',
        params: { time_from: timeFrom, time_to: timeTo }
      },
      {
        name: 'visitor_insight',
        path: '/api/v2/shop/get_visitor_insight',
        params: { time_from: timeFrom, time_to: timeTo }
      },
      {
        name: 'performance_insight',
        path: '/api/v2/shop/get_performance_insight',
        params: { time_from: timeFrom, time_to: timeTo }
      },
      // Endpoints alternativos v1
      {
        name: 'shop_performance_v1',
        path: '/api/v1/shop/performance',
        params: { time_from: timeFrom, time_to: timeTo }
      },
      {
        name: 'analytics_v1',
        path: '/api/v1/shop/analytics',
        params: { time_from: timeFrom, time_to: timeTo }
      }
    ];

    // Testar cada endpoint
    for (const endpoint of analyticsEndpoints) {
      try {
        console.log(`\n🧪 Testando: ${endpoint.name} (${endpoint.path})`);
        
        const response = await shopeeFetch<any>({
          path: endpoint.path,
          access_token: access_token || '',
          shop_id: shop_id || '',
          query: endpoint.params
        });

        const testResult = {
          name: endpoint.name,
          path: endpoint.path,
          status: 'success',
          has_data: !!response?.response,
          data_keys: response?.response ? Object.keys(response.response) : [],
          sample_data: response?.response ? 
            Object.fromEntries(
              Object.entries(response.response).slice(0, 5).map(([k, v]) => [k, typeof v])
            ) : null
        };

        results.endpoints_tested.push(testResult);
        results.working_endpoints.push(endpoint.name);

        console.log(`✅ ${endpoint.name}: FUNCIONANDO`);
        console.log(`📊 Dados disponíveis:`, testResult.data_keys);

        // Extrair dados reais baseado na resposta
        if (response?.response) {
          const data = response.response;

          // Visitantes e visualizações
          if (data.visitor_count !== undefined) {
            results.analytics.visitors = data.visitor_count;
            console.log(`👥 Visitantes encontrados: ${data.visitor_count}`);
          }
          if (data.page_view !== undefined) {
            results.analytics.pageViews = data.page_view;
            console.log(`📄 Page views encontradas: ${data.page_view}`);
          }
          if (data.shop_view !== undefined) {
            results.performance.shopViews = data.shop_view;
            console.log(`🏪 Shop views encontradas: ${data.shop_view}`);
          }

          // Taxa de conversão
          if (data.conversion_rate !== undefined) {
            results.analytics.conversionRate = data.conversion_rate;
            console.log(`📈 Taxa de conversão encontrada: ${data.conversion_rate}%`);
          }

          // Outros dados de performance
          if (data.order_count !== undefined) {
            results.performance.orders = data.order_count;
          }
          if (data.revenue !== undefined) {
            results.performance.revenue = data.revenue;
          }
          if (data.add_to_cart !== undefined) {
            results.performance.addToCart = data.add_to_cart;
          }

          // Dados de tráfego
          if (data.organic_traffic !== undefined) {
            results.traffic.organicTraffic = data.organic_traffic;
          }
          if (data.paid_traffic !== undefined) {
            results.traffic.paidTraffic = data.paid_traffic;
          }

          results.success = true;
        }

      } catch (error: any) {
        console.log(`❌ ${endpoint.name}: FALHOU - ${error.message}`);
        
        results.endpoints_tested.push({
          name: endpoint.name,
          path: endpoint.path,
          status: 'error',
          error: error.message,
          http_code: error.message.includes('404') ? 404 : 
                    error.message.includes('403') ? 403 : 500
        });
        
        results.failed_endpoints.push(endpoint.name);
      }

      // Pausa entre requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Se não conseguiu dados reais, buscar de pedidos para calcular conversão
    if (!results.success || results.analytics.visitors === 0) {
      console.log(`\n🔄 Tentando calcular dados a partir de pedidos...`);
      
      try {
        // Buscar pedidos do período
        const ordersResp = await shopeeFetch<any>({
          path: '/api/v2/order/get_order_list',
          access_token: access_token || '',
          shop_id: shop_id || '',
          query: {
            time_range_field: 'create_time',
            time_from: timeFrom,
            time_to: timeTo,
            page_size: 100
          }
        });

        if (ordersResp?.response?.order_list) {
          const orders = ordersResp.response.order_list.length;
          results.performance.orders = orders;
          
          // Se temos pedidos mas não temos visitantes, NÃO inventar dados
          if (orders > 0 && results.analytics.visitors === 0) {
            console.log(`⚠️ API não retornou visitantes. Retornando dados reais de pedidos apenas.`);
            // Manter visitantes como 0 para indicar ausência de dado oficial
            results.analytics.visitors = 0;
            results.analytics.conversionRate = 0;
            results.analytics.pageViews = 0;
            
            // Mas marcar sucesso pois temos pedidos reais
            results.success = true; 
          }
        }
      } catch (e) {
        console.log(`❌ Falha ao buscar pedidos para cálculo: ${(e as any).message}`);
      }
    }

    console.log(`\n📋 ===== RESUMO DOS TESTES =====`);
    console.log(`✅ Endpoints funcionando: ${results.working_endpoints.length}`);
    console.log(`❌ Endpoints com falha: ${results.failed_endpoints.length}`);
    console.log(`👥 Visitantes: ${results.analytics.visitors}`);
    console.log(`📄 Page Views: ${results.analytics.pageViews}`);
    console.log(`📈 Conversão: ${results.analytics.conversionRate}%`);

    return NextResponse.json({
      success: results.success,
      message: results.success ? 
        'Dados reais obtidos com sucesso' : 
        'Dados estimados - endpoints de analytics não disponíveis',
      data: {
        analytics: results.analytics,
        performance: results.performance,
        traffic: results.traffic,
        period: results.period
      },
      debug: {
        endpoints_tested: results.endpoints_tested.length,
        working_endpoints: results.working_endpoints,
        failed_endpoints: results.failed_endpoints,
        detailed_tests: results.endpoints_tested
      }
    });

  } catch (err: any) {
    console.error('❌ Erro ao buscar analytics reais:', err);
    return NextResponse.json({ 
      success: false,
      error: err.message || 'Erro interno',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}
