import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { shopeeFetch, refreshAccessToken } from '@/lib/shopee';

// Helper para refrescar o token se estiver expirando
async function getValidAccessToken(integration: any) {
  const now = new Date();
  const expiry = new Date(integration.token_expiry);
  const bufferSeconds = 300; // 5 minutos de margem

  if (expiry.getTime() - now.getTime() < bufferSeconds * 1000) {
    console.log(`Token para shop ${integration.shop_id} está expirando, atualizando...`);
    const refreshed = await refreshAccessToken({ refresh_token: integration.refresh_token });
    const newExpiry = new Date(Date.now() + (refreshed.expire_in ?? 0) * 1000);
    
    // Atualiza o token no banco de dados
    const updatedIntegration = await prisma.client_integrations.update({
      where: { id: integration.id },
      data: {
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token, // Shopee pode retornar um novo refresh token
        token_expiry: newExpiry,
      },
    });
    console.log(`Token para shop ${integration.shop_id} atualizado com sucesso.`);
    return updatedIntegration;
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

    // Garante que o token de acesso é válido antes de usar
    integration = await getValidAccessToken(integration);

    const { access_token, shop_id } = integration;

    // 1. Buscar dados da loja (exemplo: nome da loja)
    const shopInfo = await shopeeFetch<any>({
      path: '/api/v2/shop/get_shop_info',
      access_token,
      shop_id: shop_id,
    });

    // 2. Buscar pedidos dos últimos 30 dias
    const timeTo = Math.floor(Date.now() / 1000);
    const timeFrom = timeTo - 30 * 24 * 60 * 60; // 30 dias atrás

    const orderListResponse = await shopeeFetch<any>({
        path: '/api/v2/order/get_order_list',
        access_token,
        shop_id: shop_id,
        query: {
            time_range_field: 'create_time',
            time_from: timeFrom,
            time_to: timeTo,
            page_size: 100, // Max 100
            order_status: 'COMPLETED' // Apenas pedidos completos para o GMV
        }
    });

    // Aqui podemos adicionar mais chamadas, como buscar detalhes dos pedidos, produtos, etc.
    // Por enquanto, vamos retornar o que já temos.

    const aggregatedData = {
        shopName: shopInfo?.shop_name || 'N/A',
        totalOrdersLast30Days: orderListResponse?.response?.order_list?.length || 0,
        // GMV, Ticket Médio, etc., precisariam de chamadas a /order/get_order_detail
    };

    return NextResponse.json({
      success: true,
      clientId,
      shopId: shop_id,
      data: aggregatedData,
    });

  } catch (err: any) {
    console.error('Erro ao buscar dados da Shopee:', err);
    return NextResponse.json({ error: err.message || 'Erro interno ao buscar dados da Shopee' }, { status: 500 });
  }
}
