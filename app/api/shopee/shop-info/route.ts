import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const _shopeeGuard = guardShopeeRoute();
    if (_shopeeGuard) return _shopeeGuard;
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    const shopId = searchParams.get('shop_id');

    if (!clientId && !shopId) {
      return NextResponse.json(
        { error: 'É necessário fornecer client_id ou shop_id' },
        { status: 400 }
      );
    }

    // URL do microserviço de análise
    const microserviceUrl = process.env.ANALYSIS_MICROSERVICE_URL || 'http://localhost:3001';
    const queryString = clientId ? `client_id=${clientId}` : `shop_id=${shopId}`;
    const url = `${microserviceUrl}/api/shopee/shop-info?${queryString}`;

    console.log(`[SHOPEE-SHOP-INFO] Fazendo requisição para: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[SHOPEE-SHOP-INFO] Erro do microserviço:`, data);
      return NextResponse.json(data, { status: response.status });
    }

    console.log(`[SHOPEE-SHOP-INFO] Sucesso:`, data.shop_info?.shop_name || 'Nome não disponível');

    return NextResponse.json(data);
  } catch (error) {
    console.error('[SHOPEE-SHOP-INFO] Erro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
export const dynamic = 'force-dynamic';

import { guardShopeeRoute } from '@/lib/shopee-route-guard';
