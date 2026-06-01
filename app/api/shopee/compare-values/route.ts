import { NextRequest, NextResponse } from 'next/server';
import { shopeeFetch } from '@/lib/shopee';

import { guardShopeeRoute } from '@/lib/shopee-route-guard';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const _shopeeGuard = guardShopeeRoute();
    if (_shopeeGuard) return _shopeeGuard;
    const { searchParams } = new URL(request.url);
    const access_token = searchParams.get('access_token');
    const shop_id = searchParams.get('shop_id');
    const days = parseInt(searchParams.get('days') || '7'); // Usar apenas 7 dias para teste

    if (!access_token || !shop_id) {
      return NextResponse.json(
        { error: 'access_token e shop_id são obrigatórios' },
        { status: 400 }
      );
    }

    const timeTo = Math.floor(Date.now() / 1000);
    const timeFrom = timeTo - (days * 24 * 60 * 60);

    console.log(`\n🔍 [COMPARE] Comparando valores da API Shopee - ${days} dias`);
    console.log(`📅 Período: ${new Date(timeFrom * 1000).toISOString().split('T')[0]} até ${new Date(timeTo * 1000).toISOString().split('T')[0]}`);

    // ETAPA 1: Buscar pedidos COMPLETED
    const orderResp = await shopeeFetch<any>({
      path: '/api/v2/order/get_order_list',
      access_token,
      shop_id,
      query: {
        time_range_field: 'create_time',
        time_from: timeFrom,
        time_to: timeTo,
        page_size: 20, // Limitar para teste
        order_status: 'COMPLETED',
      },
    });

    const orders = orderResp?.response?.order_list || [];
    console.log(`📦 Encontrados ${orders.length} pedidos COMPLETED`);

    if (orders.length === 0) {
      return NextResponse.json({
        message: 'Nenhum pedido COMPLETED encontrado no período',
        comparison: {}
      });
    }

    const orderIds = orders.map((order: any) => order.order_sn);
    const sampleIds = orderIds.slice(0, 5); // Pegar apenas 5 para teste

    console.log(`🧪 Testando com ${sampleIds.length} pedidos: ${sampleIds.join(', ')}`);

    // MÉTODO 1: get_order_detail (total_amount)
    let totalAmountSum = 0;
    try {
      const detailResp = await shopeeFetch<any>({
        path: '/api/v2/order/get_order_detail',
        access_token,
        shop_id,
        query: {
          order_sn_list: sampleIds.join(','),
          response_optional_fields: 'total_amount,order_status'
        }
      });

      const details = detailResp?.response?.order_list || [];
      console.log(`\n📋 MÉTODO 1 - get_order_detail:`);
      
      for (const order of details) {
        const amount = Number(order.total_amount) || 0;
        totalAmountSum += amount;
        console.log(`   • ${order.order_sn}: total_amount = R$ ${amount.toFixed(2)}`);
      }
      console.log(`   💰 TOTAL (total_amount): R$ ${totalAmountSum.toFixed(2)}`);
    } catch (error) {
      console.error('❌ Erro no get_order_detail:', error);
    }

    // MÉTODO 2: get_escrow_detail_batch (buyer_total_amount)
    let buyerTotalAmountSum = 0;
    let escrowAmountSum = 0;
    try {
      const escrowResp = await shopeeFetch<any>({
        path: '/api/v2/payment/get_escrow_detail_batch',
        method: 'POST',
        access_token,
        shop_id,
        body: { order_sn_list: sampleIds },
      });

      const escrowDetails = escrowResp?.response || [];
      console.log(`\n📋 MÉTODO 2 - get_escrow_detail_batch:`);
      
      for (const detail of escrowDetails) {
        if (detail?.fail_error) {
          console.log(`   ❌ ${detail.order_sn || 'unknown'}: ${detail.fail_error}`);
          continue;
        }

        const escrowDetail = detail?.escrow_detail || detail;
        const buyerAmount = escrowDetail?.buyer_payment_info?.buyer_total_amount || 0;
        const escrowAmount = escrowDetail?.order_income?.escrow_amount || 0;
        
        buyerTotalAmountSum += Number(buyerAmount);
        escrowAmountSum += Number(escrowAmount);
        
        console.log(`   • ${escrowDetail?.order_sn}: buyer_total_amount = R$ ${Number(buyerAmount).toFixed(2)}, escrow_amount = R$ ${Number(escrowAmount).toFixed(2)}`);
      }
      console.log(`   💰 TOTAL (buyer_total_amount): R$ ${buyerTotalAmountSum.toFixed(2)}`);
      console.log(`   💰 TOTAL (escrow_amount): R$ ${escrowAmountSum.toFixed(2)}`);
    } catch (error) {
      console.error('❌ Erro no get_escrow_detail_batch:', error);
    }

    const comparison = {
      period: {
        from: new Date(timeFrom * 1000).toISOString(),
        to: new Date(timeTo * 1000).toISOString(),
        days
      },
      totalOrders: orders.length,
      sampleSize: sampleIds.length,
      sampleOrderIds: sampleIds,
      methods: {
        get_order_detail: {
          field: 'total_amount',
          total: totalAmountSum,
          description: 'Valor total do pedido (antes de descontos/taxas)'
        },
        get_escrow_detail_batch: {
          buyer_total_amount: {
            field: 'buyer_payment_info.buyer_total_amount',
            total: buyerTotalAmountSum,
            description: 'Valor total pago pelo comprador'
          },
          escrow_amount: {
            field: 'order_income.escrow_amount',
            total: escrowAmountSum,
            description: 'Valor que o vendedor receberá (após taxas)'
          }
        }
      },
      recommendation: buyerTotalAmountSum > 0 ? 'buyer_total_amount' : 'total_amount'
    };

    console.log(`\n📊 COMPARAÇÃO:`);
    console.log(`   • get_order_detail (total_amount): R$ ${totalAmountSum.toFixed(2)}`);
    console.log(`   • get_escrow_detail_batch (buyer_total_amount): R$ ${buyerTotalAmountSum.toFixed(2)}`);
    console.log(`   • get_escrow_detail_batch (escrow_amount): R$ ${escrowAmountSum.toFixed(2)}`);
    console.log(`   🎯 Recomendação: Usar ${comparison.recommendation}`);

    return NextResponse.json({
      success: true,
      comparison
    });

  } catch (error) {
    console.error('❌ [COMPARE] Erro geral:', error);
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
