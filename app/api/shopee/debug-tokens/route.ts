import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

import { guardShopeeRoute } from '@/lib/shopee-route-guard';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const _shopeeGuard = guardShopeeRoute();
    if (_shopeeGuard) return _shopeeGuard;
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');

    if (!clientId) {
      return NextResponse.json({ error: 'client_id é obrigatório' }, { status: 400 });
    }

    const integration = await prisma.client_integrations.findUnique({
      where: { client_id_provider: { client_id: clientId, provider: 'shopee' } },
    });

    if (!integration) {
      return NextResponse.json({ error: 'Integração não encontrada' }, { status: 404 });
    }

    const now = new Date();
    const expiry = new Date(integration.token_expiry || '');
    const expiryValid = !isNaN(expiry.getTime());
    
    const debugInfo = {
      client_id: clientId,
      shop_id: integration.shop_id,
      has_access_token: !!integration.access_token,
      has_refresh_token: !!integration.refresh_token,
      token_expiry_raw: integration.token_expiry,
      token_expiry_parsed: expiryValid ? expiry.toISOString() : 'Invalid',
      current_time: now.toISOString(),
      expires_in_milliseconds: expiryValid ? expiry.getTime() - now.getTime() : null,
      expires_in_seconds: expiryValid ? Math.round((expiry.getTime() - now.getTime()) / 1000) : null,
      expires_in_minutes: expiryValid ? Math.round((expiry.getTime() - now.getTime()) / (1000 * 60)) : null,
      expires_in_hours: expiryValid ? Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60)) : null,
      expires_in_days: expiryValid ? Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null,
      is_expired: expiryValid ? expiry.getTime() < now.getTime() : null,
      created_at: integration.created_at,
      updated_at: integration.updated_at,
    };

    return NextResponse.json({ 
      success: true, 
      debug: debugInfo,
      recommendations: {
        token_seems_valid: expiryValid && expiry.getTime() > now.getTime(),
        expires_soon: expiryValid && (expiry.getTime() - now.getTime()) < (24 * 60 * 60 * 1000), // menos de 24h
        needs_refresh: expiryValid && expiry.getTime() < now.getTime(),
        suspicious_short_duration: expiryValid && (expiry.getTime() - new Date(integration.created_at || '').getTime()) < (7 * 24 * 60 * 60 * 1000) // menos de 7 dias de duração total
      }
    });

  } catch (error: any) {
    console.error('Erro ao debugar tokens:', error);
    return NextResponse.json({ 
      error: 'Erro interno', 
      details: error.message 
    }, { status: 500 });
  }
}
