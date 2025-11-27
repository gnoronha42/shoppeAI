import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ensureShopeeEnv, refreshAccessToken, shopeeFetch } from '@/lib/shopee';

type ShopeeIntegration = {
  id: string;
  client_id: string;
  provider: string;
  shop_id: string | null;
  region: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expiry: Date | null;
};

async function getValidAccessToken(integration: ShopeeIntegration) {
  const now = new Date();
  const expiry = integration.token_expiry ? new Date(integration.token_expiry) : null;
  const expiryValid = !!expiry && !isNaN(expiry.getTime());
  const bufferSeconds = 60;
  const isExpired = expiryValid && expiry!.getTime() < now.getTime();
  const nearExpiry = expiryValid && expiry!.getTime() - now.getTime() < bufferSeconds * 1000;

  if ((isExpired || nearExpiry) && integration.refresh_token) {
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
      return updated as unknown as ShopeeIntegration;
    } catch (e) {
      throw Object.assign(new Error('Falha ao atualizar token'), { code: 'RECONNECT_REQUIRED' });
    }
  }

  if (!integration.access_token && integration.refresh_token) {
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
      return updated as unknown as ShopeeIntegration;
    } catch (e) {
      throw Object.assign(new Error('Falha ao obter access token via refresh'), { code: 'RECONNECT_REQUIRED' });
    }
  }

  if (!integration.access_token) {
    throw Object.assign(new Error('Access token ausente'), { code: 'RECONNECT_REQUIRED' });
  }

  return integration;
}

export async function GET(request: Request) {
  try {
    ensureShopeeEnv();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    if (!clientId) {
      return NextResponse.json({ error: 'client_id é obrigatório' }, { status: 400 });
    }

    const itemStatus = (searchParams.get('status') || 'NORMAL').toUpperCase(); // NORMAL, BANNED, DELETED, UNLIST
    const pageSize = Math.min(Number(searchParams.get('page_size') || 50), 100);
    const offset = Math.max(Number(searchParams.get('offset') || 0), 0);

    const integration = (await prisma.client_integrations.findUnique({
      where: { client_id_provider: { client_id: clientId, provider: 'shopee' } },
    })) as unknown as ShopeeIntegration | null;

    if (!integration || !integration.shop_id) {
      return NextResponse.json({ error: 'Integração Shopee não encontrada para o cliente' }, { status: 404 });
    }

    let valid = await getValidAccessToken(integration);
    const shopId = valid.shop_id!;
    let accessToken = valid.access_token!;

    // 1) Obter lista de item_ids
    type ItemListResponse = {
      item?: Array<{ item_id: number }>;
      item_list?: Array<{ item_id: number }>;
      has_next_page?: boolean;
      next_offset?: number;
      more?: boolean;
      total?: number;
      error?: string;
      message?: string;
    };

    let listRes = await shopeeFetch<ItemListResponse>({
      path: '/api/v2/product/get_item_list',
      method: 'GET',
      query: {
        item_status: itemStatus,
        page_size: pageSize,
        offset,
      },
      access_token: accessToken,
      shop_id: shopId,
    });

    // Se access_token inválido, tenta refresh forçado e re-executa
    if ((listRes as any)?.error === 'invalid_access_token') {
      valid = await getValidAccessToken({ ...valid, access_token: null } as any);
      accessToken = valid.access_token!;
      listRes = await shopeeFetch<ItemListResponse>({
        path: '/api/v2/product/get_item_list',
        method: 'GET',
        query: {
          item_status: itemStatus,
          page_size: pageSize,
          offset,
        },
        access_token: accessToken,
        shop_id: shopId,
      });
    }

    const itemsRaw = listRes.item_list || listRes.item || [];
    const itemIds = itemsRaw.map((i) => i.item_id).filter(Boolean);

    if (itemIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          items: [],
          paging: {
            total: listRes.total ?? 0,
            has_next_page: listRes.has_next_page ?? listRes.more ?? false,
            next_offset: listRes.next_offset ?? null,
            page_size: pageSize,
            offset,
          },
        },
      });
    }

    // 2) Obter informações base dos itens
    type BaseInfoResponse = {
      item_list?: Array<{
        item_id: number;
        item_name?: string;
        description?: string;
        images?: string[];
        price_info?: Array<{ current_price?: string | number }>;
        logistics_info?: unknown[];
        attribute_list?: unknown[];
        create_time?: number;
        update_time?: number;
        item_status?: string;
        violation?: string;
      }>;
      error?: string;
      message?: string;
    };

    let baseInfo = await shopeeFetch<BaseInfoResponse>({
      path: '/api/v2/product/get_item_base_info',
      method: 'GET',
      query: {
        item_id_list: itemIds.join(','),
      },
      access_token: accessToken,
      shop_id: shopId,
    });

    if ((baseInfo as any)?.error === 'invalid_access_token') {
      valid = await getValidAccessToken({ ...valid, access_token: null } as any);
      accessToken = valid.access_token!;
      baseInfo = await shopeeFetch<BaseInfoResponse>({
        path: '/api/v2/product/get_item_base_info',
        method: 'GET',
        query: {
          item_id_list: itemIds.join(','),
        },
        access_token: accessToken,
        shop_id: shopId,
      });
    }

    const mapped =
      baseInfo.item_list?.map((p) => {
        const currentPrice =
          Array.isArray(p.price_info) && p.price_info.length > 0
            ? Number(p.price_info[0]?.current_price || 0)
            : undefined;
        return {
          id: p.item_id,
          name: p.item_name,
          status: p.item_status,
          price: currentPrice,
          images: Array.isArray(p.images) ? p.images : [],
          createdAt: p.create_time ? new Date(p.create_time * 1000) : undefined,
          updatedAt: p.update_time ? new Date(p.update_time * 1000) : undefined,
        };
      }) || [];

    return NextResponse.json({
      success: true,
      data: {
        items: mapped,
        raw: {
          list: listRes,
          base: baseInfo,
        },
        paging: {
          total: (listRes as any)?.total ?? mapped.length,
          has_next_page: (listRes as any)?.has_next_page ?? (listRes as any)?.more ?? false,
          next_offset: (listRes as any)?.next_offset ?? null,
          page_size: pageSize,
          offset,
        },
      },
    });
  } catch (err: any) {
    if (err?.code === 'RECONNECT_REQUIRED') {
      return NextResponse.json({ error: 'Reconexão necessária', reconnect_required: true }, { status: 401 });
    }
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 });
  }
}


