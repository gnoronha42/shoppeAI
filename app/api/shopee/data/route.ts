import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { shopeeFetch, refreshAccessToken } from '@/lib/shopee';

// Helper para refrescar o token se estiver expirando ou já expirado
async function getValidAccessToken(integration: any) {
  const now = new Date();
  const expiry = new Date(integration.token_expiry);
  // Buffer de 1 hora (3600 segundos) para evitar refreshes desnecessários
  const bufferSeconds = 3600; // 1 hora em vez de 1 minuto
  const expiryValid = !isNaN(expiry.getTime());
  
  console.log(`🔍 Verificando token para shop ${integration.shop_id}:`, {
    token_expiry: integration.token_expiry,
    expires_in_hours: expiryValid ? Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60)) : 'N/A',
    expires_in_days: expiryValid ? Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 'N/A',
    buffer_hours: bufferSeconds / 3600,
    should_refresh_calculation: expiryValid ? (expiry.getTime() <= now.getTime() + bufferSeconds * 1000) : false
  });
  
  // Tenta refresh se:
  // 1. Há refresh_token
  // 2. Token está perto de expirar OU já expirou
  const shouldRefresh =
    Boolean(integration.refresh_token) &&
    expiryValid &&
    (expiry.getTime() <= now.getTime() + bufferSeconds * 1000); // <= para incluir tokens já expirados

  if (shouldRefresh) {
    try {
      console.log(`🔄 Token para shop ${integration.shop_id} está expirado/expirando, atualizando...`);
      const refreshed = await refreshAccessToken({ refresh_token: integration.refresh_token });
      
      // Log do expire_in recebido da Shopee
      console.log(`📅 Novo token recebido:`, {
        expire_in_seconds: refreshed.expire_in,
        expire_in_hours: refreshed.expire_in ? Math.round(refreshed.expire_in / 3600) : 'N/A',
        expire_in_days: refreshed.expire_in ? Math.round(refreshed.expire_in / (3600 * 24)) : 'N/A'
      });
      
      const newExpiry = new Date(Date.now() + (refreshed.expire_in ?? 0) * 1000);
      
      // Atualiza o token no banco de dados
      const updatedIntegration = await prisma.client_integrations.update({
        where: { id: integration.id },
        data: {
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token ?? integration.refresh_token,
          token_expiry: newExpiry,
        },
      });
      console.log(`✅ Token para shop ${integration.shop_id} atualizado com sucesso. Nova expiração: ${newExpiry.toISOString()}`);
      return updatedIntegration;
    } catch (e: any) {
      console.error('❌ Falha ao refrescar token Shopee:', e?.message || e);
      throw Object.assign(new Error('Falha ao atualizar token'), { code: 'RECONNECT_REQUIRED' });
    }
  }
  
  // Se não precisa refresh, verifica se o token ainda é válido
  if (!integration.access_token) {
    throw Object.assign(new Error('Access token ausente'), { code: 'RECONNECT_REQUIRED' });
  }
  
  console.log(`✅ Token para shop ${integration.shop_id} ainda válido por ${expiryValid ? Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60)) : 'N/A'} horas`);
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

    // Processar datas personalizadas se fornecidas
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
          
          console.log('📅 Usando período personalizado:', {
            from: dateFrom.toISOString(),
            to: dateTo.toISOString(),
            days: customPeriodDays
          });
        }
      } catch (e) {
        console.warn('⚠️ Erro ao processar datas personalizadas, usando padrão:', e);
      }
    }

    let integration = await prisma.client_integrations.findUnique({
      where: { client_id_provider: { client_id: clientId, provider: 'shopee' } },
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integração Shopee não encontrada para este cliente' }, { status: 404 });
    }

    console.log(`DEBUG: Integração encontrada para ${clientId}:`, {
      shop_id: integration.shop_id,
      has_access_token: !!integration.access_token,
      has_refresh_token: !!integration.refresh_token,
      token_expiry: integration.token_expiry,
      access_token_length: integration.access_token?.length || 0,
      access_token_preview: integration.access_token?.slice(0, 8) + '...' + integration.access_token?.slice(-4),
      token_expires_in_hours: integration.token_expiry ? Math.round((new Date(integration.token_expiry).getTime() - Date.now()) / (1000 * 60 * 60)) : 'N/A'
    });

    // Garante que o token de acesso é válido antes de usar (refresh apenas se perto de expirar)
    integration = await getValidAccessToken(integration);

    const { access_token, shop_id, refresh_token } = integration as any;
    if (!access_token) {
      return NextResponse.json(
        { error: 'access_token ausente', reconnect_required: true },
        { status: 401 }
      );
    }

    // Helper para refresh forçado em caso de 403 invalid_access_token
    const integrationId = (integration as any).id as string;
    const forceRefreshTokens = async () => {
      if (!refresh_token) {
        console.log('⚠️ Não é possível fazer refresh forçado: refresh_token ausente');
        return null;
      }
      try {
        console.log('🔄 Executando refresh forçado do token...');
        const refreshed = await refreshAccessToken({ refresh_token });
        
        console.log(`📅 Refresh forçado - novo token recebido:`, {
          expire_in_seconds: refreshed.expire_in,
          expire_in_hours: refreshed.expire_in ? Math.round(refreshed.expire_in / 3600) : 'N/A',
          expire_in_days: refreshed.expire_in ? Math.round(refreshed.expire_in / (3600 * 24)) : 'N/A'
        });
        
        const newExpiry = new Date(Date.now() + (refreshed.expire_in ?? 0) * 1000);
        const updated = await prisma.client_integrations.update({
          where: { id: integrationId },
          data: {
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token ?? refresh_token,
            token_expiry: newExpiry,
            updated_at: new Date(),
          },
        });
        console.log(`✅ Refresh forçado concluído. Nova expiração: ${newExpiry.toISOString()}`);
        return updated;
      } catch (e) {
        console.error('❌ Refresh forçado falhou:', (e as any)?.message || e);
        return null;
      }
    };

    // 1. Buscar dados da loja (exemplo: nome da loja)
    let shopInfo: any;
    let productInfo: any = { response: { item: [], total_count: 0 } };
    try {
      console.log('🏪 Buscando informações da loja...', {
        shop_id,
        access_token_preview: access_token.slice(0, 8) + '...' + access_token.slice(-4),
        base_url: process.env.SHOPEE_BASE_URL
      });
      
      shopInfo = await shopeeFetch<any>({
        path: '/api/v2/shop/get_shop_info',
        access_token,
        shop_id: shop_id,
      });
      
      console.log('✅ Informações da loja obtidas:', {
        shop_name: shopInfo?.shop_name,
        status: shopInfo?.status
      });
      
      // Buscar produtos da loja
      console.log('🛍️ Buscando produtos da loja...');
      try {
        productInfo = await shopeeFetch<any>({
          path: '/api/v2/product/get_item_list',
          access_token,
          shop_id: shop_id,
          query: {
            offset: 0,
            page_size: 50,
            item_status: 'NORMAL', // Produtos ativos
          }
        });
        
        const productCount = productInfo?.response?.item?.length || 0;
        const totalProducts = productInfo?.response?.total_count || 0;
        
        console.log('✅ Produtos encontrados:', {
          products_in_page: productCount,
          total_products: totalProducts,
          has_more: productInfo?.response?.has_next_page || false
        });
        
        // Se encontrou produtos, buscar detalhes de alguns
        if (productCount > 0) {
          const itemIds = productInfo.response.item.slice(0, 5).map((item: any) => item.item_id);
          console.log('📦 Buscando detalhes dos primeiros produtos...', { item_ids: itemIds });
          
          try {
            const productDetails = await shopeeFetch<any>({
              path: '/api/v2/product/get_item_base_info',
              access_token,
              shop_id: shop_id,
              query: {
                item_id_list: itemIds.join(','),
                need_tax_info: false,
                need_complaint_policy: false
              }
            });
            
            const products = productDetails?.response?.item_list || [];
            console.log('✅ Detalhes dos produtos:', {
              products_with_details: products.length,
              sample_products: products.slice(0, 3).map((p: any) => ({
                name: p.item_name,
                status: p.item_status,
                stock: p.stock_info_v2?.summary_info?.total_available_stock || 0,
                price: p.price_info?.current_price || 0
              }))
            });
          } catch (detailError) {
            console.log('⚠️ Erro ao buscar detalhes dos produtos:', (detailError as any)?.message);
          }
        }
        
      } catch (productError) {
        console.log('⚠️ Erro ao buscar produtos:', (productError as any)?.message);
        productInfo = { response: { item: [], total_count: 0 } };
      }
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('403') && msg.toLowerCase().includes('invalid_access_token')) {
        // tenta refresh forçado uma vez
        const updated = await forceRefreshTokens();
        if (!updated) {
          return NextResponse.json(
            { error: 'access_token inválido', reconnect_required: true },
            { status: 401 }
          );
        }
        // tenta novamente com novo token
        shopInfo = await shopeeFetch<any>({
          path: '/api/v2/shop/get_shop_info',
          access_token: String(updated.access_token ?? (integration as any).access_token),
          shop_id: String(updated.shop_id ?? (integration as any).shop_id),
        });
        // atualiza reference de tokens locais
        (integration as any) = updated;
      } else {
        throw e;
      }
    }

    // 2. Buscar pedidos com múltiplos períodos e fallbacks
    const timeTo = customTimeTo || Math.floor(Date.now() / 1000);
    
    // Função para tentar diferentes períodos e campos de tempo
    const fetchOrdersWithFallback = async () => {
      // Se temos período personalizado, usar apenas ele
      const periods = customPeriodDays ? [customPeriodDays] : [30, 60, 90]; // dias
      const timeFields = ['create_time', 'update_time'];
      
      for (const days of periods) {
        const timeFrom = customTimeFrom || (timeTo - days * 24 * 60 * 60);
        
        for (const timeField of timeFields) {
          try {
            console.log(`🔍 Tentando ${timeField} para últimos ${days} dias...`);
            
            const response = await shopeeFetch<any>({
              path: '/api/v2/order/get_order_list',
              access_token: (integration as any).access_token,
              shop_id: (integration as any).shop_id,
              query: {
                time_range_field: timeField,
                time_from: timeFrom,
                time_to: timeTo,
                page_size: 100,
                // Sem filtro de status para capturar todos os pedidos
              },
            });
            
            const orderCount = response?.response?.order_list?.length || 0;
            console.log(`📊 ${timeField} (${days}d): ${orderCount} pedidos`);
            
            if (orderCount > 0) {
              return { ...response, period_days: days, time_field: timeField };
            }
          } catch (error) {
            console.log(`❌ Erro ${timeField} (${days}d):`, (error as any)?.message);
          }
        }
      }
      
      // Se não encontrou nada, retorna vazio
      return { response: { order_list: [] }, period_days: 30, time_field: 'create_time' };
    };
    
    const fetchOrderList = fetchOrdersWithFallback;
    let orderListResponse: any;
    try {
      orderListResponse = await fetchOrderList();
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('403') && msg.toLowerCase().includes('invalid_access_token')) {
        const updated = await forceRefreshTokens();
        if (!updated) {
          return NextResponse.json(
            { error: 'access_token inválido', reconnect_required: true },
            { status: 401 }
          );
        }
        // Tenta novamente com token atualizado - atualiza integration
        (integration as any) = updated;
        orderListResponse = await fetchOrdersWithFallback();
        (integration as any) = updated;
      } else {
        throw e;
      }
    }
    // A função fetchOrdersWithFallback já testou múltiplos períodos e campos
    const orderList = orderListResponse?.response?.order_list || [];
    console.log(`📊 Total de pedidos encontrados: ${orderList.length}`);

    // Extrai lista de order_sn
    // (orderList pode ter sido ajustada pelo fallback acima)
    // Nota: se ainda vazio, manterá zeros agregados coerentes
    // mas com maior chance de popular quando houver pedidos recentes
    const orderSnList: string[] = orderList
      .map((o: any) => o?.order_sn)
      .filter((v: any) => typeof v === 'string' && v.length > 0);

    // Buscar detalhes dos pedidos para calcular GMV e Ticket Médio
    let gmv = 0;
    let totalOrders = orderSnList.length;
    const productAgg: Record<string, { name: string; units: number; revenue: number }> = {};

    if (orderSnList.length > 0) {
      // Shopee aceita lista separada por vírgula
      const snChunk = orderSnList.slice(0, 50); // limite de segurança por chamada
      const detailResp = await shopeeFetch<any>({
        path: '/api/v2/order/get_order_detail',
        access_token,
        shop_id: shop_id,
        query: {
          order_sn_list: snChunk.join(','),
          // solicitar itens e valores de pedido quando possível
          response_optional_fields: 'item_list,order_amount,buyer_total_amount'
        }
      });

      const details = detailResp?.response?.order_list || detailResp?.response?.orders || [];
      for (const order of details) {
        // Tenta vários campos possíveis de total
        const orderAmountObj = order?.order_amount || {};
        const orderTotalFromObj =
          Number(orderAmountObj?.total_amount) ||
          Number(orderAmountObj?.subtotal) ||
          Number(orderAmountObj?.actual_price) ||
          0;
        const orderTotal =
          orderTotalFromObj ||
          Number(order?.total_amount) ||
          Number(order?.order_total) ||
          Number(
            typeof order?.buyer_total_amount === 'object'
              ? order?.buyer_total_amount?.value
              : order?.buyer_total_amount
          ) ||
          0;

        // Agregar itens por produto
        const items = order?.item_list || order?.items || [];
        let revenueFromItems = 0;
        for (const it of items) {
          const name = it?.item_name || it?.name || 'Produto';
          const quantity =
            Number(it?.model_quantity_purchased) ||
            Number(it?.quantity_purchased) ||
            Number(it?.quantity) ||
            0;
          const unitPrice =
            Number(it?.model_original_price) ||
            Number(it?.item_price) ||
            Number(it?.price) ||
            0;
          const revenue = unitPrice * quantity;
          revenueFromItems += Number.isFinite(revenue) ? revenue : 0;
          const key = name;
          if (!productAgg[key]) {
            productAgg[key] = { name, units: 0, revenue: 0 };
          }
          productAgg[key].units += Number.isFinite(quantity) ? quantity : 0;
          productAgg[key].revenue += Number.isFinite(revenue) ? revenue : 0;
        }

        // Soma GMV com prioridade para total do pedido, senão fallback para soma dos itens
        if (Number.isFinite(orderTotal) && orderTotal > 0) {
          gmv += orderTotal;
        } else if (revenueFromItems > 0) {
          gmv += revenueFromItems;
        }
      }
    }

    const ticketMedio = totalOrders > 0 ? gmv / totalOrders : 0;
    const topProducts = Object.values(productAgg)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const periodDays = customPeriodDays || (orderListResponse as any)?.period_days || 30;
    const timeField = (orderListResponse as any)?.time_field || 'create_time';
    const actualTimeFrom = customTimeFrom || (timeTo - periodDays * 24 * 60 * 60);
    
    const aggregatedData = {
        shopName: shopInfo?.shop_name || 'N/A',
        totalOrdersLast30Days: totalOrders,
        gmvLast30Days: gmv,
        ticketMedioLast30Days: ticketMedio,
        topProductsLast30Days: topProducts,
        period: {
          from: new Date(actualTimeFrom * 1000).toISOString(),
          to: new Date(timeTo * 1000).toISOString(),
        },
        // Informações de produtos
        totalProducts: (productInfo as any)?.response?.total_count || 0,
        activeProducts: (productInfo as any)?.response?.item?.length || 0,
        debug: {
          periodDays,
          timeField,
          totalOrdersFound: orderSnList.length,
          orderSnSample: orderSnList.slice(0, 3),
        }
    };

    return NextResponse.json({
      success: true,
      clientId,
      shopId: shop_id,
      data: aggregatedData,
    });

  } catch (err: any) {
    console.error('Erro ao buscar dados da Shopee:', err);
    if (err?.code === 'RECONNECT_REQUIRED') {
      return NextResponse.json(
        { error: 'Reautenticação necessária', reconnect_required: true },
        { status: 401 }
      );
    }
    return NextResponse.json({ error: err.message || 'Erro interno ao buscar dados da Shopee' }, { status: 500 });
  }
}
