import { NextRequest, NextResponse } from 'next/server';
import { shopeeFetch } from '@/lib/shopee';

// Status pagos conforme painel (READY_TO_SHIP+)
// CANCELLED incluído mas será filtrado para considerar APENAS os que têm data de pagamento (pagos e depois cancelados)
const PEDIDOS_PAGOS_STATUSES = ['READY_TO_SHIP', 'PROCESSED', 'SHIPPED', 'COMPLETED', 'TO_CONFIRM_RECEIVE', 'TO_SHIP', 'TO_CONFIRM_DELIVER', 'READY_TO_PICKUP', 'TO_RETURN', 'CANCELLED'];

// Status não pagos (apenas para logging)
const PEDIDOS_NAO_PAGOS_STATUSES = ['UNPAID', 'CANCELLED', 'TO_RETURN', 'REFUND'];

// Função para calcular pedidos pagos nos últimos 30 dias
export async function calcularPedidosPagos30Dias(
  access_token: string,
  shop_id: string,
  timeFrom?: number,
  timeTo?: number
): Promise<{
  totalVendas: number;
  totalPedidos: number;
  pedidosProcessados: number;
  statusBreakdown: Record<string, number>;
  periodo: { inicio: string; fim: string };
}> {
  
  // 1. ESPELHO EXATO: Usar período IDÊNTICO ao painel Shopee
  let finalTimeFrom: number;
  let finalTimeTo: number;
  let dataInicio: Date;
  let dataFim: Date;
  
  if (timeFrom && timeTo) {
    // Usar período customizado
    finalTimeFrom = timeFrom;
    finalTimeTo = timeTo;
    dataInicio = new Date(timeFrom * 1000);
    dataFim = new Date(timeTo * 1000);
  } else {
    // PADRÃO: Últimos 30 dias (dinâmico)
    // Ajustar para terminar no final do dia atual (23:59:59)
    const now = new Date();
    dataFim = new Date(now.setHours(23, 59, 59, 999));
    
    // Início: 30 dias atrás (início do dia 00:00:00)
    dataInicio = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    dataInicio.setHours(0, 0, 0, 0);
    
    finalTimeFrom = Math.floor(dataInicio.getTime() / 1000);
    finalTimeTo = Math.floor(dataFim.getTime() / 1000);
  }
  
  console.log(`\n🗓️ [VENDAS-REAIS] Definindo período de busca`);
  console.log(`📅 Período: ${dataInicio.toISOString().split('T')[0]} até ${dataFim.toISOString().split('T')[0]}`);
  console.log(`⏰ Timestamps: ${finalTimeFrom} até ${finalTimeTo}`);

  // 2. ETAPA 1: Dividir período em chunks de 14 dias (limite da API)
  // IMPORTANTE: Recuar o início da busca em 15 dias para capturar pedidos criados antes mas pagos dentro do período
  console.log(`\n⚡ ETAPA 1: Dividindo período em chunks de 14 dias (com lookback de 15 dias)...`);
  
  const LOOKBACK_DAYS = 15;
  const fetchStartTime = finalTimeFrom - (LOOKBACK_DAYS * 24 * 60 * 60);
  
  const CHUNK_DAYS = 14;
  const CHUNK_SECONDS = CHUNK_DAYS * 24 * 60 * 60;
  const chunks: { start: number; end: number }[] = [];
  
  let currentStart = fetchStartTime;
  while (currentStart < finalTimeTo) {
    const currentEnd = Math.min(currentStart + CHUNK_SECONDS, finalTimeTo);
    chunks.push({ start: currentStart, end: currentEnd });
    currentStart = currentEnd;
  }
  
  console.log(`📦 Total de chunks: ${chunks.length}`);
  chunks.forEach((chunk, i) => {
    console.log(`   Chunk ${i + 1}: ${new Date(chunk.start * 1000).toISOString().split('T')[0]} até ${new Date(chunk.end * 1000).toISOString().split('T')[0]}`);
  });

  // 3. Buscar pedidos de cada chunk e somar diretamente (order_status=3)
  let totalPages = 0;
  let totalVendas = 0;
  let pedidosProcessados = 0;
  const statusBreakdown: Record<string, number> = {};
  let totalPedidosPagos = 0;

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    console.log(`\n📦 Processando chunk ${chunkIndex + 1}/${chunks.length}...`);
    
    let cursor = "";
    let hasMore = true;
    let pageCount = 0;

    while (hasMore) {
      try {
        pageCount++;
        totalPages++;
        
        // Usar create_time (mais amplo); Shopee não aceita order_status=3 numerado, então filtramos depois
        const baseParams = {
          time_range_field: 'create_time',
          time_from: chunk.start,
          time_to: chunk.end,
          page_size: 100,
          // Pedir apenas o status, pois total_amount também não é suportado no get_order_list da V2
          // Se precisar de valores, teremos que fazer uma chamada secundária para get_order_detail
          response_optional_fields: 'order_status',
        } as Record<string, string | number | boolean | undefined>;

        const params = cursor ? { ...baseParams, cursor } : baseParams;

        console.log(`   📄 Chunk ${chunkIndex + 1} - Página ${pageCount} ${cursor ? `(cursor: ${cursor.substring(0, 10)}...)` : '(primeira página)'}`);

        const orderResp = await shopeeFetch<any>({
          path: '/api/v2/order/get_order_list',
          access_token,
          shop_id,
          query: params,
        });

        if (orderResp?.error) {
           console.error(`❌ [DEBUG] Erro API Shopee (Chunk ${chunkIndex + 1}):`, JSON.stringify(orderResp));
        }

        if (!orderResp?.error) {
          console.log(`   ↩️ Campo usado: create_time (paid_time não suportado).`);
        } else if (orderResp?.error === 'order.order_list_invalid_time') {
          console.warn(`   ⚠️ invalid_time com create_time; tentando update_time...`);
          const paramsAlt = cursor ? { ...baseParams, time_range_field: 'update_time', cursor } : { ...baseParams, time_range_field: 'update_time' };
          const altResp = await shopeeFetch<any>({
            path: '/api/v2/order/get_order_list',
            access_token,
            shop_id,
            query: paramsAlt,
          });
          if (altResp?.error) {
            console.error(`❌ Erro no chunk ${chunkIndex + 1}, página ${pageCount}: ${altResp.error}`);
            hasMore = false;
            continue;
          }
          console.log(`   ↩️ Campo usado: update_time (fallback).`);
          orderResp.response = altResp.response;
        } else {
          console.error(`❌ Erro no chunk ${chunkIndex + 1}, página ${pageCount}: ${orderResp?.error || 'erro desconhecido'}`);
          hasMore = false;
          continue;
        }

        if (orderResp?.error) {
          console.error(`❌ Erro no chunk ${chunkIndex + 1}, página ${pageCount}: ${orderResp.error}`);
          break;
        }

        const pageOrders = orderResp?.response?.order_list || [];
        console.log(`   ✅ Chunk ${chunkIndex + 1} - Página ${pageCount}: ${pageOrders.length} pedidos encontrados`);

        // Se encontrou pedidos, buscar os detalhes financeiros (get_order_detail)
        if (pageOrders.length > 0) {
            const orderSns = pageOrders.map((o: any) => o.order_sn);
            const chunkSize = 50; // Limite da Shopee é 50 por request

            for (let i = 0; i < orderSns.length; i += chunkSize) {
                const snChunk = orderSns.slice(i, i + chunkSize);
                try {
                    console.log(`   🔍 Buscando detalhes financeiros para ${snChunk.length} pedidos...`);
                    const detailResp = await shopeeFetch<any>({
                        path: '/api/v2/order/get_order_detail',
                        access_token,
                        shop_id,
                        query: {
                            order_sn_list: snChunk.join(','),
                            response_optional_fields: 'total_amount,order_status,create_time,pay_time'
                        }
                    });

                    const details = detailResp?.response?.order_list || [];
                    
                    for (const order of details) {
          const status = order.order_status || 'UNKNOWN';
                        const amount = Number(order.total_amount || 0);
                        
                        // Lógica de Tempo:
                        // Para CANCELLED: Exige pay_time (só conta se foi pago antes de cancelar)
                        // Para outros: Usa pay_time ou create_time como fallback
                        let orderTime = order.pay_time;
                        
                        if (status === 'CANCELLED') {
                            if (!order.pay_time) continue; // Ignora cancelados não pagos (boleto não pago, etc)
                        } else {
                             orderTime = order.pay_time || order.create_time;
                        }

                        // Verificar novamente se orderTime existe (caso create_time falhe também, o que é raro)
                        if (!orderTime) continue;

          statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
          pedidosProcessados++;

                        // Lógica Principal: Pedidos Pagos
          if (
            PEDIDOS_PAGOS_STATUSES.includes(status) &&
                            orderTime >= finalTimeFrom &&
                            orderTime <= finalTimeTo
          ) {
            totalPedidosPagos++;
            totalVendas += amount;
          }
                        
                        // Lógica Secundária: Cancelados do Período (para bater com painel)
                        // O painel costuma contar cancelados pela data de criação ou cancelamento dentro do período
                        if (status === 'CANCELLED' && orderTime >= finalTimeFrom && orderTime <= finalTimeTo) {
                             // Apenas para log/debug por enquanto
                             // Se o cliente quiser somar, podemos ajustar depois
                        }
                    }
                } catch (e: any) {
                    console.error('   ❌ Erro ao buscar detalhes dos pedidos:', e.message);
                }
            }
        } else {
             // Caso não tenha pedidos, não faz nada
        }

        // Remover lógica antiga de loop direto nos pageOrders, pois agora processamos via get_order_detail
        /* 
        for (const order of pageOrders) {
          // ... lógica antiga removida ...
        }
        */

        // Verificar se há mais páginas - PAGINAÇÃO MELHORADA
        const hasMoreFlag = orderResp?.response?.more ?? false;
        const nextCursor = orderResp?.response?.next_cursor || orderResp?.next_cursor || "";
        
        console.log(`   📋 Paginação: more=${hasMoreFlag}, next_cursor=${nextCursor ? nextCursor.substring(0, 20) + '...' : 'null'}`);
        
        cursor = nextCursor;
        hasMore = hasMoreFlag && !!cursor && cursor.length > 0;

      } catch (error) {
        console.error(`❌ Erro de conexão no chunk ${chunkIndex + 1}, página ${pageCount}:`, error);
        hasMore = false;
      }
    }
    
    console.log(`✅ Chunk ${chunkIndex + 1} concluído: ${pageCount} páginas processadas`);
  }

  console.log(`✅ ETAPA 1 CONCLUÍDA: ${pedidosProcessados} pedidos processados em ${totalPages} páginas de ${chunks.length} chunks`);

  console.log(`\n✅ AGREGAÇÃO CONCLUÍDA:`);
  console.log(`   💰 Total de Vendas (Pedidos Pagos): R$ ${totalVendas.toFixed(2)}`);
  console.log(`   📊 Pedidos Pagos: ${totalPedidosPagos}`);
  console.log(`   📋 Pedidos Processados: ${pedidosProcessados}`);
  console.log(`   📈 Status Breakdown:`, statusBreakdown);

  return {
    totalVendas,
    totalPedidos: totalPedidosPagos,
    pedidosProcessados,
    statusBreakdown,
    periodo: {
      inicio: dataInicio.toISOString().split('T')[0],
      fim: dataFim.toISOString().split('T')[0]
    }
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const access_token = searchParams.get('access_token');
    const shop_id = searchParams.get('shop_id');
    const timeFrom = searchParams.get('time_from') ? Number(searchParams.get('time_from')) : undefined;
    const timeTo = searchParams.get('time_to') ? Number(searchParams.get('time_to')) : undefined;

    if (!access_token || !shop_id) {
      return NextResponse.json(
        { error: 'access_token e shop_id são obrigatórios' },
        { status: 400 }
      );
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🏪 [VENDAS-REAIS] Buscando pedidos pagos`);
    console.log(`📅 Período: ${timeFrom ? 'Customizado' : 'Últimos 30 dias'}`);
    if (timeFrom && timeTo) {
      console.log(`⏰ De: ${new Date(timeFrom * 1000).toISOString().split('T')[0]} até ${new Date(timeTo * 1000).toISOString().split('T')[0]}`);
    }
    console.log(`${'='.repeat(80)}`);

    const resultado = await calcularPedidosPagos30Dias(access_token, shop_id, timeFrom, timeTo);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎯 [VENDAS-REAIS] RESULTADO FINAL - PEDIDOS PAGOS:`);
    console.log(`   💰 Vendas de Pedidos Pagos: R$ ${resultado.totalVendas.toFixed(2)}`);
    
    // Logar status breakdown completo
    const canceladosNoPeriodo = resultado.statusBreakdown['CANCELLED'] || 0;
    
    console.log(`   📊 Pedidos Pagos (Sistema): ${resultado.totalPedidos}`);
    console.log(`   🚫 Cancelados (Total Encontrado): ${canceladosNoPeriodo}`);
    console.log(`   📋 Total Processados: ${resultado.pedidosProcessados}`);
    console.log(`   📅 Período: ${resultado.periodo.inicio} até ${resultado.periodo.fim}`);
    console.log(`   ✅ Status de Pedidos Pagos: ${PEDIDOS_PAGOS_STATUSES.join(', ')}`);
    console.log(`   ❌ Status Não Pagos: ${PEDIDOS_NAO_PAGOS_STATUSES.join(', ')}`);
    console.log(`${'='.repeat(80)}\n`);

    return NextResponse.json({
      success: true,
      data: {
        vendas: resultado.totalVendas,
        pedidos: resultado.totalPedidos,
        pedidosProcessados: resultado.pedidosProcessados,
        statusBreakdown: resultado.statusBreakdown,
        periodo: resultado.periodo,
        criterios: {
          statusPedidosPagos: PEDIDOS_PAGOS_STATUSES,
          statusNaoPagos: PEDIDOS_NAO_PAGOS_STATUSES,
          metodo: 'get_order_list + paginacao_completa + filtro status painel + paid_time/create_time + soma paid_price/total_amount',
          periodo: 'ultimos_30_dias'
        }
      }
    });

  } catch (error) {
    console.error('❌ [VENDAS-REAIS] Erro geral:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
