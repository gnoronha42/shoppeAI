import { NextRequest, NextResponse } from 'next/server';
import { shopeeFetch } from '@/lib/shopee';

import { guardShopeeRoute } from '@/lib/shopee-route-guard';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const _shopeeGuard = guardShopeeRoute();
    if (_shopeeGuard) return _shopeeGuard;
    const { searchParams } = new URL(request.url);
    const access_token = searchParams.get('access_token');
    const shop_id = searchParams.get('shop_id');

    if (!access_token || !shop_id) {
      return NextResponse.json(
        { error: 'access_token e shop_id são obrigatórios' },
        { status: 400 }
      );
    }

    // Período: últimos 30 dias (igual ao painel)
    const now = new Date();
    const timeTo = Math.floor(now.getTime() / 1000);
    const timeFrom = timeTo - (30 * 24 * 60 * 60);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 [DEBUG-COMPARISON] Análise detalhada para loja ${shop_id}`);
    console.log(`📅 Período: ${new Date(timeFrom * 1000).toISOString().split('T')[0]} até ${new Date(timeTo * 1000).toISOString().split('T')[0]}`);
    console.log(`${'='.repeat(80)}`);

    // Dividir em chunks de 14 dias
    const CHUNK_DAYS = 14;
    const CHUNK_SECONDS = CHUNK_DAYS * 24 * 60 * 60;
    const chunks: { start: number; end: number }[] = [];
    
    let currentStart = timeFrom;
    while (currentStart < timeTo) {
      const currentEnd = Math.min(currentStart + CHUNK_SECONDS, timeTo);
      chunks.push({ start: currentStart, end: currentEnd });
      currentStart = currentEnd;
    }

    console.log(`📦 Dividindo em ${chunks.length} chunks de 14 dias`);

    // Coletar TODOS os pedidos
    const allOrders: any[] = [];
    const statusCounts: Record<string, number> = {};
    let totalPages = 0;

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      console.log(`\n📦 Chunk ${chunkIndex + 1}: ${new Date(chunk.start * 1000).toISOString().split('T')[0]} até ${new Date(chunk.end * 1000).toISOString().split('T')[0]}`);
      
      let cursor = "";
      let hasMore = true;
      let pageCount = 0;

      while (hasMore) {
        pageCount++;
        totalPages++;
        
        const orderListParams: Record<string, string | number | boolean | undefined> = {
          time_range_field: 'create_time',
          time_from: chunk.start,
          time_to: chunk.end,
          page_size: 100,
        };

        if (cursor) {
          orderListParams.cursor = cursor;
        }

        const orderResp = await shopeeFetch<any>({
          path: '/api/v2/order/get_order_list',
          access_token,
          shop_id,
          query: orderListParams,
        });

        if (orderResp?.error) {
          console.error(`❌ Erro no chunk ${chunkIndex + 1}, página ${pageCount}: ${orderResp.error}`);
          break;
        }

        const pageOrders = orderResp?.response?.order_list || [];
        allOrders.push(...pageOrders);
        
        console.log(`   📄 Página ${pageCount}: ${pageOrders.length} pedidos`);

        // Verificar paginação
        const hasMoreFlag = orderResp?.response?.more ?? false;
        const nextCursor = orderResp?.response?.next_cursor || "";
        cursor = nextCursor;
        hasMore = hasMoreFlag && !!cursor && cursor.length > 0;
      }
    }

    console.log(`\n✅ Total coletado: ${allOrders.length} pedidos em ${totalPages} páginas`);

    // Buscar detalhes em lotes de 50
    console.log(`\n⚡ Buscando detalhes dos pedidos...`);
    
    const BATCH_SIZE = 50;
    const orderDetails: any[] = [];
    
    for (let i = 0; i < allOrders.length; i += BATCH_SIZE) {
      const batch = allOrders.slice(i, i + BATCH_SIZE);
      const orderSns = batch.map(order => order.order_sn);
      
      try {
        const detailResp = await shopeeFetch<any>({
          path: '/api/v2/order/get_order_detail',
          access_token,
          shop_id,
          query: {
            order_sn_list: orderSns.join(','),
            response_optional_fields: 'total_amount,order_status'
          }
        });

        const details = detailResp?.response?.order_list || [];
        orderDetails.push(...details);
        
        console.log(`   📦 Lote ${Math.floor(i/BATCH_SIZE) + 1}: ${details.length} detalhes obtidos`);
      } catch (error) {
        console.error(`❌ Erro no lote ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
      }
    }

    // Análise detalhada por status
    let totalValue = 0;
    let paidOrdersValue = 0;
    let paidOrdersCount = 0;

    const PAID_STATUSES = ['READY_TO_SHIP', 'PROCESSED', 'SHIPPED', 'COMPLETED'];
    
    orderDetails.forEach(order => {
      const status = order.order_status || 'UNKNOWN';
      const amount = Number(order.total_amount) || 0;
      
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      totalValue += amount;
      
      if (PAID_STATUSES.includes(status)) {
        paidOrdersValue += amount;
        paidOrdersCount++;
      }
    });

    // Comparação com painel Shopee
    const shopeePanel = {
      vendas: 25847.97,
      pedidos: 786,
      pedidosCancelados: 24,
      taxaConversao: 3.71
    };

    const ourResults = {
      totalPedidos: orderDetails.length,
      pedidosPagos: paidOrdersCount,
      valorTotal: totalValue,
      valorPedidosPagos: paidOrdersValue,
      ticketMedio: paidOrdersCount > 0 ? paidOrdersValue / paidOrdersCount : 0
    };

    const comparison = {
      diferençaValor: Math.abs(shopeePanel.vendas - paidOrdersValue),
      diferençaPedidos: Math.abs(shopeePanel.pedidos - paidOrdersCount),
      percentualValor: ((paidOrdersValue / shopeePanel.vendas) * 100).toFixed(2),
      percentualPedidos: ((paidOrdersCount / shopeePanel.pedidos) * 100).toFixed(2)
    };

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 [COMPARAÇÃO DETALHADA]`);
    console.log(`\n🏪 PAINEL SHOPEE:`);
    console.log(`   • Vendas: R$ ${shopeePanel.vendas.toFixed(2)}`);
    console.log(`   • Pedidos: ${shopeePanel.pedidos}`);
    console.log(`   • Cancelados: ${shopeePanel.pedidosCancelados}`);
    
    console.log(`\n🤖 NOSSO SISTEMA:`);
    console.log(`   • Total de Pedidos: ${ourResults.totalPedidos}`);
    console.log(`   • Pedidos Pagos: ${ourResults.pedidosPagos}`);
    console.log(`   • Valor Total: R$ ${ourResults.valorTotal.toFixed(2)}`);
    console.log(`   • Valor Pedidos Pagos: R$ ${ourResults.valorPedidosPagos.toFixed(2)}`);
    console.log(`   • Ticket Médio: R$ ${ourResults.ticketMedio.toFixed(2)}`);
    
    console.log(`\n📈 DIFERENÇAS:`);
    console.log(`   • Valor: R$ ${comparison.diferençaValor.toFixed(2)} (${comparison.percentualValor}% do painel)`);
    console.log(`   • Pedidos: ${comparison.diferençaPedidos} (${comparison.percentualPedidos}% do painel)`);
    
    console.log(`\n📋 STATUS BREAKDOWN:`);
    Object.entries(statusCounts).sort(([,a], [,b]) => b - a).forEach(([status, count]) => {
      const isPaid = PAID_STATUSES.includes(status);
      console.log(`   • ${status}: ${count} ${isPaid ? '✅' : '❌'}`);
    });
    console.log(`${'='.repeat(80)}\n`);

    return NextResponse.json({
      success: true,
      data: {
        periodo: {
          inicio: new Date(timeFrom * 1000).toISOString().split('T')[0],
          fim: new Date(timeTo * 1000).toISOString().split('T')[0]
        },
        painelShopee: shopeePanel,
        nossoSistema: ourResults,
        comparacao: comparison,
        statusBreakdown: statusCounts,
        detalhes: {
          totalChunks: chunks.length,
          totalPaginas: totalPages,
          pedidosColetados: allOrders.length,
          detalhesObtidos: orderDetails.length
        }
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG-COMPARISON] Erro geral:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
