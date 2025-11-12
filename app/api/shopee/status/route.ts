import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');
    if (!clientId) {
      return NextResponse.json({ error: 'client_id é obrigatório' }, { status: 400 });
    }
    const integration = await prisma.client_integrations.findUnique({
      where: { client_id_provider: { client_id: clientId, provider: 'shopee' } },
      select: {
        shop_id: true,
        merchant_id: true,
        region: true,
        token_expiry: true,
        updated_at: true,
      },
    });
    if (!integration) {
      return NextResponse.json({ connected: false });
    }
    return NextResponse.json({
      connected: true,
      shop_id: integration.shop_id,
      merchant_id: integration.merchant_id,
      region: integration.region,
      token_expiry: integration.token_expiry,
      updated_at: integration.updated_at,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao consultar status' }, { status: 500 });
  }
}



