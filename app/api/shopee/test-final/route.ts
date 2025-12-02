import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { shopeeFetch } from '@/lib/shopee';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('client_id');

  if (!clientId) return NextResponse.json({ error: 'client_id required' });

  const integration = await prisma.client_integrations.findUnique({
    where: { client_id_provider: { client_id: clientId, provider: 'shopee' } },
  });

  if (!integration) return NextResponse.json({ error: 'Integration not found' });

  const now = Math.floor(Date.now() / 1000);
  const from = now - (7 * 24 * 60 * 60); // Últimos 7 dias

  // Tentar endpoints ESPECÍFICOS que não testamos ainda
  const endpoints = [
    '/api/v2/shop/simple_shop_info',
    '/api/v2/shop/get_profile',
    '/api/v2/merchant/get_merchant_info'
  ];

  const results = [];

  for (const path of endpoints) {
    try {
      const resp = await shopeeFetch<any>({
        path,
        access_token: integration.access_token!,
        shop_id: integration.shop_id!,
        query: {}
      });
      results.push({ path, success: true, data: resp });
    } catch (e: any) {
      results.push({ path, success: false, error: e.message });
    }
  }

  return NextResponse.json(results);
}
