import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');

    if (!clientId) {
      return NextResponse.json({ error: 'client_id é obrigatório' }, { status: 400 });
    }

    // Busca integração de Ads (provider = "shopee_ads")
    const integration = await prisma.client_integrations.findFirst({
      where: {
        client_id: clientId,
        provider: 'shopee_ads',
      },
      select: {
        id: true,
        shop_id: true,
        token_expiry: true,
        partner_id: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!integration) {
      return NextResponse.json({
        connected: false,
        message: 'Integração de Ads não encontrada',
      });
    }

    const isExpired = integration.token_expiry && new Date(integration.token_expiry) < new Date();

    return NextResponse.json({
      connected: true,
      shop_id: integration.shop_id,
      token_expiry: integration.token_expiry?.toISOString() || null,
      is_expired: isExpired,
      partner_id: integration.partner_id,
      created_at: integration.created_at?.toISOString(),
      updated_at: integration.updated_at?.toISOString(),
    });

  } catch (err: any) {
    console.error('[SHOPEE-ADS-STATUS] Erro:', err);
    return NextResponse.json({ error: err.message || 'Erro ao buscar status' }, { status: 500 });
  }
}
