import { NextRequest, NextResponse } from 'next/server';
import { shopeeFetch } from '@/lib/shopee';

// Função auxiliar para processar chunks em paralelo com limite de concorrência
import { guardShopeeRoute } from '@/lib/shopee-route-guard';

export const dynamic = 'force-dynamic';

async function processInParallel<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  concurrency: number = 5
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

// Função para buscar todos os pedidos de um chunk (apenas COMPLETED)
async function fetchChunkOrders(
  chunk: { start: number; end: number },
  access_token: string,
  shop_id: string
): Promise<string[]> {
  const orderIds: string[] = [];
  let cursor = "";
  let hasMore = true;

  while (hasMore) {
    try {
      const orderListParams: Record<string, string | number | boolean | undefined> = {
        time_range_field: 'create_time',
        time_from: chunk.start,
        time_to: chunk.end,
        page_size: 100,
        order_status: 'COMPLETED', // APENAS pedidos COMPLETED (pagos e finalizados)
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

      const orders = orderResp?.response?.order_list || orderResp?.order_list || [];
      const ids = orders.map((order: any) => order.order_sn).filter(Boolean);
      orderIds.push(...ids);

      const hasMoreFlag = orderResp?.response?.more ?? false;
      cursor = orderResp?.response?.next_cursor || orderResp?.next_cursor || "";
      hasMore = hasMoreFlag || (!!cursor && cursor !== "");

    } catch (error) {
      console.error(`❌ Chunk erro de conexão:`, error);
      hasMore = false;
    }
  }

  return orderIds;
}

// Função para processar um batch de escrow
async function fetchEscrowBatch(
  batch: string[],
  access_token: string,
  shop_id: string
): Promise<{ value: number; processed: number; withValue: number }> {
  try {
    const escrowResp = await shopeeFetch<any>({
      path: '/api/v2/payment/get_escrow_detail_batch',
      method: 'POST',
      access_token,
      shop_id,
      body: { order_sn_list: batch },
    });

    if (escrowResp?.error) {
      return { value: 0, processed: 0, withValue: 0 };
    }

    const escrowDetails = escrowResp?.response || escrowResp?.escrow_detail_list || [];
    const detailsArray = Array.isArray(escrowDetails) ? escrowDetails : [];
    
    let batchValue = 0;
    let processed = 0;
    let withValue = 0;
    
    for (const detail of detailsArray) {
      if (detail?.fail_error) continue;
      
      const escrowDetail = detail?.escrow_detail || detail;
      const rawAmount =
        escrowDetail?.buyer_payment_info?.buyer_total_amount ??
        escrowDetail?.order_income?.buyer_total_amount ??
        escrowDetail?.order_income?.escrow_amount ??
        0;
      const amount = Number(rawAmount);
      
      processed++;
      if (amount > 0) {
        withValue++;
        batchValue += amount;
      }
    }
    
    return { value: batchValue, processed, withValue };
  } catch (error) {
    return { value: 0, processed: 0, withValue: 0 };
  }
}

export async function GET(request: NextRequest) {
  try {
    const _shopeeGuard = guardShopeeRoute();
    if (_shopeeGuard) return _shopeeGuard;
    const { searchParams } = new URL(request.url);
    const access_token = searchParams.get('access_token');
    const shop_id = searchParams.get('shop_id');
    const customDays = parseInt(searchParams.get('days') || '30');
    const customTimeFromParam = searchParams.get('time_from');
    const customTimeToParam = searchParams.get('time_to');

    if (!access_token || !shop_id) {
      return NextResponse.json(
        { error: 'access_token e shop_id são obrigatórios' },
        { status: 400 }
      );
    }

    const timeTo = customTimeToParam ? Number(customTimeToParam) : Math.floor(Date.now() / 1000);
    let timeFrom: number;
    if (customTimeFromParam) {
      timeFrom = Number(customTimeFromParam);
    } else {
      timeFrom = timeTo - (customDays * 24 * 60 * 60);
    }

    if (timeFrom >= timeTo) {
      timeFrom = timeTo - (customDays * 24 * 60 * 60);
    }

    const periodDays = Math.ceil((timeTo - timeFrom) / (24 * 60 * 60));
    console.log(`\n📊 [PAID-ORDERS] Loja ${shop_id} | Período: ${periodDays} dias`);

    // ETAPA 1: Preparar chunks de 14 dias
    const CHUNK_SIZE = 14 * 24 * 60 * 60;
    const chunks: { start: number; end: number }[] = [];
    let currentStart = timeFrom;
    
    while (currentStart < timeTo) {
      const currentEnd = Math.min(currentStart + CHUNK_SIZE, timeTo);
      chunks.push({ start: currentStart, end: currentEnd });
      currentStart = currentEnd;
    }

    // Buscar pedidos de todos os chunks em paralelo (3 chunks por vez)
    console.log(`⚡ Buscando pedidos COMPLETED em ${chunks.length} chunks (paralelo)...`);
    const chunkResults = await processInParallel(
      chunks, 
      (chunk) => fetchChunkOrders(chunk, access_token, shop_id), 
      3
    );
    const allOrderIds = chunkResults.flat();

    console.log(`✅ Etapa 1: ${allOrderIds.length} pedidos COMPLETED encontrados`);

    if (allOrderIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalPaidValue: 0,
          totalOrders: 0,
          period: { from: timeFrom, to: timeTo },
          message: 'Nenhum pedido COMPLETED encontrado no período'
        }
      });
    }

    // ETAPA 2: Preparar batches de 50 pedidos
    const BATCH_SIZE = 50;
    const batches: string[][] = [];
    for (let i = 0; i < allOrderIds.length; i += BATCH_SIZE) {
      batches.push(allOrderIds.slice(i, i + BATCH_SIZE));
    }

    // Buscar detalhes financeiros em paralelo (5 batches por vez)
    console.log(`⚡ Buscando valores de ${batches.length} batches (paralelo)...`);
    const batchResults = await processInParallel(
      batches, 
      (batch) => fetchEscrowBatch(batch, access_token, shop_id), 
      5
    );
    
    const totalPaidValue = batchResults.reduce((sum, r) => sum + r.value, 0);
    const processedOrders = batchResults.reduce((sum, r) => sum + r.processed, 0);
    const ordersWithValue = batchResults.reduce((sum, r) => sum + r.withValue, 0);

    console.log(`✅ Etapa 2: R$ ${totalPaidValue.toFixed(2)} | ${processedOrders} pedidos processados`);
    console.log(`🎉 RESULTADO: ${processedOrders} pedidos COMPLETED | GMV: R$ ${totalPaidValue.toFixed(2)}\n`);

    return NextResponse.json({
      success: true,
      data: {
        totalPaidValue,
        totalOrders: processedOrders,
        ordersWithValue,
        foundOrderIds: allOrderIds.length,
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
    console.error('❌ [PAID-ORDERS] Erro geral:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
