import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getShopStats } from '@/lib/shopee-stats';
import { shopeeFetch } from '@/lib/shopee';
import { calcularPedidosPagos30Dias } from '@/lib/shopee-vendas';

export const dynamic = 'force-dynamic'; 
export const maxDuration = 60; // Aumentar timeout para suportar espera do Render 

export async function GET(request: Request) {
  try {
    // Extrair parâmetros de data da URL
    const { searchParams } = new URL(request.url);
    const customTimeFrom = searchParams.get('time_from');
    const customTimeTo = searchParams.get('time_to');

    //  Buscar todas as integrações Shopee (limitado a 3 para performance, conforme solicitado)
    const integrations = await prisma.client_integrations.findMany({
      where: { provider: 'shopee' },
      take: 3,
    });

    if (!integrations || integrations.length === 0) {
      return NextResponse.json({
        totalSellers: 0,
        totalGmv: 0,
        totalPedidos: 0,
        ticketMedio: 0,
        activeStores: [],
      });
    }

    // 2. Calcular período de tempo
    let timeToParam: number;
    let timeFromParam: number;

    if (customTimeFrom && customTimeTo) {
      // Usar datas personalizadas
      timeFromParam = Number(customTimeFrom);
      timeToParam = Number(customTimeTo);
      console.log(`[DASHBOARD] Período personalizado: ${new Date(timeFromParam * 1000).toISOString().split('T')[0]} até ${new Date(timeToParam * 1000).toISOString().split('T')[0]}`);
    } else {
      // ESPELHO EXATO DO PAINEL SHOPEE: 15/11/2025 - 14/12/2025 (GMT-3)
      
      // Período EXATO mostrado no painel Shopee
      const dataInicio = new Date('2025-11-15T00:00:00-03:00'); // 15/11/2025 00:00 GMT-3
      const dataFim = new Date('2025-12-14T23:59:59-03:00');    // 14/12/2025 23:59 GMT-3
      
      timeFromParam = Math.floor(dataInicio.getTime() / 1000);
      timeToParam = Math.floor(dataFim.getTime() / 1000);
      
      console.log(` [DASHBOARD] ESPELHO SHOPEE: 15/11/2025 - 14/12/2025 (GMT-3)`);
      console.log(` Período EXATO do painel: ${dataInicio.toISOString().split('T')[0]} até ${dataFim.toISOString().split('T')[0]}`);
      console.log(` Fuso: GMT-3 (EXATAMENTE como Shopee)`);
    }

    //  Calcular estatísticas para cada loja em paralelo
    const statsPromises = integrations.map(async (integration) => {
      try {
        const stats = await getShopStats(integration);
        
       
        let vendasReais = 0;
        let pedidosReais = 0;
        let statusBreakdown: any = {};
        let topProducts: any[] = [];
        try {
          // CHAMADA DIRETA AO PROXY (Que chama o Microserviço no Render)
          // Isso substitui o fetch interno para api/shopee/vendas-reais
          console.log(`\n [DASHBOARD] Buscando vendas reais para loja ${integration.shop_id} via Proxy -> Microserviço...`);
          
          const vendasData = await calcularPedidosPagos30Dias(
            integration.access_token,
            integration.shop_id,
            timeFromParam,
            timeToParam
          );

          if (vendasData) {
            vendasReais = vendasData.totalVendas || 0;
            pedidosReais = vendasData.totalPedidos || 0;
            statusBreakdown = vendasData.statusBreakdown || {};
            topProducts = vendasData.topProducts || [];
            
            console.log(`\n [DASHBOARD] PEDIDOS PAGOS para loja ${integration.shop_id}:`);
            console.log(`   • Vendas: R$ ${vendasReais.toFixed(2)}`);
          }
        } catch (vendasError) {
          console.error(` [DASHBOARD] Erro ao buscar vendas reais para loja ${integration.shop_id}:`, vendasError);
        }
        
        
        
        let finalGmv = vendasReais;
        let finalOrders = pedidosReais;

        // Fallback para exibir dados totais 
        let isAnnualFallback = false;
        if (vendasReais === 0) {
             console.log(`[DASHBOARD] Loja ${integration.shop_id} sem vendas no período. Tentando buscar faturamento TOTAL do ano...`);
             
             try {
                const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime(); // 01/01 do ano atual
                const now = Math.floor(Date.now() / 1000);  
                
                console.log(`   🔗 Buscando dados anuais via Proxy -> Microserviço...`);
                
                const dataAno = await calcularPedidosPagos30Dias(
                  integration.access_token,
                  integration.shop_id,
                  Math.floor(startOfYear / 1000),
                  now
                );

                if (dataAno && dataAno.totalVendas > 0) {
                    console.log(`[FALLBACK] Dados anuais encontrados: R$ ${dataAno.totalVendas} (${dataAno.totalPedidos} pedidos)`);
                    finalGmv = dataAno.totalVendas;
                    finalOrders = dataAno.totalPedidos;
                    isAnnualFallback = true;
                }
             } catch (e) {
                 console.error('Erro ao buscar fallback anual:', e);
             }
        }

        return {
          ...stats,
          
          vendasReais: finalGmv,
          pedidosReais: finalOrders,
          statusBreakdown,
          topProducts,
          isAnnualFallback, // Flag para indicar no frontend que é dado anual
          // Manter dados antigos para compatibilidade
          realPaidValue: finalGmv,
          paidOrdersCount: finalOrders,
          shopeeCompatibleSales: finalGmv,
          shopeeCompatibleOrders: finalOrders
        };
      } catch (e) {
        console.error(`Erro ao buscar stats para loja ${integration.shop_id}:`, e);
        return null;
      }
    });

    const results = await Promise.all(statsPromises);
    const validResults = results.filter((r) => r !== null) as any[];

    //  dados (usando vendas reais)
    const totalSellers = validResults.length;
    const totalVendasReais = validResults.reduce((acc, curr) => acc + (curr.vendasReais || 0), 0);
    const totalPedidosReais = validResults.reduce((acc, curr) => acc + (curr.pedidosReais || 0), 0);
    const ticketMedio = totalPedidosReais > 0 ? totalVendasReais / totalPedidosReais : 0;
    
    // Manter compatibilidade com campos antigos
    const totalGmv = validResults.reduce((acc, curr) => acc + curr.gmv, 0);
    const totalRealPaidValue = totalVendasReais;
    const totalPedidos = totalPedidosReais;
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(` [ESPELHO-SHOPEE] RESULTADO FINAL - COMPARAÇÃO DIRETA:`);
    console.log(`    PAINEL SHOPEE: 786 pedidos | R$ 25.847,97 | 24 cancelados`);
    console.log(`    NOSSO SISTEMA: ${totalPedidosReais} pedidos | R$ ${totalVendasReais.toFixed(2)}`);
    console.log(`    Precisão: ${((totalPedidosReais/786)*100).toFixed(1)}% pedidos | ${((totalVendasReais/25847.97)*100).toFixed(1)}% valor`);
    console.log(`    Lógica: ESPELHO EXATO - período 15/11-14/12 GMT-3`);
    console.log(`    Status: READY_TO_SHIP, PROCESSED, SHIPPED, COMPLETED, TO_CONFIRM_RECEIVE, TO_SHIP, TO_CONFIRM_DELIVER, READY_TO_PICKUP`);
    
    console.log(`${'='.repeat(80)}\n`);

    //  dados agregados e lojas ativas
    return NextResponse.json({
      totalSellers,
      totalGmv: totalRealPaidValue, // valor real de pedidos pagos
      totalPedidos,
      ticketMedio,
      totalRealPaidValue, 
      activeStores: validResults.map(r => ({
        name: r.shopName,
        gmv: r.vendasReais || r.gmv, // Usar vendas reais
        orders: r.pedidosReais || r.orders, // Usar pedidos reais
        ads: r.ads || { spend: 0, roas: 0, impressions: 0, clicks: 0, ctr: 0, cpa: 0 },
        isAnnualFallback: r.isAnnualFallback || false // Passar flag para o frontend
      })),
      storeDetails: validResults, 
      topProducts: validResults.flatMap(r => r.topProducts || [])
        .sort((a, b) => (b.sales || 0) - (a.sales || 0))
        .slice(0, 10) 
    });

  } catch (err: any) {
    console.error('Erro no dashboard stats:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
