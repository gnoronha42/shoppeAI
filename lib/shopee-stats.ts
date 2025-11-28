import prisma from '@/lib/prisma';
import { shopeeFetch, refreshAccessToken } from '@/lib/shopee';

// Helper para refrescar o token se estiver expirando ou já expirado
export async function getValidAccessToken(integration: any) {
  const now = new Date();
  const expiry = new Date(integration.token_expiry);
  // Buffer de 1 hora (3600 segundos) para evitar refreshes desnecessários
  const bufferSeconds = 3600; 
  const expiryValid = !isNaN(expiry.getTime());
  
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
      console.log(`✅ Token para shop ${integration.shop_id} atualizado com sucesso.`);
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
  
  return integration;
}

export async function forceRefreshTokens(integration: any) {
  if (!integration.refresh_token) {
    return null;
  }
  try {
    const refreshed = await refreshAccessToken({ refresh_token: integration.refresh_token });
    
    const newExpiry = new Date(Date.now() + (refreshed.expire_in ?? 0) * 1000);
    const updated = await prisma.client_integrations.update({
      where: { id: integration.id },
      data: {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token ?? integration.refresh_token,
        token_expiry: newExpiry,
        updated_at: new Date(),
      },
    });
    return updated;
  } catch (e) {
    console.error('❌ Refresh forçado falhou:', (e as any)?.message || e);
    return null;
  }
}

export async function getShopStats(integration: any, dateFrom?: Date, dateTo?: Date) {
    // Garante token válido
    integration = await getValidAccessToken(integration);
    let { access_token, shop_id } = integration;

    const now = Math.floor(Date.now() / 1000);
    const customTimeTo = dateTo ? Math.floor(dateTo.getTime() / 1000) : now;
    const customTimeFrom = dateFrom ? Math.floor(dateFrom.getTime() / 1000) : null;
    const customPeriodDays = customTimeFrom ? Math.ceil((customTimeTo - customTimeFrom) / (24 * 60 * 60)) : null;

    // 1. Shop Info
    let shopInfo: any = {};
    try {
        shopInfo = await shopeeFetch<any>({
            path: '/api/v2/shop/get_shop_info',
            access_token,
            shop_id,
        });
    } catch (e: any) {
        // Retry logic for invalid token
         if (e?.message?.includes('invalid_access_token')) {
            const updated = await forceRefreshTokens(integration);
            if (updated) {
                access_token = updated.access_token;
                shopInfo = await shopeeFetch<any>({
                    path: '/api/v2/shop/get_shop_info',
                    access_token,
                    shop_id,
                });
            }
         }
    }

    // 2. Products
    let productCount = 0;
    try {
        const productResp = await shopeeFetch<any>({
            path: '/api/v2/product/get_item_list',
            access_token,
            shop_id,
            query: { offset: 0, page_size: 1, item_status: 'NORMAL' }
        });
        productCount = productResp?.response?.total_count || 0;
    } catch (e) {
        console.warn('Erro ao buscar produtos:', e);
    }

    // 3. Orders
    const periods = customPeriodDays ? [customPeriodDays] : [30];
    const timeFields = ['create_time', 'update_time'];
    let orderList: any[] = [];
    
    for (const days of periods) {
        const timeFrom = customTimeFrom || (customTimeTo - days * 24 * 60 * 60);
        for (const timeField of timeFields) {
            try {
                const resp = await shopeeFetch<any>({
                    path: '/api/v2/order/get_order_list',
                    access_token,
                    shop_id,
                    query: {
                        time_range_field: timeField,
                        time_from: timeFrom,
                        time_to: customTimeTo,
                        page_size: 100
                    }
                });
                const orders = resp?.response?.order_list || [];
                if (orders.length > 0) {
                    orderList = orders;
                    break;
                }
            } catch (e) {}
        }
        if (orderList.length > 0) break;
    }

    // 4. Calculate GMV
    let gmv = 0;
    const orderSnList = orderList.map((o: any) => o.order_sn);
    if (orderSnList.length > 0) {
        try {
             // Chunking 50
            const chunks = [];
            for (let i = 0; i < orderSnList.length; i += 50) {
                chunks.push(orderSnList.slice(i, i + 50));
            }

            for (const chunk of chunks) {
                const detailResp = await shopeeFetch<any>({
                    path: '/api/v2/order/get_order_detail',
                    access_token,
                    shop_id,
                    query: {
                        order_sn_list: chunk.join(','),
                        response_optional_fields: 'total_amount'
                    }
                });
                const details = detailResp?.response?.order_list || [];
                for (const order of details) {
                    gmv += Number(order.total_amount) || 0;
                }
            }
        } catch (e) {
            console.warn('Erro ao buscar detalhes dos pedidos:', e);
        }
    }

    return {
        shopName: shopInfo?.shop_name || 'Loja',
        gmv,
        orders: orderList.length,
        ticket: orderList.length > 0 ? gmv / orderList.length : 0,
        products: productCount
    };
}

