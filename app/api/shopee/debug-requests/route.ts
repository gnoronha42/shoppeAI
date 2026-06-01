import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { shopeeFetch } from '@/lib/shopee';

/**
 * 🔍 ENDPOINT DE DEBUG - Retorna informações completas das requisições Shopee
 * 
 * Uso: GET /api/shopee/debug-requests?client_id=xxx
 * 
 * Retorna:
 * - Todos os endpoints chamados
 * - Body completo de cada request
 * - Shop ID usado
 * - Intervalo de datas
 * - Resposta completa da Shopee
 */
export async function GET(request: Request) {
  try {
    const _shopeeGuard = guardShopeeRoute();
    if (_shopeeGuard) return _shopeeGuard;
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const dateFromParam = searchParams.get('date_from');
    const dateToParam = searchParams.get('date_to');

    if (!clientId) {
      return NextResponse.json({ error: 'client_id é obrigatório' }, { status: 400 });
    }

    // Processar datas
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
        console.warn('⚠️ Erro ao processar datas:', e);
      }
    }

    const timeTo = customTimeTo || Math.floor(Date.now() / 1000);
    const periodDays = customPeriodDays || 14; // Default to 14 days to avoid API errors
    const timeFrom = customTimeFrom || (timeTo - periodDays * 24 * 60 * 60);

    // Buscar integração
    const integration = await prisma.client_integrations.findUnique({
      where: { client_id_provider: { client_id: clientId, provider: 'shopee' } },
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integração Shopee não encontrada' }, { status: 404 });
    }

    const { access_token, shop_id } = integration as any;

    // Array para armazenar todas as requisições
    const requests: any[] = [];

    // 1. Shop Info
    try {
      const shopInfo = await shopeeFetch<any>({
        path: '/api/v2/shop/get_shop_info',
        access_token,
        shop_id,
      });
      requests.push({
        endpoint: '/api/v2/shop/get_shop_info',
        method: 'GET',
        shop_id: String(shop_id),
        query_params: {},
        body: null,
        date_range: null,
        response: shopInfo,
        status: 'success'
      });
    } catch (e: any) {
      requests.push({
        endpoint: '/api/v2/shop/get_shop_info',
        method: 'GET',
        shop_id: String(shop_id),
        query_params: {},
        body: null,
        date_range: null,
        response: { error: e.message },
        status: 'error'
      });
    }

    // 2. Product List
    try {
      const productInfo = await shopeeFetch<any>({
        path: '/api/v2/product/get_item_list',
        access_token,
        shop_id,
        query: { offset: 0, page_size: 50, item_status: 'NORMAL' }
      });
      requests.push({
        endpoint: '/api/v2/product/get_item_list',
        method: 'GET',
        shop_id: String(shop_id),
        query_params: { offset: 0, page_size: 50, item_status: 'NORMAL' },
        body: null,
        date_range: null,
        response: productInfo,
        status: 'success'
      });
    } catch (e: any) {
      requests.push({
        endpoint: '/api/v2/product/get_item_list',
        method: 'GET',
        shop_id: String(shop_id),
        query_params: { offset: 0, page_size: 50, item_status: 'NORMAL' },
        body: null,
        date_range: null,
        response: { error: e.message },
        status: 'error'
      });
    }

    // 3. Order List (com intervalo de datas)
    const timeFields = ['create_time', 'update_time'];
    for (const timeField of timeFields) {
      try {
        const orderList = await shopeeFetch<any>({
          path: '/api/v2/order/get_order_list',
          access_token,
          shop_id,
          query: {
            time_range_field: timeField,
            time_from: timeFrom,
            time_to: timeTo,
            page_size: 100
          }
        });
        requests.push({
          endpoint: '/api/v2/order/get_order_list',
          method: 'GET',
          shop_id: String(shop_id),
          query_params: {
            time_range_field: timeField,
            time_from: timeFrom,
            time_to: timeTo,
            page_size: 100
          },
          body: null,
          date_range: {
            from: new Date(timeFrom * 1000).toISOString(),
            to: new Date(timeTo * 1000).toISOString(),
            from_timestamp: timeFrom,
            to_timestamp: timeTo,
            days: periodDays
          },
          response: orderList,
          status: 'success'
        });
        
        // Se encontrou pedidos, para de tentar outros time_fields
        if (orderList?.response?.order_list?.length > 0) {
          break;
        }
      } catch (e: any) {
        requests.push({
          endpoint: '/api/v2/order/get_order_list',
          method: 'GET',
          shop_id: String(shop_id),
          query_params: {
            time_range_field: timeField,
            time_from: timeFrom,
            time_to: timeTo,
            page_size: 100
          },
          body: null,
          date_range: {
            from: new Date(timeFrom * 1000).toISOString(),
            to: new Date(timeTo * 1000).toISOString(),
            from_timestamp: timeFrom,
            to_timestamp: timeTo,
            days: periodDays
          },
          response: { error: e.message },
          status: 'error'
        });
      }
    }

    // 4. Order Details (se houver pedidos)
    const orderListResp = requests.find(r => 
      r.endpoint === '/api/v2/order/get_order_list' && 
      r.status === 'success' && 
      r.response?.response?.order_list?.length > 0
    );

    if (orderListResp && orderListResp.response?.response?.order_list?.length > 0) {
      const orderSns = orderListResp.response.response.order_list
        .slice(0, 5) // Limitar a 5 para não sobrecarregar
        .map((o: any) => o.order_sn);
      
      try {
        const orderDetails = await shopeeFetch<any>({
          path: '/api/v2/order/get_order_detail',
          access_token,
          shop_id,
          query: {
            order_sn_list: orderSns.join(','),
            response_optional_fields: 'item_list,total_amount'
          }
        });
        requests.push({
          endpoint: '/api/v2/order/get_order_detail',
          method: 'GET',
          shop_id: String(shop_id),
          query_params: {
            order_sn_list: orderSns.join(','),
            response_optional_fields: 'item_list,total_amount'
          },
          body: null,
          date_range: null,
          response: orderDetails,
          status: 'success'
        });
      } catch (e: any) {
        requests.push({
          endpoint: '/api/v2/order/get_order_detail',
          method: 'GET',
          shop_id: String(shop_id),
          query_params: {
            order_sn_list: orderSns.join(','),
            response_optional_fields: 'item_list,total_amount'
          },
          body: null,
          date_range: null,
          response: { error: e.message },
          status: 'error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      client_id: clientId,
      shop_id: String(shop_id),
      date_range: {
        from: new Date(timeFrom * 1000).toISOString(),
        to: new Date(timeTo * 1000).toISOString(),
        from_timestamp: timeFrom,
        to_timestamp: timeTo,
        days: periodDays
      },
      requests: requests.map(r => ({
        endpoint: r.endpoint,
        method: r.method,
        shop_id: r.shop_id,
        query_params: r.query_params,
        body: r.body,
        date_range: r.date_range,
        response: r.response,
        status: r.status,
        response_size: JSON.stringify(r.response).length
      })),
      summary: {
        total_requests: requests.length,
        successful: requests.filter(r => r.status === 'success').length,
        failed: requests.filter(r => r.status === 'error').length
      }
    });

  } catch (err: any) {
    console.error(' Erro no debug:', err);
    return NextResponse.json({ 
      error: err.message || 'Erro interno',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}


export const dynamic = 'force-dynamic';

import { guardShopeeRoute } from '@/lib/shopee-route-guard';
