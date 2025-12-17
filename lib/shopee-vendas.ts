import { shopeeFetch } from '@/lib/shopee';

// Status pagos conforme painel 
export const PEDIDOS_PAGOS_STATUSES = ['READY_TO_SHIP', 'PROCESSED', 'SHIPPED', 'COMPLETED', 'TO_CONFIRM_RECEIVE', 'TO_SHIP', 'TO_CONFIRM_DELIVER', 'READY_TO_PICKUP', 'TO_RETURN', 'CANCELLED'];

export const PEDIDOS_NAO_PAGOS_STATUSES = ['UNPAID', 'CANCELLED', 'TO_RETURN', 'REFUND'];

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
  topProducts: Array<{
    id: number;
    name: string;
    sales: number;
    revenue: number;
  }>;
}> {

  // Usar período IDÊNTICO ao painel Shopee
  let finalTimeFrom: number;
  let finalTimeTo: number;
  let dataInicio: Date;
  let dataFim: Date;

  if (timeFrom && timeTo) {
    //  período customizado
    finalTimeFrom = timeFrom;
    finalTimeTo = timeTo;
    dataInicio = new Date(timeFrom * 1000);
    dataFim = new Date(timeTo * 1000);
  } else {
    //  ultimos 30 dias 

    const now = new Date();
    dataFim = new Date(now.setHours(23, 59, 59, 999));

    // Início: 30 dias atrás 
    dataInicio = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    dataInicio.setHours(0, 0, 0, 0);

    finalTimeFrom = Math.floor(dataInicio.getTime() / 1000);
    finalTimeTo = Math.floor(dataFim.getTime() / 1000);
  }

  console.log(`\n [VENDAS-REAIS] Definindo período de busca`);
  console.log(` Período: ${dataInicio.toISOString().split('T')[0]} até ${dataFim.toISOString().split('T')[0]}`);
  console.log(` Timestamps: ${finalTimeFrom} até ${finalTimeTo}`);

  //  Dividir período em chunks de 14 dias (limite da API)
  //  lookback recuar  início da busca em 15 dias para capturar pedidos criados antes mas pagos dentro do período
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

  console.log(` Total de chunks: ${chunks.length}`);
  chunks.forEach((chunk, i) => {
    console.log(`   Chunk ${i + 1}: ${new Date(chunk.start * 1000).toISOString().split('T')[0]} até ${new Date(chunk.end * 1000).toISOString().split('T')[0]}`);
  });

  // Buscar pedidos de cada chunk e somar diretamente (order_status=3)
  let totalPages = 0;
  let totalVendas = 0;
  let pedidosProcessados = 0;
  const statusBreakdown: Record<string, number> = {};
  const productSalesMap: Record<string, { name: string; sales: number; revenue: number }> = {};
  let totalPedidosPagos = 0;

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];
    console.log(`\n Processando chunk ${chunkIndex + 1}/${chunks.length}...`);

    let cursor = "";
    let hasMore = true;
    let pageCount = 0;

    while (hasMore) {
      try {
        pageCount++;
        totalPages++;


        const baseParams = {
          time_range_field: 'create_time',
          time_from: chunk.start,
          time_to: chunk.end,
          page_size: 100,
          //  TODO:  Pedir apenas o status, pois total_amount também não é suportado no get_order_list da V2

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
          console.error(` [DEBUG] Erro API Shopee (Chunk ${chunkIndex + 1}):`, JSON.stringify(orderResp));
        }

        if (!orderResp?.error) {
          console.log(`   Campo usado: create_time (paid_time não suportado).`);
        } else if (orderResp?.error === 'order.order_list_invalid_time') {
          console.warn(`    invalid_time com create_time; tentando update_time...`);
          const paramsAlt = cursor ? { ...baseParams, time_range_field: 'update_time', cursor } : { ...baseParams, time_range_field: 'update_time' };
          const altResp = await shopeeFetch<any>({
            path: '/api/v2/order/get_order_list',
            access_token,
            shop_id,
            query: paramsAlt,
          });
          if (altResp?.error) {
            console.error(` Erro no chunk ${chunkIndex + 1}, página ${pageCount}: ${altResp.error}`);
            hasMore = false;
            continue;
          }
          console.log(`    Campo usado: update_time (fallback).`);
          orderResp.response = altResp.response;
        } else {
          console.error(` Erro no chunk ${chunkIndex + 1}, página ${pageCount}: ${orderResp?.error || 'erro desconhecido'}`);
          hasMore = false;
          continue;
        }

        if (orderResp?.error) {
          console.error(`Erro no chunk ${chunkIndex + 1}, página ${pageCount}: ${orderResp.error}`);
          break;
        }

        const pageOrders = orderResp?.response?.order_list || [];
        console.log(`   Chunk ${chunkIndex + 1} - Página ${pageCount}: ${pageOrders.length} pedidos encontrados`);

        // [OTIMIZAÇÃO] Filtrar apenas status relevantes antes de buscar detalhes
        // Isso economiza chamadas de API para pedidos UNPAID, etc.
        const relevantOrders = pageOrders.filter((o: any) => {
          // Se não vier status, processa para garantir
          if (!o.order_status) return true;
          return PEDIDOS_PAGOS_STATUSES.includes(o.order_status);
        });

        if (relevantOrders.length < pageOrders.length) {
          console.log(`   [SKIP] Ignorando ${pageOrders.length - relevantOrders.length} pedidos irrelevantes. Processando: ${relevantOrders.length}`);
        }

        // Se encontrou pedidos, buscar os detalhes financeiros (get_order_detail) - OTIMIZADO PARA MÁXIMA VELOCIDADE
        if (relevantOrders.length > 0) {
          const orderSns = relevantOrders.map((o: any) => o.order_sn);
          const chunkSize = 10; // Chunks ultra-pequenos para velocidade máxima
          const CONCURRENCY_LIMIT = 6; // Máxima concorrência possível (chunks pequenos = safe)
          
          // Função helper otimizada para máxima velocidade
          const processInBatches = async <T, R>(
            items: T[],
            batchSize: number,
            concurrency: number,
            processor: (batch: T[]) => Promise<R[]>
          ): Promise<R[]> => {
            const results: R[] = [];
            const totalBatches = Math.ceil(items.length / batchSize);
            
            // Processar todos os batches com controle de concorrência
            for (let i = 0; i < totalBatches; i += concurrency) {
              const batchPromises: Promise<R[]>[] = [];
              
              // Criar até 'concurrency' promises simultâneas
              for (let j = 0; j < concurrency && (i + j) < totalBatches; j++) {
                const startIdx = (i + j) * batchSize;
                const chunk = items.slice(startIdx, startIdx + batchSize);
                batchPromises.push(processor(chunk));
              }
              
              // Aguardar todas concluírem e adicionar resultados
              const batchResults = await Promise.all(batchPromises);
              results.push(...batchResults.flat());
              
              // Delay mínimo apenas entre grupos grandes (não entre cada batch)
              if (i + concurrency < totalBatches && i > 0) {
                await new Promise(resolve => setTimeout(resolve, 20)); // Delay mínimo
              }
            }
            return results;
          };

          // Processar em batches controlados - MÁXIMA VELOCIDADE
          const details = await processInBatches<string, any>(
            orderSns,
            chunkSize,
            CONCURRENCY_LIMIT,
            async (snChunk: string[]) => {
              try {
                const detailResp = await shopeeFetch<any>({
                  path: '/api/v2/order/get_order_detail',
                  access_token,
                  shop_id,
                  query: {
                    order_sn_list: snChunk.join(','),
                    response_optional_fields: 'total_amount,order_status,create_time,pay_time,item_list'
                  }
                });
                return detailResp?.response?.order_list || [];
              } catch (e: any) {
                console.error('    [Erro] Chunk detalhes:', e.message);
                return [];
              }
            }
          );

          // Processar os detalhes retornados
          for (const order of details) {
            const status = order.order_status || 'UNKNOWN';
            const amount = Number(order.total_amount || 0);
            
            // ... resto do loop de processamento ...


                // Para CANCELLED Exige pay_time 
                // outros Usa pay_time ou create_time como fallback
                let orderTime = order.pay_time;

                if (status === 'CANCELLED') {
                  if (!order.pay_time) continue; // Ignora cancelados nã
                } else {
                  orderTime = order.pay_time || order.create_time;
                }

                if (!orderTime) continue;

                statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
                pedidosProcessados++;


                if (
                  PEDIDOS_PAGOS_STATUSES.includes(status) &&
                  orderTime >= finalTimeFrom &&
                  orderTime <= finalTimeTo
                ) {
                  totalPedidosPagos++;
                  totalVendas += amount;

                  // Processar itens do pedido
                  if (order.item_list) {
                    order.item_list.forEach((item: any) => {
                      const itemId = String(item.item_id);
                      const itemName = item.item_name;
                      const quantity = item.model_quantity_purchased || 0;
                      const price = Number(item.model_discounted_price || 0);
                      const revenue = price * quantity;

                      if (!productSalesMap[itemId]) {
                        productSalesMap[itemId] = { name: itemName, sales: 0, revenue: 0 };
                      }
                      productSalesMap[itemId].sales += quantity;
                      productSalesMap[itemId].revenue += revenue;
                    });
                  }
                }

                // TODO: Cancelados do Período 

                if (status === 'CANCELLED' && orderTime >= finalTimeFrom && orderTime <= finalTimeTo) { }
              }
            
          
        } else { }


        const hasMoreFlag = orderResp?.response?.more ?? false;
        const nextCursor = orderResp?.response?.next_cursor || orderResp?.next_cursor || "";

        console.log(`    Paginação: more=${hasMoreFlag}, next_cursor=${nextCursor ? nextCursor.substring(0, 20) + '...' : 'null'}`);

        cursor = nextCursor;
        hasMore = hasMoreFlag && !!cursor && cursor.length > 0;

      } catch (error) {
        console.error(`Erro de conexão no chunk ${chunkIndex + 1}, página ${pageCount}:`, error);
        hasMore = false;
      }
    }

    console.log(` Chunk ${chunkIndex + 1} concluído: ${pageCount} páginas processadas`);
  }


  console.log(`\n AGREGAÇÃO CONCLUÍDA:`);
  console.log(`    Total de Vendas (Pedidos Pagos): R$ ${totalVendas.toFixed(2)}`);
  console.log(`    Pedidos Pagos: ${totalPedidosPagos}`);
  console.log(`   Pedidos Processados: ${pedidosProcessados}`);
  console.log(`   Status Breakdown:`, statusBreakdown);

  // Converter mapa de produtos em array ordenado
  const topProducts = Object.entries(productSalesMap)
    .map(([id, data]) => ({
      id: Number(id),
      name: data.name,
      sales: data.sales,
      revenue: data.revenue
    }))
    .sort((a, b) => b.sales - a.sales) // Ordenar por vendas (decrescente)
    .slice(0, 10); // Top 10

  console.log(`   Top Produtos (amostra):`, topProducts.slice(0, 3));

  return {
    totalVendas,
    totalPedidos: totalPedidosPagos,
    pedidosProcessados,
    statusBreakdown,
    periodo: {
      inicio: dataInicio.toISOString().split('T')[0],
      fim: dataFim.toISOString().split('T')[0]
    },
    topProducts
  };
}

