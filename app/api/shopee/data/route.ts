import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { shopeeFetch, refreshAccessToken } from '@/lib/shopee';

export const dynamic = 'force-dynamic';

/**
 * 🔄 HELPER ROBUSTO PARA GERENCIAR TOKENS SHOPEE
 * 
 * Problemas corrigidos:
 * 1. ✅ Sempre atualiza refresh_token quando recebido (Shopee retorna novo a cada refresh)
 * 2. ✅ Buffer reduzido para 30 minutos (evita refreshes desnecessários)
 * 3. ✅ Tratamento específico para refresh_token expirado
 * 4. ✅ Logs detalhados para debug
 */
async function getValidAccessToken(integration: any) {
  const now = new Date();
  const expiry = integration.token_expiry ? new Date(integration.token_expiry) : null;
  const expiryValid = !!expiry && !isNaN(expiry.getTime());
  
  // ✅ Buffer reduzido: 30 minutos (1800s) em vez de 1 hora
  // Access tokens Shopee geralmente expiram em 4 horas, então renovar 30min antes é suficiente
  const bufferSeconds = 1800; // 30 minutos
  
  const remainingSeconds = expiryValid && expiry ? Math.floor((expiry.getTime() - now.getTime()) / 1000) : 0;
  const remainingHours = remainingSeconds > 0 ? Math.round(remainingSeconds / 3600) : 0;
  
  console.log(`🔍 [getValidAccessToken] Verificando token para shop ${integration.shop_id}:`, {
    token_expiry: integration.token_expiry,
    remaining_seconds: remainingSeconds,
    remaining_hours: remainingHours,
    buffer_seconds: bufferSeconds,
    should_refresh: expiryValid && remainingSeconds <= bufferSeconds,
    has_refresh_token: !!integration.refresh_token
  });
  
  // Tenta refresh se:
  // 1. Há refresh_token
  // 2. Token está perto de expirar OU já expirou (dentro do buffer)
  const shouldRefresh =
    Boolean(integration.refresh_token) &&
    expiryValid &&
    (remainingSeconds <= bufferSeconds);

  if (shouldRefresh) {
    try {
      console.log(`🔄 [getValidAccessToken] Token expirado/expirando, renovando...`);
      
      const refreshed = await refreshAccessToken({ refresh_token: integration.refresh_token });
      
      console.log(`📅 [getValidAccessToken] Novo token recebido:`, {
        expire_in_seconds: refreshed.expire_in,
        expire_in_hours: refreshed.expire_in ? Math.round(refreshed.expire_in / 3600) : 'N/A',
        expire_in_days: refreshed.expire_in ? Math.round(refreshed.expire_in / (3600 * 24)) : 'N/A',
        has_new_refresh_token: !!refreshed.refresh_token,
        refresh_token_changed: refreshed.refresh_token !== integration.refresh_token
      });
      
      const newExpiry = new Date(Date.now() + (refreshed.expire_in ?? 0) * 1000);
      
      // ✅ CRÍTICO: Sempre salva o novo refresh_token (Shopee retorna novo a cada refresh)
      // Se não atualizarmos, o refresh_token antigo pode expirar e perderemos a conexão
      const updatedIntegration = await prisma.client_integrations.update({
        where: { id: integration.id },
        data: {
          access_token: refreshed.access_token,
          // ✅ SEMPRE usa o novo refresh_token (nunca mantém o antigo)
          refresh_token: refreshed.refresh_token, // Removido o fallback ?? integration.refresh_token
          token_expiry: newExpiry,
          updated_at: new Date(),
        },
      });
      
      console.log(`✅ [getValidAccessToken] Token atualizado com sucesso. Nova expiração: ${newExpiry.toISOString()}`);
      return updatedIntegration;
      
    } catch (e: any) {
      console.error('❌ [getValidAccessToken] Falha ao refrescar token:', {
        error: e?.message || e,
        code: e?.code,
        status: e?.status
      });
      
      // ✅ Detecta se o refresh_token expirou (após ~30 dias)
      if (e?.code === 'REFRESH_TOKEN_EXPIRED' || e?.message?.includes('expired') || e?.message?.includes('invalid')) {
        console.error('🚨 [getValidAccessToken] Refresh token expirado - reautenticação necessária');
        throw Object.assign(new Error('Refresh token expirado - reautenticação necessária'), { 
          code: 'REFRESH_TOKEN_EXPIRED' 
        });
      }
      
      throw Object.assign(new Error('Falha ao atualizar token'), { code: 'RECONNECT_REQUIRED' });
    }
  }
  
  // Se não precisa refresh, verifica se o token ainda é válido
  if (!integration.access_token) {
    // Se não tem access_token mas tem refresh_token, tenta usar o refresh_token
    if (integration.refresh_token) {
      console.log(`🔄 [getValidAccessToken] Access token ausente, tentando renovar com refresh_token...`);
      try {
        const refreshed = await refreshAccessToken({ refresh_token: integration.refresh_token });
        const newExpiry = new Date(Date.now() + (refreshed.expire_in ?? 0) * 1000);
        const updated = await prisma.client_integrations.update({
          where: { id: integration.id },
          data: {
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token, // ✅ Sempre atualiza
            token_expiry: newExpiry,
            updated_at: new Date(),
          },
        });
        return updated;
      } catch (e: any) {
        throw Object.assign(new Error('Falha ao obter access token via refresh'), { code: 'RECONNECT_REQUIRED' });
      }
    }
    throw Object.assign(new Error('Access token ausente'), { code: 'RECONNECT_REQUIRED' });
  }
  
  console.log(`✅ [getValidAccessToken] Token válido por mais ${remainingHours} horas`);
  return integration;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const dateFromParam = searchParams.get('date_from');
    const dateToParam = searchParams.get('date_to');

    if (!clientId) {
      return NextResponse.json({ error: 'client_id é obrigatório' }, { status: 400 });
    }

    // Processar datas personalizadas
    let customTimeTo: number | null = null;
    let customTimeFrom: number | null = null;
    let customPeriodDays: number | null = null;

    if (dateFromParam && dateToParam) {
      try {
        const dateFrom = new Date(dateFromParam);
        const dateTo = new Date(dateToParam);
        
        if (!isNaN(dateFrom.getTime()) && !isNaN(dateTo.getTime())) {
          customTimeFrom = Math.floor(dateFrom.getTime() / 1000);
          customTimeTo = Math.floor(dateTo.getTime() / 1000);
          customPeriodDays = Math.ceil((customTimeTo - customTimeFrom) / (24 * 60 * 60));
        }
      } catch (e) {
        console.warn('⚠️ Erro ao processar datas personalizadas:', e);
      }
    }

    let integration = await prisma.client_integrations.findUnique({
      where: { client_id_provider: { client_id: clientId, provider: 'shopee' } },
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integração Shopee não encontrada para este cliente' }, { status: 404 });
    }

    // ✅ Garante token válido ANTES de qualquer chamada à API
    try {
    integration = await getValidAccessToken(integration);
    } catch (e: any) {
      if (e?.code === 'REFRESH_TOKEN_EXPIRED') {
        return NextResponse.json({ 
          error: 'Refresh token expirado - reautenticação necessária', 
          reconnect_required: true,
          reason: 'refresh_token_expired'
        }, { status: 401 });
      }
      return NextResponse.json({ 
        error: 'Falha ao validar token', 
        reconnect_required: true 
      }, { status: 401 });
    }

    const { access_token, shop_id, refresh_token } = integration as any;
    const integrationId = (integration as any).id;

    // Helper para refresh forçado em caso de 403 invalid_access_token
    const forceRefreshTokens = async () => {
      if (!refresh_token) {
         console.log('⚠️ [forceRefreshTokens] Não é possível fazer refresh: refresh_token ausente');
        return null;
      }
      try {
         console.log('🔄 [forceRefreshTokens] Executando refresh forçado...');
        const refreshed = await refreshAccessToken({ refresh_token });
        const newExpiry = new Date(Date.now() + (refreshed.expire_in ?? 0) * 1000);
        const updated = await prisma.client_integrations.update({
          where: { id: integrationId },
          data: {
            access_token: refreshed.access_token,
             refresh_token: refreshed.refresh_token, // ✅ Sempre atualiza
            token_expiry: newExpiry,
            updated_at: new Date(),
          },
        });
         console.log(`✅ [forceRefreshTokens] Refresh forçado concluído. Nova expiração: ${newExpiry.toISOString()}`);
        return updated;
       } catch (e: any) {
         console.error('❌ [forceRefreshTokens] Falha:', e?.message || e);
         if (e?.code === 'REFRESH_TOKEN_EXPIRED') {
           throw Object.assign(new Error('Refresh token expirado'), { code: 'REFRESH_TOKEN_EXPIRED' });
         }
        return null;
      }
    };

    // 1. Shop Info e Produtos
    let shopInfo: any = {};
    let productInfo: any = { response: { item: [], total_count: 0 } };
    
    try {
      shopInfo = await shopeeFetch<any>({
        path: '/api/v2/shop/get_shop_info',
        access_token,
        shop_id,
      });
      
      // ✅ CORREÇÃO: A API retorna dados diretamente, não em response.campo
      if (shopInfo && !shopInfo.response && shopInfo.shop_name) {
        shopInfo = { response: shopInfo };
      }

      // ✅ CORREÇÃO: Testar endpoint correto de produtos
      try {
        productInfo = await shopeeFetch<any>({
          path: '/api/v2/product/get_item_list',
          access_token,
          shop_id,
          query: { offset: 0, page_size: 50, item_status: 'NORMAL' }
        });
      } catch (productError: any) {
        console.warn('⚠️ Endpoint get_item_list falhou:', productError?.message);
        // Se falhar, definir resposta vazia
        productInfo = { response: { item: [], total_count: 0 } };
      }
    } catch (e: any) {
       if (e?.message?.includes('invalid_access_token') || e?.message?.includes('403')) {
          console.log('🔄 [GET] Token inválido detectado, tentando refresh forçado...');
        const updated = await forceRefreshTokens();
        if (!updated) {
            // ✅ FALLBACK GRACIOSO: Retornar dados vazios em vez de erro 401
            console.log('⚠️ [GET] Refresh falhou, retornando dados vazios para manter UX');
            return NextResponse.json({
              success: false,
              error: 'Token expirado - dados indisponíveis',
              code: 'TOKEN_EXPIRED',
              clientId: integration?.client_id || clientId,
              shopId: integration?.shop_id || 'N/A',
              data: {
                shopName: 'Reconexão Necessária',
                totalOrdersLast30Days: 0,
                gmvLast30Days: 0,
                ticketMedioLast30Days: 0,
                topProductsLast30Days: [],
                period: {
                  from: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
                  to: new Date().toISOString()
                },
                totalProducts: 0,
                activeProducts: 0,
                visitors: 0,
                pageViews: 0,
                conversionRate: 0,
                ads: {
                  spend: 0,
                  roas: 0,
                  impressions: 0,
                  clicks: 0,
                  ctr: 0,
                  cpa: 0
                },
                debug: {
                  periodDays: 15,
                  totalOrdersFound: 0,
                  error: 'Token expirado - reconexão necessária'
                }
              },
              needs_reconnection: true,
              message: 'Dados indisponíveis devido a token expirado. Clique em "Reconectar" na página de integrações.'
            }, { status: 200 }); // ✅ 200 para não quebrar o frontend
        }
          // Retry com novo token
          integration = updated;
        shopInfo = await shopeeFetch<any>({
          path: '/api/v2/shop/get_shop_info',
            access_token: updated.access_token || '', 
            shop_id: updated.shop_id || shop_id 
        });
      } else {
        throw e;
      }
    }

    // 2. Pedidos e GMV - CORRIGIDO: Shopee limita consultas a 15 dias
    const timeTo = customTimeTo || Math.floor(Date.now() / 1000);
    const maxDays = 15; // ✅ Limite da Shopee
    const requestedDays = customPeriodDays || 15; // Reduzido de 30 para 15
    const periodDays = Math.min(requestedDays, maxDays);
    const timeFrom = customTimeFrom || (timeTo - periodDays * 24 * 60 * 60);
    
    if (requestedDays > maxDays) {
      console.warn(`⚠️ Período solicitado (${requestedDays} dias) reduzido para ${maxDays} dias (limite da Shopee)`);
    }
    
    // ✅ CORREÇÃO 1: Validar que time_from < time_to
    if (timeFrom >= timeTo) {
      console.error('❌ [GET /api/shopee/data] Erro: time_from >= time_to', {
              time_from: timeFrom,
              time_to: timeTo,
        time_from_date: new Date(timeFrom * 1000).toISOString(),
        time_to_date: new Date(timeTo * 1000).toISOString()
      });
      return NextResponse.json({ 
        error: 'Intervalo de datas inválido: data inicial deve ser menor que data final' 
      }, { status: 400 });
    }
    
    // ✅ CORREÇÃO 2: Função para dividir intervalo em blocos de 15 dias
    const createDateBlocks = (startTime: number, endTime: number, maxDays: number = 15): Array<{from: number, to: number, days: number}> => {
      const blocks: Array<{from: number, to: number, days: number}> = [];
      const maxSeconds = maxDays * 24 * 60 * 60;
      
      let currentStart = startTime;
      while (currentStart < endTime) {
        const currentEnd = Math.min(currentStart + maxSeconds, endTime);
        const blockDays = Math.ceil((currentEnd - currentStart) / (24 * 60 * 60));
        
        blocks.push({
          from: currentStart,
          to: currentEnd,
          days: blockDays
        });
        
        currentStart = currentEnd;
      }
      
      console.log(`📅 [createDateBlocks] Dividindo período em ${blocks.length} blocos:`, 
        blocks.map(b => ({
          from: new Date(b.from * 1000).toISOString(),
          to: new Date(b.to * 1000).toISOString(),
          days: b.days
        }))
      );
      
      return blocks;
    };
    
    // ✅ CORREÇÃO 3: Buscar pedidos em blocos sequenciais COM PAGINAÇÃO
    const fetchOrdersInBlocks = async (accessToken: string, shopId: string): Promise<any[]> => {
      const dateBlocks = createDateBlocks(timeFrom, timeTo, 15);
      const allOrders: any[] = [];
      const orderSnSet = new Set<string>(); // ✅ CORREÇÃO 5: Deduplicação
      const timeFields = ['create_time', 'update_time'];
      
      for (const block of dateBlocks) {
        console.log(`🔍 [fetchOrdersInBlocks] Buscando pedidos no bloco:`, {
          from: new Date(block.from * 1000).toISOString(),
          to: new Date(block.to * 1000).toISOString(),
          days: block.days
        });
        
        let blockOrders: any[] = [];
        
        for (const timeField of timeFields) {
          try {
            console.log(`📡 [fetchOrdersInBlocks] Tentando ${timeField} para bloco de ${block.days} dias...`);
            
            let cursor = "";
            let hasMore = true;
            let pageCount = 0;
            const fieldOrders: any[] = [];

            while (hasMore) {
              pageCount++;
              const queryParams: any = { 
                time_range_field: timeField, 
                time_from: block.from, 
                time_to: block.to, 
                page_size: 100
              };
              
              if (cursor) queryParams.cursor = cursor;

              const resp = await shopeeFetch<any>({
                path: '/api/v2/order/get_order_list',
                access_token: accessToken,
                shop_id: shopId,
                query: queryParams
              });
              
              const responseData = resp?.response;
              const pageOrders = responseData?.order_list || [];
              fieldOrders.push(...pageOrders);
              
              cursor = responseData?.next_cursor;
              hasMore = responseData?.more === true;

              console.log(`   📄 Página ${pageCount}: ${pageOrders.length} pedidos (More: ${hasMore})`);
              
              if (pageCount > 50) break; // Proteção contra loop infinito
            }
            
            console.log(`📊 [fetchOrdersInBlocks] ${timeField} (${block.days}d): ${fieldOrders.length} pedidos encontrados no total`);
            
            if (fieldOrders.length > 0) {
              blockOrders = fieldOrders;
              break; // Para no primeiro time_field que retornar dados
            }
    } catch (e: any) {
            console.error(`❌ [fetchOrdersInBlocks] Erro ${timeField} (${block.days}d):`, e?.message);
            // Retry simplificado se necessário
          }
        }
        
        // Deduplicação e Adição
        for (const order of blockOrders) {
          if (order.order_sn && !orderSnSet.has(order.order_sn)) {
            orderSnSet.add(order.order_sn);
            allOrders.push(order);
          }
        }
        
        console.log(`✅ [fetchOrdersInBlocks] Bloco processado: ${blockOrders.length} pedidos encontrados`);
      }
      return allOrders;
    };
    
    // Executar busca em blocos
    let orderList: any[] = [];
    try {
      orderList = await fetchOrdersInBlocks((integration as any).access_token, (integration as any).shop_id);
    } catch (e: any) {
      console.error('❌ [GET /api/shopee/data] Erro ao buscar pedidos em blocos:', e?.message);
      // Continua com lista vazia se falhar
    }

    let gmv = 0;
    let totalOrders = orderList.length;
    const productAgg: Record<string, any> = {};

    if (orderList.length > 0) {
        const snList = orderList.map((o: any) => o.order_sn);
        const chunks = [];
        for (let i = 0; i < snList.length; i += 50) chunks.push(snList.slice(i, i + 50));
        
        for (const chunk of chunks) {
            try {
      const detailResp = await shopeeFetch<any>({
        path: '/api/v2/order/get_order_detail',
                  access_token: (integration as any).access_token,
                  shop_id: (integration as any).shop_id,
                  query: { order_sn_list: chunk.join(','), response_optional_fields: 'item_list,total_amount' }
      });
              const details = detailResp?.response?.order_list || [];
      for (const order of details) {
                  gmv += Number(order.total_amount) || 0;
                  
                  // Agregar produtos
                  for(const item of (order.item_list || [])) {
                      const name = item.item_name;
                      if(!productAgg[name]) productAgg[name] = { name, units: 0, revenue: 0 };
                      productAgg[name].units += item.model_quantity_purchased || 0;
                      productAgg[name].revenue += (item.model_discounted_price || item.model_original_price) * (item.model_quantity_purchased || 0);
                  }
              }
            } catch (e: any) {
              if (e?.message?.includes('invalid_access_token') || e?.message?.includes('403')) {
                const updated = await forceRefreshTokens();
                if (updated) integration = updated;
              }
            }
        }
        }

    // 3. Performance (Insights) - Visitantes e Conversão
    let visitors = 0;
    let conversionRate = 0;
    let pageViews = 0;
    
    // ✅ CORREÇÃO: APIs de analytics não existem na Shopee V2
    console.log('ℹ️ [Analytics] APIs de visitantes/conversão não disponíveis na Shopee Open Platform V2');
    
    // Retornar 0 para todas as métricas de tráfego (dados não disponíveis)
    visitors = 0;
    conversionRate = 0;
    pageViews = 0;
    
    // 4. Ads Performance
    let adsSpend = 0;
    let adsRoas = 0;
    let adsImpressions = 0;
    let adsClicks = 0;
    let adsCtr = 0;
    
    // ✅ CORREÇÃO: API de ads não existe na Shopee Open Platform V2
    console.log('ℹ️ [Ads] API de publicidade não disponível na Shopee Open Platform V2');
    
    // Retornar 0 para todas as métricas de ads (dados não disponíveis)
    adsSpend = 0;
    adsRoas = 0;
    adsImpressions = 0;
    adsClicks = 0;
    adsCtr = 0;

    const ticketMedio = totalOrders > 0 ? gmv / totalOrders : 0;
    const topProducts = Object.values(productAgg).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5);

    const aggregatedData = {
        shopName: shopInfo?.shop_name || 'N/A',
        totalOrdersLast30Days: totalOrders,
        gmvLast30Days: gmv,
        ticketMedioLast30Days: ticketMedio,
        topProductsLast30Days: topProducts,
        period: {
          from: new Date(timeFrom * 1000).toISOString(),
          to: new Date(timeTo * 1000).toISOString(),
        },
        totalProducts: (productInfo as any)?.response?.total_count || 0,
        activeProducts: (productInfo as any)?.response?.item?.length || 0,
        
        // Novos campos para o relatório completo
        visitors: visitors,
        pageViews: pageViews,
        conversionRate: conversionRate, // em %
        ads: {
            spend: adsSpend,
            roas: adsRoas,
            impressions: adsImpressions,
            clicks: adsClicks,
            ctr: adsCtr,
            cpa: totalOrders > 0 && adsSpend > 0 ? adsSpend / totalOrders : 0
        },
        
        debug: {
          periodDays,
          totalOrdersFound: totalOrders
        }
    };

    return NextResponse.json({
      success: true,
      clientId,
      shopId: shop_id,
      data: aggregatedData,
    });

  } catch (err: any) {
    console.error('❌ [GET /api/shopee/data] Erro:', err);
    if (err?.code === 'REFRESH_TOKEN_EXPIRED') {
      return NextResponse.json({ 
        error: 'Refresh token expirado - reautenticação necessária', 
        reconnect_required: true,
        reason: 'refresh_token_expired'
      }, { status: 401 });
    }
    if (err?.code === 'RECONNECT_REQUIRED') {
      return NextResponse.json({ 
        error: 'Reautenticação necessária', 
        reconnect_required: true 
      }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
