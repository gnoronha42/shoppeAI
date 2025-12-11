import prisma from '@/lib/prisma';
import { shopeeFetch, refreshAccessToken } from '@/lib/shopee';

export async function getValidAccessToken(integration: any) {
  const now = new Date();
  const expiry = integration.token_expiry ? new Date(integration.token_expiry) : null;
  const expiryValid = !!expiry && !isNaN(expiry.getTime());
  
  const bufferSeconds = 1800;
  const remainingSeconds = expiryValid && expiry ? Math.floor((expiry.getTime() - now.getTime()) / 1000) : 0;
  
  const shouldRefresh =
    Boolean(integration.refresh_token) &&
    expiryValid &&
    (remainingSeconds <= bufferSeconds);

  if (shouldRefresh) {
    try {
      console.log(` [shopee-stats] Token expirado/expirando, renovando...`);
      const refreshed = await refreshAccessToken({ refresh_token: integration.refresh_token });
      
      const newExpiry = new Date(Date.now() + (refreshed.expire_in ?? 0) * 1000);
      
      
      const updatedIntegration = await prisma.client_integrations.update({
        where: { id: integration.id },
        data: {
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token, 
          token_expiry: newExpiry,
          updated_at: new Date(),
        },
      });
      console.log(` [shopee-stats] Token atualizado com sucesso.`);
      return updatedIntegration;
    } catch (e: any) {
      console.error(' [shopee-stats] Falha ao refrescar token:', e?.message || e);
      if (e?.code === 'REFRESH_TOKEN_EXPIRED') {
        throw Object.assign(new Error('Refresh token expirado'), { code: 'REFRESH_TOKEN_EXPIRED' });
      }
      throw Object.assign(new Error('Falha ao atualizar token'), { code: 'RECONNECT_REQUIRED' });
    }
  }
  
  
  if (!integration.access_token) {
    if (integration.refresh_token) {
      try {
        const refreshed = await refreshAccessToken({ refresh_token: integration.refresh_token });
        const newExpiry = new Date(Date.now() + (refreshed.expire_in ?? 0) * 1000);
        const updated = await prisma.client_integrations.update({
          where: { id: integration.id },
          data: {
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token, 
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
    console.error('Refresh forçado falhou:', (e as any)?.message || e);
    return null;
  }
}

export async function getShopStats(integration: any, dateFrom?: Date, dateTo?: Date) {
    
    integration = await getValidAccessToken(integration);
    let { access_token, shop_id } = integration;

    const now = Math.floor(Date.now() / 1000);
    const customTimeTo = dateTo ? Math.floor(dateTo.getTime() / 1000) : now;
    const customTimeFrom = dateFrom ? Math.floor(dateFrom.getTime() / 1000) : null;
    const customPeriodDays = customTimeFrom ? Math.ceil((customTimeTo - customTimeFrom) / (24 * 60 * 60)) : null;

    
    let shopInfo: any = {};
    try {
        shopInfo = await shopeeFetch<any>({
            path: '/api/v2/shop/get_shop_info',
            access_token,
            shop_id,
        });
    } catch (e: any) {
        
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

    
    const periods = customPeriodDays ? [customPeriodDays] : [30];
    const timeFields = ['create_time', 'update_time'];
    let orderList: any[] = [];
    
    for (const days of periods) {
        const timeFrom = customTimeFrom || (customTimeTo - days * 24 * 60 * 60);
        
        const CHUNK_SIZE = 14 * 24 * 60 * 60;
        const chunks = [];
        let currentStart = timeFrom;
        while (currentStart < customTimeTo) {
            const currentEnd = Math.min(currentStart + CHUNK_SIZE, customTimeTo);
            chunks.push({ start: currentStart, end: currentEnd });
            currentStart = currentEnd;
        }

        for (const timeField of timeFields) {
            try {
                let allOrdersInField: any[] = [];
                let hasError = false;

                for (const chunk of chunks) {
                    const resp = await shopeeFetch<any>({
                        path: '/api/v2/order/get_order_list',
                        access_token,
                        shop_id,
                        query: {
                            time_range_field: timeField,
                            time_from: chunk.start,
                            time_to: chunk.end,
                            page_size: 100
                        }
                    });
                    
                    if (resp?.error) {
                        hasError = true;
                        break;
                    }

                    const orders = resp?.response?.order_list || [];
                    if (orders.length > 0) {
                        allOrdersInField = allOrdersInField.concat(orders);
                    }
                    
                    
                }

                if (!hasError && allOrdersInField.length > 0) {
                    orderList = allOrdersInField;
                    break; // Found orders with this timeField
                }
            } catch (e) {
                console.warn(`Erro ao buscar pedidos com field ${timeField}:`, e);
            }
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

