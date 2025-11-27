import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { shopeeFetch, refreshAccessToken } from '@/lib/shopee';

// Helper para refrescar o token se estiver expirando ou já expirado
async function getValidAccessToken(integration: any) {
  const now = new Date();
  const expiry = new Date(integration.token_expiry);
  const bufferSeconds = 60;
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
      console.log(`Token para shop ${integration.shop_id} está expirado/expirando, atualizando...`);
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
      console.log(`Token para shop ${integration.shop_id} atualizado com sucesso.`);
      return updatedIntegration;
    } catch (e: any) {
      console.error('Falha ao refrescar token Shopee:', e?.message || e);
      throw Object.assign(new Error('Falha ao atualizar token'), { code: 'RECONNECT_REQUIRED' });
    }
  }
  
  // Se não precisa refresh, verifica se o token ainda é válido
  if (!integration.access_token) {
    throw Object.assign(new Error('Access token ausente'), { code: 'RECONNECT_REQUIRED' });
  }
  
  return integration;
}


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');

    if (!clientId) {
      return NextResponse.json({ error: 'client_id é obrigatório' }, { status: 400 });
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
      access_token_length: integration.access_token?.length || 0
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
        return null;
      }
      try {
        const refreshed = await refreshAccessToken({ refresh_token });
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
        return updated;
      } catch (e) {
        console.error('Refresh forçado falhou:', (e as any)?.message || e);
        return null;
      }
    };

    // 1. Buscar dados da loja (exemplo: nome da loja)
    let shopInfo: any;
    try {
      shopInfo = await shopeeFetch<any>({
        path: '/api/v2/shop/get_shop_info',
        access_token,
        shop_id: shop_id,
      });
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

    // 2. Buscar pedidos dos últimos 30 dias
    const timeTo = Math.floor(Date.now() / 1000);
    const timeFrom = timeTo - 30 * 24 * 60 * 60; // 30 dias atrás

    let orderListResponse: any;
    try {
      orderListResponse = await shopeeFetch<any>({
          path: '/api/v2/order/get_order_list',
          access_token: (integration as any).access_token,
          shop_id: (integration as any).shop_id,
          query: {
              time_range_field: 'create_time',
              time_from: timeFrom,
              time_to: timeTo,
              page_size: 100, // Max 100
              order_status: 'COMPLETED' // Apenas pedidos completos para o GMV
          }
      });
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
        orderListResponse = await shopeeFetch<any>({
          path: '/api/v2/order/get_order_list',
          access_token: String(updated.access_token ?? (integration as any).access_token),
          shop_id: String(updated.shop_id ?? (integration as any).shop_id),
          query: {
              time_range_field: 'create_time',
              time_from: timeFrom,
              time_to: timeTo,
              page_size: 100,
              order_status: 'COMPLETED'
          }
        });
        (integration as any) = updated;
      } else {
        throw e;
      }
    }

    // Extrai lista de order_sn
    const orderList = orderListResponse?.response?.order_list || [];
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
          response_optional_fields: 'item_list' // solicitar itens para agregação de produtos
        }
      });

      const details = detailResp?.response?.order_list || detailResp?.response?.orders || [];
      for (const order of details) {
        // Tenta vários campos possíveis de total
        const orderTotal =
          Number(order?.total_amount) ||
          Number(order?.order_total) ||
          Number(order?.buyer_total_amount) ||
          0;

        if (Number.isFinite(orderTotal)) {
          gmv += orderTotal;
        }

        // Agregar itens por produto
        const items = order?.item_list || order?.items || [];
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
          const key = name;
          if (!productAgg[key]) {
            productAgg[key] = { name, units: 0, revenue: 0 };
          }
          productAgg[key].units += Number.isFinite(quantity) ? quantity : 0;
          productAgg[key].revenue += Number.isFinite(revenue) ? revenue : 0;
        }
      }
    }

    const ticketMedio = totalOrders > 0 ? gmv / totalOrders : 0;
    const topProducts = Object.values(productAgg)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

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
