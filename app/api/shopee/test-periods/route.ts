import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * 🔍 TESTE DE PERÍODOS - Encontra pedidos em diferentes intervalos de tempo
 * 
 * Uso: GET /api/shopee/test-periods?client_id=xxx
 * 
 * Testa vários períodos para encontrar pedidos:
 * - Últimos 7 dias
 * - Últimos 30 dias  
 * - Últimos 90 dias
 * - Últimos 6 meses
 * - Último ano
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

    const now = new Date();
    const testPeriods = [
      { name: 'Últimos 7 dias', days: 7 },
      { name: 'Últimos 15 dias', days: 15 },
      { name: 'Últimos 30 dias', days: 30 },
      { name: 'Últimos 60 dias', days: 60 },
      { name: 'Últimos 90 dias', days: 90 },
      { name: 'Últimos 6 meses', days: 180 },
      { name: 'Último ano', days: 365 }
    ];

    const results = [];

    for (const period of testPeriods) {
      const dateFrom = new Date(now.getTime() - period.days * 24 * 60 * 60 * 1000);
      const dateTo = now;

      console.log(`\n[testPeriods] Testando período: ${period.name} (${dateFrom.toISOString()} a ${dateTo.toISOString()})`);

      try {
        // Fazer chamada para o endpoint de dados com este período
        const testUrl = new URL(`${request.url.split('/api/shopee/test-periods')[0]}/api/shopee/data`);
        testUrl.searchParams.set('client_id', clientId);
        testUrl.searchParams.set('date_from', dateFrom.toISOString().split('T')[0]);
        testUrl.searchParams.set('date_to', dateTo.toISOString().split('T')[0]);

        const response = await fetch(testUrl.toString(), {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          
          results.push({
            period: period.name,
            days: period.days,
            date_from: dateFrom.toISOString().split('T')[0],
            date_to: dateTo.toISOString().split('T')[0],
            success: true,
            orders_found: data.data?.totalOrdersLast30Days || 0,
            gmv: data.data?.gmvLast30Days || 0,
            products: data.data?.totalProducts || 0,
            top_products: data.data?.topProductsLast30Days?.length || 0
          });

          console.log(` [testPeriods] ${period.name}: ${data.data?.totalOrdersLast30Days || 0} pedidos, GMV: R$${data.data?.gmvLast30Days || 0}`);
        } else {
          const errorData = await response.json();
          results.push({
            period: period.name,
            days: period.days,
            date_from: dateFrom.toISOString().split('T')[0],
            date_to: dateTo.toISOString().split('T')[0],
            success: false,
            error: errorData.error || `HTTP ${response.status}`
          });

          console.log(` [testPeriods] ${period.name}: Erro - ${errorData.error || response.status}`);
        }
      } catch (e: any) {
        results.push({
          period: period.name,
          days: period.days,
          date_from: dateFrom.toISOString().split('T')[0],
          date_to: dateTo.toISOString().split('T')[0],
          success: false,
          error: e.message
        });

        console.log(` [testPeriods] ${period.name}: Exceção - ${e.message}`);
      }

      // Pequena pausa entre requisições para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Encontrar o melhor período (com mais pedidos)
    const periodsWithOrders = results.filter(r => r.success && r.orders_found > 0);
    const bestPeriod = periodsWithOrders.length > 0 
      ? periodsWithOrders.reduce((best, current) => 
          current.orders_found > best.orders_found ? current : best
        )
      : null;

    const summary = {
      total_periods_tested: results.length,
      periods_with_orders: periodsWithOrders.length,
      periods_with_errors: results.filter(r => !r.success).length,
      best_period: bestPeriod,
      recommendations: []
    };

    // Gerar recomendações
    if (periodsWithOrders.length === 0) {
      summary.recommendations.push(' Nenhum pedido encontrado em nenhum período - a loja pode ser nova ou não ter vendas ainda' as never);
      summary.recommendations.push('💡 Verifique se a loja tem pedidos no painel da Shopee' as never);
      summary.recommendations.push('📅 Tente períodos mais antigos ou verifique se a integração foi feita recentemente' as never);
    } else {
      summary.recommendations.push(` Encontrados pedidos no período: ${bestPeriod?.period}` as never);
      summary.recommendations.push(` Use o período de ${bestPeriod?.days} dias para gerar relatórios com dados reais` as never);
      summary.recommendations.push(` GMV encontrado: R$${bestPeriod?.gmv}` as never);
    }

    return NextResponse.json({
      success: true,
      client_id: clientId,
      shop_id: integration.shop_id,
      shop_name: 'LojaColorindoKids', // Sabemos pelo log
      test_results: results,
      summary
    });

  } catch (err: any) {
    console.error(' Erro no teste de períodos:', err);
    return NextResponse.json({ 
      success: false,
      error: err.message || 'Erro interno',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}
