import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { shopeeFetch } from '@/lib/shopee';

export const dynamic = 'force-dynamic';

/**
 * 📊 ENDPOINT MELHORADO PARA DADOS COM PEDIDOS PAGOS E COMPARATIVOS
 * 
 * Retorna dados separando pedidos totais vs pagos e inclui comparativo com período anterior
 * Uso: GET /api/shopee/enhanced-data?client_id=xxx
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const dateFromParam = searchParams.get('date_from'); // YYYY-MM-DD
    const dateToParam = searchParams.get('date_to');     // YYYY-MM-DD
    const tzOffsetHours = Number(searchParams.get('tz_offset_hours') ?? -3); // GMT-03 por padrão

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
        needs_reconnection: true 
      }, { status: 404 });
    }

    const { access_token, shop_id } = integration;

    // Helpers de tempo respeitando fuso horário (offset em horas)
    const SEC_PER_DAY = 24 * 60 * 60;
    const toUnix = (d: Date) => Math.floor(d.getTime() / 1000);
    const startOfDayWithOffset = (yyyyMmDd: string, offsetHours: number) => {
      const [y, m, d] = yyyyMmDd.split('-').map(Number);
      // Constrói meia-noite local (offset) em UTC
      const utc = new Date(Date.UTC(y, (m - 1), d, 0 - offsetHours, 0, 0));
      return toUnix(utc);
    };
    const endOfDayWithOffset = (yyyyMmDd: string, offsetHours: number) => {
      const start = startOfDayWithOffset(yyyyMmDd, offsetHours);
      return start + SEC_PER_DAY - 1;
    };
    const formatYyyyMmDd = (unix: number, offsetHours: number) => {
      const ms = (unix + offsetHours * 3600) * 1000;
      const d = new Date(ms);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    const lastNDaysRange = (n: number) => {
      const now = Math.floor(Date.now() / 1000);
      const endDay = formatYyyyMmDd(now, tzOffsetHours);
      const end = endOfDayWithOffset(endDay, tzOffsetHours);
      const start = end - (n * SEC_PER_DAY) + 1;
      return { start, end };
    };

    // Configurar períodos (padrão: últimos 7 dias completos no fuso)
    let timeFrom: number;
    let timeTo: number;
    if (dateFromParam && dateToParam) {
      timeFrom = startOfDayWithOffset(dateFromParam, tzOffsetHours);
      timeTo = endOfDayWithOffset(dateToParam, tzOffsetHours);
    } else {
      const { start, end } = lastNDaysRange(7);
      timeFrom = start;
      timeTo = end;
    }
    // Período anterior com mesma duração
    const periodSeconds = (timeTo - timeFrom) + 1;
    const previousTimeTo = timeFrom - 1;
    const previousTimeFrom = previousTimeTo - periodSeconds + 1;

    console.log('📊 [ENHANCED-DATA] Períodos configurados:', {
      current: {
        from: new Date(timeFrom * 1000).toISOString(),
        to: new Date(timeTo * 1000).toISOString()
      },
      previous: {
        from: new Date(previousTimeFrom * 1000).toISOString(),
        to: new Date(previousTimeTo * 1000).toISOString()
      }
    });

    const debugErrors: any[] = [];

    // ================================
    //  ADS (AMS) - SHOP PERFORMANCE
    // ================================
    const fetchAdsPerformance = async (startTime: number, endTime: number) => {
      try {
        const resp = await shopeeFetch<any>({
          path: '/api/v2/ams/get_shop_performance',
          access_token,
          shop_id: String(shop_id ?? ''),
          query: {
            time_from: startTime,
            time_to: endTime,
            granularity: 'daily',
          },
        });
        // Estrutura defensiva: algumas regiões retornam {response:{data:[...]}} outras podem retornar data direto
        const rows = resp?.response?.data || resp?.data || [];
        
        if (!Array.isArray(rows) || rows.length === 0) {
          console.log('ℹ️ [ENHANCED-DATA][AMS] Shop performance retornou lista vazia');
          return {
            spend: 0,
            impressions: 0,
            clicks: 0,
            ctr: 0,
            roas: 0,
            attributedSales: 0,
            daily: [] as Array<{ date: string; spend: number; impressions: number; clicks: number; ctr: number; roas: number }>,
          };
        }

        const totals = rows.reduce(
          (acc: any, r: any) => {
            const spend = Number(r.spend ?? r.cost ?? 0);
            const imp = Number(r.impression ?? r.impressions ?? 0);
            const clk = Number(r.click ?? r.clicks ?? 0);
            const sales = Number(r.gmv ?? r.sales ?? r.revenue ?? 0); // receita atribuída por ads (quando disponível)
            const roas = Number(r.roas ?? 0);
            acc.spend += spend;
            acc.impressions += imp;
            acc.clicks += clk;
            acc.attributedSales += sales;
            // Se não houver ROAS por linha, calcularemos depois pelo agregado
            acc._roasLines.push(roas);
            // Série diária
            const rawDate = (r.date ?? r.stat_time ?? r.time ?? r.start_time ?? null) as string | number | null;
            let dateKey: string;
            if (typeof rawDate === 'number') {
              dateKey = formatYyyyMmDd(Number(rawDate), tzOffsetHours);
            } else if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
              dateKey = rawDate.slice(0, 10);
            } else {
              dateKey = formatYyyyMmDd(startTime, tzOffsetHours);
            }
            acc._daily.push({
              date: dateKey,
              spend,
              impressions: imp,
              clicks: clk,
              ctr: imp > 0 ? (clk / imp) * 100 : 0,
              roas,
            });
            return acc;
          },
          { spend: 0, impressions: 0, clicks: 0, attributedSales: 0, _roasLines: [] as number[], _daily: [] as any[] }
        );

        const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
        let roas = 0;
        if (totals._roasLines.some((v: number) => v > 0)) {
          // média simples quando a API já retorna roas
          const valid = totals._roasLines.filter((v: number) => v > 0);
          roas = valid.length > 0 ? valid.reduce((a: number, b: number) => a + b, 0) / valid.length : 0;
        } else if (totals.spend > 0 && totals.attributedSales > 0) {
          roas = totals.attributedSales / totals.spend;
        }

        return {
          spend: totals.spend,
          impressions: totals.impressions,
          clicks: totals.clicks,
          ctr,
          roas,
          attributedSales: totals.attributedSales,
          daily: totals._daily.sort((a: any, b: any) => (a.date < b.date ? -1 : 1)),
        };
      } catch (e: any) {
        console.warn('⚠️ [ENHANCED-DATA][AMS] Falha ao buscar shop performance:', e?.message);
        debugErrors.push({ context: 'Ads Shop Performance', error: e?.message });
        return {
          spend: 0,
          impressions: 0,
          clicks: 0,
          ctr: 0,
          roas: 0,
          attributedSales: 0,
          daily: [],
        };
      }
    };

    // ================================
    //  ADS (AMS) - PRODUCT PERFORMANCE (Top Ads)
    // ================================
    const fetchAdsTopProducts = async (startTime: number, endTime: number) => {
      try {
        const resp = await shopeeFetch<any>({
          path: '/api/v2/ams/get_product_performance',
          access_token,
          shop_id: String(shop_id ?? ''),
          query: {
            time_from: startTime,
            time_to: endTime,
            granularity: 'daily',
            page_size: 50,
          },
        });
        const rows = resp?.response?.data || resp?.data || [];
        if (!Array.isArray(rows)) return [];
        // Agregar por item_id
        const byItem: Record<string, any> = {};
        for (const r of rows) {
          const key = String(r.item_id ?? r.product_id ?? '');
          if (!key) continue;
          if (!byItem[key]) {
            byItem[key] = {
              item_id: key,
              name: r.item_name ?? r.product_name ?? 'Produto',
              spend: 0,
              impressions: 0,
              clicks: 0,
              sales: 0,
              roas: 0,
            };
          }
          byItem[key].spend += Number(r.spend ?? r.cost ?? 0);
          byItem[key].impressions += Number(r.impression ?? r.impressions ?? 0);
          byItem[key].clicks += Number(r.click ?? r.clicks ?? 0);
          byItem[key].sales += Number(r.gmv ?? r.sales ?? r.revenue ?? 0);
          // mantém o maior roas observado (ou média poderia ser calculada)
          const roas = Number(r.roas ?? 0);
          if (roas > byItem[key].roas) byItem[key].roas = roas;
        }
        // Ordenar por sales ou roas
        return Object.values(byItem)
          .sort((a: any, b: any) => (b.sales ?? 0) - (a.sales ?? 0))
          .slice(0, 10);
      } catch (e: any) {
        console.warn('⚠️ [ENHANCED-DATA][AMS] Falha ao buscar product performance:', e?.message);
        debugErrors.push({ context: 'Ads Product Performance', error: e?.message });
        return [];
      }
    };

    // ================================
    //  ADS - SALDO (ADS get_total_balance)
    // ================================
    const fetchAdsBalance = async () => {
      try {
        const resp = await shopeeFetch<any>({
          path: '/api/v2/ads/get_total_balance',
          access_token,
          shop_id: String(shop_id ?? ''),
        });
        const balance =
          resp?.response?.balance ??
          resp?.response?.total_balance ??
          resp?.balance ??
          resp?.total_balance ??
          0;
        return Number(balance) || 0;
      } catch (e: any) {
        console.warn('⚠️ [ENHANCED-DATA][ADS] Falha ao buscar saldo de Ads:', e?.message);
        debugErrors.push({ context: 'Ads Balance', error: e?.message });
        return 0;
      }
    };

    // Função para buscar pedidos de um período (com séries diárias)
    const fetchPeriodOrders = async (startTime: number, endTime: number) => {
      try {
        let allOrderList: any[] = [];
        
        // A API da Shopee limita a busca a 15 dias.
        // Vamos dividir o período em chunks de 14 dias para segurança.
        const CHUNK_SIZE = 14 * 24 * 60 * 60; 
        let currentStart = startTime;

        while (currentStart < endTime) {
          let currentEnd = Math.min(currentStart + CHUNK_SIZE, endTime);
          
          console.log(`📊 [ENHANCED-DATA] Buscando pedidos chunk: ${new Date(currentStart * 1000).toISOString()} até ${new Date(currentEnd * 1000).toISOString()}`);

          let cursor = "";
          let more = true;
          let page = 0;

          while (more) {
            page++;
            try {
              const orderResp = await shopeeFetch<any>({
                path: '/api/v2/order/get_order_list',
                access_token,
                shop_id: String(shop_id ?? ''),
                query: {
                  time_range_field: 'create_time',
                  time_from: currentStart,
                  time_to: currentEnd,
                  page_size: 100,
                  cursor: cursor
                }
              });

              // Verificar erro de API (mesmo com status 200)
              if (orderResp.error) {
                console.error(`❌ [ENHANCED-DATA] Erro API Shopee (Chunk ${page}):`, orderResp.error, orderResp.message);
                debugErrors.push({ context: `Order List API Error`, error: orderResp.error, message: orderResp.message });
                break; // Interrompe este chunk
              }

              const data = orderResp?.response || {};
              const list = data.order_list || [];
              
              if (list.length > 0) {
                allOrderList = allOrderList.concat(list);
              }

              cursor = data.next_cursor || "";
              more = data.more || false; // A API retorna 'more': true se tiver mais páginas

              // Segurança contra loops infinitos
              if (page > 50) {
                console.warn('⚠️ [ENHANCED-DATA] Limite de paginação atingido (50 páginas)');
                break;
              }
            } catch (e: any) {
              console.error(`❌ [ENHANCED-DATA] Erro na requisição de pedidos:`, e.message);
              debugErrors.push({ context: 'Order Fetch Request', error: e.message });
              break;
            }
          }
          
          // Avança para o próximo chunk (evitando sobreposição exata, mas garantindo continuidade)
          currentStart = currentEnd;
          // Se o loop terminasse exatamente em endTime, o while pararia.
          // Se currentEnd == endTime, o próximo currentStart será endTime e o loop while (currentStart < endTime) encerra.
        }

        // Remover duplicatas (caso haja sobreposição de bordas)
        const uniqueMap = new Map();
        allOrderList.forEach(o => uniqueMap.set(o.order_sn, o));
        const orderList = Array.from(uniqueMap.values());
      
        if (orderList.length === 0) {
          return {
            totalOrders: 0,
            paidOrders: 0,
            cancelledOrders: 0,
            pendingOrders: 0,
            gmvTotal: 0,
            gmvPaid: 0,
            topProducts: [],
            daily: [] as Array<{ date: string; totalOrders: number; paidOrders: number; cancelledOrders: number; gmvPaid: number; ticket: number }>
          };
        }

        console.log(`📊 [ENHANCED-DATA] Total de pedidos encontrados: ${orderList.length}`);

        // Buscar detalhes dos pedidos
        const snList = orderList.map((o: any) => o.order_sn);
        const chunks = [];
        for (let i = 0; i < snList.length; i += 50) {
          chunks.push(snList.slice(i, i + 50));
        }

        let paidOrders = 0;
        let cancelledOrders = 0;
        let pendingOrders = 0;
        let gmvTotal = 0;
        let gmvPaid = 0;
        const productAgg: Record<string, any> = {};
        const dailyMap: Record<string, { totalOrders: number; paidOrders: number; cancelledOrders: number; gmvPaid: number; }> = {};

        // Status de pedidos conforme Shopee
        const PAID_STATUSES = ['READY_TO_SHIP', 'SHIPPED', 'COMPLETED'];
        const CANCELLED_STATUSES = ['CANCELLED'];
        const PENDING_STATUSES = ['UNPAID', 'PROCESSING'];

        for (const chunk of chunks) {
          try {
            const detailResp = await shopeeFetch<any>({
              path: '/api/v2/order/get_order_detail',
              access_token,
              shop_id: String(shop_id ?? ''),
              query: { 
                order_sn_list: chunk.join(','), 
                response_optional_fields: 'item_list,total_amount,order_status' 
              }
            });

            const details = detailResp?.response?.order_list || [];

            for (const order of details) {
              const orderAmount = Number(order.total_amount) || 0;
              const orderStatus = order.order_status;
              const orderTime = Number(order.create_time ?? order.update_time ?? 0);
              const dayKey = orderTime ? formatYyyyMmDd(orderTime, tzOffsetHours) : formatYyyyMmDd(startTime, tzOffsetHours);

              gmvTotal += orderAmount;

              // Classificar por status
              if (PAID_STATUSES.includes(orderStatus)) {
                paidOrders++;
                gmvPaid += orderAmount;
                if (!dailyMap[dayKey]) dailyMap[dayKey] = { totalOrders: 0, paidOrders: 0, cancelledOrders: 0, gmvPaid: 0 };
                dailyMap[dayKey].paidOrders += 1;
                dailyMap[dayKey].gmvPaid += orderAmount;

                // Agregar produtos apenas de pedidos pagos
                for (const item of (order.item_list || [])) {
                  const name = item.item_name;
                  if (!productAgg[name]) {
                    productAgg[name] = { name, units: 0, revenue: 0 };
                  }
                  productAgg[name].units += item.model_quantity_purchased || 0;
                  productAgg[name].revenue += (item.model_discounted_price || item.model_original_price) * (item.model_quantity_purchased || 0);
                }
              } else if (CANCELLED_STATUSES.includes(orderStatus)) {
                cancelledOrders++;
                if (!dailyMap[dayKey]) dailyMap[dayKey] = { totalOrders: 0, paidOrders: 0, cancelledOrders: 0, gmvPaid: 0 };
                dailyMap[dayKey].cancelledOrders += 1;
              } else if (PENDING_STATUSES.includes(orderStatus)) {
                pendingOrders++;
              }
              if (!dailyMap[dayKey]) dailyMap[dayKey] = { totalOrders: 0, paidOrders: 0, cancelledOrders: 0, gmvPaid: 0 };
              dailyMap[dayKey].totalOrders += 1;
            }
          } catch (e: any) {
            console.warn('⚠️ [ENHANCED-DATA] Erro ao buscar detalhes:', e.message);
            debugErrors.push({ context: 'Order Details', error: e.message });
          }
        }

        const topProducts = Object.values(productAgg)
          .sort((a: any, b: any) => b.revenue - a.revenue)
          .slice(0, 10);

        const daily = Object.entries(dailyMap)
          .map(([date, v]) => ({
            date,
            totalOrders: v.totalOrders,
            paidOrders: v.paidOrders,
            cancelledOrders: v.cancelledOrders,
            gmvPaid: v.gmvPaid,
            ticket: v.paidOrders > 0 ? v.gmvPaid / v.paidOrders : 0,
          }))
          .sort((a, b) => (a.date < b.date ? -1 : 1));

        return {
          totalOrders: orderList.length,
          paidOrders,
          cancelledOrders,
          pendingOrders,
          gmvTotal,
          gmvPaid,
          topProducts,
          daily
        };
      } catch (e: any) {
        console.error('❌ [ENHANCED-DATA] Falha crítica ao buscar pedidos:', e.message);
        debugErrors.push({ context: 'Orders List', error: e.message });
        return {
          totalOrders: 0,
          paidOrders: 0,
          cancelledOrders: 0,
          pendingOrders: 0,
          gmvTotal: 0,
          gmvPaid: 0,
          topProducts: [],
          daily: []
        };
      }
    };

    // Buscar dados do período atual
    console.log('📊 [ENHANCED-DATA] Buscando período atual...');
    const currentData = await fetchPeriodOrders(timeFrom, timeTo);

    // Buscar dados do período anterior
    console.log('📊 [ENHANCED-DATA] Buscando período anterior...');
    const previousData = await fetchPeriodOrders(previousTimeFrom, previousTimeTo);

    // Calcular variações
    const calculateVariation = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    // Calcular ticket médio
    const currentTicketMedio = currentData.paidOrders > 0 ? currentData.gmvPaid / currentData.paidOrders : 0;
    const previousTicketMedio = previousData.paidOrders > 0 ? previousData.gmvPaid / previousData.paidOrders : 0;

    // Buscar informações da loja
    const shopInfo = await shopeeFetch<any>({
      path: '/api/v2/shop/get_shop_info',
      access_token,
      shop_id: String(shop_id ?? ''),
    });

    const result = {
      success: true,
      clientId,
      shopId: shop_id,
      data: {
        shopName: shopInfo?.shop_name || 'N/A',
        
        // Dados atuais
        totalOrdersLast15Days: currentData.totalOrders,
        totalPaidOrdersLast15Days: currentData.paidOrders,
        totalCancelledOrdersLast15Days: currentData.cancelledOrders,
        totalPendingOrdersLast15Days: currentData.pendingOrders,
        
        gmvLast15Days: currentData.gmvTotal,
        gmvPaidLast15Days: currentData.gmvPaid,
        ticketMedioLast15Days: currentTicketMedio,
        // Série diária de pedidos/GMV pago
        daily: currentData.daily,
        
        // Comparativos
        comparisons: {
          totalOrders: {
            current: currentData.totalOrders,
            previous: previousData.totalOrders,
            variation: calculateVariation(currentData.totalOrders, previousData.totalOrders)
          },
          paidOrders: {
            current: currentData.paidOrders,
            previous: previousData.paidOrders,
            variation: calculateVariation(currentData.paidOrders, previousData.paidOrders)
          },
          gmvTotal: {
            current: currentData.gmvTotal,
            previous: previousData.gmvTotal,
            variation: calculateVariation(currentData.gmvTotal, previousData.gmvTotal)
          },
          gmvPaid: {
            current: currentData.gmvPaid,
            previous: previousData.gmvPaid,
            variation: calculateVariation(currentData.gmvPaid, previousData.gmvPaid)
          },
          ticketMedio: {
            current: currentTicketMedio,
            previous: previousTicketMedio,
            variation: calculateVariation(currentTicketMedio, previousTicketMedio)
          }
        },

        topProductsLast15Days: currentData.topProducts,
        
        period: {
          from: new Date(timeFrom * 1000).toISOString(),
          to: new Date(timeTo * 1000).toISOString()
        },
        
        previousPeriod: {
          from: new Date(previousTimeFrom * 1000).toISOString(),
          to: new Date(previousTimeTo * 1000).toISOString()
        },

        // Métricas (orgânico indisponível na Open Platform)
        visitors: 0,
        pageViews: 0,
        conversionRate: 0,
        // ADS (via AMS)
        ads: await (async () => {
          const shopPerf = await fetchAdsPerformance(timeFrom, timeTo);
          const balance = await fetchAdsBalance();
          return {
            spend: shopPerf.spend,
            roas: shopPerf.roas,
            impressions: shopPerf.impressions,
            clicks: shopPerf.clicks,
            ctr: shopPerf.ctr,
            balance,
            cpa: currentData.paidOrders > 0 && shopPerf.spend > 0 ? shopPerf.spend / currentData.paidOrders : 0,
            attributedSales: shopPerf.attributedSales,
            topProducts: await fetchAdsTopProducts(timeFrom, timeTo),
            daily: shopPerf.daily,
          };
        })()
      }
    };

    console.log('✅ [ENHANCED-DATA] Dados processados com sucesso:', {
      currentOrders: currentData.totalOrders,
      currentPaid: currentData.paidOrders,
      previousOrders: previousData.totalOrders,
      previousPaid: previousData.paidOrders
    });

    return NextResponse.json(result);

  } catch (err: any) {
    console.error('❌ [ENHANCED-DATA] Erro:', err);
    return NextResponse.json({ 
      success: false,
      error: err.message || 'Erro interno',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}
