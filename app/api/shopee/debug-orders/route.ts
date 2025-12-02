import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { shopeeFetch, refreshAccessToken } from '@/lib/shopee';

async function getValidAccessToken(integration: any) {
  const now = new Date();
  const expiry = integration.token_expiry ? new Date(integration.token_expiry) : null;
  const expiryValid = !!expiry && !isNaN(expiry.getTime());
  
  const bufferSeconds = 1800; // 30 minutos
  const remainingSeconds = expiryValid && expiry ? Math.floor((expiry.getTime() - now.getTime()) / 1000) : 0;
  
  const shouldRefresh =
    Boolean(integration.refresh_token) &&
    expiryValid &&
    (remainingSeconds <= bufferSeconds);
  
  if (shouldRefresh) {
    try {
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
      
      return updatedIntegration;
    } catch (e: any) {
      throw Object.assign(new Error('Falha ao atualizar token'), { code: 'RECONNECT_REQUIRED' });
    }
  }
  
  return integration;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const dateFromParam = searchParams.get('date_from') || '2025-11-25';
    const dateToParam = searchParams.get('date_to') || '2025-12-01';

    if (!clientId) {
      return NextResponse.json({ error: 'client_id é obrigatório' }, { status: 400 });
    }

    let integration = await prisma.client_integrations.findUnique({
      where: { client_id_provider: { client_id: clientId, provider: 'shopee' } },
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integração não encontrada' }, { status: 404 });
    }

    integration = await getValidAccessToken(integration);
    const { access_token, shop_id } = integration as any;

    // Converter datas
    const dateFrom = new Date(dateFromParam);
    const dateTo = new Date(dateToParam);
    const timeFrom = Math.floor(dateFrom.getTime() / 1000);
    const timeTo = Math.floor(dateTo.getTime() / 1000);

    console.log('🔍 [DEBUG-ORDERS] Parâmetros:', {
      dateFromParam,
      dateToParam,
      timeFrom,
      timeTo,
      timeFromDate: new Date(timeFrom * 1000).toISOString(),
      timeToDate: new Date(timeTo * 1000).toISOString()
    });

    const debugResults: any = {
      parameters: {
        client_id: clientId,
        shop_id,
        date_from: dateFromParam,
        date_to: dateToParam,
        time_from: timeFrom,
        time_to: timeTo,
        time_from_iso: new Date(timeFrom * 1000).toISOString(),
        time_to_iso: new Date(timeTo * 1000).toISOString()
      },
      tests: []
    };

    // Teste 1: Buscar com create_time
    try {
      console.log('🧪 [DEBUG-ORDERS] Teste 1: create_time');
      const createTimeResp = await shopeeFetch<any>({
        path: '/api/v2/order/get_order_list',
        access_token,
        shop_id,
        query: { 
          time_range_field: 'create_time', 
          time_from: timeFrom, 
          time_to: timeTo, 
          page_size: 100,
          response_optional_fields: 'order_status,total_amount,create_time'
        }
      });

      debugResults.tests.push({
        test: 'create_time',
        success: true,
        orders_found: createTimeResp?.response?.order_list?.length || 0,
        has_more: createTimeResp?.response?.more || false,
        next_cursor: createTimeResp?.response?.next_cursor || null,
        response_keys: Object.keys(createTimeResp?.response || {}),
        sample_order: createTimeResp?.response?.order_list?.[0] || null
      });
    } catch (e: any) {
      debugResults.tests.push({
        test: 'create_time',
        success: false,
        error: e?.message || 'Erro desconhecido'
      });
    }

    // Teste 2: Buscar com update_time
    try {
      console.log('🧪 [DEBUG-ORDERS] Teste 2: update_time');
      const updateTimeResp = await shopeeFetch<any>({
        path: '/api/v2/order/get_order_list',
        access_token,
        shop_id,
        query: { 
          time_range_field: 'update_time', 
          time_from: timeFrom, 
          time_to: timeTo, 
          page_size: 100,
          response_optional_fields: 'order_status,total_amount,create_time'
        }
      });

      debugResults.tests.push({
        test: 'update_time',
        success: true,
        orders_found: updateTimeResp?.response?.order_list?.length || 0,
        has_more: updateTimeResp?.response?.more || false,
        next_cursor: updateTimeResp?.response?.next_cursor || null,
        response_keys: Object.keys(updateTimeResp?.response || {}),
        sample_order: updateTimeResp?.response?.order_list?.[0] || null
      });
    } catch (e: any) {
      debugResults.tests.push({
        test: 'update_time',
        success: false,
        error: e?.message || 'Erro desconhecido'
      });
    }

    // Teste 3: Período mais amplo (últimos 30 dias)
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    const now = Math.floor(Date.now() / 1000);

    try {
      console.log('🧪 [DEBUG-ORDERS] Teste 3: últimos 30 dias');
      const wideRangeResp = await shopeeFetch<any>({
        path: '/api/v2/order/get_order_list',
        access_token,
        shop_id,
        query: { 
          time_range_field: 'create_time', 
          time_from: thirtyDaysAgo, 
          time_to: now, 
          page_size: 100,
          response_optional_fields: 'order_status,total_amount,create_time'
        }
      });

      debugResults.tests.push({
        test: 'last_30_days',
        success: true,
        time_from: thirtyDaysAgo,
        time_to: now,
        time_from_iso: new Date(thirtyDaysAgo * 1000).toISOString(),
        time_to_iso: new Date(now * 1000).toISOString(),
        orders_found: wideRangeResp?.response?.order_list?.length || 0,
        has_more: wideRangeResp?.response?.more || false,
        sample_order: wideRangeResp?.response?.order_list?.[0] || null
      });
    } catch (e: any) {
      debugResults.tests.push({
        test: 'last_30_days',
        success: false,
        error: e?.message || 'Erro desconhecido'
      });
    }

    // Teste 4: Sem response_optional_fields
    try {
      console.log('🧪 [DEBUG-ORDERS] Teste 4: sem response_optional_fields');
      const basicResp = await shopeeFetch<any>({
        path: '/api/v2/order/get_order_list',
        access_token,
        shop_id,
        query: { 
          time_range_field: 'create_time', 
          time_from: timeFrom, 
          time_to: timeTo, 
          page_size: 100
        }
      });

      debugResults.tests.push({
        test: 'basic_request',
        success: true,
        orders_found: basicResp?.response?.order_list?.length || 0,
        has_more: basicResp?.response?.more || false,
        sample_order: basicResp?.response?.order_list?.[0] || null
      });
    } catch (e: any) {
      debugResults.tests.push({
        test: 'basic_request',
        success: false,
        error: e?.message || 'Erro desconhecido'
      });
    }

    // Teste 5: Diferentes order_status
    const orderStatuses = ['UNPAID', 'TO_SHIP', 'SHIPPED', 'TO_CONFIRM_RECEIVE', 'IN_CANCEL', 'CANCELLED', 'TO_RETURN', 'COMPLETED'];
    
    for (const status of orderStatuses) {
      try {
        console.log(`🧪 [DEBUG-ORDERS] Teste 5: order_status=${status}`);
        const statusResp = await shopeeFetch<any>({
          path: '/api/v2/order/get_order_list',
          access_token,
          shop_id,
          query: { 
            time_range_field: 'create_time', 
            time_from: thirtyDaysAgo, 
            time_to: now, 
            page_size: 100,
            order_status: status
          }
        });

        if ((statusResp?.response?.order_list?.length || 0) > 0) {
          debugResults.tests.push({
            test: `order_status_${status}`,
            success: true,
            orders_found: statusResp?.response?.order_list?.length || 0,
            sample_order: statusResp?.response?.order_list?.[0] || null
          });
        }
      } catch (e: any) {
        // Ignora erros para não poluir o resultado
      }
    }

    return NextResponse.json({
      success: true,
      debug: debugResults
    });

  } catch (err: any) {
    console.error('❌ [DEBUG-ORDERS] Erro:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
