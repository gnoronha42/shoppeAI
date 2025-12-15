import { NextRequest, NextResponse } from 'next/server';
import { shopeeFetch } from '@/lib/shopee';

// Função auxiliar para processar chunks em paralelo
async function processInParallel<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  concurrency: number = 3
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((item, idx) => processor(item, i + idx))
    );
    results.push(...batchResults);
  }
  return results;
}

// Função para buscar pedidos de um chunk (TODOS os status para coincidir com Shopee)
async function fetchChunkOrders(
  chunk: { start: number; end: number },
  access_token: string,
  shop_id: string
): Promise<any[]> {
  const orders: any[] = [];
  let cursor = "";
  let hasMore = true;

  while (hasMore) {
    try {
      const orderListParams: Record<string, string | number | boolean | undefined> = {
        time_range_field: 'create_time',
        time_from: chunk.start,
        time_to: chunk.end,
        page_size: 100,
        // NÃO filtrar por status - pegar todos como no painel Shopee
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
        console.error(`❌ Chunk erro: ${orderResp.error}`);
        break;
      }

      const chunkOrders = orderResp?.response?.order_list || [];
      orders.push(...chunkOrders);

      const hasMoreFlag = orderResp?.response?.more ?? false;
      cursor = orderResp?.response?.next_cursor || orderResp?.next_cursor || "";
      hasMore = hasMoreFlag || (!!cursor && cursor !== "");

    } catch (error) {
      console.error(`❌ Chunk erro de conexão:`, error);
      hasMore = false;
    }
  }

  return orders;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const access_token = searchParams.get('access_token');
    const shop_id = searchParams.get('shop_id');
    const customTimeFromParam = searchParams.get('time_from');
    const customTimeToParam = searchParams.get('time_to');

    if (!access_token || !shop_id) {
      return NextResponse.json(
        { error: 'access_token e shop_id são obrigatórios' },
        { status: 400 }
      );
    }

    // Usar período de novembro 2025 por padrão (como no painel Shopee)
    let timeFrom: number;
    let timeTo: number;

    if (customTimeFromParam && customTimeToParam) {
      timeFrom = Number(customTimeFromParam);
      timeTo = Number(customTimeToParam);
    } else {
      const now = new Date();
      
      if (now.getMonth() === 11 && now.getFullYear() === 2025) { // Dezembro 2025
        timeFrom = Math.floor(new Date(2025, 10, 1).getTime() / 1000); // 1º nov 2025
        timeTo = Math.floor(new Date(2025, 10, 30, 23, 59, 59).getTime() / 1000); // 30 nov 2025
      } else if (now.getMonth() === 10 && now.getFullYear() === 2025) { // Novembro 2025
        timeFrom = Math.floor(new Date(2025, 10, 1).getTime() / 1000); // 1º nov 2025
        timeTo = Math.floor(now.getTime() / 1000); // Até hoje
      } else {
        // Fallback: últimos 30 dias
        timeTo = Math.floor(now.getTime() / 1000);
        timeFrom = timeTo - (30 * 24 * 60 * 60);
      }
    }

    const periodDays = Math.ceil((timeTo - timeFrom) / (24 * 60 * 60));
    console.log(`\n📊 [SHOPEE-COMPATIBLE] Loja ${shop_id} | Período: ${periodDays} dias`);
    console.log(`📅 ${new Date(timeFrom * 1000).toISOString().split('T')[0]} até ${new Date(timeTo * 1000).toISOString().split('T')[0]}`);

    // ETAPA 1: Preparar chunks de 14 dias
    const CHUNK_SIZE = 14 * 24 * 60 * 60;
    const chunks: { start: number; end: number }[] = [];
    let currentStart = timeFrom;
    
    while (currentStart < timeTo) {
      const currentEnd = Math.min(currentStart + CHUNK_SIZE, timeTo);
      chunks.push({ start: currentStart, end: currentEnd });
      currentStart = currentEnd;
    }

    // Buscar TODOS os pedidos (não filtrar por status)
    console.log(`⚡ Buscando TODOS os pedidos em ${chunks.length} chunks...`);
    const chunkResults = await processInParallel(
      chunks, 
      (chunk) => fetchChunkOrders(chunk, access_token, shop_id), 
      3
    );
    const allOrders = chunkResults.flat();

    console.log(`✅ Etapa 1: ${allOrders.length} pedidos encontrados`);

    if (allOrders.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalSales: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          period: { from: timeFrom, to: timeTo },
          message: 'Nenhum pedido encontrado no período'
        }
      });
    }

    // ETAPA 2: Buscar detalhes usando get_order_detail (como outros endpoints do sistema)
    const orderIds = allOrders.map(order => order.order_sn);
    const BATCH_SIZE = 50;
    const batches: string[][] = [];
    for (let i = 0; i < orderIds.length; i += BATCH_SIZE) {
      batches.push(orderIds.slice(i, i + BATCH_SIZE));
    }

    console.log(`⚡ Buscando detalhes de ${batches.length} batches...`);
    
    let totalSales = 0;
    let processedOrders = 0;
    const statusCounts: Record<string, number> = {};

    for (const batch of batches) {
      try {
        const detailResp = await shopeeFetch<any>({
          path: '/api/v2/order/get_order_detail',
          access_token,
          shop_id,
          query: {
            order_sn_list: batch.join(','),
            response_optional_fields: 'total_amount,order_status'
          }
        });

        const details = detailResp?.response?.order_list || [];
        
        for (const order of details) {
          const amount = Number(order.total_amount) || 0;
          const status = order.order_status || 'UNKNOWN';
          
          // Contar todos os pedidos (como no painel Shopee)
          totalSales += amount;
          processedOrders++;
          
          // Contar por status
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        }
      } catch (error) {
        console.error(`❌ Erro no batch:`, error);
      }
    }

    const averageOrderValue = processedOrders > 0 ? totalSales / processedOrders : 0;

    console.log(`✅ Etapa 2: R$ ${totalSales.toFixed(2)} | ${processedOrders} pedidos`);
    console.log(`📊 Status: ${JSON.stringify(statusCounts)}`);
    console.log(`🎯 RESULTADO COMPATÍVEL: ${processedOrders} pedidos | R$ ${totalSales.toFixed(2)} | Ticket: R$ ${averageOrderValue.toFixed(2)}\n`);

    return NextResponse.json({
      success: true,
      data: {
        totalSales,
        totalOrders: processedOrders,
        averageOrderValue,
        statusBreakdown: statusCounts,
        period: { 
          from: timeFrom, 
          to: timeTo,
          days: periodDays,
          fromDate: new Date(timeFrom * 1000).toISOString(),
          toDate: new Date(timeTo * 1000).toISOString()
        }
      }
    });

  } catch (error) {
    console.error('❌ [SHOPEE-COMPATIBLE] Erro geral:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
